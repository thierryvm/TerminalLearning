# ADR-006 — LTI 1.3 Implementation Strategy

**Date**: 24 avril 2026
**Status**: Proposed (SPIKE validation pending)
**Décideurs**: Thierry (owner), Claude (architecte)
**Lien ADR-001**: Positionnement LTI-first confirmé. ADR-006 = implémentation concrète.

---

## Contexte

ADR-001 a positionné Terminal Learning comme **outil pédagogique spécialisé LTI 1.3-compliant**, délégant les briques génériques (gradebook, calendrier, messagerie) au LMS hôte. Deux ans après, l'architecture est stable (Phases 1-7 livrées), l'occasion d'implémenter le pont LTI manquant.

**Problème**: Zero code LTI malgré ADR-001 accepté il y a un mois crée un fossé stratégie ↔ exécution. B2B institutional adoption impossible sans `/api/lti/launch`.

**Audit externe @cowork** (24 avril) confirme: LTI est la priorité #2 après Phase 7b (AI Tutor) complétée.

---

## Décision

**Terminal Learning implémente LTI 1.3 (1.3 only, pas 1.1 legacy) avec AGS grade passback, NRPS roster optional, DL 2.0 deep linking optional.**

### Scope LTI 1.3 minimum viable

| Composant | Inclus? | Pourquoi |
|-----------|---------|---------|
| **LTI Core (OAuth 2.0 JWT)** | ✅ | Fondation: LMS → Terminal Learning JWT auth |
| **Assignment and Grade Services (AGS)** | ✅ | Critère: étudiant complète module → note dans gradebook LMS |
| **Names and Roles Provisioning Service (NRPS)** | 🔹 Optional (V2) | Roster sync: utile mais non-bloquant MVP |
| **Deep Linking 2.0 (DL 2.0)** | 🔹 Optional (V2) | Content selection UI: nice-to-have post-MVP |
| **LTI 1.1 legacy** | ❌ | EOL, complexity non-justifiée, focus 1.3 |
| **SCORM 2004** | ❌ | Standard vieillissant < LTI 1.3 |

### Implémentation choisie

**Architecture LTI 1.3 client-side** (Terminal Learning = "tool", LMS = "platform"):

1. **JWT flow**:
   - LMS envoie POST `/api/lti/launch` avec JWT signé OIDC (`id_token`)
   - Terminal Learning valide la signature (public key de LMS via `/.well-known/openid-configuration`)
   - Extrait claims: `sub` (user ID LMS), `name`, `email`, `roles` (array)

2. **User mapping**:
   - LMS `roles`: `http://purl.imsglobal.org/vocab/lis/v2/institution/person#Instructor` → TL `teacher`
   - LMS `roles`: `http://purl.imsglobal.org/vocab/lis/v2/institution/person#Learner` → TL `student`
   - LMS `roles`: `http://purl.imsglobal.org/vocab/lis/v2/institution/person#Administrator` → TL `institution_admin`
   - Mapping stored in `lti_users` table (Supabase RLS enforced)

3. **Session creation**:
   - POST `/api/lti/launch` crée ou récupère user dans Supabase `auth.users` (via Admin API)
   - Injecte Supabase JWT + refresh token dans session (HttpOnly cookies)
   - Redirect user vers `/dashboard` (ou module entré via DL 2.0 plus tard)

4. **Grade passback (AGS)**:
   - Étudiant complète lesson → `ProgressContext` emits `progress_update`
   - Background job (edge function ou async handler) calcule note (%) et POST vers `lineitem.url` (AGS endpoint du LMS)
   - Signature HTTPS + Bearer token fourni par LMS à l'installation

5. **LMS platforms supported** (tested in SPIKE):
   - **Canvas** (Free-for-Teacher sandbox) — SPIKE validation
   - **Moodle** 3.9+ (post-MVP, Phase 7c)
   - **Smartschool** (Belgique) (post-MVP, Phase 7c)

### Role mapping détaillé

