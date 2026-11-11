-- Calagopus AI Assistant tables
CREATE TABLE IF NOT EXISTS aiassistant_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    server_id UUID,
    title VARCHAR(255) NOT NULL DEFAULT 'New Conversation',
    provider VARCHAR(64) NOT NULL DEFAULT 'openai',
    model VARCHAR(128) NOT NULL DEFAULT 'gpt-4o-mini',
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS aiassistant_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    server_id UUID,
    action VARCHAR(32) NOT NULL, -- 'read_file', 'write_file', 'list_files'
    file_path TEXT NOT NULL,
    approved BOOLEAN NOT NULL DEFAULT FALSE,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aiassistant_conversations_user ON aiassistant_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_aiassistant_conversations_server ON aiassistant_conversations(server_id);
CREATE INDEX IF NOT EXISTS idx_aiassistant_audit_logs_server ON aiassistant_audit_logs(server_id);
