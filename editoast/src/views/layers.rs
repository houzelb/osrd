use std::collections::HashMap;

use axum::extract::Json;
use axum::extract::Path;
use axum::extract::Query;
use axum::extract::State;
use axum::http::header::CONTENT_TYPE;
use axum::response::IntoResponse;
use axum::Extension;
use editoast_authz::BuiltinRole;
use editoast_derive::EditoastError;
use redis::AsyncCommands;
use serde::Deserialize;
use serde::Serialize;
use thiserror::Error;
use utoipa::IntoParams;
use utoipa::ToSchema;

use crate::client::get_root_url;
use crate::error::Result;
use crate::map::get_cache_tile_key;
use crate::map::get_view_cache_prefix;
use crate::map::Layer;
use crate::map::MapLayers;
use crate::map::Tile;
use crate::models::layers::geo_json_and_data::create_and_fill_mvt_tile;
use crate::models::layers::geo_json_and_data::GeoJsonAndData;
use crate::views::AuthenticationExt;
use crate::views::AuthorizationError;
use crate::AppState;

crate::routes! {
     "/layers" => {
        "/layer/{layer_slug}/mvt/{view_slug}" => layer_view,
        "/tile/{layer_slug}/{view_slug}/{z}/{x}/{y}" => cache_and_get_mvt_tile,
    },
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

#[derive(Debug, Serialize, Deserialize, PartialEq, ToSchema)]
struct ViewMetadata {
    #[serde(rename = "type")]
    data_type: String,
    #[schema(example = "track_sections")]
    name: String,
    #[serde(rename = "promoteId")]
    #[schema(value_type = HashMap<String, String>)]
    promote_id: HashMap<String, String>,
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
    get, path = "",
    tag = "layers",
    params(InfraQueryParam, LayerViewParams),
    responses(
        (status = 200, body = inline(ViewMetadata), description = "Successful Response"),
    )
)]
async fn layer_view(
    State(AppState {
        map_layers, config, ..
    }): State<AppState>,
    Extension(auth): AuthenticationExt,
    Path((layer_slug, view_slug)): Path<(String, String)>,
    Query(InfraQueryParam { infra: infra_id }): Query<InfraQueryParam>,
) -> Result<Json<ViewMetadata>> {
    let authorized = auth
        .check_roles([BuiltinRole::MapRead].into())
        .await
        .map_err(AuthorizationError::AuthError)?;
    if !authorized {
        return Err(AuthorizationError::Forbidden.into());
    }

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
    let tiles_url_pattern = format!(
        "{root_url}layers/tile/{layer_slug}/{view_slug}/{{z}}/{{x}}/{{y}}/?infra={infra_id}"
    );

    Ok(Json(ViewMetadata {
        data_type: "vector".to_owned(),
        name: layer_slug.to_owned(),
        promote_id: HashMap::from([(layer_slug, layer.id_field.clone().unwrap_or_default())]),
        scheme: "xyz".to_owned(),
        tiles: vec![tiles_url_pattern],
        attribution: layer.attribution.clone().unwrap_or_default(),
        minzoom: 5,
        maxzoom: config.map_layers_max_zoom as u64,
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

/// Mvt tile from the cache if possible, otherwise gets data from the database and caches it in valkey
#[utoipa::path(
    get, path = "",
    tag = "layers",
    params(InfraQueryParam, TileParams),
    responses(
        (status = 200, body = Vec<u8>, description = "Successful Response"),
    )
)]
async fn cache_and_get_mvt_tile(
    State(AppState {
        map_layers,
        db_pool,
        valkey,
        ..
    }): State<AppState>,
    Extension(auth): AuthenticationExt,
    Path((layer_slug, view_slug, z, x, y)): Path<(String, String, u64, u64, u64)>,
    Query(InfraQueryParam { infra: infra_id }): Query<InfraQueryParam>,
) -> Result<impl IntoResponse> {
    let authorized = auth
        .check_roles([BuiltinRole::MapRead].into())
        .await
        .map_err(AuthorizationError::AuthError)?;
    if !authorized {
        return Err(AuthorizationError::Forbidden.into());
    }

    let layer = match map_layers.layers.get(&layer_slug) {
        Some(layer) => layer,
        None => return Err(LayersError::new_layer_not_found(layer_slug, &map_layers).into()),
    };
    let view = match layer.views.get(&view_slug) {
        Some(view) => view,
        None => return Err(LayersError::new_view_not_found(view_slug, layer).into()),
    };
    let cache_key = get_cache_tile_key(
        &get_view_cache_prefix(&layer_slug, infra_id, &view_slug),
        &Tile { x, y, z },
    );

    let mut valkey = valkey.get_connection().await?;
    let cached_value: Option<Vec<u8>> = valkey.get(&cache_key).await?;

    if let Some(value) = cached_value {
        return Ok(([(CONTENT_TYPE, "application/x-protobuf")], value));
    }

    let conn = &mut db_pool.get().await?;
    let records = GeoJsonAndData::get_records(conn, layer, view, infra_id, (x, y, z)).await?;

    let mvt_bytes: Vec<u8> = create_and_fill_mvt_tile(layer_slug, records)
        .to_bytes()
        .unwrap();
    valkey
        .set(&cache_key, mvt_bytes.clone())
        .await
        .unwrap_or_else(|_| panic!("Failed to set value in valkey with key {cache_key}"));

    Ok(([(CONTENT_TYPE, "application/x-protobuf")], mvt_bytes))
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use axum::http::StatusCode;
    use rstest::rstest;
    use serde::de::DeserializeOwned;
    use serde_json::to_value;

    use super::LayersError;
    use crate::error::InternalError;
    use crate::map::MapLayers;
    use crate::views::layers::ViewMetadata;
    use crate::views::test_app::TestAppBuilder;

    /// Run a simple get query on `uri` and check the status code and json body
    async fn test_get_query<T: DeserializeOwned + PartialEq + std::fmt::Debug>(
        uri: &str,
        expected_status: StatusCode,
        expected_body: T,
    ) {
        let app = TestAppBuilder::default_app();
        let request = app.get(uri);
        let body: T = app
            .fetch(request)
            .assert_status(expected_status)
            .json_into();
        assert_eq!(expected_body, body)
    }

    async fn test_get_query_with_preset_values(root_url: &str) {
        let tiles = root_url.to_string() + "layers/tile/track_sections/geo/{z}/{x}/{y}/?infra=2";
        test_get_query(
            "/layers/layer/track_sections/mvt/geo?infra=2",
            StatusCode::OK,
            ViewMetadata {
                data_type: "vector".to_string(),
                name: "track_sections".to_string(),
                promote_id: HashMap::from([("track_sections".to_string(), "id".to_string())]),
                scheme: "xyz".to_string(),
                tiles: vec![tiles],
                attribution: "".to_string(),
                minzoom: 5,
                maxzoom: 18,
            },
        )
        .await;
    }

    #[rstest]
    async fn layer_view_ko() {
        let map_layers = MapLayers::default();
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
