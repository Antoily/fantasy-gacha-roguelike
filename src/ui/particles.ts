import Phaser from 'phaser';
import { mulberry32, type Rng } from '../logic/rng';
import { COLORS, STROKE } from './theme';

// Particules de la révélation, dessinées à la main dans un seul Graphics redessiné à
// chaque image. Pas d'émetteur Phaser : ses plages aléatoires lisent Math.random et
// décaleraient le hasard scripté de l'e2e (leçon 004). Le hasard d'ici vient d'un
// générateur à graine propre : purement décoratif, il ne touche jamais au tirage.

export type Shape = 'dot' | 'spark' | 'confetti' | 'star';

type Range = readonly [number, number];

export interface BurstConfig {
  readonly x: number;
  readonly y: number;
  readonly count: number;
  readonly colors: readonly number[];
  readonly shapes: readonly Shape[];
  // Vitesse initiale (px/s), taille (rayon, px), durée de vie (ms).
  readonly speed: Range;
  readonly size: Range;
  readonly life: Range;
  // Direction (radians) ; tout le cercle par défaut.
  readonly angle?: Range;
  // Écart au point de départ : les particules naissent sur un anneau de ce rayon.
  readonly spawnRadius?: Range;
  // Gravité (px/s²) et freinage (part de vitesse perdue par seconde).
  readonly gravity?: number;
  readonly drag?: number;
}

// Convergence : les particules naissent sur un anneau et rejoignent le centre en
// accélérant (aspiration de l'énergie pendant le suspense).
export interface ConvergeConfig {
  readonly x: number;
  readonly y: number;
  readonly colors: readonly number[];
  readonly shapes: readonly Shape[];
  readonly radius: Range;
  readonly size: Range;
  readonly life: Range;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  readonly size: number;
  readonly color: number;
  readonly shape: Shape;
  rot: number;
  readonly spin: number;
  readonly gravity: number;
  readonly drag: number;
  // Convergence : départ et arrivée, la position suit une courbe plutôt que la vitesse.
  readonly home?: { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number };
}

interface Stream {
  readonly spawn: () => void;
  // Particules par seconde au début et à la fin du flux.
  readonly from: number;
  readonly to: number;
  readonly duration: number;
  elapsed: number;
  debt: number;
}

const V = Phaser.Math.Vector2;

export class Particles {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly rng: Rng;
  private readonly parts: Particle[] = [];
  private readonly streams: Stream[] = [];

  constructor(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, seed = 1) {
    this.rng = mulberry32(seed);
    this.g = scene.add.graphics();
    parent.add(this.g);
    const tick = (_time: number, delta: number) => this.step(delta);
    scene.events.on(Phaser.Scenes.Events.UPDATE, tick);
    // La fenêtre détruite emporte le Graphics : on se désabonne avec lui.
    this.g.once(Phaser.GameObjects.Events.DESTROY, () => scene.events.off(Phaser.Scenes.Events.UPDATE, tick));
  }

  get graphics(): Phaser.GameObjects.Graphics {
    return this.g;
  }

  burst(c: BurstConfig) {
    const [a0, a1] = c.angle ?? [0, 2 * Math.PI];
    for (let i = 0; i < c.count; i++) {
      const a = this.between(a0, a1);
      const r = c.spawnRadius ? this.between(...c.spawnRadius) : 0;
      const speed = this.between(...c.speed);
      this.parts.push({
        x: c.x + r * Math.cos(a),
        y: c.y + r * Math.sin(a),
        vx: speed * Math.cos(a),
        vy: speed * Math.sin(a),
        age: 0,
        life: this.between(...c.life),
        size: this.between(...c.size),
        color: this.pick(c.colors),
        shape: this.pick(c.shapes),
        rot: this.between(0, Math.PI),
        spin: this.between(-8, 8),
        gravity: c.gravity ?? 0,
        drag: c.drag ?? 0,
      });
    }
  }

  converge(c: ConvergeConfig, count: number) {
    for (let i = 0; i < count; i++) {
      const a = this.between(0, 2 * Math.PI);
      const r = this.between(...c.radius);
      const x0 = c.x + r * Math.cos(a);
      const y0 = c.y + r * Math.sin(a);
      this.parts.push({
        x: x0, y: y0, vx: 0, vy: 0, age: 0,
        life: this.between(...c.life),
        size: this.between(...c.size),
        color: this.pick(c.colors),
        shape: this.pick(c.shapes),
        rot: a, spin: 0, gravity: 0, drag: 0,
        home: { x0, y0, x1: c.x, y1: c.y },
      });
    }
  }

