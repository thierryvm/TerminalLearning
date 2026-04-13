import changelogContent from '../../../CHANGELOG.md?raw';
import { MarkdownPage } from './MarkdownPage';

export function Changelog() {
  return (
    <MarkdownPage
      content={changelogContent}
      title="Changelog"
      subtitle="Les évolutions majeures du projet — défis, décisions, impact mesurable."
    />
  );
}
