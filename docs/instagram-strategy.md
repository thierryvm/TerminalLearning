# Instagram Strategy — Terminal Learning

> Version: 1.0 — 7 April 2026
> Account: [@terminallearning](https://www.instagram.com/terminallearning/)
> Status: Draft — pending validation

---

## 1. Core Principle

Every post comes from the **real product**. No invented marketing content.
Only show what exists. Clearly mark what's in progress or planned.

---

## 2. Product Truth (as of April 2026)

### Available now

| Module             | Color     | Lessons                                    |
| ------------------ | --------- | ------------------------------------------ |
| Navigation         | `#22c55e` | pwd, ls, ls -la, cd                        |
| Fichiers & Dossiers| `#3b82f6` | mkdir, touch, cp, mv, rm                   |
| Lecture de fichiers | `#a855f7` | cat, head/tail, grep, wc                   |
| Permissions        | `#f59e0b` | comprendre-permissions, chmod              |
| Processus          |           | ps, kill                                   |
| Redirection        |           | redirection-sortie, pipes                  |

- Supabase Auth (email + OAuth GitHub + Google)
- User progress saved and synced
- Interactive exercises per lesson
- Dark premium theme with glow effects
- Fully free and open source

### NOT available yet — do not present as ready

- Multi-environment support (Linux/macOS/Windows switching)
- Gamification system (badges, XP, streaks)
- Story/narrative mode
- Admin panel
- Advanced modules (Git, SSH, Docker, shell scripting)

---

## 3. Content Pillars

| #  | Pillar                | Description                                       | Frequency   |
| -- | --------------------- | ------------------------------------------------- | ----------- |
| 1  | Useful command        | One command explained clearly with example         | 1-2x/week   |
| 2  | Terminal tip / trick  | Shortcut, alias, or lesser-known behavior          | 1x/week     |
| 3  | Common mistake        | What beginners get wrong + how to fix it           | 1x/week     |
| 4  | Product mini demo     | Screen recording of a real lesson or feature       | 1x/week     |
| 5  | Build in public       | Roadmap update, new feature, behind the scenes     | 1x/week     |

Bonus (lower frequency):
- Multi-environment differences (when relevant to a command)
- Learning progression: what unlocks after mastering a concept

---

## 4. Formats

| Format       | Use case                    | Priority |
| ------------ | --------------------------- | -------- |
| Carousel     | Pedagogy (commands, errors) | Primary  |
| Short reel   | Product demos (15-30s)      | Primary  |
| Simple post  | Announcements, roadmap      | Regular  |
| Story        | Polls, behind the scenes    | Bonus    |

### Carousel structure
- Slide 1: Hook (question or bold statement)
- Slides 2-5: Content (one idea per slide)
- Final slide: CTA

### Reel structure
- 15-30 seconds max
- Screen recording from Terminal Learning
- Subtitles mandatory
- Lo-fi or ambient music

---

## 5. Cadence

| Level   | Posts/week | Breakdown                                            |
| ------- | ---------- | ---------------------------------------------------- |
| Minimum | 3          | 1 pedagogy + 1 tip/error + 1 product/build in public |
| Target  | 3-4        | Add 1 carousel or reel when time allows               |
| Maximum | 5          | Do not exceed — quality over quantity                  |

Stories: only when there's something to show. No obligation.

---

## 6. Weekly Workflow (~1h30 total)

| Step | Action                                                         | Time   |
| ---- | -------------------------------------------------------------- | ------ |
| 1    | **Collect**: note real changes from the week (commits, lessons, fixes) | 15 min |
| 2    | **Choose**: pick 3 ideas that are useful for beginners         | 10 min |
| 3    | **Draft**: write text + structure visuals for 3 posts          | 35 min |
| 4    | **Validate**: check technical accuracy, branding, product truth | 15 min |
| 5    | **Publish**: schedule or post (1 every ~2 days)                | 15 min |

---

## 7. Tone & Voice

### Do
- Technical but accessible — like a dev colleague explaining to a friend who's starting out
- Honest about product state
- Motivating without exaggeration
- Clear, human, professional

### Don't
- Arrogant, aggressive, or condescending
- Corporate-speak or influencer parody
- Fake urgency or growth hacking language
- Empty motivation posts without real content

---

## 8. CTA Rules

### Allowed
- "Try it free → terminal-learning.vercel.app"
- "Save this for later"
- "Tag someone who's learning terminal"
- "The project is free and open source — link in bio"
- "Want to support? Ko-fi link in bio" *(only when donations are enabled)*

### Forbidden
- Guilt-tripping ("If you don't follow you'll miss out")
- Aggressive ("Like or stay a beginner forever")
- Repetitive money-focused CTAs
- Any CTA that manipulates rather than invites

---

## 9. Multi-Environment Rule

When a command differs across Linux / macOS / Windows:
- State which environment the example uses
- Show the variant if simple (e.g., `ls` vs `dir`)
- Never imply all environments work identically
- Never make it look like 3 separate products — one platform, adapted per env

When it's identical across environments: no need to mention it.

---

## 10. Pedagogical Priority

Content should follow the curriculum progression. Prioritize in this order:

**Tier 1 — Fundamentals (communicate first)**
- Navigation (pwd, ls, cd)
- Files & Folders (mkdir, touch, cp, mv, rm)
- Reading files (cat, head, tail, grep, wc)

**Tier 2 — Daily use**
- Permissions (chmod)
- Processes (ps, kill)
- Pipes & redirections

**Tier 3 — Intermediate (later)**
- Network, variables, editors, archives, package management

**Tier 4 — Advanced (much later)**
- Git, shell scripting, SSH/VPS, Docker

Don't over-communicate advanced topics early — protect the beginner positioning.

---

## 11. Guardrails

- [ ] Every post references a real feature, lesson, or command from the live product
- [ ] No feature presented as available unless it's deployed
- [ ] Distinguish: available now / in progress / planned
- [ ] One concept per post — no overloading
- [ ] No generic motivational content detached from the product
- [ ] No content created "in the void" — always sourced from real work
- [ ] Visual identity preserved: dark theme, glow, module colors, terminal aesthetic

---

## 12. Content Ideas Bank

### Posts (5)
1. **"pwd — Your compass in the terminal"** — Product screenshot + 3-line explanation
2. **"rm -rf / — Why you should NEVER type this"** — Carousel: the command → what it does → what to do instead
3. **"April 2026 roadmap — What's coming"** — Build in public with visual checklist
4. **"chmod 755 vs 644 — The difference in 30 seconds"** — Permission decomposition diagram (from curriculum)
5. **"Terminal Learning is free and open source — here's why"** — Values/positioning post

### Reels (3)
1. **"Navigate the terminal in 15 seconds"** — Screencast: pwd → ls → cd → pwd
2. **"Before / After Terminal Learning"** — Split screen: lost vs. confident
3. **"Create a project folder in 20 seconds"** — mkdir -p + touch + ls -la in the simulator

### Carousels (3)
1. **"The 4 essential navigation commands"** — pwd → ls → cd → ls -la, 1 slide each
2. **"5 beginner mistakes in the terminal"** — forgetting -r, rm without -i, cd without path, confusing . and .., spaces in filenames
3. **"Reading a file: cat vs head vs tail vs grep"** — When to use each, with curriculum examples

### Hooks (3)
1. "You type `ls` but don't understand what you see?"
2. "This command can destroy your system in 1 second."
3. "Starting with the terminal? Begin with these 4 commands."

### Soft CTAs (3)
1. "Try it free → terminal-learning.vercel.app"
2. "Save this post — you'll need it."
3. "The project is open source — link in bio."