| LMS Role URI | LMS Label | TL RBAC | Permissions TL |
|---|---|---|---|
| `...person#Instructor` | Teacher | `teacher` | Full module access, grade view, class roster |
| `...person#Learner` | Student | `student` | Assigned modules only, progress tracking |
| `...person#Administrator` | Admin | `institution_admin` | Dashboard access, usage analytics |
| (none/unknown) | (uncategorized) | `student` (default) | Minimal sandbox access |

---

## Conséquences

### Positives

- **Adoption virale via LMS**: Installation en 1 clic dans Moodle/Canvas → adoption N écoles en parallèle (vs growthhacking solo)
- **Gradebook integration**: Parents/admin vu notes TL dans leur gradebook habituel → credibilité institutionnelle
- **RBAC enforcement at LMS level**: LMS décide qui peut accéder → zéro permission bloat TL
- **Defensible dans écoles**: "Terminal Learning = activity dans votre LMS, données restent chez vous"

### Negatives / Risques

- **SPIKE Unknowns** (à clarifier):
  - Canvas JWT signature validation: clock skew tolérances?
  - AGS endpoint auth: Bearer token format exact?
  - Moodle/Smartschool LTI 1.3 support: versions min?
- **Security surface**: JWT trust chain + public key validation = critère de sécurité (security-auditor mandatory)
- **Testing burden**: E2E Playwright + Canvas sandbox maintien nécessaire (vs standalone-only tests)
- **Data sovereignty**: Grade passback = Terminal Learning envoie data au LMS → RLS évalué pour leakage (auditeur sécurité)

### Alternatives rejetées

- **Full LMS replacement** (Moodle fork): 5+ ans effort, burnout garantie. ADR-001 rejetée déjà.
- **SCORM 2004**: Standard EOL, moins capable que LTI 1.3, LMS modern adoptent 1.3.
- **Standalone + spreadsheet export**: Zéro integration, écoles déjà saturées d'outils disconnectés.
- **LTI 1.1 legacy support**: Complexity non-justifiée, EOL, focus 1.3 only.

---

## Implémentation détail technique (SPIKE phase)

### Phase SPIKE (THI-127, 1 week diffuse)

**Objectif**: Valider Canvas JWT flow + AGS basics, documenter unknowns.

1. **Canvas Free-for-Teacher setup**
   - Deploy Terminal Learning sur Preview URL Vercel
   - Register LTI 1.3 app in Canvas (manual steps or API)
   - Document Canvas LTI settings (public key URL, redirect URI, etc.)

2. **Minimal `/api/lti/launch` endpoint**
   - Validate JWT (Canvas public key from `/.well-known/openid-configuration`)
   - Extract claims, log to Sentry (zero prod data persist yet)
   - Return redirect to `/lti-test-page` (proof of auth flow)

3. **Canvas test activity**
   - Crée activity "Terminal Learning [TEST]" in Canvas sandbox course
   - Click → `/api/lti/launch` called with Canvas JWT
   - Verify Terminal Learning receives JWT + claims
   - Document token format, claim names, any surprises

4. **ADR-006 refinement**
   - Update assumptions based on Canvas testing
   - Document unknowns → Phase 7c backlog

### Phase 7c (THI-131, 4-6 weeks after Phase 7b done)

1. **Full Supabase integration**
   - `lti_users` table (sub, lms_platform, roles, created_at)
   - `lti_sessions` table (user_id, lms_context_id, lineitem_url)
   - RLS policies: user can only view own grades/module progress

2. **Grade passback (AGS)**
   - POST `/api/lti/grade-passback` endpoint
   - Triggered by progress completion → calculate score
   - POST to lineitem.url (Canvas AGS endpoint)
   - Retry logic + Sentry logging

3. **E2E Playwright suite**
   - Canvas sandbox: login → complete lesson → grade appears in gradebook
   - Error cases: invalid JWT, missing lineitem URL, etc.

4. **Moodle/Smartschool compat**
   - Test same `/api/lti/launch` with Moodle + Smartschool (post-Canvas validation)
   - Document platform-specific quirks

