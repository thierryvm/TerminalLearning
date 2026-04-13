import type { TerminalState, CommandOutput } from './types';

type Line = { text: string; type: 'output' | 'info' | 'success' | 'error' };

const LINE = '╠══════════════════════════════════════════════════╣';
const TOP  = '╔══════════════════════════════════════════════════╗';
const BOT  = '╚══════════════════════════════════════════════════╝';

function box(title: string, lines: string[], type: Line['type'] = 'info'): Line[] {
  const out: Line[] = [
    { text: TOP, type },
    { text: `║  ${title.padEnd(48)}║`, type },
    { text: LINE, type },
  ];
  for (const l of lines) {
    out.push({ text: `║  ${l.padEnd(48)}║`, type: l === '' ? type : 'output' });
  }
  out.push({ text: BOT, type });
  return out;
}

// ── Overview (ai-help sans argument) ─────────────────────────────────────────

function aiOverview(newState: TerminalState): CommandOutput {
  return {
    lines: box('ai-help — Guide IA pour développeurs', [
      'Commandes disponibles :',
      '',
      '  ai-help capabilities  → Ce que l\'IA sait faire',
      '  ai-help limits        → Ce qu\'elle ne sait pas faire',
      '  ai-help prompts       → Écrire un bon prompt',
      '  ai-help context       → Prompts avancés avec contexte',
      '  ai-help validate      → Valider la sortie d\'une IA',
      '  ai-help debug         → Déboguer avec l\'IA',
      '  ai-help security      → Ce qu\'il ne faut jamais partager',
      '  ai-help claude-cli    → Claude Code CLI workflow',
      '  ai-help careers       → L\'IA par parcours métier',
      '  ai-help senior        → Posture senior avec l\'IA',
      '  ai-help workflow      → Du brief au déploiement',
      '',
      '  L\'IA est un outil. Vous êtes le développeur.',
    ], 'info'),
    newState,
  };
}

// ── Lesson 2 : Capacités réelles ─────────────────────────────────────────────

function aiCapabilities(newState: TerminalState): CommandOutput {
  return {
    lines: box('Capacités réelles de l\'IA (2026)', [
      'CE QUE L\'IA FAIT BIEN :',
      '',
      '  ✓ Générer du code à partir d\'une description',
      '  ✓ Expliquer du code existant ligne par ligne',
      '  ✓ Déboguer une erreur avec contexte fourni',
      '  ✓ Écrire des tests unitaires',
      '  ✓ Rédiger de la documentation',
      '  ✓ Refactorer du code selon un pattern donné',
      '  ✓ Traduire entre langages (Python → TypeScript)',
      '  ✓ Suggérer des alternatives architecturales',
      '  ✓ Expliquer un concept technique en langage simple',
      '',
      '  → Prochain : ai-help limits',
    ], 'success'),
    newState,
  };
}

// ── Lesson 3 : Limites ────────────────────────────────────────────────────────

function aiLimits(newState: TerminalState): CommandOutput {
  return {
    lines: box('Limites connues — ne pas ignorer', [
      'CE QUE L\'IA NE SAIT PAS FAIRE :',
      '',
      '  ✗ Connaître votre codebase sans le lire',
      '  ✗ Garantir que le code généré fonctionne',
      '  ✗ Rester à jour sur les dernières versions',
      '  ✗ Comprendre le contexte métier implicite',
      '  ✗ Détecter les bugs de concurrence complexes',
      '  ✗ Remplacer une revue de code humaine experte',
      '',
      'RISQUES COURANTS :',
      '',
      '  ⚠ Hallucinations : API inexistantes, args inventés',
      '  ⚠ Dette technique : code qui fonctionne mais fragile',
      '  ⚠ Dépendances : versions obsolètes ou vulnérables',
      '',
      '  → Prochain : ai-help prompts',
    ], 'info'),
    newState,
  };
}

// ── Lesson 4 : Prompts — bases ────────────────────────────────────────────────

function aiPrompts(newState: TerminalState): CommandOutput {
  return {
    lines: box('Écrire un bon prompt — les bases', [
      'RÈGLE N°1 : Soyez spécifique',
      '',
      '  ✗ Mauvais : "Fix my code"',
      '  ✓ Bon    : "TypeError: Cannot read properties of',
      '             undefined (reading \'id\') — ligne 42 de',
      '             fetchUser(). L\'user peut être null si',
      '             déconnecté. Corrige avec un guard."',
      '',
      'STRUCTURE EFFICACE :',
      '',
      '  1. Contexte  : langage, framework, version',
      '  2. Problème  : erreur exacte ou comportement attendu',
      '  3. Contrainte: ce que vous ne voulez pas changer',
      '  4. Format    : type de réponse souhaité',
      '',
      '  → Prochain : ai-help context',
    ], 'info'),
    newState,
  };
}

