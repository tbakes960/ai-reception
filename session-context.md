# Hotel AI Voice Receptionist — Session Context
> Generated: 2026-05-20 | Resume this file to continue with full context.

---

## 3.1 Project Overview

**Project:** Hotel AI Voice Receptionist (SaaS)
**Owner:** Trevor Bakes — tabekah@yahoo.co.uk
**Core objective:** AI-powered voice receptionist for hotels. Answers inbound calls, manages bookings/CRM, runs outbound call campaigns. Sold as SaaS at $29/month via PayPal.

**Tech stack:**
- **Backend:** Node.js + Express + WebSocket (Railway, port 3000)
- **Frontend:** Next.js 14 App Router (Vercel or Railway, port 4000)
- **Database:** Railway PostgreSQL + pgvector (RAG embeddings)
- **Voice pipeline:** Twilio Media Streams → Deepgram Nova-3 STT → Claude Sonnet tool-calling → ElevenLabs Turbo TTS
- **Payments:** PayPal subscriptions ($29/mo)
- **Error monitoring:** Sentry (optional, off if no DSN set)

**Live backend URL:** `https://ai-reception-production-2987.up.railway.app`
**GitHub repo:** `tbakes960/ai-reception` (public — all secrets are in Railway env vars only)

---

## 3.2 Current Task

**Phase 3 — Live call testing.**
RAG knowledge base seeded (15 chunks, oyugis tenant). Tenant-isolation bugs fixed across the voice pipeline. Ready for:
1. Git push → Railway redeploy
2. Configure Twilio webhook URLs
3. Create admin user
4. Test live call to +19069702390

---

## 3.3 Completed Work

### Security & Infrastructure
- [x] **Tenant isolation** — all 5 data routes (CRM, bookings, conversations, campaigns, auth) filter by `tenant_id = req.tenantId`
- [x] **JWT middleware** — `requireAuth` sets `req.tenantId` from payload; `requireAdmin` checks role
- [x] **Timing attack prevention** — dummy bcrypt compare in login for missing users
- [x] **Helmet CSP** — whitelists Twilio, ElevenLabs, Deepgram, Anthropic, PayPal domains
- [x] **Next.js security headers** — X-Frame-Options DENY, HSTS 1yr, CSP, Permissions-Policy, Referrer-Policy
- [x] **Compression middleware** — gzip on all API responses
- [x] **SIGTERM/SIGINT graceful shutdown** — 10s forced exit fallback
- [x] **unhandledRejection + uncaughtException** handlers — logged via pino, fatal exits on uncaught
- [x] **Rate limiters** — auth (10/15min), API (200/15min), register (5/hr), webhook (60/min)
- [x] **Prompt injection defence** — `sanitize.js` strips injection patterns from STT transcripts before Claude
- [x] **Error leakage fixed** — all routes return generic messages, no `err.message` exposure
- [x] **validateEnv.js** — full required var list, JWT min-length check, production localhost guard

### GDPR & Legal
- [x] **GDPR endpoints** — anonymised deletion (not hard-delete), data export, `consent_at` timestamp
- [x] **Medical notes** — admin-only endpoints `GET /:id/medical`, `PUT /:id/medical`
- [x] **Legal pages** — `/privacy`, `/terms`, `/cookies`, `/dpa` (Next.js pages)
- [x] **Cookie consent banner** — `CookieConsent.jsx`, opt-in/out stored in localStorage
- [x] **Register page** — links to Terms + Privacy Policy in signup form

### Observability
- [x] **Sentry** — `@sentry/node` in backend, `@sentry/nextjs` in frontend; conditional on `SENTRY_DSN` env var
- [x] **`/health`** — returns `{status, ts}`
- [x] **`/ready`** — live DB probe, returns 503 if disconnected

