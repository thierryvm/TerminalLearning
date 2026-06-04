import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { LogOut, LogIn, User, CircleUser, ChevronUp, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFocusTrap } from '../../../lib/hooks/useFocusTrap';
import { Button } from '../ui/button';
import { UserAvatar } from './UserAvatar';

/**
 * Secondary nav item shown inside the avatar dropdown (THI-341).
 * The CALLER builds the list (already role-gated) — UserMenu never decides
 * permissions itself, it only renders. Keeps the RBAC logic in one place
 * (Sidebar / useUserRole) and the menu component "dumb" (security).
 */
export interface UserMenuSecondaryItem {
  label: string;
  icon: ReactNode;
  /** Internal route (rendered as <Link>). */
  to?: string;
  /** Action instead of a link (e.g. open the support modal). */
  onClick?: () => void;
}

interface UserMenuProps {
  syncStatus: 'local' | 'synced' | 'syncing' | 'error';
  /**
   * card    — sidebar : trigger (avatar+nom+sync) → dropdown VERS LE HAUT
   * compact — header/navbar : avatar rond → dropdown vers le bas
   */
  variant?: 'card' | 'compact';
  /** Actions supplémentaires (ex. Home) affichées à droite du trigger card. */
  extraActions?: ReactNode;
  /** Liens secondaires (déjà role-gated par l'appelant) dans le dropdown. */
  secondaryItems?: UserMenuSecondaryItem[];
}

const SYNC_CONFIG: Record<UserMenuProps['syncStatus'], { label: string; dot: string; text: string }> = {
  local:   { label: 'Local',          dot: 'bg-[var(--github-text-secondary)]', text: 'text-[var(--github-text-secondary)]' },
  syncing: { label: 'Sync…',          dot: 'bg-yellow-400 animate-pulse',       text: 'text-yellow-400' },
  synced:  { label: 'Synchronisé',    dot: 'bg-emerald-400',                    text: 'text-emerald-400' },
  error:   { label: 'Erreur de sync', dot: 'bg-[var(--github-red)]',            text: 'text-[var(--github-red)]' },
};

// UserAvatar extracted to ./UserAvatar.tsx (THI-42 PR #1) so ProfilePage can
// reuse the same OAuth avatar rendering with identical sizing semantics.

