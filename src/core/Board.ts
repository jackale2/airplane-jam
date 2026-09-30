import { DIR_VEC, type PlaneData } from './types.ts';

export function planeCells(p: PlaneData): [number, number][] {
  const [dx, dy] = DIR_VEC[p.dir];
  return Array.from({ length: p.length }, (_, i) => [p.x - dx * i, p.y - dy * i] as [number, number]);
}

/** Apron grid: which plane (if any) sits in each cell. */
export class Board {
  readonly grid: Int16Array;
  private readonly planes = new Map<number, PlaneData>();
  readonly cols: number;
  readonly rows: number;

  constructor(cols: number, rows: number, planes: readonly PlaneData[] = []) {
    this.cols = cols;
    this.rows = rows;
    this.grid = new Int16Array(cols * rows).fill(-1);
    for (const p of planes) this.add(p);
  }

  inBounds(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.cols && y < this.rows;
  }
  at(x: number, y: number) {
    return this.grid[y * this.cols + x]!;
  }
  has(id: number) {
    return this.planes.has(id);
  }
  get(id: number) {
    return this.planes.get(id);
  }
  get count() {
    return this.planes.size;
  }
  list(): PlaneData[] {
    return [...this.planes.values()];
  }
  ids(): number[] {
    return [...this.planes.keys()];
  }

  /** True if the plane fits in the grid and overlaps nothing. */
  canPlace(p: PlaneData) {
    return planeCells(p).every(([x, y]) => this.inBounds(x, y) && this.at(x, y) === -1);
  }
  add(p: PlaneData) {
    if (!this.canPlace(p)) throw new Error(`plane ${p.id} does not fit`);
    for (const [x, y] of planeCells(p)) this.grid[y * this.cols + x] = p.id;
    this.planes.set(p.id, p);
  }
  remove(id: number) {
    const p = this.planes.get(id);
    if (!p) return;
    for (const [x, y] of planeCells(p)) this.grid[y * this.cols + x] = -1;
    this.planes.delete(id);
  }

  /** Cells between the nose and the grid edge are all empty. */
  pathClear(p: PlaneData) {
    const [dx, dy] = DIR_VEC[p.dir];
    for (let x = p.x + dx, y = p.y + dy; this.inBounds(x, y); x += dx, y += dy) {
      if (this.at(x, y) !== -1) return false;
    }
    return true;
  }
  /** Planes standing in this plane's exit path. */
  blockers(id: number): number[] {
    const p = this.planes.get(id);
    if (!p) return [];
    const [dx, dy] = DIR_VEC[p.dir];
    const out: number[] = [];
    for (let x = p.x + dx, y = p.y + dy; this.inBounds(x, y); x += dx, y += dy) {
      const o = this.at(x, y);
      if (o !== -1 && !out.includes(o)) out.push(o);
    }
    return out;
  }
  canTaxi(id: number) {
    const p = this.planes.get(id);
    return !!p && this.pathClear(p);
  }
  taxi(id: number) {
    if (!this.canTaxi(id)) return false;
    this.remove(id);
    return true;
  }

  clone() {
    const b = new Board(this.cols, this.rows);
    b.grid.set(this.grid);
    for (const [id, p] of this.planes) b.planes.set(id, p);
    return b;
  }
}