### Docker & CI
- [x] **Dockerfile** (backend) — multi-stage, non-root user, HEALTHCHECK
- [x] **Dockerfile** (frontend) — multi-stage with Next.js standalone output
- [x] **docker-compose.yml** — backend + frontend + pgvector/pg16, health-checked deps
- [x] **GitHub Actions CI** — `ci.yml`: dep audit, validateEnv smoke test, frontend build check

### WCAG Accessibility
- [x] **Skip-nav link** — `#main-content` in `layout.jsx`
- [x] **`aria-live="assertive"`** — on error containers in register/login forms
- [x] **`htmlFor`/`id` pairs** — all form labels properly associated
- [x] **Focus ring styles** — added to all interactive elements
- [x] **`autoComplete`** attributes — email, password, organization

### Multi-Tenant SaaS Schema
- [x] **`saas-migration.sql`** applied to Railway DB — adds `tenants` + `subscriptions` tables, `tenant_id` FK on all 8 tables, backfills with "oyugis" tenant
- [x] **`create-admin.js`** script — generates random password, bcrypt hashes, upserts admin user
- [x] **Hardcoded password removed** from `schema.sql`

### Routes Built
- `/api/auth` — login with express-validator, timing attack prevention
- `/api/tenant/register` — creates tenant + user + subscription record
- `/api/tenant/me`, `/api/tenant/settings`
- `/api/subscription/create-order`, `/capture`, `/webhook`, `/status`
- `/api/clients` — full CRUD + GDPR export + anonymised delete
- `/api/bookings` — full CRUD, double-booking prevention
- `/api/conversations` — paginated list + full transcript
- `/api/campaigns` — CRUD + call log + run-batch
- `/twiml`, `/stream` (WebSocket) — voice pipeline entry

### Frontend Pages Built
- `/` — landing page (dark slate, features, $29 pricing, CTA)
- `/register` — hotel signup form
- `/billing` — PayPal subscribe button + status
- `/(auth)/login` — JWT login
- `/(dashboard)/` — stats overview
- `/(dashboard)/crm` — client list + profiles
- `/(dashboard)/bookings` — calendar view
- `/(dashboard)/conversations` — transcript list
- `/(dashboard)/campaigns` — campaign manager
- `/(dashboard)/settings`
- `/privacy`, `/terms`, `/cookies`, `/dpa` — legal pages

---

## 3.4 Pending Work

### Phase 3 — Live Testing (IN PROGRESS)
- [x] **Seed RAG knowledge base** — 15 chunks seeded for oyugis tenant (877065c5-7420-44d5-b906-254c3eb8862b)
- [x] **Tenant-isolation bug fix** — twilioHandler, crmTools, bookingTools, ragService, systemPrompt, claudeAgent all updated to pass tenant_id through voice pipeline
- [x] **Document upload system** — PDF/DOCX/TXT upload, parse, chunk, embed → pgvector. Routes: GET/POST/DELETE /api/knowledge. Frontend: /dashboard/knowledge page with drag-drop UI. DB: knowledge-upload-migration.sql applied.
- [ ] **Push to GitHub** — `git add -A && git commit -m "..." && git push origin main` → triggers Railway redeploy
- [ ] **Configure Twilio webhook** — Voice: `https://ai-reception-production-2987.up.railway.app/twiml`
- [ ] **Create admin user** — `NODE_PATH=backend/node_modules node scripts/create-admin.js tabekah@yahoo.co.uk oyugis`
- [ ] **Live Twilio call test** — call `+19069702390`, confirm TwiML served → WebSocket opens → Deepgram connects → ElevenLabs speaks
- [ ] **Test booking flow end-to-end** — say "I want to book a room for tomorrow" → confirm booking in Railway DB

### Phase 4 — Voice Tuning
- [ ] ElevenLabs voice tuning (adjust voice ID, stability, similarity settings)
- [ ] Interrupt handling test — barge-in mid-response
- [ ] Filler phrase timing calibration (<600ms threshold)

