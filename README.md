# Calagopus AI Assistant Extension (`dev.calagopus.aiassistant`)

A full-featured, production-ready extension for the **Calagopus Game Panel** that provides a dedicated **Web UI Interface for an AI Assistant**.

The AI Assistant can inspect, troubleshoot, and configure game servers (Minecraft, Rust, Palworld, Node.js, Python, Discord bots, etc.) while strictly respecting file security: **it can only read and write files by asking the user for explicit interactive approval**, and it easily **hooks up with your choice of AI API keys**.

---

## 🌟 Key Highlights

- **Dedicated Web UI Interface**: Clean, modern dark-mode chat interface seamlessly integrated into Calagopus panel navigation.
- **Server Context Awareness**: Directly embedded into every server's sidebar at `/server/:id/assistant`. The AI automatically understands server specs, IP/port, game egg type, and status.
- **Interactive File Approval Workflow ("By Asking the User")**:
  - The AI cannot blindly read or alter files without your consent.
  - When the assistant needs to inspect a config file or log, an interactive **File Read Request** card appears in the chat.
  - When the assistant proposes changes (e.g. optimizing `server.properties` or fixing a plugin config), it generates a **File Write Request** card with a live **Diff Preview** showing exactly what lines are changing.
  - You click **[✓ Approve]** or **[✕ Deny]**. Only upon approval does the backend execute the operation.
- **Multi-Provider API Key Integration**:
  - **OpenAI** (`gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`, `o1`, `o3-mini`)
  - **Anthropic Claude** (`claude-3-5-sonnet-latest`, `claude-3-5-haiku-latest`, `claude-3-opus-latest`)
  - **Google Gemini** (`gemini-1.5-flash`, `gemini-1.5-pro`, `gemini-2.0-flash`)
  - **Groq** (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, `mixtral-8x7b-32768`)
  - **OpenRouter** (access to 100+ open-source and proprietary models)
  - **Local / Self-Hosted LLMs** (Ollama, vLLM, LM Studio via OpenAI-compatible endpoints)
- **Built-in Connection Tester**: Test and validate API keys with a single click in the UI before chatting.
- **Dual Scope Support**:
  - **Per-Server Assistant**: `/server/:id/assistant` for managing specific game servers.
  - **Admin Global Assistant**: `/admin/ai-assistant` for managing the overall panel and multiple servers.

---

## 🛡️ File Read & Write Safety Architecture

The assistant implements structured tool calling with an interactive approval gate:

```
[ User asks: "Set my server port to 25577" ]
                     │
                     ▼
[ AI analyzes request & calls tool: write_file("server.properties", content, reason) ]
                     │
                     ▼
┌────────────────────────────────────────────────────────┐
│ ⚠️  INTERACTIVE TOOL APPROVAL CARD IN WEB UI          │
│                                                        │
│ Action:   ✏️ Write File (/server.properties)           │
│ Reason:   Update server-port from 25565 to 25577       │
│ Preview:  - server-port=25565                          │
│           + server-port=25577                          │
│                                                        │
│   [ ✓ Approve & Save Changes ]    [ ✕ Deny Request ]   │
└────────────────────────────────────────────────────────┘
            │                                 │
     (If Approved)                      (If Denied)
            │                                 │
            ▼                                 ▼
[ Wings writes file to disk ]        [ Operation cancelled ]
            │                                 │
            ▼                                 ▼
[ AI confirms: "Port updated!" ]     [ AI respects user refusal ]
```

### Path Traversal Protection
The backend validates and sanitizes all paths to prevent directory traversal (`..`) and strictly blocks access to protected credential files (such as `.env` and SSH keys).

---

## 🔌 API Key Configuration

1. In the AI Assistant chat header, click **⚙️ API Keys & Settings**.
2. Select your provider:
   - **OpenAI**: Paste your `sk-...` API key.
   - **Anthropic**: Paste your `sk-ant-...` key.
   - **Gemini**: Paste your Google AI Studio key (`AIza...`).
   - **Groq**: Paste your Groq Cloud key (`gsk_...`).
   - **OpenRouter**: Paste your OpenRouter key (`sk-or-...`).
   - **Ollama**: Enter your local server base URL (`http://localhost:11434/v1`) and model name.
3. Click **⚡ Test Connection** to instantly verify network reachability and key validity.
4. Click **Save Configuration**. Keys are persisted securely.

---

## 📦 Package Structure

```
calagopusAIassistant/
├── Metadata.toml               # Calagopus extension manifest
├── README.md                   # This documentation
├── migrations/                 # PostgreSQL migration scripts
│   └── 20261111150000_aiassistant_tables.sql
├── backend/                    # Rust backend crate
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs              # Extension lifecycle & route registration
│       ├── providers.rs        # Multi-provider API client & test routines
│       ├── settings.rs         # Database settings persistence & key masking
│       ├── files.rs            # Safe file reading, writing, and path sanitization
│       └── tools.rs            # Tool definitions (read_file, write_file, list_files)
└── frontend/                   # TypeScript/React frontend
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.tsx           # Extension entrypoint, server & admin route registry
        ├── app.css             # Glassmorphic UI styles & animations
        ├── types/index.ts      # TypeScript interfaces
        ├── services/
        │   ├── aiClient.ts     # Multi-provider AI streaming & tool calling
        │   ├── fileService.ts  # Calagopus Wings file APIs & diff computation
        │   └── settingsService.ts # Local & backend settings sync
        ├── components/
        │   ├── AiAssistantChat.tsx # Primary Web UI chat component
        │   ├── ChatMessage.tsx     # Message bubble, markdown, code copy
        │   ├── ToolApprovalCard.tsx # Interactive Approve / Deny card
        │   ├── FileDiffViewer.tsx   # Visual syntax diff of proposed changes
        │   └── SettingsModal.tsx    # API key setup & test connection modal
        └── pages/
            ├── ServerAiAssistantPage.tsx # /server/:id/assistant page wrapper
            ├── AdminAiAssistantPage.tsx  # /admin/ai-assistant page wrapper
            └── ExtensionConfigPage.tsx   # /admin/extensions/dev.calagopus.aiassistant
```

---

## 🚀 Installation & Deployment

### Method 1: Upload via Admin Panel (Recommended)
1. Download or export the package archive:
   `dev_calagopus_aiassistant.c7s.zip`
2. Log into the Calagopus Panel as Administrator.
3. Go to **Admin → Extensions → Upload**.
4. Select `dev_calagopus_aiassistant.c7s.zip` and click **Install**.
5. The extension will automatically compile, apply migrations, and become active.

### Method 2: Manual Directory Placement
1. Copy the `dev_calagopus_aiassistant.c7s.zip` into the Calagopus server's `extensions/` directory.
2. Restart the panel daemon or container:
   ```bash
   docker compose restart web
   ```

### Method 3: Development Workspace
To link into an existing `calagopus-panel` development setup:
```bash
ln -s /home/pato/Downloads/calagopusAIassistant /path/to/calagopus-panel/backend-extensions/dev_calagopus_aiassistant
```

---

## 📄 License
Custom (Pato - Non-Commercial / Attribution Required)
