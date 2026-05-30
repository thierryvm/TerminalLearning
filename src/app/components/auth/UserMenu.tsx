import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { LogOut, LogIn, User, CircleUser } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFocusTrap } from '../../../lib/hooks/useFocusTrap';
import { Button } from '../ui/button';
import { UserAvatar } from './UserAvatar';

interface UserMenuProps {
  syncStatus: 'local' | 'synced' | 'syncing' | 'error';
  /**
   * card    — pleine largeur dans la sidebar (défaut)
   * compact — avatar circulaire dans un header/navbar
   */
  variant?: 'card' | 'compact';
  /** Actions supplémentaires affichées à droite du header de la card (ex. Home, Install) */
  extraActions?: React.ReactNode;
}

const SYNC_CONFIG: Record<UserMenuProps['syncStatus'], { label: string; dot: string; text: string }> = {
  local:   { label: 'Local',          dot: 'bg-[var(--github-text-secondary)]',               text: 'text-[var(--github-text-secondary)]' },
  syncing: { label: 'Sync…',          dot: 'bg-yellow-400 animate-pulse', text: 'text-yellow-400' },
  synced:  { label: 'Synchronisé',    dot: 'bg-emerald-400',              text: 'text-emerald-400' },
  error:   { label: 'Erreur de sync', dot: 'bg-[var(--github-red)]',               text: 'text-[var(--github-red)]' },
};

// UserAvatar extracted to ./UserAvatar.tsx (THI-42 PR #1) so ProfilePage can
// reuse the same OAuth avatar rendering with identical sizing semantics.

