import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

const REPO_NAME = 'folk-art-portfolio';
// Primary public origin for canonical URL + OG tags. Swap when the artist's own domain lands.
// Both prod and beta builds share this origin -- canonical always points at prod so SEO
// consolidates ranking signals there even when crawlers land on /beta/.
const SITE = 'https://sagargupta.online';

// DEPLOY_ENV=beta -> built under /folk-art-portfolio/beta/ (dev branch)
// otherwise       -> built under /folk-art-portfolio/        (main branch)
const IS_BETA = process.env.DEPLOY_ENV === 'beta';
const base = IS_BETA ? `/${REPO_NAME}/beta/` : `/${REPO_NAME}/`;

export default defineConfig({
  site: SITE,
  base,
  trailingSlash: 'ignore',
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
