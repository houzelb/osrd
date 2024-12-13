use super::Fields;

#[derive(Debug, Clone, PartialEq, Hash, Eq)]
pub(crate) enum RawIdentifier {
    Field(syn::Ident),
    Compound(Vec<syn::Ident>),
}

impl RawIdentifier {
    pub(crate) fn get_idents(&self) -> Vec<syn::Ident> {
        match self {
            Self::Field(ident) => vec![ident.clone()],
            Self::Compound(idents) => idents.clone(),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Hash, Eq)]
pub(crate) struct Identifier {
    pub(crate) raw: RawIdentifier,
    pub(crate) field_types: Vec<syn::Type>,
    pub(crate) columns: Vec<syn::Ident>,
}

impl Identifier {
    pub(crate) fn new(identifier: RawIdentifier, fields: &Fields) -> Self {
        let (field_types, columns) = {
            let fields = match &identifier {
                RawIdentifier::Field(ident) => {
                    vec![fields
                        .get(ident)
                        .expect("identifier should exist in the provided config")]
                }
                RawIdentifier::Compound(idents) => idents
                    .iter()
                    .map(|ident| {
                        fields
                            .get(ident)
                            .expect("identifier should exist in the provided config")
                    })
                    .collect(),
            };
            let field_types = fields.iter().map(|field| field.ty.clone()).collect();
            let columns = fields
                .iter()
                .map(|field| field.column_ident())
                .cloned()
                .collect();
            (field_types, columns)
        };
        Self {
            raw: identifier,
            field_types,
            columns,
        }
    }

    pub(crate) fn get_idents(&self) -> Vec<syn::Ident> {
        self.raw.get_idents()
    }
}

impl darling::FromMeta for RawIdentifier {
    fn from_expr(expr: &syn::Expr) -> darling::Result<Self> {
        match expr {
            syn::Expr::Path(path) => Ok(RawIdentifier::Field(extract_ident_of_path(&path.path)?)),
            syn::Expr::Tuple(tuple) => {
                let mut idents = Vec::new();
                for expr in tuple.elems.iter() {
                    match expr {
                        syn::Expr::Path(path) => {
                            idents.push(extract_ident_of_path(&path.path)?);
                        }
                        _ => return Err(darling::Error::custom(
                            "Model: invalid compound 'identifier' expression: must be a tuple of idents",
                        )),
                    }
                }
                Ok(RawIdentifier::Compound(idents))
            }
            _ => Err(darling::Error::custom(
                "Model: invalid 'identifier' expression",
            )),
        }
    }
}

impl PartialOrd for RawIdentifier {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for RawIdentifier {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        self.get_idents().cmp(&other.get_idents())
    }
}

impl PartialOrd for Identifier {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.raw.cmp(&other.raw))
    }
}

impl Ord for Identifier {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        self.raw.cmp(&other.raw)
    }
}

fn extract_ident_of_path(path: &syn::Path) -> darling::Result<syn::Ident> {
    let mut segments = path.segments.iter();
    let first = segments.next().unwrap();
    if segments.next().is_some() {
        Err(darling::Error::custom(
            "Model: unexpected path in 'identifier' expression",
        ))
    } else {
        Ok(first.ident.clone())
    }
}
