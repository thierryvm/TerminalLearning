# Guide Enseignant — Terminal Learning

> Version : 1.0 (à compléter — Phase 7c)
> Audience : enseignants approuvés (`role = teacher`)
> Accès in-app : `/help/teacher`

---

## 1. Demander le statut Enseignant

1. Créer un compte standard
2. Profil → Demander le statut Enseignant
3. Indiquer votre institution et titre professionnel
4. Votre compte passe en `pending_teacher`
5. L'admin de votre institution (ou le super admin) approuve votre demande
6. Vous recevez un email de confirmation → accès au tableau de bord classe

## 2. Créer et gérer une classe

1. Tableau de bord → Mes classes → Nouvelle classe
2. Donner un nom à la classe (ex. "BES Informatique 2026")
3. Inviter des étudiants :
   - Par lien d'invitation (valable 7 jours)
   - Par code classe (à distribuer en cours)
   - Par email (si domaine institution configuré)

## 3. Suivre la progression des étudiants

- **Vue tableau** : niveau CEFR de chaque étudiant, % de complétion par module
- **Heatmap de maîtrise** : qui est bloqué sur quel module depuis combien de temps
- **Alertes automatiques** :
  - 🔴 Inactif depuis >7 jours
  - 🟡 Score bloqué <50% sur 3 tentatives consécutives
  - 🟢 Module complété avec quiz réussi

## 4. Exporter les résultats

- Format CSV : liste des compétences certifiées par étudiant
- Format PDF : rapport individuel prêt pour bulletin
- Format EQF : rapport d'accréditation (institution admin requis)

## 5. Processus — Étudiant bloqué sur un module

1. Identifier le module via la heatmap (couleur = durée de blocage)
2. Consulter le score détaillé : exercices réussis / échoués
3. Actions disponibles :
   - Laisser un commentaire privé à l'étudiant
   - Recommander la révision d'un module précédent
   - Réinitialiser le module (avec confirmation — action irréversible)

## 6. Processus — Problème de connexion étudiant

1. Vérifier que l'étudiant utilise la bonne méthode de connexion (email vs OAuth)
2. Si OAuth : vérifier que le compte GitHub/Google est accessible
3. Si email : demander un reset de mot de passe via la page de connexion
4. Si le compte est introuvable : [ouvrir un ticket support](/app/tickets/new)

## 7. Processus — Demander une modification de contenu

Pour signaler une erreur dans une leçon ou proposer une amélioration :
1. Dans la leçon concernée → bouton "Signaler un problème"
2. Ou : [ouvrir un ticket](/app/tickets/new) avec le type `content_request`
3. Délai de traitement : 7 jours ouvrables

---

*Vous n'avez pas trouvé votre réponse ? [Ouvrir un ticket de support](/app/tickets/new)*
