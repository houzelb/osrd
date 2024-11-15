use anyhow::anyhow;
use anyhow::bail;
use clap::Args;
use clap::Subcommand;
use diesel::delete;
use diesel::insert_into;
use diesel::prelude::*;
use diesel_async::scoped_futures::ScopedFutureExt;
use diesel_async::RunQueryDsl;
use editoast_authz::authorizer::StorageDriver;
use editoast_authz::BuiltinRole;
use editoast_models::tables::authn_group;
use editoast_models::tables::authn_group_membership;
use editoast_models::tables::authn_subject;
use editoast_models::DbConnectionPoolV2;
use std::ops::DerefMut;
use std::sync::Arc;

use crate::models::auth::PgAuthDriver;

#[derive(Debug, Subcommand)]
pub enum GroupCommand {
    /// Create a group
    Create(CreateArgs),
    /// List groups
    List,
    /// Add members to a group
    Include(IncludeArgs),
    /// Remove members to a group
    Exclude(ExcludeArgs),
}

#[derive(Debug, Args)]
pub struct CreateArgs {
    /// Group name
    name: String,
}

#[derive(Debug, Args)]
pub struct IncludeArgs {
    /// Group name
    group_name: String,
    /// Users to add
    users: Vec<String>,
}

#[derive(Debug, Args)]
pub struct ExcludeArgs {
    /// Group name
    group_name: String,
    /// Users to remove
    users: Vec<String>,
}

pub async fn create_group(args: CreateArgs, pool: Arc<DbConnectionPoolV2>) -> anyhow::Result<()> {
    let conn = pool.get().await?;

    conn.transaction(|conn| {
        async move {
            let id: i64 = insert_into(authn_subject::table)
                .default_values()
                .returning(authn_subject::id)
                .get_result(&mut conn.clone().write().await)
                .await?;
            insert_into(authn_group::table)
                .values((authn_group::id.eq(id), authn_group::name.eq(&args.name)))
                .execute(conn.write().await.deref_mut())
                .await?;
            println!(r#"Group "{}" created with id [{}]"#, &args.name, id);
            Ok(())
        }
        .scope_boxed()
    })
    .await
}

pub async fn list_group(pool: Arc<DbConnectionPoolV2>) -> anyhow::Result<()> {
    let conn = pool.get().await?;

    let groups = authn_group::table
        .select(authn_group::all_columns)
        .load::<(i64, String)>(conn.write().await.deref_mut())
        .await?;
    if groups.is_empty() {
        println!("No group found.");
        return Ok(());
    }
    for (id, name) in &groups {
        println!("[{}]: {}", id, name);
    }
    Ok(())
}

/// Exclude users from a group
pub async fn exclude_group(args: ExcludeArgs, pool: Arc<DbConnectionPoolV2>) -> anyhow::Result<()> {
    if args.users.is_empty() {
        bail!("No user specified");
    }

    let conn = pool.get().await?;

    let gid = authn_group::table
        .select(authn_group::id)
        .filter(authn_group::name.eq(&args.group_name))
        .first::<i64>(conn.write().await.deref_mut())
        .await?;

    let driver = PgAuthDriver::<BuiltinRole>::new(pool);
    let mut conds = vec![];
    for user in &args.users {
        let uid = if let Ok(id) = user.parse::<i64>() {
            id
        } else {
            let uid = driver.get_user_id(user).await?;
            uid.ok_or_else(|| anyhow!("No user with identity '{user}' found"))?
        };
        conds.push(
            authn_group_membership::group
                .eq(gid)
                .and(authn_group_membership::user.eq(uid)),
        );
    }
    let mut expr = delete(authn_group_membership::table)
        .filter(conds[0])
        .into_boxed();

    for cond in conds.iter().skip(1) {
        expr = expr.or_filter(*cond);
    }

    let deleted = expr.execute(conn.write().await.deref_mut()).await?;
    println!(
        "{} user(s) removed from group '{}'",
        deleted, args.group_name
    );

    Ok(())
}

/// Include users in a group
pub async fn include_group(args: IncludeArgs, pool: Arc<DbConnectionPoolV2>) -> anyhow::Result<()> {
    if args.users.is_empty() {
        bail!("No user specified");
    }

    let conn = pool.get().await?;

    let gid = authn_group::table
        .select(authn_group::id)
        .filter(authn_group::name.eq(&args.group_name))
        .first::<i64>(conn.write().await.deref_mut())
        .await?;

    let driver = PgAuthDriver::<BuiltinRole>::new(pool);
    let mut values = vec![];
    for user in &args.users {
        let uid = if let Ok(id) = user.parse::<i64>() {
            id
        } else {
            let uid = driver.get_user_id(user).await?;
            uid.ok_or_else(|| anyhow!("No user with identity '{user}' found"))?
        };
        values.push((
            authn_group_membership::user.eq(uid),
            authn_group_membership::group.eq(gid),
        ));
    }

    insert_into(authn_group_membership::table)
        .values(values)
        .execute(conn.write().await.deref_mut())
        .await?;

    Ok(())
}
