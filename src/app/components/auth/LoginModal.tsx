import { useState } from 'react';
import { z } from 'zod';
import { supabase } from '../../../lib/supabase';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

const emailSchema = z.string().email('Email invalide');
const passwordSchema = z.string().min(8, 'Minimum 8 caractères');

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

type Mode = 'login' | 'signup';

export function LoginModal({ open, onClose }: LoginModalProps) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingOAuth, setLoadingOAuth] = useState<'github' | 'google' | null>(null);
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => { resetForm(); onClose(); };
  const switchMode = (next: Mode) => { setSuccess(false); setError(null); setMode(next); };

  const validate = (): string | null => {
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) return emailResult.error.issues[0].message;
    const pwResult = passwordSchema.safeParse(password);
    if (!pwResult.success) return pwResult.error.issues[0].message;
    return null;
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError(null);

    const { error: authError } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setLoading(false);

    if (authError) {
      setError(authError.message);
    } else if (mode === 'signup') {
      setSuccess(true);
    } else {
      handleClose();
    }
  };

  const handleOAuth = async (provider: 'github' | 'google') => {
    if (!supabase || loadingOAuth) return;
    setLoadingOAuth(provider);
    setError(null);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: provider === 'github' ? 'read:user user:email' : undefined,
      },
    });
    // On success the page redirects — setLoadingOAuth only needed on error
    if (oauthError) {
      setError(oauthError.message);
      setLoadingOAuth(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="bg-[var(--github-border-secondary)] border border-[var(--github-border-primary)] rounded-xl p-6 w-full max-w-sm mx-4 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-[var(--github-text-primary)] font-mono">
            {mode === 'login' ? 'Connexion' : 'Créer un compte'}
          </h2>
          <Button
            type="button"
            variant="tl-icon-ghost"
            size="icon-lg"
            onClick={handleClose}
            aria-label="Fermer"
            className="-mr-2 text-xl leading-none rounded-lg"
          >
            ×
          </Button>
        </div>

        {success ? (
          <div className="text-center py-4">
            <p className="text-emerald-400 font-mono text-sm">
              Vérifie ta boîte mail pour confirmer ton adresse.
            </p>
          </div>
        ) : (
          <>
            {/* OAuth buttons */}
            <div className="space-y-2 mb-4">
              <Button
                type="button"
                variant="ghost-gh"
                size="tl-install-cta"
                onClick={() => handleOAuth('github')}
                disabled={loadingOAuth !== null}
                className="bg-[var(--github-bg)] text-[var(--github-text-primary)] hover:text-[var(--github-text-primary)] hover:border-emerald-500/50 focus-visible:border-[var(--github-border-primary)] font-mono disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loadingOAuth === 'github' ? (
                  <span className="w-4 h-4 border-2 border-[#e6edf3]/30 border-t-[#e6edf3] rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                )}
                {loadingOAuth === 'github' ? 'Redirection…' : 'Continuer avec GitHub'}
              </Button>
              <Button
                type="button"
                variant="ghost-gh"
                size="tl-install-cta"
                onClick={() => handleOAuth('google')}
                disabled={loadingOAuth !== null}
                className="bg-[var(--github-bg)] text-[var(--github-text-primary)] hover:text-[var(--github-text-primary)] hover:border-emerald-500/50 focus-visible:border-[var(--github-border-primary)] font-mono disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loadingOAuth === 'google' ? (
                  <span className="w-4 h-4 border-2 border-[#e6edf3]/30 border-t-[#e6edf3] rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                )}
                {loadingOAuth === 'google' ? 'Redirection…' : 'Continuer avec Google'}
              </Button>
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--github-border-primary)]" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[var(--github-border-secondary)] px-2 text-xs text-[var(--github-text-secondary)] font-mono">ou par email</span>
              </div>
            </div>

            {/* Email / password form */}
            <form onSubmit={handleEmailAuth} className="space-y-3">
              <Input
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="email@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full min-h-11 px-3 py-2.5 rounded-lg border border-[var(--github-border-primary)] bg-[var(--github-bg)] text-[var(--github-text-primary)] text-sm font-mono placeholder-[#8b949e] focus:outline-none focus:border-emerald-500/40 focus-visible:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500/40 transition-colors"
                required
              />
              <Input
                type="password"
                name="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder="Mot de passe (8 car. min.)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full min-h-11 px-3 py-2.5 rounded-lg border border-[var(--github-border-primary)] bg-[var(--github-bg)] text-[var(--github-text-primary)] text-sm font-mono placeholder-[#8b949e] focus:outline-none focus:border-emerald-500/40 focus-visible:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500/40 transition-colors"
                required
              />

              {error && (
                <p className="text-[#f85149] text-xs font-mono">{error}</p>
              )}

              <Button
                type="submit"
                variant="emerald"
                size="tl-install-cta"
                disabled={loading}
                className="font-mono focus-visible:ring-emerald-500/60 focus-visible:ring-2 focus-visible:ring-offset-0"
              >
                {loading ? '...' : mode === 'login' ? 'Se connecter' : 'Créer le compte'}
              </Button>
            </form>

            <p className="mt-4 text-center text-xs text-[var(--github-text-secondary)] font-mono">
              {mode === 'login' ? "Pas encore de compte ? " : 'Déjà un compte ? '}
              <Button
                type="button"
                variant="link"
                size="link-inline"
                onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                className="text-emerald-400 hover:text-emerald-300 hover:no-underline focus-visible:underline focus-visible:ring-0 transition-colors"
              >
                {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
              </Button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
