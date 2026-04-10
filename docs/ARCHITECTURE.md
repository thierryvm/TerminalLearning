# Architecture — Terminal Learning

> Last updated: 10 April 2026

## Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | React 18 + Vite 6 | SPA, no SSR |
| Routing | React Router v7 | Hash-free, SPA rewrites via Vercel |
| Styling | Tailwind CSS v4 + shadcn/ui | Design tokens in `docs/GUIDELINES.md` |
| Animations | Motion (Framer Motion) | 150–300ms micro-interactions |
| Auth | Supabase Auth | Email + GitHub OAuth + Google OAuth (PKCE) |
| Database | Supabase PostgreSQL + RLS | Phase 3 — `eu-west-1` |
| State | React Context | ProgressContext (hybrid local/remote) |
| Error tracking | Sentry (free tier) | Frontend only |
| Analytics | Vercel Analytics | GDPR-compliant, cookieless |
| Tests | Vitest + Testing Library | Unit + integration |
| CI/CD | GitHub Actions → Vercel | lint → type-check → test → build → deploy |

## Route Structure

```
/                        → Landing.tsx          (public, SEO)
/privacy                 → PrivacyPolicy.tsx     (GDPR)
/auth/callback           → AuthCallback.tsx      (OAuth PKCE exchange)
/app                     → Layout.tsx            (app shell)
/app/                    → Dashboard.tsx         (progress overview)
/app/learn/:id/:lessonId → LessonPage.tsx        (lesson + terminal)
/app/reference           → CommandReference.tsx  (command cheat sheet)
*                        → NotFound.tsx          (404)
```

Backward-compatible redirects from pre-v1 routes (`/learn/...`, `/reference`) are handled in `routes.ts`.

## Source Structure

```
src/
├── lib/                          # Infrastructure / external service clients
│   ├── supabase.ts               # Typed Supabase client (null-safe)
│   └── sentry.ts                 # Sentry init + error boundary
├── app/
│   ├── App.tsx                   # Root: ErrorBoundary > AuthProvider > ProgressProvider
│   ├── routes.ts                 # React Router config
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginModal.tsx    # Email + OAuth modal (Zod validation)
│   │   │   ├── UserMenu.tsx      # Avatar + sync status + logout
│   │   │   └── AuthCallback.tsx  # /auth/callback PKCE handler
│   │   ├── ui/                   # shadcn/ui primitives (generated)
│   │   ├── figma/                # Figma Make–generated assets
│   │   ├── Landing.tsx           # Public landing page
│   │   ├── Layout.tsx            # /app shell + sidebar (eager — not lazy)
│   │   ├── Dashboard.tsx         # Progress overview
│   │   ├── LessonPage.tsx        # Lesson content + exercises
│   │   ├── TerminalEmulator.tsx  # Interactive terminal
│   │   ├── CommandReference.tsx  # Command cheat sheet
│   │   ├── PrivacyPolicy.tsx     # GDPR policy page
│   │   ├── PageLoader.tsx        # Accessible spinner — Suspense fallback for lazy routes
│   │   └── NotFound.tsx          # 404 page
│   ├── context/
│   │   ├── AuthContext.tsx       # Session, user, signOut
│   │   ├── ProgressContext.tsx   # Progress state (local + Supabase sync)
│   │   └── EnvironmentContext.tsx # Selected env (linux/macos/windows) + persistence
│   ├── lib/
│   │   └── progressSync.ts       # mergeProgress() + getDelta() utilities
│   ├── types/
│   │   ├── curriculum.ts         # ENVIRONMENTS, LEVELS, ROADMAP_PRIORITIES, EnvId
│   │   └── database.ts           # Supabase DB types (Phases 3+)
│   ├── data/
│   │   ├── curriculum.ts         # ⚠️ Critical — all modules + lessons (32 lessons, 7 modules)
│   │   ├── terminalEngine.ts     # Terminal command interpreter (60+ commands, env-aware)
│   │   └── commandCatalogue.ts   # Command catalogue with level + prerequisites metadata
│   └── hooks/                    # Custom hooks (currently empty)
├── test/
│   ├── setup.ts
│   ├── progress.test.tsx         # ProgressContext tests
│   ├── progressSync.test.ts      # mergeProgress + getDelta (10 tests)
│   ├── terminalEngine.test.ts    # Terminal command tests (242 total)
│   ├── curriculumTypes.test.ts   # Curriculum structure + catalogue consistency
│   ├── unlocking.test.ts         # Module unlock / prerequisite logic
│   └── landing.test.tsx          # Landing page module cards
├── styles/
│   ├── index.css                 # Entry CSS
│   ├── tailwind.css              # Tailwind directives
│   ├── theme.css                 # CSS custom properties (design tokens)
│   └── fonts.css                 # JetBrains Mono + Inter via Google Fonts
└── main.tsx                      # App entry point
```

## Data Flow

```
curriculum.ts          terminalEngine.ts      commandCatalogue.ts
     │                       │                       │
     ▼                       ▼                       ▼
LessonPage.tsx      TerminalEmulator.tsx    CommandReference.tsx
     │                       │                       │
     └──────────┬────────────┘               EnvironmentContext.tsx
                ▼                                    │
         ProgressContext.tsx   ← AuthContext.tsx      │
                │                     │              │
                ├── localStorage       └── Supabase  └── localStorage
                │   (offline cache)       Auth           (selected env)
                └── Supabase DB        ← progressSync.ts
                    (source of truth       (mergeProgress, getDelta)
                     when connected)
```

