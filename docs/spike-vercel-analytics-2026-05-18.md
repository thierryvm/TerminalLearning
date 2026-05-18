# Spike — Vercel Analytics API access for custom admin dashboard

**Date** : 18 mai 2026 · **Durée** : 30 min · **Sprint 2.5 / S1 task 3**

## Question

Phase 9 Admin Panel (deadline 10 juin) doit afficher des widgets analytics dans un dashboard custom (`/admin` route). Vercel expose-t-il une API REST publique pour récupérer Web Analytics data (page views, top pages, referrers, countries) **côté budget 0€ (Hobby plan)** ?

## Findings

### 1. Pas d'API REST publique Web Analytics direct

Vercel Web Analytics (`/docs/analytics`) n'expose **aucun endpoint REST direct** pour fetch les page views ou top pages. Le seul mécanisme officiel pour accéder à la data programmatiquement est **Drains**.

### 2. Vercel Drains — Pro plan obligatoire ($20/mois)

Source : https://vercel.com/docs/drains#usage-and-pricing (last_updated 2026-03-04)

> "Drains are available to all users on the Pro and Enterprise plans. If you are on the Hobby or Pro Trial plan, you'll need to upgrade to Pro to access drains."

Pricing additionnel : **$0.50 / volume drained** (probablement par GB ou par 1M events selon le contexte — à confirmer si on bascule Pro).

**Flow Drains** : Vercel push event JSON/NDJSON vers endpoint custom HTTPS → on stocke en Supabase → on agrège pour dashboard `/admin`. Schema riche (`vercel.analytics.v2`) : eventType, path, route, country, region, city, OS, browser, deviceType, etc.

### 3. CSV export manuel — limite 250 entries

Source : https://vercel.com/docs/analytics

> "You can export up to 250 entries from the panel as a CSV file."

Manuel, pas adapté à un dashboard live.

### 4. Speed Insights — même contrainte

Speed Insights data accessible aussi via Drains uniquement (`/docs/drains/reference/speed-insights`). Pro plan required.

## Décision — Phase 9 v1 scope révisé pour budget 0€

| Option | Coût | Effort | MVP-ready pour 10 juin ? |
|---|---|---|---|
| A. Upgrade Pro Vercel + activer Drains + Supabase store + custom widget | **$20/mois** | 3-4j | ✅ Oui mais hors budget bénévole |
| B. Embed iframe Vercel dashboard public | 0€ | 30 min | ⚠️ Possible mais auth issues iframe à valider |
| C. Self-hosted Umami / Plausible | 0€ infra VPS gratuit | 2-3j + maintenance | ⚠️ Réinvente Vercel Analytics |
| D. Tracking custom event → POST → Supabase | 0€ | 2j + privacy/RGPD à valider | ⚠️ Réinvente Vercel Analytics |
| **E. Différer analytics intégration → Phase 9 v2 post-deadline** | **0€** | **0** | **✅ Recommandé MVP** |

### Plan révisé Phase 9 v1 (recommandation orchestrateur)

**MVP 10 juin** — widgets disponibles gratuitement et déjà en place :

1. **Supabase health widget** : nb users actifs last 7d, nb lessons completed last 30d, top modules (data déjà dans table `progress` via Supabase REST + RLS service_role read côté admin)
2. **Sentry events widget** : last 24h errors / warnings (Sentry API gratuit pour les projets open-source, free tier 5K events/mois suffit)
3. **Application health** : status RLS policies, RPC calls réussis vs erreur, Supabase Auth events count (via supabase-js admin query)
4. **Vercel dashboard link** (placeholder élégant) : bouton "Voir analytics détaillées sur Vercel" → ouvre `https://vercel.com/thierry-vanmeeterens-projects/terminal-learning/analytics` (les admins TL ont accès, les autres voient un message "Analytics avancées disponibles avec l'édition Établissement")
5. **THI-77 student heatmap** : data dans Supabase `progress` table, agrégat per day, palette emerald (GitHub-style)

**v2 post-deadline 10 juin** (si écoles paient ou si revenus permettent) :
- Upgrade Pro Vercel ($20/mois)
- Endpoint `api/drains/analytics` reçoit Vercel events
- Table Supabase `analytics_events` (RLS read super_admin only)
- Agrégats temps réel dans dashboard `/admin/analytics`
- Migration progressive du placeholder link vers widget natif

### Implications stratégiques

- **Budget 0€ tenu** : la deadline 10 juin reste atteignable
- **Crédibilité écoles préservée** : Supabase health + Sentry + Vercel link suffisent pour démontrer "plateforme monitorée". Les écoles veulent voir qu'il y a une supervision, pas forcément un dashboard avec 50 KPIs custom
- **Path d'upgrade clair** : si une école paye à un moment donné, Pro Vercel s'auto-finance instantanément ($20/mois < prix d'une école payante)
- **Pas de scope creep** : Phase 9 v1 reste à 3-5j effort réalisable, v2 reportée proprement

## Actions immédiates Sprint 1

- ✅ Spike documenté (ce fichier)
- ⏭️ Mettre à jour issue umbrella Phase 9 Linear avec scope révisé (task 4 Sprint 1)
- ⏭️ Pas de Drains setup ce Sprint 2.5 — différé Phase 9 v2 post-deadline
- ⏭️ Vérifier accès Sentry API REST pour widget v1 (task à programmer Sprint 3)

## Références

- Drains overview : https://vercel.com/docs/drains
- Analytics schema v2 : https://vercel.com/docs/drains/reference/analytics
- Pricing : https://vercel.com/docs/drains#usage-and-pricing
- TL plan actuel : Hobby (vérification @thierry possible via dashboard Vercel mais traces existantes suggèrent fortement Hobby)
