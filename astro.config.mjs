import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://checkmyrental.io', // Production domain for canonical URLs
  output: 'server', // Server mode for API routes
  adapter: vercel(),
  integrations: [
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
    })
  ],
  vite: {
    build: {
      cssCodeSplit: true, // Re-enabled for better performance
      rollupOptions: {
        external: ['twilio']
      }
    }
  }
});
