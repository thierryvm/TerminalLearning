# Stratégie — Dashboard super_admin fonctionnel + Sécurité 2026

> **Date :** 30 mai 2026
> **Auteur :** @cc-tl (Claude Code, Opus 4.8) — recherche web + synthèse, validé direction @thierry
> **Statut :** proposé — à valider avant exécution (Phase 9 re-cadrée)
> **Contexte déclencheur :** retour @thierry post-Sprint 2.C Étape 2 (PR #326) — « le dashboard super_admin n'est que du visuel, je ne sais même pas si les données sont live, je n'ai aucun moyen d'agir ; avec le système de tickets on n'a rien de concret. Cherche la meilleure approche, et enquête sur les failles 2026 / l'IA attaquante. »

---

## 0. Contexte & problème

### 0.1 État réel du dashboard (`/app/admin`)
Aujourd'hui **100 % skeleton** : 4 widgets (Santé Supabase, Événements Sentry, Santé application, Activité élèves) affichent des libellés « Données live disponibles bientôt » + une heatmap vide « Skeleton — 91 jours × 1 cellule ». **Zéro donnée live, zéro interaction, zéro moyen d'agir.** Le lien « Voir analytics détaillées sur Vercel » sort de l'app.

### 0.2 Besoins du super_admin unique (@thierry)
1. **Voir l'état réel** de la plateforme (users, leçons, erreurs, déploiements) — en **live**, pas en placeholder.
2. **Agir** depuis le dashboard (trier/résoudre les tickets, pas seulement regarder).
3. **Être notifié** sans dépendre de l'email (super_admin unique → besoin d'une alerte fiable).
4. **Piper facilement le contenu d'un ticket vers le dev (Claude)**, en tant que responsable technique.

