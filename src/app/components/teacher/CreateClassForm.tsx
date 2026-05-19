/**
 * CreateClassForm — Sprint 2.A étape 2 inline form (not a modal).
 *
 * Pattern choice (validated 19/05/2026) : inline expandable form rather
 * than a shadcn/ui Dialog. Justification :
 *   - @radix-ui/react-dialog not installed (would add a dep for 1 input)
 *   - AdminPanel pattern uses no modals — coherent across role dashboards
 *   - Trivial form (1 name input) doesn't need focus trap + portal
 *   - shadcn Dialog will be added Sprint 2.B+ if 2+ modals justify it
 *
 * The form is rendered inside a Card surface, appears above the class list
 * when the parent toggles `isOpen=true`. Auto-focuses the input on open
 * for keyboard parity with a native modal.
 */
import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';

import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';

interface CreateClassFormProps {
  isOpen: boolean;
  creating: boolean;
  error: Error | null;
  onSubmit: (name: string) => Promise<void> | void;
  onCancel: () => void;
}

export function CreateClassForm({
  isOpen,
  creating,
  error,
  onSubmit,
  onCancel,
}: CreateClassFormProps) {
  const [name, setName] = useState('');

  // No reset useEffect needed : when isOpen flips to false, the parent
  // unmounts this component (via the early return below), so React tears
  // down the local state automatically. Reopening creates a fresh instance.
  if (!isOpen) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || creating) return;
    await onSubmit(trimmed);
    setName('');
  };

  return (
    <Card
      variant="tl-surface"
      className="px-5 py-5 gap-3 mb-4"
      role="region"
      aria-labelledby="create-class-heading"
    >
      <header className="flex items-center justify-between gap-3">
        <h2
          id="create-class-heading"
          className="text-base font-medium text-[var(--github-text-primary)]"
        >
          Nouvelle classe
        </h2>
        <Button
          type="button"
          variant="tl-sidebar-icon"
          size="icon-lg"
          onClick={onCancel}
          aria-label="Fermer le formulaire"
          className="rounded-lg"
        >
          <X size={16} aria-hidden="true" />
        </Button>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label
          htmlFor="class-name"
          className="text-sm text-[var(--github-text-secondary)]"
        >
          Nom de la classe
        </label>
        <Input
          id="class-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ex : Bash 101 — Promotion 2026"
          maxLength={80}
          required
          aria-describedby={error ? 'create-class-error' : undefined}
          disabled={creating}
          autoComplete="off"
          // Auto-focus when the form opens (parent toggles isOpen on user click,
          // so focus is user-initiated — accessibility-safe). Re-mount on each
          // open ensures autoFocus retriggers.
          autoFocus
          key={isOpen ? 'open' : 'closed'}
        />

        {error && (
          <p
            id="create-class-error"
            className="text-sm text-red-400 font-mono"
            role="alert"
          >
            {error.message}
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            type="submit"
            variant="emerald-soft"
            className="min-h-11"
            disabled={creating || !name.trim()}
          >
            {creating ? 'Création…' : 'Créer la classe'}
          </Button>
          <Button
            type="button"
            variant="ghost-gh"
            className="min-h-11"
            onClick={onCancel}
            disabled={creating}
          >
            Annuler
          </Button>
        </div>

        <p className="text-xs text-[var(--github-text-secondary)]/70 font-mono mt-1">
          Un code d&apos;invitation 12 caractères sera généré automatiquement. Tu pourras le partager via une URL.
        </p>
      </form>
    </Card>
  );
}
