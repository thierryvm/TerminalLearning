/**
 * ProfilePage — THI-42 PR #1 (shell).
 *
 * Profile Hub minimal under `/app/profile`. Scope verrouillé D1-D4 :
 *  - D1 : pas de SettingsPage.tsx créée (obsolète post-AiSettings THI-112) —
 *         on link vers `/app/settings` existant pour AI key + consent management
 *  - D2 : Avatar OAuth read-only (GitHub `avatar_url` / Google `picture`).
 *         Upload custom Supabase Storage = PR #2 différable.
 *  - D3 : Environnement actif affiché en read-only avec lien vers la sidebar
 *         (switcher réel reste dans la Sidebar — extraction du composant = PR #2 ou plus tard).
 *  - D4 : Mini-PR lti-auditor déjà livrée.
 *
 * UserMenu (variant card + compact dropdown) gagne un lien "Mon profil"
 * vers cette page dans la même PR.
 *
 * Cette page ne mute rien côté serveur — c'est un hub read-only pour PR #1.
 * PR #2 ajoutera l'édition (pseudo, bio, langue, notif prefs, danger zone).
 * PR #3 ajoutera les sections role-aware (Mes classes pour teacher, Admin
 * Panel pour admin) dans le UserMenu dropdown ET ici via tabs.
 */
import { useState } from 'react';
import { Link } from 'react-router';
import { Helmet } from 'react-helmet-async';
import { z } from 'zod';
import { ArrowLeft, Check, Github, KeyRound, Mail, Monitor, Pencil, Sliders, X } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useEnvironment, ENV_META } from '../context/EnvironmentContext';
import { RequireAuth } from './auth/RequireAuth';
import { UserAvatar } from './auth/UserAvatar';
import { Button } from './ui/button';
import { Input } from './ui/input';

// THI-344 — display_name edit. user_metadata is free-form JSON (Supabase does
// not validate it), so we constrain it client-side. Rendering is React-escaped
// (no XSS), but we still trim + cap length to keep the UI sane.
const NAME_SCHEMA = z
  .string()
  .trim()
  .min(1, 'Le nom ne peut pas être vide')
  .max(50, 'Maximum 50 caractères');

// OAuth provider label + icon — mirrors the subset of providers we currently
// support in LoginModal (GitHub + Google email/password). Anything else
// falls back to the generic "Email" label.
function ProviderBadge({ provider }: { provider: string | undefined }) {
  if (provider === 'github') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--github-text-secondary)]">
        <Github size={12} aria-hidden="true" />
        Connecté via GitHub
      </span>
    );
  }
  if (provider === 'google') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--github-text-secondary)]">
        {/* lucide-react has no Google icon — we use a colored G letter */}
        <span aria-hidden="true" className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-500 via-red-500 to-yellow-500" />
        Connecté via Google
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--github-text-secondary)]">
      <Mail size={12} aria-hidden="true" />
      Connecté par email
    </span>
  );
}

export function ProfilePage() {
  return (
    <RequireAuth
      fallback={
        <main className="flex-1 px-6 py-12 max-w-4xl mx-auto">
          <p className="text-[var(--github-text-secondary)] text-sm font-mono">
            Vous devez être connecté pour accéder à votre profil.{' '}
            <Link to="/" className="text-emerald-400 hover:text-emerald-300 underline">
              Retour à l&apos;accueil
            </Link>
          </p>
        </main>
      }
    >
      <ProfilePageContent />
    </RequireAuth>
  );
}

