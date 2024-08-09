use std::collections::hash_map::DefaultHasher;
use std::collections::HashMap;
use std::hash::Hash;
use std::hash::Hasher;
use std::sync::Arc;

use axum::extract::Json;
use axum::extract::Path;
use axum::extract::State;
use axum::Extension;
use editoast_authz::BuiltinRole;
use editoast_schemas::rolling_stock::LoadingGaugeType;
use editoast_schemas::train_schedule::PathItemLocation;
use ordered_float::OrderedFloat;
use serde::Deserialize;
use tracing::debug;
use tracing::info;
use utoipa::ToSchema;

use crate::core::pathfinding::PathfindingRequest;
use crate::core::pathfinding::PathfindingResult;
use crate::core::AsCoreRequest;
use crate::core::CoreClient;
use crate::error::Result;
use crate::models::train_schedule::TrainSchedule;
use crate::models::Infra;
use crate::models::Retrieve;
use crate::models::RollingStockModel;
use crate::redis_utils::RedisConnection;
use crate::views::get_app_version;
use crate::views::path::path_item_cache::PathItemCache;
use crate::views::path::PathfindingError;
use crate::views::AuthorizationError;
use crate::views::AuthorizerExt;
use crate::AppState;
use editoast_models::DbConnection;

crate::routes! {
    "/infra/{infra_id}/pathfinding/blocks" => post,
}

editoast_common::schemas! {
    PathfindingInput,
}

/// Path input is described by some rolling stock information
/// and a list of path waypoints
#[derive(Deserialize, Clone, Debug, Hash, ToSchema)]
struct PathfindingInput {
    /// The loading gauge of the rolling stock
    rolling_stock_loading_gauge: LoadingGaugeType,
    /// Can the rolling stock run on non-electrified tracks
    rolling_stock_is_thermal: bool,
    /// List of supported electrification modes.
    /// Empty if does not support any electrification
    rolling_stock_supported_electrifications: Vec<String>,
    /// List of supported signaling systems
    rolling_stock_supported_signaling_systems: Vec<String>,
    /// List of waypoints given to the pathfinding
    path_items: Vec<PathItemLocation>,
    /// Rolling stock maximum speed
    #[schema(value_type = f64)]
    rolling_stock_maximum_speed: OrderedFloat<f64>,
    /// Rolling stock length
    #[schema(value_type = f64)]
    rolling_stock_length: OrderedFloat<f64>,
}

/// Compute a pathfinding
#[utoipa::path(
    post, path = "",
    tag = "pathfinding",
    params(
        ("infra_id" = i64, Path, description = "The infra id"),
    ),
    request_body = PathfindingInput,
    responses(
        (status = 200, description = "Pathfinding Result", body = PathfindingResult),
    ),
)]
async fn post(
    State(AppState {
        db_pool_v2: db_pool,
        redis,
        core_client,
        ..
    }): State<AppState>,
    Extension(authorizer): AuthorizerExt,
    Path(infra_id): Path<i64>,
    Json(path_input): Json<PathfindingInput>,
) -> Result<Json<PathfindingResult>> {
    let authorized = authorizer
        .check_roles([BuiltinRole::InfraRead].into())
        .await
        .map_err(AuthorizationError::AuthError)?;
    if !authorized {
        return Err(AuthorizationError::Unauthorized.into());
    }

    let conn = &mut db_pool.get().await?;
    let mut redis_conn = redis.get_connection().await?;
    let infra = Infra::retrieve_or_fail(conn, infra_id, || PathfindingError::InfraNotFound {
        infra_id,
    })
    .await?;

    Ok(Json(
        pathfinding_blocks(conn, &mut redis_conn, core_client, &infra, path_input).await?,
    ))
}

/// Pathfinding computation given a path input
async fn pathfinding_blocks(
    conn: &mut DbConnection,
    redis_conn: &mut RedisConnection,
    core: Arc<CoreClient>,
    infra: &Infra,
    path_input: PathfindingInput,
) -> Result<PathfindingResult> {
    let mut path = pathfinding_blocks_batch(conn, redis_conn, core, infra, &[path_input]).await?;
    Ok(path.pop().unwrap())
}

