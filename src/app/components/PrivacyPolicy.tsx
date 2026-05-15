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
            <p className="text-[var(--github-text-secondary)] text-sm">Dernière mise à jour : 10 mai 2026</p>
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

          <section id="ai-processing" className="scroll-mt-24">
            <h2 className="text-lg font-semibold text-[var(--github-text-primary)] mb-3">4. Tuteur IA — traitement des données (BYOK)</h2>
            <p className="mb-3">
              Le tuteur IA est <strong className="text-[var(--github-text-primary)]">optionnel</strong>{' '}
              et désactivé par défaut. Il fonctionne en mode <strong>BYOK</strong>{' '}
              (Bring Your Own Key) — tu apportes ta propre clé API du provider de
              ton choix. Cette section décrit précisément quelles données circulent,
              qui les voit, et combien de temps elles sont conservées.
            </p>

            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-[var(--github-border-primary)] bg-[var(--github-border-secondary)]">
                <h3 className="text-[var(--github-text-primary)] font-medium mb-2">Architecture sans serveur</h3>
                <p className="text-sm">
                  <strong className="text-[var(--github-text-primary)]">Aucun serveur Terminal Learning ne voit ta clé ni tes questions.</strong>{' '}
                  Quand tu poses une question au tuteur, ton navigateur appelle
                  directement l'API du provider que tu as choisi (OpenRouter,
                  Anthropic, OpenAI ou Gemini). Terminal Learning n'a pas
                  d'intermédiaire dans la chaîne — ce choix est figé dans
                  l'architecture (cf.{' '}
                  <a
                    href="https://github.com/thierryvm/TerminalLearning/blob/main/docs/adr/ADR-002-openrouter-byok-tiers.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 underline"
                  >
                    ADR-002
                  </a>
                  ).
                </p>
              </div>

              <div className="p-4 rounded-lg border border-[var(--github-border-primary)] bg-[var(--github-border-secondary)]">
                <h3 className="text-[var(--github-text-primary)] font-medium mb-2">Données envoyées au provider à chaque question</h3>
                <ul className="list-disc list-inside space-y-1 text-sm ml-2">
                  <li>Une consigne système expliquant que l'IA est ton tuteur shell (frozen, identique à chaque appel).</li>
                  <li>Un contexte statique de la plateforme (nombre de modules, environnements supportés — pas de progression personnelle).</li>
                  <li>Le contexte de la leçon en cours si tu poses la question depuis une leçon (slug + objectif pédagogique public).</li>
                  <li>La question que tu tapes.</li>
                </ul>
              </div>

              <div className="p-4 rounded-lg border border-[var(--github-border-primary)] bg-[var(--github-border-secondary)]">
                <h3 className="text-[var(--github-text-primary)] font-medium mb-2">Données <em>non</em> envoyées</h3>
                <ul className="list-disc list-inside space-y-1 text-sm ml-2">
                  <li>Ton historique de saisie dans le terminal d'entraînement.</li>
                  <li>Tes données de progression (leçons réussies, scores).</li>
                  <li>Ton email, ton identifiant Supabase, ton profil OAuth.</li>
                  <li>Les questions précédentes hors fenêtre courte de conversation (transcript in-memory uniquement, jamais persistant).</li>
                </ul>
              </div>

              <div className="p-4 rounded-lg border border-[var(--github-border-primary)] bg-[var(--github-border-secondary)]">
                <h3 className="text-[var(--github-text-primary)] font-medium mb-2">Conservation locale de ta clé</h3>
                <p className="text-sm mb-2">
                  Ta clé API est stockée <strong className="text-[var(--github-text-primary)]">uniquement sur ce navigateur</strong> :
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm ml-2">
                  <li><strong className="text-[var(--github-text-primary)]">Mode par défaut</strong> : localStorage en clair (suffisant pour les clés `:free` sans risque financier).</li>
                  <li><strong className="text-[var(--github-text-primary)]">Mode chiffré opt-in</strong> : IndexedDB + AES-GCM 256 bits + PBKDF2 ≥ 210 000 itérations dérivées d'une passphrase que tu choisis. Recommandé pour les clés payantes.</li>
                  <li>Tu peux supprimer ta clé à tout moment via le bouton « Oublier ma clé » dans le panel ou la page <code className="text-emerald-400 text-sm">/app/settings</code>.</li>
                </ul>
              </div>

              <div className="p-4 rounded-lg border border-[var(--github-border-primary)] bg-[var(--github-border-secondary)]">
                <h3 className="text-[var(--github-text-primary)] font-medium mb-2">Consentement et durée</h3>
                <p className="text-sm">
                  Avant la première utilisation du tuteur, un encart de consentement
                  liste les trois points ci-dessus. Ton consentement est tracé
                  localement (date d'acceptation + version + date d'expiration) et{' '}
                  <strong className="text-[var(--github-text-primary)]">valable 12 mois</strong>.
                  Au-delà, le tuteur te re-demandera ton consentement. Tu peux le
                  révoquer à tout moment depuis la page paramètres.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-[var(--github-border-primary)] bg-[var(--github-border-secondary)]">
                <h3 className="text-[var(--github-text-primary)] font-medium mb-2">Politiques des providers tiers</h3>
                <p className="text-sm mb-2">
                  Une fois la requête envoyée, les données sont traitées par le
                  provider que tu as choisi selon <em>sa</em> politique de
                  confidentialité :
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm ml-2">
                  <li><a href="https://openrouter.ai/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 underline">OpenRouter</a> (recommandé pour débuter — modèles `:free` gratuits)</li>
                  <li><a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 underline">Anthropic (Claude)</a></li>
                  <li><a href="https://openai.com/policies/privacy-policy/" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 underline">OpenAI</a></li>
                  <li><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 underline">Google (Gemini)</a></li>
                </ul>
                <p className="text-sm mt-3">
                  <strong className="text-[var(--github-text-primary)]">Conseil</strong> : si tu utilises une clé partagée (compte d'école, organisation), vérifie aussi la politique du provider sur la conservation des prompts pour usage entraînement modèle. La plupart proposent un opt-out, OpenRouter le fait par défaut sur les modèles non-`:free`.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--github-text-primary)] mb-3">5. Cookies</h2>
            <p>
              Terminal Learning n'utilise pas de cookies de tracking, publicitaires ou analytiques.
              Seul le <code className="text-emerald-400 text-sm">localStorage</code> du navigateur
              est utilisé pour sauvegarder ta progression — cette donnée ne quitte jamais ton appareil.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--github-text-primary)] mb-3">6. Tes droits (RGPD)</h2>
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
            <h2 className="text-lg font-semibold text-[var(--github-text-primary)] mb-3">7. Autorité de contrôle</h2>
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
            <h2 className="text-lg font-semibold text-[var(--github-text-primary)] mb-3">8. Modifications</h2>
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
