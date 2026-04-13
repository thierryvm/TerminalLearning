import changelogContent from '~/CHANGELOG.md?raw';
import { MarkdownPage } from './MarkdownPage';

export function Changelog() {
  return (
    <MarkdownPage
      content={changelogContent}
      title="Changelog"
      subtitle="Les évolutions majeures du projet — défis, décisions, impact mesurable."
      seo={{
        title: 'Changelog — Terminal Learning | Projet open source éducatif',
        description:
          'Suivez l\'évolution de Terminal Learning : décisions d\'architecture, métriques de performance (INP −98%, bundle −88%), sécurité OWASP et RBAC. Transparence totale sur une plateforme d\'apprentissage du terminal gratuite et open source.',
        canonicalUrl: 'https://terminallearning.dev/changelog',
        keywords:
          'projet open source éducatif, plateforme apprentissage terminal, transparence développement logiciel, performance web Core Web Vitals, sécurité OWASP, apprendre terminal linux macos windows gratuit',
      }}
    />
  );
}
