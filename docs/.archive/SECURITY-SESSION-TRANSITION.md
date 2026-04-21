# Transition de Sécurité — Sessions Futures (à partir de 22 avril 2026)

**Date**: 21 avril 2026  
**Auteur**: Claude Code  
**Destinataire**: Thierry (pour prochaines sessions)  

---

## Ce qui a été fait cette session

### 1. Audit Opus Finalisé
- 3 findings (HIGH/MEDIUM/LOW) tous fixés
- Documentation créée: `docs/security-audit-log.md`
- Protocole CLAUDE.md renforcé

### 2. Analyse de Sécurité IA Complète
- OWASP LLM Top 10 pour Terminal Learning
- 8 vecteurs d'attaque spécifiques identifiés
- Menaces 2026 (IA booster) documentées
- Fichiers de mémoire créés (persistent)

### 3. Nouvelles Règles de Session
- 10 règles non-négociables pour Phase 7b
- Checklist de session obligatoire
- Violations critiques = revert immédiat

### 4. Tests & Infra
- 44 fuzz tests qui passent
- 979 tests totaux passant
- Tous les agents prêts à l'emploi

---

## Comment Appliquer à la Prochaine Session

### Étape 1: Charger les Mémoires
Demande au démarrage:
```
/remember security_ai_comprehensive_analysis
/remember security_new_session_rules
```

Ou vérifie le fichier: `C:\Users\thier\.claude\projects\f--PROJECTS-Apps-Terminal-Learning\memory\MEMORY.md` (lignes 40-41)

### Étape 2: Checklist de Sécurité Dès le Départ
Avant de coder, demande:
```
Checklist de sécurité THI-120?
- [ ] Sentry scrubber prêt?
- [ ] Prompt-guardrail-auditor prêt?
- [ ] security-auditor prêt?
- [ ] SECURITY.md à jour?
```

### Étape 3: Agent Obligatoire pour Chaque PR
**Si la PR touche**: Auth / RBAC / RLS / API / Crypto  
→ `security-auditor` AVANT coding (non-négociable)

**Si la PR touche**: IA (AiTutorPanel / sanitizer / scrubber)  
→ `prompt-guardrail-auditor` AVANT coding (non-négociable)

### Étape 4: Archiver les Rapports d'Agent
Avant de merger:
```bash
gh pr comment <NUMBER> --body "$(cat <agent-report.txt>)"
```

### Étape 5: Vérifier les Violations Critiques
Avant chaque merge, vérifier:
- ❌ Clé API exposée au LLM? → REVERT
- ❌ HTML/JS dans sanitizer? → REVERT
- ❌ Historique terminal à OpenRouter? → REVERT
- ❌ x-forwarded-for au lieu de x-vercel-forwarded-for? → REVERT

---

## Fichiers de Référence Créés

1. **Mémoire de sécurité IA**:  
   `C:\Users\thier\.claude\projects\...\memory\security_ai_comprehensive_analysis.md`
   - 8 vecteurs d'attaque
   - 15+ patterns de jailbreak à tester
   - Fixes existants (THI-110 ✅, THI-120 pending, etc.)

2. **Règles de session**:  
   `C:\Users\thier\.claude\projects\...\memory\security_new_session_rules.md`
   - 10 règles + violations critiques
   - Checklist début de session

3. **Audit log du projet**:  
   `f:\PROJECTS\Apps\Terminal Learning\docs\security-audit-log.md`
   - Trouvailles Opus documentées
   - Corrections appliquées
   - Leçons apprises

4. **Politique de sécurité mise à jour**:  
   `f:\PROJECTS\Apps\Terminal Learning\SECURITY.md`
   - Menaces IA (nouveau)
   - Phase 7b mitigations (nouveau)
   - X-Forwarded-For fix documenté

---

## Timeline THI-120/111/112/113

```
THI-120: Scrubber Sentry
├─ Scope: Purgé clés API, tokens, PII des erreurs Sentry
├─ Dépendance: aucune (peut être fait en parallèle)
└─ Gate: DOIT être MERGED avant THI-111

THI-111: AiTutorPanel + Sanitizer
├─ Scope: Appel OpenRouter + validation sortie
├─ Dépendance: Dépend de THI-120
└─ Gate: DOIT être mergé avant THI-113

THI-112: AiKeySetup + AiConsentModal
├─ Scope: Default chiffré + consentement RGPD
├─ Dépendance: Indépendant (peut paralléliser)
└─ Gate: Avant ship

THI-113: Final Audit
├─ Scope: Full security + prompt-guardrail passes
├─ Dépendance: Tous les autres complétés
└─ Gate: DOIT passer avant ship Phase 7b
```

---

## Agents Clés à Invoquer Régulièrement

| Agent | Quand | Rapport |
|-------|-------|---------|
| `security-auditor` | Avant chaque PR auth/RBAC/RLS/API | Archiver dans PR comment |
| `prompt-guardrail-auditor` | Avant chaque PR IA | Archiver dans PR comment |
| `curriculum-validator` | Avant modif curriculum.ts | Inline (court) |
| `test-runner` | Après modif terminalEngine.ts | Inline |
| `content-auditor` | Avant release majeure | Standalone report |

---

## Métrique de Succès

Après Phase 7b:
- [ ] 0 clés API exposées en logs
- [ ] 0 réussites jailbreak (15+ patterns testés)
- [ ] 100% sanitizer tests passent
- [ ] 0 HTML/JS accepté dans réponses LLM
- [ ] SECURITY.md = source de vérité documentée

---

## Rappel: Non-Négociable

Ces 10 règles ne sont PAS optionnelles:

1. Agents obligatoires AVANT coding (pas après)
2. Pas de clé API au LLM
3. Contexte limité = grounded context seulement
4. Scrubber = gate avant AiTutorPanel
5. Consentement RGPD explicite
6. Sanitizer whitelist-only
7. 15+ patterns jailbreak testés
8. Rate limiting = x-vercel-forwarded-for
9. Audit log = immutable + RLS service-role
10. Prompt system = immuable + tested

---

**Imprimer cette page et garder à portée de main. Appliquer religieusement.**  
**Les agents existent. Les utiliser systématiquement = zéro bugs de sécurité.**
