# Next Session Plan — 17 avril 2026 (matin)

> Fichier lu automatiquement par `session-kickoff.md` étape 5.
> À supprimer ou archiver une fois les actions exécutées.
> Créé : 16 avril 2026, fin de session tardive.

---

## Contexte d'entrée

Session précédente (16 avril 2026, soir) : vision stratégique consolidée via 4 ADRs (LTI-first, BYOK OpenRouter, TTFR KPI, Classroom Composer UI). Mémoires `project_platform_vision_v2.md`, `user_health_signals.md`, `project_internationalization.md` créées. Process docs `session-kickoff.md`, `release-sync-checklist.md`, `adr-template.md` livrés.

**Scope ce matin** : transformer la vision en backlog Linear actionnable + finaliser les docs `.md` restantes.

---

## Étape 1 — Checks santé (obligatoire, protocole standard)

Exécuter `session-kickoff.md` étapes 1 à 7. Si signal rouge santé → **stop**, proposer scope réduit à Thierry.

---

## Étape 2 — Finaliser les docs `.md` en attente

Ces fichiers n'ont pas pu être mis à jour hier soir (budget tokens épuisé). Les faire **avant** de créer les issues Linear.

### 2.1 `docs/ROADMAP.md` (priorité 1)

- Header : déjà OK (17 avril 2026 + note vision consolidée)
- **À ajouter** après Phase 9 : 4 nouvelles phases
  - **Phase 10** — Agent IA Tuteur BYOK (OpenRouter tier 0) — 4 semaines
  - **Phase 11** — LTI 1.3 Provider (AGS + NRPS) — 6-8 semaines
  - **Phase 12** — Classroom Composer UI (+ 5 templates par défaut) — 4 semaines
  - **Phase 13** — Internationalisation (FR + NL + EN) — 3 semaines

Pour chaque phase : objectifs, livrables, KPIs, dépendances, lien vers ADR.

### 2.2 `docs/ARCHITECTURE.md` (priorité 2)

Sections à ajouter :
- **BYOK multi-tiers** — détection par préfixe clé, SDK OpenAI-compatible unique (ref ADR-002)
- **Multi-tenancy RLS** — isolation par `institution_id` sur toutes les tables métier
- **i18n architecture** — `react-i18next`, routes `/fr/*`, `/nl/*`, `/en/*`, stratégie curriculum (à trancher : fichiers séparés vs clés i18n)
- **LTI 1.3 Provider** — endpoints, JWK rotation, deep linking flow (ref ADR-001)

### 2.3 `docs/GUIDELINES.md` (priorité 3)

Nouvelle section **Crédibilité B2B** :
- ❌ Aucun claim non vérifiable dans le pitch institutionnel
- ❌ Aucune métrique inventée (jamais "100 écoles utilisent")
- ❌ Aucune référence à des features pas encore live
- ✅ Transparence sur l'état réel (bénévole solo, stack open source, en développement)
- ✅ Source code lien pour auditabilité
- ✅ Statut phases affiché clairement (✅ livré / 🔄 en cours / 📋 planifié)

### 2.4 `CLAUDE.md` projet (priorité 4)

- Ajouter section **ADRs** avec liens vers les 4 ADRs
- Ajouter règle **Health signals** (ref `user_health_signals.md`)
- Ajouter règle **Crédibilité B2B** (ref GUIDELINES)

---

## Étape 3 — Créer les issues Linear + branches GitHub

**Ordre d'exécution** : créer toutes les issues d'abord, puis les branches associées en parallèle.

### Issues à créer (projet THI, equipe Thierry)

#### Phase 10 — Agent IA Tuteur BYOK

| ID attendu | Titre | Priorité | Labels | Description courte |
|---|---|---|---|---|
| THI-105 | Agent IA Tuteur — scaffolding BYOK multi-tiers | High | `phase-10`, `ai`, `byok` | Détection clé par préfixe (sk-or-v1-*, sk-ant-*, sk-*), SDK OpenAI-compat unique, fallback entre tiers. Ref ADR-002. |
| THI-106 | OpenRouter tier 0 — intégration modèles gratuits | High | `phase-10`, `ai`, `openrouter` | DeepSeek V3.1, Llama 3.3 70B, Gemini 2.0 Flash, Qwen 2.5 72B. UI onboarding sans carte bancaire. |
| THI-107 | Prompt system Tuteur Socratique — CEFR A1→C2 | High | `phase-10`, `ai`, `prompt` | Prompts adaptés par niveau CEFR, jamais la réponse directe (maïeutique), OWASP LLM Top 10 2025 defenses. |
| THI-108 | UI chat Tuteur — drawer latéral contextuel | Medium | `phase-10`, `ai`, `ui` | Drawer shadcn/ui, contexte leçon/commande courante injecté, historique session (pas persistant). |

#### Phase 11 — LTI 1.3 Provider

| ID attendu | Titre | Priorité | Labels | Description courte |
|---|---|---|---|---|
| THI-109 | LTI 1.3 — endpoints de base (login, launch, JWK) | High | `phase-11`, `lti`, `b2b` | OIDC login init, LTI launch, JWK rotation endpoint. Ref ADR-001. |
| THI-110 | LTI AGS — grade passback vers LMS hôte | Medium | `phase-11`, `lti` | Score TTFR + score leçons synchronisés vers Moodle/Canvas grade book. |
| THI-111 | LTI NRPS — sync rosters | Medium | `phase-11`, `lti` | Récupération liste étudiants/enseignants depuis LMS hôte. |
| THI-112 | LTI deep linking — sélection module/leçon | Low | `phase-11`, `lti` | Enseignant LMS choisit un module Terminal Learning à embed. |

#### Phase 12 — Classroom Composer UI

