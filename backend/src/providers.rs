use anyhow::{anyhow, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::time::Duration;

#[derive(Debug, Deserialize)]
pub struct TestKeyRequest {
    pub provider: String,
    pub api_key: Option<String>,
    pub base_url: Option<String>,
    pub model: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct TestKeyResponse {
    pub success: bool,
    pub provider: String,
    pub message: String,
    pub detected_models: Vec<String>,
}

pub async fn test_provider_key(req: TestKeyRequest) -> Result<TestKeyResponse> {
    let client = Client::builder()
        .timeout(Duration::from_secs(10))
        .build()?;

    let provider = req.provider.to_lowercase();
    let key = req.api_key.unwrap_or_default();

    match provider.as_str() {
        "openai" => {
            let base_url = req.base_url.unwrap_or_else(|| "https://api.openai.com/v1".to_string());
            let url = format!("{}/models", base_url.trim_end_matches('/'));

            let resp = client
                .get(&url)
                .header("Authorization", format!("Bearer {}", key.trim()))
                .send()
                .await?;

            if resp.status().is_success() {
                let body: Value = resp.json().await.unwrap_or_default();
                let mut models = Vec::new();
                if let Some(data) = body.get("data").and_then(|d| d.as_array()) {
                    for m in data.iter().take(10) {
                        if let Some(id) = m.get("id").and_then(|v| v.as_str()) {
                            models.push(id.to_string());
                        }
                    }
                }
                Ok(TestKeyResponse {
                    success: true,
                    provider: "openai".to_string(),
                    message: "Successfully connected to OpenAI API! Key is valid.".to_string(),
                    detected_models: models,
                })
            } else {
                let status = resp.status();
                let err_text = resp.text().await.unwrap_or_default();
                Err(anyhow!("OpenAI API error ({status}): {err_text}"))
            }
        }
        "anthropic" => {
            let base_url = req.base_url.unwrap_or_else(|| "https://api.anthropic.com".to_string());
            let url = format!("{}/v1/messages", base_url.trim_end_matches('/'));

            // Send a minimal ping request
            let resp = client
                .post(&url)
                .header("x-api-key", key.trim())
                .header("anthropic-version", "2023-06-01")
                .header("content-type", "application/json")
                .json(&json!({
                    "model": "claude-3-5-haiku-latest",
                    "max_tokens": 1,
                    "messages": [{"role": "user", "content": "ping"}]
                }))
                .send()
                .await?;

            if resp.status().is_success() {
                Ok(TestKeyResponse {
                    success: true,
                    provider: "anthropic".to_string(),
                    message: "Successfully connected to Anthropic Claude API! Key is valid.".to_string(),
                    detected_models: vec![
                        "claude-3-5-sonnet-latest".to_string(),
                        "claude-3-5-haiku-latest".to_string(),
                        "claude-3-opus-latest".to_string(),
                    ],
                })
            } else {
                let status = resp.status();
                let err_text = resp.text().await.unwrap_or_default();
                Err(anyhow!("Anthropic API error ({status}): {err_text}"))
            }
        }
        "gemini" => {
            let base_url = req.base_url.unwrap_or_else(|| "https://generativelanguage.googleapis.com".to_string());
            let model = req.model.unwrap_or_else(|| "gemini-1.5-flash".to_string());
            let url = format!(
                "{}/v1beta/models/{}:generateContent?key={}",
                base_url.trim_end_matches('/'),
                model,
                key.trim()
            );

            let resp = client
                .post(&url)
                .header("content-type", "application/json")
                .json(&json!({
                    "contents": [{
                        "parts": [{"text": "ping"}]
                    }]
                }))
                .send()
                .await?;

            if resp.status().is_success() {
                Ok(TestKeyResponse {
                    success: true,
                    provider: "gemini".to_string(),
                    message: "Successfully connected to Google Gemini API! Key is valid.".to_string(),
                    detected_models: vec![
                        "gemini-1.5-flash".to_string(),
                        "gemini-1.5-pro".to_string(),
                        "gemini-2.0-flash".to_string(),
                    ],
                })
            } else {
                let status = resp.status();
                let err_text = resp.text().await.unwrap_or_default();
                Err(anyhow!("Google Gemini API error ({status}): {err_text}"))
            }
        }
        "groq" => {
            let base_url = req.base_url.unwrap_or_else(|| "https://api.groq.com/openai/v1".to_string());
            let url = format!("{}/models", base_url.trim_end_matches('/'));

            let resp = client
                .get(&url)
                .header("Authorization", format!("Bearer {}", key.trim()))
                .send()
                .await?;

            if resp.status().is_success() {
                let body: Value = resp.json().await.unwrap_or_default();
                let mut models = Vec::new();
                if let Some(data) = body.get("data").and_then(|d| d.as_array()) {
                    for m in data.iter().take(10) {
                        if let Some(id) = m.get("id").and_then(|v| v.as_str()) {
                            models.push(id.to_string());
                        }
                    }
                }
                Ok(TestKeyResponse {
                    success: true,
                    provider: "groq".to_string(),
                    message: "Successfully connected to Groq Cloud API! Key is valid.".to_string(),
                    detected_models: models,
                })
            } else {
                let status = resp.status();
                let err_text = resp.text().await.unwrap_or_default();
                Err(anyhow!("Groq API error ({status}): {err_text}"))
            }
        }
        "openrouter" => {
            let base_url = req.base_url.unwrap_or_else(|| "https://openrouter.ai/api/v1".to_string());
            let url = format!("{}/models", base_url.trim_end_matches('/'));

            let resp = client
                .get(&url)
                .header("Authorization", format!("Bearer {}", key.trim()))
                .send()
                .await?;

            if resp.status().is_success() {
                Ok(TestKeyResponse {
                    success: true,
                    provider: "openrouter".to_string(),
                    message: "Successfully connected to OpenRouter API! Key is valid.".to_string(),
                    detected_models: vec![
                        "anthropic/claude-3.5-sonnet".to_string(),
                        "openai/gpt-4o-mini".to_string(),
                        "meta-llama/llama-3.3-70b-instruct".to_string(),
                        "google/gemini-flash-1.5".to_string(),
                    ],
                })
            } else {
                let status = resp.status();
                let err_text = resp.text().await.unwrap_or_default();
                Err(anyhow!("OpenRouter API error ({status}): {err_text}"))
            }
        }
        "ollama" => {
            let base_url = req.base_url.unwrap_or_else(|| "http://localhost:11434/v1".to_string());
            // Strip /v1 to test tags
            let root_url = base_url.trim_end_matches('/').trim_end_matches("/v1");
            let tags_url = format!("{}/api/tags", root_url);

            let resp = client.get(&tags_url).send().await;
            match resp {
                Ok(r) if r.status().is_success() => {
                    let body: Value = r.json().await.unwrap_or_default();
                    let mut models = Vec::new();
                    if let Some(ms) = body.get("models").and_then(|m| m.as_array()) {
                        for m in ms {
                            if let Some(n) = m.get("name").and_then(|v| v.as_str()) {
                                models.push(n.to_string());
                            }
                        }
                    }
                    Ok(TestKeyResponse {
                        success: true,
                        provider: "ollama".to_string(),
                        message: "Successfully connected to local Ollama server!".to_string(),
                        detected_models: models,
                    })
                }
                _ => {
                    // Try OpenAI format /v1/models
                    let models_url = format!("{}/models", base_url.trim_end_matches('/'));
                    let resp2 = client.get(&models_url).send().await?;
                    if resp2.status().is_success() {
                        Ok(TestKeyResponse {
                            success: true,
                            provider: "ollama".to_string(),
                            message: "Connected to local OpenAI-compatible endpoint!".to_string(),
                            detected_models: vec!["default".to_string()],
                        })
                    } else {
                        Err(anyhow!("Failed to connect to local endpoint at {base_url}"))
                    }
                }
            }
        }
        other => Err(anyhow!("Unsupported provider: {other}")),
    }
}
