# Guide : démarrer avec le Tuteur IA

> **Public** : tout apprenant qui ouvre le Tuteur IA pour la première fois.
> **Temps de lecture** : ~5 minutes.
> **Prérequis** : aucun — juste un navigateur récent.

Le Tuteur IA de Terminal Learning t'aide à comprendre une commande, déboguer un message d'erreur, ou trouver l'idée derrière un exercice — **sans jamais te donner la réponse à la place**. Il pose des questions guidantes pour que tu apprennes en réfléchissant.

---

## 1. C'est quoi une clé API ?

Imagine une **carte de bibliothèque** :

- Tu n'as pas de carte → tu peux entrer dans le hall, mais pas emprunter.
- Tu présentes ta carte → la bibliothécaire vérifie qu'elle est valide, puis te laisse emprunter.

Une **clé API** marche pareil. C'est un long code secret qui dit au fournisseur d'IA (OpenRouter, Anthropic, OpenAI ou Google) : *« cette personne a le droit de me poser des questions »*. Sans clé, l'IA ne te répond pas.

**Important** : la clé est **personnelle**. Si quelqu'un la copie, il peut s'en servir à ta place. Garde-la pour toi, comme un mot de passe.

---

## 2. Quel provider choisir ?

| Provider | Format clé | Coût | Quota gratuit | Cas d'usage V1 | CORS browser |
|---|---|---|---|---|---|
| **OpenRouter** | `sk-or-v1-…` | ~0 €/mois si modèles `:free`, sinon ~0.10–0.50 €/M tokens | Modèles `:free` illimités **mais 1 $ de crédit minimum requis depuis février 2025** (politique anti-abus) | **Recommandé pour débuter.** Hub multi-providers, choix entre Llama 3.3 70B, GPT-OSS 20B, plusieurs Mistral, etc. | ✅ Ouvert |
| **Anthropic** | `sk-ant-…` | ~3 €/M tokens (Claude Haiku 4.5) | 5 $ de crédit offerts à la création du compte | Qualité haute en raisonnement et en code. Idéal si tu utilises déjà Claude. | ✅ Ouvert (avec opt-in) |
| **Gemini** | `AIza…` | Gratuit jusqu'à un quota généreux (Gemini 2.0 Flash) | ~1500 requêtes / jour gratuit | Quota gratuit le plus généreux du marché. Bon fallback. | ✅ Ouvert |
| **OpenAI** | `sk-proj-…`, `sk-svcacct-…`, `sk-…` | ~0.15 €/M tokens (GPT-4o-mini) | Pas de quota gratuit (paiement à l'usage) | ⚠️ **Bloqué en V1** — politique CORS d'OpenAI refuse le BYOK direct depuis le navigateur. Utilise OpenRouter pour accéder aux modèles GPT (`openai/gpt-4o-mini` & co.). | ❌ Fermé |

**Mon conseil pour la première fois** : OpenRouter avec 1 $ de crédit ajouté → débloque les modèles `:free` (Llama 3.3 70B par défaut), tu paies réellement 0 €.

## 3. Comment obtenir une clé OpenRouter

OpenRouter regroupe plusieurs fournisseurs d'IA derrière une seule clé, et permet d'accéder à des modèles `:free` (Llama, Mistral, GPT-OSS) qui ne facturent rien.

1. Va sur [openrouter.ai/keys](https://openrouter.ai/keys).
2. Crée un compte (mail + mot de passe, ou Google/GitHub).
3. **Important — depuis février 2025** : ajoute au moins **1 $ de crédit** sur [openrouter.ai/credits](https://openrouter.ai/credits) **avant** de créer ta clé. Sans ce crédit minimum, les modèles `:free` retournent une erreur `quota_exceeded` (politique anti-abus mise en place par OpenRouter). **Le crédit ne sera pas consommé** tant que tu utilises uniquement les modèles `:free` — c'est juste un "gage" de bonne foi.
4. Une fois connecté·e, clique sur **"Create Key"**.
5. Donne-lui un nom (par ex. `terminal-learning`).
6. Copie la clé (elle commence par `sk-or-v1-…`). **Tu ne pourras plus la revoir après**, donc stocke-la quelque part en attendant de la coller dans Terminal Learning.

> Tu préfères une autre IA ?
> Anthropic ([console.anthropic.com](https://console.anthropic.com/)) → clé `sk-ant-…`
> Gemini ([aistudio.google.com/apikey](https://aistudio.google.com/apikey)) → clé `AIza…`
> OpenAI direct n'est **pas supporté en V1** (CORS) — passe par OpenRouter qui expose `openai/gpt-4o-mini` & co.

---

## 4. Premier exemple

1. Sur [terminallearning.dev](https://terminallearning.dev/), clique l'icône **✨ Sparkles** en bas à droite (ou `Ctrl+I` / `Cmd+I`).
2. Lis le bloc de consentement, puis clique **"J'ai lu et j'accepte"**.
3. Sélectionne le bon provider (OpenRouter par défaut).
4. Colle ta clé. Le format est vérifié immédiatement — tu sais tout de suite si tu t'es trompé·e de provider.
5. Clique **"Enregistrer"**.
6. Pose ta première question. Essaie par exemple :

   > *« Pourquoi `ls -la` montre des fichiers commençant par un point que `ls` cache ? »*

Le tuteur va te répondre par 1 ou 2 questions guidantes plutôt que la réponse directe. C'est voulu : tu apprends en réfléchissant.

---

## 5. Que faire si l'IA me répond mal ?

### Elle me pose toujours des questions, je veux juste la réponse !

C'est le mode **socratique** par défaut. Si tu reçois deux réponses pleines de questions d'affilée, le tuteur te proposera automatiquement de basculer en mode direct — clique **"Oui, juste cette fois"**. Tu peux aussi forcer le mode direct via les paramètres internes du panel.

### Elle a dit n'importe quoi (hallucination)

Les IA peuvent inventer des choses qui semblent correctes mais ne le sont pas. Croise toujours sa réponse avec :

- La leçon en cours (la documentation officielle est dans `/app`)
- `man <commande>` dans un vrai terminal
- La référence intégrée [terminallearning.dev/reference](https://terminallearning.dev/reference)

### Elle a inclus une commande dangereuse (`rm -rf /`, etc.)

Le tuteur strippe automatiquement les commandes destructives connues (`rm -rf /`, `dd`, fork bomb, `mkfs`) **avant** de te les afficher. Tu vois `[unsafe-command-removed]` à la place. Si tu vois un message d'avertissement orange, c'est qu'une commande a été retirée — ne tente pas de la reconstruire.

### Le panel affiche un avertissement jaune "clé exposée"

Le tuteur a détecté que la réponse de l'IA contenait quelque chose qui ressemblait à une clé API et l'a **automatiquement masquée**. Par précaution, **révoque cette clé** chez ton provider (la même page où tu l'as créée propose un bouton "Revoke"), puis crée-en une nouvelle.

### Erreur "invalid_key"

Ta clé est rejetée par le provider. Vérifie :
- Que tu as bien copié la clé entière (sans espace en début/fin)
- Que la clé n'est pas expirée ou révoquée
- Que tu es sur le bon provider (clé OpenAI dans le slot OpenAI, etc.)

---

## 6. Sécurité de ma clé

### Où est stockée ma clé ?

**Dans ton navigateur uniquement**, sur ce poste. Aucun serveur Terminal Learning ne la voit jamais. C'est le principe **BYOK** ("Bring Your Own Key") : tu paies ton propre quota IA, en échange d'une vie privée totale.

Concrètement, en V1 :
- Stockage : `localStorage` du navigateur, en clair.
- Le mode chiffré (avec passphrase + AES-GCM) arrive dans une prochaine version.

### Qui peut voir ma clé ?

- ✅ Toi, sur ce navigateur (DevTools → Application → Local Storage).
- ❌ Personne d'autre par défaut — pas Terminal Learning, pas Vercel, pas Sentry (un scrubber retire toute clé qui apparaîtrait dans un log d'erreur).
- ⚠️ **Une extension de navigateur malveillante** peut techniquement lire le `localStorage` de tous les sites visités. C'est une limite du navigateur, pas du tuteur. Si tu n'es pas sûr·e des extensions installées, utilise plutôt une clé OpenRouter `:free` (limite faible si exposée) que des clés payantes.

### Comment supprimer ma clé ?

Dans le panel, en bas à droite : **"Oublier ma clé"**. Ça la retire du `localStorage` immédiatement. Tu peux ensuite la révoquer chez ton provider pour être sûr·e qu'elle ne servira plus.

### Mes questions sont-elles enregistrées ?

**Non**. Le fil de conversation reste en mémoire de la page tant que le panel est ouvert. Dès que tu rafraîchis ou ferme l'onglet, tout est perdu — voulu, par souci de RGPD et de simplicité.

OpenRouter / Anthropic / OpenAI / Gemini, eux, peuvent garder un journal côté serveur selon leurs propres conditions générales. Lis-les si c'est important pour toi.

---

## En résumé

| Question | Réponse courte |
|---|---|
| Coût ? | Gratuit avec OpenRouter `:free` (recommandé pour démarrer). |
| Mes données partent-elles à un serveur Terminal Learning ? | **Non**. Direct au provider, jamais chez nous. |
| Si je perds ma clé ? | Je la révoque chez le provider et j'en crée une nouvelle. |
| Si l'IA donne une mauvaise réponse ? | Je vérifie avec `man <cmd>` ou la référence intégrée. |
| Comment ouvrir le tuteur ? | Icône ✨ en bas à droite, ou `Ctrl+I` / `Cmd+I`. |
| Comment fermer ? | Clic en dehors, croix en haut à droite, ou `Échap`. |

Bonne pratique. Si tu rencontres un bug ou une question pas couverte, [ouvre une issue GitHub](https://github.com/thierryvm/TerminalLearning/issues) — c'est utile à toute la communauté.
