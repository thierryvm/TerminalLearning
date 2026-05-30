/**
 * SupportTicketModal — Sprint 2.C Étape 2 (THI-295).
 *
 * Authenticated users submit a support ticket (bug / suggestion / question) with
 * an optional screenshot. Overlay popup modal mirroring the PWAInstallModal
 * pattern (fixed inset overlay + stop-propagation card), hardened for a11y with
 * useFocusTrap + Escape (the install modal lacks both; a form modal must trap
 * focus to satisfy WCAG 2.2). The submit flow is delegated to `submitTicket`
 * (upload → signed URL → insert), which owns all validation + FR error mapping.
 *
 * Access is gated by the caller (Sidebar renders this only when a user is signed
 * in) because the underlying RLS requires auth.uid(); `userId` is passed in.
 */
import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { X, LifeBuoy, CheckCircle2, AlertCircle, ImageUp } from 'lucide-react';
import { Button } from '../ui/button';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import {
  submitTicket,
  isAllowedMime,
  ALLOWED_SCREENSHOT_MIME,
  MAX_SCREENSHOT_BYTES,
  DESCRIPTION_MIN,
  DESCRIPTION_MAX,
} from '@/lib/support/submitTicket';
import type { SupportTicketType } from '@/app/types/database';

interface SupportTicketModalProps {
  userId: string;
  onClose: () => void;
}

const TYPE_OPTIONS: { value: SupportTicketType; label: string }[] = [
  { value: 'bug', label: 'Bug' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'question', label: 'Question' },
];

const ACCEPT_ATTR = ALLOWED_SCREENSHOT_MIME.join(',');
const SCREENSHOT_LABEL = 'Capture d’écran (optionnel)';

