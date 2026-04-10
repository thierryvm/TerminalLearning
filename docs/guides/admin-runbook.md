# Admin Runbook — Terminal Learning

> CONFIDENTIEL — Usage interne super admin uniquement
> Ne jamais exposer en production (`robots.txt` exclut `/help/admin`)
> Audience : `role = super_admin` (Thierry uniquement en Phase initiale)

---

## Contacts d'urgence

| Service | URL | Action d'urgence |
|---------|-----|-----------------|
| Supabase | supabase.com/dashboard | Pause project si compromis DB |
| Vercel | vercel.com/dashboard | Rollback deployment |
| Sentry | sentry.io | Voir erreurs temps réel |
| GitHub | github.com/thierryvm/TerminalLearning | Revert commit, disable Actions |

## Procédures critiques

### Suspendre un compte utilisateur

1. Admin Panel → Utilisateurs → [Email] → Suspendre
2. La suspension est immédiate (session révoquée)
3. L'utilisateur voit "Votre compte a été suspendu" à la prochaine connexion
4. Logger l'action dans `audit_log` avec la raison
5. Envoyer un email explicatif si suspension légitime (pas spam/abus)

### Rollback de contenu

1. Identifier le commit problématique : `git log --oneline`
2. Créer une branche hotfix : `git checkout -b hotfix/content-rollback`
3. Reverter : `git revert <commit-hash>`
4. PR + CI verte obligatoire avant merge
5. Si urgence absolue : `vercel rollback` sur le dashboard Vercel

### Incident de sécurité — procédure

1. **Containment** : suspendre les comptes concernés, révoquer les tokens
2. **Assessment** : identifier l'étendue (quels users, quelles données)
3. **Notification** : si données personnelles exposées → RGPD impose notification CNIL dans 72h
4. **Recovery** : corriger la vulnérabilité, déployer le fix
5. **Post-mortem** : documenter dans `docs/processes/incident-response.md`

### Demande de données RGPD (Article 15/17)

Voir `docs/processes/gdpr-data-request.md`

### Reset de progression utilisateur

1. Admin Panel → Utilisateurs → [Email] → Voir progression
2. Module par module → Réinitialiser
3. Ou : exécution SQL directe (Supabase Dashboard → SQL Editor) :
   ```sql
   DELETE FROM progress WHERE user_id = '<uuid>';
   DELETE FROM quiz_results WHERE user_id = '<uuid>';
   -- NE PAS supprimer le profil sauf demande explicite de l'utilisateur
   ```
4. Logger dans `audit_log`

## Surveillance hebdomadaire

- [ ] Vérifier Sentry : nouvelles issues non résolues
- [ ] Vérifier Terminal Sentinel (Phase 5.5) : rapport hebdomadaire
- [ ] Vérifier tickets ouverts avec priorité `high` ou `critical`
- [ ] Vérifier quota Supabase (DB size, bandwidth, auth users)
- [ ] `npm audit` dans le repo local

---

> Ce fichier est versionné dans le repo privé. Ne jamais le committer dans un repo public.
