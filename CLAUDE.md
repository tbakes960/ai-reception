# AI Reception — Project Configuration
> Extends: D:\Users\Trevor\Documents\Claude Visual Studio\CLAUDE.md
> Override global rules only where explicitly noted below.

---

## PROJECT PURPOSE

Build a modular, AI-powered reception system that handles guest/user intake,
routes requests intelligently, and generates appropriate responses or actions.

Primary use case: hotel AI receptionist (Oyugis Le Grand Hotel).
Secondary use case: general intake automation for any service business.

The system must be:
- Deployable as a standalone web app OR embeddable widget
- Extensible without breaking existing modules
- Operable with minimal human intervention once configured

---

## SCOPE (MVP)

IN SCOPE:
- Natural language conversation interface (text-first, voice optional)
- Guest query handling: check-in times, amenities, FAQs, booking status
- Escalation routing: flag complex queries for human handoff
- Response logging: all inputs and AI outputs stored
- Config-driven behavior: FAQ content, escalation rules via JSON/YAML

OUT OF SCOPE (defer to later phases):
- Real-time PMS (Property Management System) integration
- Voice processing pipeline
- Multi-language support
- Native mobile app

---

## TECH STACK

| Layer        | Technology                        | Notes                              |
|--------------|-----------------------------------|------------------------------------|
| Frontend     | HTML / CSS / Vanilla JS           | No framework unless user specifies |
| Backend      | Node.js (Express)                 | Lightweight API server             |
| AI           | Claude API (claude-sonnet-4-6)    | Conversation + reasoning           |
| Storage      | Railway PostgreSQL + pgvector      | DATABASE_URL from Railway dashboard|
| Config       | .env + feature-flags.json         | No hardcoded values                |
| Deployment   | Vercel (frontend) / Railway (API + DB) | Same pattern as existing projects  |

---

## ARCHITECTURE — 5-LAYER MODULAR SYSTEM

```
[Guest / External Trigger]
         ↓
┌─────────────────────┐
│  INPUT LAYER        │  src/input/
│  Chat UI, API hook, │  Normalizes all inputs to
│  webhook receiver   │  standard RequestObject
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│  PROCESSING LAYER   │  src/processing/
│  AI agent, rules    │  Routes request type,
│  engine, workflows  │  calls Claude, applies rules
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│  SERVICE LAYER      │  src/services/
│  Booking API, SMS,  │  Thin wrappers — one file
│  Calendar, Email    │  per integration
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│  DATA LAYER         │  src/data/
│  Storage adapters,  │  Reads/writes only happen
│  cache, retrieval   │  here — never in other layers
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│  OUTPUT LAYER       │  src/output/
│  UI response, API   │  Formats ResponseObject
│  payload, webhook   │  for each channel type
└─────────────────────┘
```

**Data contract between layers:**
- Input → Processing: `RequestObject { type, content, metadata, sessionId }`
- Processing → Output: `ResponseObject { text, actions[], escalate, confidence }`
- All layer I/O is logged automatically via the data layer.

---

## FOLDER RESPONSIBILITIES

| Folder              | Owns                                          | Does NOT own                   |
|---------------------|-----------------------------------------------|--------------------------------|
| `src/input/`        | Parsing, normalization, session init          | Business logic, AI calls       |
| `src/processing/`   | AI calls, rules engine, workflow execution    | Raw HTTP, storage writes       |
| `src/services/`     | Third-party API wrappers only                 | Logic, formatting, storage     |
| `src/data/`         | All reads and writes to any store             | Business logic, formatting     |
| `src/output/`       | Response formatting per channel               | Logic, storage, AI calls       |

---

## SKILL INTEGRATION STRATEGY

| Skill Repo                  | When to Invoke                                              |
|-----------------------------|-------------------------------------------------------------|
| `claude-skills/engineering` | Any code generation, refactor, or debugging task            |
| `claude-skills/product-team`| Writing specs, user stories, or feature scoping             |
| `claude-code-skill-factory` | Generating new skills/agents/hooks for this project         |
| `caveman/`                  | Long sessions where token cost is a concern                 |
| `claude-token-efficient/`   | Apply `profiles/CLAUDE.agents.md` for AI pipeline work      |
| `rtk/`                      | Terminal operations: file reads, grep, git diffs            |
| `superpowers-skills/`       | Debugging, architecture decisions, cross-session memory     |
| `gemini-cli/`               | Secondary research or large-context summarization tasks     |

