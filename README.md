# Terminal Learning

> An open-source, free pedagogical platform for learning the terminal and the full developer workflow — from absolute beginners to autonomous full-stack developers who leverage AI as a tool.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=flat-square&logo=vercel)](https://terminal-learning.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald?style=flat-square)](LICENSE)
[![Built with Vite](https://img.shields.io/badge/Built%20with-Vite%206-646cff?style=flat-square&logo=vite)](https://vitejs.dev)
[![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)

---

## What is Terminal Learning?

**Terminal Learning** is a free, open-source web application that teaches beginners how to use the terminal through interactive practice. Instead of reading documentation, users type real commands in a sandboxed terminal emulator and learn by doing.

**Key differentiators:**
- No account required — start learning immediately
- Multi-environment: choose Linux, macOS, or Windows — commands, exercises and prompts adapt
- Terminal profiles: authentic prompt per env (`user@host:~$` / `➜ ~` / `PS C:\Users\user>`)
- Contextual help: `help <cmd>` returns targeted usage + examples for your environment
- Progress saved locally, optionally synced to the cloud with a free account
- Real terminal emulator with a simulated filesystem — 60+ commands, 30+ PowerShell aliases
- Progressive curriculum: 7 modules active → 11 planned (Network/SSH, Git, GitHub, AI as a dev tool)
- 100% free, forever — designed for schools and universities

🌐 **[Try it live →](https://terminal-learning.vercel.app)**

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Bundler** | Vite | 6.x |
| **UI Framework** | React | 18.x |
| **Routing** | React Router | 7.x |
| **Styling** | Tailwind CSS | 4.x |
| **Components** | shadcn/ui (Radix UI) | latest |
| **Animations** | Motion (Framer Motion) | 12.x |
| **Auth & Database** | Supabase (PostgreSQL + RLS) | 2.x |
| **Error Tracking** | Sentry (free tier) | 8.x |
| **Icons** | Lucide React | 0.487 |
| **Tests** | Vitest + Testing Library | — |
| **Design Origin** | Figma Make + Claude Code | — |
| **Deployment** | Vercel (free tier) | — |

---

## Architecture

```
src/
├── lib/
│   ├── supabase.ts               # Typed Supabase client (null-safe, fallback to localStorage)
│   └── sentry.ts                 # Sentry init + error boundary
├── app/
│   ├── App.tsx                   # Root: ErrorBoundary > AuthProvider > ProgressProvider
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginModal.tsx    # Email/password + OAuth modal (Zod validation)
│   │   │   ├── UserMenu.tsx      # Avatar + sync status badge + logout
│   │   │   └── AuthCallback.tsx  # /auth/callback PKCE handler
│   │   ├── Landing.tsx           # Public landing page (/)
│   │   ├── Layout.tsx            # App shell with sidebar (/app)
│   │   ├── Sidebar.tsx           # Navigation sidebar
│   │   ├── Dashboard.tsx         # Progress dashboard
│   │   ├── LessonPage.tsx        # Individual lesson view
│   │   ├── TerminalEmulator.tsx  # Interactive terminal
│   │   ├── CommandReference.tsx  # Command reference sheet
│   │   ├── PrivacyPolicy.tsx     # GDPR compliance (/privacy)
│   │   ├── NotFound.tsx          # 404 page
│   │   └── ui/                   # shadcn/ui component library
│   ├── context/
│   │   ├── AuthContext.tsx       # Session, user, signOut
│   │   └── ProgressContext.tsx   # Progress state (local + Supabase sync)
│   ├── lib/
│   │   └── progressSync.ts       # mergeProgress() + getDelta() utilities
│   ├── types/
│   │   └── database.ts           # Supabase DB types
│   ├── data/
│   │   ├── curriculum.ts         # All lessons and modules content
│   │   └── terminalEngine.ts     # Terminal command interpreter
│   └── routes.ts                 # React Router configuration
├── styles/
│   ├── theme.css                 # Design tokens (colors, radius)
│   ├── fonts.css                 # JetBrains Mono + Inter
│   └── tailwind.css              # Tailwind configuration
public/
├── logo.svg                      # App logo (>_ terminal mark)
├── favicon.svg                   # Favicon
├── og-image.png                  # OpenGraph image (1200x630)
└── robots.txt                    # SEO crawl rules
vercel.json                       # SPA routing + security headers (CSP)
```

Full architecture details in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Multi-Agent Development Architecture

This project is developed using a **multi-agent AI workflow** with Claude Code as the primary assistant:

```
┌─────────────────────────────────────────────┐
│         ORCHESTRATOR AGENT                  │
│   Coordinates, validates, integrates        │
└──────┬──────────┬─────────────┬─────────────┘
       │          │             │
  ┌────▼───┐ ┌───▼────┐ ┌─────▼──────┐
  │FRONTEND│ │SECURITY│ │HACKER BLACK│
  │ Agent  │ │ Agent  │ │   Agent    │
  └────────┘ └────────┘ └────────────┘
                  └──────────┬──────────┘
              ┌──────────────▼──────────┐
              │     QA / TEST Agent     │
              │  Vitest + Playwright    │
              └─────────────────────────┘
```

- **FRONTEND** — UI components, animations, design system
- **SECURITY** — OWASP headers, CSP, rate limiting, dependency audit
- **HACKER BLACK** — Offensive security testing (XSS, CSRF, rate limit bypass)
- **QA** — Unit tests (Vitest), E2E tests (Playwright)

---

## Security

Security is built into every layer from day one:

- **HTTP Headers** — `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy` via `vercel.json`
- **Content Security Policy** — strict CSP, no `unsafe-eval`
- **Auth** — Supabase Auth with PKCE flow, JWT rotation, rate limiting
- **Database** — Row Level Security (RLS) on all tables, anon key only client-side
- **No secrets client-side** — environment variables only
- **GDPR compliant** — cookieless analytics, privacy page at `/privacy`
- **Dependency auditing** — `npm audit` in CI + GitHub Dependabot

See [SECURITY.md](SECURITY.md) for the full security policy and vulnerability reporting process.

---

## Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| **Phase 0** | ✅ Done | Initial deployment on Vercel |
| **Phase 1** | ✅ Done | Landing page, routing, SEO/OpenGraph, GDPR |
| **Phase 2** | ✅ Done | Vercel Analytics + Sentry error monitoring |
| **Phase 3** | ✅ Done | Supabase Auth + user progress sync |
| **Phase 4** | ✅ Done | Curriculum v2 + multi-environment selection + terminal profiles (192 tests) |
| **Phase 5** | 🔄 In progress | Curriculum expansion: Module 7 ✅, modules 4–6 enriched ✅, 238 tests, 32 lessons |
| **Phase 6** | 🔮 Planned | Terminal multi-session (tabs) + changelog |
| **Phase 7** | 🔮 Planned | Admin panel — RBAC, 2FA, audit log |

Full details in [docs/ROADMAP.md](docs/ROADMAP.md) and [docs/plan.md](docs/plan.md).

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
git clone https://github.com/thierryvm/TerminalLearning.git
cd TerminalLearning
npm install
cp .env.example .env.local   # fill in VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

```bash
npm run build        # Production build → dist/
```

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a pull request.

Development workflow and repository rules are documented in [docs/CONVENTIONS.md](./docs/CONVENTIONS.md).

- Fork the repository
- Create a feature branch: `git checkout -b feature/my-feature`
- Commit with conventional commits: `feat(scope): description`
- Push and open a pull request

---

## Support the Project

Terminal Learning is free and will always remain free. If it helped you, consider supporting development:

- ⭐ **Star the repo** — helps visibility
- 💜 **[GitHub Sponsors](https://github.com/sponsors/thierryvm)** — recurring support *(activation pending)*
- ☕ **[Ko-fi](https://ko-fi.com/thierryvm)** — one-time coffee *(activation pending)*

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Acknowledgments

- UI components from [shadcn/ui](https://ui.shadcn.com/) (MIT)
- Initial design created with [Figma Make](https://www.figma.com/make/)
- Developed with [Claude Code](https://claude.com/claude-code) (Anthropic)
- Icons by [Lucide](https://lucide.dev/)

---

<p align="center">
  Made with ♥ in Belgium &nbsp;·&nbsp;
  <a href="https://terminal-learning.vercel.app">Live Demo</a> &nbsp;·&nbsp;
  <a href="https://github.com/thierryvm/TerminalLearning/issues">Report a Bug</a>
</p>
