/**
 * Sanitizer — THI-111 step 1/8.
 *
 * Two-sided defence for the AI tutor:
 *
 *  - `sanitizeUserInput` runs BEFORE a question reaches the LLM. It rejects
 *    length excess, bidi/zero-width unicode tricks, prompt-injection phrases,
 *    and base64-encoded variants of the same. It HTML-escapes the structural
 *    delimiters (`<user_question>`, `<lesson_context>`, `<system>`…) so the
 *    user can never break out of their block in the system prompt.
 *
 *  - `sanitizeModelChunk` runs AFTER each SSE chunk arrives, before it lands in
 *    React state. It strips HTML/JS, dangerous markdown (images, links,
 *    `<details>`), destructive shell commands hallucinated by the model, and
 *    leaked API keys.
 *
 *  - `detectKeyLeak` is a boolean predicate the hook uses to flag a scrubbed
 *    message in Sentry without forwarding the key body itself.
 *
 * **Streaming caveat.** `sanitizeModelChunk` operates on a single chunk in
 * isolation. A pattern split across two chunks (`<scri` + `pt>`) is not caught
 * here — the rehype-sanitize layer in `MessageList.tsx` is the second line of
 * defence on the assembled DOM. Keep both layers in place.
 */

const MAX_USER_INPUT_LENGTH = 2000;

// Bidirectional + zero-width control characters. Banning these blocks
// "ignore[U+200B]previous" style bypasses where the literal pattern check
// would otherwise miss the gap.
const BIDI_RX =
  /[‪-‮​-‏⁦-⁩]/;

// Prompt-injection patterns. Each requires a structural anchor (whole phrase
// or literal token) so common words like "ignore" or "act" alone do not fire.
const INJECTION_PATTERNS: readonly RegExp[] = [
  /\b(?:ignore|disregard|forget|override)\s+(?:all\s+|the\s+|prior\s+|previous\s+|preceding\s+|earlier\s+|above\s+)+(?:instructions?|prompts?|messages?|context|directives?|rules?|commands?)\b/i,
  /\[\/?INST\]/,
  /<\|im_start\|>|<\|im_end\|>|<\|system\|>/,
  /###\s+(?:Instruction|System)\b/i,
  /\byou\s+are\s+now\b/i,
  /\bact\s+as\s+(?:a|an|the)?\b/i,
  /\bpretend\s+you\s+are\b/i,
  /\bdo\s+anything\s+now\b/i,
];

// Structural delimiters of the system prompt. We HTML-escape rather than
// reject so a question that happens to mention them can still go through.
const DELIMITER_RX =
  /<\/?(?:user_question|lesson_context|system|assistant|user)>/gi;

// Tokens that look like base64 of length plausibly carrying an injection.
// 20 chars ≈ 15 bytes decoded — under that, payloads are too short to matter.
const BASE64_TOKEN_RX = /[A-Za-z0-9+/]{20,}={0,2}/g;

function isInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((rx) => rx.test(text));
}

