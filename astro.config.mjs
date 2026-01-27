import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel/serverless';

// https://astro.build/config
export default defineConfig({
  site: 'https://checkmyrental.io', // Production domain for canonical URLs
  output: 'hybrid',
  adapter: vercel({
    runtime: 'nodejs20.x'
  }),
  integrations: [
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
    })
  ],
  vite: {
    build: {
      cssCodeSplit: true // Re-enabled for better performance
    }
  }
});
