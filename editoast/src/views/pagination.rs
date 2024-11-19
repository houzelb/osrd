use editoast_derive::EditoastError;
use editoast_models::DbConnection;
use serde::de::Error as _;
use serde::Deserialize;
use serde::Serialize;
use thiserror::Error;
use tracing::warn;
use utoipa::IntoParams;
use utoipa::ToSchema;

use crate::error::InternalError;
use crate::error::Result;
use crate::ListAndCount;
use crate::Model;
use crate::SelectionSettings;

editoast_common::schemas! {
    PaginationStats,
}

const DEFAULT_PAGE_SIZE: u64 = 25;

/// Statistics about a paginated editoast response
///
/// Provides the pagination settings issued in the request alongside
/// a few convenience fields useful to navigate the paginated results.
///
/// # Expected usage
///
/// This struct is meant to be used and flattened in the response of a paginated query.
///
/// ```
/// #[derive(Serialize, ToSchema)]
/// struct MyPaginatedResponse {
///     #[schema(flatten)]
///     pagination: PaginationStats,
///     result: Vec<MyData>,
///     // any other field that makes sense in a paginated response
/// }
/// ```
///
/// We named the data field `result` to cope with the old pagination schema which
/// enforced this name. For new paginated responses, the field name is up to your imagination :)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, ToSchema)]
#[cfg_attr(test, derive(Deserialize))]
pub struct PaginationStats {
    /// The total number of items
    #[schema(minimum = 0)]
    pub count: u64,

    /// The number of items per page
    #[schema(minimum = 1)]
    pub page_size: u64,

    /// The total number of pages
    #[schema(minimum = 0)]
    pub page_count: u64,

    /// The current page number
    #[schema(minimum = 1)]
    pub current: u64,

    /// The previous page number, if any
    #[schema(required, minimum = 1)]
    pub previous: Option<u64>,

    /// The next page number, if any
    #[schema(required, minimum = 1)]
    pub next: Option<u64>,
}

impl PaginationStats {
    /// Computes a new [PaginationStats] from pagination settings and query result count
    ///
    /// # Panics
    ///
    /// - If the page or the page_size are null
    /// - If `(page - 1) * page_size + current_page_count <= total_count`. In other words if
    ///   the `current_page_count` is inconsistent with the pagination settings and the `total_count`.
    pub fn new(
        current_page_count: u64,
        total_count: u64,
        page: u64,
        page_size: u64,
    ) -> Result<Self, PaginationError> {
        if page == 0 {
            return Err(PaginationError::InvalidPageNumber { page });
        }
        if page_size == 0 {
            return Err(PaginationError::InvalidPageSize { page_size });
        }
        if (page - 1) * page_size + current_page_count > total_count {
            return Err(PaginationError::PageOutOfBound {
                page,
                page_size,
                total_count,
            });
        }
        let page_count = total_count.div_ceil(page_size);
        let previous = (page > 1 && total_count > 0).then_some(page - 1);
        let next = ((page - 1) * page_size + current_page_count < total_count).then_some(page + 1);
        Ok(Self {
            count: total_count,
            page_size,
            page_count,
            current: page,
            previous,
            next,
        })
    }
}

#[async_trait::async_trait]
pub trait PaginatedList: ListAndCount + 'static {
    /// Lists the models and compute [PaginationStats]
    ///
    /// See [ListAndCount::list_and_count] for more details.
    ///
    /// # On verifications
    ///
    /// 1. The pagination soundness of the `settings` should have been verified
    ///    before this function is called (e.g.: non-null page size).
    /// 2. Panics if the limit or the offset of the `settings` are not set, so be
    ///    sure to call [SelectionSettings::from_pagination_settings] or [SelectionSettings::limit]
    ///    and [SelectionSettings::offset] beforehand. [PaginationQueryParam::into_selection_settings]
    ///    works as well.
    async fn list_paginated(
        conn: &mut DbConnection,
        settings: SelectionSettings<Self>,
    ) -> Result<(Vec<Self>, PaginationStats)> {
        let (page, page_size) = settings
            .get_pagination_settings()
            .expect("the limit and the offset must be set in order to call list_paginated");
        let (results, count) = Self::list_and_count(conn, settings).await?;
        let stats = PaginationStats::new(results.len() as u64, count, page, page_size)?;
        Ok((results, stats))
    }
}

impl<T> PaginatedList for T where T: ListAndCount + 'static {}

