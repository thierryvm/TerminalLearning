# Feature flags — process

> **Statut** : v1 (4 mai 2026 — créé avec THI-111).
> **Scope** : `VITE_*` env-driven flags pour Vite.

Les feature flags Terminal Learning sont des **booléens read-once à l'init**, lus depuis `import.meta.env.VITE_*`. Pas d'évaluation runtime, pas de toggle dynamique côté client. La force de Vercel : flipper la variable et redéployer la preview = ~1-2 minutes, sans revert PR.

---

## Flags actifs

| Flag | Default | Owner | Lieu | Usage |
|---|---|---|---|---|
| `VITE_AI_TUTOR_ENABLED` | `false` | THI-111 | `src/app/components/ai/AiTutorPanel.tsx` | Panel Tuteur IA — kill-switch ADR-005 V1 |
| `VITE_AI_TUTOR_OPENROUTER_MODEL` | (DEFAULT_MODELS) | THI-111 | idem | Override le modèle OpenRouter sans modifier le code (utile pour échapper au rate limit `:free` partagé). Ex: `meta-llama/llama-3.3-70b-instruct` (payant, ~0.001 €/question, pas de rate limit). |
| `VITE_AI_TUTOR_ANTHROPIC_MODEL` | (DEFAULT_MODELS) | THI-111 | idem | Override modèle Anthropic. Ex: `claude-sonnet-4-6`. |
| `VITE_AI_TUTOR_OPENAI_MODEL` | (DEFAULT_MODELS) | THI-111 | idem | Override modèle OpenAI (utile une fois le proxy V2 en place). |
| `VITE_AI_TUTOR_GEMINI_MODEL` | (DEFAULT_MODELS) | THI-111 | idem | Override modèle Gemini. Ex: `gemini-2.5-pro`. |

---

## Quand utiliser un feature flag

Crée un flag `VITE_*` quand :

- ✅ La feature touche une **surface utilisateur publique** (panel, page, modal) qu'on veut pouvoir éteindre instantanément en cas de bug ou d'incident sécurité, sans revert PR.
- ✅ La feature implique un **cost / risk asymétrique** (BYOK, paiement, IA, intégration tierce) où une activation prématurée a un coût élevé.
- ✅ Tu veux **staged rollout** (preview avec flag `true`, prod en `false` jusqu'à validation final).

N'utilise PAS un flag pour :

- ❌ Les bugs qu'on peut corriger directement et reshipper.
- ❌ Les features purement internes (tests, dev tooling).
- ❌ Les expériences A/B (le projet n'a pas de framework A/B en V1).

---

## Convention de nommage

`VITE_<DOMAIN>_<FEATURE>_ENABLED` ou `VITE_<DOMAIN>_<FEATURE>_<MODE>`.

Exemples :
- `VITE_AI_TUTOR_ENABLED` ✅
- `VITE_LTI_DEEP_LINKING_ENABLED` ✅
- `VITE_BILLING_MODE` (avec valeurs `none|stripe|manual`) ✅

Le préfixe `VITE_` est obligatoire pour que Vite expose la variable au client (les autres restent serveur-side uniquement).

---

## Lecture côté code

```ts
// src/app/components/ai/AiTutorPanel.tsx
function readEnabled(): boolean {
  return import.meta.env.VITE_AI_TUTOR_ENABLED === 'true';
}

export function AiTutorPanel() {
  // Read once at first render — kill-switch is server-side via Vercel env;
  // the client does not need to re-evaluate at runtime.
  const [enabled] = useState<boolean>(() => readEnabled());
  if (!enabled) return null;
  // …
}
```

**Pourquoi `=== 'true'` strict** : Vite injecte la valeur en string (`"true"` ou `"false"` ou `undefined`). Une comparaison loose accepterait `'truthy'` ou `'1'` qui sont des bugs en attente.

**Pourquoi `useState(() => readEnabled())`** : évalué exactement une fois à l'init, donc pas de re-renders infinis. Le flag ne peut pas être modifié runtime.

---

## Activation / désactivation

### Sur Vercel (preview ou prod)

1. **[Vercel Dashboard → Project → Settings → Environment Variables](https://vercel.com/thierry-vanmeeterens-projects/terminal-learning/settings/environment-variables)**
2. **Add Variable**
   - Name : `VITE_AI_TUTOR_ENABLED`
   - Value : `true` (ou `false` pour désactiver)
   - Environments : cocher **Preview** ou **Production** ou les deux
3. **Save** → redeploy automatique de l'environnement ciblé (~1-2 min)
4. Tester sur la preview ou la prod

**Recommandation** : tester d'abord en **Preview**, puis activer en **Production** quand tout est validé.

### En local (dev)

```bash
echo "VITE_AI_TUTOR_ENABLED=true" >> .env.local
npm run dev
```

`.env.local` est dans `.gitignore` — jamais committé.

### Via Vercel CLI (si installé)

```bash
vercel env add VITE_AI_TUTOR_ENABLED preview
# saisir "true" quand prompted
vercel env pull .env.local  # synchroniser local
```

---

## Kill-switch — incident response

Si une feature posent un problème en prod (bug critique, fuite de données, abus) :

1. Aller sur le dashboard Vercel → Settings → Environment Variables
2. Editer la variable du flag → Value `false`
3. Save → redeploy automatique en ~1 minute
4. La feature disparaît côté client à la prochaine charge de page

**Mesure complémentaire** : ouvrir une issue Linear pour analyser la root cause. Le flag à `false` n'efface pas le bug — c'est une mitigation temporaire.

---

## Ajouter un nouveau flag — checklist

- [ ] Décider du nom (`VITE_<DOMAIN>_<FEATURE>_ENABLED`)
- [ ] Lire la valeur via `useState(() => readFlag())` dans le composant racine de la feature
- [ ] Documenter le flag dans **ce fichier** (table en haut)
- [ ] Default value = `false` (opt-in, jamais opt-out)
- [ ] Mettre à jour la PR description avec instructions d'activation
- [ ] Tester avec flag `true` en preview avant de demander un merge
- [ ] Après merge prod : laisser à `false` jusqu'à validation finale, puis flipper

---

## Anti-patterns connus

❌ **Ne pas** lire le flag plusieurs fois pendant le render :
```tsx
function Bad() {
  if (import.meta.env.VITE_X !== 'true') return null;  // re-eval each render
  // …
}
```

❌ **Ne pas** modifier le flag au runtime via `localStorage` ou `Cookies` — un flag d'env est par design statique.

❌ **Ne pas** oublier de documenter dans la table en haut — un flag non documenté devient orphelin.

❌ **Ne pas** mettre la valeur sensible directement dans le code (par exemple `const ENABLED = true;` committé). C'est précisément ce que le flag d'env évite.
