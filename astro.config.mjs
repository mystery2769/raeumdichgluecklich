import { defineConfig } from 'astro/config';

export default defineConfig({
  // Nach dem ersten Deploy hier die echte Domain eintragen:
  site: 'https://raeum-dich-gluecklich.ch',
  build: { format: 'directory' },
});
