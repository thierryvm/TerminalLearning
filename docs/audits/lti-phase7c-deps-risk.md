# LTI Phase 7c — Dependency Risk Assessment

**Date** : 16 mai 2026
**Scope** : `feature/THI-131-auth-mvp` (PR #1 — Auth MVP crypto core)
**Statut** : Risque résiduel **acceptable** pour V1 avec `LTI_ENABLED=false` jusqu'à audit final.
**Auteur** : senior co-décideur (claude opus-4-7 pinné, vérifié `.claude/settings.local.json`)

---

## Sommaire exécutif

Bump `@vercel/node@5.7.15 → 5.8.2` + ajout `jose@6.2.3`. Gates sécurité analysés :

| Gate | Statut | Sévérité | Décision |
|---|---|---|---|
| **H4-AI `jsonwebtoken@9.0.3`** | ✅ Fermée naturellement | — | npm audit confirme **0 CVE active** sur `jsonwebtoken/jws/jwa@latest`. Le memo H4-AI était daté ; rien à faire. |
| **H2 `undici@5.28.4`** (via `@vercel/node@5.x`) | ⚠️ Risque résiduel | High (catalog) → Low (exploitabilité TL) | Documenté ci-dessous. **Pas de blocker V1.** Backlog Q3 2026 pour bump `@vercel/node@6.x` quand release. |
| **`jose@6.2.3`** (nouvelle dep) | ✅ Clean | — | Trust Score Context7 9.3/10, 0 CVE historique majeur, ~30 kB tree-shakeable, Web Crypto natif. |

Risque exploitabilité pour LTI V1 Auth MVP : **🟢 acceptable** avec strict allowlist `ALLOWED_ISSUERS` + rate-limit 50 req/min/IP + scrubber Sentry.

---

## Détail H2 `undici@5.28.4` — 7 CVEs catalogue

```
@vercel/node@5.8.2 → undici@5.28.4
```

| Advisory | Severity | Vector | TL exploitable ? |
|---|---|---|---|
| GHSA-c76h-2ccp-4975 | Moderate | Insufficiently random values | ❌ TL n'utilise pas undici directement |
| GHSA-g9mf-h72j-4rw9 | Moderate | Unbounded decompression Content-Encoding | ❌ TL ne fait pas de fetch vers issuer non-trusted (allowlist hardcodée) |
| GHSA-cxrh-j4jr-qwg3 | Low | DoS via bad cert data | ❌ JWKS endpoints sont sur des CA standards |
| GHSA-2mjp-6q6p-2qxm | Moderate | HTTP Request/Response Smuggling | ❌ TL contrôle l'allowlist d'issuers (canvas, moodlecloud, smartschool — pas de chemins user-controlled) |
| GHSA-vrm6-8vpv-qv8q | High | WebSocket permessage-deflate memory exhaustion | ❌ TL n'utilise pas WebSocket via undici |
| GHSA-v9p9-hfj2-hcw8 | High | WebSocket server_max_window_bits crash | ❌ idem |
| GHSA-4992-7rv2-5pvq | Moderate | CRLF Injection via `upgrade` option | ❌ TL n'utilise pas l'option `upgrade` |

**Conclusion** : tous les vecteurs `undici` connus sont soit liés à des fonctionnalités WebSocket (TL ne les utilise pas), soit dépendent d'un attaquant contrôlant un endpoint que TL fetcherait — bloqué en pratique par `ALLOWED_ISSUERS` hardcodé.

## Pourquoi pas `npm audit fix --force` ?

```
fixAvailable: { name: '@vercel/node', version: '4.0.0', isSemVerMajor: true }
```

`npm audit fix --force` proposerait un **downgrade** vers `@vercel/node@4.0.0` (semver major). Paradoxal : la version 4.x ne tire pas `undici@5` vulnérable, mais c'est un régression majeure (perte de features Fluid Compute, lazy imports, perf). **Refusé en l'état**.

## Pourquoi pas un `package.json` override `undici@^6` ?

Tentation : ajouter

```json
"overrides": { "@vercel/node": { "undici": "^6.0.0" } }
```

Risque : `@vercel/node@5.x` n'a pas été testé contre `undici@6.x` upstream. Casse potentielle au cold-start Vercel Function (cf. incident **THI-134** où `jsonwebtoken` top-level import crashait le cold-start `api/lti/launch`). **Risque > bénéfice** pour V1.

## Plan de remédiation

| Étape | Quand | Action |
|---|---|---|
| **V1 Auth MVP** (PR #1 — cette PR) | 16 mai 2026 | Documenter + accepter risque résiduel. `LTI_ENABLED=false` en prod = pas de surface attaquable. |
| **PR #2 endpoint + persistence** | Sprint 2 fin (~30 mai 2026) | Re-tester npm audit après refactor `api/lti/launch.ts` pour appeler `verifyJwt()`. |
| **PR #3 mock harness + activation** | Avant flip `LTI_ENABLED=true` | Vérifier que `@vercel/node@6.x` (si release) est dispo. Sinon, lancer ship V1 avec risque documenté + alerte Sentry custom sur le pattern d'erreur undici. |
| **Backlog Q3 2026** | Post-flip prod | Monitor `@vercel/node@6.x` upstream → bump dès release + retest LTI complet. |

## Décision finale (gates fermés pour PR #1)

✅ **GO PR #1** avec :

- Risque H2 undici documenté et accepté
- `LTI_ENABLED=false` en prod (feature flag protège tout)
- 19 tests crypto verts (1405 suite totale)
- Audit `lti-auditor` MVP à exécuter avant merge
- Sourcery review attendu en CI

## Trace décision

- Senior co-décideur : `chore/docs-post-thi-153 → feature/THI-131-auth-mvp`
- @thierry validation : Option D (Auth MVP + admin panel parallèle, deadline 10 juin 2026), 5 refinements verrouillés
- Discipline bypass token MCP : règle 24 avril respectée — preview validation via prod publique post-merge fast-forward
- Linear : THI-131 In Progress dès ouverture PR
