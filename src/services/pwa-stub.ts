/** Stand-in for `virtual:pwa-register` in builds without a service worker (the single-file artifact build). */
export function registerSW(_options?: { immediate?: boolean; onOfflineReady?: () => void }): () => Promise<void> {
  return async () => {};
}
