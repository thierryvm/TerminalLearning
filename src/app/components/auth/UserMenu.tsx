import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface UserMenuProps {
  syncStatus: 'local' | 'synced' | 'syncing' | 'error';
  placement?: 'bottom' | 'top';
}

// Libellés centralisés — tout en français
const SYNC_CONFIG: Record<UserMenuProps['syncStatus'], { label: string; dot: string }> = {
  local:   { label: 'Local',          dot: 'bg-[#8b949e]' },
  syncing: { label: 'Sync…',          dot: 'bg-yellow-400 animate-pulse' },
  synced:  { label: 'Synchronisé',    dot: 'bg-emerald-400' },
  error:   { label: 'Erreur de sync', dot: 'bg-[#f85149]' },
};

// Sous-composant partagé : évite la duplication avatar entre bouton et en-tête
interface UserAvatarProps {
  avatarUrl: string | undefined;
  initials: string;
  size: 'sm' | 'md';
}

function UserAvatar({ avatarUrl, initials, size }: UserAvatarProps) {
  const cls = size === 'sm'
    ? 'w-8 h-8 text-sm'
    : 'w-10 h-10 text-base';
  if (avatarUrl) {
    return <img src={avatarUrl} alt="" aria-hidden="true" className={`${cls} rounded-full shrink-0`} />;
  }
  return (
    <span className={`${cls} rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-mono shrink-0 select-none`}>
      {initials}
    </span>
  );
}

export function UserMenu({ syncStatus, placement = 'bottom' }: UserMenuProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fermeture sur Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Fermeture sur clic extérieur
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
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

  if (!user) return null;

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

  return (
    <div ref={menuRef} className="relative">
      {/* Bouton déclencheur — avatar + dot de statut */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Compte de ${displayName} — ${sync.label}`}
        aria-expanded={open}
        aria-haspopup="true"
        className="relative flex items-center justify-center rounded-full ring-2 ring-transparent hover:ring-emerald-500/50 focus-visible:ring-emerald-500 transition-all outline-none"
      >
        <UserAvatar avatarUrl={avatarUrl} initials={initials} size="sm" />
        <span
          aria-hidden="true"
          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0d1117] ${sync.dot}`}
        />
      </button>

      {/* Popover — sémantique native <button>, pas de role="menu" pour éviter
          d'imposer la navigation au clavier fléché sans l'implémenter */}
      {open && (
        <div
          className={`absolute right-0 z-50 w-64 bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden ${
            placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          {/* En-tête */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#30363d]">
            <UserAvatar avatarUrl={avatarUrl} initials={initials} size="md" />
            <div className="min-w-0">
              <p className="text-sm text-[#e6edf3] font-medium truncate">{displayName}</p>
              <p className="text-xs text-[#8b949e] truncate">{user.email}</p>
              <span className={`inline-flex items-center gap-1 mt-0.5 text-[10px] font-mono ${
                syncStatus === 'synced'  ? 'text-emerald-400' :
                syncStatus === 'syncing' ? 'text-yellow-400'  :
                syncStatus === 'error'   ? 'text-[#f85149]'   : 'text-[#8b949e]'
              }`}>
                <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${sync.dot}`} />
                {sync.label}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="py-1">
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#f85149] hover:bg-[#f85149]/10 font-mono transition-colors disabled:opacity-50 outline-none focus-visible:bg-[#f85149]/10"
            >
              <LogOut size={14} aria-hidden="true" />
              {signingOut ? 'Déconnexion…' : 'Déconnexion'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
