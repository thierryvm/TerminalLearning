# Doc Coverage Map — Vision LTI/multi-rôles/dashboard

**Date** : 21 mai 2026
**Auteur** : @cc-tl (Opus 4.7)
**Type** : Index consolidation (Option D, audit léger) — pas un audit transverse complet
**Budget consommé** : ~4% quota (sur 5% target)
**Méthode** : grep balayage 7 docs + lecture ciblée Linear THI-235 umbrella (description seule, sous-tickets non lus)

---

## TL;DR

- **LTI 1.3 / multi-rôles / dashboard sont bien couverts par les docs existantes** (plan.md, ROADMAP, audit V2, THI-235 umbrella) — pas besoin d'un 9e document de vérité.
- **3 vrais gaps de documentation** : gradebook/LTI AGS, xAPI/learning record store, SAML institutional. Le dashboard live (Sprint 2.D, 1-4 juin) est planifié mais pas encore conçu en détail.
- **Recommandation** : pas d'audit B lourd. Attaquer directement l'exécution Sprint 2.B + 2.D selon THI-235.

---

## Tableau Couverture × Source

| Sujet | plan.md | ROADMAP | Audit V2 (24/04) | AI Tutor audit | Agents doctrine | STORY | CHANGELOG | CLAUDE.md | THI-235 | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| **5 rôles RBAC** (super_admin/inst_admin/teacher/pending/student) | ✅ | ✅ | 🟡 mentionné | — | 🟡 contexte | ✅ | ✅ | ✅ | ✅ migrations 005+016-021 | ✅ |
| **Workflow pending_teacher → teacher (approbation)** | 🟡 | 🟡 | — | — | — | 🟡 | 🟡 | — | ✅ Sprint 2.B planifié | 🟡 |
| **UX multi-rôles (route per role, adaptive routing)** | ✅ | 🟡 | — | — | — | ✅ | ✅ | — | ✅ Sprint 2.A 2.ter livré | ✅ |
| **Table `institutions`** | ✅ | ✅ | ✅ | — | 🟡 inst-rbac-auditor | 🟡 | ✅ | — | ✅ | ✅ |
| **Table `classes` + `class_enrollments` + `invitation_code`** | ✅ migrations 016-021 | ✅ | — | — | — | ✅ | ✅ | — | ✅ Sprint 2.A livré | ✅ |
| **Table `assignments` (leçons assignées teacher)** | ❌ | ❌ | ❌ | — | — | ❌ | ❌ | — | ❌ | ❌ MANQUANT |
| **Table `grades` / gradebook** | ❌ | ❌ | ❌ | — | — | ❌ | ❌ | — | ❌ | ❌ MANQUANT |
| **Table `lti_deployments`** | 🟡 | 🟡 | ✅ ADR-006 mentionné | — | — | 🟡 | ✅ migration 013 lti_launches | — | — | 🟡 spike LTI archivé |
| **LTI 1.3 OIDC + JWKS + verifyJwt** | ✅ Phase 7c spike | ✅ | ✅ ADR-006 cible | 🟡 H4-AI gate | — | ✅ | ✅ jose@6 PR #236 | ✅ | — | ✅ SPIKE livré, full activation différée |
| **LTI AGS (Assignment Grade Service)** | 🟡 | 🟡 | ✅ « AGS activé » audit V2 | — | — | 🟡 | 🟡 | — | — | 🟡 mentionné, pas conçu |
| **xAPI / cmi5 / learning record store** | ❌ | ❌ | ❌ | — | — | ❌ | ❌ | — | ❌ | ❌ MANQUANT |
| **SAML institutional SSO** | ❌ | ❌ | ❌ | — | — | ❌ | ❌ | — | ❌ | ❌ MANQUANT (LTI-first by design ?) |
| **OAuth GitHub + Google live** | ✅ Phase 3.5 | ✅ | ✅ | — | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Interface teacher pour assigner leçons / cohortes** | 🟡 Sprint 2.A list/create | 🟡 | — | — | — | ✅ | ✅ | — | 🟡 v1.1 différé (edit/delete classes) | 🟡 v1 partiel |
| **Parcours custom (sequences de leçons)** | ❌ curriculum hardcoded | ❌ | ❌ | — | — | ❌ | ❌ | — | ❌ | ❌ MANQUANT |
| **Dashboard `/app/admin` LIVE data (Supabase/Sentry/Vercel)** | 🟡 « maquette enrichie » | 🟡 | — | — | — | 🟡 | ✅ Sprint 2.D planifié | — | ✅ Sprint 2.D 1-4 juin THI-234 lite | 🟡 planifié non livré |
| **Heatmap activité élèves (GitHub-style 52 semaines)** | 🟡 skeleton 91j | 🟡 | — | — | — | — | 🟡 | — | 🟡 différé v1.1 | 🟡 |
| **Tickets support in-app + Resend** | ✅ Sprint 2.C plan | 🟡 | — | — | — | 🟡 | ✅ Resend setup | — | ✅ Sprint 2.C 28-31 mai | ✅ planifié |
| **Bonus : modèle affiché dans drawer Tuteur IA** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ NON TRACÉ |

---

## Gaps réels (vrais trous de documentation)

1. **`assignments` + `grades` tables** — aucune doc projet ne formalise comment un teacher assigne une leçon à une cohort, ni comment les résultats sont stockés. C'est implicite dans la table `progress` actuelle (per user, per lesson) mais pas dans une logique cohorte/assignation.
2. **xAPI / cmi5** — zéro mention. Si TL vise institutional LRS futurs (besoin documenté par certaines écoles), il faut une ADR.
3. **SAML** — zéro mention. Décision implicite « LTI 1.3 only » dans audit V2, mais devrait être tracé en ADR (LTI vs SAML vs OAuth IdP).
4. **Parcours custom (lesson sequences par teacher)** — curriculum hardcoded en code. Pas de mécanisme DB pour qu'un teacher crée son propre parcours. Gros sujet UX teacher si LTI vise vraiment "Moodle replacement".
5. **Bonus drawer Tuteur IA model header** — non tracé. À créer comme ticket Linear hors session quand budget permet.

---

## Recommandation

**Pas d'audit B lourd nécessaire.** Les docs existantes (`plan.md` + `ROADMAP.md` + audit V2 + THI-235 umbrella) couvrent 80% du scope LTI/multi-rôles/dashboard. Les 5 vrais gaps ci-dessus se traitent en **3-5 ADRs ciblées** (1-2 pages chacune), pas un audit massif. Attaquer directement Sprint 2.B → 2.E (THI-235 in progress) selon le plan déjà verrouillé. Créer les ADRs au fil de l'eau quand le scope LTI complet (post-deadline 10 juin) sera planifié.

**Ticket bonus à créer manuellement par @thierry hors session** : « UX : afficher modèle actif (Sonnet 4.6 / Llama 3.3 / etc.) dans header drawer Tuteur IA » — priorité Low, scope `AiTutorPanel.tsx` header.
