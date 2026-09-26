# Claude Agents — Terminal Learning

> Index et guide d'usage des agents internes du projet.
> **Dernière mise à jour** : 24 septembre 2026 — rafraîchissement de la flotte (THI-353) : **21 agents**, modèles réalignés sur la règle du 01/08/2026 (**Opus = toute la sécurité**), pin par alias `opus` (plus d'identifiant figé), canal Supabase = Management API, repli Linear GraphQL, nouvel agent `terminal-fidelity-auditor`, fiches manquantes ajoutées. Historique : 2 juin 2026 (THI-321, clause auto-critique sur toute la flotte) · 1er juin (doctrine auto-amélioration) · 29 mai (anti-hallucination dénombrement) · 28 mai (règle zéro-Haiku).
> ⚠️ **Maintenance** : bumper ce champ à chaque ajout/modification d'agent (cf. « Convention — ajouter un nouvel agent »).
> 🧠 **Limitation technique connue** : un agent `.md` créé en cours de session n'est invocable qu'à la session suivante. Si un agent doit gater une PR de la même session, faire l'audit inline avec exactement sa méthode ; l'agent prend le relais aux PRs suivantes.

Cet index liste les **21 agents** du projet, **quand les invoquer**, et **pourquoi ils existent**. Il complète le frontmatter de chaque fichier `.md`.

> 🚫 **Règle dure (@thierry 28/05/2026)** : **JAMAIS `model: haiku`**. `model:` vaut exactement `opus` ou `sonnet` (alias, jamais un identifiant figé comme `claude-opus-4-8`). Distribution : **0 Haiku / 8 Sonnet / 13 Opus**. Garde-fou : `src/test/agentFrontmatter.test.ts`.

## 🛡 Doctrine modèles agents

**Origine** : incident du 24 avril 2026 (downgrade silencieux Opus → Haiku/Sonnet → push direct sur `main`, CSP retiré, secret exposé dans une URL MCP, HTTP 504 prod ~5h). Haiku est l'attracteur par défaut d'un downgrade silencieux : un scope critique ne peut pas reposer sur lui.

**Règle en vigueur — 01/08/2026 (CLAUDE.md global)** : **Opus = TOUTE la sécurité** (OWASP, CSP, RLS, RBAC, auth, crypto, prompt injection, RGPD/AI Act, anti-fuite de secrets), plus l'orchestration. « Dès qu'un faux négatif d'audit peut exposer des données réelles, violer une obligation légale ou publier un secret, le coût du modèle n'est plus un argument. » **Sonnet** = qualité, perf, a11y, UX, tests, contenu — erreur réparable. Elle remplace la doctrine du 20/05/2026 (`docs/reports/agents-doctrine-2026-05-20.md`, historique), qui gardait plusieurs audits sécurité en Sonnet.

| Modèle | Scope | Agents |
|---|---|---|
| ~~Haiku~~ | 🚫 interdit depuis le 28/05/2026 | — |
| **Sonnet** | qualité, contenu, tests, UI/mobile, fidélité du simulateur, process | `content-auditor`, `curriculum-validator`, `linear-sync`, `mobile-responsive-auditor`, `sustain-auditor`, `terminal-fidelity-auditor`, `test-runner`, `ui-auditor` (8) |
| **Opus** | toute la sécurité, conformité juridique, données personnelles réelles, orchestration | `classroom-workflow-auditor`, `institution-rbac-auditor`, `legal-compliance-auditor`, `llm-security-auditor`, `lti-auditor`, `prompt-guardrail-auditor`, `rbac-flow-tester`, `route-attack-auditor`, `security-auditor`, `session-orchestrator`, `supabase-backend-auditor`, `user-forensics-auditor`, `vercel-firewall-auditor` (13) |

**Garde-fou session** : `.claude/settings.local.json` épingle l'alias `"model": "opus"` — toujours le dernier Opus disponible, sans re-pin à chaque version. Un identifiant figé bloque les montées de version autant que les downgrades, et se périme en silence.

**Canaux externes (communs à tous les agents)** :

- **Supabase** : le connecteur claude.ai `mcp__claude_ai_Supabase__*` est interdit dans ce projet depuis le 18/08/2026 (compte tiers). Seul canal : Management API (`POST https://api.supabase.com/v1/projects/jdnukbpkjyyyjpuwgxhv/database/query`, `GET .../advisors/security`) avec le jeton DevContext `SUPABASE_ACCESS_TOKEN` en en-tête. 401 → arrêter, « jeton DevContext invalide ». `supabase db push` interdit.
- **Linear** : MCP `linear-server` ; sinon API GraphQL `https://api.linear.app/graphql`, clé lue par script dans `~/.claude/settings.json` → `mcpServers.linear.env.LINEAR_API_KEY`, jamais affichée.
- **Secrets** : jamais lire `.secrets/` ; test de présence `[ -n "$VAR" ] && echo SET || echo UNSET` uniquement (jamais `${VAR:-...}`, qui affiche la valeur) ; jamais `curl -I` sur une URL Vercel protégée.

**Pattern auto-apprentissage** : les leçons des bugs passés s'intègrent dans le **scope** des agents existants (ex. section « Client-state lifecycle » de `rbac-flow-tester` après THI-186), pas dans des memos isolés que personne ne relit.

**Pattern auto-amélioration — auto-critique de scope (01/06/2026, @thierry)** : chaque agent termine son run par une section « Angle mort de mon propre scope » (triggers manquants, frontières floues avec un autre agent, classes de défaut hors couverture) et recommande des updates concrets à sa propre définition, que le main agent applique (commit `docs(agents)` séparé). Rollout THI-321 (02/06/2026) : clause standard en fin de fichier ; `legal-compliance-auditor` (Couche 5) et `llm-security-auditor` (Couche 7) l'intègrent dans leur méthode. Cf. mémoire CC `feedback_self_improving_agents.md`. Pré-condition : un agent dormant ne s'améliore pas — l'invoquer dans les 48h (`feedback_agent_dormant_full_audit.md`).

**⛔ Règle anti-hallucination — dénombrement (29/05/2026)** : aucun agent ne compte du code ou de la data de tête.

- ✅ **Compteur prescriptif** (taille de la checklist propre à l'agent : « 10 checks », « 11 sections ») = constante, pas un risque.
- ❌ **Compteur descriptif** (mesure du code réel) = **commande obligatoire** : `npx tsx -e "import { getTotalLessons } from './src/app/data/curriculum'; console.log(getTotalLessons())"`, `grep -c`, `npx vitest run`, `git log`. Source non exécutable → « compte non vérifié ».

Incidents fondateurs : `content-auditor` « 356+ describes » (réel 62, 23/05) puis « 63 leçons » (réel 65, 28/05). Au 24/09/2026, la commande ci-dessus rend **66 leçons** dans **11 modules**. La vérité des compteurs est verrouillée par `src/test/landingTotals.test.ts` + `src/test/seo.test.ts`.

**Début de session** (aligné sur `CLAUDE.md` projet) : en parallèle, `session-orchestrator` mode `startup` + skill `/obsidian-session-sync` ; `session-orchestrator` recommande ensuite `linear-sync`. **Fin de session** : `session-orchestrator` mode `shutdown` + `/obsidian-session-sync` mode shutdown.

> **Cycle de vie** : ce README se met à jour à chaque ajout/modification d'agent. Voir `maintenance_docs_checklist.md` (mémoire CC) section « Agents ».

---

## Quick reference matrix

| Agent | Modèle | Auto-trigger session | Manuel | Bloquant merge ? |
|---|---|---|---|---|
| [`session-orchestrator`](session-orchestrator.md) | **Opus** | ✅ Début et fin de session | À la demande | ❌ (méta-orchestration) |
| [`linear-sync`](linear-sync.md) | Sonnet | ✅ Début de session (recommandé par l'orchestrateur) | À la demande | ❌ |
| [`curriculum-validator`](curriculum-validator.md) | Sonnet | ✅ Avant edit `curriculum.ts` | Avant PR curriculum | ✅ CRITICAL |
| [`test-runner`](test-runner.md) | Sonnet | ✅ Après edit code/tests | Avant push | ✅ CRITICAL |
| [`terminal-fidelity-auditor`](terminal-fidelity-auditor.md) | Sonnet | ❌ | Avant PR moteur (`terminalEngine.ts`, `commands/*`, `lessonSetup.ts`) ou théorie des leçons | ✅ écart simulateur vs vrai shell |
| [`content-auditor`](content-auditor.md) | Sonnet | ❌ | Avant release majeure, ou `validators.ts` seul | ⚠️ WARN |
| [`ui-auditor`](ui-auditor.md) | Sonnet | ❌ | Avant PR composant UI | ✅ CRITICAL |
| [`mobile-responsive-auditor`](mobile-responsive-auditor.md) | Sonnet | ❌ | Avant PR layout/nav/sidebar/drawer/forms/`src/styles` | ⚠️ PASS / PASS_WITH_NOTES / BLOCK |
| [`sustain-auditor`](sustain-auditor.md) | Sonnet | ❌ | Trimestriel ou à la demande | ⚠️ score 1-10 |
| [`security-auditor`](security-auditor.md) | **Opus** | ❌ | Avant PR auth/RBAC/RLS/API/crypto + release majeure | ✅ CRITICAL/HIGH |
| [`prompt-guardrail-auditor`](prompt-guardrail-auditor.md) | **Opus** | ❌ | Avant PR `src/lib/ai/*` ou `src/app/components/ai/*` | ✅ CRITICAL |
| [`llm-security-auditor`](llm-security-auditor.md) | **Opus** | ❌ | Avant release IA + après refonte architecture IA | ✅ CRITICAL/HIGH |
| [`route-attack-auditor`](route-attack-auditor.md) | **Opus** | ❌ | Avant PR `api/*` ou nouvel endpoint | ✅ verdict release-ready |
| [`supabase-backend-auditor`](supabase-backend-auditor.md) | **Opus** | ❌ | Avant PR `supabase/functions/*`, `storage.objects`, upload, `api/support/*` | ✅ CRITICAL |
| [`lti-auditor`](lti-auditor.md) | **Opus** | ❌ | Avant PR `src/lib/lti/*`, `api/lti/*`, migration `*lti*` | ✅ CRITICAL/HIGH |
| [`rbac-flow-tester`](rbac-flow-tester.md) | **Opus** | ❌ | Avant release + PR migration RLS/RPC | ✅ pass/fail |
| [`classroom-workflow-auditor`](classroom-workflow-auditor.md) | **Opus** | ❌ | Avant PR `classes`/`class_enrollments`/`join_class_by_code` | ✅ CRITICAL |
| [`institution-rbac-auditor`](institution-rbac-auditor.md) | **Opus** | ❌ | Avant PR `profiles.institution_id`/`institutions`/`approve_teacher` | ✅ CRITICAL |
| [`vercel-firewall-auditor`](vercel-firewall-auditor.md) | **Opus** | ❌ | Avant release majeure ou modif firewall | ⚠️ WARN si règles cassées |
| [`legal-compliance-auditor`](legal-compliance-auditor.md) | **Opus** | ❌ trimestriel | Avant release B2B écoles / IA / LTI / mineurs, PR `/privacy` ou age-gate | ⚠️ HIGH = avocat humain requis |
| [`user-forensics-auditor`](user-forensics-auditor.md) | **Opus** | ❌ | Incident sécurité / RGPD Art. 15 / anti-abuse | ⚠️ verdict 4 niveaux |

---

## When to invoke which (par phase de session)

### 1. Début de session (obligatoire)

`session-orchestrator` (mode `startup`) + skill `/obsidian-session-sync`, en parallèle. Puis `linear-sync` sur recommandation de l'orchestrateur.

### 2. Pendant la session — selon ce qui est modifié

Les agents se cumulent. PR à périmètre mixte : gates spécialisés d'abord, `feature-dev:code-reviewer` en dernier sur le diff stabilisé.

| Modification | Agent à invoquer | Quand |
|---|---|---|
| Tout code exécutable (`src/`, `api/`, `supabase/`) | **`feature-dev:code-reviewer`** (agent plugin, hors `.claude/agents/`) | **Avant** toute PR de code — obligatoire, en plus de Sourcery (exemptées : PR docs-only ou config triviale) |
| `src/app/data/curriculum.ts` | `curriculum-validator` | **Avant** d'écrire la modification |
| `curriculum.ts`, `terminalEngine.ts`, `src/app/data/commands/*.ts`, `lessonSetup.ts`, `validators.ts`, tests | `test-runner` | **Après**, avant push (cliquets THI-353 : `lessonFidelity.test.ts`, `lessonTheory.test.ts`) |
| `terminalEngine.ts`, `src/app/data/commands/*.ts`, `lessonSetup.ts`, `src/test/lessonSolutions.ts`, théorie des leçons | `terminal-fidelity-auditor` | **Avant** d'ouvrir la PR |
| `src/app/data/validators.ts` seul | `content-auditor` | **Avant** d'ouvrir la PR |
| Composant UI (`*.tsx`) | `ui-auditor` | **Avant** d'ouvrir la PR |
| Layout, nav, sidebar, drawer, forms, `src/styles/*.css`, `index.html` | `mobile-responsive-auditor` | **Avant** d'ouvrir la PR (WebKit iOS + desktop préservé) |
| `src/lib/ai/*` ou `src/app/components/ai/*` | `prompt-guardrail-auditor` (+ `security-auditor`) | **Avant** d'ouvrir la PR |
| `api/*`, `supabase/migrations/`, `src/lib/supabase.ts`, JWT, rate limiting, CSP, secrets | `security-auditor` | **Avant** d'ouvrir la PR |
| `api/*` dont `api/support/*`, `api/sentry-tunnel.ts` (HTTP-level) | `route-attack-auditor` | **Avant** d'ouvrir la PR |
| `api/support/*`, `supabase/functions/*`, policy `storage.objects`, upload | `supabase-backend-auditor` | **Avant** d'ouvrir la PR |
| Age-gate : `auth/AgeGateStep.tsx`, `src/lib/auth/ageGate.ts`, `stampAgeConfirmation.ts`, migration `035` | `security-auditor` + `legal-compliance-auditor` | **Avant** d'ouvrir la PR (THI-340 a été mergé sans ces gates — dette connue) |
| `PrivacyPolicy.tsx`, cookie banner, données de mineurs | `legal-compliance-auditor` | **Avant** d'ouvrir la PR |
| `.claude/agents/*` | `test-runner` (`agentFrontmatter.test.ts`) | **Après** |

### 3. Avant chaque release majeure

```text
content-auditor
terminal-fidelity-auditor
security-auditor
route-attack-auditor
vercel-firewall-auditor
supabase-backend-auditor   # si Edge Functions / Storage / api/support actifs
rbac-flow-tester
institution-rbac-auditor
classroom-workflow-auditor
llm-security-auditor       # si l'IA a changé depuis la dernière release
legal-compliance-auditor
```

### 4. Trimestriellement

`sustain-auditor` (santé du mainteneur) et `legal-compliance-auditor` (les règlementations bougent).

---

## Fiches détaillées

### `session-orchestrator` — startup / shutdown

**Modèle** : Opus (orchestration transverse, mise à jour de docs et mémoire)
**Créé** : 10 mai 2026 (PR #213). Exécute les memos `session_startup_process.md` / `session_shutdown_process.md` en contexte isolé : git, GitHub, Linear (MCP ou GraphQL), health check prod, banners, freshness markers, rapport 8 sections.
**Limites** : ne peut pas lancer d'autres agents (il recommande, avec prompts prêts-à-coller) ; n'écrit que de la doc et de la mémoire, jamais dans `src/`, jamais sur `main`.

### `linear-sync` — Cohérence GitHub ↔ Linear

**Modèle** : Sonnet (jugement sur les incohérences)
**Canal** : MCP `linear-server`, sinon API GraphQL ; aucun canal → rapport dégradé, jamais de statut deviné (incident 28/05/2026).
**Créé** : début avril 2026. **Victoire** : dette Sourcery de 14 jours sur les PR #149/#150 détectée le 2 mai 2026.

### `curriculum-validator` — Structure curriculum.ts

**Modèle** : Sonnet
**Créé** : avril 2026 — `curriculum.ts` est critique (3 060 lignes au 24/09/2026). Vérifie : env coverage, IDs uniques, chaîne de prérequis, sync import/export des validateurs, validateurs orphelins.

### `test-runner` — Tests + qualité statique

**Modèle** : Sonnet (Haiku KO sur dénombrement, PR #286)
**Créé** : avril 2026, étendu PR #150 — type-check + lint + vitest + `.only/.skip` oubliés + delta code/tests. Couvre aussi les cliquets THI-353 (`KNOWN_DESYNCS` vide, `KNOWN_THEORY_GAPS` et `BASH_SHOWN_ON_WINDOWS_MAX` qui ne peuvent que baisser).

### `terminal-fidelity-auditor` — Simulateur vs vrai shell

**Modèle** : Sonnet (fidélité pédagogique : une erreur est réparable, pas une fuite)
**Créé** : 24 septembre 2026 (chantier THI-353). Compare ce que le simulateur affiche à ce qu'affichent un vrai bash et un vrai PowerShell, sur le moteur (`terminalEngine.ts` + `src/app/data/commands/*.ts`), l'état de départ des leçons (`lessonSetup.ts`) et les sessions montrées dans la théorie.
**Complémentaire** : `test-runner` (les cliquets passent) et `content-auditor` (cohérence pédagogique globale).

### `content-auditor` — Audit pédagogique global

**Modèle** : Sonnet (Haiku KO sur dénombrement : « 356+ describes » → réel 62)
**Créé** : avril 2026 (THI-45) — env coverage, cohérence curriculum ↔ moteur ↔ tests, liens externes, prérequis, qualité des `validate()`. Long (~5 min) : avant release, ou sur modification isolée de `validators.ts`.

### `ui-auditor` — Discipline shadcn/ui

**Modèle** : Sonnet (scope strict : lint shadcn + design tokens)
**Créé** : 13 avril 2026 (THI-86). **Bloquant** sur les PR UI. L'umbrella THI-91 a migré les 39 composants Radix restés inutilisés.

### `mobile-responsive-auditor` — WebKit iOS + desktop préservé

**Modèle** : Sonnet
**Créé** : 5 mai 2026 (THI-150) — comble la lacune de `ui-auditor` (Chromium). 11 sections ciblées iPhone Safari, dont la préservation du desktop (§11) et BUG-FAB-001 (taille, contraste, détachement du FAB du tuteur IA).
**Pattern source** : `F:/PROJECTS/Apps/ankora/.claude/agents/mobile-ios-auditor.md`.
**À savoir** : Tailwind v4 sans `tailwind.config.*` (config dans `src/styles/*.css`) ; WSL n'est pas un environnement sélectionnable.

### `sustain-auditor` — Santé du mainteneur solo

**Modèle** : Sonnet
**Créé** : avril 2026 (spec THI-129), instancié le 17 mai 2026. Fraîcheur des docs, rythme git, charge Sentry (non mesurable sans jeton Sentry), taille de l'index mémoire (< 17 KB), charge PR/Linear. Score 1-10.
**Première baseline** : 17 mai 2026 — 5,5/10 (git : 47 % week-end, 31 % nuit sur 90 j), suivi dans THI-212.

### `security-auditor` — OWASP black-hat

**Modèle** : Opus
**Créé** : avril 2026 (THI-53), renforcé le 2 mai 2026 (PR #182, posture Vercel). OWASP Top 10, OWASP API, CSP L3, headers, rate limiting, RLS, auth, supply chain, RGPD, injection terminal, fuite de credentials en migration.
**Déclencheur élargi** : toute nouvelle route/composant qui lit une table RLS (THI-325).

### `prompt-guardrail-auditor` — Gate per-PR du tuteur IA

**Modèle** : Opus
**Créé** : 18 avril 2026 (THI-109), gate-zero **avant** l'implémentation. Prompt injection, jailbreaks, fuite de prompt, isolation des prompts par rôle (ADR-009), sanitizer, XSS sur le rendu, fuite de clé BYOK.
**Lié** : ADR-002, ADR-005, ADR-009. Premier audit : 2 mai 2026, CLEAN.

### `llm-security-auditor` — Audit IA approfondi (7 couches)

**Modèle** : Opus
**Créé** : 9 mai 2026 (PR #212, renommage de `ai-pentester-pro`). OWASP LLM Top 10 + vecteurs 2026 (injection indirecte, RAG poisoning, supply chain LLM, dérive multi-tours, contournement par encodage), niveau de confiance par finding.
**Différence avec `prompt-guardrail-auditor`** : celui-ci est le gate de chaque PR IA ; `llm-security-auditor` sert aux releases et refontes d'architecture.

### `route-attack-auditor` — Surface HTTP des `api/*`

**Modèle** : Opus
**Créé** : 2 mai 2026 (PR #176). Fingerprinting des codes, verb tampering, cache poisoning via 503, slowloris, timing, header smuggling, CORS. Endpoints au 24/09/2026 : `api/support/notify.ts`, `api/sentry-tunnel.ts`, `api/lti/launch.ts` (+ `api/_rate-limit.ts`).

### `supabase-backend-auditor` — Edge Functions, Storage, upload, secrets backend

**Modèle** : Opus
**Créé** : 28 mai 2026 — gate-zero avant la fonction e-mail et l'import de curriculum. Secret handling, JWT, BOLA, SSRF, `storage.objects`, upload (MIME, magic bytes, zip slip, SVG-XSS). Élargi le 2 juin 2026 à toute route `api/*` qui manipule un upload ou un secret backend (ex. `api/support/notify.ts`).
**Indépendant du MCP** : `curl` + JWT, fonctionne en sous-agent.

### `lti-auditor` — Sécurité LTI 1.3

**Modèle** : Opus
**Créé** : 16 mai 2026 (THI-131) — 10 checks critiques sur la chaîne crypto (`jose@6`, RS256, iss/aud, nonce, jti, kid, alg ≠ none, deployment_id, target_link_uri). La surface existe (`src/lib/lti/*`, `api/lti/launch.ts`, migration 013), gatée par `LTI_ENABLED`.
**Lié** : ADR-001, ADR-006, PR #236.

### `rbac-flow-tester` — Flow RBAC de bout en bout

**Modèle** : Opus (RLS + isolation entre utilisateurs réels)
**Créé** : avril 2026 — 5 utilisateurs de test via REST + JWT : login, rôle, isolation RLS, nettoyage du stockage client entre sessions (après THI-186, fuite de données de 6 semaines).

### `classroom-workflow-auditor` — Parcours enseignant ↔ élève

**Modèle** : Opus (isolation entre classes, données d'élèves)
**Créé** : 20 mai 2026 (THI-237, PR #274). Création de classe, code d'invitation, inscription via `join_class_by_code`, visibilité de la progression, isolation inter-classes — tests empiriques.

### `institution-rbac-auditor` — Isolation entre institutions

**Modèle** : Opus
**Créé** : 20 mai 2026 (THI-238, PR #276). Un `institution_admin` ne voit et n'approuve que sa propre institution — tests par JWT.

### `vercel-firewall-auditor` — WAF Vercel

**Modèle** : Opus
**Créé** : 14 avril 2026 — lit la config WAF via l'API REST et teste la prod en HTTP. Nécessite `VERCEL_TOKEN` en session, jamais committé.
**Lié** : `docs/vercel-firewall.md`.

### `legal-compliance-auditor` — RGPD, AI Act, DSA, droit belge

**Modèle** : Opus (+ 8-12 WebSearch par run)
**Créé** : 24 mai 2026 (THI-270, PR #288). Méthode 5 couches ; inventaire (dont `/privacy` réécrite par la PR #379 et l'age-gate THI-340) avant toute recommandation. Recoupe la section « services tiers » avec l'outil Publiable de @thierry. **Ne remplace pas un avocat** : le signale explicitement.

### `user-forensics-auditor` — Enquête sur un compte

**Modèle** : Opus (données personnelles réelles)
**Créé** : 24 mai 2026 (THI-274, PR #293). Identité OAuth, timeline, cohérence entre tables, verdict. Minimisation RGPD : PII masquées ; aucun identifiant réel dans un fichier du dépôt (public).

---

## Convention — ajouter un nouvel agent

1. Créer `.claude/agents/<nom>.md` avec un frontmatter YAML strict :

   ```yaml
   ---
   name: <nom-kebab-case>
   description: <une phrase — quand l'invoquer + ce qu'il vérifie>
   tools: <Bash, Read, Grep, Glob, WebFetch — uniquement le nécessaire>
   model: <sonnet | opus>
   ---
   ```

   Aucune valeur non quotée ne doit contenir `": "` ni `" #"` : l'agent disparaîtrait du registre sans erreur (THI-326). `src/test/agentFrontmatter.test.ts` le vérifie, ainsi que `model` ∈ {`opus`, `sonnet`} et la présence de l'agent dans ce README.
2. Ajouter une ligne dans la matrice et dans le tableau des modèles.
3. Ajouter une fiche détaillée.
4. Si auto-trigger : mettre à jour `CLAUDE.md` projet (« Protocole de session »).
5. Si bloquant merge : mettre à jour `feedback_session_protocol.md` (mémoire).
6. Bumper « Dernière mise à jour » en tête de ce README.

**Choix du modèle** : la question est « un faux négatif peut-il exposer des données réelles, violer une obligation légale ou publier un secret ? » Oui → **Opus**. Non (erreur réparable : qualité, contenu, UI, tests) → **Sonnet**. Jamais Haiku.

---

## Histoire — pourquoi cet index existe

Au 5 mai 2026, le projet avait 12 agents accumulés en un mois ; les frontmatters ne suffisaient plus à savoir **quand invoquer quoi** ni **pourquoi un agent existe**. Risque concret : dans 6 mois (pause santé, contexte effacé), une redécouverte douloureuse. L'index ramène cette redécouverte à 5 minutes.
