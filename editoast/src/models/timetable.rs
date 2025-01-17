use chrono::DateTime;
use chrono::Utc;
use diesel::prelude::*;
use diesel::sql_query;
use diesel::sql_types::Array;
use diesel::sql_types::BigInt;
use diesel_async::RunQueryDsl;
use futures_util::stream::TryStreamExt;
use std::ops::DerefMut;

use crate::error::Result;
use crate::models::prelude::*;
use crate::models::train_schedule::TrainSchedule;
use crate::models::Identifiable;
use crate::models::{DeleteStatic, Retrieve};
use crate::Exists;
use editoast_models::tables::timetable::dsl;
use editoast_models::DbConnection;

#[derive(Debug, Default, Clone, PartialEq, Queryable, Identifiable)]
#[diesel(table_name = editoast_models::tables::timetable)]
#[cfg_attr(test, derive(serde::Deserialize))]
pub struct Timetable {
    pub id: i64,
}

impl Timetable {
    #[tracing::instrument(name = "model:create<Timetable>", skip_all, err)]
    pub async fn create(conn: &mut DbConnection) -> Result<Self> {
        diesel::insert_into(editoast_models::tables::timetable::table)
            .default_values()
            .get_result::<Timetable>(conn.write().await.deref_mut())
            .await
            .map(Into::into)
            .map_err(Into::into)
    }

    pub async fn trains_count(timetable_id: i64, conn: &mut DbConnection) -> Result<i64> {
        use editoast_models::tables::train_schedule::dsl;

        dsl::train_schedule
            .filter(dsl::timetable_id.eq(timetable_id))
            .count()
            .get_result(conn.write().await.deref_mut())
            .await
            .map_err(Into::into)
    }

    pub async fn gather_start_times(
        timetable_id: i64,
        conn: &mut DbConnection,
    ) -> Result<Vec<DateTime<Utc>>> {
        use editoast_models::tables::train_schedule::dsl;

        dsl::train_schedule
            .select(dsl::start_time)
            .filter(dsl::timetable_id.eq(timetable_id))
            .load(conn.write().await.deref_mut())
            .await
            .map_err(Into::into)
    }

    pub async fn schedules_before_date(
        self,
        conn: &mut DbConnection,
        time: DateTime<Utc>,
    ) -> Result<Vec<TrainSchedule>> {
        use diesel::prelude::*;
        use diesel_async::RunQueryDsl;
        use editoast_models::tables::train_schedule::dsl;

        let train_schedules = dsl::train_schedule
            .filter(dsl::start_time.le(time))
            .filter(dsl::timetable_id.eq(self.id))
            .load_stream::<Row<TrainSchedule>>(conn.write().await.deref_mut())
            .await?
            .map_ok(|ts| ts.into())
            .try_collect::<Vec<TrainSchedule>>()
            .await;
        match train_schedules {
            Ok(train_schedules) => Ok(train_schedules),
            Err(err) => Err(err.into()),
        }
    }
}

#[async_trait::async_trait]
impl DeleteStatic<i64> for Timetable {
    #[allow(clippy::blocks_in_conditions)] // TODO: Remove this once using clippy 0.1.80
    #[tracing::instrument(name = "model:delete_static<Timetable>", skip_all, ret, err)]
    async fn delete_static(conn: &mut DbConnection, id: i64) -> Result<bool> {
        diesel::delete(dsl::timetable.filter(dsl::id.eq(id)))
            .execute(conn.write().await.deref_mut())
            .await
            .map(|n| n == 1)
            .map_err(Into::into)
    }
}

#[async_trait::async_trait]
impl Retrieve<i64> for Timetable {
    #[allow(clippy::blocks_in_conditions)] // TODO: Remove this once using clippy 0.1.80
    #[tracing::instrument(name = "model:retrieve<Timetable>", skip_all, err)]
    async fn retrieve(
        conn: &mut editoast_models::DbConnection,
        id: i64,
    ) -> crate::error::Result<Option<Timetable>> {
        dsl::timetable
            .filter(dsl::id.eq(id))
            .first::<Timetable>(conn.write().await.deref_mut())
            .await
            .optional()
            .map_err(Into::into)
    }
}

#[async_trait::async_trait]
impl Exists<i64> for Timetable {
    #[allow(clippy::blocks_in_conditions)] // TODO: Remove this once using clippy 0.1.80
    #[tracing::instrument(name = "model:exists<Timetable>", skip_all, ret, err)]
    async fn exists(conn: &mut DbConnection, id: i64) -> Result<bool> {
        Self::retrieve(conn, id)
            .await
            .map(|r| r.is_some())
            .map_err(Into::into)
    }
}

impl Identifiable<i64> for Timetable {
    fn get_id(&self) -> i64 {
        self.id
    }
}

/// Should be used to retrieve a timetable with its trains
#[derive(Debug, Clone, QueryableByName)]
pub struct TimetableWithTrains {
    #[diesel(sql_type = BigInt)]
    pub id: i64,
    #[diesel(sql_type = Array<BigInt>)]
    pub train_ids: Vec<i64>,
}

#[async_trait::async_trait]
impl Retrieve<i64> for TimetableWithTrains {
    async fn retrieve(conn: &mut DbConnection, timetable_id: i64) -> Result<Option<Self>> {
        let result = sql_query(
            "SELECT timetable.*,
        array_remove(array_agg(train_schedule.id), NULL) as train_ids
        FROM timetable
        LEFT JOIN train_schedule ON timetable.id = train_schedule.timetable_id
        WHERE timetable.id = $1
        GROUP BY timetable.id",
        )
        .bind::<BigInt, _>(timetable_id)
        .get_result::<TimetableWithTrains>(conn.write().await.deref_mut())
        .await;
        match result {
            Ok(result) => Ok(Some(result)),
            Err(diesel::result::Error::NotFound) => Ok(None),
            Err(err) => Err(err.into()),
        }
    }
}

impl From<TimetableWithTrains> for Timetable {
    fn from(timetable_with_trains: TimetableWithTrains) -> Self {
        Self {
            id: timetable_with_trains.id,
        }
    }
}