  // Flux continu : `spawn` est appelé au rythme qui passe de `from` à `to` particules
  // par seconde en `duration` ms (Infinity : jusqu'à la destruction).
  stream(spawn: () => void, from: number, to: number, duration: number) {
    this.streams.push({ spawn, from, to, duration, elapsed: 0, debt: 0 });
  }

  // Arrête les flux ; les particules déjà lancées finissent leur vie.
  stopStreams() {
    this.streams.length = 0;
  }

  // Éteint en `ms` les particules déjà lancées (un leurre qui retombe ne doit pas
  // laisser pleuvoir les confettis du faux palier).
  fadeAll(ms: number) {
    this.streams.length = 0;
    for (const p of this.parts) p.life = Math.min(p.life, p.age + ms);
  }

  clear() {
    this.streams.length = 0;
    this.parts.length = 0;
    this.g.clear();
  }

  // Valeur décorative, pour varier un effet sans toucher Math.random.
  between(lo: number, hi: number): number {
    return lo + (hi - lo) * this.rng();
  }

  private pick<T>(list: readonly T[]): T {
    return list[Math.floor(this.rng() * list.length)]!;
  }

  private step(deltaMs: number) {
    // Un onglet en arrière-plan rend un énorme delta : on le borne pour ne pas téléporter.
    const dt = Math.min(deltaMs, 50) / 1000;
    for (let i = this.streams.length - 1; i >= 0; i--) {
      const s = this.streams[i]!;
      const k = Number.isFinite(s.duration) ? Math.min(1, s.elapsed / s.duration) : 0;
      s.debt += (s.from + (s.to - s.from) * k) * dt;
      for (; s.debt >= 1; s.debt--) s.spawn();
      s.elapsed += deltaMs;
      if (s.elapsed >= s.duration) this.streams.splice(i, 1);
    }
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i]!;
      p.age += deltaMs;
      if (p.age >= p.life) {
        this.parts.splice(i, 1);
        continue;
      }
      if (p.home) {
        const t = p.age / p.life;
        const e = t * t * t;
        p.x = p.home.x0 + (p.home.x1 - p.home.x0) * e;
        p.y = p.home.y0 + (p.home.y1 - p.home.y0) * e;
        continue;
      }
      const keep = Math.max(0, 1 - p.drag * dt);
      p.vx *= keep;
      p.vy = p.vy * keep + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
    }
    this.draw();
  }

  private draw() {
    const g = this.g.clear();
    for (const p of this.parts) {
      const t = p.age / p.life;
      // Convergence : apparaît puis reste pleine ; le reste s'efface sur le dernier tiers.
      const alpha = p.home ? Math.min(1, t * 4) : Math.min(1, (1 - t) * 3);
      const s = p.home ? p.size * (1 - 0.6 * t) : p.size * (1 - 0.4 * t);
      switch (p.shape) {
        case 'dot':
          g.fillStyle(p.color, alpha).fillCircle(p.x, p.y, s);
          break;
        case 'spark': {
          // Traînée dans le sens du mouvement : donne la vitesse à l'œil.
          const tail = p.home
            ? { x: p.x - (p.home.x1 - p.home.x0) * 0.08, y: p.y - (p.home.y1 - p.home.y0) * 0.08 }
            : { x: p.x - p.vx * 0.04, y: p.y - p.vy * 0.04 };
          g.lineStyle(s, p.color, alpha).lineBetween(tail.x, tail.y, p.x, p.y);
          break;
        }
        case 'confetti': {
          const c = Math.cos(p.rot);
          const sn = Math.sin(p.rot);
          // Le confetti tourne sur lui-même : sa largeur apparente oscille.
          const w = s * Math.abs(Math.cos(p.rot * 1.7));
          const h = s * 0.6;
          const pts = [[-w, -h], [w, -h], [w, h], [-w, h]]
            .map(([dx, dy]) => new V(p.x + dx! * c - dy! * sn, p.y + dx! * sn + dy! * c));
          g.fillStyle(p.color, alpha).fillPoints(pts, true);
          g.lineStyle(1, COLORS.ink, alpha).strokePoints(pts, true);
          break;
        }
        case 'star': {
          // Étincelle à quatre branches, cernée comme le reste de la DA BD.
          const pts: Phaser.Math.Vector2[] = [];
          for (let k = 0; k < 8; k++) {
            const r = k % 2 === 0 ? s : s * 0.35;
            const a = p.rot + (k * Math.PI) / 4;
            pts.push(new V(p.x + r * Math.cos(a), p.y + r * Math.sin(a)));
          }
          g.fillStyle(p.color, alpha).fillPoints(pts, true);
          if (s >= 4) g.lineStyle(STROKE.thin / 2, COLORS.ink, alpha).strokePoints(pts, true);
          break;
        }
      }
    }
  }
}
