# Terminal Learning

> An interactive web application for learning terminal commands — built with modern AI-assisted development practices.

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
- Progress saved locally in the browser (no server, no tracking)
- Real terminal emulator with a simulated filesystem
- 6 progressive modules from navigation to advanced redirection
- 100% free, forever

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
| **Icons** | Lucide React | 0.487 |
| **Design Origin** | Figma Make + Claude Code | — |
| **Deployment** | Vercel (free tier) | — |

---

## Architecture

```
src/
├── app/
│   ├── components/
│   │   ├── Landing.tsx          # Public landing page (/)
│   │   ├── Layout.tsx           # App shell with sidebar (/app)
│   │   ├── Dashboard.tsx        # Progress dashboard
│   │   ├── LessonPage.tsx       # Individual lesson view
│   │   ├── TerminalEmulator.tsx # Interactive terminal
│   │   ├── CommandReference.tsx # Command reference sheet
│   │   ├── PrivacyPolicy.tsx    # GDPR compliance (/privacy)
│   │   └── ui/                  # shadcn/ui component library
│   ├── data/
│   │   ├── curriculum.ts        # All lessons and modules content
│   │   └── terminalEngine.ts    # Terminal command interpreter
│   ├── hooks/
│   │   └── useProgress.ts       # Learning progress state
│   └── routes.ts                # React Router configuration
├── styles/
│   ├── theme.css                # Design tokens (colors, radius)
│   ├── fonts.css                # JetBrains Mono + Inter
│   └── tailwind.css             # Tailwind configuration
public/
├── logo.svg                     # App logo (>_ terminal mark)
├── favicon.svg                  # Favicon
└── robots.txt                   # SEO crawl rules
vercel.json                      # SPA routing + security headers
```

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
- **No secrets client-side** — environment variables only
- **GDPR compliant** — no personal data collected, local-only storage
- **Dependency auditing** — `npm audit` + GitHub Dependabot
- **Planned** — 2FA admin panel, Supabase RLS, rate limiting, HACKER BLACK offensive tests

See [SECURITY.md](SECURITY.md) for the full security policy and vulnerability reporting process.

---

## Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| **Phase 0** | ✅ Live | Initial deployment on Vercel |
| **Phase 1** | 🔄 In progress | Landing page, `/app` routing, SEO/OpenGraph, GDPR |
| **Phase 2** | 🔜 Planned | Vercel Analytics (GDPR-friendly) + Sentry error monitoring |
| **Phase 3** | 🔮 Future | Supabase Auth + user progress sync + streaks/badges |
| **Phase 4** | 🔮 Future | Hyper-secure admin panel — analytics, health monitoring, security center, framework update alerts |

Full details in [plan.md](plan.md).

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

- Fork the repository
- Create a feature branch: `git checkout -b feature/my-feature`
- Commit with conventional commits: `feat(scope): description`
- Push and open a pull request

---

## Support the Project

Terminal Learning is free and will always remain free. If it helped you, consider supporting development:

- ⭐ **Star the repo** — helps visibility
- 💜 **[GitHub Sponsors](https://github.com/sponsors/thierryvm)** — recurring support
- ☕ **Ko-fi** — one-time coffee *(link coming soon)*

Every contribution helps cover hosting costs and development time.

---

## License

MIT License — see [LICENSE](LICENSE) for details.

This means you can use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the software freely. Attribution appreciated but not required.

---

## Acknowledgments

- UI components from [shadcn/ui](https://ui.shadcn.com/) (MIT)
- Initial design created with [Figma Make](https://www.figma.com/make/)
- Developed with [Claude Code](https://claude.ai/code) (Anthropic)
- Icons by [Lucide](https://lucide.dev/)

---

<p align="center">
  Made with ♥ in Belgium &nbsp;·&nbsp;
  <a href="https://terminal-learning.vercel.app">Live Demo</a> &nbsp;·&nbsp;
  <a href="https://github.com/thierryvm/TerminalLearning/issues">Report a Bug</a>
</p>
