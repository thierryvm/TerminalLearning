# Processus — Approbation d'un enseignant

> Audience : institution admin, super admin
> Déclencheur : inscription d'un utilisateur avec `role_request = 'teacher'`

## Étapes

```
1. Utilisateur s'inscrit et demande le statut enseignant
   └─ Compte créé avec role = 'pending_teacher'
   └─ Notification → institution admin (si institution connue)
              → super admin (si institution inconnue)

2. Admin vérifie l'identité
   └─ Email institutionnel ? (domaine whitelisté = auto-affilié)
   └─ Sinon : vérification manuelle (LinkedIn, site institution, etc.)

3. Décision
   ├─ APPROUVER → role = 'teacher', email de bienvenue envoyé
   └─ REFUSER   → role = 'student' (par défaut), email explicatif
                  (motif : email non institutionnel, institution inconnue, etc.)

4. Logger dans audit_log
   action = 'approve_teacher' ou 'reject_teacher'
   actor_id = admin qui a décidé
   target_id = user_id de l'enseignant
```

## Cas particuliers

**Institution non encore créée sur la plateforme :**
→ Contacter l'utilisateur pour qu'il crée l'institution d'abord, OU
→ Super admin crée l'institution manuellement et approuve

**Domaine email personnel (gmail, hotmail, etc.) :**
→ Demander une vérification supplémentaire (badge institution sur LinkedIn, etc.)
→ Approbation super admin uniquement (pas institution admin)

**Enseignant indépendant (pas d'institution) :**
→ Approuver avec institution = NULL
→ Ne peut pas créer de classes institutionnelles, mais peut créer des classes "libres"
