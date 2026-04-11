# Troubleshooting — Problèmes d'authentification

## Étudiant ne peut pas se connecter

| Symptôme | Cause probable | Solution |
|----------|---------------|----------|
| "Email ou mot de passe incorrect" | Mauvaise méthode de connexion | Vérifier si compte créé via OAuth (GitHub/Google) ou email |
| Boucle de redirection OAuth | Cookie tiers bloqué | Activer les cookies tiers OU utiliser email/password |
| "Compte suspendu" | Suspension admin | Contacter le super admin |
| Email de vérification non reçu | Spam / délai | Vérifier spam, renvoyer via "Renvoyer l'email" |
| Token expiré | Session >7 jours | Se reconnecter normalement |

## Enseignant — accès classe refusé après approbation

1. Vérifier que le statut est bien `teacher` (pas `pending_teacher`) dans Supabase Dashboard
2. Si `pending_teacher` : approbation non encore traitée → voir `docs/processes/teacher-approval.md`
3. Si `teacher` mais accès refusé : vérifier les RLS policies sur la table `classes`
4. Forcer un refresh de session : déconnexion + reconnexion

## Callback OAuth échoue (/auth/callback)

- Vérifier que l'URL de redirection est dans la liste Supabase Auth → URL Configuration
- URLs autorisées : `https://terminallearning.dev/auth/callback` + `http://localhost:5173/auth/callback`
- En cas de nouvelle URL Vercel (preview deployments) : ajouter le domaine Vercel preview

## Reset de mot de passe ne fonctionne pas

1. Vérifier que l'email Supabase est configuré (SMTP custom ou Resend)
2. Vérifier les logs Supabase → Authentication → Logs
3. Si SMTP en erreur : basculer sur Resend ou SendGrid
