import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * Two build targets:
 *  - default:  multi-file site with a service worker (PWA). Deploy `dist/` to any static host.
 *  - artifact: `--mode artifact` emits one self-contained index.html with no service worker,
 *              for hosts that sandbox pages (claude.ai artifacts). Flags stay as separate files.
 */
export default defineConfig(({ mode }) => {
  const artifact = mode === 'artifact';
  const base = artifact ? './' : '/';
  return {
    base,
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        ...(artifact
          ? { 'virtual:pwa-register': fileURLToPath(new URL('./src/services/pwa-stub.ts', import.meta.url)) }
          : {}),
      },
    },
    build: { target: 'es2022', outDir: artifact ? 'dist-artifact' : 'dist' },
    plugins: artifact
      ? [tailwindcss(), viteSingleFile()]
      : [
          tailwindcss(),
          VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['icons/*.png', 'icons/icon.svg', 'flags/*.svg'],
            manifest: {
              name: 'Flagwise',
              short_name: 'Flagwise',
              description: 'Flag quiz for 197 countries. Works offline.',
              theme_color: '#000000',
              background_color: '#000000',
              display: 'standalone',
              start_url: base,
              icons: [
                { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
                { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
                { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
              ],
            },
            workbox: {
              // App shell plus every flag, so the whole quiz runs without a network.
              globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
              maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
              navigateFallback: 'index.html',
              runtimeCaching: [
                {
                  urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                  handler: 'StaleWhileRevalidate',
                  options: { cacheName: 'google-fonts-css' },
                },
                {
                  urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                  handler: 'CacheFirst',
                  options: { cacheName: 'google-fonts-files', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } },
                },
              ],
            },
          }),
        ],
  };
});
