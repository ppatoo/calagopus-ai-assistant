use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolDefinition {
    pub name: String,
    pub description: String,
    pub parameters: Value,
}

pub fn get_available_tools() -> Vec<Value> {
    vec![
        json!({
            "type": "function",
            "function": {
                "name": "read_file",
                "description": "Reads the text content of a file from the server directory. Requires user approval before reading.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "path": {
                            "type": "string",
                            "description": "Relative path of the file to read, e.g. 'server.properties', 'config/paper-global.yml', or 'logs/latest.log'."
                        },
                        "reason": {
                            "type": "string",
                            "description": "Explanation shown to the user explaining why this file needs to be read."
                        }
                    },
                    "required": ["path", "reason"]
                }
            }
        }),
        json!({
            "type": "function",
            "function": {
                "name": "write_file",
                "description": "Writes or replaces content in a file on the server. Always requires explicit user confirmation and review before executing.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "path": {
                            "type": "string",
                            "description": "Relative path of the file to write, e.g. 'server.properties' or 'config.yml'."
                        },
                        "content": {
                            "type": "string",
                            "description": "The exact full new text content of the file."
                        },
                        "reason": {
                            "type": "string",
                            "description": "Detailed explanation of what changes are being made and why."
                        }
                    },
                    "required": ["path", "content", "reason"]
                }
            }
        }),
        json!({
            "type": "function",
            "function": {
                "name": "list_files",
                "description": "Lists files and subdirectories in a given directory on the server.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "directory": {
                            "type": "string",
                            "description": "Directory path relative to server root, default is '/'."
                        },
                        "reason": {
                            "type": "string",
                            "description": "Why the assistant needs to list files in this directory."
                        }
                    },
                    "required": ["directory"]
                }
            }
        })
    ]
}