function ProfilePageContent() {
  // RequireAuth above guarantees user is non-null and session is initialized.
  const { user } = useAuth();
  const { selectedEnv } = useEnvironment();
  // Hooks must run before any early return (rules-of-hooks). nameValue is seeded
  // from displayName in startEdit() (displayName is derived after the guard).
  const [isEditing, setIsEditing] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null; // type-narrowing for TS — never reached at runtime

  const avatarUrl =
    (user.user_metadata?.avatar_url as string | undefined) ??
    (user.user_metadata?.picture as string | undefined);
  const displayName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.user_name as string | undefined) ??
    user.email?.split('@')[0] ??
    'Utilisateur';
  const initials = displayName[0].toUpperCase();
  const provider = user.app_metadata?.provider;

  const envMeta = ENV_META[selectedEnv];

  const startEdit = () => {
    setNameValue(displayName);
    setError(null);
    setIsEditing(true);
  };

  const handleSave = async () => {
    const parsed = NAME_SCHEMA.safeParse(nameValue);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Nom invalide');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { supabase } = await import('../../lib/supabase');
      if (!supabase) {
        setError('Service indisponible.');
        return;
      }
      // updateUser acts on the caller's own JWT — no cross-user surface. The
      // emitted USER_UPDATED event refreshes `user` via AuthContext, so the
      // displayed name re-renders without a manual refetch.
      const { error: updateError } = await supabase.auth.updateUser({
        data: { full_name: parsed.data },
      });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setIsEditing(false);
    } catch {
      setError('Erreur réseau, réessayez.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex-1 px-6 py-8 max-w-4xl mx-auto w-full">
      <Helmet>
        <title>Mon profil — Terminal Learning</title>
        <meta name="description" content="Profil utilisateur Terminal Learning — identité, environnement, paramètres IA." />
      </Helmet>

      <Link
        to="/app"
        className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--github-text-secondary)] hover:text-[var(--github-text-primary)] transition-colors mb-4 -mx-2 px-2 py-3 min-h-11 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
      >
        <ArrowLeft size={12} aria-hidden="true" />
        Retour au tableau de bord
      </Link>

      <h1 className="text-2xl font-semibold text-[var(--github-text-primary)] mb-2">Mon profil</h1>
      <p className="text-sm text-[var(--github-text-secondary)] mb-8">
        Informations de compte, environnement actif et paramètres. <span className="text-[var(--github-text-secondary)]/70">Export de données et suppression de compte bientôt disponibles.</span>
      </p>

      {/* ── Identité ──────────────────────────────────────────────────── */}
      <section className="mb-8" aria-labelledby="profile-identity-heading">
        <h2 id="profile-identity-heading" className="text-sm font-medium text-[var(--github-text-secondary)] font-mono uppercase tracking-wider mb-3">
          Identité
        </h2>
        <div className="px-5 py-5 rounded-lg bg-[var(--github-border-secondary)] border border-[var(--github-border-primary)] flex items-center gap-5">
          <UserAvatar avatarUrl={avatarUrl} initials={initials} size="lg" />
          <div className="min-w-0 flex-1">
            {isEditing ? (
              <div>
                <label htmlFor="profile-display-name" className="sr-only">
                  Nom affiché
                </label>
                <Input
                  id="profile-display-name"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  maxLength={50}
                  autoFocus
                  disabled={saving}
                  aria-invalid={error ? true : undefined}
                  className="text-base"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') setIsEditing(false);
                  }}
                />
                {error && (
                  <p role="alert" className="mt-1 text-xs text-[var(--github-red)] font-mono">
                    {error}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    variant="emerald-soft"
                    size="link-inline"
                    onClick={handleSave}
                    disabled={saving}
                    className="gap-1.5 px-3 min-h-9 rounded-md text-xs"
                  >
                    <Check size={13} aria-hidden="true" />
                    {saving ? 'Enregistrement…' : 'Enregistrer'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="link-inline"
                    onClick={() => setIsEditing(false)}
                    disabled={saving}
                    className="gap-1.5 px-3 min-h-9 rounded-md text-xs"
                  >
                    <X size={13} aria-hidden="true" />
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-lg text-[var(--github-text-primary)] font-medium truncate">{displayName}</p>
                <Button
                  variant="ghost"
                  size="link-inline"
                  onClick={startEdit}
                  aria-label="Modifier le nom affiché"
                  className="shrink-0 gap-1 px-2 min-h-9 rounded-md text-xs text-[var(--github-text-secondary)] hover:text-emerald-300"
                >
                  <Pencil size={12} aria-hidden="true" />
                  Modifier
                </Button>
              </div>
            )}
            <p className="text-sm text-[var(--github-text-secondary)] truncate font-mono mt-0.5">{user.email}</p>
            <div className="mt-2">
              <ProviderBadge provider={typeof provider === 'string' ? provider : undefined} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Environnement actif ──────────────────────────────────────────── */}
      <section className="mb-8" aria-labelledby="profile-env-heading">
        <h2 id="profile-env-heading" className="text-sm font-medium text-[var(--github-text-secondary)] font-mono uppercase tracking-wider mb-3">
          Environnement actif
        </h2>
        <div className="px-5 py-4 rounded-lg bg-[var(--github-border-secondary)] border border-[var(--github-border-primary)] flex items-center gap-4">
          <Monitor size={20} className={envMeta.color} aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[var(--github-text-primary)] font-medium">{envMeta.label}</p>
            <p className="text-xs text-[var(--github-text-secondary)] font-mono">{envMeta.shell} · {envMeta.promptPreview}</p>
          </div>
          <p className="text-xs text-[var(--github-text-secondary)]/70 font-mono shrink-0">
            Modifier dans la sidebar
          </p>
        </div>
      </section>

      {/* ── Paramètres ────────────────────────────────────────────────── */}
      <section aria-labelledby="profile-settings-heading">
        <h2 id="profile-settings-heading" className="text-sm font-medium text-[var(--github-text-secondary)] font-mono uppercase tracking-wider mb-3">
          Paramètres
        </h2>
        <div className="space-y-2">
          <Link
            to="/app/settings"
            className="flex items-center gap-3 px-5 py-4 rounded-lg bg-[var(--github-border-secondary)] border border-[var(--github-border-primary)] hover:border-emerald-500/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
          >
            <KeyRound size={20} className="text-[var(--github-text-secondary)]" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[var(--github-text-primary)] font-medium">Paramètres IA</p>
              <p className="text-xs text-[var(--github-text-secondary)] font-mono">
                Gérer les clés API par provider et le consentement RGPD
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-3 px-5 py-4 rounded-lg bg-[var(--github-border-secondary)] border border-[var(--github-border-primary)] opacity-60">
            <Sliders size={20} className="text-[var(--github-text-secondary)]" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[var(--github-text-primary)] font-medium">Préférences avancées</p>
              <p className="text-xs text-[var(--github-text-secondary)] font-mono">
                Notifications, langue, danger zone — bientôt disponible
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
