import { useState } from 'react';
import { useNavigate } from 'react-router';
import { LogOut, LogIn, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface UserMenuProps {
  syncStatus: 'local' | 'synced' | 'syncing' | 'error';
  placement?: 'bottom' | 'top'; // conservé pour compatibilité, non utilisé avec le style card
}

const SYNC_CONFIG: Record<UserMenuProps['syncStatus'], { label: string; dot: string; text: string }> = {
  local:   { label: 'Local',          dot: 'bg-[#8b949e]',               text: 'text-[#8b949e]' },
  syncing: { label: 'Sync…',          dot: 'bg-yellow-400 animate-pulse', text: 'text-yellow-400' },
  synced:  { label: 'Synchronisé',    dot: 'bg-emerald-400',              text: 'text-emerald-400' },
  error:   { label: 'Erreur de sync', dot: 'bg-[#f85149]',               text: 'text-[#f85149]' },
};

interface UserAvatarProps {
  avatarUrl: string | undefined;
  initials: string;
}

function UserAvatar({ avatarUrl, initials }: UserAvatarProps) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt="" aria-hidden="true" className="w-8 h-8 rounded-full shrink-0" />;
  }
  return (
    <span className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm font-mono shrink-0 select-none">
      {initials}
    </span>
  );
}

export function UserMenu({ syncStatus }: UserMenuProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      navigate('/', { replace: true });
    } finally {
      setSigningOut(false);
    }
  };

  // ── État invité ───────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="px-3 py-2.5 rounded-lg bg-[#161b22] border border-[#30363d]">
        <div className="flex items-center gap-2.5 mb-2.5">
          <span className="w-8 h-8 rounded-full bg-[#21262d] border border-[#30363d] flex items-center justify-center shrink-0">
            <User size={14} className="text-[#8b949e]" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-[#e6edf3] font-medium">Mode invité</p>
            <p className="text-[10px] text-[#8b949e] font-mono">Progression locale uniquement</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/')}
          className="w-full flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
        >
          <LogIn size={12} aria-hidden="true" />
          Se connecter
        </button>
      </div>
    );
  }

  // ── État connecté ─────────────────────────────────────────────────────────────
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
    <div className="px-3 py-2.5 rounded-lg bg-[#161b22] border border-[#30363d]">
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="relative shrink-0">
          <UserAvatar avatarUrl={avatarUrl} initials={initials} />
          <span
            aria-hidden="true"
            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#161b22] ${sync.dot}`}
          />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-[#e6edf3] font-medium truncate">{displayName}</p>
          <p className={`text-[10px] font-mono truncate ${sync.text}`}>{sync.label}</p>
        </div>
      </div>
      <button
        onClick={handleSignOut}
        disabled={signingOut}
        className="w-full flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-mono text-[#f85149] border border-[#f85149]/20 hover:bg-[#f85149]/10 hover:border-[#f85149]/40 transition-all outline-none focus-visible:ring-1 focus-visible:ring-[#f85149] disabled:opacity-50"
      >
        <LogOut size={12} aria-hidden="true" />
        {signingOut ? 'Déconnexion…' : 'Se déconnecter'}
      </button>
    </div>
  );
}
