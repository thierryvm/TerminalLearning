# Curriculum Exports

This directory contains data exports from Terminal Learning's curriculum for external use.

## curriculum.csv

**Export of 64 lessons from 11 modules** — useful for pedagogical collaborators, curriculum review, or integration with external tools.

### Columns

- `module_id` — Unique module identifier (e.g., `git`, `navigation`)
- `module_title` — Human-readable module name
- `lesson_id` — Unique lesson identifier within the module
- `lesson_title` — Lesson name
- `lesson_description` — Short description (truncated to 100 chars for CSV readability)
- `has_exercise` — `yes` if lesson includes a practical exercise, `no` otherwise
- `test_type` — Type of validation test (`custom` for function-based validation)

### How to regenerate

```bash
npm run export:curriculum
```

This reads `src/app/data/curriculum.ts` and writes to `curriculum.csv`.

### Use cases

- **Pedagogical review** — Share curriculum structure with domain experts without Git access
- **Translation workflows** — Use CSV for translation tools (Google Sheets, Airtable, etc.)
- **Curriculum planning** — Visualize lesson density per module
- **Integration** — Import into external platforms (LMS, curriculum databases, etc.)

### Data freshness

The CSV is generated from `curriculum.ts` on demand. To ensure accuracy, run the export script before sharing with collaborators.

---

Phase A of curriculum evolution (THI-128). Phase B (YAML grammar) planned for Q3 2026.
