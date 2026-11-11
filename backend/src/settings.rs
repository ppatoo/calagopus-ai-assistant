use serde::{Deserialize, Serialize};
use shared::State;
use utoipa::ToSchema;

pub const SETTINGS_KEY: &str = "dev_calagopus_aiassistant::settings";

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ProviderConfig {
    pub provider: String, // "openai", "anthropic", "gemini", "groq", "openrouter", "ollama"
    pub api_key: Option<String>,
    pub base_url: Option<String>,
    pub model: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AssistantSettings {
    pub active_provider: String,
    pub active_model: String,
    pub openai: ProviderConfig,
    pub anthropic: ProviderConfig,
    pub gemini: ProviderConfig,
    pub groq: ProviderConfig,
    pub openrouter: ProviderConfig,
    pub ollama: ProviderConfig,
    pub default_system_prompt: String,
    pub temperature: f32,
    pub max_tokens: u32,
    pub require_approval_for_reads: bool,
    pub require_approval_for_writes: bool,
}

impl Default for AssistantSettings {
    fn default() -> Self {
        Self {
            active_provider: "openai".to_string(),
            active_model: "gpt-4o-mini".to_string(),
            openai: ProviderConfig {
                provider: "openai".to_string(),
                api_key: None,
                base_url: Some("https://api.openai.com/v1".to_string()),
                model: "gpt-4o-mini".to_string(),
                enabled: true,
            },
            anthropic: ProviderConfig {
                provider: "anthropic".to_string(),
                api_key: None,
                base_url: Some("https://api.anthropic.com".to_string()),
                model: "claude-3-5-haiku-latest".to_string(),
                enabled: true,
            },
            gemini: ProviderConfig {
                provider: "gemini".to_string(),
                api_key: None,
                base_url: Some("https://generativelanguage.googleapis.com".to_string()),
                model: "gemini-1.5-flash".to_string(),
                enabled: true,
            },
            groq: ProviderConfig {
                provider: "groq".to_string(),
                api_key: None,
                base_url: Some("https://api.groq.com/openai/v1".to_string()),
                model: "llama-3.3-70b-versatile".to_string(),
                enabled: true,
            },
            openrouter: ProviderConfig {
                provider: "openrouter".to_string(),
                api_key: None,
                base_url: Some("https://openrouter.ai/api/v1".to_string()),
                model: "openai/gpt-4o-mini".to_string(),
                enabled: true,
            },
            ollama: ProviderConfig {
                provider: "ollama".to_string(),
                api_key: None,
                base_url: Some("http://localhost:11434/v1".to_string()),
                model: "llama3.2".to_string(),
                enabled: false,
            },
            default_system_prompt: "You are the Calagopus Game Panel AI Assistant. You assist server administrators in inspecting, troubleshooting, and configuring game servers (Minecraft, Rust, Palworld, Node.js, Python, Discord bots, etc.). Whenever you need to read or edit server configuration files or logs, ask the user and request the tool call. Always explain why you want to read or modify a file before doing so.".to_string(),
            temperature: 0.7,
            max_tokens: 4096,
            require_approval_for_reads: true,
            require_approval_for_writes: true,
        }
    }
}

pub fn mask_key(key: &Option<String>) -> Option<String> {
    key.as_ref().map(|k| {
        let trimmed = k.trim();
        if trimmed.len() <= 8 {
            "********".to_string()
        } else {
            let start = &trimmed[..4];
            let end = &trimmed[trimmed.len() - 4..];
            format!("{start}••••••••{end}")
        }
    })
}

impl AssistantSettings {
    pub fn sanitized(&self) -> Self {
        let mut copy = self.clone();
        copy.openai.api_key = mask_key(&self.openai.api_key);
        copy.anthropic.api_key = mask_key(&self.anthropic.api_key);
        copy.gemini.api_key = mask_key(&self.gemini.api_key);
        copy.groq.api_key = mask_key(&self.groq.api_key);
        copy.openrouter.api_key = mask_key(&self.openrouter.api_key);
        copy.ollama.api_key = mask_key(&self.ollama.api_key);
        copy
    }
}

pub async fn load_settings(state: &State) -> AssistantSettings {
    let raw: Option<String> = sqlx::query_scalar("SELECT value FROM settings WHERE key = $1")
        .bind(SETTINGS_KEY)
        .fetch_optional(state.database.read())
        .await
        .ok()
        .flatten();

    if let Some(json_str) = raw {
        if let Ok(settings) = serde_json::from_str::<AssistantSettings>(&json_str) {
            return settings;
        }
    }

    AssistantSettings::default()
}

pub async fn save_settings(state: &State, settings: &AssistantSettings) -> Result<(), anyhow::Error> {
    let json_str = serde_json::to_string(settings)?;
    sqlx::query(
        "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value"
    )
    .bind(SETTINGS_KEY)
    .bind(json_str)
    .execute(state.database.write())
    .await?;

    Ok(())
}
