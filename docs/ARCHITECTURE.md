# Architecture — Terminal Learning

> Last updated: 9 April 2026

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
│   │   ├── Layout.tsx            # /app shell + sidebar
│   │   ├── Dashboard.tsx         # Progress overview
│   │   ├── LessonPage.tsx        # Lesson content + exercises
│   │   ├── TerminalEmulator.tsx  # Interactive terminal
│   │   ├── CommandReference.tsx  # Command cheat sheet
│   │   ├── PrivacyPolicy.tsx     # GDPR policy page
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
│   ├── terminalEngine.test.ts    # Terminal command tests (238 total)
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
┌──────────────────────────────────────────┐
│           ORCHESTRATOR AGENT             │
│  Coordinates, validates, merges          │
└──────┬──────────┬────────────┬───────────┘
       │          │            │
  ┌────▼───┐ ┌───▼────┐ ┌────▼───────┐
  │FRONTEND│ │SECURITY│ │HACKER BLACK│
  │ Agent  │ │ Agent  │ │   Agent    │
  └────────┘ └────────┘ └────────────┘
                              │
              ┌───────────────▼──────────┐
              │      QA / TEST Agent     │
              │  Vitest + Playwright     │
              └──────────────────────────┘
```

## Roadmap

| Phase | Status | Scope |
|-------|--------|-------|
| 0 | ✅ | Build, Vercel config, CI/CD |
| 1 | ✅ | Landing, routing, GDPR, SEO, CI |
| 2 | ✅ | Vercel Analytics + Sentry |
| 3 | ✅ | Supabase Auth + progress persistence |
| 4 | ✅ | Curriculum v2 + multi-environment + terminal profiles (192 tests) |
| 5 | 🔄 | Curriculum expansion — Module 7 ✅, Network/SSH, Git, GitHub, AI (238 tests) |
| 6 | 🔮 | Terminal multi-session (tabs) + changelog |
| 7 | 🔮 | Admin panel (RBAC, audit log, 2FA) |
