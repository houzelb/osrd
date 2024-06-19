use super::worker_driver::{DriverError, WorkerDriver, WorkerMetadata};
use std::{collections::BTreeMap, future::Future, pin::Pin};
use uuid::Uuid;

pub struct NoopDriver {
    fixed_pool_id: Uuid,
}

impl NoopDriver {
    pub fn new() -> Self {
        NoopDriver {
            fixed_pool_id: Uuid::new_v4(),
        }
    }
}

impl WorkerDriver for NoopDriver {
    fn get_or_create_core_pool(
        &self,
        _infra_id: usize,
    ) -> Pin<Box<dyn Future<Output = Result<Uuid, DriverError>> + Send + '_>> {
        Box::pin(async move { Ok(self.fixed_pool_id) })
    }

    fn destroy_core_pool(
        &self,
        _infra_id: usize,
    ) -> Pin<Box<dyn Future<Output = Result<(), DriverError>> + Send + '_>> {
        Box::pin(async move { Ok(()) })
    }

    fn list_core_pools(
        &self,
    ) -> Pin<Box<dyn Future<Output = Result<Vec<WorkerMetadata>, DriverError>> + Send + '_>> {
        Box::pin(async move {
            Ok(vec![WorkerMetadata {
                external_id: self.fixed_pool_id.to_string(),
                core_id: self.fixed_pool_id,
                infra_id: 0,
            }])
        })
    }
}
