import Phaser from 'phaser';
import { view } from '../config.ts';
import { services } from '../systems/services.ts';
import { canvasTex, rr, type Ctx } from './gfx.ts';
import { text } from './theme.ts';

/** White particle textures (tinted at runtime), made once. */
export function ensureFxTextures(scene: Phaser.Scene) {
  const radial = (ctx: Ctx, cx: number, cy: number, r: number, stops: [number, string][]) => {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    for (const [o, c] of stops) g.addColorStop(o, c);
    ctx.fillStyle = g;
  };
  canvasTex(scene, 'fx_dot', 32, 32, (ctx) => {
    radial(ctx, 16, 16, 16, [[0, 'rgba(255,255,255,1)'], [0.55, 'rgba(255,255,255,0.9)'], [1, 'rgba(255,255,255,0)']]);
    ctx.fillRect(0, 0, 32, 32);
  });
  canvasTex(scene, 'fx_glow', 128, 128, (ctx) => {
    radial(ctx, 64, 64, 64, [[0, 'rgba(255,255,255,0.9)'], [0.4, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']]);
    ctx.fillRect(0, 0, 128, 128);
  });
  canvasTex(scene, 'fx_spark', 48, 48, (ctx) => {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(24, 0);
    ctx.quadraticCurveTo(27, 21, 48, 24);
    ctx.quadraticCurveTo(27, 27, 24, 48);
    ctx.quadraticCurveTo(21, 27, 0, 24);
    ctx.quadraticCurveTo(21, 21, 24, 0);
    ctx.fill();
  });
  canvasTex(scene, 'fx_confetti', 22, 12, (ctx) => {
    ctx.fillStyle = '#FFFFFF';
    rr(ctx, 0, 0, 22, 12, 4);
    ctx.fill();
  });
  canvasTex(scene, 'fx_puff', 64, 64, (ctx) => {
    radial(ctx, 32, 32, 32, [[0, 'rgba(255,255,255,0.95)'], [0.6, 'rgba(255,255,255,0.6)'], [1, 'rgba(255,255,255,0)']]);
    ctx.beginPath();
    ctx.arc(32, 32, 32, 0, Math.PI * 2);
    ctx.fill();
  });
  canvasTex(scene, 'fx_ring', 128, 128, (ctx) => {
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(64, 64, 58, 0, Math.PI * 2);
    ctx.stroke();
  });
  canvasTex(scene, 'fx_shadow', 128, 64, (ctx) => {
    ctx.save();
    ctx.scale(1, 0.5);
    radial(ctx, 64, 64, 64, [[0, 'rgba(0,0,0,0.55)'], [0.6, 'rgba(0,0,0,0.3)'], [1, 'rgba(0,0,0,0)']]);
    ctx.fillRect(0, 0, 128, 128);
    ctx.restore();
  });
}

const k = () => 1 / view.res;

type Emitter = Phaser.GameObjects.Particles.ParticleEmitter;
const pools = new WeakMap<Phaser.Scene, Map<string, Emitter>>();

/** One reusable emitter per effect kind and depth, per scene (cheaper than a new emitter per burst). */
function pooled(scene: Phaser.Scene, key: string, texture: string, depth: number, config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig) {
  let m = pools.get(scene);
  if (!m) {
    m = new Map();
    pools.set(scene, m);
    scene.events.once('shutdown', () => pools.delete(scene));
  }
  let em = m.get(key);
  if (!em || !em.active) {
    em = scene.add.particles(0, 0, texture, { ...config, emitting: false }).setDepth(depth);
    m.set(key, em);
  }
  return em;
}

/**
 * Tint for the next burst: one color, or a list to pick from per particle. (setParticleTint only swaps the
 * value and keeps the op's original single-color mode, so a list would reach the renderer as-is: black.)
 */
function setTint(em: Emitter, tint: number | number[]) {
  em.ops.tint.loadConfig({ tint });
}

/** Sparkle burst, tinted. */
export function sparkle(scene: Phaser.Scene, x: number, y: number, tint: number | number[] = 0xffffff, n = 10, speed = 260) {
  if (services().save.data.settings.reducedMotion) n = Math.ceil(n / 3);
  const sp = speed > 300 ? 380 : speed > 200 ? 260 : 160;
  const em = pooled(scene, `spark_${sp}`, 'fx_spark', 900, {
    speed: { min: sp * 0.4, max: sp },
    scale: { start: 0.9 * k(), end: 0 },
    rotate: { min: 0, max: 180 },
    lifespan: { min: 380, max: 650 },
  });
  setTint(em, tint);
  em.explode(n, x, y);
}

/** Burst of little colored bubbles that float up and pop (boarding). */
export function bubbles(scene: Phaser.Scene, x: number, y: number, color: number, n = 7) {
  if (services().save.data.settings.reducedMotion) n = Math.ceil(n / 3);
  const em = pooled(scene, 'bubbles', 'fx_dot', 58, {
    speed: { min: 90, max: 260 },
    angle: { min: 200, max: 340 },
    gravityY: -120,
    scale: { start: 0.75 * k(), end: 0 },
    alpha: { start: 1, end: 0.2 },
    lifespan: { min: 320, max: 520 },
  });
  setTint(em, [color, 0xffffff, color]);
  em.explode(n, x, y);
}

/** Confetti rain from a point. */
export function confetti(scene: Phaser.Scene, x: number, y: number, colors: number[], n = 70) {
  if (services().save.data.settings.reducedMotion) n = Math.ceil(n / 3);
  const em = pooled(scene, 'confetti', 'fx_confetti', 950, {
    speed: { min: 380, max: 950 },
    angle: { min: 205, max: 335 },
    gravityY: 1100,
    scale: { min: 0.8 * k(), max: 1.4 * k() },
    rotate: { start: 0, end: 540 },
    lifespan: 1900,
  });
  setTint(em, colors);
  em.explode(n, x, y);
}

/** Soft smoke puffs. */
export function puff(scene: Phaser.Scene, x: number, y: number, n = 8, tint = 0xffffff, depth = 54) {
  const em = pooled(scene, `puff_${depth}`, 'fx_puff', depth, {
    speed: { min: 40, max: 150 },
    scale: { start: 0.9 * k(), end: 0.2 * k() },
    alpha: { start: 0.8, end: 0 },
    lifespan: { min: 380, max: 620 },
  });
  setTint(em, tint);
  em.explode(n, x, y);
}

/** Expanding ring (tap feedback). */
export function ring(scene: Phaser.Scene, x: number, y: number, color = 0xffffff, radius = 70, depth = 60) {
  const r = scene.add.image(x, y, 'fx_ring').setTint(color).setDepth(depth).setScale(0.2 * k()).setAlpha(0.9);
  scene.tweens.add({ targets: r, scale: ((radius * 2) / 128) * k(), alpha: 0, duration: 420, ease: 'Quad.Out', onComplete: () => r.destroy() });
}

/** Big friendly text that pops and floats up ("Great!", "+20"). */
export function floatText(scene: Phaser.Scene, x: number, y: number, str: string, size = 64, color = '#FFFFFF', stroke = '#243056', depth = 960) {
  const t = text(scene, x, y, str, size, { color, stroke, strokeW: Math.max(6, size * 0.16), shadow: true }).setDepth(depth).setScale(0.4);
  scene.tweens.add({ targets: t, scale: 1, duration: 260, ease: 'Back.Out' });
  scene.tweens.add({ targets: t, y: y - 110, alpha: 0, delay: 650, duration: 520, ease: 'Quad.In', onComplete: () => t.destroy() });
  return t;
}

/** A looping tween that removes itself when its (first) target is destroyed, so long Zen sessions never leak tweens. */
export function forever(scene: Phaser.Scene, cfg: Phaser.Types.Tweens.TweenBuilderConfig) {
  const tw = scene.tweens.add({ ...cfg, repeat: -1 });
  const t = (Array.isArray(cfg.targets) ? cfg.targets[0] : cfg.targets) as Phaser.GameObjects.GameObject | undefined;
  t?.once?.(Phaser.GameObjects.Events.DESTROY, () => tw.remove());
  return tw;
}