export function SupportTicketModal({ userId, onClose }: SupportTicketModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const descHintId = useId();
  const fileId = useId();

  const [type, setType] = useState<SupportTicketType>('bug');
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useFocusTrap(true, dialogRef);

  // Escape closes the modal — but never mid-submit (avoid orphaning an upload
  // in flight). The focus-trap hook intentionally leaves Escape to callers.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, submitting]);

  // Auto-close shortly after a successful submit so the user sees the
  // confirmation, then the modal dismisses itself.
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(onClose, 2200);
    return () => clearTimeout(t);
  }, [done, onClose]);

  const trimmedLength = description.trim().length;
  const descriptionValid = trimmedLength >= DESCRIPTION_MIN && trimmedLength <= DESCRIPTION_MAX;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setFileError(null);
    if (!file) {
      setScreenshot(null);
      return;
    }
    if (!isAllowedMime(file.type)) {
      setFileError('Format non supporté. Utilisez PNG, JPG ou WebP.');
      setScreenshot(null);
      e.target.value = '';
      return;
    }
    if (file.size > MAX_SCREENSHOT_BYTES) {
      setFileError('Image trop lourde (max 5 Mo).');
      setScreenshot(null);
      e.target.value = '';
      return;
    }
    setScreenshot(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!descriptionValid || submitting) return;
    setSubmitting(true);
    setError(null);
    const { error: submitError } = await submitTicket({ userId, type, description, screenshot });
    setSubmitting(false);
    if (submitError) {
      setError(submitError);
      return;
    }
    setDone(true);
  };

  // Backdrop click closes only when the form is pristine — protects a typed
  // report from a stray click. X button + Escape always close.
  const handleBackdrop = () => {
    if (!submitting && trimmedLength === 0 && !screenshot) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={handleBackdrop}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-[var(--github-border-secondary)] border border-[var(--github-border-primary)] rounded-xl w-full max-w-md shadow-2xl focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--github-border-primary)]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <LifeBuoy size={16} className="text-emerald-400" aria-hidden="true" />
            </div>
            <h2 id={titleId} className="text-sm font-semibold text-[var(--github-text-primary)]">
              Signaler un problème
            </h2>
          </div>
          <Button
            variant="tl-icon-ghost"
            size="tl-icon-sm"
            onClick={onClose}
            disabled={submitting}
            aria-label="Fermer"
          >
            <X size={16} aria-hidden="true" />
          </Button>
        </div>

        {done ? (
          <div className="px-5 py-8 text-center space-y-3">
            <CheckCircle2 size={44} className="text-emerald-400 mx-auto" aria-hidden="true" />
            <p className="text-sm text-[var(--github-text-primary)]" role="status">
              Merci ! Ton signalement a bien été envoyé.
            </p>
            <p className="text-xs text-[var(--github-text-secondary)]">
              On y jette un œil dès que possible.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4" noValidate>
            {/* Type selector */}
            <fieldset>
              <legend className="text-xs font-medium text-[var(--github-text-secondary)] mb-1.5">
                Type
              </legend>
              <div className="flex gap-2">
                {TYPE_OPTIONS.map((opt) => {
                  const active = type === opt.value;
                  return (
                    <label
                      key={opt.value}
                      className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center text-sm transition-colors ${
                        active
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-[var(--github-text-primary)]'
                          : 'border-[var(--github-border-primary)] bg-[var(--github-bg-secondary)] text-[var(--github-text-secondary)] hover:text-[var(--github-text-primary)]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="ticket-type"
                        value={opt.value}
                        checked={active}
                        onChange={() => setType(opt.value)}
                        className="sr-only"
                      />
                      {opt.label}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {/* Description */}
            <div>
              <label
                htmlFor={descId}
                className="block text-xs font-medium text-[var(--github-text-secondary)] mb-1.5"
              >
                Description
              </label>
              <textarea
                id={descId}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={DESCRIPTION_MAX}
                required
                aria-describedby={descHintId}
                placeholder="Décris ce qui ne va pas, ou ton idée…"
                className="w-full rounded-lg border border-[var(--github-border-primary)] bg-[var(--github-bg-secondary)] px-3 py-2 text-sm text-[var(--github-text-primary)] placeholder:text-[var(--github-text-secondary)] outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
              />
              <p id={descHintId} className="mt-1 text-xs text-[var(--github-text-secondary)]">
                {trimmedLength < DESCRIPTION_MIN
                  ? `Encore ${DESCRIPTION_MIN - trimmedLength} caractère(s) minimum.`
                  : `${trimmedLength} / ${DESCRIPTION_MAX}`}
              </p>
            </div>

            {/* Screenshot */}
            <div>
              {/* Single <label> (the dropzone wraps the input). aria-label gives the
                  meaningful field name and wins over the wrapper's text content, so
                  there is exactly one label element — no double-activation. */}
              <span className="block text-xs font-medium text-[var(--github-text-secondary)] mb-1.5">
                {SCREENSHOT_LABEL}
              </span>
              <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-dashed border-[var(--github-border-primary)] bg-[var(--github-bg-secondary)] px-3 py-2 text-sm text-[var(--github-text-secondary)] hover:text-[var(--github-text-primary)]">
                <ImageUp size={16} aria-hidden="true" />
                <span className="truncate">{screenshot ? screenshot.name : 'Ajouter une image (PNG, JPG, WebP — 5 Mo max)'}</span>
                <input
                  id={fileId}
                  type="file"
                  accept={ACCEPT_ATTR}
                  aria-label={SCREENSHOT_LABEL}
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </label>
              {fileError && (
                <p className="mt-1 text-xs text-red-400" role="alert">
                  {fileError}
                </p>
              )}
            </div>

            {/* PII disclaimer (micro-décision verrouillée 28/05 — pas de scrubber auto v1) */}
            <p className="text-xs text-[var(--github-text-secondary)] bg-[var(--github-bg-secondary)] border border-[var(--github-border-primary)] rounded-lg px-3 py-2">
              Ne partage pas d’email perso, mot de passe ou donnée sensible dans ce
              formulaire.
            </p>

            {error && (
              <p
                className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
                role="alert"
              >
                <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="tl-tab" size="cta-pill-sm" onClick={onClose} disabled={submitting}>
                Annuler
              </Button>
              <Button
                type="submit"
                variant="emerald"
                size="cta-pill-sm"
                disabled={!descriptionValid || submitting}
              >
                {submitting ? 'Envoi…' : 'Envoyer'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
