/**
 * MarkdownPage (/story, /changelog): level-2 headings carry GitHub's ids so a
 * table of contents works, and a link to a section lands on it — without a
 * malformed address ever taking the page down.
 */
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { HelmetProvider } from 'react-helmet-async';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MarkdownPage } from '../app/components/MarkdownPage';

const SEO = { title: 't', description: 'd', canonicalUrl: 'https://terminallearning.dev/story', keywords: 'k' };
const CONTENT = "## Sommaire\n\n- [Partie II](#partie-ii--lexpansion)\n\n## Partie II — L'expansion\n\nTexte.\n\n## \n";

function renderAt(hash: string) {
  window.history.replaceState(null, '', `/story${hash}`);
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <MarkdownPage content={CONTENT} title="Notre histoire" seo={SEO} />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe('MarkdownPage headings and section links', () => {
  const scrollIntoView = vi.fn();
  const scrollTo = vi.fn();

  beforeEach(() => {
    Element.prototype.scrollIntoView = scrollIntoView;
    vi.spyOn(window, 'scrollTo').mockImplementation(scrollTo);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    scrollIntoView.mockReset();
    scrollTo.mockReset();
    window.history.replaceState(null, '', '/');
  });

  it("gives each level-2 heading GitHub's id, and none to an empty heading", () => {
    const { container } = renderAt('');
    const ids = [...container.querySelectorAll('h2')].map((h) => h.getAttribute('id'));
    expect(ids).toEqual(['sommaire', 'partie-ii--lexpansion', null]);
  });

  it('lands on the section a link names', () => {
    const { container } = renderAt('#partie-ii--lexpansion');
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(container.querySelector('#partie-ii--lexpansion'));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('starts at the top when the address names no section, even a malformed one', () => {
    expect(() => renderAt('#%E0%A4%A')).not.toThrow();
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });
});
