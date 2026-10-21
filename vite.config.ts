import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

/** The Pages workflow passes the base without a trailing slash, which `%BASE_URL%` links need. */
const BASE = (process.env.VITE_BASE ?? '/').replace(/\/?$/, '/')

/** Where the GitHub Pages site is served from; social previews need absolute URLs. */
const SITE_ORIGIN = process.env.SITE_ORIGIN ?? 'https://gcoulby.github.io'

/** Replaces `%SITE_URL%` in index.html with the absolute URL of the app, base path included. */
function siteUrl(): Plugin {
  let base = '/'
  return {
    name: 'site-url',
    configResolved(config) {
      base = config.base
    },
    transformIndexHtml(html) {
      return html.replaceAll('%SITE_URL%', new URL(base, SITE_ORIGIN).href)
    },
  }
}

export default defineConfig({
  base: BASE,
  plugins: [react(), tailwindcss(), siteUrl()],
  // ELK is imported on demand; bundling it up front stops the dev server re-optimising it mid-session.
  optimizeDeps: { include: ['elkjs/lib/elk-api'] },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
