use std::sync::LazyLock;

use diesel::result::{DatabaseErrorInformation, DatabaseErrorKind};
use regex::Regex;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("unique constraint violation \"{constraint}\" on column \"{column}\" with value \"{value}\"")]
    UniqueViolation {
        constraint: String,
        column: String,
        value: String,
    },
    #[error("check constraint violation of \"{constraint}\"")]
    CheckViolation { constraint: String },
    #[error(transparent)]
    DatabaseError(#[from] crate::DatabaseError),
}

fn try_parse_unique_violation(
    e: &Box<dyn DatabaseErrorInformation + Send + Sync>,
) -> Option<Error> {
    static RE: LazyLock<Regex> =
        LazyLock::new(|| Regex::new(r#"duplicate key value violates unique constraint"#).unwrap());
    if RE.is_match(e.message()) {
        static RE: LazyLock<Regex> = LazyLock::new(|| {
            Regex::new(r#"Key \(([^)]+)\)=\(([^)]+)\) already exists\."#).unwrap()
        });
        if let Some(captures) = RE.captures(e.details().expect("PostgreSQL should provide details"))
        {
            Some(Error::UniqueViolation {
                constraint: e
                    .constraint_name()
                    .expect("PostgreSQL should provide the constraint name")
                    .to_owned(),
                column: captures.get(1).unwrap().as_str().to_owned(),
                value: captures.get(2).unwrap().as_str().to_owned(),
            })
        } else {
            tracing::error!(
                ?RE,
                error = e.message(),
                details = e.details(),
                "failed to parse PostgreSQL details message"
            );
            None
        }
    } else {
        tracing::error!(
            ?RE,
            error = e.message(),
            "failed to parse PostgreSQL error message"
        );
        None
    }
}

fn try_parse_check_violation(e: &Box<dyn DatabaseErrorInformation + Send + Sync>) -> Option<Error> {
    static RE: LazyLock<Regex> = LazyLock::new(|| {
        Regex::new(r#"new row for relation .* violates check constraint"#).unwrap()
    });
    if RE.is_match(e.message()) {
        Some(Error::CheckViolation {
            constraint: e
                .column_name()
                .expect("PostgreSQL should provide the column name")
                .to_owned(),
        })
    } else {
        tracing::error!(
            ?RE,
            error = e.message(),
            "failed to parse PostgreSQL error message"
        );
        None
    }
}

impl From<diesel::result::Error> for Error {
    fn from(e: diesel::result::Error) -> Self {
        match &e {
            diesel::result::Error::DatabaseError(DatabaseErrorKind::UniqueViolation, inner) => {
                try_parse_unique_violation(inner).unwrap_or_else(|| {
                    // falling back to the generic error — since it's still semantically correct, logging the error is enough
                    Self::DatabaseError(e.into())
                })
            }
            diesel::result::Error::DatabaseError(DatabaseErrorKind::CheckViolation, inner) => {
                try_parse_check_violation(inner).unwrap_or_else(|| {
                    // falling back to the generic error — since it's still semantically correct, logging the error is enough
                    Self::DatabaseError(e.into())
                })
            }
            _ => Self::DatabaseError(e.into()),
        }
    }
}