// ── Lesson 5 : Prompts avancés ────────────────────────────────────────────────

function aiContext(newState: TerminalState): CommandOutput {
  return {
    lines: box('Prompts avancés — donner du contexte', [
      'CONTEXTE TECHNIQUE COMPLET :',
      '',
      '  Stack    : "React 18, TypeScript strict, Supabase"',
      '  Fichier  : "Voici mon composant AuthContext.tsx :"',
      '  Erreur   : coller le message exact avec stack trace',
      '  Objectif : "Je veux que l\'user reste connecté 30j"',
      '  Interdit : "Ne change pas la signature de useAuth"',
      '',
      'PATTERNS POUR ENSEIGNANTS :',
      '',
      '  "Génère 5 exercices progressifs sur la commande ls',
      '   pour des débutants, avec corrigés et erreurs types"',
      '',
      '  "Adapte ce cours terminal pour Windows PowerShell"',
      '',
      '  → Prochain : ai-help validate',
    ], 'info'),
    newState,
  };
}

// ── Lesson 6 : Valider la sortie ──────────────────────────────────────────────

function aiValidate(newState: TerminalState): CommandOutput {
  return {
    lines: box('Valider la sortie — checklist critique', [
      'AVANT D\'UTILISER DU CODE GÉNÉRÉ PAR L\'IA :',
      '',
      '  □ Lisez-le entièrement — jamais de copier-coller aveugle',
      '  □ Comprenez chaque ligne : si non, demandez l\'explication',
      '  □ Testez dans un environnement isolé d\'abord',
      '  □ Vérifiez les dépendances : version, licence, sécurité',
      '  □ Cherchez les hallucinations : fonctions qui n\'existent pas',
      '  □ Lancez vos tests unitaires — l\'IA peut casser l\'existant',
      '  □ Vérifiez les edge cases que l\'IA a peut-être ignorés',
      '',
      'RÈGLE D\'OR :',
      '',
      '  Vous êtes responsable du code que vous signez,',
      '  que l\'IA l\'ait écrit ou non.',
      '',
      '  → Prochain : ai-help debug',
    ], 'info'),
    newState,
  };
}

// ── Lesson 7 : Debug avec l\'IA ────────────────────────────────────────────────

function aiDebug(newState: TerminalState): CommandOutput {
  return {
    lines: box('Déboguer avec l\'IA — workflow pratique', [
      'WORKFLOW DE DEBUG ASSISTÉ :',
      '',
      '  1. Isolez : reproduisez le bug dans le plus petit',
      '     contexte possible (minimal reproducible example)',
      '',
      '  2. Collez : message d\'erreur + stack trace complète',
      '     + le code concerné (pas tout le projet)',
      '',
      '  3. Décrivez : comportement attendu vs observé',
      '     + ce que vous avez déjà essayé',
      '',
      '  4. Itérez : si la 1ère réponse ne résout pas,',
      '     précisez — ne recommencez pas de zéro',
      '',
      '  5. Comprenez : demandez "pourquoi ce bug existe"',
      '     pas juste le correctif',
      '',
      '  → Prochain : ai-help security',
    ], 'info'),
    newState,
  };
}

// ── Lesson 8 : Sécurité ───────────────────────────────────────────────────────

function aiSecurity(newState: TerminalState): CommandOutput {
  return {
    lines: box('Sécurité & IA — règles absolues', [
      'NE JAMAIS ENVOYER À UNE IA :',
      '',
      '  ✗ Clés API, tokens, mots de passe',
      '  ✗ Variables d\'environnement (.env)',
      '  ✗ Données personnelles de clients (RGPD)',
      '  ✗ Code source propriétaire confidentiel',
      '  ✗ Données de production (logs, DB exports)',
      '  ✗ Contrats, informations légales internes',
      '',
      'BONNE PRATIQUE : anonymisez avant de coller',
      '',
      '  ✗ const apiKey = "sk-prod-abc123xyz"',
      '  ✓ const apiKey = "YOUR_API_KEY_HERE"',
      '',
      '  Les IA cloud peuvent logger vos échanges.',
      '  En cas de doute → IA locale (Ollama, LM Studio)',
      '',
      '  → Prochain : ai-help claude-cli',
    ], 'info'),
    newState,
  };
}

// ── Lesson 9 : Claude Code CLI ────────────────────────────────────────────────

function aiClaudeCli(newState: TerminalState): CommandOutput {
  return {
    lines: box('Claude Code CLI — l\'IA dans le terminal', [
      'CLAUDE CODE = IA agentique dans votre terminal',
      '',
      '  # Démarrer une session interactive',
      '  claude',
      '',
      '  # Poser une question directe',
      '  claude "Explique ce que fait ce fichier"',
      '',
      '  # Mode non-interactif (scripts, CI)',
      '  claude --print "Génère un README pour ce projet"',
      '',
      '  # Lire un fichier et l\'analyser',
      '  claude "Trouve les bugs dans src/auth.ts"',
      '',
      'WORKFLOW TERMINAL-FIRST :',
      '',
      '  grep + claude = debug ultra-rapide',
      '  git diff | claude = revue de code automatique',
      '  cat error.log | claude = analyse d\'erreur',
      '',
      '  → Prochain : ai-help careers',
    ], 'info'),
    newState,
  };
}

