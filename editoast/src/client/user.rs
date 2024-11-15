use clap::Args;
use clap::Subcommand;
use diesel::{ExpressionMethods, QueryDsl};
use diesel_async::RunQueryDsl;
use editoast_authz::authorizer::{StorageDriver, UserInfo};
use editoast_authz::BuiltinRole;
use editoast_models::tables::authn_group_membership;
use editoast_models::tables::authn_user;
use editoast_models::DbConnectionPoolV2;
use std::ops::DerefMut;
use std::sync::Arc;

use crate::models::auth::PgAuthDriver;

#[derive(Debug, Subcommand)]
pub enum UserCommand {
    /// List users
    List(ListArgs),
    /// Add a user
    Add(AddArgs),
}

#[derive(Debug, Args)]
pub struct ListArgs {
    /// Filter out users that are already in a group
    #[arg(long)]
    without_groups: bool,
}

#[derive(Debug, Args)]
pub struct AddArgs {
    /// Identity of the user
    identity: String,
    /// Name of the user
    name: Option<String>,
}

/// List users
pub async fn list_user(args: ListArgs, pool: Arc<DbConnectionPoolV2>) -> anyhow::Result<()> {
    let conn = pool.get().await?;
    let users_query = authn_user::table
        .left_join(authn_group_membership::table)
        .select(authn_user::all_columns);

    let users = if args.without_groups {
        users_query
            .filter(authn_group_membership::user.is_null())
            .load::<(i64, String, Option<String>)>(conn.write().await.deref_mut())
            .await?
    } else {
        users_query
            .load::<(i64, String, Option<String>)>(conn.write().await.deref_mut())
            .await?
    };
    for (id, identity, name) in &users {
        let display = match name {
            Some(name) => format!("{} ({})", identity, name),
            None => identity.to_string(),
        };
        println!("[{}]: {}", id, display);
    }
    if users.is_empty() {
        println!("No user found");
    }
    Ok(())
}

/// Add a user
pub async fn add_user(args: AddArgs, pool: Arc<DbConnectionPoolV2>) -> anyhow::Result<()> {
    let driver = PgAuthDriver::<BuiltinRole>::new(pool);

    let user_info = UserInfo {
        identity: args.identity,
        name: args.name.unwrap_or_default(),
    };
    let subject_id = driver.ensure_user(&user_info).await?;
    println!("User added with id: {}", subject_id);
    Ok(())
}
