import { randomBytes } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load index.html at module scope to avoid per-request filesystem I/O
const indexHtmlTemplate = (() => {
  try {
    const htmlPath = join(process.cwd(), 'dist', 'index.html');
    return readFileSync(htmlPath, 'utf-8');
  } catch {
    return null;
  }
})();

function generateNonce(): string {
  const buffer = randomBytes(16);
  return buffer.toString('base64');
}

function validateNonce(nonce: string): boolean {
  return /^[A-Za-z0-9+/=]+$/.test(nonce);
}

export default async function handler(req: Request) {
  const nonce = generateNonce();

  if (!validateNonce(nonce)) {
    return new Response('Internal Server Error', {
      status: 500,
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '0',
      },
    });
  }

  if (!indexHtmlTemplate) {
    return new Response('Service Unavailable', {
      status: 503,
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '0',
      },
    });
  }

  try {
    // Inject nonce into the <style> tag's nonce attribute
    let html = indexHtmlTemplate.replace(
      '<style>',
      `<style nonce="${nonce}">`
    );

    // Also add meta tag for JS to read the nonce if needed
    html = html.replace(
      '</head>',
      `<meta name="csp-nonce" content="${nonce}" /></head>`
    );

    const headers = new Headers({
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
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
    return new Response('Internal Server Error', {
      status: 500,
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '0',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
      },
    });
  }
}