**Default:** Start every dev session with `claude-skills/engineering` active.
**Token guard:** If a session exceeds ~20 tool calls, activate `caveman` Full mode.

---

## AI INTEGRATION RULES (CLAUDE API)

- Model: `claude-sonnet-4-6` (default); escalate to `claude-opus-4-7` for complex reasoning only
- Always use prompt caching for the system prompt (static hotel FAQ / rules context)
- Wrap every Claude call in an error handler — no raw API calls in business logic
- Rate limit: max 3 retries with exponential backoff; log failure and escalate on 3rd failure
- Token budget: set `max_tokens: 1024` for conversational responses; `4096` for structured outputs
- System prompt lives in `configs/system-prompt.md` — loaded at startup, never hardcoded

---

## CONFIGURATION & SECURITY

- All secrets via environment variables — never committed
- `.env.example` lists all required keys with placeholder values
- Feature flags in `configs/feature-flags.json` — toggle features without deploys
- CLAUDE.md never contains API keys, passwords, or connection strings

Required env vars (see `configs/.env.example`):
```
ANTHROPIC_API_KEY=your_key_here
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
```

---

## PERFORMANCE CONSIDERATIONS

- Cache system prompt on first Claude API call (Anthropic prompt caching)
- Batch FAQ lookups before calling AI — avoid unnecessary API calls
- Log all AI response times to `logs/runs/` for optimization review
- Target: < 2s for cached/FAQ queries; < 5s for AI-generated responses

---

## WORKFLOW

Active workflow: `workflows/reception-flow.md`

```
Guest message arrives
    → Input layer normalizes to RequestObject
    → Processing layer checks FAQ cache
        → FAQ hit?  → Output layer returns cached response
        → FAQ miss? → AI agent generates response
            → Confidence < 0.7? → Escalate flag set
    → Data layer logs full exchange
    → Output layer formats for channel (chat UI / API / webhook)
```

---

## ERROR HANDLING

Following global CLAUDE.md: **stop immediately, report fully, await instruction.**

Additional rules for the AI layer:
- If Claude API returns an error: log full error + input, set escalate flag, return canned fallback
- If Claude returns low-confidence response: do not silently serve — flag for review
- Never retry a failed AI call with user-visible output until confirmed safe

---

## DEVELOPMENT RULES

1. Read any file before editing — never overwrite blindly
2. All new integrations go in `src/services/` as isolated wrappers
3. No cross-layer imports: input never imports from output; processing never writes to storage
4. Feature flags before feature branches — test toggles, not code paths
5. Log before delete — all destructive operations write to `logs/runs/` first

---

## PROJECT STRUCTURE

```
ai reception/
├── backend/        ← Node.js/Express + WebSocket voice server (port 3000)
├── frontend/       ← Next.js dashboard (port 4000)
├── database/       ← schema.sql + seed.sql (run in Supabase SQL Editor)
├── knowledge/      ← hotel-faqs.md source for RAG
├── scripts/        ← seed-knowledge.js
├── configs/        ← .env.example, feature-flags.json
└── workflows/      ← reception-flow.md, outbound-call-flow.md
```

## VOICE SYSTEM RULES

- Twilio Media Streams → Deepgram Nova-3 STT → Claude Sonnet (tool-calling) → ElevenLabs Turbo TTS
- All audio is μ-law 8kHz between Twilio and server
- STT events are emitted via EventEmitter from deepgramSTT.js
- TTS sends text chunks as they arrive from Claude streaming (not waiting for full response)
- Interrupt = speechStarted event during isPlaying=true → close TTS stream + send Twilio clear event
- One CallSession object per active call — never share state between sessions
- Filler phrases play immediately while LLM processes (never let the line go silent)

## BUILD PHASES

| Phase | Goal                                          | Status  |
|-------|-----------------------------------------------|---------|
| 1     | Workspace init + CLAUDE.md                    | Done    |
| 2     | Full backend + voice pipeline + frontend MVP  | Done    |
| 3     | Seed RAG knowledge base, test live calls      | Next    |
| 4     | Tune ElevenLabs voice, test interrupt handling| Planned |
| 5     | Google Calendar integration                   | Planned |
| 6     | n8n workflow automation                       | Planned |

---

## KEY RULES (NON-NEGOTIABLE)

1. No secrets in code or CLAUDE.md — env vars only
2. No cross-layer imports — each layer owns its boundary
3. Every Claude API call is wrapped in error handling
4. Log all AI inputs and outputs — no silent operations
5. Read `agents/aria.md` before building any agent component in this project
