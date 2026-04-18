# ADR-005 — AI Tutor V1 — stockage clé, rate limiting, guardrails

**Date** : 18 avril 2026
**Statut** : Accepted
**Décideurs** : Thierry (owner), Claude (architecte)

## Contexte

ADR-002 fige l'architecture BYOK 4-tiers avec OpenRouter prioritaire (zéro clé serveur, client-side only), mais laisse plusieurs choix V1 ouverts : stockage de la clé côté client, rate limiting, system prompt, isolation process, calendrier de création de l'agent guardrail. Le brainstorm du 18 avril 2026 (session post-ADR-002) a arbitré ces quatre points dans une logique de "V1 minimal shippable + progressive disclosure + defense-in-depth incrémentale".

## Décision

### 1. Stockage de la clé — **option 1 plain par défaut + option 4 opt-in chiffrée**

- **Défaut V1** : `localStorage` non chiffré avec un warning visible dans `/app/settings` ("Votre clé est lisible par les extensions du navigateur — activez le chiffrement si vous utilisez une clé payante").
- **Opt-in** : chiffrement AES-GCM via Web Crypto API, clé dérivée d'une passphrase user via PBKDF2 (≥ 210 000 itérations), stockée en IndexedDB. Passphrase demandée une fois par session, purgée à `beforeunload`.
- Cible primaire = étudiant précaire Tier 0 avec clé OpenRouter free (0 € de risque) → pas de passphrase imposée.
- Cible secondaire = dev Tier 2 avec clé Anthropic/OpenAI (risque financier) → active le chiffrement.

### 2. Isolation Web Worker — **différée à V1.5 (ticket séparé, créé immédiatement)**

- Premier rempart déjà solide : CSP strict + zéro injection HTML dynamique non sanitisée + HSTS.
- V1 ship avec la clé accessible au main thread (acceptable pour le défaut plain).
- V1.5 : décryptage + `fetch` OpenRouter depuis un Web Worker sandboxé → la clé n'est jamais dans le main thread. Conditionné au décollage d'adoption observé.
- **Obligation** : ticket Linear créé dès la validation de cette ADR — pas de "on verra plus tard".

### 3. Rate limiting — **client-side soft only en V1, pas d'Edge Function proxy**

- Compteur quotidien dans IndexedDB + badge UI "X / ~250 requêtes aujourd'hui" (transparence pédagogique).
- Backoff exponentiel sur HTTP 429, circuit breaker après 3 erreurs consécutives.
- **Pas de proxy serveur V1** : proxifier = middleman = contredit ADR-002 + nouvelle surface d'attaque. OpenRouter applique déjà ses limites par compte.
- V2 si abus réel observé en prod → nouvelle ADR, pas par anticipation.

### 4. Agent `prompt-guardrail-auditor` — **créé AVANT l'implémentation**

- Agent local (`.claude/agents/prompt-guardrail-auditor.md`), modèle **Sonnet** (judgment call, pas pattern-matching).
- Teste une batterie de jailbreaks OWASP LLM Top 10 contre chaque version du system prompt socratique.
- CRITICAL si une injection passe (ignore instructions, leak system prompt, sortie destructive sans warning).
- Obligatoire avant chaque PR qui modifie `systemPrompt.ts`.
- Créé avant l'implémentation pour éviter un blocker surprise en fin de chantier.

## Séquence d'exécution

1. Doc alignment (plan.md 7b + mémoire + ROADMAP) — **cette PR**
2. ADR-005 (ce document) — **cette PR**
3. Agent `prompt-guardrail-auditor` — PR suivante
4. Key manager V1 (localStorage plain + opt-in IndexedDB + Web Crypto)
5. `AiTutorPanel` + fetch OpenRouter + system prompt + sanitizer/post-filter
6. Onboarding UX (`AiKeySetup` + `AiConsentModal` + lien Module 11)
7. Audit final `security-auditor` + `prompt-guardrail-auditor` → PR finale
8. Web Worker isolation — V1.5 post-ship

## Conséquences

### Positives
- V1 shippable rapidement — aucun blocker architectural non-résolu
- Progressive disclosure : zéro friction pour Tier 0 free, sécurité max opt-in pour Tier 2
- Agent guardrail crée le test harness avant l'implémentation, pas après
- Décisions tracées : chaque report à V1.5 est documenté, pas oublié

### Négatives / risques
- Plain localStorage par défaut = clé lisible par extensions browser → mitigé par warning explicite + opt-in chiffrement
- Pas de rate limit hard V1 → si un user partage massivement sa clé OpenRouter, problème OR↔user, pas notre responsabilité
- Sonnet pour l'agent guardrail = coût API (budget Thierry, ~quelques euros par audit)

### Alternatives rejetées
- **Supabase Vault server-side decryption** : contredit ADR-002 "zéro clé serveur"
- **Passphrase obligatoire pour tous les tiers** : friction prohibitive pour A1 CEFR étudiant précaire
- **Edge Function proxy rate-limit V1** : anticipation sans signal d'abus observé, contredit ADR-002, nouvelle surface
- **Agent guardrail créé après implémentation** : anti-pattern "tests à la fin", blocker surprise au merge final

## Sécurité

- **OWASP LLM Top 10** appliqué : LLM01 (prompt injection), LLM02 (insecure output), LLM06 (sensitive data), LLM08 (excessive agency), LLM09 (overreliance)
- **Clé API = donnée personnelle RGPD** → droit à la suppression via bouton "Oublier ma clé" + `localStorage.clear()` ou `indexedDB.deleteDatabase`
- **System prompt versionné** en DB Supabase (`ai_system_prompts` : version, content, created_at, deprecated_at) pour audit rétroactif
- **CSP** : ajouter `https://openrouter.ai`, `https://api.anthropic.com`, `https://api.openai.com` dans `connect-src` (vercel.json) au moment de l'implémentation de `AiTutorPanel`

## Mémoires liées
- `project_ai_agent_byok.md` (mise à jour en même temps que cette ADR)
- `project_platform_vision_v2.md`
- `feedback_doc_alignment.md`
