import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Terminal, ArrowLeft, Shield, ArrowUp } from 'lucide-react';
import { Button } from './ui/button';

/**
 * @component PrivacyPolicy
 * @description Politique de confidentialité conforme RGPD belge/européen.
 * Aucune collecte de données personnelles directe — liens vers Ko-fi/GitHub Sponsors
 * dont les politiques de confidentialité sont référencées.
 */
export function PrivacyPolicy() {
  const navigate = useNavigate();
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-dvh bg-[var(--github-bg)] text-[var(--github-text-primary)]" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Nav */}
      <nav className="border-b border-[var(--github-border-primary)]/50 px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
        <div className="flex items-center gap-2.5">
          <Terminal size={18} className="text-emerald-400" />
          <span className="font-mono text-sm text-[var(--github-text-primary)]">Terminal Learning</span>
        </div>
        <Button
          variant="nav-link"
          size="link-inline"
          onClick={() => navigate('/')}
          className="text-sm gap-2"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Retour
        </Button>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <Shield size={20} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--github-text-primary)]">Politique de confidentialité</h1>
            <p className="text-[var(--github-text-secondary)] text-sm">Dernière mise à jour : 31 mars 2026</p>
          </div>
        </div>

        <div className="space-y-8 text-[var(--github-text-secondary)] leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-[var(--github-text-primary)] mb-3">1. Responsable du traitement</h2>
            <p>
              Terminal Learning est un projet open source personnel hébergé sur GitHub
              (<code className="text-emerald-400 text-sm">github.com/thierryvm/TerminalLearning</code>)
              et déployé via Vercel. Il n'est pas géré par une entité commerciale.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--github-text-primary)] mb-3">2. Données collectées</h2>
            <p className="mb-3">
              <strong className="text-[var(--github-text-primary)]">Terminal Learning ne collecte aucune donnée personnelle directement.</strong>
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Aucune inscription ni compte utilisateur n'est requis pour utiliser l'application.</li>
              <li>La progression d'apprentissage est stockée <strong className="text-[var(--github-text-primary)]">localement</strong> dans ton navigateur
                  (<code className="text-emerald-400 text-sm">localStorage</code>), jamais sur nos serveurs.</li>
              <li>Aucun cookie de tracking ou publicitaire n'est utilisé.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--github-text-primary)] mb-3">3. Services tiers</h2>

            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-[var(--github-border-primary)] bg-[var(--github-border-secondary)]">
                <h3 className="text-[var(--github-text-primary)] font-medium mb-2">Vercel (hébergement)</h3>
                <p className="text-sm">
                  L'application est hébergée sur Vercel. Vercel peut collecter des données
                  de connexion (adresse IP, navigateur) à des fins de sécurité et de performance.
                  Ces données sont gérées par Vercel conformément à leur politique de confidentialité.
                  Vercel est certifié conforme RGPD.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-[var(--github-border-primary)] bg-[var(--github-border-secondary)]">
                <h3 className="text-[var(--github-text-primary)] font-medium mb-2">GitHub Sponsors (donations)</h3>
                <p className="text-sm">
                  Les boutons de don renvoient vers GitHub Sponsors
                  (<code className="text-emerald-400 text-sm">github.com/sponsors/thierryvm</code>).
                  Toute donnée collectée lors d'un don (nom, email, paiement) est traitée
                  exclusivement par GitHub, Inc. Terminal Learning n'a pas accès à ces données.
                  Consulte la politique de confidentialité de GitHub pour plus d'informations.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-[var(--github-border-primary)] bg-[var(--github-border-secondary)]">
                <h3 className="text-[var(--github-text-primary)] font-medium mb-2">Ko-fi (donations)</h3>
                <p className="text-sm">
                  Les boutons Ko-fi renvoient vers le service Ko-fi (ko-fi.com).
                  Toute donnée collectée lors d'un don est traitée exclusivement par Ko-fi.
                  Terminal Learning n'a pas accès à ces données.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--github-text-primary)] mb-3">4. Cookies</h2>
            <p>
              Terminal Learning n'utilise pas de cookies de tracking, publicitaires ou analytiques.
              Seul le <code className="text-emerald-400 text-sm">localStorage</code> du navigateur
              est utilisé pour sauvegarder ta progression — cette donnée ne quitte jamais ton appareil.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--github-text-primary)] mb-3">5. Tes droits (RGPD)</h2>
            <p className="mb-3">
              Conformément au Règlement Général sur la Protection des Données (RGPD —
              Règlement UE 2016/679) et à la loi belge du 30 juillet 2018 relative à la
              protection des personnes physiques à l'égard des traitements de données à
              caractère personnel, tu disposes des droits suivants :
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li><strong className="text-[var(--github-text-primary)]">Droit d'accès</strong> : consulter les données te concernant.</li>
              <li><strong className="text-[var(--github-text-primary)]">Droit de rectification</strong> : corriger des données inexactes.</li>
              <li><strong className="text-[var(--github-text-primary)]">Droit à l'effacement</strong> : supprimer tes données locales via les paramètres de ton navigateur.</li>
              <li><strong className="text-[var(--github-text-primary)]">Droit à la portabilité</strong> : exporter tes données de progression depuis ton navigateur.</li>
            </ul>
            <p className="mt-3">
              Pour toute question relative à la vie privée, contacte-nous via GitHub :
              <a href="https://github.com/thierryvm/TerminalLearning/issues"
                target="_blank" rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300 ml-1 underline">
                github.com/thierryvm/TerminalLearning/issues
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--github-text-primary)] mb-3">6. Autorité de contrôle</h2>
            <p>
              En Belgique, l'autorité de protection des données est l'
              <strong className="text-[var(--github-text-primary)]">Autorité de Protection des Données (APD)</strong> —
              <a href="https://www.autoriteprotectiondonnees.be" target="_blank" rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300 ml-1 underline">
                autoriteprotectiondonnees.be
              </a>.
              Tu peux introduire une plainte auprès de cette autorité si tu estimes que
              tes droits ne sont pas respectés.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--github-text-primary)] mb-3">7. Modifications</h2>
            <p>
              Cette politique peut être mise à jour. La date de dernière modification est
              indiquée en haut de cette page. Les modifications importantes seront annoncées
              sur le dépôt GitHub.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-[var(--github-border-primary)]/50 px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center text-[var(--github-text-secondary)] text-sm">
        <span className="font-mono">Terminal Learning</span> · Projet open source · MIT License
      </footer>

      {/* ── SCROLL TO TOP ───────────────────────────────────────── */}
      {showScrollTop && (
        <Button
          variant="floating"
          size="icon-round"
          onClick={() => {
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
          }}
          aria-label="Retour en haut"
          className="fixed right-6 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-50 w-11 h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
        >
          <ArrowUp size={18} aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
