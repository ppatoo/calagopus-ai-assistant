use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Deserialize)]
pub struct FileReadRequest {
    pub server_uuid: Option<String>,
    pub file_path: String,
    pub user_approved: bool,
}

#[derive(Debug, Serialize)]
pub struct FileReadResponse {
    pub success: bool,
    pub file_path: String,
    pub content: String,
    pub size_bytes: usize,
    pub lines: usize,
}

#[derive(Debug, Deserialize)]
pub struct FileWriteRequest {
    pub server_uuid: Option<String>,
    pub file_path: String,
    pub content: String,
    pub user_approved: bool,
}

#[derive(Debug, Serialize)]
pub struct FileWriteResponse {
    pub success: bool,
    pub file_path: String,
    pub bytes_written: usize,
    pub message: String,
}

#[derive(Debug, Deserialize)]
pub struct FileListRequest {
    pub server_uuid: Option<String>,
    pub directory: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct FileEntry {
    pub name: String,
    pub is_file: bool,
    pub size_bytes: u64,
    pub modified: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct FileListResponse {
    pub success: bool,
    pub directory: String,
    pub files: Vec<FileEntry>,
}

/// Validates that a file path is safe and does not attempt directory traversal
pub fn sanitize_path(raw_path: &str) -> Result<String> {
    let clean = raw_path.trim().replace('\\', "/");
    let normalized = clean.trim_start_matches('/');

    if normalized.contains("../") || normalized.contains("/..") || normalized == ".." {
        return Err(anyhow!("Invalid path: Directory traversal ('..') is prohibited"));
    }

    // Check against blacklisted sensitive files
    let lower = normalized.to_lowercase();
    if lower == ".env" || lower.ends_with("/.env") || lower.contains("id_rsa") || lower.contains(".ssh") {
        return Err(anyhow!("Access to protected credential file is blocked for security"));
    }

    Ok(normalized.to_string())
}
