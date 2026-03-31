import { useNavigate } from 'react-router';
import { Terminal, Home } from 'lucide-react';

/** 404 page — shown for any unmatched route */
export function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3] flex items-center justify-center p-6" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Terminal size={28} className="text-emerald-400" />
          </div>
        </div>
        <div className="font-mono text-emerald-400 text-sm mb-2">$ cd /page-introuvable</div>
        <div className="font-mono text-[#8b949e] text-sm mb-8">
          bash: /page-introuvable: No such file or directory
        </div>
        <h1 className="text-4xl font-bold text-[#e6edf3] mb-3">404</h1>
        <p className="text-[#8b949e] mb-8">Cette page n'existe pas.</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#0d1117] font-medium transition-colors text-sm"
          >
            <Home size={16} /> Accueil
          </button>
          <button
            onClick={() => navigate('/app')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#30363d] hover:border-[#8b949e] text-[#8b949e] hover:text-[#e6edf3] transition-colors text-sm"
          >
            <Terminal size={16} /> Application
          </button>
        </div>
      </div>
    </div>
  );
}
