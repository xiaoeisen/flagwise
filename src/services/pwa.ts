import { registerSW } from 'virtual:pwa-register';

/**
 * Registers the service worker that precaches the app shell and all 197 flags,
 * so the quiz works offline after the first load. The worker updates itself in the background.
 * The single-file artifact build aliases this import to a no-op (see vite.config.ts).
 */
export function registerOffline(onReady?: () => void): void {
  registerSW({
    immediate: true,
    onOfflineReady: onReady,
  });
}
