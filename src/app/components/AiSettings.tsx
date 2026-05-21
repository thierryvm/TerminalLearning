/**
 * AiSettings — THI-112 Phase B.
 *
 * Settings page under `/app/settings` that lets the learner review and
 * manage everything the AI tutor stores locally:
 *  - per-provider key status (configured? plain or encrypted?) — the
 *    key body itself is never rendered, masked or otherwise, to keep
 *    zero-disclosure on a casual screen-share or screenshot
 *  - consent record (accepted? when? expires when? remaining days)
 *  - actions: edit a key (mounts AiKeySetup inline), forget a key,
 *    revoke consent
 *
 * No data ever leaves the browser from this page — every action is a
 * local read or local write. The consent revocation button calls
 * `useAiTutor.revokeConsent` which removes the JSON record from
 * localStorage; the next AI tutor open re-prompts.
 *
 * The page intentionally does NOT mount the full `useAiTutor` hook
 * (which would require a `lang` and possibly a `lessonContext`) — it
 * uses the lighter `keyManager` + `readConsentRecord` helpers directly
 * because we only need read-only state plus two local mutations.
 */
import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import { Link } from 'react-router';
import { ArrowLeft, KeyRound, ShieldCheck, Trash2 } from 'lucide-react';

import {
  forgetKey as kmForgetKey,
  hasKey as kmHasKey,
  isEncrypted as kmIsEncrypted,
  type Provider,
} from '@/lib/ai/keyManager';
import { resolveModel } from '@/lib/ai/providers';
import { PROVIDER_LABELS } from '@/lib/ai/providers/meta';
import {
  CONSENT_KEY,
  readConsentRecord,
  type ConsentRecord,
} from '@/lib/ai/useAiTutor';

import { AiKeySetup } from './ai/AiKeySetup';

const PROVIDERS: readonly Provider[] = ['openrouter', 'anthropic', 'openai', 'gemini'];

interface ProviderStatus {
  provider: Provider;
  configured: boolean;
  encrypted: boolean;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// THI-153 / Sourcery review on #234 — the forget-key and revoke-consent
// buttons share the exact same destructive styling (only `mt-3` differs).
// Extracting a tiny local helper keeps the truly-duplicated styles in one
// place so a future palette change touches one line instead of two.
// Banner / inline error usages elsewhere (AiTutorPanel, MessageInput,
// RateLimitBadge) share the `var(--github-red)` color token but not the
// surrounding layout, so they stay inlined intentionally.
interface DestructiveActionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
}

