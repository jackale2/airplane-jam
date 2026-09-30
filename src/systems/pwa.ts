import { Capacitor } from '@capacitor/core';

/** Offline support for the web build: a small service worker caches the game after the first visit. */
export function registerServiceWorker() {
  if (import.meta.env.DEV || Capacitor.isNativePlatform() || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* offline play is a bonus, never an error */
    });
  });
}
