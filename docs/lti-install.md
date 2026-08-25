# LTI 1.3 — Installation guide & honest scope

> **Audience** : décideurs pédagogiques, admins LMS (Smartschool / Moodle / Canvas), institutions publiques (AVIQ, Forem, Bruxelles Formation, CFA, EFP, hautes écoles, secondaires).

> **Statut** : 🟡 **V1 (Auth MVP)** — sortie prévue **10 juin 2026**. SSO LTI 1.3 fonctionnel. Grade passback en V1.1 (Q3 2026). Lire la section *Roadmap honnête* ci-dessous avant intégration.

---

## Pitch en 30 secondes

Terminal Learning est un **outil pédagogique spécialisé** (pas un LMS). Vous gardez Smartschool / Moodle / Canvas comme plateforme principale. Terminal Learning s'intègre dedans en **1 clic** via le standard **LTI 1.3**. Vos élèves arrivent identifiés depuis votre LMS, pas de second login, pas de second mot de passe.

## Roadmap honnête (V1 → V2)

| Phase | Date | Ce que ça fait | Ce que ça ne fait pas (encore) |
|---|---|---|---|
| **V1 — SSO Auth MVP** | 10 juin 2026 | Un élève / prof connecté dans votre LMS arrive identifié dans Terminal Learning en 1 clic. Le rôle LMS (Instructor / Learner / Administrator) est mappé sur le rôle Terminal Learning (teacher / student / institution_admin) | Le score de l'élève ne remonte **pas** automatiquement dans votre gradebook LMS. L'élève doit afficher sa progression manuellement (capture d'écran ou export) |
| **V1.1 — AGS grade passback** | Q3 2026 | Le score module complété remonte automatiquement dans le gradebook de votre LMS (Canvas Assignment, Moodle Grade Item, Smartschool note) | NRPS roster sync, Deep Linking 2.0 |
| **V2 — Plateforme complète** | Q4 2026+ | NRPS (le LMS pousse la liste des élèves d'une classe vers TL), Deep Linking (le prof choisit la leçon précise depuis l'interface du LMS) | — |

> **Transparence B2B** : nous préférons annoncer un V1 honnête qui marche qu'un V2 bâclé qui ne marche pas chez vous. Le grade passback (V1.1) est planifié, pas vendu maintenant.

---

## Plateformes supportées V1

| LMS | Statut V1 | Note |
|---|---|---|
| **Canvas Cloud** (`canvas.instructure.com`) | ✅ Supporté | JWKS URI hardcodé, testé sur Canvas Free-for-Teacher sandbox |
| **MoodleCloud SaaS** (`moodlecloud.com`) | ✅ Supporté | JWKS via `.well-known/jwks.json`, validation Q3 2026 |
| **Smartschool** (`smartschool.be`) | ✅ Supporté | JWKS via `.well-known/jwks.json`, validation pilote Belgique 2026 |
| **Canvas self-hosted** | 🟡 V1.1 | Nécessite OIDC discovery (`/.well-known/openid-configuration`). Différé à V1.1 |
| **Moodle self-hosted** | 🟡 V1.1 | Idem self-hosted Canvas |
| **Google Classroom** | ❌ Hors LTI 1.3 | Google Classroom n'expose pas LTI. Un autre flux (Google OAuth) sera proposé en V2 |
| **Microsoft Teams Education** | ❌ Hors LTI 1.3 | Idem Google Classroom — MS Teams n'est pas LTI |

---

## Installation côté admin LMS (3 étapes)

> ⚠️ V1 — auth MVP : le grade passback n'est pas encore actif, donc certaines étapes (lineitem URL, AGS scope) ne sont **pas** à configurer pour le moment.

### 1. Récupérer les paramètres Terminal Learning

| Paramètre | Valeur |
|---|---|
| **Target Link URI** | `https://terminallearning.dev/app` |
| **Initiate Login URL** | `https://terminallearning.dev/api/lti/launch` |
| **Redirection URIs** | `https://terminallearning.dev/api/lti/launch` |
| **OIDC Initiation URL** | (à venir V1.1) |
| **Client ID** | Fourni par Terminal Learning à la demande (contact : thierryvm@gmail.com) |
| **Deployment ID** | Fourni par Terminal Learning à la demande |
| **JWKS URI Terminal Learning** | (à venir V1.1 — pas requis pour V1 unidirectionnel LMS→TL) |

### 2. Provisionner l'outil dans votre LMS

#### Canvas (Cloud)

1. **Admin** → **Developer Keys** → **+ LTI Key**
2. **Method** : Enter URL → coller `https://terminallearning.dev/api/lti/config.json` *(à venir, voir Roadmap)*
3. **Pour V1**, configurer manuellement avec les paramètres ci-dessus
4. Activer la clé LTI → noter le **Client ID** généré
5. **Sub-Accounts** → **Settings** → **Apps** → **+ App** → **By Client ID**

#### Moodle 3.9+

1. **Site administration** → **Plugins** → **Activity modules** → **External tool** → **Manage tools**
2. **Add tool** → Configuration manually
3. Tool URL : `https://terminallearning.dev/api/lti/launch`
4. LTI version : **1.3**
5. Public key type : **Keyset URL** → laisser vide pour V1 (V1.1)
6. Initiate login URL : `https://terminallearning.dev/api/lti/launch`

#### Smartschool (Belgique)

*Documentation à finaliser avec un partenaire pilote — contact thierryvm@gmail.com pour validation V1.*

### 3. Tester avec un compte de classe

1. Créer une activité LTI "Terminal Learning [TEST]" dans une classe sandbox
2. Cliquer l'activité depuis un compte élève → vous devez atterrir sur `https://terminallearning.dev/app` identifié
3. Cliquer depuis un compte enseignant → vous devez atterrir avec rôle teacher (visible dans le menu utilisateur en haut à droite)

---

## Architecture sécurité V1 (transparence)

### Ce qui est validé sur chaque launch

1. **Signature JWT RS256** — public key du LMS récupérée via JWKS endpoint, jamais transmise par l'élève
2. **Issuer (`iss`)** — allowlist stricte hardcodée (`canvas.instructure.com`, `moodlecloud.com`, `smartschool.be`) — pas de wildcard, pas de regex permissive
3. **Audience (`aud`)** — doit matcher le `client_id` provisionné chez vous, sinon rejet
4. **Expiration (`exp`)** — tolérance d'horloge stricte 30 secondes
5. **Issued At (`iat`)** — rejet si dans le futur au-delà de 30 secondes (anti-replay long terme)
6. **JWT ID (`jti`)** — anti-rejeu via nonce store mémoire + UNIQUE en base de données (replay block double couche)
7. **Algorithme** — `RS256` strict, `alg=none` et HMAC rejetés systématiquement
8. **Deployment ID** — claim LTI 1.3 obligatoire
9. **Target Link URI** — doit être same-origin `terminallearning.dev` (anti open redirect)
10. **Kid matching** — la clé publique JWKS correspondante est sélectionnée par jose (Web Crypto natif)

Audit : `.claude/agents/lti-auditor.md` exécuté avant chaque PR sécurité LTI.

### Ce qui est journalisé

Chaque tentative de launch (acceptée ou rejetée) est journalisée dans `lti_launches` (Supabase, table write-only, RLS service-role seulement). Données stockées : issuer, sub LMS, deployment ID, contexte (classe), rôles, outcome. **Aucune donnée pédagogique** (progression, scores) n'est partagée avec votre LMS en V1.

### Ce qui est exclu V1

- ❌ Grade passback (Phase V1.1)
- ❌ Roster sync NRPS (V2)
- ❌ Deep Linking 2.0 (V2)
- ❌ LTI 1.1 legacy (jamais — EOL)
- ❌ SCORM 2004 (jamais — standard ancien remplacé par LTI 1.3)

### Notes techniques pour les RSSI / DPO

- **CSP `connect-src`** : pas d'extension nécessaire en V1. Les fetches JWKS se font côté serveur (Vercel Function), pas côté navigateur. Le navigateur élève parle uniquement à `terminallearning.dev`.
- **CSP `frame-ancestors`** : les LMS allowlistés peuvent iframer Terminal Learning (`*.instructure.com`, `*.moodlecloud.com`, `*.smartschool.be`). Configuration dans `vercel.json` route `/lti` et `/api/lti`.
- **Données stockées hors UE** : Supabase héberge en `eu-west-1` (Irlande). Vercel Functions s'exécutent dans la région européenne par défaut. RGPD compliant.
- **Rotation des clés JWKS** : géré automatiquement par jose (`createRemoteJWKSet` cache 10 min, re-fetch transparent à expiration).
- **Audit log** : `lti_launches` table — service_role only — disponible sur demande pour audit RGPD ou enquête.

---

## Activation V1 (gate sécurité)

L'endpoint `/api/lti/launch` est **désactivé en production** par défaut (`LTI_ENABLED=false`). Le flag sera flippé à `true` quand :

- ✅ Première PR THI-131 (RS256+JWK+nonce store + 19 tests crypto) — *cette PR*
- 🔜 Migration `lti_launches` appliquée en prod Supabase (PR #2)
- 🔜 Endpoint `/api/lti/launch` migré pour appeler `verifyJwt()` (PR #2)
- 🔜 Mock LMS harness Playwright en CI (PR #3)
- 🔜 Audit `lti-auditor` PASS sur la chaîne complète
- 🔜 Validation pilote sur Canvas sandbox + 1 Smartschool partenaire

---

## Contact

- **Issues techniques** : github.com/thierryvm/TerminalLearning/issues
- **Demande de provisioning client_id / deployment_id** : thierryvm@gmail.com
- **RGPD / DPO** : thierryvm@gmail.com (Thierry, Belgique)
- **Tarification** : Terminal Learning est **gratuit pour les écoles**. Open source MIT.
