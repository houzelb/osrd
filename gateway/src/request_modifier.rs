use actix_auth::{AuthStatus, RequestAuth, RequestAuthExt};
use actix_proxy::{ClientRequest, HeaderName, HeaderValue, WebsocketsRequest};
use actix_web::error::ErrorForbidden;

struct UserInformation {
    identity: String,
    name: String,
}

fn check_auth(request_auth: &RequestAuth) -> Result<UserInformation, actix_web::Error> {
    match request_auth.status() {
        AuthStatus::Unknown => Err(ErrorForbidden("authentication required")),
        AuthStatus::Error(_) => Err(ErrorForbidden("authentication error")),
        AuthStatus::Known {
            provider_handler,
            user_id,
            username,
        } => {
            let provider_id = request_auth.context().get_provider_id(*provider_handler);
            Ok(UserInformation {
                identity: format!("{provider_id}/{user_id}"),
                name: username.clone().unwrap_or_default(),
            })
        }
    }
}

#[derive(Clone)]
pub struct ProxyAuthAdapter;

static AUTH_USER_ID: HeaderName = HeaderName::from_static("x-remote-user-identity");
static AUTH_USER_NAME: HeaderName = HeaderName::from_static("x-remote-user-name");

impl actix_proxy::RequestModifier for ProxyAuthAdapter {
    fn modify_http_request(
        &self,
        client_request: &actix_web::HttpRequest,
        back_request: &mut ClientRequest,
    ) -> Result<(), actix_web::Error> {
        let Some(request_auth) = client_request.get_request_auth() else {
            return Err(ErrorForbidden("missing authentication data"));
        };
        let remote_user = check_auth(&request_auth)?;
        let headers = back_request.headers_mut();
        headers.insert(
            AUTH_USER_ID.clone(),
            HeaderValue::from_str(&remote_user.identity)?,
        );
        headers.insert(
            AUTH_USER_NAME.clone(),
            HeaderValue::from_str(&remote_user.name)?,
        );

        Ok(())
    }

    fn modify_ws_request(
        &self,
        client_request: &actix_web::HttpRequest,
        back_request: WebsocketsRequest,
    ) -> Result<WebsocketsRequest, actix_web::Error> {
        let Some(request_auth) = client_request.get_request_auth() else {
            return Err(ErrorForbidden("missing authentication data"));
        };
        let remote_user = check_auth(&request_auth)?;
        Ok(back_request
            .set_header(AUTH_USER_ID.clone(), remote_user.identity)
            .set_header(AUTH_USER_NAME.clone(), remote_user.name))
    }
}