---

## Assumptions & Unknowns

| Assumption | Risk | SPIKE Action |
|---|---|---|
| Canvas provides public OIDC config at `/.well-known/openid-configuration` | HIGH | Fetch + validate URL structure |
| JWT exp claim is always present + correct | MEDIUM | Log exp claims from Canvas, monitor skew |
| AGS lineitem URLs are stable per user per course | MEDIUM | Document lineitem URL persistence |
| Supabase Admin API rate limits allow user creation per launch | MEDIUM | Test concurrent /api/lti/launch calls |
| HTTPS + Bearer token auth sufficient for AGS POST | MEDIUM | Verify Canvas AGS auth scheme |

---

## Testing Strategy (SPIKE + Phase 7c)

### SPIKE E2E (minimal)
```bash
# Canvas sandbox login flow
1. Click LTI activity in Canvas course
2. Redirect to terminallearning.dev/api/lti/launch?lti_message_hint=XXX
3. Browser receives JWT in POST body
4. Terminal Learning validates + logs
5. Redirect to /dashboard (or /lti-test-page)
6. Verify user created in Supabase (if testing)
```

### Phase 7c E2E (full)
```bash
# With Playwright
1. Canvas login (selenium/canvas API)
2. Enroll student + teacher
3. Teacher creates Terminal Learning activity, links to Module 3
4. Student clicks → Terminal Learning loads
5. Student completes Module 3 → progress saved
6. Teacher views Canvas gradebook → Module 3 score = X%
7. (Optional) Verify Deep Linking: teacher selects specific lesson via content browser
```

---

## Security & RLS

### JWT Validation
- **Public key trust**: Fetch Canvas public key from `.well-known/openid-configuration`, cache 24h
- **Signature verify**: ALWAYS verify HMAC-SHA256 (Canvas uses RS256 typically)
- **Exp + iat**: Verify `exp > now` and `iat < now + 5min` (clock skew tolerance)
- **Issuer claim**: MUST match expected Canvas instance URL

### RLS Policies
- `lti_users`: user_id can only view own row (privacy)
- `lti_sessions`: user_id can only manage own sessions
- Grade passback: only Terminal Learning (authenticated as app) can write lineitem scores

### Audit log
- Every `/api/lti/launch` logged: timestamp, LMS, user_id, role, result (success/failure)
- Every grade passback logged: lineitem_url, score, timestamp, response

---

## Effort Estimate

| Phase | Task | Effort | Risk |
|---|---|---|---|
| **SPIKE** | Canvas JWT validation | 1-2h | LOW (well-documented) |
| **SPIKE** | Endpoint `/api/lti/launch` skeleton | 2-3h | LOW |
| **SPIKE** | ADR-006 refinement doc | 1h | LOW |
| **Phase 7c** | User + session table design + RLS | 1 week | MEDIUM |
| **Phase 7c** | Grade passback (AGS) | 1 week | MEDIUM |
| **Phase 7c** | E2E Playwright suite | 1 week | MEDIUM |
| **Phase 7c** | Moodle + Smartschool compat | 1-2 weeks | HIGH (platform quirks) |
| **Total 7c** | **4-6 weeks** | | |

---

## Go/No-Go Criteria (SPIKE completion)

✅ **GO** if:
- Canvas JWT validation successful
- `/api/lti/launch` endpoint receives + parses JWT correctly
- No critical unknowns surface

🛑 **NO-GO** if:
- Canvas public key URL format incompatible
- JWT signature validation fundamentally broken
- AGS endpoint unreachable / auth scheme mismatch

---

## Related Mémoires

- `ADR-001-lti-first-positioning.md` (estratégie confirmée)
- `ADR-003-ttfr-kpi.md` (pédagogie KPI, LTI n'affecte pas)
- `project_platform_vision.md` (institutional adoption vision)
- `docs/audits/2026-04-24-cowork-external-audit-v2.md` (raison du SPIKE)
