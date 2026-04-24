import { randomBytes } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';

function generateNonce(): string {
  const buffer = randomBytes(32);
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Cache HTML template at module scope — read once at startup, reuse for all requests
const indexPath = join(process.cwd(), '.vercel/output/static/index.html');
let indexHtmlTemplate: string;

try {
  indexHtmlTemplate = readFileSync(indexPath, 'utf-8');
} catch (err) {
  console.error('CSP handler: failed to read index.html template at module load:', err instanceof Error ? err.message : String(err));
  indexHtmlTemplate = '<!DOCTYPE html><html><head></head><body>Service Unavailable</body></html>';
}

export default function handler(req: Request) {
  try {
    const nonce = generateNonce();

    // Start from the cached template and inject nonce per-request
    let html = indexHtmlTemplate;

    // Inject nonce meta tag before </head>
    html = html.replace(
      '</head>',
      `<meta name="csp-nonce" content="${nonce}" /></head>`
    );

    const csp = [
      "default-src 'self'",
      `script-src 'self' https://va.vercel-scripts.com https://vercel.live 'nonce-${nonce}'`,
      `style-src 'self' https://fonts.googleapis.com https://vercel.live 'nonce-${nonce}'`,
      "img-src 'self' data: https://avatars.githubusercontent.com https://lh3.googleusercontent.com https://vercel.live",
      "font-src 'self' data: https://fonts.gstatic.com https://vercel.live",
      "connect-src 'self' https://vitals.vercel-insights.com https://jdnukbpkjyyyjpuwgxhv.supabase.co https://o1234.ingest.sentry.io https://openrouter.ai https://api.anthropic.com https://api.openai.com https://generativelanguage.googleapis.com https://vercel.live",
      "frame-src 'self' https://vercel.live",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests"
    ].join('; ');

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=0, must-revalidate',
        'Content-Security-Policy': csp,
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '0',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=()',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Resource-Policy': 'same-origin',
        'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
      },
    });
  } catch (error) {
    console.error('CSP handler: request failed:', error instanceof Error ? error.message : String(error));
    return new Response('Internal Server Error', { status: 500 });
  }
}
