# Architecture — Terminal Learning

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + Vite 6 |
| Routing | React Router v7 |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Animations | Motion (Framer Motion) |
| State | React Context (ProgressContext) |
| Tests | Vitest + Testing Library |
| CI/CD | GitHub Actions → Vercel |

## Route Structure

```
/              → Landing.tsx        (public landing page)
/privacy       → PrivacyPolicy.tsx  (GDPR compliance)
/app           → Layout.tsx         (app shell)
/app/          → Dashboard.tsx      (progress overview)
/app/learn/:moduleId/:lessonId → LessonPage.tsx
/app/reference → CommandReference.tsx
*              → NotFound.tsx       (404)
```

Backward-compatible redirects from pre-v1 routes are handled in `routes.ts`.

## Data Flow

```
curriculum.ts          terminalEngine.ts
     │                       │
     ▼                       ▼
LessonPage.tsx      TerminalEmulator.tsx
     │                       │
     └──────────┬────────────┘
                ▼
         ProgressContext.tsx  (shared state via React Context)
                │
                ▼
         localStorage  (persisted client-side, no server)
```

## Key Files

```
src/
├── app/
│   ├── components/
│   │   ├── Landing.tsx          # Public landing page
│   │   ├── Layout.tsx           # /app shell + sidebar
│   │   ├── Dashboard.tsx        # Progress overview
│   │   ├── LessonPage.tsx       # Lesson + exercises
│   │   ├── TerminalEmulator.tsx # Interactive terminal
│   │   ├── CommandReference.tsx # Command cheat sheet
│   │   ├── PrivacyPolicy.tsx    # GDPR policy page
│   │   └── NotFound.tsx         # 404 page
│   ├── context/
│   │   └── ProgressContext.tsx  # Global progress state
│   ├── data/
│   │   ├── curriculum.ts        # All modules + lessons
│   │   └── terminalEngine.ts    # Terminal command interpreter
│   ├── hooks/
│   │   └── useProgress.ts       # Progress read/write hook
│   └── routes.ts                # React Router configuration
├── test/
│   ├── setup.ts
│   └── terminalEngine.test.ts
└── main.tsx
```

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

- **Frontend**: Landing, routing, components, design system, animations
- **Security**: CSP headers, input validation, dependency audits, OWASP
- **Hacker Black**: Offensive testing (XSS, CSRF, rate-limit bypass patterns)
- **QA**: Unit tests (Vitest), E2E (Playwright, planned Phase 2)

## Security Architecture

| Mechanism | Implementation |
|-----------|---------------|
| CSP / Security Headers | `vercel.json` |
| Input sanitization | Terminal engine — no eval, no innerHTML |
| No client secrets | Zero API keys in frontend code |
| Dependency audit | `npm audit` in CI on every push |
| GDPR | localStorage only, no external tracking |

## Roadmap

| Phase | Status | Scope |
|-------|--------|-------|
| 0 | ✅ | Build validation, Vercel config, CI/CD |
| 1 | ✅ | Landing, routing, GDPR, SEO, new commands |
| 2 | 🔜 | Vercel Analytics + Sentry |
| 3 | 🔮 | Supabase Auth + progress persistence |
| 4 | 🔮 | Admin panel (RBAC, audit log, 2FA) |