function DestructiveActionButton({
  icon,
  children,
  className = '',
  ...rest
}: DestructiveActionButtonProps) {
  return (
    <button
      type="button"
      className={`flex items-center gap-1 rounded-md border border-[var(--github-red)]/40 bg-[var(--github-red)]/10 px-3 py-1.5 text-xs text-[var(--github-red)] outline-none hover:bg-[var(--github-red)]/20 focus-visible:ring-2 focus-visible:ring-[var(--github-red)]/60 ${className}`.trim()}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

function formatDateFr(ts: number): string {
  return new Date(ts).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function daysRemaining(expiresAt: number): number {
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / ONE_DAY_MS));
}

export function AiSettings() {
  const [statuses, setStatuses] = useState<readonly ProviderStatus[]>([]);
  const [consent, setConsent] = useState<ConsentRecord | null>(null);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);

  // Refresh local-storage / IndexedDB-backed state. Called on mount and
  // whenever a save / forget / revoke action mutates that state so the UI
  // reflects the change without forcing a page reload.
  const refresh = useCallback(async () => {
    const next = await Promise.all(
      PROVIDERS.map(async (p) => ({
        provider: p,
        configured: await kmHasKey(p),
        encrypted: await kmIsEncrypted(p),
      })),
    );
    setStatuses(next);
    setConsent(readConsentRecord());
  }, []);

  useEffect(() => {
    // `refresh` is async: it awaits four `keyManager.hasKey/isEncrypted`
    // calls (IndexedDB-backed) before resolving and only then updates
    // state. This is exactly the "subscribe for updates from an external
    // system" shape the React docs sanction — there is no cascading-
    // render risk because the state writes happen post-await, after the
    // current render cycle is committed. The lint rule cannot model the
    // async boundary, so we silence it here with explicit rationale.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const onForget = useCallback(
    async (p: Provider) => {
      await kmForgetKey(p);
      if (editingProvider === p) setEditingProvider(null);
      await refresh();
    },
    [editingProvider, refresh],
  );

  const onRevokeConsent = useCallback(async () => {
    try {
      localStorage.removeItem(CONSENT_KEY);
    } catch {
      /* storage may be disabled — best effort */
    }
    await refresh();
  }, [refresh]);

  const onSavedFromEditor = useCallback(async () => {
    setEditingProvider(null);
    await refresh();
  }, [refresh]);

  return (
    <div
      className="min-h-dvh bg-[var(--github-bg)] text-[var(--github-text-primary)]"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Link
            to="/app"
            className="text-[var(--github-text-secondary)] hover:text-[var(--github-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 rounded p-1"
            aria-label="Retour au tableau de bord"
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </Link>
          <h1 className="text-2xl font-bold">Paramètres IA</h1>
        </div>

        <p className="mb-8 text-sm text-[var(--github-text-secondary)]">
          Gestion locale de tes clés API et de ton consentement pour le tuteur
          IA. Aucune donnée ne quitte ce navigateur depuis cette page. Détails
          complets dans la{' '}
          <Link
            to="/privacy#ai-processing"
            className="text-emerald-400 underline hover:text-emerald-300"
          >
            section IA de la politique de confidentialité
          </Link>
          .
        </p>

        <section aria-labelledby="ai-settings-keys" className="mb-10">
          <h2
            id="ai-settings-keys"
            className="mb-4 flex items-center gap-2 text-lg font-semibold"
          >
            <KeyRound size={18} className="text-emerald-400" aria-hidden="true" />
            Clés API par provider
          </h2>
          <ul className="space-y-3">
            {statuses.map((s) => (
              <li
                key={s.provider}
                className="rounded-lg border border-[var(--github-border-primary)] bg-[var(--github-border-secondary)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{PROVIDER_LABELS[s.provider]}</p>
                    <p className="mt-1 text-xs text-[var(--github-text-secondary)]">
                      Modèle utilisé :{' '}
                      <code className="rounded bg-[var(--github-bg-tertiary)] px-1 py-0.5">
                        {resolveModel(s.provider)}
                      </code>
                    </p>
                    <p className="mt-2 text-sm">
                      Statut :{' '}
                      {s.configured ? (
                        <>
                          <span className="text-emerald-400">Configurée</span>
                          {' · '}
                          <span className="text-[var(--github-text-secondary)]">
                            {s.encrypted ? 'chiffrée (AES-GCM)' : 'en clair'}
                          </span>
                        </>
                      ) : (
                        <span className="text-[var(--github-text-secondary)]">
                          Non configurée
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingProvider((cur) => (cur === s.provider ? null : s.provider))
                      }
                      aria-expanded={editingProvider === s.provider}
                      aria-controls={`ai-settings-editor-${s.provider}`}
                      className="rounded-md bg-[var(--github-accent)] px-3 py-1.5 text-xs font-medium text-white outline-none hover:bg-[var(--github-accent-hover)] focus-visible:ring-2 focus-visible:ring-emerald-500/60"
                    >
                      {s.configured ? 'Modifier' : 'Configurer'}
                    </button>
                    {s.configured && (
                      <DestructiveActionButton
                        onClick={() => void onForget(s.provider)}
                        icon={<Trash2 size={12} aria-hidden="true" />}
                      >
                        Oublier
                      </DestructiveActionButton>
                    )}
                  </div>
                </div>
                {editingProvider === s.provider && (
                  <div
                    id={`ai-settings-editor-${s.provider}`}
                    className="mt-4 rounded-md border border-[var(--github-border-primary)] bg-[var(--github-bg-secondary)]"
                  >
                    <AiKeySetup
                      provider={s.provider}
                      onSaved={() => void onSavedFromEditor()}
                      className="flex flex-col gap-3 p-4 text-sm text-[var(--github-text-primary)]"
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="ai-settings-consent">
          <h2
            id="ai-settings-consent"
            className="mb-4 flex items-center gap-2 text-lg font-semibold"
          >
            <ShieldCheck size={18} className="text-emerald-400" aria-hidden="true" />
            Consentement
          </h2>
          {consent ? (
            <div className="rounded-lg border border-[var(--github-border-primary)] bg-[var(--github-border-secondary)] p-4">
              <p className="text-sm">
                <span className="text-emerald-400">Consentement actif</span>{' '}
                <span className="text-[var(--github-text-secondary)]">
                  (version {consent.version})
                </span>
              </p>
              <p className="mt-2 text-sm text-[var(--github-text-secondary)]">
                Accepté le{' '}
                <strong className="text-[var(--github-text-primary)]">
                  {formatDateFr(consent.acceptedAt)}
                </strong>
                {' · '}expire le{' '}
                <strong className="text-[var(--github-text-primary)]">
                  {formatDateFr(consent.expiresAt)}
                </strong>{' '}
                ({daysRemaining(consent.expiresAt)} jours restants).
              </p>
              <DestructiveActionButton
                onClick={() => void onRevokeConsent()}
                className="mt-3"
                icon={<Trash2 size={12} aria-hidden="true" />}
              >
                Révoquer le consentement
              </DestructiveActionButton>
            </div>
          ) : (
            <div className="rounded-lg border border-[var(--github-border-primary)] bg-[var(--github-border-secondary)] p-4 text-sm text-[var(--github-text-secondary)]">
              Aucun consentement actif. Le tuteur IA te le redemandera à la
              prochaine ouverture du panel.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
