export const COLOR_NAMES = ['Red', 'Orange', 'Yellow', 'Green', 'Cyan', 'Blue', 'Purple', 'Pink'] as const;
export const COLOR_HEX = [0xe53935, 0xfb8c00, 0xfdd835, 0x43a047, 0x00acc1, 0x1e88e5, 0x8e24aa, 0xec407a] as const;
export const COLOR_CSS = COLOR_HEX.map((c) => '#' + c.toString(16).padStart(6, '0'));
export const OUTLINE_HEX = 0x1b2340;