**Merge strategy** (Phase 3): completed lessons are never downgraded — `local ∨ remote`.  
**Sync status**: `'local' | 'syncing' | 'synced' | 'error'` exposed via `useProgress().syncStatus`.  
**Environment**: `'linux' | 'macos' | 'windows'` — persisted in localStorage, propagated via `useEnvironment()`.  
Content blocks, command help, and reference entries all resolve env-specific variants at render time via `contentByEnv?.[env] ?? content` fallback pattern.

## Database Schema (Supabase — Phase 3)

```sql
-- profiles: extends auth.users
profiles (id uuid PK, username text UNIQUE, created_at timestamptz)

-- progress: lesson completion records
progress (user_id uuid FK, lesson_id text, completed bool,
          completed_at timestamptz, score int 0-100)
          PK: (user_id, lesson_id)
```

RLS policies: users can only read/write their own rows. See `supabase/migrations/001_init.sql`.

## Security Architecture

| Mechanism | Implementation |
|-----------|---------------|
| CSP / Security headers | `vercel.json` |
| Auth | Supabase Auth — PKCE flow, no implicit flow |
| JWT | Access 1h + refresh 7d + auto-rotation |
| RLS | Enabled on all Supabase tables |
| Input validation | Zod on all user inputs (LoginModal + terminal) |
| No client secrets | Zero API keys in frontend — anon key only |
| Rate limiting | Supabase Auth built-in (5 attempts → lockout) |
| Dependency audit | `npm audit` in CI on every push |
| GDPR | Cookieless analytics, privacy page at `/privacy` |

## Multi-Agent Development Model

```
┌──────────────────────────────────────────────────┐
│              ORCHESTRATOR AGENT                  │
│  Thierry (decision) + Claude Code (coordination) │
│  → map, plan, validate, merge, PR                │
└──────┬──────────┬────────────┬────────────┬──────┘
       │          │            │            │
  ┌────▼───┐ ┌───▼─────┐ ┌───▼────┐ ┌─────▼──────┐
  │FRONTEND│ │BACKEND  │ │SECURITY│ │CURRICULUM  │
  │ Agent  │ │Supabase │ │ Agent  │ │  Agent     │
  │        │ │ Agent   │ │ + TS ↓ │ │            │
  └────────┘ └─────────┘ └────────┘ └────────────┘
       │           │          │            │
       └───────────┴──────────┴────────────┘
                          │
              ┌───────────▼──────────────┐
              │      QA / TEST Agent     │
              │  Vitest + Playwright     │
              │  Lighthouse CI           │
              └──────────────────────────┘

TS = Terminal Sentinel — periodic security audit feeding Security Center (Phase 9)
```

| Agent | Responsibility |
|-------|---------------|
| Orchestrator | Plan, coordination, review, merge |
| Frontend | UI/UX, components, design tokens, charts |
| Backend/Supabase | SQL schema, RLS, Edge Functions, migrations |
| Security | OWASP audit, CSP, RLS review, Terminal Sentinel |
| Curriculum | Lessons, exercises, command catalogue |
| QA | Vitest unit tests, Playwright E2E, Lighthouse |

## Database Schema

**Phase 3 (live):**
```sql
profiles (id uuid PK, username text UNIQUE, created_at timestamptz)
progress (user_id uuid FK, lesson_id text, completed bool,
          completed_at timestamptz, score int 0-100) PK: (user_id, lesson_id)
```

**Phase 7 (planned — RBAC):**
```sql
institutions (id, name, domain_whitelist[], admin_id)
classes (id, teacher_id, institution_id, name)
class_enrollments (class_id, student_id)  -- PK composite
-- profiles extensions: role, institution_id, display_name, preferred_env
-- progress extensions: time_spent_seconds, attempts_count, hints_used
badges (user_id, badge_id, earned_at)
teacher_notes (id, teacher_id, student_id, note)
audit_log (id, actor_id, action, target_id, metadata jsonb, ip_address, created_at)
-- insert-only — RLS: SELECT for super_admin only
```

**Phase 9 (planned — Terminal Sentinel):**
```sql
security_reports (id, run_at, score int, findings jsonb, component text)
```

## Roadmap

| Phase | Status | Scope |
|-------|--------|-------|
| 0 | ✅ | Build, Vercel config, CI/CD |
| 1 | ✅ | Landing, routing, GDPR, SEO, CI |
| 2 | ✅ | Vercel Analytics + Sentry |
| 3 | ✅ | Supabase Auth + progress persistence |
| 4 | ✅ | Curriculum v2 + multi-environment + terminal profiles (192 tests) |
| 5 | 🔄 | Curriculum expansion — 7 modules, 32 lessons, 242 unit + 176 E2E tests |
| 5.5 | 🔮 | Terminal Sentinel — automated security audit (THI-36) |
| 6 | 🔮 | Terminal multi-session (tabs) + changelog |
| 7 | 🔮 | Full RBAC — student/teacher/institution/admin + approval flow (THI-37) |
| 8 | 🔮 | Ticket system — in-app bug reports + suggestions |
| 9 | 🔮 | Admin Panel — 7 sections, Security Center fed by Terminal Sentinel |
| 10 | 🔮 | Automated content scheduler (new commands every 2 weeks) |
| Final | 🔮 | PWA advanced — installable, offline, push notifications |
