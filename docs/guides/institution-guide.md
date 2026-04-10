# Guide Admin Institution — Terminal Learning

> Version : 1.0 (à compléter — Phase 7c)
> Audience : administrateurs d'institution (`role = institution_admin`)
> Accès in-app : `/help/institution`

---

## 1. Créer votre institution

1. Profil → Demander le statut Institution Admin
2. Renseigner : nom, domaine email officiel (ex. `ulb.be`), contact officiel
3. Upload du logo (jpg/png, max 2MB)
4. Approbation par le super admin (délai : 48h ouvrables)

## 2. Configurer le domaine email

Le domaine email permet l'auto-approbation des enseignants de votre institution.

Exemple : si vous configurez `@ulb.be`, tout enseignant s'inscrivant avec une adresse `@ulb.be` sera automatiquement affilié à votre institution (statut `pending_teacher` — approbation manuelle toujours requise).

## 3. Gérer les enseignants

**Approuver une demande d'enseignant :**
1. Admin Panel → Enseignants → Demandes en attente
2. Vérifier l'identité et l'institution
3. Approuver → l'enseignant reçoit l'accès immédiatement

**Révoquer un accès enseignant :**
1. Admin Panel → Enseignants → [Nom] → Désaffilier
2. L'enseignant repasse en `student`
3. Ses classes restent accessibles aux étudiants jusqu'à réassignation

## 4. Métriques de l'institution

- Taux de complétion moyen par module
- Niveau CEFR moyen de votre population étudiante
- Badges distribués
- Activité hebdomadaire

## 5. Exporter pour l'accréditation (EQF)

1. Admin Panel → Exports → Rapport EQF
2. Choisir la période et les classes
3. Format : PDF officiel + CSV pour intégration dans votre SI
4. Le rapport liste les compétences certifiées avec leur niveau EQF correspondant

## 6. Processus — Enseignant qui quitte l'institution

1. Admin Panel → Enseignants → [Nom] → Désaffilier
2. Ses classes sont marquées "sans titulaire"
3. Réassigner les classes à un autre enseignant via Admin Panel → Classes → [Classe] → Changer de titulaire
4. Les données étudiants sont préservées

## 7. Processus — Signaler un incident de sécurité

1. Ne pas attendre pour signaler
2. [Ouvrir un ticket](/app/tickets/new) avec type `bug` et priorité `critical`
3. Inclure : description de l'incident, date/heure, utilisateurs concernés
4. Le super admin est notifié immédiatement pour les tickets `critical`

---

*Vous n'avez pas trouvé votre réponse ? [Ouvrir un ticket de support](/app/tickets/new)*
