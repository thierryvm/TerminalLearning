import { useState } from 'react';
import { X, Smartphone, Monitor, Share, MoreVertical, Plus, Download, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Button } from './ui/button';

interface PWAInstallModalProps {
  onClose: () => void;
}

type Tab = 'ios' | 'android' | 'desktop';

const TAB_LABELS: Record<Tab, string> = {
  ios: 'iOS (Safari)',
  android: 'Android (Chrome)',
  desktop: 'Desktop',
};

const IOS_STEPS = [
  { icon: Share, text: 'Ouvre le site dans Safari (pas Chrome ni Firefox).' },
  { icon: Share, text: 'Appuie sur l\'icône Partager en bas de l\'écran.' },
  { icon: Plus, text: 'Fais défiler et sélectionne "Sur l\'écran d\'accueil".' },
  { icon: CheckCircle2, text: 'Confirme avec "Ajouter" — l\'app apparaît sur ton écran d\'accueil.' },
];

const ANDROID_MANUAL_STEPS = [
  { icon: MoreVertical, text: 'Appuie sur le menu ⋮ en haut à droite de Chrome.' },
  { icon: Plus, text: 'Sélectionne "Ajouter à l\'écran d\'accueil" ou "Installer l\'application".' },
  { icon: CheckCircle2, text: 'Confirme — l\'app s\'installe comme une app native.' },
];

const DESKTOP_MANUAL_STEPS = [
  { icon: Download, text: 'Dans Chrome/Edge, cherche l\'icône d\'installation dans la barre d\'adresse (⊕).' },
  { icon: Download, text: 'Ou ouvre le menu ⋮ → "Installer Terminal Learning...".' },
  { icon: CheckCircle2, text: 'L\'app s\'ouvre dans sa propre fenêtre, sans barre de navigateur.' },
];

export function PWAInstallModal({ onClose }: PWAInstallModalProps) {
  const { platform, isInstalled, canPrompt, prompt } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<Tab>(
    platform === 'ios' ? 'ios' : platform === 'android' ? 'android' : 'desktop',
  );
  const [installing, setInstalling] = useState(false);

  const handleNativePrompt = async () => {
    setInstalling(true);
    await prompt();
    setInstalling(false);
  };

  if (isInstalled) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <div
          className="bg-[var(--github-border-secondary)] border border-[var(--github-border-primary)] rounded-xl p-8 max-w-sm w-full text-center shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <CheckCircle2 size={48} className="text-emerald-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-[var(--github-text-primary)] mb-2">Déjà installée !</h2>
          <p className="text-sm text-[var(--github-text-secondary)] mb-6">Terminal Learning est déjà installée sur cet appareil.</p>
          <Button
            variant="emerald-soft"
            size="cta-pill-sm"
            onClick={onClose}
          >
            Fermer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[var(--github-border-secondary)] border border-[var(--github-border-primary)] rounded-xl w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--github-border-primary)]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <Smartphone size={16} className="text-emerald-400" />
            </div>
            <h2 className="text-sm font-semibold text-[var(--github-text-primary)]">Installer l'application</h2>
          </div>
          <Button
            variant="tl-icon-ghost"
            size="tl-icon-sm"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={16} aria-hidden="true" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--github-border-primary)]">
          {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'tl-tab-active' : 'tl-tab'}
              size="tl-tab-size"
              onClick={() => setActiveTab(tab)}
              aria-pressed={activeTab === tab}
            >
              {TAB_LABELS[tab]}
            </Button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {activeTab === 'ios' && (
            <>
              <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                Sur iOS, l'installation se fait uniquement via <strong>Safari</strong>.
              </p>
              <Steps steps={IOS_STEPS} />
            </>
          )}

          {activeTab === 'android' && (
            <>
              {canPrompt ? (
                <div className="text-center space-y-3 py-2">
                  <p className="text-sm text-[var(--github-text-secondary)]">Ton navigateur supporte l'installation directe.</p>
                  <Button
                    variant="emerald"
                    size="tl-install-cta"
                    onClick={handleNativePrompt}
                    disabled={installing}
                  >
                    <Download size={16} aria-hidden="true" />
                    {installing ? 'Installation...' : 'Installer Terminal Learning'}
                  </Button>
                </div>
              ) : (
                <Steps steps={ANDROID_MANUAL_STEPS} />
              )}
            </>
          )}

          {activeTab === 'desktop' && (
            <>
              {canPrompt ? (
                <div className="text-center space-y-3 py-2">
                  <p className="text-sm text-[var(--github-text-secondary)]">Installation disponible pour Chrome et Edge.</p>
                  <Button
                    variant="emerald"
                    size="tl-install-cta"
                    onClick={handleNativePrompt}
                    disabled={installing}
                  >
                    <Monitor size={16} aria-hidden="true" />
                    {installing ? 'Installation...' : 'Installer comme application desktop'}
                  </Button>
                </div>
              ) : (
                <Steps steps={DESKTOP_MANUAL_STEPS} />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--github-border-primary)]">
          <p className="text-xs text-[var(--github-text-secondary)] text-center">
            L'app fonctionne hors ligne une fois installée. Aucune donnée supplémentaire collectée.
          </p>
        </div>
      </div>
    </div>
  );
}

function Steps({ steps }: { steps: { icon: React.ComponentType<{ size?: number; className?: string }>; text: string }[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((step, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xs text-emerald-400 font-mono mt-0.5">
            {i + 1}
          </span>
          <p className="text-sm text-[var(--github-text-primary)] leading-relaxed">{step.text}</p>
        </li>
      ))}
    </ol>
  );
}
