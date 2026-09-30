export type Dir = 'up' | 'down' | 'left' | 'right';
export type QueueShape = 'loop' | 'star' | 'heart' | 'spiral';

export interface PlaneData {
  id: number;
  color: number; // 0 to 7
  length: 2 | 3 | 4;
  x: number; // nose cell
  y: number;
  dir: Dir; // body extends opposite to dir
}

export interface LevelData {
  id: number;
  seed: number;
  cols: number;
  rows: number;
  gateSlots: number;
  planes: PlaneData[];
  queue: number[]; // color index per passenger, head first
  queueShape: QueueShape;
  parMinSlots: number; // fewest gate slots that still allow a win
}

export type GameEvent =
  | { type: 'PLANE_TAXI'; plane: number; gate: number }
  | { type: 'PLANE_BUMP'; plane: number }
  | { type: 'PLANE_PARKED'; plane: number; gate: number }
  | { type: 'PASSENGER_BOARDED'; plane: number; gate: number; color: number; seat: number; queueIndex: number }
  | { type: 'PLANE_DEPARTED'; plane: number; gate: number }
  | { type: 'LEVEL_WON' }
  | { type: 'LEVEL_FAILED' };

export const DIR_VEC: Record<Dir, readonly [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};
