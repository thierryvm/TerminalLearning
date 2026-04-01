# Contributing to Terminal Learning

Thank you for your interest in contributing! This is a volunteer, open source project.

## Getting Started

```bash
git clone https://github.com/thierryvm/TerminalLearning.git
cd TerminalLearning
npm install
npm run dev
```

## Development Workflow

- **Branch**: always branch from `main` → `feature/your-feature` or `fix/your-fix`
- **Quality gates** (must pass before committing):
  ```bash
  npm run type-check
  npm run lint
  npm run test
  npm run build
  ```
- **Commits**: follow [Conventional Commits](https://www.conventionalcommits.org/)
  ```
  feat(scope): description
  fix(scope): description
  docs(scope): description
  test(scope): description
  ```

## Pull Requests

1. Open a PR against `main`
2. Describe what you changed and why
3. All CI checks must pass (type-check, lint, tests, build)
4. One reviewer approval required

## Adding Terminal Commands

New commands go in `src/app/data/terminalEngine.ts` inside the `executeCommand` switch.
Each command must:
- Have a corresponding test in `src/test/terminalEngine.test.ts`
- Return `{ lines, newState }` matching the `CommandResult` type
- Not use `dangerouslySetInnerHTML` or eval-like constructs

## Adding Lessons

Lessons are defined in `src/app/data/curriculum.ts`. Each lesson needs:
- A unique `id` (slug format)
- `title`, `description`, `content` (Markdown)
- `exercises` array (at least one)

## Code Style

- TypeScript strict mode — no `any`
- Tailwind CSS utility classes — no inline styles
- Components in `src/app/components/`, data in `src/app/data/`
- No `dangerouslySetInnerHTML`

## Reporting Issues

Use [GitHub Issues](https://github.com/thierryvm/TerminalLearning/issues). For security vulnerabilities, see [SECURITY.md](./SECURITY.md).

## License

By contributing, you agree your code is released under the [MIT License](./LICENSE).
