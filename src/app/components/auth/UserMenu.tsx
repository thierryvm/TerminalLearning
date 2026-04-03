import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';

interface UserMenuProps {
  syncStatus: 'local' | 'synced' | 'syncing' | 'error';
}

const SYNC_LABELS: Record<UserMenuProps['syncStatus'], { label: string; color: string }> = {
  local:   { label: 'local',   color: 'text-[#8b949e]' },
  syncing: { label: 'sync...', color: 'text-yellow-400' },
  synced:  { label: 'synced',  color: 'text-emerald-400' },
  error:   { label: 'erreur',  color: 'text-[#f85149]' },
};

export function UserMenu({ syncStatus }: UserMenuProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

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
    user.email ??
    'Utilisateur';

  const sync = SYNC_LABELS[syncStatus];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#30363d] bg-[#161b22] hover:border-emerald-500/40 transition-colors"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-6 h-6 rounded-full" />
        ) : (
          <span className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-mono">
            {displayName[0].toUpperCase()}
          </span>
        )}
        <span className="text-xs text-[#e6edf3] font-mono hidden sm:block max-w-[120px] truncate">
          {displayName}
        </span>
        <span className={`text-xs font-mono ${sync.color}`}>{sync.label}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 w-48 bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl overflow-hidden">
            <div className="px-3 py-2 border-b border-[#30363d]">
              <p className="text-xs text-[#8b949e] font-mono truncate">{user.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full text-left px-3 py-2.5 text-sm text-[#f85149] hover:bg-[#0d1117] font-mono transition-colors disabled:opacity-50"
            >
              {signingOut ? 'Déconnexion…' : 'Déconnexion'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
