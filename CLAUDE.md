# AutoTest — AI-Powered Pre-Push Test Generator with Dashboard

## What This Product Is

AutoTest is a developer tool that:
1. **Hooks into git** — fires automatically before every `git push`
2. **Scans changed functions** — uses `git diff` to find only what changed
3. **Generates unit tests via AI** — Claude/OpenAI/Gemini/Ollama (see plan model below)
4. **Runs the tests** — pytest for Python, Jest for JavaScript
5. **Sends results to a dashboard** — web app where teams see coverage, errors, trends

Think: SonarQube but AI-powered, runs BEFORE push, zero server setup for developers.

---

## Pricing & Plan Model (Hybrid — Option C)

This is the core business model. Every decision about who calls AI and how must respect this.

| Plan | Price | How AI works | API key needed? |
|---|---|---|---|
| **Free** | $0 | User brings their own key (Claude/OpenAI/Gemini/Ollama) | Yes — their own |
| **Pro** | $19/mo | Backend calls Claude on their behalf | No — just login |
| **Enterprise** | Custom | Their own key plugged into our backend | Yes — their company key |

### Plan detection in CLI (mode resolution order)

```
CLI starts
  ↓
AUTOTEST_TOKEN set? (paid user logged in)
  → YES: call OUR backend /generate-tests endpoint (Pro/Enterprise)
  → NO: continue below

ANTHROPIC_API_KEY set? → use Claude directly (Free)
OPENAI_API_KEY set?    → use OpenAI directly (Free)
GEMINI_API_KEY set?    → use Gemini directly (Free)
Ollama running?        → use Ollama locally (Free, offline)

Nothing found?
  → print setup instructions
  → show signup link for Pro plan
  → exit cleanly (do NOT block push)
```

### Key rule
**Free users never touch our backend for AI.** Their API calls go directly to their provider. Our backend only receives the final report (pass/fail summary). Pro/Enterprise AI calls go through our backend — we call Claude, they never see our key.

---

## Project Structure

```
autotest/
├── CLAUDE.md                              ← you are here
│
├── cli/                                   ← pip installable CLI tool
│   ├── autotest/
│   │   ├── __init__.py
│   │   ├── cli.py                         ← entry point (autotest --install/--run/login)
│   │   ├── scanner.py                     ← git diff → extract changed functions
│   │   ├── generator.py                   ← mode detection → route to right provider
│   │   ├── providers/
│   │   │   ├── __init__.py
│   │   │   ├── base.py                    ← BaseProvider abstract class
│   │   │   ├── anthropic.py               ← direct Claude API (Free plan)
│   │   │   ├── openai.py                  ← direct OpenAI API (Free plan)
│   │   │   ├── gemini.py                  ← direct Gemini API (Free plan)
│   │   │   ├── ollama.py                  ← local Ollama (Free plan, offline)
│   │   │   └── autotest_backend.py        ← our backend API (Pro/Enterprise plan)
│   │   ├── runner.py                      ← write test files → run pytest/jest
│   │   ├── reporter.py                    ← terminal report
│   │   ├── sender.py                      ← POST report to dashboard API
│   │   ├── auth.py                        ← autotest login / logout / whoami
│   │   ├── config.py                      ← read/write ~/.autotest/config.json
│   │   └── hook.py                        ← install/uninstall git pre-push hook
│   └── setup.py
│
├── backend/                               ← FastAPI — AI proxy + report storage + dashboard API
│   ├── main.py                            ← FastAPI app entry point
│   ├── routers/
│   │   ├── auth.py                        ← POST /auth/login, /auth/logout, /auth/token
│   │   ├── generate.py                    ← POST /generate-tests (Pro/Enterprise only)
│   │   ├── reports.py                     ← POST /report (all plans)
│   │   ├── dashboard.py                   ← GET /dashboard/:project_id
│   │   ├── projects.py                    ← CRUD /projects
│   │   └── billing.py                     ← GET /billing, POST /billing/upgrade
│   ├── models/
│   │   ├── user.py                        ← User, Plan enum (free/pro/enterprise)
│   │   ├── project.py                     ← Project, ProjectKey
│   │   ├── report.py                      ← Report, FunctionResult, TestResult
│   │   └── billing.py                     ← Subscription, UsageRecord
│   ├── services/
│   │   ├── ai.py                          ← calls Claude API using OUR key (Pro/Enterprise)
│   │   ├── plan_guard.py                  ← checks user plan before allowing /generate-tests
│   │   └── usage.py                       ← tracks API usage per user per month
│   ├── db/
│   │   ├── database.py                    ← SQLAlchemy setup
│   │   └── migrations/                    ← Alembic migrations
│   └── requirements.txt
│
├── dashboard/                             ← Next.js web app
│   ├── app/
│   │   ├── page.tsx                       ← landing page + pricing
│   │   ├── login/page.tsx                 ← login / signup
│   │   ├── dashboard/
│   │   │   ├── page.tsx                   ← overview (all projects)
│   │   │   ├── projects/[id]/page.tsx     ← per-project detail
│   │   │   ├── files/[id]/page.tsx        ← per-file coverage
│   │   │   └── settings/
│   │   │       ├── page.tsx               ← general settings
│   │   │       ├── plan/page.tsx          ← upgrade/downgrade plan
│   │   │       └── keys/page.tsx          ← enterprise: plug in their own API key
│   ├── components/
│   │   ├── CoverageCard.tsx               ← shows coverage % with trend arrow
│   │   ├── QualityGate.tsx                ← pass/fail badge
│   │   ├── TrendChart.tsx                 ← coverage over time (recharts LineChart)
│   │   ├── FunctionTable.tsx              ← per-function breakdown table
│   │   ├── ErrorList.tsx                  ← failed tests with details
│   │   ├── AISuggestions.tsx              ← AI improvement tips panel
│   │   ├── PlanBadge.tsx                  ← shows Free/Pro/Enterprise
│   │   └── UpgradeBanner.tsx              ← shown to free users prompting upgrade
│   ├── lib/
│   │   └── api.ts                         ← all API calls to backend (single file)
│   └── package.json
│
└── docs/
    ├── architecture.md
    └── api-spec.md
```

