import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Helmet } from 'react-helmet-async';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Terminal, ArrowLeft, ArrowUp } from 'lucide-react';
import type { Components } from 'react-markdown';
import { Button } from './ui/button';

// Maps repo-root markdown filenames to their SPA route.
// Narrative docs at the repo root (CHANGELOG.md, STORY.md) are rendered at
// /changelog and /story — so cross-links in their markdown must resolve to
// those routes instead of the raw .md file (which would 404 on the SPA).
// Keep in sync with src/app/routes.ts.
// Exported so src/test/markdownLinks.test.ts can use it as single source of truth.
export const MARKDOWN_ROUTE_MAP: Record<string, string> = {
  'STORY.md': '/story',
  'CHANGELOG.md': '/changelog',
};

const mdComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-3xl font-bold text-[var(--github-text-primary)] mb-4 mt-8 first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-bold text-[var(--github-text-primary)] mb-3 mt-10 pb-2 border-b border-[var(--github-border-primary)]/50">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold text-[var(--github-text-primary)] mb-2 mt-6">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-[var(--github-text-primary)] leading-relaxed mb-4">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="text-[var(--github-text-primary)] font-semibold">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="text-[var(--github-text-secondary)] italic">{children}</em>
  ),
  a: ({ href, children }) => {
    const linkClass = 'text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors';
    const mappedRoute = href ? MARKDOWN_ROUTE_MAP[href] : undefined;

    if (mappedRoute) {
      return (
        <Link to={mappedRoute} className={linkClass}>
          {children}
        </Link>
      );
    }

    const isExternal = href?.startsWith('http');
    return (
      <a
        href={href}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        className={linkClass}
      >
        {children}
      </a>
    );
  },
  pre: ({ children }) => (
    <div className="my-4 bg-[var(--github-border-secondary)] border border-[var(--github-border-primary)] rounded-lg p-4 overflow-x-auto">
      {children}
    </div>
  ),
  code: ({ className, children }) => {
    // Block code has a language-* className injected by remark; inline code has none
    if (className) {
      return (
        <code className="block font-mono text-sm text-[var(--github-text-primary)] whitespace-pre">
          {children}
        </code>
      );
    }
    return (
      <code className="px-1.5 py-0.5 bg-[#21262d] text-emerald-400 rounded text-sm font-mono">
        {children}
      </code>
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-emerald-500/40 pl-4 my-4 text-[var(--github-text-secondary)] italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-[var(--github-border-primary)]/50 my-8" />,
  ul: ({ children }) => (
    <ul className="list-disc list-inside space-y-1 mb-4 text-[var(--github-text-primary)] marker:text-emerald-500">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside space-y-1 mb-4 text-[var(--github-text-primary)]">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed pl-1">{children}</li>,
  table: ({ children }) => (
    <div className="overflow-x-auto my-6">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead>{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-b border-[var(--github-border-primary)]/50 last:border-0">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="text-left px-3 py-2 text-[var(--github-text-secondary)] font-semibold bg-[var(--github-border-secondary)] first:rounded-tl-lg last:rounded-tr-lg">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-[var(--github-text-primary)] align-top">{children}</td>
  ),
};

interface MarkdownPageProps {
  content: string;
  title: string;
  subtitle?: string;
  seo: {
    title: string;
    description: string;
    canonicalUrl: string;
    ogImage?: string;
    keywords: string;
  };
}

export function MarkdownPage({ content, title, subtitle, seo }: MarkdownPageProps) {
  const navigate = useNavigate();
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const ogImage = seo.ogImage ?? 'https://terminallearning.dev/og-image.png';

  return (
    <div className="min-h-dvh bg-[var(--github-bg)] text-[var(--github-text-primary)]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <Helmet>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <meta name="keywords" content={seo.keywords} />
        <link rel="canonical" href={seo.canonicalUrl} />
        {/* Open Graph */}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={seo.canonicalUrl} />
        <meta property="og:title" content={seo.title} />
        <meta property="og:description" content={seo.description} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:site_name" content="Terminal Learning" />
        <meta property="og:locale" content="fr_BE" />
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seo.title} />
        <meta name="twitter:description" content={seo.description} />
        <meta name="twitter:image" content={ogImage} />
        <meta name="twitter:creator" content="@thierryvm" />
      </Helmet>
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
        >
          <ArrowLeft size={14} className="size-[14px]" aria-hidden="true" />
          Retour
        </Button>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-[var(--github-text-primary)] mb-2">{title}</h1>
          {subtitle && <p className="text-[var(--github-text-secondary)] text-sm">{subtitle}</p>}
        </div>

        {/* Markdown content */}
        <article>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
            {content}
          </ReactMarkdown>
        </article>
      </main>

      {/* Scroll to top */}
      {showScrollTop && (
        <Button
          type="button"
          variant="floating"
          size="icon-round"
          onClick={() => {
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
          }}
          aria-label="Retour en haut"
          className="fixed right-6 bottom-[max(1.5rem,env(safe-area-inset-bottom))] w-11 h-11 focus-visible:ring-emerald-500/60"
        >
          <ArrowUp size={18} aria-hidden="true" />
        </Button>
      )}

      {/* Footer */}
      <footer className="border-t border-[var(--github-border-primary)]/50 px-6 py-6 mt-12">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-[var(--github-text-secondary)] text-xs">
          <span className="font-mono flex items-center gap-1.5">
            <Terminal size={12} className="text-emerald-400" />
            Terminal Learning · MIT License
          </span>
          <Button
            variant="nav-link"
            size="link-inline"
            onClick={() => navigate('/')}
            className="text-xs"
          >
            ← Accueil
          </Button>
        </div>
      </footer>
    </div>
  );
}
