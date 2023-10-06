use super::typing::TypeSpec;

pub struct Criteria {
    pub name: String,
    pub data_type: TypeSpec,
    pub migration: Option<CriteriaMigration>,
}

pub struct Property {
    pub name: String,
    pub sql: String,
    #[allow(unused)]
    pub data_type: Option<TypeSpec>,
}

pub struct SearchConfig {
    pub name: String,
    pub table: String,
    pub criterias: Vec<Criteria>,
    pub properties: Vec<Property>,
    pub joins: Option<String>,
    pub migration: Option<Migration>,
}

pub struct Migration {
    pub src_table: String,
    pub src_primary_key: String,
    pub query_joins: String,
    pub prepend_sql: Option<(String, String)>,
    pub append_sql: Option<(String, String)>,
}

pub struct CriteriaMigration {
    pub sql_type: String,
    pub sql: String,
    pub index: Option<Index>,
    pub search_type: SearchType,
}

pub enum Index {
    Default,
    GinTrgm,
}

pub enum SearchType {
    None,
    Textual,
}

pub trait SearchObject {
    fn search_config() -> SearchConfig;
}

pub trait SearchConfigStore {
    /// Returns the search object configuration for the given object name
    ///
    /// See derive macro `SearchConfigStore` for more information.
    fn find<S: AsRef<str>>(object_name: S) -> Option<SearchConfig>;

    /// Returns the search object configurations of all objects in the store
    fn all() -> Vec<SearchConfig>;
}

impl SearchConfig {
    pub fn make_up_down(&self) -> (String, String) {
        let Migration {
            src_table,
            src_primary_key: pk,
            query_joins,
            prepend_sql,
            append_sql,
        } = self
            .migration
            .as_ref()
            .expect("no migration for search config");
        let table = &self.table;
        let (columns, select_terms, indexes) = {
            let mut columns = Vec::new();
            let mut select_terms = Vec::new();
            let mut indexes = Vec::new();
            for criteria in &self.criterias {
                if let Some(migration) = &criteria.migration {
                    columns.push(format!("\"{}\" {}", criteria.name, migration.sql_type));
                    select_terms.push(match migration.search_type {
                        SearchType::None => format!("({}) AS \"{}\"", migration.sql, criteria.name),
                        SearchType::Textual => format!(
                            "osrd_prepare_for_search({}) AS \"{}\"",
                            migration.sql, criteria.name
                        ),
                    });
                    if let Some(index) = &migration.index {
                        indexes.push(index.make_decl(
                            &format!("{}_{}", table, criteria.name),
                            table,
                            &criteria.name,
                        ));
                    }
                }
            }
            (
                columns.join(",\n    "),
                select_terms.join(",\n    "),
                indexes.join("\n"),
            )
        };
        let (prepend_up, prepend_down) = match prepend_sql {
            Some((up, down)) => (format!("{up}\n\n"), format!("{down}\n\n")),
            None => ("".to_string(), "".to_string()),
        };
        let (append_up, append_down) = match append_sql {
            Some((up, down)) => (format!("\n\n{up}"), format!("\n\n{down}")),
            None => ("".to_string(), "".to_string()),
        };
        let up = format!(
            r#"{prepend_up}DROP TABLE IF EXISTS "{table}";

CREATE TABLE "{table}" (
    id BIGINT PRIMARY KEY REFERENCES "{src_table}"("{pk}") ON UPDATE CASCADE ON DELETE CASCADE,
    {columns}
);

{indexes}

INSERT INTO "{table}"
SELECT
    "{src_table}"."{pk}" AS id,
    {select_terms}
FROM "{src_table}"
    {query_joins};{append_up}"#
        );
        let down = format!(r#"{prepend_down}DROP TABLE IF EXISTS "{table}";{append_down}"#);
        (up, down)
    }

    pub fn has_migration(&self) -> bool {
        self.migration.is_some()
    }
}

impl Index {
    fn make_decl(&self, name: &str, table: &str, column: &str) -> String {
        match self {
            Index::Default => format!("CREATE INDEX \"{name}\" ON \"{table}\" (\"{column}\");"),
            Index::GinTrgm => {
                format!(
                    "CREATE INDEX \"{name}\" ON \"{table}\" USING gin (\"{column}\" gin_trgm_ops);"
                )
            }
        }
    }
}