---

## Tech Stack

### CLI Tool
- **Language:** Python 3.8+
- **Zero external dependencies** — stdlib only (urllib, subprocess, re, json, os)
- **Config storage:** `~/.autotest/config.json` — stores AUTOTEST_TOKEN after login
- **Test runners:** pytest (Python), Jest (JavaScript)
- **Distribution:** `pip install autotest-hook`

### Backend
- **Framework:** FastAPI (Python)
- **Database:** PostgreSQL + SQLAlchemy ORM + Alembic migrations
- **Auth:** JWT tokens (login) + project API keys (CLI auth)
- **AI:** Our Anthropic API key stored as server env var — never exposed to users
- **Billing:** Stripe (subscriptions)
- **Hosting:** Railway or Render

### Dashboard
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Auth:** NextAuth.js
- **Hosting:** Vercel

---

## Core Flows

### Flow 1 — Free user pushes code
```
git push
  → pre-push hook fires
  → scanner.py: git diff → changed functions
  → config.py: no AUTOTEST_TOKEN found
  → generator.py: check env vars → find ANTHROPIC_API_KEY
  → providers/anthropic.py: call Claude API directly (user's key, user's bill)
  → runner.py: run pytest/jest on generated tests
  → reporter.py: print terminal report
  → sender.py: POST report to /report (no AI data, just results)
  → allow push OR block push
```

### Flow 2 — Pro user pushes code
```
git push
  → pre-push hook fires
  → scanner.py: git diff → changed functions
  → config.py: AUTOTEST_TOKEN found (they logged in)
  → generator.py: route to providers/autotest_backend.py
  → POST /generate-tests with function code + AUTOTEST_TOKEN
  → backend: verify token → check plan = pro → call Claude (OUR key)
  → backend: return generated test code
  → runner.py: run pytest/jest
  → reporter.py: print terminal report
  → sender.py: POST report to /report
  → allow push OR block push
```

### Flow 3 — Enterprise user pushes code
```
Same as Pro flow BUT:
  → backend: check plan = enterprise
  → backend: use THEIR API key (stored encrypted in DB) instead of ours
  → everything else same as Pro
```

### Flow 4 — First time login (Pro signup)
```
autotest login
  → CLI opens browser → https://autotest.dev/cli-auth
  → User signs up / logs in on dashboard
  → Dashboard shows one-time CLI auth token
  → User pastes token into terminal OR CLI auto-captures via local callback
  → Token saved to ~/.autotest/config.json
  → CLI prints: "✅ Logged in as john@company.com (Pro plan)"
```

### Flow 5 — Team views dashboard
```
Login → overview page:
  - All projects with coverage % and quality gate status
  → click project:
  - Coverage trend chart (last 30 days)
  - Files sorted by risk (lowest coverage first)
  - Recent push history (who pushed, when, pass/fail)
  - Per-function breakdown
  - AI suggestions panel
  → settings:
  - Plan management (upgrade/downgrade)
  - Enterprise: enter their own API key
  - Team members
  - Project API keys for CLI
```

---

## API Contracts

