/**
 * AiConsentModal — THI-112 Phase A commit 2.
 *
 * Standalone consent block, extracted from the previously inline
 * `ConsentBlock` inside `AiTutorPanel`. Same UX (in-panel disclosure with
 * a checkbox + accept button), now reusable so the upcoming `AiSettings`
 * page (Phase B) can surface the same disclosure when the learner reviews
 * or revokes consent.
 *
 * Storage contract is owned by `useAiTutor.ts`:
 *  - `tutor.giveConsent()` writes a versioned `ConsentRecord` payload
 *    `{ version, acceptedAt, expiresAt }` to localStorage (M3-AI fix from
 *    the llm-security-auditor 9.0/10 re-baseline; previously a bare
 *    `'true'` literal with no timestamp, no expiry, no version)
 *  - `tutor.consentGiven` is `false` again when the record expires or its
 *    version no longer matches `CONSENT_VERSION`, so this component
 *    re-renders and the learner is prompted again
 *
 * Despite the historical name "Modal" (kept to match Linear THI-112), the
 * component is rendered inline inside the panel's flex column rather than
 * a Dialog popup — the panel's own drawer container already serves as the
 * modal surface. The standalone export lets us reuse the disclosure body
 * elsewhere (e.g. a review banner under /app/settings).
 */
import {
  useId,
  useState,
  type ChangeEvent,
} from 'react';
import { Link } from 'react-router';

export interface AiConsentModalProps {
  /** Called when the learner ticks the checkbox and confirms. */
  onAccept: () => void;
  /** Optional: CSS class overrides for embedding contexts. */
  className?: string;
}

export function AiConsentModal({ onAccept, className }: AiConsentModalProps) {
  const [checked, setChecked] = useState(false);
  const checkboxId = useId();

  const handleCheckboxChange = (e: ChangeEvent<HTMLInputElement>) => {
    setChecked(e.target.checked);
  };

  return (
    <div
      role="region"
      aria-labelledby="ai-consent-title"
      className={
        className ??
        'flex flex-1 flex-col gap-3 overflow-y-auto p-4 text-sm text-[var(--github-text-primary)]'
      }
    >
      <h3 id="ai-consent-title" className="sr-only">
        Consentement Tuteur IA
      </h3>
      <p>
        Avant d'utiliser le tuteur IA, j'ai besoin que tu confirmes trois
        points importants :
      </p>
      <ul className="list-disc space-y-1 pl-5 text-[var(--github-text-secondary)]">
        <li>
          Ta clé API reste stockée sur <strong>ce navigateur uniquement</strong>.
          Aucun serveur Terminal Learning ne la voit.
        </li>
        <li>
          Tes questions sont envoyées <strong>directement au provider choisi</strong>{' '}
          (OpenRouter, Anthropic, OpenAI ou Gemini). Ton historique terminal,
          ton profil et tes données de leçon ne sont pas partagés.
        </li>
        <li>
          Tu peux supprimer ta clé à tout moment via le bouton « Oublier ma clé ».
        </li>
      </ul>
      <p className="text-xs text-[var(--github-text-secondary)]">
        Détails complets dans la{' '}
        <Link
          to="/privacy#ai-processing"
          className="text-[var(--github-accent)] underline hover:text-[var(--github-accent-hover)]"
        >
          section IA de la politique de confidentialité
        </Link>
        . Pas sûr·e du provider à choisir ?{' '}
        <a
          href="https://github.com/thierryvm/TerminalLearning/blob/main/docs/guides/ai-tutor-quickstart.md"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--github-accent)] underline hover:text-[var(--github-accent-hover)]"
        >
          Lire le guide démarrage (5 min) →
        </a>
      </p>
      <label
        htmlFor={checkboxId}
        className="mt-2 flex cursor-pointer items-start gap-2 rounded-md border border-[var(--github-border-primary)] bg-[var(--github-bg-secondary)] p-3"
      >
        <input
          id={checkboxId}
          type="checkbox"
          checked={checked}
          onChange={handleCheckboxChange}
          className="mt-0.5 h-4 w-4 cursor-pointer accent-[var(--github-accent)]"
          aria-describedby="ai-consent-summary"
        />
        <span id="ai-consent-summary" className="text-[var(--github-text-primary)]">
          <strong>J'ai lu et compris</strong> les trois points ci-dessus.
        </span>
      </label>
      <button
        type="button"
        onClick={onAccept}
        disabled={!checked}
        className="mt-2 self-start rounded-md bg-[var(--github-accent)] px-4 py-2 text-sm font-medium text-white outline-none transition hover:bg-[var(--github-accent-hover)] focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Accepter et utiliser le tuteur IA
      </button>
      <p className="text-xs text-[var(--github-text-secondary)]">
        Ton consentement est valable 12 mois et peut être révoqué à tout
        moment depuis les paramètres ou en cliquant « Oublier ma clé »
        ci-dessous.
      </p>
    </div>
  );
}
