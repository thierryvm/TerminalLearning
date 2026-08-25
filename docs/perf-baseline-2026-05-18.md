# Performance Baseline — 18 mai 2026

> Snapshot Lighthouse 12.6.1 + headless Chrome sur `https://terminallearning.dev` en production. Capturé en début de Sprint 2.5 (SEO/GEO + Phase 9 Admin Panel) pour mesurer objectivement les gains des sprints à venir. **Toute PR future touchant la performance doit comparer ses scores à cette baseline** — anti-régression mesurable.

**Configuration** :

- Lighthouse `12.6.1` (npm global)
- Chrome headless `--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage`
- Throttling : Lighthouse default (Slow 4G simulated, CPU 4× slowdown)
- Field data CrUX : non disponible publiquement à cette date (sera ajouté via Vercel Speed Insights export)
- JSON brut : `docs/perf-history/2026-05-18-*-prod.json`

## Résumé exécutif

| Route | Perf | A11y | BP | SEO | LCP | FCP | CLS | TBT | Speed Index |
|---|---|---|---|---|---|---|---|---|---|
| `/` Landing | **91** | **100** | **100** | **100** | 2935ms ⚠️ | 2560ms | 0.001 ✅ | 93ms ✅ | 2560ms |
| `/app` Dashboard | **92** | **100** | **100** | **100** | 2866ms ⚠️ | n/a | n/a | 72ms ✅ | n/a |
| `/changelog` | **74** ⚠️ | **100** | **100** | **92** ⚠️ | 3013ms ⚠️ | n/a | n/a | **701ms** 🔴 | n/a |

## Lecture

### ✅ Points forts (à préserver, anti-régression critique)

- **Accessibilité 100/100** sur toutes les routes auditées — score parfait, témoignage de la doctrine WCAG 2.2 AAA appliquée depuis Phase 4c et le sprint mobile recovery THI-152
- **Best Practices 100/100** Landing + /app + /changelog — CSP, HTTPS, secure cookies, no mixed content : tout est carré
- **SEO 100/100** Landing + /app — sitemap.xml + robots.txt + Schema.org WebSite + Helmet meta complets. `/changelog` à 92 (probablement meta description manquante sur la page markdown, à corriger en Sprint 1.5 Helmet uniformisé)
- **CLS 0.001** Landing — quasi parfait, layout stable au paint (THI-118 fix LCP a aussi blindé le CLS)
- **TBT < 100ms** sur Landing + /app — JavaScript bloquant maîtrisé (gain net post-Sprint Mobile Recovery THI-152 + Bundle optimization THI-87)

### ⚠️ Points d'attention (zones de gains visibles)

- **LCP 2.9-3.0s sur toutes les routes** : zone "needs improvement" (seuil "good" Google = 2.5s). Le LCP synthétique Lighthouse simule Slow 4G — le LCP réel CrUX en field data est probablement meilleur (THI-118 avait confirmé 332ms field data après le fix Sprint 2 étape 1/N). À monitorer après pre-render Vite (Sprint 4).
- **`/changelog` Performance 74/100 et TBT 701ms 🔴** : confirme l'hypothèse que `react-markdown` parsing client-side bloque le main thread sur les longs fichiers markdown (CHANGELOG.md = ~80kB de markdown rendu au runtime). Cible Sprint 4 : pre-render au build → main thread libre, LCP gain ~1s estimé.
- **`/changelog` SEO 92/100** : meta description ou structured data manquante. Sera fixé Sprint 1 task 5 (Schema.org + FAQPage) + Sprint 1 task 6 (Helmet uniformisé THI-222).

## Cibles Sprint 2.5 (gains attendus, à valider sur cette baseline)

| Métrique | Baseline 18/05 | Cible post-Sprint 2.5 | Levier |
|---|---|---|---|
| Landing Perf | 91 | **≥ 95** | Pre-render Vite (Sprint 4) supprime l'attente JS pour Googlebot |
| Landing LCP | 2935ms | **≤ 2200ms** | Pre-render = HTML statique servi direct, render bloquant supprimé |
| /changelog Perf | 74 | **≥ 90** | Pre-render markdown au build |
| /changelog TBT | 701ms | **≤ 200ms** | Markdown parse moved to build-time |
| /changelog SEO | 92 | **100** | Helmet meta description + Schema.org |
| **Nouveau** : `/admin` Perf | n/a | **≥ 90** | À mesurer après Phase 9 skeleton (Sprint 2) |
| **Nouveau** : `/commandes/<cmd>` × 27 pages | n/a | **≥ 95** | Pre-rendered au build, contenu statique |

## Comparaison historique (référence anti-régression)

| Date | Source | Note |
|---|---|---|
| 2026-04-14 | Sentry weekly | Landing LCP **9.31s** 🔴 (poor zone, régression post-shadcn migration) |
| 2026-04-16 | THI-118 fix livré | Field data prod LCP **332ms** ✅ |
| 2026-05-16 | Sprint 2 étape 1/N | Lighthouse confirmait gain Sprint 1 |
| **2026-05-18** | **Cette baseline** | **Landing 2935ms synth / 91 Perf, /changelog 3013ms / 74 Perf** |

**Procédure anti-régression** : après chaque PR touchant `Landing.tsx`, `routes.ts`, `vercel.json`, `index.html`, `MarkdownPage.tsx`, `vite.config.ts`, ou un import lourd sur Landing chunk → re-run Lighthouse sur les 3 routes auditées + comparer aux scores ci-dessus. **Tolérance** : -2 points Perf max. Au-delà → bloquer le merge et investiguer.

## Annexe — commandes de reproduction

```bash
# Landing
npx lighthouse https://terminallearning.dev/ \
  --only-categories=performance,accessibility,best-practices,seo \
  --output=json \
  --output-path=docs/perf-history/2026-05-18-landing-prod.json \
  --chrome-flags="--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage" \
  --quiet

# Dashboard
npx lighthouse https://terminallearning.dev/app \
  --only-categories=performance,accessibility,best-practices,seo \
  --output=json \
  --output-path=docs/perf-history/2026-05-18-app-prod.json \
  --chrome-flags="--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage" \
  --quiet

# Changelog
npx lighthouse https://terminallearning.dev/changelog \
  --only-categories=performance,accessibility,best-practices,seo \
  --output=json \
  --output-path=docs/perf-history/2026-05-18-changelog-prod.json \
  --chrome-flags="--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage" \
  --quiet
```

> **Note Lighthouse flags** : le `--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage` combo est OBLIGATOIRE sur Windows + Node 24 — sans ces flags, `NO_NAVSTART` error sur ~50% des runs.