### CLI → Backend: Generate tests (Pro/Enterprise only)
```
POST /generate-tests
Authorization: Bearer {AUTOTEST_TOKEN}

Request:
{
  "language": "python",
  "functions": [
    {
      "name": "calculate_discount",
      "file": "utils.py",
      "code": "def calculate_discount(price, percent): ..."
    }
  ]
}

Response:
{
  "generated": [
    {
      "name": "calculate_discount",
      "test_code": "import pytest\ndef test_calculate_discount_normal(): ..."
    }
  ]
}

Errors:
  401 → token invalid or expired → tell user: run autotest login
  403 → free plan user → tell user: upgrade or set your own API key
  429 → monthly usage limit hit → tell user they hit their limit
```

### CLI → Backend: Send report (all plans)
```
POST /report
X-Project-Key: {AUTOTEST_PROJECT_KEY}    ← required for all plans
Authorization: Bearer {AUTOTEST_TOKEN}   ← optional, only for Pro/Enterprise

{
  "branch": "main",
  "commit": "a1b2c3d",
  "developer": "john@company.com",
  "timestamp": "2024-01-15T10:30:00Z",
  "language": "python",
  "plan": "pro",
  "summary": {
    "functions_scanned": 4,
    "tests_generated": 4,
    "tests_passed": 3,
    "tests_failed": 1,
    "coverage_percent": 75
  },
  "functions": [
    {
      "name": "calculate_discount",
      "file": "utils.py",
      "line": 12,
      "status": "passed",
      "tests_generated": 3,
      "tests_passed": 3,
      "test_code": "def test_calculate_discount_normal(): ..."
    }
  ]
}
```

### Backend → Dashboard: Project detail
```
GET /dashboard/:project_id
Authorization: Bearer {JWT}

{
  "project": {
    "name": "my-app",
    "plan": "pro",
    "quality_gate": "passed",
    "quality_gate_threshold": 80
  },
  "coverage": {
    "current": 78,
    "previous": 71,
    "trend": "up",
    "history": [{ "date": "2024-01-10", "percent": 71 }, ...]
  },
  "recent_pushes": [
    {
      "developer": "john@company.com",
      "branch": "main",
      "commit": "a1b2c3d",
      "timestamp": "2024-01-15T10:30:00Z",
      "status": "passed",
      "coverage_percent": 78
    }
  ],
  "files": [
    { "name": "utils.py", "coverage": 45, "risk": "high" },
    { "name": "auth.py", "coverage": 92, "risk": "low" }
  ],
  "ai_suggestions": [
    "utils.py has 3 functions with no tests — add tests for validate_email()",
    "calculate_discount() missing edge case: negative price input"
  ]
}
```

---

## Database Schema

```sql
users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  plan TEXT DEFAULT 'free',              -- free | pro | enterprise
  stripe_customer_id TEXT,
  enterprise_api_key_encrypted TEXT,     -- enterprise only, AES encrypted
  created_at TIMESTAMPTZ DEFAULT NOW()
)

projects (
  id UUID PRIMARY KEY,
  owner_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  project_key TEXT UNIQUE NOT NULL,      -- CLI uses this to send reports
  quality_gate_threshold INT DEFAULT 80,
  created_at TIMESTAMPTZ DEFAULT NOW()
)

reports (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  branch TEXT,
  commit TEXT,
  developer TEXT,
  language TEXT,
  plan TEXT,                             -- which plan was active for this push
  coverage_percent INT,
  tests_passed INT,
  tests_failed INT,
  status TEXT,                           -- passed | failed
  pushed_at TIMESTAMPTZ DEFAULT NOW()
)

function_results (
  id UUID PRIMARY KEY,
  report_id UUID REFERENCES reports(id),
  name TEXT,
  file TEXT,
  line INT,
  status TEXT,                           -- passed | failed
  tests_generated INT,
  tests_passed INT,
  test_code TEXT
)

usage_records (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  month TEXT,                            -- "2024-01"
  tests_generated INT DEFAULT 0,
  ai_calls INT DEFAULT 0
)
```

---

## Environment Variables

### CLI (developer's machine)
```bash
# Free plan — at least one needed
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx
GEMINI_API_KEY=xxx

# All plans — identifies which project to send reports to
AUTOTEST_PROJECT_KEY=proj_abc123
AUTOTEST_API_URL=https://api.autotest.dev

# Pro/Enterprise — set automatically by: autotest login
# Stored in: ~/.autotest/config.json (never in project folder)
AUTOTEST_TOKEN=at_xxx
```