#[derive(Debug, Clone, Copy, Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
// See https://yossarian.net/til/post/remote-self-derivation-with-serde-for-custom-invariants
#[serde(remote = "Self")]
pub struct PaginationQueryParam<const N: u64 = 100> {
    #[serde(default = "default_page")]
    #[param(minimum = 1, default = 1)]
    pub page: u64,
    #[param(minimum = 1, default = 25)]
    pub page_size: Option<u64>,
}

impl<'de, const N: u64> Deserialize<'de> for PaginationQueryParam<N> {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let pagination_query_params = Self::deserialize(deserializer)?;
        let (page, page_size) = pagination_query_params.unpack();
        if page == 0 {
            return Err(D::Error::custom(
                InternalError::from(PaginationError::InvalidPageNumber { page }).to_string(),
            ));
        }
        if page_size == 0 {
            return Err(D::Error::custom(
                InternalError::from(PaginationError::InvalidPageSize { page_size }).to_string(),
            ));
        }
        if page_size > N {
            return Err(D::Error::custom(
                InternalError::from(PaginationError::PageSizeTooBig {
                    provided_page_size: page_size,
                    max_page_size: N,
                })
                .to_string(),
            ));
        }
        Ok(pagination_query_params)
    }
}

const fn default_page() -> u64 {
    1
}

impl<const N: u64> PaginationQueryParam<N> {
    /// Returns a pre-filled [SelectionSettings] from the pagination settings
    /// that can then be used to list or count models
    pub fn into_selection_settings<M: Model + 'static>(self) -> SelectionSettings<M> {
        self.into()
    }

    pub fn warn_page_size(self, warn_page_size: u64) -> PaginationQueryParam<N> {
        let (_, page_size) = self.unpack();
        if page_size > warn_page_size {
            warn!(
                "Too many elements per page, should be lower or equal to {}.",
                warn_page_size
            );
        }
        self
    }

    pub fn unpack(&self) -> (u64, u64) {
        let page_size = self.page_size.unwrap_or(DEFAULT_PAGE_SIZE);
        (self.page, page_size)
    }
}

impl<const N: u64, M: Model + 'static> From<PaginationQueryParam<N>> for SelectionSettings<M> {
    fn from(PaginationQueryParam { page, page_size }: PaginationQueryParam<N>) -> Self {
        let page_size = page_size.unwrap_or(DEFAULT_PAGE_SIZE);
        SelectionSettings::from_pagination_settings(page, page_size)
    }
}

/// Simple pagination error
#[derive(Debug, Error, EditoastError)]
#[editoast_error(base_id = "pagination")]
pub enum PaginationError {
    #[error("Invalid page size ({provided_page_size}), expected an integer such as page_size <= {max_page_size}")]
    #[editoast_error(status = 400)]
    PageSizeTooBig {
        provided_page_size: u64,
        max_page_size: u64,
    },
    #[error("page number must be strictly positive, was {page}")]
    #[editoast_error(status = 500)]
    InvalidPageNumber { page: u64 },
    #[error("page size must be strictly positive, was {page_size}")]
    #[editoast_error(status = 500)]
    InvalidPageSize { page_size: u64 },
    #[error("no more information after page {page} when page size is {page_size} (total number of elements is {total_count})")]
    #[editoast_error(status = 404)]
    PageOutOfBound {
        page: u64,
        page_size: u64,
        total_count: u64,
    },
}

#[cfg(test)]
mod pagination_stats_tests {
    use super::PaginationStats;

    #[test]
    fn no_results() {
        assert_eq!(
            PaginationStats::new(0, 0, 1, 25).unwrap(),
            PaginationStats {
                count: 0,
                page_size: 25,
                page_count: 0,
                current: 1,
                previous: None,
                next: None,
            }
        );
    }

    #[test]
    fn single_result() {
        assert_eq!(
            PaginationStats::new(1, 1, 1, 25).unwrap(),
            PaginationStats {
                count: 1,
                page_size: 25,
                page_count: 1,
                current: 1,
                previous: None,
                next: None,
            }
        );
    }

    #[test]
    fn first_page() {
        assert_eq!(
            PaginationStats::new(25, 26, 1, 25).unwrap(),
            PaginationStats {
                count: 26,
                page_size: 25,
                page_count: 2,
                current: 1,
                previous: None,
                next: Some(2),
            }
        );
    }

    #[test]
    fn second_page() {
        assert_eq!(
            PaginationStats::new(1, 26, 2, 25).unwrap(),
            PaginationStats {
                count: 26,
                page_size: 25,
                page_count: 2,
                current: 2,
                previous: Some(1),
                next: None,
            }
        );
    }
}
