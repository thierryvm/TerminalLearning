import { readFileSync } from 'fs';
import { join } from 'path';

function generateNonce(): string {
  const buffer = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export default function handler(req: Request) {
  try {
    const nonce = generateNonce();

    // Read the built index.html from the static output directory
    // Vercel places the build output at .vercel/output/static/
    const indexPath = join(process.cwd(), '.vercel/output/static/index.html');
    let html = readFileSync(indexPath, 'utf-8');

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
    return new Response('Internal Server Error', { status: 500 });
  }
}
