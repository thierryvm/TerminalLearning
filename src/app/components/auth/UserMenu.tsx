import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { LogOut, LogIn, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';

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
  local:   { label: 'Local',          dot: 'bg-[#8b949e]',               text: 'text-[var(--github-text-secondary)]' },
  syncing: { label: 'Sync…',          dot: 'bg-yellow-400 animate-pulse', text: 'text-yellow-400' },
  synced:  { label: 'Synchronisé',    dot: 'bg-emerald-400',              text: 'text-emerald-400' },
  error:   { label: 'Erreur de sync', dot: 'bg-[#f85149]',               text: 'text-[#f85149]' },
};

function UserAvatar({ avatarUrl, initials, size }: { avatarUrl?: string; initials: string; size: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'w-8 h-8 text-sm' : 'w-10 h-10 text-base';
  if (avatarUrl) {
    return <img src={avatarUrl} alt="" aria-hidden="true" className={`${cls} rounded-full shrink-0`} />;
  }
  return (
    <span className={`${cls} rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-mono shrink-0 select-none`}>
      {initials}
    </span>
  );
}

export function UserMenu({ syncStatus, variant = 'card', extraActions }: UserMenuProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
          <span className="w-8 h-8 rounded-full bg-[#21262d] border border-[var(--github-border-primary)] flex items-center justify-center shrink-0">
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
          className="w-full gap-2 py-1.5 rounded-md text-xs font-mono hover:border-emerald-500/40"
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
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#161b22] ${sync.dot}`}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[var(--github-text-primary)] font-medium truncate">{displayName}</p>
            <p className={`text-xs font-mono truncate ${sync.text}`}>{sync.label}</p>
          </div>
          {extraActions && <div className="flex items-center gap-1 shrink-0">{extraActions}</div>}
        </div>
        <Button
          variant="ghost"
          size="link-inline"
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full gap-2 py-1.5 rounded-md text-xs font-mono text-[#f85149] border border-[#f85149]/20 hover:bg-[#f85149]/10 hover:text-[#f85149] hover:border-[#f85149]/40 transition-all focus-visible:ring-[#f85149]/60 focus-visible:ring-2 focus-visible:ring-offset-0"
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
          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0d1117] ${sync.dot}`}
        />
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-60 bg-[var(--github-border-secondary)] border border-[var(--github-border-primary)] rounded-xl shadow-2xl overflow-hidden">
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
          <div className="py-1">
            <Button
              variant="ghost"
              size="link-inline"
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full justify-start gap-2.5 px-4 py-2.5 text-sm text-[#f85149] font-mono hover:bg-[#f85149]/10 hover:text-[#f85149] rounded-none transition-colors focus-visible:ring-[#f85149]/60 focus-visible:ring-2 focus-visible:ring-offset-0"
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
