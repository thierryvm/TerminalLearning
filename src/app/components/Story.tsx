import storyContent from '~/STORY.md?raw';
import { MarkdownPage } from './MarkdownPage';

export function Story() {
  return (
    <MarkdownPage
      content={storyContent}
      title="Notre histoire"
      subtitle="Journal ouvert de la collaboration — choix techniques, débats, idées validées et écartées."
      seo={{
        title: 'Notre histoire — Terminal Learning | Collaboration humain et IA',
        description:
          'L\'histoire vraie de Terminal Learning : un autodidacte passionné, une IA (Claude Sonnet/Opus), et la preuve qu\'on peut construire une plateforme sérieuse avec les bons outils. Choix techniques, débats, idées validées et écartées.',
        canonicalUrl: 'https://terminallearning.dev/story',
        keywords:
          'collaboration humain IA développement, autodidacte développement web, construire application avec IA 2026, projet open source belgique, apprendre terminal open source, Claude IA développement',
      }}
    />
  );
}
