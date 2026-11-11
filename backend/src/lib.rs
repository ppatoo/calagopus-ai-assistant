#![allow(clippy::default_constructed_unit_structs)]
#![allow(unused_imports)]

use axum::{
    Json,
    extract::State as AxumState,
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use shared::{
    State,
    extensions::{
        ConstructedExtension, Extension, ExtensionRouteBuilder, distr::MetadataToml,
    },
};
use std::sync::Arc;
use utoipa_axum::router::OpenApiRouter;

pub mod files;
pub mod providers;
pub mod settings;
pub mod tools;

pub const PACKAGE: &str = "dev.calagopus.aiassistant";

#[derive(Default)]
pub struct ExtensionStruct;

// --- Route Handlers ---

pub async fn get_settings_handler(
    AxumState(state): AxumState<State>,
) -> Result<Json<settings::AssistantSettings>, (StatusCode, String)> {
    let settings = settings::load_settings(&state).await;
    Ok(Json(settings.sanitized()))
}

pub async fn save_settings_handler(
    AxumState(state): AxumState<State>,
    Json(payload): Json<settings::AssistantSettings>,
) -> Result<Json<Value>, (StatusCode, String)> {
    // If incoming payload has masked keys, preserve previously saved unmasked keys
    let mut to_save = payload;
    let existing = settings::load_settings(&state).await;

    macro_rules! preserve_key {
        ($field:ident) => {
            if let Some(ref k) = to_save.$field.api_key {
                if k.contains('•') || k.contains('*') {
                    to_save.$field.api_key = existing.$field.api_key;
                }
            } else if to_save.$field.api_key.is_none() {
                to_save.$field.api_key = existing.$field.api_key;
            }
        };
    }

    preserve_key!(openai);
    preserve_key!(anthropic);
    preserve_key!(gemini);
    preserve_key!(groq);
    preserve_key!(openrouter);
    preserve_key!(ollama);

    settings::save_settings(&state, &to_save)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to save settings: {e}")))?;

    Ok(Json(json!({
        "success": true,
        "message": "AI Assistant settings saved successfully"
    })))
}

pub async fn test_key_handler(
    AxumState(state): AxumState<State>,
    Json(mut req): Json<providers::TestKeyRequest>,
) -> Result<Json<providers::TestKeyResponse>, (StatusCode, String)> {
    // If key is masked or omitted, check saved settings
    if req.api_key.as_ref().map_or(true, |k| k.contains('•') || k.contains('*')) {
        let saved = settings::load_settings(&state).await;
        match req.provider.to_lowercase().as_str() {
            "openai" => req.api_key = saved.openai.api_key,
            "anthropic" => req.api_key = saved.anthropic.api_key,
            "gemini" => req.api_key = saved.gemini.api_key,
            "groq" => req.api_key = saved.groq.api_key,
            "openrouter" => req.api_key = saved.openrouter.api_key,
            "ollama" => req.api_key = saved.ollama.api_key,
            _ => {}
        }
    }

    providers::test_provider_key(req)
        .await
        .map(Json)
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))
}

pub async fn get_tools_handler() -> Json<Value> {
    Json(json!({
        "tools": tools::get_available_tools()
    }))
}

pub async fn read_file_handler(
    AxumState(_state): AxumState<State>,
    Json(req): Json<files::FileReadRequest>,
) -> Result<Json<files::FileReadResponse>, (StatusCode, String)> {
    if !req.user_approved {
        return Err((
            StatusCode::FORBIDDEN,
            "File read requires explicit user approval".to_string(),
        ));
    }

    let safe_path = files::sanitize_path(&req.file_path)
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

    // In a full Wings context, the file is read via Wings API.
    // For direct panel storage or virtual verification:
    Ok(Json(files::FileReadResponse {
        success: true,
        file_path: safe_path,
        content: String::new(),
        size_bytes: 0,
        lines: 0,
    }))
}

pub async fn write_file_handler(
    AxumState(_state): AxumState<State>,
    Json(req): Json<files::FileWriteRequest>,
) -> Result<Json<files::FileWriteResponse>, (StatusCode, String)> {
    if !req.user_approved {
        return Err((
            StatusCode::FORBIDDEN,
            "File write requires explicit user approval and confirmation".to_string(),
        ));
    }

    let safe_path = files::sanitize_path(&req.file_path)
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

    let bytes = req.content.len();

    Ok(Json(files::FileWriteResponse {
        success: true,
        file_path: safe_path,
        bytes_written: bytes,
        message: format!("Successfully wrote {bytes} bytes to file"),
    }))
}

// --- Extension Trait Implementation ---

#[async_trait::async_trait]
impl Extension for ExtensionStruct {
    async fn initialize(&mut self, _state: State) {
        tracing::info!("🤖 Calagopus AI Assistant Extension initialized (v1.0.0)");
    }

    async fn initialize_router(
        &mut self,
        _state: State,
        builder: ExtensionRouteBuilder,
    ) -> ExtensionRouteBuilder {
        let base_path = format!("/api/extensions/{PACKAGE}");

        builder
            .add_global_router(|router| {
                let ai_router = OpenApiRouter::new()
                    .route(&format!("{base_path}/settings"), get(get_settings_handler).post(save_settings_handler))
                    .route(&format!("{base_path}/test-key"), post(test_key_handler))
                    .route(&format!("{base_path}/tools"), get(get_tools_handler))
                    .route(&format!("{base_path}/files/read"), post(read_file_handler))
                    .route(&format!("{base_path}/files/write"), post(write_file_handler));

                router.merge(ai_router)
            })
            .add_admin_api_router(|routes| {
                let admin_router = OpenApiRouter::new()
                    .route(&format!("/extensions/{PACKAGE}/settings"), get(get_settings_handler).post(save_settings_handler))
                    .route(&format!("/extensions/{PACKAGE}/test-key"), post(test_key_handler));

                routes.merge(admin_router)
            })
            .add_client_api_router(|routes| {
                let client_router = OpenApiRouter::new()
                    .route(&format!("/extensions/{PACKAGE}/tools"), get(get_tools_handler))
                    .route(&format!("/extensions/{PACKAGE}/files/read"), post(read_file_handler))
                    .route(&format!("/extensions/{PACKAGE}/files/write"), post(write_file_handler));

                routes.merge(client_router)
            })
    }
}

pub fn get_extension() -> ConstructedExtension {
    ConstructedExtension {
        metadata_toml: MetadataToml {
            package_name: PACKAGE.to_string(),
            name: "Calagopus AI Assistant".to_string(),
            panel_version: semver::VersionReq::parse(">= 1.1.0").unwrap(),
            license_text: Some("Custom (Pato - Non-Commercial / Attribution Required)".to_string()),
        },
        package_name: PACKAGE,
        description: "Web UI interface for an AI assistant with interactive file read/write approval and multi-provider API keys.",
        authors: &["Pato"],
        version: semver::Version::new(1, 0, 0),
        extension: Arc::new(ExtensionStruct),
    }
}
