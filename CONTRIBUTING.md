# Contributing to Terminal Learning

Thank you for your interest in contributing! Volunteer, open source, 100% free.

## Getting Started

```bash
git clone https://github.com/thierryvm/TerminalLearning.git
cd TerminalLearning
npm install
cp .env.example .env.local   # fill in VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev
```

**Env vars** (see `.env.example`):
- `VITE_SUPABASE_URL` — Supabase dashboard → Settings → API
- `VITE_SUPABASE_ANON_KEY` — same location (public anon key, safe for client)
- `VITE_SENTRY_DSN` — optional, Sentry project DSN

## Quality Gates (must pass before every commit)

```bash
npm run type-check   # zero TypeScript errors
npm run lint         # zero ESLint errors
npm run test         # all tests pass
npm run build        # production build succeeds
```

## Development Workflow

- Branch from `main` → `feature/THI-XX-description` or `fix/THI-XX-description`
- Follow [Conventional Commits](https://www.conventionalcommits.org/)
- Open a PR — CI must pass before merge

See [docs/CONVENTIONS.md](docs/CONVENTIONS.md) for full branch/commit/PR conventions.

## Critical Files — Touch With Care

| File | Risk |
|------|------|
| `src/app/data/curriculum.ts` | Modifying breaks tests + user progress |
| `src/app/context/ProgressContext.tsx` | Bug = data loss for users |
| `src/app/data/terminalEngine.ts` | Each new command needs a test |
| `vercel.json` | Loosening CSP is a security regression |

## Adding Terminal Commands

New commands go in `src/app/data/terminalEngine.ts` inside `executeCommand`.
Each command **must** have a test in `src/test/terminalEngine.test.ts`.

## Adding Lessons

Lessons live in `src/app/data/curriculum.ts`. Each lesson needs:
- A unique `id` (slug), `title`, `description`, `blocks` (content), optional `exercise`

## Auth-Gated Features (Phase 3+)

Use `useAuth()` from `src/app/context/AuthContext.tsx` to access session/user.
Use `useProgress()` from `src/app/context/ProgressContext.tsx` for synced progress.

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for source structure, data flow, and DB schema.

## Reporting Issues

[GitHub Issues](https://github.com/thierryvm/TerminalLearning/issues) for bugs.
For security vulnerabilities → [SECURITY.md](SECURITY.md).

## License

By contributing, your code is released under the [MIT License](LICENSE).
