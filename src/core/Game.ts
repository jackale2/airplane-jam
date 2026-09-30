import { TUNING } from '../data/tuning.ts';
import { Board } from './Board.ts';
import type { GameEvent, LevelData, PlaneData } from './types.ts';

export type Status = 'playing' | 'won' | 'failed';

/** Full rules, no Phaser. `tap` returns the events the scene should play in order. */
export class Game {
  status: Status = 'playing';

  readonly level: LevelData;
  board: Board;
  gate: (number | null)[];
  queue: number[];
  queueIdx: number;
  readonly filled: Map<number, number>;

  private constructor(level: LevelData, board: Board, gate: (number | null)[], queue: number[], queueIdx: number, filled: Map<number, number>) {
    this.level = level;
    this.board = board;
    this.gate = gate;
    this.queue = queue;
    this.queueIdx = queueIdx;
    this.filled = filled;
  }

  static create(level: LevelData) {
    return new Game(level, new Board(level.cols, level.rows, level.planes), Array(level.gateSlots).fill(null), [...level.queue], 0, new Map());
  }

  clone() {
    const g = new Game(this.level, this.board.clone(), [...this.gate], this.queue, this.queueIdx, new Map(this.filled));
    g.status = this.status;
    return g;
  }

  /** Seats in a plane, from the tuning table. */
  static capacity(p: Pick<PlaneData, 'length'>) {
    return TUNING.seatsPerCell * p.length;
  }

  /** Static plane data by id (color and length never change, position may after a shuffle). */
  planeInfo(id: number): PlaneData {
    return this.level.planes.find((p) => p.id === id)!;
  }

  get head(): number | undefined {
    return this.queue[this.queueIdx];
  }
  get freeSlot() {
    return this.gate.indexOf(null);
  }
  hasLegalMove() {
    return this.freeSlot !== -1 && this.board.ids().some((id) => this.board.canTaxi(id));
  }

  tap(id: number): GameEvent[] {
    if (this.status !== 'playing' || !this.board.has(id)) return [];
    const slot = this.freeSlot;
    if (slot === -1 || !this.board.canTaxi(id)) return [{ type: 'PLANE_BUMP', plane: id }];
    this.board.taxi(id);
    this.gate[slot] = id;
    this.filled.set(id, 0);
    const ev: GameEvent[] = [
      { type: 'PLANE_TAXI', plane: id, gate: slot },
      { type: 'PLANE_PARKED', plane: id, gate: slot },
    ];
    this.settle(ev);
    this.finish(ev);
    return ev;
  }

  /** Boarding, run to a fixed point: only the queue head boards, leftmost matching gate first. */
  private settle(ev: GameEvent[]) {
    for (;;) {
      const color = this.head;
      if (color === undefined) return;
      const slot = this.gate.findIndex((pid) => pid !== null && this.planeInfo(pid).color === color && this.filled.get(pid)! < Game.capacity(this.planeInfo(pid)));
      if (slot === -1) return;
      const pid = this.gate[slot]!;
      const seat = this.filled.get(pid)!;
      this.filled.set(pid, seat + 1);
      ev.push({ type: 'PASSENGER_BOARDED', plane: pid, gate: slot, color, seat, queueIndex: this.queueIdx });
      this.queueIdx++;
      if (seat + 1 === Game.capacity(this.planeInfo(pid))) {
        this.gate[slot] = null;
        ev.push({ type: 'PLANE_DEPARTED', plane: pid, gate: slot });
      }
    }
  }

  private finish(ev: GameEvent[]) {
    if (this.board.count === 0 && this.queueIdx >= this.queue.length && this.gate.every((g) => g === null)) {
      this.status = 'won';
      ev.push({ type: 'LEVEL_WON' });
    } else if (!this.hasLegalMove()) {
      this.status = 'failed';
      ev.push({ type: 'LEVEL_FAILED' });
    }
  }

  /** Extra Gate booster, also used by Revive. Returns the new slot index. */
  addGate() {
    this.gate.push(null);
    if (this.status === 'failed') this.status = 'playing';
    return this.gate.length - 1;
  }

  /** Sort Queue booster: group the next `n` passengers by color, in order of first appearance. */
  sortQueue(n: number = TUNING.sortQueueCount) {
    const seg = this.queue.slice(this.queueIdx, this.queueIdx + n);
    const order = [...new Set(seg)];
    const sorted = order.flatMap((c) => seg.filter((x) => x === c));
    this.queue = [...this.queue.slice(0, this.queueIdx), ...sorted, ...this.queue.slice(this.queueIdx + n)];
    return sorted.some((c, i) => c !== seg[i]);
  }

  /** Shuffle Board booster: replace apron planes with a new layout (same ids, colors, lengths). */
  relayout(planes: PlaneData[]) {
    this.board = new Board(this.level.cols, this.level.rows, planes);
  }
}
