/**
 * generate-sitemap.mjs
 *
 * Generates public/sitemap.xml with the current build date as lastmod.
 * Run via: node scripts/generate-sitemap.mjs
 * Hooked into `prebuild` so Vercel always deploys a fresh sitemap.
 *
 * Single source of truth for sitemap URLs — edit SITEMAP_URLS below
 * when adding/removing routes. This avoids duplication between sitemap.xml
 * and other places (JSON-LD, router) that reference the same lesson URLs.
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const today = new Date().toISOString().slice(0, 10);
const BASE = 'https://terminallearning.dev';

/**
 * URL config — single source of truth for sitemap entries.
 * Each entry: { path, changefreq, priority, isLandingPage? }
 */
const SITEMAP_URLS = [
  // Static pages
  { path: '/',              changefreq: 'weekly',  priority: '1.0', isLanding: true },
  { path: '/app',           changefreq: 'weekly',  priority: '0.9' },
  { path: '/app/reference', changefreq: 'monthly', priority: '0.7' },
  { path: '/changelog',     changefreq: 'weekly',  priority: '0.6' },
  { path: '/story',         changefreq: 'weekly',  priority: '0.6' },
  { path: '/privacy',       changefreq: 'yearly',  priority: '0.3' },

  // Module: Navigation
  { path: '/app/learn/navigation/orientation', changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/navigation/pwd',         changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/navigation/ls',          changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/navigation/ls-la',       changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/navigation/cd',          changefreq: 'monthly', priority: '0.8' },

  // Module: Fichiers & Dossiers
  { path: '/app/learn/fichiers/mkdir', changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/fichiers/touch', changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/fichiers/cp',    changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/fichiers/mv',    changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/fichiers/rm',    changefreq: 'monthly', priority: '0.8' },

  // Module: Lecture de fichiers
  { path: '/app/learn/lecture/cat',      changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/lecture/head-tail', changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/lecture/grep',     changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/lecture/wc',       changefreq: 'monthly', priority: '0.8' },

  // Module: Permissions
  { path: '/app/learn/permissions/comprendre-permissions', changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/permissions/chmod',                  changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/permissions/chown',                  changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/permissions/sudo',                   changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/permissions/security-permissions',   changefreq: 'monthly', priority: '0.8' },

  // Module: Processus
  { path: '/app/learn/processus/ps',         changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/processus/kill',       changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/processus/top',        changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/processus/background', changefreq: 'monthly', priority: '0.8' },

  // Module: Redirection & Pipes
  { path: '/app/learn/redirection/redirection-sortie', changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/redirection/pipes',               changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/redirection/stderr',              changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/redirection/tee',                 changefreq: 'monthly', priority: '0.8' },

  // Module: Variables & Scripts
  { path: '/app/learn/variables/env-vars',      changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/variables/path-variable', changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/variables/shell-config',  changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/variables/dotenv',        changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/variables/scripts',       changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/variables/cron',          changefreq: 'monthly', priority: '0.8' },

  // Module: Réseau & SSH
  { path: '/app/learn/reseau/ping', changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/reseau/curl', changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/reseau/wget', changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/reseau/dns',  changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/reseau/ssh',  changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/reseau/scp',  changefreq: 'monthly', priority: '0.8' },

  // Module: Git Fondamentaux
  { path: '/app/learn/git/git-init',             changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/git/git-config',           changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/git/git-add-commit',       changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/git/git-status-log',       changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/git/git-diff-gitignore',   changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/git/git-branch',           changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/git/git-merge',            changefreq: 'monthly', priority: '0.8' },

  // Module: GitHub & Collaboration
  { path: '/app/learn/github-collaboration/git-remote',       changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/github-collaboration/git-push-pull',    changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/github-collaboration/git-fetch-clone',  changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/github-collaboration/pull-requests',    changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/github-collaboration/merge-strategies', changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/github-collaboration/conflicts',        changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/github-collaboration/github-actions',   changefreq: 'monthly', priority: '0.8' },

  // Module: L'IA comme outil dev
  { path: '/app/learn/ia-dev/ia-dev-intro',           changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/ia-dev/ia-dev-capacites',       changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/ia-dev/ia-dev-limites',         changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/ia-dev/ia-dev-prompts-basics',  changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/ia-dev/ia-dev-prompts-avances', changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/ia-dev/ia-dev-valider',         changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/ia-dev/ia-dev-debug',           changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/ia-dev/ia-dev-securite',        changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/ia-dev/ia-dev-claude-cli',      changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/ia-dev/ia-dev-metiers',         changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/ia-dev/ia-dev-posture',         changefreq: 'monthly', priority: '0.8' },
  { path: '/app/learn/ia-dev/ia-dev-workflow',        changefreq: 'monthly', priority: '0.8' },
];

function renderUrl({ path, changefreq, priority, isLanding }) {
  const loc = `${BASE}${path}`;
  const imageBlock = isLanding
    ? `
    <image:image>
      <image:loc>${BASE}/og-image.png</image:loc>
      <image:title>Terminal Learning — Apprends le terminal pas à pas</image:title>
      <image:caption>Interface de l'application avec émulateur terminal interactif</image:caption>
    </image:image>`
    : '';
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>${imageBlock}
  </url>`;
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
>
${SITEMAP_URLS.map(renderUrl).join('\n\n')}
</urlset>
`;

const sitemapPath = resolve(root, 'public', 'sitemap.xml');
writeFileSync(sitemapPath, xml, 'utf-8');
console.log(`sitemap.xml generated (${SITEMAP_URLS.length} URLs, lastmod ${today}) ✅`);
