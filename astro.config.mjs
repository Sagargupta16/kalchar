import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

const REPO_NAME = 'folk-art-portfolio';
const GH_USER = 'Sagargupta16';

export default defineConfig({
  site: `https://${GH_USER}.github.io`,
  base: `/${REPO_NAME}/`,
  trailingSlash: 'ignore',
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
