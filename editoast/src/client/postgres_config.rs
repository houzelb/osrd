use clap::Args;
use derivative::Derivative;
use url::Url;

use crate::views;

#[derive(Args, Debug, Derivative, Clone)]
#[derivative(Default)]
pub struct PostgresConfig {
    #[derivative(Default(
        value = "Url::parse(\"postgres://osrd:password@localhost:5432/osrd\").unwrap()"
    ))]
    #[arg(
        long,
        env,
        default_value_t = Url::parse("postgres://osrd:password@localhost:5432/osrd").unwrap()
    )]
    pub database_url: Url,
    #[derivative(Default(value = "32"))]
    #[arg(long, env, default_value_t = 32)]
    pub pool_size: usize,
}

impl From<PostgresConfig> for views::PostgresConfig {
    fn from(
        PostgresConfig {
            database_url,
            pool_size,
        }: PostgresConfig,
    ) -> Self {
        views::PostgresConfig {
            database_url,
            pool_size,
        }
    }
}
