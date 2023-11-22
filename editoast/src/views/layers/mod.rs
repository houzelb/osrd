mod mvt_utils;

use crate::client::{get_root_url, MapLayersConfig};
use crate::error::Result;
use crate::map::redis_utils::RedisClient;
use crate::map::{get, get_cache_tile_key, get_view_cache_prefix, set, Layer, MapLayers, Tile};
use crate::DbPool;
use actix_web::web::{Data, Json, Path, Query};
use actix_web::{get, HttpResponse};
use diesel::sql_query;
use diesel::sql_types::Integer;
use diesel_async::RunQueryDsl;
use editoast_derive::EditoastError;
use mvt_utils::{create_and_fill_mvt_tile, get_geo_json_sql_query, GeoJsonAndData};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value as JsonValue};
use thiserror::Error;
use utoipa::{IntoParams, ToSchema};

crate::routes! {
     "/layers" => {
        "/layer/{layer_slug}/mvt/{view_slug}" => {
            layer_view,
        },
        "/tile/{layer_slug}/{view_slug}/{z}/{x}/{y}" => {
            cache_and_get_mvt_tile,
        },
    }
}

#[derive(Debug, Error, EditoastError)]
#[editoast_error(base_id = "layers", default_status = 404)]
enum LayersError {
    #[error("Layer '{}' not found. Expected one of {:?}", .layer_name, .expected_names)]
    LayerNotFound {
        layer_name: String,
        expected_names: Vec<String>,
    },
    #[error("View '{}' not found. Expected one of {:?}", .view_name, .expected_names)]
    ViewNotFound {
        view_name: String,
        expected_names: Vec<String>,
    },
}

impl LayersError {
    pub fn new_layer_not_found<T: AsRef<str>>(name: T, map_layers: &MapLayers) -> Self {
        let mut expected_names: Vec<_> = map_layers.layers.keys().cloned().collect();
        expected_names.sort();
        Self::LayerNotFound {
            layer_name: name.as_ref().to_string(),
            expected_names,
        }
    }
    pub fn new_view_not_found<T: AsRef<str>>(name: T, layer: &Layer) -> Self {
        let mut expected_names: Vec<_> = layer.views.keys().cloned().collect();
        expected_names.sort();
        Self::ViewNotFound {
            view_name: name.as_ref().to_string(),
            expected_names,
        }
    }
}

#[derive(Deserialize, Debug, Clone, IntoParams)]
#[into_params(parameter_in = Query)]
struct InfraQueryParam {
    infra: i64,
}

#[derive(Deserialize, IntoParams)]
#[allow(unused)]
struct LayerViewParams {
    layer_slug: String,
    view_slug: String,
}

#[derive(Serialize, ToSchema)]
struct ViewMetadata {
    #[serde(rename = "type")]
    data_type: String,
    #[schema(example = "track_sections")]
    name: String,
    #[serde(rename = "promoteId")]
    #[schema(example = json!({track_sections: "id"}), value_type = Object)]
    promote_id: JsonValue,
    #[schema(example = "xyz")]
    scheme: String,
    #[schema(example = json!(["http://localhost:7070/tile/track_sections/geo/{z}/{x}/{y}/?infra=1"]))]
    tiles: Vec<String>,
    attribution: String,
    minzoom: u64,
    #[schema(example = 15)]
    maxzoom: u64,
}

/// Returns layer view metadata to query tiles
#[utoipa::path(
    tag = "layers",
    params(InfraQueryParam, LayerViewParams),
    responses(
        (status = 200, body = inline(ViewMetadata), description = "Successful Response"),
    )
)]
#[get("")]
async fn layer_view(
    path: Path<(String, String)>,
    params: Query<InfraQueryParam>,
    map_layers: Data<MapLayers>,
    map_layers_config: Data<MapLayersConfig>,
) -> Result<Json<ViewMetadata>> {
    let (layer_slug, view_slug) = path.into_inner();
    let infra = params.infra;
    let layer = match map_layers.layers.get(&layer_slug) {
        Some(layer) => layer,
        None => return Err(LayersError::new_layer_not_found(layer_slug, &map_layers).into()),
    };

    if !layer.views.contains_key(&view_slug) {
        return Err(LayersError::new_view_not_found(view_slug, layer).into());
    }

    let mut root_url = get_root_url()?;
    if !root_url.path().ends_with('/') {
        root_url.path_segments_mut().unwrap().push(""); // Add a trailing slash
    }
    let root_url = root_url.to_string();
    let tiles_url_pattern =
        format!("{root_url}layers/tile/{layer_slug}/{view_slug}/{{z}}/{{x}}/{{y}}/?infra={infra}");

    Ok(Json(ViewMetadata {
        data_type: "vector".to_owned(),
        name: layer_slug,
        promote_id: json!({"layer_slug": layer.id_field}),
        scheme: "xyz".to_owned(),
        tiles: vec![tiles_url_pattern],
        attribution: layer.attribution.clone().unwrap_or_default(),
        minzoom: 5,
        maxzoom: map_layers_config.max_zoom,
    }))
}

