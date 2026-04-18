# Processus — Demande de données RGPD

> Audience : super admin
> Base légale : RGPD Articles 15 (accès), 17 (effacement), 20 (portabilité)
> Délai légal : 30 jours calendaires maximum

## Article 15 — Droit d'accès (export des données)

L'utilisateur peut demander l'export de toutes ses données via :
- Profil → Zone danger → Télécharger mes données (automatique)
- Email à l'adresse de contact → traitement manuel sous 30 jours

**Données à exporter :**
```sql
SELECT p.*, pr.*, b.*, qr.*
FROM profiles p
LEFT JOIN progress pr ON pr.user_id = p.id
LEFT JOIN badges b ON b.user_id = p.id
LEFT JOIN quiz_results qr ON qr.user_id = p.id
WHERE p.id = '<user_uuid>';
-- Format : JSON ou CSV selon la demande
```

**NE PAS inclure :** audit_log (données internes), adresses IP
**Clé API AI Tutor :** stockée uniquement côté client (localStorage ou IndexedDB chiffrée — voir ADR-002 / ADR-005). Aucune donnée serveur à exporter. L'utilisateur peut la révoquer via `/app/settings` → "Oublier ma clé".

## Article 17 — Droit à l'effacement

```sql
-- Dans cet ordre strict (respecter les FK) :
DELETE FROM ai_consent WHERE user_id = '<uuid>';
DELETE FROM quiz_results WHERE user_id = '<uuid>';
DELETE FROM badges WHERE user_id = '<uuid>';
DELETE FROM class_enrollments WHERE student_id = '<uuid>';
DELETE FROM teacher_notes WHERE student_id = '<uuid>' OR teacher_id = '<uuid>';
DELETE FROM progress WHERE user_id = '<uuid>';
-- Supprimer avatar Supabase Storage : bucket avatars / <uuid>
-- Puis :
DELETE FROM profiles WHERE id = '<uuid>';
-- Le compte Supabase Auth est supprimé automatiquement en cascade
```

> **Clé API AI Tutor** : pas de suppression serveur nécessaire — la clé est stockée côté client (ADR-002 / ADR-005). L'utilisateur la révoque via `/app/settings` ou en vidant le storage de son navigateur.

**Logger dans audit_log :**
```sql
INSERT INTO audit_log (actor_id, action, target_id, metadata)
VALUES ('<admin_uuid>', 'gdpr_erasure', '<user_uuid>',
        '{"requested_at": "<date>", "requester_email": "<email>"}');
```

## Article 20 — Portabilité

Mêmes données qu'Article 15, format JSON machine-readable.

## Notification CNIL (incident de sécurité)

Si des données personnelles sont exposées :
- Délai : 72 heures maximum après détection
- Formulaire : notifications.cnil.fr
- Contenu : nature de la violation, données concernées, mesures prises
