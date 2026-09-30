import { renderScale, viewFor, type ViewSize } from './layout/view.ts';

const hasWindow = typeof window !== 'undefined' && typeof screen !== 'undefined';

/**
 * The live design space. `w` x `h` design px follow the window shape (the short side is 1080);
 * `res` is canvas pixels per design px (1 on phones, up to 2 on tablets and desktops for sharp text).
 * Scenes read this on every build, and the resize handler in main.ts updates it and re-lays scenes out.
 */
export const view: ViewSize & { res: number } = {
  ...(hasWindow ? viewFor(window.innerWidth, window.innerHeight) : viewFor(1080, 1920)),
  res: hasWindow ? renderScale(screen.width, screen.height, window.devicePixelRatio) : 1,
};

export function setView(v: ViewSize) {
  view.w = v.w;
  view.h = v.h;
  view.mode = v.mode;
}

export const isDev = import.meta.env?.DEV ?? false;
