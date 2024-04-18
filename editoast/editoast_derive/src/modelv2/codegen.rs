mod changeset_builder_impl_block;
mod changeset_decl;
mod changeset_from_model;
mod create_batch_impl;
mod create_batch_with_key_impl;
mod create_impl;
mod delete_impl;
mod delete_static_impl;
mod exists_impl;
mod identifiable_impl;
mod model_from_row_impl;
mod model_impl;
mod preferred_id_impl;
mod retrieve_batch_impl;
mod retrieve_impl;
mod row_decl;
mod update_batch_impl;
mod update_impl;

use proc_macro2::{Span, TokenStream};
use quote::quote;
use syn::parse_quote;

use crate::modelv2::codegen::changeset_decl::ChangesetDecl;
use crate::modelv2::codegen::changeset_decl::ChangesetFieldDecl;
use crate::modelv2::codegen::model_impl::ModelImpl;
use crate::modelv2::codegen::row_decl::RowDecl;
use crate::modelv2::codegen::row_decl::RowFieldDecl;

use self::changeset_builder_impl_block::BuilderType;
use self::changeset_builder_impl_block::ChangesetBuilderImplBlock;
use self::changeset_from_model::ChangesetFromModelImpl;
use self::create_batch_impl::CreateBatchImpl;
use self::create_batch_with_key_impl::CreateBatchWithKeyImpl;
use self::create_impl::CreateImpl;
use self::delete_impl::DeleteImpl;
use self::delete_static_impl::DeleteStaticImpl;
use self::exists_impl::ExistsImpl;
use self::identifiable_impl::IdentifiableImpl;
use self::model_from_row_impl::ModelFromRowImpl;
use self::preferred_id_impl::PreferredIdImpl;
use self::retrieve_batch_impl::RetrieveBatchImpl;
use self::retrieve_impl::RetrieveImpl;
use self::update_batch_impl::UpdateBatchImpl;
use self::update_impl::UpdateImpl;

use super::identifier::TypedIdentifier;
use super::utils::np;
use super::Identifier;
use super::ModelConfig;

