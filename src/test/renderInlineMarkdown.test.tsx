import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { renderInlineMarkdown } from '@/lib/renderInlineMarkdown';

function renderInline(text: string) {
  return render(<div data-testid="out">{renderInlineMarkdown(text)}</div>);
}

describe('renderInlineMarkdown', () => {
  it('renders `code` spans as <code> with the backticks stripped', () => {
    const { container } = renderInline('use `ls -la` here');
    const code = container.querySelector('code');
    expect(code).not.toBeNull();
    expect(code?.textContent).toBe('ls -la');
    expect(container.textContent).toBe('use ls -la here');
  });

  it('renders **bold** as <strong> with the asterisks stripped (the 30/05 fix)', () => {
    const { container } = renderInline('a **modèle universel** here');
    const strong = container.querySelector('strong');
    expect(strong).not.toBeNull();
    expect(strong?.textContent).toBe('modèle universel');
    // The literal asterisks must NOT leak to the learner.
    expect(container.textContent).toBe('a modèle universel here');
    expect(container.textContent).not.toContain('**');
  });

  it('renders both bold and code in the same string', () => {
    const { container } = renderInline('**Les options** comme `-l` ou `-a`');
    expect(container.querySelectorAll('strong')).toHaveLength(1);
    expect(container.querySelectorAll('code')).toHaveLength(2);
    expect(container.textContent).not.toContain('**');
  });

  it('handles multiple separate bold spans without merging them', () => {
    const { container } = renderInline('**un** et **deux**');
    expect(container.querySelectorAll('strong')).toHaveLength(2);
    expect(container.textContent).toBe('un et deux');
  });

  it('leaves a lone asterisk untouched (no false bold)', () => {
    const { container } = renderInline('2 * 3 = 6');
    expect(container.querySelector('strong')).toBeNull();
    expect(container.textContent).toBe('2 * 3 = 6');
  });

  it('leaves plain text without markup', () => {
    const { container } = renderInline('juste du texte normal');
    expect(container.querySelector('strong')).toBeNull();
    expect(container.querySelector('code')).toBeNull();
    expect(container.textContent).toBe('juste du texte normal');
  });
});
