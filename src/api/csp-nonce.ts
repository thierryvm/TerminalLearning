export const runtime = 'edge';

// Generate a cryptographically random nonce (32 hex chars)
function generateNonce(): string {
  const buffer = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export default async function handler(req: Request) {
  const nonce = generateNonce();
  const url = new URL(req.url);

  // Get origin for fetching index.html
  const origin = url.protocol + '//' + url.host;
  const indexUrl = new URL('/', origin);

  try {
    // Fetch index.html from the static build
    const indexRes = await fetch(indexUrl.toString(), {
      headers: { 'Accept': 'text/html' },
    });

    if (!indexRes.ok) throw new Error('Failed to fetch index.html');

    let html = await indexRes.text();

    // Inject nonce meta tag before </head>
    html = html.replace(
      '</head>',
      `<meta name="csp-nonce" content="${nonce}" /></head>`
    );

    // Create response with injected HTML
    const headers = new Headers({
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' https://va.vercel-scripts.com https://vercel.live",
        `style-src 'self' https://fonts.googleapis.com https://vercel.live 'nonce-${nonce}'`,
        "img-src 'self' data: https://avatars.githubusercontent.com https://lh3.googleusercontent.com https://vercel.live",
        "font-src 'self' data: https://fonts.gstatic.com https://vercel.live",
        "connect-src 'self' https://vitals.vercel-insights.com https://jdnukbpkjyyyjpuwgxhv.supabase.co https://openrouter.ai https://api.anthropic.com https://api.openai.com https://generativelanguage.googleapis.com https://vercel.live",
        "frame-src 'self' https://vercel.live",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "upgrade-insecure-requests"
      ].join('; '),
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '0',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=()',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    });

    return new Response(html, { headers });
  } catch {
    // Fallback: return error response
    return new Response('Internal Server Error', { status: 500 });
  }
}
