import storyContent from '~/STORY.md?raw';
import { MarkdownPage } from './MarkdownPage';

export function Story() {
  return (
    <MarkdownPage
      content={storyContent}
      title="Notre histoire"
      subtitle="Journal ouvert de la collaboration — choix techniques, débats, idées validées et écartées."
    />
  );
}