### 0.3 Menace 2026 (recherche)
**Mythos** (Anthropic, avril 2026) prouve qu'une IA trouve/exploite des failles **au-dessus des experts humains** (faille 27 ans dans OpenBSD, 16 ans dans FFmpeg) — non public (Project Glasswing, ~50 partenaires défense). **On ne peut pas l'utiliser**, mais l'implication est nette : **l'attaquant 2026 = une IA qui chaîne des micro-failles automatiquement** (exactement ce que notre 2e passe `security-auditor` a démontré sur PR #326, finding H1). Doctrine : *assume AI-augmented attacker*.

---

## 1. Principes directeurs

1. **Sécurité découplée** — toute donnée privilégiée est autorisée/filtrée **côté serveur** (Edge Function + RLS), jamais par le frontend. Si le front est compromis, la donnée reste inaccessible.
2. **Least privilege partout** — RLS scoped, tokens tiers (GitHub/Vercel/Sentry) **uniquement côté serveur**, jamais dans le bundle client.
3. **Live > skeleton** — Supabase Realtime (websockets, inclus free tier) pour les données internes ; proxies serveur pour les API externes.
4. **Interactif > visuel** — chaque widget doit permettre une **action**, pas juste un affichage.
5. **$0 tant que possible** — free tier Supabase/Vercel ; Vercel Drains reste Pro-gated (différé).
6. **PII jamais dans les logs/observability** (RGPD) — scrubbing systématique.

---

## 2. Architecture dashboard

### 2.1 Sources de données

| Widget | Source live | Mécanisme sécurisé |
|---|---|---|
| **Tickets support** (1ère brique concrète) | `support_tickets` via **Supabase Realtime** | RLS super_admin (déjà en place, migrations 028/029/031) |
| Santé Supabase (users actifs, leçons) | `profiles` / `progress` REST | RLS, agrégats server-side |
| Activité élèves (heatmap THI-77) | `progress` (Realtime/REST) | RLS |
| GitHub (stars, issues, trafic) | GitHub API | **proxy Edge Function** (token serveur, jamais client) |
| Vercel (deploys, statut) | Vercel API | proxy Edge Function (token serveur) |
| Sentry (erreurs 24h) | Sentry API | proxy Edge Function |

### 2.2 Couche d'accès sécurisée
- **API externes (GitHub/Vercel/Sentry)** → Edge Functions Deno qui détiennent les tokens (`Deno.env`), vérifient le JWT super_admin (`verify_jwt` + `get_my_role() = 'super_admin'`), et ne renvoient que des agrégats non-sensibles. **Gate-zero : `supabase-backend-auditor`** (secret handling, BOLA, SSRF, CORS).
- **Données internes Supabase** → RLS existante, agrégats via vues ou RPC `SECURITY DEFINER` scoped super_admin.
- **Cache** → Vercel Runtime Cache / Edge Config pour limiter les appels API tiers (rate limits + coût).

### 2.3 Temps réel
**Supabase Realtime** : le dashboard s'abonne aux `INSERT/UPDATE` sur `support_tickets` (et `progress`) → mise à jour live + badge non-lus, **sans polling, sans email**. Inclus dans le free tier (dans les limites de connexions concurrentes — 1 super_admin = négligeable).

### 2.4 Interactivité
Section Tickets = liste filtrable (type bug/suggestion/question × statut open/in_progress/resolved/closed, index déjà présents), détail avec screenshot **re-signé à la lecture** (TTL 1h, jamais l'URL stockée), bouton **Marquer résolu** (RLS super_admin UPDATE, déjà testé E2E).

---

## 3. Pipeline ticket → dev (Claude, responsable technique)

**Besoin @thierry** : m'envoyer facilement le contenu d'un ticket.

- **v1 (immédiat, $0)** : bouton **« Copier pour le dev »** sur chaque ticket → génère un bloc markdown structuré (type, description, lien screenshot re-signé, contexte user non-PII, timestamp, ID) → @thierry colle dans notre session CC. Zéro infra.
- **v2 (plus tard — GO @thierry 30/05)** : **MCP maison « Terminal Learning Support »** — un serveur MCP custom qui expose les tickets directement dans la session CC du dev (Claude), avec des tools en **lecture seule par défaut** (`list_tickets`, `get_ticket`, `get_ticket_screenshot`) et éventuellement un `mark_triaged` scoped. Auth via clé service dédiée (scope minimal, jamais `service_role` complet), conforme **least-privilege ASI02/ASI03**. À construire quand le socle Phase 9.A/B est en place. Alternative légère intermédiaire : webhook qui pousse les tickets taggés `dev`, ou export batch markdown.

---

## 4. Notifications (super_admin unique)

| Niveau | Solution | Pourquoi |
|---|---|---|
| **v1** | Centre de notif **in-app Realtime** (badge + liste triée) | Pas d'email spam ; **pas d'URL signée dans un email** (évite le vecteur Chain C / fuite bearer) |
| **v1.5** | **Push PWA** (l'app est déjà une PWA) | Alerte même hors de l'app — essentiel pour un super_admin unique |
| optionnel | Email **digest quotidien** (jamais par ticket, jamais d'URL signée) | Filet, sans spam ni fuite |

**Décision produit** : ce plan **remplace l'Étape 3 « email Resend par ticket »** initialement prévue (plus utile + plus sûr + $0). Resend devient optionnel (digest) plus tard.

---

## 5. Sécurité 2026

### 5.1 Modèle de menace « Mythos-era »
Hypothèse de travail : l'attaquant dispose d'une IA capable de **scanner notre surface et chaîner des micro-failles** automatiquement. Conséquence : aucune faille « mineure » n'est négligeable (elle devient un maillon de chaîne), et le **defense-in-depth** + la **réduction de surface** priment sur l'obscurité.

### 5.2 OWASP Top 10 for Agentic Applications 2026 — mapping à nos surfaces
Référentiel publié déc. 2025, distinct du LLM Top 10 2025 : il cible l'**autonomie** (mémoire, tools, credentials, multi-agent). **Nous sommes une application agentique** (agents sécu + tuteur IA + handoffs).

| Risque | Notre exposition | À auditer |
|---|---|---|
| **ASI01 Agent Goal Hijack** | tuteur IA + agents lisant fichiers/issues externes | sanitizer, délimiteurs, role enforcement |
| **ASI02 Tool Misuse** | agents avec accès Bash/MCP/REST | least-privilege par agent, scopes tools |
| **ASI03 Identity & Privilege Abuse** | JWT, `service_role`, délégation | impersonation, fuite service_role |
| **ASI04 Agentic Supply Chain** | deps npm, MCP tiers, prompts importés | provenance, pinning |
| **ASI05 Unexpected Code Execution** | terminalEngine, futurs imports curriculum (X3b) | sandbox, validation |
| **ASI06 Memory & Context Poisoning** | **mémoire CC** + RAG futur | un memo empoisonné = décision biaisée |
| **ASI07 Insecure Inter-Agent Comm** | handoffs @cowork ↔ @cc-tl (vault Obsidian) | intégrité, authored_by |
| **ASI08 Cascading Failures** | cascade d'audits, dynamic workflows | isolation |
| **ASI09 Human-Agent Trust Exploitation** | sur-confiance dans les verdicts d'agents | self-critique obligatoire (déjà en partie) |
| **ASI10 Rogue Agents** | goal drift, reward hacking | monitoring, human-in-loop |

Mitigations canoniques OWASP : **least privilege · isolation/sandbox · defense-in-depth · monitoring continu · human-in-loop sur actions critiques**.

### 5.3 Audit de nos agents de sécurité
Auditer nos agents existants (`security-auditor`, `llm-security-auditor`, `prompt-guardrail-auditor`, `supabase-backend-auditor`, `route-attack-auditor`, `institution-rbac-auditor`, etc.) contre :
1. **OWASP Agentic 2026** (couvrent-ils ASI01-10 ?).
2. **Le modèle Mythos** (savent-ils chaîner les micro-failles ? — le 2e passe `security-auditor` a prouvé que oui quand on le mandate explicitement → en faire une **doctrine systématique**, pas un one-shot).
3. **Least privilege de leurs propres tools** (un agent QA a-t-il accès à des tools qu'il ne devrait pas ?).

### 5.4 Terminal Sentinelle V2 — le pentester promis
V1 (PR #90, avril) = automation contenu sécurité, couplé TL. **V2 = harnais de pentest continu** :
- Agent/outil qui, **à chaque release**, rejoue des **chaînes d'attaque adversariales** contre nos surfaces (la méthode qui a trouvé H1 sur #326), **systématisé + récurrent + aligné OWASP Agentic 2026**.
- Sortie : rapport de chaînes (exploitable maintenant / latent / réfuté) avec preuves empiriques.
- C'est le « vérifier / tester / renforcer » demandé. Cross-projet à terme (TL + Ankora + GetPostCraft).

---

## 6. Séquencement proposé (Phase 9 re-cadrée : fonctionnel, pas visuel)

| Phase | Scope | Effort | Gate sécurité |
|---|---|---|---|
| **9.A** | Tickets live (Realtime) + triage (mark resolved) + bouton « Copier pour le dev » | ~moyen | réutilise #326 ; gates THI-297 (rendu JSX-only, magic-bytes si screenshot affiché) |
| **9.B** | Proxies Edge sécurisés (GitHub/Vercel/Sentry/Supabase) → widgets live | ~élevé | `supabase-backend-auditor` + `route-attack-auditor` obligatoires |
| **9.C** | Push PWA notifications | ~moyen | — |
| **Sécu (transverse, prioritaire)** | Audit agents vs OWASP Agentic 2026 + **Terminal Sentinelle V2** | ~élevé | méta |

---

## 7. Décisions à valider (@thierry)

1. **Pivot Étape 3** : email Resend par ticket → **centre de notif dashboard Realtime + push PWA** ? (reco : oui)
2. **Priorité** : sécurité-first (audit agents + Sentinelle V2) avant Phase 9.B, ou en parallèle ?
3. **Budget** : tout en free tier ($0) ; Vercel Drains (analytics avancées) reste différé (Pro $20/mois) ?

---

## 8. Risques & STOP

- ⚠️ **Edge Functions = nouvelle surface** (secrets, SSRF, CORS) → gate `supabase-backend-auditor` non négociable.
- ⚠️ **Realtime** : vérifier que les policies Realtime n'exposent pas de lignes hors scope super_admin.
- ⚠️ **Solo maintainer** : séquencer, ne pas tout ouvrir en parallèle.
- **STOP** : 1 CRITICAL non fixable, fuite secret, régression prod.

---

## Sources (recherche web 30/05/2026)
- Anthropic Mythos Preview — https://red.anthropic.com/2026/mythos-preview/
- Project Glasswing — https://www.anthropic.com/glasswing
- OWASP Top 10 for Agentic Applications 2026 — https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/
- OWASP Agentic (liste ASI01-10) — https://www.trydeepteam.com/docs/frameworks-owasp-top-10-for-agentic-applications
- Secure internal dashboards (RBAC / audit / decoupled) — https://blog.tooljet.com/build-secure-internal-dashboards-for-enterprises/
- Supabase × Vercel 2026 — https://kuberns.com/blogs/vercel-supabase/