/// Pathfinding batch computation given a list of path inputs
async fn pathfinding_blocks_batch(
    conn: &mut DbConnection,
    redis_conn: &mut RedisConnection,
    core: Arc<CoreClient>,
    infra: &Infra,
    pathfinding_inputs: &[PathfindingInput],
) -> Result<Vec<PathfindingResult>> {
    // Compute hashes of all path_inputs
    let hashes: Vec<_> = pathfinding_inputs
        .iter()
        .map(|input| path_input_hash(infra.id, &infra.version, input))
        .collect();

    // Try to retrieve the result from Redis
    let mut pathfinding_results: Vec<Option<PathfindingResult>> =
        redis_conn.json_get_bulk(&hashes).await?;

    // Report number of hit cache
    let nb_hit = pathfinding_results.iter().flatten().count();
    info!(
        nb_hit,
        nb_miss = pathfinding_inputs.len() - nb_hit,
        "Hit cache"
    );

    // Handle miss cache:
    debug!("Extracting locations from path items");
    let path_items: Vec<_> = pathfinding_results
        .iter()
        .zip(pathfinding_inputs)
        .filter(|(res, _)| res.is_none())
        .flat_map(|(_, input)| &input.path_items)
        .collect();
    let path_item_cache = PathItemCache::load(conn, infra.id, &path_items).await?;

    debug!(
        nb_path_items = path_items.len(),
        "Preparing pathfinding requests"
    );
    let mut to_cache = vec![];
    let mut pathfinding_requests = vec![];
    let mut pathfinding_requests_index = vec![];
    for (index, (pathfinding_result, pathfinding_input)) in pathfinding_results
        .iter_mut()
        .zip(pathfinding_inputs)
        .enumerate()
    {
        if pathfinding_result.is_some() {
            continue;
        }

        match build_pathfinding_request(pathfinding_input, infra, &path_item_cache) {
            Ok(pathfinding_request) => {
                pathfinding_requests.push(pathfinding_request);
                pathfinding_requests_index.push(index);
            }
            Err(result) => {
                *pathfinding_result = Some(result.clone());
                to_cache.push((&hashes[index], result));
            }
        }
    }

    debug!(
        nb_requests = pathfinding_requests.len(),
        "Sending pathfinding requests to core"
    );
    let mut futures = vec![];
    for request in &pathfinding_requests {
        futures.push(Box::pin(request.fetch(core.as_ref())));
    }
    let computed_paths: Vec<_> = futures::future::join_all(futures)
        .await
        .into_iter()
        .collect();

    for (index, path_result) in computed_paths.into_iter().enumerate() {
        let path_index = pathfinding_requests_index[index];
        let path = match path_result {
            Ok(path) => {
                to_cache.push((&hashes[path_index], path.clone()));
                path
            }
            // TODO: only make HTTP status code errors non-fatal
            Err(core_error) => PathfindingResult::PathfindingFailed { core_error },
        };
        pathfinding_results[path_index] = Some(path);
    }

    debug!(nb_results = to_cache.len(), "Caching pathfinding response");
    redis_conn.json_set_bulk(&to_cache).await?;

    Ok(pathfinding_results.into_iter().flatten().collect())
}

fn build_pathfinding_request(
    pathfinding_input: &PathfindingInput,
    infra: &Infra,
    path_item_cache: &PathItemCache,
) -> std::result::Result<PathfindingRequest, PathfindingResult> {
    let path_items: Vec<_> = pathfinding_input.path_items.iter().collect();
    if path_items.len() <= 1 {
        return Err(PathfindingResult::NotEnoughPathItems);
    }
    let track_offsets = path_item_cache.extract_location_from_path_items(&path_items)?;

    // Create the pathfinding request
    Ok(PathfindingRequest {
        infra: infra.id,
        expected_version: infra.version.clone(),
        path_items: track_offsets,
        rolling_stock_loading_gauge: pathfinding_input.rolling_stock_loading_gauge,
        rolling_stock_is_thermal: pathfinding_input.rolling_stock_is_thermal,
        rolling_stock_supported_electrifications: pathfinding_input
            .rolling_stock_supported_electrifications
            .clone(),
        rolling_stock_supported_signaling_systems: pathfinding_input
            .rolling_stock_supported_signaling_systems
            .clone(),
        rolling_stock_maximum_speed: pathfinding_input.rolling_stock_maximum_speed.0,
        rolling_stock_length: pathfinding_input.rolling_stock_length.0,
    })
}

