/**
 * AgeGateStep — THI-340. The screen shown before an account can be created.
 *
 * Two states, one component:
 *   • the question — a neutral date of birth, no hint about the threshold
 *   • the refusal  — shown when the answer is under 13, framed around what the
 *     visitor CAN still do rather than what they cannot
 *
 * Neutrality is the point (see src/lib/auth/ageGate.ts): a checkbox reading
 * "I am 13 or older" teaches which answer unlocks the form. A date does not.
 *
 * The date never leaves the browser — it is evaluated here and dropped. Only a
 * yes/no crosses into the rest of the flow.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { evaluateBirthDate, markAgeBlocked, markAgeVerified } from '@/lib/auth/ageGate';

interface AgeGateStepProps {
  /** Called once the visitor is cleared to create an account. */
  onVerified: () => void;
  /** Closes the surrounding modal (used by the "keep learning" exit). */
  onDismiss: () => void;
  /**
   * ISO date at which a previously blocked visitor becomes eligible. When set,
   * the refusal is rendered straight away and the question is skipped — a
   * blocked visitor does not get to answer again in the same breath.
   */
  blockedUntil?: string | null;
}

/** Local-time `YYYY-MM-DD`, for the input's `max` bound. */
function todayIso(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function AgeGateStep({ onVerified, onDismiss, blockedUntil = null }: AgeGateStepProps) {
  const navigate = useNavigate();
  const [birthDate, setBirthDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<boolean>(blockedUntil !== null);

  // The whole view swaps from the question to the refusal: without a focus
  // move, a screen reader user gets no signal that anything changed
  // (ui-auditor H1). Only on that transition — a visitor who opens the modal
  // already blocked keeps the dialog's default focus.
  const refusalRef = useRef<HTMLParagraphElement>(null);
  const announceRefusal = useRef(false);
  useEffect(() => {
    if (blocked && announceRefusal.current) {
      announceRefusal.current = false;
      refusalRef.current?.focus();
    }
  }, [blocked]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const verdict = evaluateBirthDate(birthDate, new Date());

    if (verdict.allowed) {
      markAgeVerified();
      onVerified();
      return;
    }

    // No eligibility date means the entry itself was unusable (malformed,
    // impossible day, or in the future) — ask again rather than refuse, and
    // persist nothing.
    if (!verdict.eligibleAt) {
      setError('Cette date ne semble pas valide. Vérifie-la et réessaie.');
      return;
    }

    markAgeBlocked(verdict.eligibleAt);
    announceRefusal.current = true;
    setBlocked(true);
  };

  const keepLearning = () => {
    onDismiss();
    navigate('/app');
  };

  if (blocked) {
    return (
      <div className="space-y-4">
        <p
          ref={refusalRef}
          tabIndex={-1}
          className="text-sm text-[var(--github-text-primary)] focus:outline-none"
        >
          Tu peux apprendre sans compte.
        </p>
        <p className="text-sm text-[var(--github-text-secondary)]">
          La création d'un compte n'est pas possible avant 13 ans — c'est l'âge du
          consentement numérique en Belgique.
        </p>
        <p className="text-sm text-[var(--github-text-secondary)]">
          Rien n'est perdu : <strong className="text-[var(--github-text-primary)]">tout Terminal
          Learning fonctionne sans compte</strong> — les leçons, le terminal, les exercices. Le
          compte ne sert qu'à retrouver ta progression sur un autre appareil.
        </p>
        <Button
          type="button"
          variant="emerald"
          size="tl-install-cta"
          onClick={keepLearning}
          className="font-mono focus-visible:ring-emerald-500/60 focus-visible:ring-2 focus-visible:ring-offset-0"
        >
          Continuer sans compte
        </Button>
        <p className="text-center text-xs text-[var(--github-text-secondary)] font-mono">
          <a
            href="/privacy"
            className="text-emerald-400 hover:text-emerald-300 focus-visible:underline transition-colors"
          >
            Pourquoi cette limite ?
          </a>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label
          htmlFor="age-gate-birthdate"
          className="block text-sm text-[var(--github-text-primary)]"
        >
          Ta date de naissance
        </label>
        <Input
          id="age-gate-birthdate"
          type="date"
          name="birthdate"
          // A shared family device must not offer the date back to the next
          // visitor (security-auditor L6).
          autoComplete="off"
          max={todayIso()}
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          aria-describedby={error ? 'age-gate-help age-gate-error' : 'age-gate-help'}
          aria-invalid={error ? true : undefined}
          // The global <meta name="color-scheme"> is not enough for native
          // controls: without this the date picker renders light-themed on
          // the dark background (same fix as SupportTicketsSection, ui-auditor H2).
          className="[color-scheme:dark] w-full min-h-11 px-3 py-2.5 rounded-lg border border-[var(--github-border-primary)] bg-[var(--github-bg)] text-[var(--github-text-primary)] text-base md:text-sm font-mono focus:outline-none focus:border-emerald-500/40 focus-visible:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500/40 transition-colors"
          required
        />
        <p id="age-gate-help" className="text-xs text-[var(--github-text-secondary)]">
          Demandée une seule fois, pour savoir si un compte peut être créé.
          Elle n'est jamais envoyée à nos serveurs.
        </p>
      </div>

      {error && (
        <p id="age-gate-error" role="alert" className="text-[var(--github-red)] text-xs font-mono">
          {error}
        </p>
      )}

      <Button
        type="submit"
        variant="emerald"
        size="tl-install-cta"
        className="font-mono focus-visible:ring-emerald-500/60 focus-visible:ring-2 focus-visible:ring-offset-0"
      >
        Continuer
      </Button>
    </form>
  );
}
