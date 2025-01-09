use quote::quote;
use quote::ToTokens;

pub(crate) struct CreateImpl {
    pub(super) model: syn::Ident,
    pub(super) table_mod: syn::Path,
    pub(super) row: syn::Ident,
    pub(super) changeset: syn::Ident,
    pub(super) columns: Vec<syn::Ident>,
}

impl ToTokens for CreateImpl {
    fn to_tokens(&self, tokens: &mut proc_macro2::TokenStream) {
        let Self {
            model,
            table_mod,
            row,
            changeset,
            columns,
        } = self;
        let span_name = format!("model:create<{}>", model);

        tokens.extend(quote! {
            #[automatically_derived]
            #[async_trait::async_trait]
            impl crate::models::Create<#model> for #changeset {
                #[tracing::instrument(name = #span_name, skip_all, err)]
                async fn create(
                    self,
                    conn: &mut editoast_models::DbConnection,
                ) -> std::result::Result<#model, editoast_models::model::Error> {
                    use diesel_async::RunQueryDsl;
                    use #table_mod::dsl;
                    use std::ops::DerefMut;
                    diesel::insert_into(#table_mod::table)
                        .values(&self)
                        .returning((#(dsl::#columns,)*))
                        .get_result::<#row>(conn.write().await.deref_mut())
                        .await
                        .map(Into::into)
                        .map_err(Into::into)
                }
            }
        });
    }
}