export function UserMenu({ syncStatus, variant = 'card', extraActions }: UserMenuProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Trap focus inside the dropdown popover (compact variant only)
  useFocusTrap(open && variant === 'compact', popoverRef);

  // Fermeture Escape / clic extérieur (compact uniquement)
  useEffect(() => {
    if (!open || variant !== 'compact') return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onPointer = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open, variant]);

  const handleSignOut = async () => {
    setOpen(false);
    setSigningOut(true);
    try {
      await signOut();
      navigate('/', { replace: true });
    } finally {
      setSigningOut(false);
    }
  };

  // ── État invité — uniquement affiché en mode card (sidebar) ──────────────────
  if (!user) {
    return (
      <div className="px-3 py-2.5 rounded-lg bg-[var(--github-border-secondary)] border border-[var(--github-border-primary)]">
        <div className="flex items-center gap-2.5 mb-2.5">
          <span className="w-8 h-8 rounded-full bg-[var(--github-border-secondary)] border border-[var(--github-border-primary)] flex items-center justify-center shrink-0">
            <User size={14} className="text-[var(--github-text-secondary)]" aria-hidden="true" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[var(--github-text-primary)] font-medium">Mode invité</p>
            <p className="text-xs text-[var(--github-text-secondary)] font-mono">Progression locale uniquement</p>
          </div>
          {extraActions && <div className="flex items-center gap-1 shrink-0">{extraActions}</div>}
        </div>
        <Button
          variant="emerald-soft"
          size="link-inline"
          onClick={() => navigate('/')}
          className="w-full gap-2 min-h-11 py-1.5 rounded-md text-xs font-mono hover:border-emerald-500/40"
        >
          <LogIn size={12} aria-hidden="true" />
          Se connecter
        </Button>
      </div>
    );
  }

  const avatarUrl =
    (user.user_metadata?.avatar_url as string | undefined) ??
    (user.user_metadata?.picture as string | undefined);
  const displayName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.user_name as string | undefined) ??
    user.email?.split('@')[0] ??
    'Utilisateur';

  const sync = SYNC_CONFIG[syncStatus];
  const initials = displayName[0].toUpperCase();

  // ── Variant card — sidebar ────────────────────────────────────────────────────
  if (variant === 'card') {
    return (
      <div className="px-3 py-2.5 rounded-lg bg-[var(--github-border-secondary)] border border-[var(--github-border-primary)]">
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="relative shrink-0">
            <UserAvatar avatarUrl={avatarUrl} initials={initials} size="sm" />
            <span
              aria-hidden="true"
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--github-bg-tertiary)] ${sync.dot}`}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[var(--github-text-primary)] font-medium truncate">{displayName}</p>
            <p className={`text-xs font-mono truncate ${sync.text}`}>{sync.label}</p>
          </div>
          {extraActions && <div className="flex items-center gap-1 shrink-0">{extraActions}</div>}
        </div>
        {/* Mon profil — Link direct (pas Button asChild) pour fiabilité hover.
            asChild + variant Button + <Link> avait un problème de propagation
            des classes hover en cascade. Pattern cohérent NavLink sidebar :
            classes explicites bg + border + text + transition + focus-visible. */}
        <Link
          to="/app/profile"
          className="flex items-center justify-center w-full gap-2 min-h-11 py-1.5 mb-1.5 rounded-md text-xs font-mono bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-0"
        >
          <CircleUser size={12} aria-hidden="true" />
          Mon profil
        </Link>
        <Button
          variant="ghost"
          size="link-inline"
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full gap-2 py-1.5 rounded-md text-xs font-mono text-[var(--github-red)] border border-[var(--github-red)]/20 hover:bg-[var(--github-red)]/10 hover:text-[var(--github-red)] hover:border-[var(--github-red)]/40 transition-all focus-visible:ring-emerald-500/60 focus-visible:ring-2 focus-visible:ring-offset-0"
        >
          <LogOut size={12} aria-hidden="true" />
          {signingOut ? 'Déconnexion…' : 'Se déconnecter'}
        </Button>
      </div>
    );
  }

  // ── Variant compact — navbar / header ─────────────────────────────────────────
  return (
    <div ref={menuRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="link-inline"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Compte de ${displayName} — ${sync.label}`}
        aria-expanded={open}
        aria-haspopup="true"
        className="relative rounded-full ring-2 ring-transparent hover:ring-emerald-500/50 hover:bg-transparent focus-visible:ring-emerald-500 focus-visible:ring-2 focus-visible:ring-offset-0 transition-all"
      >
        <UserAvatar avatarUrl={avatarUrl} initials={initials} size="sm" />
        <span
          aria-hidden="true"
          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--github-bg)] ${sync.dot}`}
        />
      </Button>

      {open && (
        <div
          ref={popoverRef}
          role="menu"
          aria-orientation="vertical"
          aria-label={`Menu utilisateur ${displayName}`}
          className="absolute right-0 top-full mt-2 z-50 w-60 bg-[var(--github-border-secondary)] border border-[var(--github-border-primary)] rounded-xl shadow-2xl overflow-hidden"
        >
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--github-border-primary)]">
            <UserAvatar avatarUrl={avatarUrl} initials={initials} size="md" />
            <div className="min-w-0">
              <p className="text-sm text-[var(--github-text-primary)] font-medium truncate">{displayName}</p>
              <p className="text-xs text-[var(--github-text-secondary)] truncate">{user.email}</p>
              <span className={`inline-flex items-center gap-1 mt-0.5 text-xs font-mono ${sync.text}`}>
                <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${sync.dot}`} />
                {sync.label}
              </span>
            </div>
          </div>
          <div className="py-1" role="none">
            {/* Survol emerald cohérent avec la variante card (sidebar /app) :
                l'ancien hover:bg-[var(--github-border-secondary)] était IDENTIQUE
                au fond du popover → survol invisible. Langage couleur unifié :
                Mon profil = emerald, Se déconnecter = rouge (cf. card ci-dessus). */}
            <Link
              to="/app/profile"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center w-full justify-start gap-2.5 px-4 py-2.5 text-sm text-[var(--github-text-primary)] font-mono hover:bg-emerald-500/10 hover:text-emerald-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
            >
              <CircleUser size={14} aria-hidden="true" />
              Mon profil
            </Link>
            <Button
              variant="ghost"
              size="link-inline"
              role="menuitem"
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full justify-start gap-2.5 px-4 py-2.5 text-sm text-[var(--github-red)] font-mono hover:bg-[var(--github-red)]/10 hover:text-[var(--github-red)] rounded-none transition-colors focus-visible:ring-emerald-500/60 focus-visible:ring-2 focus-visible:ring-offset-0"
            >
              <LogOut size={14} aria-hidden="true" />
              {signingOut ? 'Déconnexion…' : 'Se déconnecter'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