#[derive(Deserialize, IntoParams)]
#[allow(unused)]
struct TileParams {
    layer_slug: String,
    view_slug: String,
    x: u64,
    y: u64,
    z: u64,
}

/// Mvt tile from the cache if possible, otherwise gets data from the database and caches it in redis
#[utoipa::path(
    tag = "layers",
    params(InfraQueryParam, TileParams),
    responses(
        (status = 200, body = Vec<u8>, description = "Successful Response"),
    )
)]
#[get("")]
async fn cache_and_get_mvt_tile(
    path: Path<(String, String, u64, u64, u64)>,
    params: Query<InfraQueryParam>,
    map_layers: Data<MapLayers>,
    db_pool: Data<DbPool>,
    redis_client: Data<RedisClient>,
) -> Result<HttpResponse> {
    let (layer_slug, view_slug, z, x, y) = path.into_inner();
    let infra = params.infra;
    let layer = match map_layers.layers.get(&layer_slug) {
        Some(layer) => layer,
        None => return Err(LayersError::new_layer_not_found(layer_slug, &map_layers).into()),
    };
    let view = match layer.views.get(&view_slug) {
        Some(view) => view,
        None => return Err(LayersError::new_view_not_found(view_slug, layer).into()),
    };
    let cache_key = get_cache_tile_key(
        &get_view_cache_prefix(&layer_slug, infra, &view_slug),
        &Tile { x, y, z },
    );

    let mut redis_conn = redis_client.get_connection().await?;
    let cached_value = get::<_, Vec<u8>>(&mut redis_conn, &cache_key).await;

    if let Some(value) = cached_value {
        return Ok(HttpResponse::Ok()
            .content_type("application/x-protobuf")
            .body(value));
    }

    let geo_json_query = get_geo_json_sql_query(&layer.table_name, view);
    let mut conn = db_pool.get().await?;
    let records = sql_query(geo_json_query)
        .bind::<Integer, _>(z as i32)
        .bind::<Integer, _>(x as i32)
        .bind::<Integer, _>(y as i32)
        .bind::<Integer, _>(infra as i32)
        .get_results::<GeoJsonAndData>(&mut conn)
        .await?;

    let mvt_bytes: Vec<u8> = create_and_fill_mvt_tile(layer_slug, records)
        .to_bytes()
        .unwrap();
    set(
        &mut redis_conn,
        &cache_key,
        mvt_bytes.clone(),
        view.cache_duration,
    )
    .await
    .unwrap_or_else(|_| panic!("Fail to set value in redis with key {cache_key}"));
    Ok(HttpResponse::Ok()
        .content_type("application/x-protobuf")
        .body(mvt_bytes))
}

#[cfg(test)]
mod tests {
    use crate::error::InternalError;
    use crate::map::MapLayers;
    use crate::views::tests::create_test_service;
    use actix_web::{
        http::StatusCode,
        test::{call_service, read_body_json, TestRequest},
    };
    use rstest::rstest;
    use serde_json::{json, to_value, Value as JsonValue};

    use super::LayersError;

    /// Run a simple get query on `uri` and check the status code and json body
    async fn test_get_query(uri: &str, expected_status: StatusCode, expected_body: JsonValue) {
        let app = create_test_service().await;
        let req = TestRequest::get().uri(uri).to_request();
        let response = call_service(&app, req).await;
        assert_eq!(response.status(), expected_status);
        let body: JsonValue = read_body_json(response).await;
        assert_eq!(expected_body, body)
    }

    async fn test_get_query_with_preset_values(root_url: &str) {
        let tiles = root_url.to_string() + "layers/tile/track_sections/geo/{z}/{x}/{y}/?infra=2";
        test_get_query(
            "/layers/layer/track_sections/mvt/geo?infra=2",
            StatusCode::OK,
            json!({
                "type": "vector",
                "name": "track_sections",
                "promoteId": {
                    "track_sections": "id"
                },
                "scheme": "xyz",
                "tiles": [tiles],
                "attribution": "",
                "minzoom": 5,
                "maxzoom": 18
            }),
        )
        .await;
    }

    #[rstest]
    async fn layer_view_ko() {
        let map_layers = MapLayers::parse();
        let error: InternalError =
            LayersError::new_view_not_found("does_not_exist", &map_layers.layers["track_sections"])
                .into();
        test_get_query(
            "/layers/layer/track_sections/mvt/does_not_exist?infra=2",
            StatusCode::NOT_FOUND,
            to_value(error).unwrap(),
        )
        .await;
    }

    #[rstest]
    async fn layer_view_ok() {
        // We can't use #[case] here, for these cases can't run in parallel.
        for (root_url, expected_root_url) in [
            ("http://localhost:8090", "http://localhost:8090/"),
            ("http://localhost:8090/", "http://localhost:8090/"),
            ("http://localhost:8090/test", "http://localhost:8090/test/"),
            ("http://localhost:8090/test/", "http://localhost:8090/test/"),
        ] {
            std::env::set_var("ROOT_URL", root_url);
            test_get_query_with_preset_values(expected_root_url).await;
        }
    }
}