function tryDecodeBase64(token: string): string | null {
  try {
    // atob throws on invalid input. We also guard against decoded bytes that
    // are not valid UTF-8 by relying on TextDecoder fatal mode.
    const binary = atob(token);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function containsBase64Injection(text: string): boolean {
  const matches = text.match(BASE64_TOKEN_RX);
  if (!matches) return false;
  for (const token of matches) {
    const decoded = tryDecodeBase64(token);
    if (decoded && isInjection(decoded)) return true;
  }
  return false;
}

function escapeDelimiters(text: string): string {
  return text.replace(DELIMITER_RX, (match) =>
    match.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
  );
}

export type SanitizeRejectReason =
  | 'invalid_type'
  | 'empty'
  | 'too_long'
  | 'unicode_bidi'
  | 'prompt_injection';

export type SanitizeUserInputResult =
  | { ok: true; clean: string }
  | { ok: false; reason: SanitizeRejectReason };

/**
 * Validates and escapes a learner's question before it reaches the LLM.
 *
 * Order of checks: type → empty → length → bidi unicode → literal prompt
 * injection → base64-decoded prompt injection → delimiter escaping.
 *
 * Returns `{ ok: true, clean }` where `clean` may differ from the input
 * (delimiters HTML-escaped) but preserves all legitimate content.
 */
export function sanitizeUserInput(raw: string): SanitizeUserInputResult {
  if (typeof raw !== 'string') {
    return { ok: false, reason: 'invalid_type' };
  }

  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { ok: false, reason: 'empty' };
  }
  if (raw.length > MAX_USER_INPUT_LENGTH) {
    return { ok: false, reason: 'too_long' };
  }

  if (BIDI_RX.test(raw)) {
    return { ok: false, reason: 'unicode_bidi' };
  }

  if (isInjection(raw)) {
    return { ok: false, reason: 'prompt_injection' };
  }

  if (containsBase64Injection(raw)) {
    return { ok: false, reason: 'prompt_injection' };
  }

  return { ok: true, clean: escapeDelimiters(raw) };
}

// ---------------------------------------------------------------------------
// Output sanitisation
// ---------------------------------------------------------------------------

const KEY_REDACTED = '[redacted]';
const UNSAFE_CMD_REPLACED = '[unsafe-command-removed]';

// Order matters: more specific patterns first so an OpenRouter key is not
// re-matched by the generic OpenAI pattern.
const KEY_PATTERNS: readonly RegExp[] = [
  /sk-or-v1-[A-Za-z0-9_-]{16,}/g,           // OpenRouter
  /sk-ant-(?:api\d{2}-)?[A-Za-z0-9_-]{16,}/g, // Anthropic
  /sk-(?:proj-|svcacct-|admin-)?[A-Za-z0-9_-]{16,}/g, // OpenAI (any sub-prefix)
  /AIza[A-Za-z0-9_-]{20,}/g,                // Google / Gemini
];

const DESTRUCTIVE_PATTERNS: readonly RegExp[] = [
  /\brm\s+-rf\s+\/(?:\s|$|\*)/g,                          // rm -rf /
  /\brm\s+-rf\s+~(?:\s|$)/g,                              // rm -rf ~
  /\bdd\s+if=\/dev\/[a-z]+\s+of=\/dev\/(?:sd[a-z]\d?|hd[a-z]|nvme\d+n\d+)\b/gi,
  /:\(\)\s*\{\s*:\|:\s*&\s*\}\s*;\s*:/g,                  // fork bomb
  /\bmkfs\.\w+\s+\/dev\/(?:sd[a-z]\d?|hd[a-z]|nvme\d+n\d+p?\d*)\b/gi,
];

const HTML_BLOCK_PATTERNS: readonly RegExp[] = [
  /<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,
  /<script\b[^>]*\/?>/gi,
  /<iframe\b[^>]*>[\s\S]*?<\/iframe\s*>/gi,
  /<iframe\b[^>]*\/?>/gi,
  /<details\b[^>]*>[\s\S]*?<\/details\s*>/gi,
  /<details\b[^>]*\/?>/gi,
  /<\/details\s*>/gi,
];

// Strips inline event handlers (onclick=…, onerror=…) keeping the surrounding
// element. Catches quoted, single-quoted, and bare values.
const HTML_HANDLER_RX =
  /\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

const DANGEROUS_URL_PATTERNS: readonly RegExp[] = [
  /javascript\s*:[^\s)"']*/gi,
  /data\s*:\s*text\/html[^\s)"']*/gi,
];

const MARKDOWN_BOMB_PATTERNS: readonly RegExp[] = [
  /!\[[^\]]*\]\([^)]*\)/g, // image markdown
  /\[[^\]]+\]\([^)]+\)/g,   // link markdown (must have non-empty text+url)
];

/**
 * Sanitises a single SSE chunk before it is appended to the visible message.
 *
 * Strips, in order: leaked API keys → destructive shell commands → HTML
 * blocks (script/iframe/details) → inline event handlers → dangerous URLs
 * (`javascript:`, `data:text/html`) → image and link markdown.
 *
 * Limitations:
 *  - Operates on the chunk alone. A pattern split across chunks slips through;
 *    the rehype-sanitize step in `MessageList.tsx` is the second line of
 *    defence on the assembled output.
 *  - Returns a placeholder (`[redacted]`, `[unsafe-command-removed]`) where it
 *    strips so the UI can style the gap.
 */
export function sanitizeModelChunk(chunk: string): string {
  if (typeof chunk !== 'string') return '';
  let out = chunk;

  for (const rx of KEY_PATTERNS) {
    out = out.replace(rx, KEY_REDACTED);
  }
  for (const rx of DESTRUCTIVE_PATTERNS) {
    out = out.replace(rx, UNSAFE_CMD_REPLACED);
  }
  for (const rx of HTML_BLOCK_PATTERNS) {
    out = out.replace(rx, '');
  }
  out = out.replace(HTML_HANDLER_RX, '');
  for (const rx of DANGEROUS_URL_PATTERNS) {
    out = out.replace(rx, '');
  }
  for (const rx of MARKDOWN_BOMB_PATTERNS) {
    out = out.replace(rx, '');
  }

  return out;
}

// Predicate variants of the key patterns for non-destructive detection.
// Reused by `useAiTutor` to flag a scrubbed message in Sentry.
const KEY_DETECTION_PATTERNS: readonly RegExp[] = [
  /sk-or-v1-[A-Za-z0-9_-]{16,}/,
  /sk-ant-(?:api\d{2}-)?[A-Za-z0-9_-]{16,}/,
  /sk-(?:proj-|svcacct-|admin-)?[A-Za-z0-9_-]{16,}/,
  /AIza[A-Za-z0-9_-]{20,}/,
];

/** True iff `text` contains a recognisable provider API key. */
export function detectKeyLeak(text: string): boolean {
  if (typeof text !== 'string') return false;
  return KEY_DETECTION_PATTERNS.some((rx) => rx.test(text));
}
