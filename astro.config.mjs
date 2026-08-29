import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  site: 'https://luhunglieh.github.io',
  base: '/Website-taiou.org',
  integrations: [tailwind()],
  output: 'static',
  devToolbar: {
    enabled: false
  }
});
