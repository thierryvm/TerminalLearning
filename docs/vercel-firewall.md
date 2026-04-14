# Vercel Firewall — Terminal Learning

> Configuration du WAF Vercel pour terminallearning.dev.
> Toute modification doit être appliquée **via l'API REST** (pas via `vercel.json`), documentée ici, et testée avec l'agent `vercel-firewall-auditor`.

## Identifiants

| Clé           | Valeur                                  |
|---------------|-----------------------------------------|
| Team          | `team_1OqGNo4IePhrMgU0nfCnuqyK`         |
| Project       | `prj_mfBbwmor5DhN57SEasB1RtYAFE5m`      |
| WAF config    | `waf_YU6q43MK7LUx`                      |
| Plan          | Hobby (limite Bot Protection = log only) |

## Endpoints API utilisés

```
GET   https://api.vercel.com/v1/security/firewall/config?projectId=...&teamId=...
PATCH https://api.vercel.com/v1/security/firewall/config?projectId=...&teamId=...
```

Header requis : `Authorization: Bearer <VERCEL_TOKEN>`.
**Le token n'est jamais commité.** Utiliser une variable d'environnement en session uniquement et **révoquer** après usage via https://vercel.com/account/tokens.

## Managed rules — état

| Ruleset           | Actif | Action |
|-------------------|-------|--------|
| bot_protection    | ✅    | log (Hobby = block/challenge indisponible) |
| owasp.xss         | ✅    | log    |
| owasp.sqli        | ✅    | log    |
| owasp.rce         | ✅    | log    |
| owasp.gen         | ✅    | log    |
| owasp.lfi/rfi/php/ma/sd/sf/java | ❌ | log |
| ai_bots           | ❌    | —      |
| vercel_ruleset    | ❌    | —      |

## Custom rules — actives

### Rule 1 — Block Common Attack Paths
- **ID** : `rule_block_common_attack_paths_vdZOUZ`
- **Action** : `deny` (403 avec header `x-vercel-mitigated: deny`)
- **Type** : `path` avec opérateur `re` (regex)
- **Pattern** :
  ```
  ^/(wp-admin|wp-login\.php|wp-content|wp-includes|wp-config|xmlrpc\.php|\.env|\.git|phpmyadmin|phpMyAdmin|pma|administrator|wordpress|adminer|cgi-bin)
  ```
- **Rationale** : chemins que jamais aucun user légitime ne visite sur un SPA Vite. Bloque les scanners WordPress/Joomla/phpMyAdmin avant qu'ils ne consomment une invocation Fluid Compute.
- **Faux positifs possibles** : aucun identifié. `.env` et `.git` ne sont pas servis en prod (`.gitignore` + Vite dist).

### Rule 2 — Block Scanner User Agents
- **ID** : `rule_block_scanner_user_agents_JRvc3A`
- **Action** : `deny`
- **Type** : `user_agent` avec opérateur `sub` (substring, case-sensitive)
- **Condition groups** (OR logique entre les groupes) :
  `sqlmap` · `nikto` · `acunetix` · `nuclei` · `masscan` · `gobuster` · `dirbuster` · `feroxbuster` · `wpscan` · `nessus` · `openvas` · `zgrab` · `CensysInspect`
- **Rationale** : UAs utilisés presque exclusivement par des scanners offensifs. `curl`, `wget`, `python-requests` et navigateurs ne sont **pas** bloqués — devs et outils légitimes préservés.
- **Limite connue** : case-sensitive. Un attaquant peut changer `sqlmap` en `SQLMAP` — c'est une limite de l'opérateur `sub`. Acceptable : la majorité des bots utilisent la casse par défaut.

## Tests de validation (exécutés le 14 avril 2026)

| Requête                              | Attendu | Obtenu        |
|--------------------------------------|---------|---------------|
| `GET /wp-admin`                      | 403     | 403 ✅ `x-vercel-mitigated: deny` |
| `GET /xmlrpc.php`                    | 403     | 403 ✅         |
| `GET /` (navigateur)                 | 200     | 200 ✅         |
| `GET / -A "sqlmap/1.7"`              | 403     | 403 ✅         |
| `GET / -A "Mozilla/5.0 ..."`         | 200     | 200 ✅         |

## Procédure de rollback

Si une rule cause un faux positif en prod :

1. **Désactiver sans supprimer** (réversible en 1 call) :
   ```bash
   curl -X PATCH -H "Authorization: Bearer $VERCEL_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"action":"rules.update","id":"<RULE_ID>","value":{"active":false}}' \
     "https://api.vercel.com/v1/security/firewall/config?projectId=prj_mfBbwmor5DhN57SEasB1RtYAFE5m&teamId=team_1OqGNo4IePhrMgU0nfCnuqyK"
   ```

2. **Supprimer définitivement** :
   ```bash
   curl -X PATCH -H "Authorization: Bearer $VERCEL_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"action":"rules.remove","id":"<RULE_ID>"}' \
     "https://api.vercel.com/v1/security/firewall/config?projectId=prj_mfBbwmor5DhN57SEasB1RtYAFE5m&teamId=team_1OqGNo4IePhrMgU0nfCnuqyK"
   ```

3. **Désactiver tout le firewall** (dernier recours) :
   ```bash
   curl -X PATCH -H "Authorization: Bearer $VERCEL_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"action":"firewallEnabled","value":false}' \
     "https://api.vercel.com/v1/security/firewall/config?projectId=prj_mfBbwmor5DhN57SEasB1RtYAFE5m&teamId=team_1OqGNo4IePhrMgU0nfCnuqyK"
   ```

L'UI Vercel (`/[team]/terminal-learning/firewall`) permet aussi ces actions en 1 clic.

## Limitations du plan Hobby

- **Bot Protection** bloqué en mode `log` uniquement — impossible de passer en `challenge`/`block`
- **Rate limiting firewall-level** indisponible → si besoin, passer par un middleware Vercel ou upgrade Pro
- **BotID avancé** nécessite Pro
- **Quota custom rules** : à ce jour 2/N utilisées (limite exacte non documentée publiquement)

## Évolutions futures

- [ ] Si upgrade Pro : passer `bot_protection` en `challenge`, activer `ai_bots`, considérer `vercel_ruleset`
- [ ] Après Phase 9 admin panel : afficher les métriques firewall dans le Security Center
- [ ] Ajouter rule IP-based si des IPs récurrentes apparaissent dans les Denied IPs (scan hebdomadaire manuel ou via agent)
- [ ] Considérer un middleware Vercel pour rate-limiter `/auth/*` une fois migré en API routes (actuellement Supabase gère côté serveur externe)

## Traçabilité

- **Créé le** : 14 avril 2026
- **Par** : Claude Code session (Opus 4.6) via API REST Vercel
- **Référence agent** : `.claude/agents/vercel-firewall-auditor.md`
- **Entrée CHANGELOG** : Durcissement firewall Vercel (14 avril 2026)