### Phase 5+
- [ ] Google Calendar sync (`calendarService.js` + `calendarTools.js`)
- [ ] n8n workflow automation (booking confirmation, follow-up)
- [ ] Sentry DSN — sign up at sentry.io, add `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` to `configs/.env` and Railway env vars
- [ ] Redis for rate limiter persistence (current in-memory store resets on restart)
- [ ] Add `npm run lint` script to both `package.json` files (CI currently skips lint step)
- [ ] Push final changes to GitHub to trigger Railway redeploy

---

## 3.5 Key Decisions Made

| Decision | Rationale |
|----------|-----------|
| Multi-tenant via `tenant_id` column (not separate schemas) | Simpler ops, pgvector works per-row |
| JWT in `Authorization: Bearer` header (not cookies) | Eliminates CSRF attack surface entirely; SPA-friendly |
| bcrypt cost 12 | Balance of security vs. login latency (~300ms acceptable) |
| Anonymised deletion (not hard delete) | Preserves referential integrity; GDPR-compliant "right to be forgotten" |
| Sentry conditional on `SENTRY_DSN` | Avoids startup crash if DSN not yet configured |
| Next.js `output: 'standalone'` | Required for Docker multi-stage runner stage |
| PayPal sandbox by default | `PAYPAL_BASE` env var controls sandbox vs production |
| `registerLimiter` separate from `authLimiter` | Different threat models — account creation vs brute-force |
| Prompt injection sanitizer in `claudeAgent.js` | Voice callers may attempt to override AI behaviour via speech |

---

## 3.6 Failed / Rejected Approaches

| What Failed | Why / What to Do Instead |
|-------------|--------------------------|
| Railway CLI (`railway whoami`) | CLI Rust binary cannot read its session token when invoked via Claude's subprocess shell. Use Railway GraphQL API directly with user token `0da5e785-960c-47ef-8fbc-1d77da09954c` |
| `npm install @google-auth-library` | Invalid package name. Use `google-auth-library` and `googleapis` |
| `node node_modules\.bin\next dev` on Windows | Bash shim fails. Use `node_modules\.bin\next.cmd dev -p 4000` |
| `csurf` CSRF middleware | Not needed — JWT in `Authorization` header is not auto-sent by browsers cross-origin. Adding csurf would complicate API clients with no security benefit |
| Hardcoded admin password in `schema.sql` | Removed. Use `node scripts/create-admin.js <email> <tenantId>` instead |
| Railway `githubRepoDeploy` with private repo | Returns "Only public repos can be deployed via URL." Repo must be public, OR use Railway dashboard GitHub integration |

---

## 3.7 System Architecture

```
INBOUND CALL
  Twilio (+19069702390)
    → POST /twiml  (TwiML: <Connect><Stream url="wss://.../stream"/></Connect>)
    → WebSocket /stream
    → callSession.js  (per-call state: streamSid, callSid, callerPhone, history)
    → deepgramSTT.js  (nova-3-general, mulaw 8kHz, endpointing 300ms)
         → userTurnComplete event (final transcript)
         → userInterrupt event (speech during AI playback)
    → claudeAgent.js  (claude-sonnet-4-6, streaming, tool-calling)
         → sanitize.js  (prompt injection strip)
         → systemPrompt.js  (dynamic: hotel context + RAG + client data)
         → tools/  (CRM, booking, calendar, SMS, email, workflow)
    → elevenLabsTTS.js  (eleven_turbo_v2, streaming chunks → Twilio Media)
    → interruptHandler.js  (VAD during isPlaying → clear Twilio + restart STT)

OUTBOUND CALLS
  node-cron (daily 9AM) → outboundCalling.js
    → consent check + time window check + 7-day gap check
    → twilio.calls.create() → same voice pipeline via /twiml/outbound

FRONTEND (Next.js 14)
  → Axios → backend /api/* → requireAuth (JWT Bearer) → tenantId scoped DB queries

DATABASE (Railway PostgreSQL + pgvector)
  tenants → users → clients → bookings
                            → conversations
                            → support_tickets
  campaigns → campaign_calls
  knowledge_documents (vector(1536))
  subscriptions
```