| ID attendu | Titre | Priorité | Labels | Description courte |
|---|---|---|---|---|
| THI-113 | Composer UI — builder visuel JSON | High | `phase-12`, `classroom`, `ui` | UI drag-drop pour composer un parcours, JSON comme storage invisible. Ref ADR-004. |
| THI-114 | Templates par défaut — 5 parcours Belgique | High | `phase-12`, `classroom`, `content` | 6ème sec FWB, humanités, CAP CESS, Forem, Bruxelles Formation. |
| THI-115 | Fork/remix parcours — classroom forking | Medium | `phase-12`, `classroom` | Un enseignant fork un parcours public, l'adapte, le partage. Attribution obligatoire. |

#### Phase 13 — i18n FR/NL/EN

| ID attendu | Titre | Priorité | Labels | Description courte |
|---|---|---|---|---|
| THI-116 | i18n — setup react-i18next + routes localisées | High | `phase-13`, `i18n` | `/fr/*`, `/nl/*`, `/en/*`, détection navigateur, switcher UI. |
| THI-117 | i18n — traduction UI complète NL + EN | High | `phase-13`, `i18n` | Tous les composants UI + landing + dashboard. FR reste source de vérité. |
| THI-118 | i18n — stratégie curriculum (décision technique) | Medium | `phase-13`, `i18n`, `curriculum` | Trancher : fichiers séparés `curriculum.fr.ts` vs clés i18n inline. Décision → ADR-005. |

#### Crédibilité B2B (transversal)

| ID attendu | Titre | Priorité | Labels | Description courte |
|---|---|---|---|---|
| THI-119 | Crédibilité B2B — audit pages publiques | High | `b2b`, `compliance` | Landing + /story + /changelog : retirer tout claim non vérifiable, ajouter phrase "projet bénévole solo en développement". |
| THI-120 | Demo interactive — try-before-signup | Medium | `b2b`, `onboarding` | Mini terminal playground sur landing, 3 commandes guidées sans auth. Conversion target : +30% signups. |

#### Performance — régression INP prod

| ID attendu | Titre | Priorité | Labels | Description courte |
|---|---|---|---|---|
| THI-121 | Speed Insights — investigation approfondie RES=64 / INP=1048ms | **Urgent** | `performance`, `investigation`, `regression` | Malgré THI-90 (startTransition, lab 515→26ms), le RES prod chute à 64 sur 7 jours (10-17 avril). INP P75 = 1048ms (rouge). FCP 2.74s + LCP 2.54s (orange). CLS 0.01 et TTFB 0.21s OK. **Hypothèses** : (1) startTransition insuffisant hors env-switcher (autres handlers lourds ?) ; (2) re-renders massifs sur routes leçons / LessonPage (ProgressContext ?) ; (3) bundle chunks encore trop gros sur routes lentes ; (4) third-party script (Sentry replay ?) ; (5) device low-end / conditions réseau réelles >> lab. **Livrables** : (a) profiling Chrome DevTools sur preview prod (desktop + mobile emulated CPU 4x) ; (b) analyse routes les plus lentes via Speed Insights "Paths" tab ; (c) audit `on*` handlers dans composants chauds (Sidebar, Landing, LessonPage) ; (d) vérifier si Sentry Replay actif en prod (peut ajouter 200-500ms INP) ; (e) rapport avec 3 hypothèses rankées + plan de remédiation chiffré. **Screenshot réf** : RES 64, tendance baissière 10-15 avril puis remontée partielle 16-17 avril. |

### Création des branches

Pour chaque issue créée ci-dessus, créer la branche GitHub correspondante avec `gh` :

```bash
# Exemple (à faire dans l'ordre des priorités High d'abord)
gh issue create --title "..." --label "..." --body "..."
# puis
git checkout main && git pull
git checkout -b feature/thi-105-ai-tutor-byok-scaffolding
git push -u origin feature/thi-105-ai-tutor-byok-scaffolding
```

**Ne pas créer toutes les branches d'un coup** — créer au fur et à mesure quand on commence à travailler dessus, pour éviter la pollution des orphelines.

---

## Étape 4 — Vérification finale

Après création des issues + docs à jour :
- [ ] Lancer agent `linear-sync` pour confirmer cohérence
- [ ] `git status` clean sur `main`
- [ ] MEMORY.md à jour (ajouter entry si ADR-005 créé pour i18n curriculum)
- [ ] Résumé oral à Thierry : nombre d'issues créées, phases couvertes, priorités top 3

---

## Ordre de priorité si temps limité

Si Thierry a un budget session restreint :

1. **Must-have** (30 min) — Étape 2.1 ROADMAP + Étape 3 issues Phase 10 (4 issues) + THI-119 crédibilité
2. **Should-have** (+30 min) — Étape 2.2 ARCHITECTURE + Étape 3 issues Phase 11 (4 issues)
3. **Nice-to-have** (+30 min) — Étape 2.3 GUIDELINES + Étape 2.4 CLAUDE.md + Étape 3 issues Phases 12/13
4. **Deferred** — Création des branches (attendre le démarrage effectif de chaque feature)

---

## Mémoires à charger automatiquement

En début de session demain, ces mémoires sont prioritaires :
- `project_platform_vision_v2.md` — **source de vérité stratégique**
- `user_health_signals.md` — règle slow-down
- `project_internationalization.md` — priorités i18n
- `feedback_session_protocol.md` — règles opérationnelles

---

## Trigger d'activation

Thierry dira probablement : **"ok, lance les process habituels"** ou **"début de session"**.

→ Répondre par l'exécution directe des étapes 1 à 4 ci-dessus, sans demander confirmation pour chaque sous-étape. Demander confirmation uniquement avant : création d'une issue Linear, push d'une branche, modification destructive.