// ── Lesson 10 : Métiers ───────────────────────────────────────────────────────

function aiCareers(newState: TerminalState): CommandOutput {
  return {
    lines: box('L\'IA par parcours métier', [
      'DEVOPS / SYSADMIN :',
      '  → Infrastructure as Code (Terraform, Ansible)',
      '  → Analyse de logs, alerting, runbooks',
      '  → Scripts bash/Python de maintenance automatisés',
      '',
      'DÉVELOPPEUR FULLSTACK :',
      '  → Génération API REST/GraphQL + tests',
      '  → Revue de PR, détection de régressions',
      '  → Migration de base de données assistée',
      '',
      'ENSEIGNANT / FORMATEUR :',
      '  → Créer des exercices progressifs par niveau',
      '  → Adapter le contenu par OS (Linux/macOS/Windows)',
      '  → Générer des corrigés annotés et des feedback types',
      '',
      'ÉTUDIANT EN RECONVERSION :',
      '  → Apprendre en posant des questions précises',
      '  → Comprendre les erreurs plutôt que les copier',
      '  → Construire un portfolio avec assistance guidée',
      '',
      '  → Prochain : ai-help senior',
    ], 'info'),
    newState,
  };
}

// ── Lesson 11 : Posture senior ────────────────────────────────────────────────

function aiSenior(newState: TerminalState): CommandOutput {
  return {
    lines: box('Posture senior — l\'IA comme amplificateur', [
      'JUNIOR AVEC IA ≠ SENIOR :',
      '',
      '  Un junior avec IA produit plus vite du code qu\'il',
      '  ne comprend pas. La dette technique s\'accumule.',
      '',
      '  Un senior avec IA produit 5–10× plus, en gardant',
      '  la maîtrise architecturale et la qualité.',
      '',
      'CE QUE L\'IA N\'APPREND PAS À VOTRE PLACE :',
      '',
      '  ✗ Comprendre les trade-offs d\'architecture',
      '  ✗ Lire et déboguer un codebase inconnu',
      '  ✗ Anticiper les problèmes de scalabilité',
      '  ✗ Communiquer et documenter pour une équipe',
      '  ✗ Prendre des décisions sous contrainte',
      '',
      '  L\'IA amplifie ce que vous savez déjà.',
      '  Apprenez les bases — l\'IA fera le reste.',
      '',
      '  → Prochain : ai-help workflow',
    ], 'success'),
    newState,
  };
}

// ── Lesson 12 : Workflow complet ──────────────────────────────────────────────

function aiWorkflow(newState: TerminalState): CommandOutput {
  return {
    lines: box('Workflow complet — du brief au déploiement', [
      'CYCLE COMPLET AVEC IA :',
      '',
      '  1. BRIEF     → IA aide à clarifier les specs',
      '                 "Quelles questions poser au client ?"',
      '',
      '  2. ARCHI     → IA propose des structures',
      '                 vous validez et adaptez',
      '',
      '  3. CODE      → IA génère, vous relisez et testez',
      '                 jamais de copier-coller aveugle',
      '',
      '  4. REVIEW    → git diff | claude',
      '                 revue automatique avant PR',
      '',
      '  5. TESTS     → IA génère les cas de test',
      '                 vous ajoutez les edge cases',
      '',
      '  6. DEPLOY    → IA explique les erreurs CI/CD',
      '                 vous corrigez et comprenez',
      '',
      '  Félicitations — Module 11 terminé. 🎓',
      '  Vous êtes un développeur augmenté.',
    ], 'success'),
    newState,
  };
}

// ── Point d\'entrée ────────────────────────────────────────────────────────────

export function handleAiHelp(args: string[], newState: TerminalState): CommandOutput {
  const sub = args[0]?.toLowerCase();
  switch (sub) {
    case 'capabilities': return aiCapabilities(newState);
    case 'limits':       return aiLimits(newState);
    case 'prompts':      return aiPrompts(newState);
    case 'context':      return aiContext(newState);
    case 'validate':     return aiValidate(newState);
    case 'debug':        return aiDebug(newState);
    case 'security':     return aiSecurity(newState);
    case 'claude-cli':   return aiClaudeCli(newState);
    case 'careers':      return aiCareers(newState);
    case 'senior':       return aiSenior(newState);
    case 'workflow':     return aiWorkflow(newState);
    default:             return aiOverview(newState);
  }
}