---

## 3.8 File Paths & Project Structure

```
ai reception/
├── .github/
│   └── workflows/
│       └── ci.yml                    ← GitHub Actions: audit + build
├── backend/
│   ├── Dockerfile                    ← Multi-stage, non-root, HEALTHCHECK
│   ├── .dockerignore
│   ├── .railway/config.json          ← Railway project/env/service IDs
│   ├── nixpacks.toml                 ← nodejs_20, start command
│   ├── package.json
│   └── src/
│       ├── server.js                 ← Express + WS + Sentry + graceful shutdown
│       ├── agent/
│       │   ├── claudeAgent.js        ← Claude streaming + tool loop + sanitize
│       │   ├── sanitize.js           ← Prompt injection defence (NEW)
│       │   ├── systemPrompt.js       ← Dynamic prompt builder (RAG injected)
│       │   └── tools/
│       │       ├── crmTools.js
│       │       ├── bookingTools.js
│       │       ├── calendarTools.js
│       │       ├── communicationTools.js
│       │       └── workflowTools.js
│       ├── middleware/
│       │   ├── auth.js               ← requireAuth (sets req.tenantId), requireAdmin
│       │   ├── rateLimit.js          ← apiLimiter, authLimiter, registerLimiter, webhookLimiter
│       │   ├── twilioValidation.js   ← HMAC signature check
│       │   └── validateEnv.js        ← Startup env var validation
│       ├── routes/
│       │   ├── authRoutes.js         ← /login with express-validator + timing attack fix
│       │   ├── bookingRoutes.js      ← tenant-scoped CRUD
│       │   ├── campaignRoutes.js     ← tenant-scoped + requireAdmin guards
│       │   ├── conversationRoutes.js ← tenant-scoped, sentiment/direction enum validation
│       │   ├── crmRoutes.js          ← tenant-scoped + GDPR export/anonymise
│       │   ├── subscriptionRoutes.js ← PayPal flow + webhookLimiter
│       │   ├── tenantRoutes.js       ← register + me + settings + registerLimiter
│       │   └── twilioRoutes.js       ← /twiml + /stream WebSocket
│       ├── services/
│       │   ├── db.js                 ← pg Pool singleton
│       │   ├── emailService.js
│       │   ├── outboundCalling.js    ← cron + consent/time checks
│       │   ├── ragService.js         ← pgvector cosine search
│       │   └── smsService.js
│       └── voice/
│           ├── callSession.js
│           ├── deepgramSTT.js
│           ├── elevenLabsTTS.js
│           ├── interruptHandler.js
│           └── twilioHandler.js
├── configs/
│   ├── .env                          ← GITIGNORED — real secrets live here
│   └── .env.example                  ← Template (no real values)
├── database/
│   ├── schema.sql                    ← Base schema (pgvector, no hardcoded passwords)
│   └── saas-migration.sql            ← Adds tenants, subscriptions, tenant_id FKs (ALREADY APPLIED)
├── docker-compose.yml                ← backend + frontend + pgvector/pg16
├── frontend/
│   ├── Dockerfile                    ← Multi-stage standalone Next.js
│   ├── next.config.js                ← standalone output + rewrites + security headers
│   ├── sentry.client.config.js
│   ├── sentry.server.config.js
│   ├── .env.local                    ← GITIGNORED — NEXTAUTH_SECRET etc.
│   ├── package.json
│   ├── app/
│   │   ├── layout.jsx                ← Root: skip-nav, CookieConsent, legal footer
│   │   ├── page.jsx                  ← Landing page
│   │   ├── (auth)/login/page.jsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.jsx            ← Sidebar nav
│   │   │   ├── page.jsx              ← Dashboard overview
│   │   │   ├── crm/page.jsx
│   │   │   ├── bookings/page.jsx
│   │   │   ├── conversations/page.jsx
│   │   │   ├── campaigns/page.jsx
│   │   │   └── settings/page.jsx
│   │   ├── billing/page.jsx
│   │   ├── register/page.jsx
│   │   ├── privacy/page.jsx
│   │   ├── terms/page.jsx
│   │   ├── cookies/page.jsx
│   │   └── dpa/page.jsx
│   ├── components/
│   │   └── CookieConsent.jsx         ← Opt-in/out banner, localStorage persistence
│   └── lib/
│       ├── api.js                    ← Axios client with Bearer token
│       └── supabase.js
├── knowledge/
│   └── hotel-faqs.md                 ← RAG source document (NOT YET SEEDED)
├── scripts/
│   ├── create-admin.js               ← One-time admin setup (random password, prints once)
│   └── seed-knowledge.js             ← Chunks hotel-faqs.md → pgvector (NOT YET RUN)
└── session-context.md                ← THIS FILE
```