impl Identifier {
    fn get_ident_lvalue(&self) -> syn::Expr {
        match self {
            Self::Field(ident) => parse_quote! { #ident },
            Self::Compound(idents) => {
                parse_quote! { (#(#idents),*) }
            }
        }
    }
}

impl TypedIdentifier {
    fn get_type(&self) -> syn::Type {
        let ty = self.field_types.iter();
        syn::parse_quote! { (#(#ty),*) } // tuple type
    }

    fn get_lvalue(&self) -> syn::Expr {
        self.identifier.get_ident_lvalue()
    }

    fn get_diesel_eqs(&self) -> Vec<syn::Expr> {
        self.get_idents()
            .iter()
            .zip(&self.columns)
            .map(|(ident, column)| parse_quote! { dsl::#column.eq(#ident) })
            .collect()
    }

    fn get_diesel_eq_and_fold(&self) -> syn::Expr {
        let mut idents = self.get_idents().into_iter().zip(&self.columns).rev();
        let (first_ident, first_column) = idents.next().expect("Identifiers cannot be empty");
        idents.fold(
            parse_quote! { dsl::#first_column.eq(#first_ident) },
            |acc, (ident, column)| {
                parse_quote! { dsl::#column.eq(#ident).and(#acc) }
            },
        )
    }
}

impl ModelConfig {
    pub(crate) fn model_impl(&self) -> ModelImpl {
        ModelImpl {
            model: self.model.clone(),
            row: self.row.ident(),
            changeset: self.changeset.ident(),
        }
    }

    pub(crate) fn row_decl(&self) -> RowDecl {
        RowDecl {
            vis: self.visibility.clone(),
            ident: self.row.ident(),
            table: self.table.clone(),
            additional_derives: self.row.derive.clone(),
            fields: self
                .iter_fields()
                .map(|field| RowFieldDecl {
                    vis: self.row.visibility(),
                    name: field.ident.clone(),
                    ty: field.transform_type(),
                    column: field.column.clone(),
                })
                .collect(),
        }
    }

    pub(crate) fn changeset_decl(&self) -> ChangesetDecl {
        ChangesetDecl {
            vis: self.visibility.clone(),
            ident: self.changeset.ident(),
            table: self.table.clone(),
            additional_derives: self.changeset.derive.clone(),
            fields: self
                .changeset_fields()
                .map(|field| ChangesetFieldDecl {
                    vis: self.changeset.visibility(),
                    name: field.ident.clone(),
                    ty: field.transform_type(),
                    column: field.column.clone(),
                })
                .collect(),
        }
    }

    pub(crate) fn changeset_builder_impl_block(&self) -> ChangesetBuilderImplBlock {
        ChangesetBuilderImplBlock {
            builder_type: BuilderType::Changeset,
            model: self.model.clone(),
            changeset: self.changeset.ident(),
            fields: self.changeset_fields().cloned().collect(),
        }
    }

    pub(crate) fn patch_builder_impl_block(&self) -> ChangesetBuilderImplBlock {
        let mut builder = self.changeset_builder_impl_block();
        builder.builder_type = BuilderType::Patch;
        builder
    }

    pub(crate) fn identifiable_impls(&self) -> Vec<IdentifiableImpl> {
        self.typed_identifiers
            .iter()
            .map(|identifier| IdentifiableImpl {
                model: self.model.clone(),
                ty: identifier.get_type(),
                fields: identifier.get_idents(),
            })
            .collect()
    }

    pub(crate) fn preferred_id_impl(&self) -> PreferredIdImpl {
        PreferredIdImpl {
            model: self.model.clone(),
            ty: self.preferred_typed_identifier.get_type(),
        }
    }

    pub(crate) fn model_from_row_impl(&self) -> ModelFromRowImpl {
        ModelFromRowImpl {
            model: self.model.clone(),
            row: self.row.ident(),
            fields: self.fields.clone(),
        }
    }

    pub(crate) fn changeset_from_model_impl(&self) -> ChangesetFromModelImpl {
        ChangesetFromModelImpl {
            model: self.model.clone(),
            changeset: self.changeset.ident(),
            fields: self.changeset_fields().cloned().collect(),
        }
    }

    pub(crate) fn retrieve_impls(&self) -> Vec<RetrieveImpl> {
        self.typed_identifiers
            .iter()
            .map(|identifier| RetrieveImpl {
                model: self.model.clone(),
                table_name: self.table_name(),
                table_mod: self.table.clone(),
                row: self.row.ident(),
                identifier: identifier.clone(),
            })
            .collect()
    }

    pub(crate) fn exists_impls(&self) -> Vec<ExistsImpl> {
        self.typed_identifiers
            .iter()
            .map(|identifier| ExistsImpl {
                model: self.model.clone(),
                table_name: self.table_name(),
                table_mod: self.table.clone(),
                identifier: identifier.clone(),
            })
            .collect()
    }

    pub(crate) fn update_impls(&self) -> Vec<UpdateImpl> {
        self.typed_identifiers
            .iter()
            .map(|identifier| UpdateImpl {
                model: self.model.clone(),
                table_name: self.table_name(),
                table_mod: self.table.clone(),
                row: self.row.ident(),
                changeset: self.changeset.ident(),
                identifier: identifier.clone(),
            })
            .collect()
    }

    pub(crate) fn delete_static_impls(&self) -> Vec<DeleteStaticImpl> {
        self.typed_identifiers
            .iter()
            .map(|identifier| DeleteStaticImpl {
                model: self.model.clone(),
                table_name: self.table_name(),
                table_mod: self.table.clone(),
                identifier: identifier.clone(),
            })
            .collect()
    }

    pub(crate) fn create_impl(&self) -> CreateImpl {
        CreateImpl {
            model: self.model.clone(),
            table_mod: self.table.clone(),
            row: self.row.ident(),
            changeset: self.changeset.ident(),
        }
    }

    pub(crate) fn delete_impl(&self) -> DeleteImpl {
        DeleteImpl {
            model: self.model.clone(),
            table_mod: self.table.clone(),
            primary_key: self.get_primary_field_ident(),
        }
    }

    pub(crate) fn create_batch_impl(&self) -> CreateBatchImpl {
        CreateBatchImpl {
            model: self.model.clone(),
            table_name: self.table_name(),
            table_mod: self.table.clone(),
            row: self.row.ident(),
            changeset: self.changeset.ident(),
            field_count: self.changeset_fields().count(),
        }
    }

    pub(crate) fn create_batch_with_key_impls(&self) -> Vec<CreateBatchWithKeyImpl> {
        self.typed_identifiers
            .iter()
            .map(|identifier| CreateBatchWithKeyImpl {
                model: self.model.clone(),
                table_name: self.table_name(),
                table_mod: self.table.clone(),
                row: self.row.ident(),
                changeset: self.changeset.ident(),
                identifier: identifier.clone(),
                field_count: self.changeset_fields().count(),
            })
            .collect()
    }

    pub(crate) fn retrieve_batch_impls(&self) -> Vec<RetrieveBatchImpl> {
        self.typed_identifiers
            .iter()
            .map(|identifier| RetrieveBatchImpl {
                model: self.model.clone(),
                table_name: self.table_name(),
                table_mod: self.table.clone(),
                row: self.row.ident(),
                identifier: identifier.clone(),
            })
            .collect()
    }

    pub(crate) fn update_batch_impls(&self) -> Vec<UpdateBatchImpl> {
        self.typed_identifiers
            .iter()
            .map(|identifier| UpdateBatchImpl {
                model: self.model.clone(),
                table_name: self.table_name(),
                table_mod: self.table.clone(),
                row: self.row.ident(),
                changeset: self.changeset.ident(),
                identifier: identifier.clone(),
                primary_key_column: self.get_primary_field_column(),
            })
            .collect()
    }

    pub fn make_model_traits_impl(&self) -> TokenStream {
        let model = &self.model;
        let table_mod = &self.table;
        let table_name = self.table_name();

        let np!(ty, ident, batch_filter, batch_param_count): np!(vec4) = self
            .identifiers
            .iter()
            .map(|id| {
                let type_expr = id.type_expr(self);
                let lvalue = id.get_ident_lvalue();

                let (ident, column): (Vec<_>, Vec<_>) = id
                    .get_idents()
                    .into_iter()
                    .map(|ident| {
                        let field = self.fields.get(&ident).unwrap();
                        let column = syn::Ident::new(&field.column, Span::call_site());
                        (ident, column)
                    })
                    .unzip();

                // Batched row access (batch_filter is the argument of a .or_filter())
                let batch_filter = {
                    let mut idents = ident.iter().zip(column.iter()).rev();
                    let (first_ident, first_column) = idents.next().unwrap();
                    idents.fold(
                        quote! { dsl::#first_column.eq(#first_ident) },
                        |acc, (ident, column)| {
                            quote! { dsl::#column.eq(#ident).and(#acc) }
                        },
                    )
                };
                let param_count = ident.len();

                np!(type_expr, lvalue, batch_filter, param_count)
            })
            .unzip();

        quote! {
            #(
                #[automatically_derived]
                #[async_trait::async_trait]
                impl crate::modelsv2::DeleteBatch<#ty> for #model {
                    async fn delete_batch<I: std::iter::IntoIterator<Item = #ty> + Send + 'async_trait>(
                        conn: &mut diesel_async::AsyncPgConnection,
                        ids: I,
                    ) -> crate::error::Result<usize> {
                        use #table_mod::dsl;
                        use diesel::prelude::*;
                        use diesel_async::RunQueryDsl;
                        let counts = crate::chunked_for_libpq! {
                            #batch_param_count,
                            ids,
                            chunk => {
                                let mut query = diesel::delete(dsl::#table_name).into_boxed();
                                for #ident in chunk.into_iter() {
                                    query = query.or_filter(#batch_filter);
                                }
                                query.execute(conn).await?
                            }
                        };
                        Ok(counts.into_iter().sum())
                    }
                }
            )*
        }
    }
}