/// Compute a path given a train schedule and an infrastructure.
pub async fn pathfinding_from_train(
    conn: &mut DbConnection,
    redis: &mut RedisConnection,
    core: Arc<CoreClient>,
    infra: &Infra,
    train_schedule: TrainSchedule,
) -> Result<PathfindingResult> {
    let rolling_stocks =
        RollingStockModel::retrieve(conn, train_schedule.rolling_stock_name.clone())
            .await?
            .into_iter()
            .map(|rs| (rs.name.clone(), rs))
            .collect();

    Ok(
        pathfinding_from_train_batch(conn, redis, core, infra, &[train_schedule], &rolling_stocks)
            .await?
            .pop()
            .unwrap(),
    )
}

/// Compute a path given a batch of trainschedule and an infrastructure.
pub async fn pathfinding_from_train_batch(
    conn: &mut DbConnection,
    redis: &mut RedisConnection,
    core: Arc<CoreClient>,
    infra: &Infra,
    train_schedules: &[TrainSchedule],
    rolling_stocks: &HashMap<String, RollingStockModel>,
) -> Result<Vec<PathfindingResult>> {
    let mut results = vec![PathfindingResult::NotEnoughPathItems; train_schedules.len()];
    let mut to_compute = vec![];
    let mut to_compute_index = vec![];
    for (index, train_schedule) in train_schedules.iter().enumerate() {
        // Retrieve rolling stock
        let rolling_stock_name = &train_schedule.rolling_stock_name;
        let Some(rolling_stock) = rolling_stocks.get(rolling_stock_name).cloned() else {
            let rolling_stock_name = rolling_stock_name.clone();
            results[index] = PathfindingResult::RollingStockNotFound { rolling_stock_name };
            continue;
        };

        // Create the path input
        let path_input = PathfindingInput {
            rolling_stock_loading_gauge: rolling_stock.loading_gauge,
            rolling_stock_is_thermal: rolling_stock.has_thermal_curves(),
            rolling_stock_supported_electrifications: rolling_stock.supported_electrification(),
            rolling_stock_supported_signaling_systems: rolling_stock.supported_signaling_systems.0,
            rolling_stock_maximum_speed: OrderedFloat(rolling_stock.max_speed),
            rolling_stock_length: OrderedFloat(rolling_stock.length),
            path_items: train_schedule
                .path
                .clone()
                .into_iter()
                .map(|item| item.location)
                .collect(),
        };
        to_compute.push(path_input);
        to_compute_index.push(index);
    }

    for (index, res) in pathfinding_blocks_batch(conn, redis, core, infra, &to_compute)
        .await?
        .into_iter()
        .enumerate()
    {
        results[to_compute_index[index]] = res;
    }
    Ok(results)
}

/// Generates a unique hash based on the pathfinding entries.
/// We need to recalculate the path if:
///   - The path entry is different
///   - The infrastructure has been modified
///   - The application has been updated (the algorithm or payloads may have changed)
fn path_input_hash(infra: i64, infra_version: &String, path_input: &PathfindingInput) -> String {
    // Retrieve OSRD Version
    let osrd_version = get_app_version().unwrap_or_default();
    let mut hasher = DefaultHasher::new();
    path_input.hash(&mut hasher);
    let hash_path_input = hasher.finish();
    format!("pathfinding_{osrd_version}.{infra}.{infra_version}.{hash_path_input}")
}