---

## 3.9 Important Code Snippets

### Auth middleware — tenant isolation pattern
```js
// backend/src/middleware/auth.js
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.slice(7);
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  req.user = payload;
  req.tenantId = payload.tenantId; // CRITICAL — all routes use this
  next();
}
```

### Every data route MUST scope queries like this
```js
// Pattern used in ALL data routes
const { rows } = await db.query(
  'SELECT * FROM clients WHERE id = $1 AND tenant_id = $2',
  [req.params.id, req.tenantId]
);
```

### Prompt injection sanitizer
```js
// backend/src/agent/sanitize.js
// Applied to ALL user messages before they reach Claude
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|context)/gi,
  /forget\s+(everything|all|your\s+instructions?)/gi,
  // ... more patterns
];
function sanitizeTranscript(transcript) {
  let text = transcript.slice(0, 1000); // hard cap
  for (const p of INJECTION_PATTERNS) text = text.replace(p, '[unclear]');
  return text.trim();
}
```

### Railway deployment (no CLI — use GraphQL API)
```bash
# Railway CLI fails in subprocess. Use API token directly:
# Token: 0da5e785-960c-47ef-8fbc-1d77da09954c
# GraphQL endpoint: https://backboard.railway.app/graphql/v2
# Service ID: (check .railway/config.json)
```

### Run admin setup script
```bash
cd "ai reception"
node scripts/create-admin.js tabekah@yahoo.co.uk oyugis
# Prints password ONCE — store it immediately
```

### Seed RAG knowledge base
```bash
cd "ai reception"
node scripts/seed-knowledge.js
# Chunks knowledge/hotel-faqs.md → embeds → upserts into knowledge_documents
```

### Start frontend (Windows)
```bash
cd "ai reception/frontend"
node_modules\.bin\next.cmd dev -p 4000
```

### Start backend (local)
```bash
cd "ai reception/backend"
node src/server.js
```

---

## 3.10 Constraints & Requirements

### Non-negotiable security rules
- **No secrets in code** — env vars only; `.env` is gitignored
- **Never commit `.env`** — real `DATABASE_URL` only in `configs/.env` and Railway env vars
- **Tenant isolation** — every DB query against data tables must include `AND tenant_id = req.tenantId`
- **JWT in Authorization header** — never in cookies (eliminates CSRF)
- **bcrypt cost 12** minimum for password hashing
- **Generic error messages** — never expose `err.message` to API consumers

