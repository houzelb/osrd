pub mod docker;
pub mod kubernetes;
pub mod noop;
pub mod worker_driver;

const LABEL_MANAGED_BY: &str = "osrd/managed_by";
const LABEL_CORE_ID: &str = "osrd/core_id";
const LABEL_INFRA_ID: &str = "osrd/infra_id";
const MANAGED_BY_VALUE: &str = "osrdyne";
