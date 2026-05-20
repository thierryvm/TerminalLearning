/**
 * JoinClass — THI-235 Sprint 2.A étape 3 page `/app/join`.
 *
 * Where a student lands when their teacher shares the invitation URL
 * `https://terminallearning.dev/app/join?code=<12-char-hex>`. Anyone
 * authenticated can join (no role restriction — a teacher can join
 * another teacher's class for collaboration, super_admin can join for
 * supervision). Anonymous users see the standard `<RequireAuth>` fallback
 * which navigates to the LoginModal with `auth_return_to=/app/join?code=…`
 * preserved (PR #269 flow).
 *
 * UX states (think like a human user, not a developer) :
 *   - Empty state (no `?code=` in URL) : helper text "Le prof vous a
 *     envoyé une URL avec un code" + input pour coller le code manuellement.
 *   - Code pre-filled from query param : focus the submit button (the
 *     user just needs one click), not the input.
 *   - Loading : button label "Rejoindre…" + disabled, no spinner overlay
 *     (we trust the user to wait < 1s on a single RPC call).
 *   - Success : persistent green card with class name + teacher info +
 *     CTA "Voir le tableau de bord" — NOT a toast that disappears.
 *   - already_enrolled : same success card with subtle "Tu fais déjà
 *     partie de cette classe" info text instead of "Bienvenue".
 *   - Error : red alert (role="alert") with FR message + button "Réessayer"
 *     which calls reset(). No technical jargon, never expose PostgreSQL codes.
 *
 * Accessibility :
 *   - autoFocus on input if code is empty, on submit button if pre-filled.
 *   - aria-describedby on input pointing to the error message when present.
 *   - aria-live="polite" on the result/error region.
 *   - Submit on Enter (form onSubmit, not button onClick alone).
 */
import { useEffect, useState, type FormEvent } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router';
import { CheckCircle2, ChevronRight, School } from 'lucide-react';

import { RequireAuth } from './auth/RequireAuth';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { useJoinClass } from '@/lib/hooks/useJoinClass';

export function JoinClass() {
  return (
    <RequireAuth>
      <JoinClassContent />
    </RequireAuth>
  );
}

function JoinClassContent() {
  const [searchParams] = useSearchParams();
  const queryCode = searchParams.get('code') ?? '';
  const [code, setCode] = useState(queryCode);
  const { result, loading, error, joinClass, reset } = useJoinClass();

  // When the URL query param changes (teacher shares a new link, user
  // navigates back/forward), reset the form to match. This is intentional
  // synchronous setState in an effect because the URL is the source of
  // truth for the initial code — same defense-in-depth justification as
  // useUserRole.ts (memory/feedback_react_types_drift.md context).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- sync local state with URL query param source of truth */
    setCode(queryCode);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [queryCode]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
    await joinClass(code);
  };

  const handleRetry = () => {
    reset();
    // Focus restoration is handled by autoFocus on the input below
    // (key={`reset-${...}`} forces remount which retriggers autoFocus).
  };

  return (
    <main className="flex-1 px-6 py-8 max-w-3xl mx-auto w-full">
      <Helmet>
        <title>Rejoindre une classe — Terminal Learning</title>
        <meta
          name="description"
          content="Rejoignez la classe de votre enseignant en entrant le code d’invitation qu’il vous a partagé."
        />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <header className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-emerald-400" aria-hidden="true">
            <School size={28} />
          </span>
          <h1 className="text-2xl font-semibold text-[var(--github-text-primary)]">
            Rejoindre une classe
          </h1>
        </div>
        <p className="text-sm text-[var(--github-text-secondary)]">
          Entrez le code d&apos;invitation que votre enseignant vous a partagé.
        </p>
      </header>

      {result ? (
        <SuccessCard result={result} onReset={handleRetry} />
      ) : (
        <Card variant="tl-surface" className="px-5 py-5 gap-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label
              htmlFor="join-code"
              className="text-sm text-[var(--github-text-secondary)]"
            >
              Code d&apos;invitation
            </label>
            <Input
              key={`join-code-${queryCode}`}
              id="join-code"
              type="text"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="abc123def456"
              maxLength={12}
              pattern="[0-9a-f]{12}"
              inputMode="text"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              required
              disabled={loading}
              autoFocus={queryCode.length === 0}
              aria-describedby={error ? 'join-error' : 'join-helper'}
              className="font-mono"
            />
            <p
              id="join-helper"
              className="text-xs text-[var(--github-text-secondary)]/70 font-mono"
            >
              Le code fait 12 caractères (lettres et chiffres).
              {queryCode.length > 0 && ' Cliquez sur « Rejoindre » pour confirmer.'}
            </p>

            {error && (
              <p
                id="join-error"
                className="text-sm text-red-400 font-mono"
                role="alert"
              >
                {error}
              </p>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="submit"
                variant="emerald-soft"
                className="min-h-11 gap-2"
                disabled={loading || code.trim().length === 0}
                autoFocus={queryCode.length > 0}
              >
                {loading ? 'Rejoindre…' : 'Rejoindre la classe'}
                {!loading && <ChevronRight size={16} aria-hidden="true" />}
              </Button>
              <Button asChild variant="ghost-gh" className="min-h-11">
                <Link to="/app">Annuler</Link>
              </Button>
            </div>
          </form>
        </Card>
      )}
    </main>
  );
}

interface SuccessCardProps {
  result: {
    class_id: string;
    class_name: string;
    teacher_id: string;
    joined_at: string;
    already_enrolled: boolean;
  };
  onReset: () => void;
}

function SuccessCard({ result, onReset }: SuccessCardProps) {
  const title = result.already_enrolled
    ? 'Tu fais déjà partie de cette classe'
    : 'Bienvenue dans la classe !';
  const subtitle = result.already_enrolled
    ? 'Pas de problème — tu peux continuer ton apprentissage là où tu t’étais arrêté.'
    : 'Tu peux maintenant accéder aux leçons partagées avec tes camarades.';

  return (
    <Card
      variant="tl-surface"
      className="px-6 py-6 gap-3 border-emerald-500/40 bg-emerald-500/5"
      role="region"
      aria-labelledby="join-success-heading"
      aria-live="polite"
    >
      <header className="flex items-start gap-3">
        <span className="text-emerald-400 shrink-0 mt-1" aria-hidden="true">
          <CheckCircle2 size={24} />
        </span>
        <div>
          <h2
            id="join-success-heading"
            className="text-lg font-medium text-[var(--github-text-primary)]"
          >
            {title}
          </h2>
          <p className="mt-1 text-sm text-[var(--github-text-secondary)]">
            {subtitle}
          </p>
        </div>
      </header>

      <div className="px-4 py-3 rounded-md bg-[var(--github-bg)]/40 border border-dashed border-[var(--github-border-primary)]">
        <p className="text-xs text-[var(--github-text-secondary)]/70 font-mono mb-1">
          Classe rejointe
        </p>
        <p className="text-base font-medium text-[var(--github-text-primary)]">
          {result.class_name}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button asChild variant="emerald-soft" className="min-h-11 gap-2">
          <Link to="/app">
            Voir le tableau de bord
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        </Button>
        <Button
          type="button"
          variant="ghost-gh"
          className="min-h-11"
          onClick={onReset}
        >
          Rejoindre une autre classe
        </Button>
      </div>
    </Card>
  );
}