### Environment variables (full list)
```env
# Required (server will exit if missing)
DATABASE_URL=
JWT_SECRET=          # min 32 chars
ANTHROPIC_API_KEY=
TWILIO_ACCOUNT_SID=  # AC... prefix (not SK...)
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER= # E.164, no spaces: +19069702390
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
DEEPGRAM_API_KEY=
SERVER_URL=          # https://ai-reception-production-2987.up.railway.app
FRONTEND_URL=        # https://... (not localhost in production)
HOTEL_NAME=
HOTEL_TIMEZONE=

# Optional (features disabled if missing, warnings logged)
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_PLAN_ID=
PAYPAL_BASE=         # https://api-m.sandbox.paypal.com or api-m.paypal.com
OPENAI_API_KEY=      # For RAG embeddings
SENTRY_DSN=          # Backend Sentry DSN
NEXT_PUBLIC_SENTRY_DSN= # Frontend Sentry DSN
```

### Performance targets
- Voice pipeline latency < 1.2s (STT ~150ms + LLM ~500ms + TTS ~150ms + network)
- Filler phrase if LLM > 600ms
- API responses < 200ms (non-AI endpoints)

---

## 3.11 Current State Summary

| Component | Status |
|-----------|--------|
| Backend Express server | Working — deployed on Railway |
| PostgreSQL schema | Applied — includes SaaS migration (tenants, subscriptions, tenant_id FKs) |
| JWT auth + tenant isolation | Working |
| All 5 data API routes | Working, tenant-scoped |
| Voice pipeline (Twilio→Deepgram→Claude→ElevenLabs) | Built — NOT YET LIVE TESTED |
| RAG knowledge base | Built — NOT YET SEEDED |
| Frontend Next.js | Built — runs locally on port 4000 |
| Legal pages | Built |
| Cookie consent | Built |
| Sentry | Integrated — needs DSN to activate |
| Docker | Files created — not yet built/tested |
| GitHub Actions CI | File created — triggers on push to main |
| Outbound calling cron | Built — triggers daily 9AM via node-cron |

---

## 3.12 Next Steps (Actionable, Ordered)

### Immediate (Phase 3 — Live Testing)

1. **Seed the RAG knowledge base**
   ```bash
   cd "ai reception"
   node scripts/seed-knowledge.js
   ```
   Verify rows appear in `knowledge_documents` table in Railway.

2. **Create the admin user for the oyugis tenant**
   ```bash
   node scripts/create-admin.js tabekah@yahoo.co.uk oyugis
   ```
   Store the printed password securely.

3. **Configure Twilio webhook URLs** in Twilio Console:
   - Voice webhook: `https://ai-reception-production-2987.up.railway.app/twiml`
   - Status callback: `https://ai-reception-production-2987.up.railway.app/api/campaigns/call-status`

4. **Push all current changes to GitHub** to trigger Railway redeploy:
   ```bash
   git add -A
   git commit -m "Production-readiness audit: security hardening, legal pages, Docker, CI"
   git push origin main
   ```

5. **Test live call** — call `+1 906 970 2390` and verify:
   - TwiML served (check Railway logs)
   - WebSocket opens
   - Deepgram STT produces transcript
   - Claude responds via ElevenLabs audio

6. **Set up Sentry** (optional but recommended):
   - Create free account at sentry.io
   - Create two projects (Node.js + Next.js)
   - Add `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` to Railway env vars

### Near-term

7. **Switch PayPal from sandbox to production** when ready to charge real customers:
   - Change `PAYPAL_BASE` from `api-m.sandbox.paypal.com` → `api-m.paypal.com`
   - Update `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_PLAN_ID` to live credentials

8. **Add Redis for rate limiter persistence** — current in-memory store resets on Railway restart:
   ```bash
   npm install rate-limit-redis ioredis
   ```
   Update `rateLimit.js` to use `RedisStore`.

9. **Google Calendar integration** — set `GOOGLE_CALENDAR_ID` + `GOOGLE_SERVICE_ACCOUNT_KEY` env vars, test `syncToCalendar` tool.

10. **Phase 4 voice tuning** — adjust ElevenLabs stability/similarity, test interrupt (barge-in) handling, calibrate filler phrase timing.