### Backend (.env)
```bash
DATABASE_URL=postgresql://...
JWT_SECRET=...
ANTHROPIC_API_KEY=sk-ant-xxx           # OUR key — Pro/Enterprise users only
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
ENCRYPTION_KEY=xxx                     # AES key for enterprise user API keys
ALLOWED_ORIGINS=https://autotest.dev
```

### Dashboard (.env.local)
```bash
NEXT_PUBLIC_API_URL=https://api.autotest.dev
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://autotest.dev
```

---

## Code Style Rules

### Python (CLI + Backend)
- Type hints on every function — no exceptions
- Pydantic v2 models for all request/response shapes in backend
- CLI: zero external dependencies — urllib, subprocess, re, json, os only
- Never bare `except:` — always catch specific exceptions
- Always return meaningful error messages with fix instructions for the user
- `snake_case` everywhere

### TypeScript (Dashboard)
- `"strict": true` in tsconfig always
- Functional components only — no class components
- `interface` over `type` for object shapes
- Every component handles three states: loading, error, empty
- All fetch calls go in `lib/api.ts` only — never fetch() inside components
- Run `npm run typecheck` before every commit

### General
- Never hardcode secrets — always environment variables
- Every function has a docstring (Python) or JSDoc comment (TypeScript)
- Max 30 lines per function — split if longer
- Never log API keys, tokens, or user source code

---

## Commands

### CLI Development
```bash
cd cli
pip install -e .
autotest --install          # install git hook
autotest --run              # manual run
autotest --run --lang js    # javascript
autotest login              # Pro login
autotest logout
autotest whoami             # shows plan + email
```

### Backend Development
```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload   # port 8000
```

### Dashboard Development
```bash
cd dashboard
npm install
npm run dev                 # port 3000
npm run typecheck           # before every commit
npm run build               # verify production build
```

---

## Build Order

Build in this exact sequence — each step depends on the previous:

1. **CLI: providers/** — base.py abstract class + anthropic.py + openai.py + gemini.py + ollama.py
2. **CLI: generator.py** — mode detection (free vs pro vs enterprise)
3. **CLI: auth.py + config.py** — `autotest login` command, token saved to ~/.autotest/config.json
4. **CLI: providers/autotest_backend.py** — calls our /generate-tests for Pro/Enterprise
5. **CLI: sender.py** — POST report after tests run
6. **Backend: core** — FastAPI app, database models, Alembic setup
7. **Backend: auth** — JWT login, project key generation
8. **Backend: plan_guard.py** — middleware blocks /generate-tests for free users
9. **Backend: generate.py** — /generate-tests endpoint (calls Claude with OUR key)
10. **Backend: reports.py** — POST /report endpoint
11. **Backend: dashboard.py** — GET endpoints for dashboard data
12. **Backend: billing.py** — Stripe integration, plan upgrades
13. **Dashboard: auth + layout** — login, nav, NextAuth
14. **Dashboard: overview page** — all projects, coverage cards, quality gates
15. **Dashboard: project detail** — trend chart, file table, function breakdown
16. **Dashboard: settings/plan** — upgrade flow, usage meter, PlanBadge
17. **Dashboard: settings/keys** — enterprise API key input (AES encrypted on save)
18. **Dashboard: AI suggestions** — backend calls Claude, returns tips to dashboard
19. **Polish** — loading, error, empty states everywhere

---

## Key Decisions — Never Change These

- **CLI zero dependencies** — urllib only, no pip installs in CLI package
- **Free users call AI directly** — their key, their bill, never hits our backend
- **Pro/Enterprise AI goes through backend** — our Anthropic key never leaves our server
- **Enterprise keys AES encrypted** — stored encrypted, never returned in any API response
- **Tests run in temp directory** — never create files in developer's project
- **Only changed functions scanned** — not full codebase, push stays fast
- **Network failures never block push** — if our API is down, push goes through anyway
- **All backend calls have 5s timeout** — push must never hang waiting for our server
- **AUTOTEST_TOKEN stored in ~/.autotest/config.json** — never in project folder or git

---

## What Claude Gets Wrong — Read Every Session

- Do NOT add pip dependencies to CLI — urllib only
- Do NOT call /generate-tests for free users — they use their own key directly
- Do NOT block push when our backend is unreachable — fail open, warn only
- Do NOT store AUTOTEST_TOKEN in the project directory — always ~/.autotest/config.json
- Do NOT return enterprise API keys in any API response — write-only field
- Do NOT run full pytest suite — only run the auto-generated test files
- Do NOT create test files inside the developer's project — use tempfile.mkdtemp()
- Do NOT assume pytest is installed — check first, show install instructions if missing
- Do NOT forget to increment usage_records on every Pro/Enterprise AI call
- UpgradeBanner shows ONLY to free plan users — hide for Pro and Enterprise