export function UserMenu({ syncStatus, variant = 'card', extraActions, secondaryItems = [] }: UserMenuProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Both variants are now dropdown menus → trap focus + dismiss for both.
  useFocusTrap(open, popoverRef);

  useEffect(() => {
    if (!open) return;
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
  }, [open]);

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
        {/* THI-341 — accès invité à Paramètres IA (config clé IA BYOK,
            anonymous-friendly) : le menu avatar n'existe pas pour un invité, donc
            on expose le lien ici pour ne pas perdre l'accès en épurant la sidebar. */}
        <Link
          to="/app/settings"
          className="flex items-center justify-center w-full gap-2 min-h-11 py-1.5 mb-1.5 rounded-md text-xs font-mono bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
        >
          <Settings size={12} aria-hidden="true" />
          Paramètres IA
        </Link>
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
  // `||` (not `??`) so an empty string ('' from a metadata-less / email-less
  // account) also falls through to the next candidate instead of sticking (code-reviewer).
  const displayName =
    (user.user_metadata?.full_name as string | undefined)?.trim() ||
    (user.user_metadata?.user_name as string | undefined)?.trim() ||
    user.email?.split('@')[0]?.trim() ||
    'Utilisateur';

  const sync = SYNC_CONFIG[syncStatus];
  const initials = (displayName[0] ?? 'U').toUpperCase();

  // ── Items du dropdown (partagés card + compact) ───────────────────────────────
  // secondaryItems d'abord (déjà role-gated par l'appelant), puis Mon profil +
  // Se déconnecter. Langage couleur : liens = neutre→emerald au survol,
  // Se déconnecter = rouge (cohérent avec l'existant).
  const itemClass =
    'flex items-center w-full justify-start gap-2.5 px-4 py-3 text-sm text-[var(--github-text-primary)] font-mono hover:bg-emerald-500/10 hover:text-emerald-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-inset';

  const menuItems = (
    <div className="py-1" role="none">
      {secondaryItems.map((item) =>
        item.to ? (
          <Link key={item.label} to={item.to} role="menuitem" onClick={() => setOpen(false)} className={itemClass}>
            <span className="shrink-0 text-[var(--github-text-secondary)]" aria-hidden="true">{item.icon}</span>
            {item.label}
          </Link>
        ) : (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); item.onClick?.(); }}
            className={itemClass}
          >
            <span className="shrink-0 text-[var(--github-text-secondary)]" aria-hidden="true">{item.icon}</span>
            {item.label}
          </button>
        ),
      )}
      {secondaryItems.length > 0 && (
        <div className="my-1 border-t border-[var(--github-border-primary)]" role="separator" />
      )}
      <Link
        to="/app/profile"
        role="menuitem"
        onClick={() => setOpen(false)}
        className={itemClass}
      >
        <CircleUser size={14} aria-hidden="true" className="shrink-0" />
        Mon profil
      </Link>
      <Button
        variant="ghost"
        size="link-inline"
        role="menuitem"
        onClick={handleSignOut}
        disabled={signingOut}
        className="w-full justify-start gap-2.5 px-4 py-3 text-sm text-[var(--github-red)] font-mono hover:bg-[var(--github-red)]/10 hover:text-[var(--github-red)] rounded-none transition-colors focus-visible:ring-emerald-500/60 focus-visible:ring-2 focus-visible:ring-inset"
      >
        <LogOut size={14} aria-hidden="true" className="shrink-0" />
        {signingOut ? 'Déconnexion…' : 'Se déconnecter'}
      </Button>
    </div>
  );

  const dropdownHeader = (
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
  );

  // ── Variant compact — navbar / header (dropdown vers le bas) ──────────────────
  if (variant === 'compact') {
    return (
      <div ref={menuRef} className="relative">
        <Button
          type="button"
          variant="ghost"
          size="link-inline"
          onClick={() => setOpen((o) => !o)}
          aria-label={`Compte de ${displayName} — ${sync.label}`}
          aria-expanded={open}
          aria-haspopup="menu"
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
          tabIndex={-1}
            role="menu"
            aria-orientation="vertical"
            aria-label={`Menu utilisateur ${displayName}`}
            className="absolute right-0 top-full mt-2 z-50 w-60 bg-[var(--github-border-secondary)] border border-[var(--github-border-primary)] rounded-xl shadow-2xl overflow-y-auto max-h-[calc(100dvh-200px)]"
          >
            {dropdownHeader}
            {menuItems}
          </div>
        )}
      </div>
    );
  }

  // ── Variant card — sidebar (trigger row + dropdown VERS LE HAUT) ──────────────
  return (
    <div ref={menuRef} className="relative">
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="link-inline"
          onClick={() => setOpen((o) => !o)}
          aria-label={`Compte de ${displayName} — ${sync.label}. Menu`}
          aria-expanded={open}
          aria-haspopup="menu"
          className="flex-1 flex items-center justify-start gap-2.5 px-3 py-2.5 min-h-11 rounded-lg bg-[var(--github-border-secondary)] border border-[var(--github-border-primary)] hover:border-emerald-500/40 hover:bg-[var(--github-border-secondary)] transition-colors focus-visible:ring-emerald-500/60 focus-visible:ring-2 focus-visible:ring-offset-0"
        >
          <span className="relative shrink-0">
            <UserAvatar avatarUrl={avatarUrl} initials={initials} size="sm" />
            <span
              aria-hidden="true"
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--github-bg-tertiary)] ${sync.dot}`}
            />
          </span>
          <span className="flex-1 min-w-0 text-left">
            <span className="block text-xs text-[var(--github-text-primary)] font-medium truncate">{displayName}</span>
            <span className={`block text-xs font-mono truncate ${sync.text}`}>{sync.label}</span>
          </span>
          <ChevronUp
            size={14}
            aria-hidden="true"
            className={`size-[14px] shrink-0 text-[var(--github-text-secondary)] transition-transform ${open ? '' : 'rotate-180'}`}
          />
        </Button>
        {extraActions && <div className="flex items-center gap-1 shrink-0">{extraActions}</div>}
      </div>

      {open && (
        <div
          ref={popoverRef}
          tabIndex={-1}
          role="menu"
          aria-orientation="vertical"
          aria-label={`Menu utilisateur ${displayName}`}
          className="absolute bottom-full left-0 right-0 mb-2 z-50 bg-[var(--github-border-secondary)] border border-[var(--github-border-primary)] rounded-xl shadow-2xl overflow-y-auto max-h-[calc(100dvh-200px)]"
        >
          {dropdownHeader}
          {menuItems}
        </div>
      )}
    </div>
  );
}
