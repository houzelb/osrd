use std::sync::LazyLock;

use diesel::result::DatabaseErrorKind;
use regex::Regex;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("unique constraint violation: \"{constraint}\"")]
    UniqueViolation { constraint: String },
    #[error("check constraint violation on relation \"{relation}\": \"{constraint}\"")]
    CheckViolation {
        relation: String,
        constraint: String,
    },
    #[error(transparent)]
    DatabaseError(#[from] crate::DatabaseError),
}

impl From<diesel::result::Error> for Error {
    fn from(e: diesel::result::Error) -> Self {
        if let diesel::result::Error::DatabaseError(DatabaseErrorKind::UniqueViolation, inner) = &e
        {
            static RE: LazyLock<Regex> = LazyLock::new(|| {
                Regex::new(r#"duplicate key value violates unique constraint "([0-9a-zA-Z_-]+)""#)
                    .unwrap()
            });
            if let Some(captures) = RE.captures((*inner).message()) {
                return Self::UniqueViolation {
                    constraint: captures.get(1).unwrap().as_str().to_string(),
                };
            } else {
                tracing::error!(?RE, %e, "failed to parse PostgreSQL error message");
            }
        }
        if let diesel::result::Error::DatabaseError(DatabaseErrorKind::CheckViolation, inner) = &e {
            static RE: LazyLock<Regex> = LazyLock::new(|| {
                Regex::new(
                        r#"new row for relation "([0-9a-zA-Z_-]+)" violates check constraint "([0-9a-zA-Z_-]+)""#,
                    )
                    .unwrap()
            });
            if let Some(captures) = RE.captures((*inner).message()) {
                return Self::CheckViolation {
                    relation: captures.get(1).unwrap().as_str().to_string(),
                    constraint: captures.get(2).unwrap().as_str().to_string(),
                };
            } else {
                tracing::error!(?RE, %e, "failed to parse PostgreSQL error message");
            }
        }
        Self::DatabaseError(e.into())
    }
}
