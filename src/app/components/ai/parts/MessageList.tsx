/**
 * MessageList — renders the tutor transcript via react-markdown.
 *
 * Defense-in-depth note: react-markdown is invoked WITHOUT `rehype-raw`, so
 * raw HTML embedded in the model output is rendered as text rather than
 * executed. Combined with `sanitizeModelChunk` upstream (script/iframe/
 * handlers stripped), this is the second line of defence on the assembled
 * DOM.
 *
 * The component scrolls to the bottom whenever a streaming message grows so
 * the user always sees the latest token without having to chase it.
 */
import { useEffect, useRef } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

import type { ChatMessage } from '@/lib/ai/providers/types';

interface Props {
  messages: readonly ChatMessage[];
  isStreaming: boolean;
}

const mdComponents: Components = {
  // Strip-down: no images, no raw HTML, no anchors with target=_blank.
  // sanitizeModelChunk already removes [text](url) from model output, so any
  // <a> we render here came from the user's own typed message.
  a: ({ children }) => <span className="underline">{children}</span>,
  pre: ({ children }) => (
    <pre className="overflow-x-auto rounded bg-[var(--github-bg-tertiary)] p-2 text-xs">
      {children}
    </pre>
  ),
  code: ({ children, className }) => {
    const isBlock = typeof className === 'string' && className.startsWith('language-');
    if (isBlock) return <code className={className}>{children}</code>;
    return (
      <code className="rounded bg-[var(--github-bg-tertiary)] px-1 py-0.5 text-xs">
        {children}
      </code>
    );
  },
};

function userBubbleText(content: string): string {
  // The hook wraps user input in <lesson_context> + <user_question> tags so
  // the LLM sees a structured prompt. The UI shows only the question portion
  // so the bubble looks like "the thing the learner typed".
  const m = content.match(/<user_question>\s*([\s\S]*?)\s*<\/user_question>/);
  return m ? (m[1] ?? '') : content;
}

export function MessageList({ messages, isStreaming }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // jsdom does not implement scrollTo — fall back to direct prop assignment.
    if (typeof el.scrollTo === 'function') {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    } else {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isStreaming]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-[var(--github-text-secondary)]">
        Pose ta première question sur la commande de la leçon.
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="flex-1 overflow-y-auto p-3"
      role="log"
      aria-label="Conversation avec le tuteur IA"
      aria-live="polite"
    >
      {messages.map((m, i) => {
        const isUser = m.role === 'user';
        const text = isUser ? userBubbleText(m.content) : m.content;
        return (
          <div
            key={`${m.role}-${i}`}
            className={`mb-3 flex ${isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                isUser
                  ? 'bg-[var(--github-accent)] text-white'
                  : 'bg-[var(--github-bg-secondary)] text-[var(--github-text-primary)]'
              }`}
              data-testid={isUser ? 'msg-user' : 'msg-assistant'}
            >
              {text.length === 0 && isStreaming ? (
                <span className="inline-flex items-center gap-1 text-[var(--github-text-secondary)]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                </span>
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                  {text}
                </ReactMarkdown>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
