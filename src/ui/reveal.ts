import Phaser from 'phaser';
import { RARITIES, type Rarity } from '../data/gachaConfig';
import { REVEAL_TIMING } from '../data/revealConfig';
import type { PullResult } from '../logic/gacha';
import type { FlipSchedule, RevealKind, RevealPlan } from '../logic/reveal';
import { flipCues, revealCues, type Cue } from '../logic/soundCues';
import { GACHA, HEIGHT, REVEAL, WIDTH, resultCardRect, type Rect } from './layout';
import { Particles, type Shape } from './particles';
import { COLORS, CSS, FONT_SIZE, RADIUS, REVEAL_FX, STROKE } from './theme';
import { makeOrb, textStyle } from './widgets';

// Minuteries et tweens d'une mise en scène, gardés pour tout arrêter d'un coup quand
// le joueur passe (FR-006) : sans ça, un rappel en retard rouvrirait une fenêtre.
export class Sequence {
  private readonly timers: Phaser.Time.TimerEvent[] = [];
  private readonly tweens: Phaser.Tweens.Tween[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  at(ms: number, fn: () => void) {
    this.timers.push(this.scene.time.delayedCall(ms, fn));
  }

  tween(config: Phaser.Types.Tweens.TweenBuilderConfig): Phaser.Tweens.Tween {
    const t = this.scene.tweens.add(config);
    this.tweens.push(t);
    return t;
  }

  stop() {
    this.timers.forEach(t => t.remove(false));
    this.tweens.forEach(t => t.stop());
    this.timers.length = 0;
    this.tweens.length = 0;
  }
}

const rankOf = (rarity: Rarity) => RARITIES.find(r => r.id === rarity)!.rank;
const labelOf = (rarity: Rarity) => RARITIES.find(r => r.id === rarity)!.label;

// Formes des particules par rang : des points pour le bas, des étoiles dès Rare, des
// confettis dès Légendaire (FR-004 : plus le palier est haut, plus c'est marqué).
const SHAPES: readonly (readonly Shape[])[] = [
  ['dot'],
  ['dot', 'spark'],
  ['spark', 'star', 'dot'],
  ['confetti', 'star', 'spark'],
  ['confetti', 'confetti', 'star', 'spark'],
];

// Couleurs d'un éclat : la rareté et son or ; l'Ultra rare prend tout l'arc-en-ciel.
const colorsOf = (rarity: Rarity): number[] =>
  rarity === 'ultra' ? Object.values(COLORS.rarity) : [COLORS.rarity[rarity], COLORS.rarity[rarity], REVEAL_FX.sparkle];

// Pluie d'étoiles et de confettis sur tout l'écran (Légendaire et Ultra rare).
function rain(particles: Particles, rarity: Rarity, duration: number, perSecond: number) {
  const colors = colorsOf(rarity);
  particles.stream(() => particles.burst({
    x: particles.between(0, WIDTH), y: -10, count: 1, colors, shapes: ['star', 'confetti'],
    speed: [40, 110], angle: [Math.PI / 2 - 0.35, Math.PI / 2 + 0.35], size: [3, 6], life: [1400, 2200],
    gravity: 140, drag: 0.4,
  }), perSecond, perSecond / 3, duration);
}

// Onde de choc rectangulaire autour d'une carte.
function cardWave(scene: Phaser.Scene, seq: Sequence, parent: Phaser.GameObjects.Container, r: Rect, color: number) {
  const wave = scene.add.graphics().setPosition(r.x + r.w / 2, r.y + r.h / 2);
  wave.lineStyle(STROKE.thick, color, REVEAL_FX.waveAlpha).strokeRoundedRect(-r.w / 2, -r.h / 2, r.w, r.h, RADIUS);
  parent.add(wave);
  seq.tween({ targets: wave, scale: 1.3, alpha: 0, duration: 450, ease: 'Cubic.easeOut', onComplete: () => wave.destroy() });
}

// Éclat d'une carte qui vient d'apparaître, selon sa rareté.
function cardBurst(particles: Particles, r: Rect, rarity: Rarity, boost = 1) {
  const k = rankOf(rarity);
  particles.burst({
    x: r.x + r.w / 2, y: r.y + r.h / 2, count: Math.round(REVEAL.cardBurst[k]! * boost),
    colors: k === 0 ? [COLORS.rarity.common] : colorsOf(rarity), shapes: SHAPES[k]!,
    speed: [60, 120 + 50 * k * boost], size: [2.5, 4 + k], life: [350, 600 + 120 * k],
    spawnRadius: [10, r.h / 2], gravity: k >= 2 ? 220 : 40, drag: 1.5,
  });
}

// Scintillement continu autour des cartes Légendaire et Ultra rare, tant que la fenêtre
// de résultats reste ouverte : la belle prise se repère d'un coup d'œil.
export function sparkleBest(
  particles: Particles, cards: readonly { readonly r: Rect; readonly rarity: Rarity }[],
) {
  for (const { r, rarity } of cards) {
    if (rankOf(rarity) < 3) continue;
    const colors = colorsOf(rarity);
    particles.stream(() => {
      // Un point au hasard sur le bord de la carte.
      const p = particles.between(0, 2 * (r.w + r.h));
      const x = p < r.w ? r.x + p : p < r.w + r.h ? r.x + r.w : p < 2 * r.w + r.h ? r.x + 2 * r.w + r.h - p : r.x;
      const y = p < r.w ? r.y : p < r.w + r.h ? r.y + p - r.w : p < 2 * r.w + r.h ? r.y + r.h : r.y + 2 * (r.w + r.h) - p;
      particles.burst({ x, y, count: 1, colors, shapes: ['star'], speed: [5, 20], size: [3, 6], life: [500, 900] });
    }, 6, 6, Infinity);
  }
}

// Carte du ×1 : elle surgit avec l'éclat de sa rareté.
export function celebrateSingle(
  scene: Phaser.Scene, modal: Phaser.GameObjects.Container, card: Phaser.GameObjects.Container, r: Rect, rarity: Rarity,
) {
  const k = rankOf(rarity);
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const pivot = scene.add.container(cx, cy);
  modal.remove(card);
  card.setPosition(-cx, -cy);
  pivot.add(card).setScale(0.7);
  modal.add(pivot);
  const particles = new Particles(scene, modal, 3);
  const seq = new Sequence(scene);
  seq.tween({ targets: pivot, scale: 1, duration: 260 + 40 * k, ease: 'Back.easeOut' });
  cardBurst(particles, r, rarity, 1.5);
  if (k >= 2) cardWave(scene, seq, modal, r, COLORS.rarity[rarity]);
  sparkleBest(particles, [{ r, rarity }]);
  return pivot;
}

// Joue un déroulé calculé par la logique (src/logic/reveal.ts) : la scène ne décide de
// rien, elle montre `plan.steps` dans l'ordre aux instants de REVEAL_TIMING, puis
// appelle onDone. Les sons (005) suivent le même calendrier, sur les mêmes minuteries :
// passer l'animation annule aussi ceux qui restaient à jouer. Aucun hasard ici : `Phaser.Math.Between` lirait Math.random et
// décalerait le hasard scripté de l'e2e (research R6).
export function playReveal(
  scene: Phaser.Scene,
  modal: Phaser.GameObjects.Container,
  plan: RevealPlan,
  onCue: (cue: Cue) => void,
  onDone: () => void,
): Sequence {
  const seq = new Sequence(scene);
  const { x, y } = REVEAL.center;
  const t = REVEAL_TIMING;

  const fx = scene.add.container(x, y);
  const orb = makeOrb(scene, GACHA.orb.r).setPosition(GACHA.orb.x, GACHA.orb.y);
  // Cœur coloré posé sur l'orbe à la révélation : la couleur du palier en aplat.
  const core = scene.add.graphics();
  const mark = scene.add.text(0, 0, '!', textStyle(FONT_SIZE.title * 1.6)).setOrigin(0.5).setVisible(false);
  orb.add([core, mark]);
  const flash = scene.add.rectangle(0, 0, WIDTH, HEIGHT, COLORS.panel, 1).setOrigin(0).setAlpha(0);
  const label = scene.add.text(x, REVEAL.labelY, '', { ...textStyle(FONT_SIZE.title), stroke: CSS.outline, strokeThickness: 6 })
    .setOrigin(0.5).setAlpha(0);
  const hint = scene.add.text(x, REVEAL.hintY, 'Touche pour passer', textStyle(FONT_SIZE.small, CSS.textFaint))
    .setOrigin(0.5);
  modal.add([fx, orb, flash]);
  const particles = new Particles(scene, modal, 1);
  modal.add([label, hint]);
  // Halo qui bat autour de l'orbe, de plus en plus vite : le cœur du joueur.
  const halo = scene.add.graphics().setPosition(x, y).setAlpha(0);
  halo.lineStyle(STROKE.thick, REVEAL_FX.heartbeat, 1).strokeCircle(0, 0, GACHA.orb.r * REVEAL.orbScale + 6);
  modal.addAt(halo, modal.getIndex(orb));

  // Suspense, identique pour tous les paliers (FR-002) : l'orbe gagne le centre, grossit,
  // aspire de l'énergie et tremble de plus en plus ; un halo bat de plus en plus vite.
  seq.tween({ targets: orb, x, y, scale: REVEAL.orbScale, duration: 400, ease: 'Cubic.easeOut' });
  let shake = seq.tween({
    targets: orb, angle: { from: -3, to: 3 }, duration: 70, yoyo: true, repeat: -1, delay: 400,
  });
  seq.at(Math.round(t.suspense * 0.7), () => {
    shake.stop();
    shake = seq.tween({ targets: orb, angle: { from: -7, to: 7 }, duration: 45, yoyo: true, repeat: -1 });
  });
  const charge = {
    x, y, colors: REVEAL_FX.charge, shapes: ['spark', 'dot'] as Shape[],
    radius: [110, 200] as const, size: [2, 4] as const, life: [280, 420] as const,
  };
  seq.at(150, () => particles.stream(() => particles.converge(charge, 1), 20, 110, t.suspense - 350));
  for (const beat of [0.4, 0.62, 0.78, 0.9]) {
    seq.at(Math.round(t.suspense * beat), () => {
      halo.setScale(1).setAlpha(REVEAL_FX.heartbeatAlpha);
      seq.tween({ targets: halo, scale: 1.3, alpha: 0, duration: 220, ease: 'Quad.easeOut' });
    });
  }

  const burst = (rarity: Rarity, last: boolean) => {
    const k = rankOf(rarity);
    const color = COLORS.rarity[rarity];
    // Une transition encore en cours (leurre qui se dégonfle) écraserait ce palier.
    scene.tweens.killTweensOf([fx, orb, ...fx.list]);
    fx.removeAll(true);
    fx.setScale(1).setAlpha(1).setAngle(0).setPosition(x, y);
    orb.setScale(REVEAL.orbScale).setAngle(0).setPosition(x, y);

    core.clear();
    core.fillStyle(color, 1).fillCircle(0, 0, GACHA.orb.r);
    core.lineStyle(STROKE.thick, COLORS.ink, 1).strokeCircle(0, 0, GACHA.orb.r);
    mark.setVisible(true);
    seq.tween({
      targets: orb, scale: REVEAL.orbScale * REVEAL.pulse[k]!, duration: 180, yoyo: true, ease: 'Quad.easeOut',
    });

    // Rayons : plus nombreux et plus longs avec le rang (FR-004).
    const rays = scene.add.graphics();
    const n = REVEAL.rays[k]!;
    const len = REVEAL.rayLength[k]!;
    const spread = (Math.PI / n) * 0.45;
    const V = Phaser.Math.Vector2;
    for (let j = 0; j < n; j++) {
      const a = (2 * Math.PI * j) / n;
      const pts = [new V(0, 0),
        new V(len * Math.cos(a - spread), len * Math.sin(a - spread)),
        new V(len * Math.cos(a + spread), len * Math.sin(a + spread))];
      rays.fillStyle(color, REVEAL_FX.rayAlpha).fillPoints(pts, true);
      rays.lineStyle(STROKE.thin, COLORS.ink, 1).strokePoints(pts, true);
    }
    rays.setScale(0);
    fx.add(rays);
    seq.tween({ targets: rays, scale: 1, duration: 260, ease: 'Back.easeOut' });
    seq.tween({ targets: rays, angle: 20 + 10 * k, duration: 2000, ease: 'Linear' });

    // Onde de choc ; double à partir de Légendaire.
    const waves = k >= 3 ? 2 : 1;
    for (let w = 0; w < waves; w++) {
      const wave = scene.add.graphics();
      wave.lineStyle(STROKE.thick + k, color, REVEAL_FX.waveAlpha).strokeCircle(0, 0, REVEAL.wave[k]!);
      wave.setScale(0.3);
      fx.add(wave);
      seq.tween({ targets: wave, scale: 1, alpha: 0, duration: 650, delay: w * 250, ease: 'Cubic.easeOut' });
    }

    // Explosion de particules : nombre, vitesse et formes montent avec le rang. Une
    // fausse piste explose comme un vrai palier : elle doit y faire croire.
    particles.stopStreams();
    const speed = REVEAL.burstSpeed[k]!;
    particles.burst({
      x, y, count: REVEAL.burst[k]!, colors: k === 0 ? [color] : colorsOf(rarity), shapes: SHAPES[k]!,
      speed: [speed * 0.3, speed], size: [3, 5 + 1.5 * k], life: [500, 900 + 180 * k],
      spawnRadius: [GACHA.orb.r * 0.6, GACHA.orb.r * REVEAL.orbScale], gravity: k >= 2 ? 260 : 60, drag: 1.1,
    });

    // Éclair plein écran, secousse et pluie d'étoiles pour les deux plus hauts paliers.
    if (k >= 3) {
      flash.setFillStyle(color, 1);
      seq.tween({ targets: flash, alpha: { from: 0, to: REVEAL_FX.flashAlpha }, duration: 140, yoyo: true });
      seq.tween({ targets: [fx, orb], x: x + 2 * k, duration: 40, yoyo: true, repeat: 3, ease: 'Sine.easeInOut' });
      rain(particles, rarity, t.final[rarity], k === 4 ? 45 : 25);
    }

    // Le nom de la rareté n'apparaît qu'au vrai palier : une fausse piste reste muette.
    if (last) {
      label.setText(`${labelOf(rarity)}\u00a0!`).setScale(0.6);
      seq.tween({ targets: label, alpha: 1, scale: 1, duration: 300, ease: 'Back.easeOut' });
    }
  };

  const transition = (kind: RevealKind) => {
    particles.stopStreams();
    if (kind === 'rise') {
      // Montée : l'orbe se fend dans un éclair blanc et crache des étincelles.
      particles.burst({
        x, y, count: 30, colors: [REVEAL_FX.sparkle, ...REVEAL_FX.charge], shapes: ['spark'],
        speed: [250, 480], size: [2, 4], life: [220, 420], drag: 2,
      });
      flash.setFillStyle(COLORS.panel, 1);
      seq.tween({ targets: flash, alpha: { from: 0, to: 0.9 }, duration: t.transition / 2, yoyo: true });
      seq.tween({ targets: orb, angle: { from: -12, to: 12 }, duration: 50, yoyo: true, repeat: 2 });
    } else {
      // Leurre : l'effet se dégonfle, l'orbe retombe et l'énergie s'éteint en tombant.
      particles.fadeAll(t.transition);
      particles.burst({
        x, y, count: 24, colors: [REVEAL_FX.fizzle], shapes: ['dot'], speed: [20, 90],
        angle: [0, Math.PI], spawnRadius: [10, GACHA.orb.r], size: [2, 4], life: [500, 800], gravity: 420,
      });
      seq.tween({ targets: fx, scale: 0.2, alpha: 0, duration: t.transition, ease: 'Cubic.easeIn' });
      seq.tween({ targets: orb, scale: REVEAL.orbScale * 0.8, duration: t.transition, ease: 'Cubic.easeIn' });
    }
  };

  let time = t.suspense;
  plan.steps.forEach((rarity, i) => {
    const last = i === plan.steps.length - 1;
    seq.at(time, () => {
      shake.stop();
      halo.setAlpha(0);
      burst(rarity, last);
    });
    if (last) {
      time += t.final[rarity];
    } else {
      seq.at(time + t.fakeStep, () => transition(plan.kind));
      time += t.fakeStep + t.transition;
    }
  });
  seq.at(time, onDone);
  revealCues(plan).forEach(c => seq.at(c.at, () => onCue(c.cue)));
  return seq;
}

// Carte du ×10 montée sur un pivot centré, pour se retourner autour de son milieu.
interface FlipCard {
  readonly r: Rect;
  readonly rarity: Rarity;
  readonly pivot: Phaser.GameObjects.Container;
  readonly face: Phaser.GameObjects.Container;
  readonly back: readonly (Phaser.GameObjects.Graphics | Phaser.GameObjects.Text)[];
  // Lueur de la rareté autour du dos, pendant l'anticipation.
  readonly glow: Phaser.GameObjects.Graphics;
}

function makeFlipCard(
  scene: Phaser.Scene, modal: Phaser.GameObjects.Container, r: Rect, face: Phaser.GameObjects.Container, rarity: Rarity,
): FlipCard {
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const pivot = scene.add.container(cx, cy);
  face.setPosition(-cx, -cy).setVisible(false);
  const glow = scene.add.graphics().setAlpha(0);
  const pad = REVEAL_FX.glowStroke / 2;
  glow.lineStyle(REVEAL_FX.glowStroke, COLORS.rarity[rarity], 1)
    .strokeRoundedRect(-r.w / 2 - pad, -r.h / 2 - pad, r.w + 2 * pad, r.h + 2 * pad, RADIUS + pad);
  const g = scene.add.graphics();
  g.fillStyle(REVEAL_FX.cardBack, 1).fillRoundedRect(-r.w / 2, -r.h / 2, r.w, r.h, RADIUS);
  g.lineStyle(STROKE.base, COLORS.ink, 1).strokeRoundedRect(-r.w / 2, -r.h / 2, r.w, r.h, RADIUS);
  const mark = scene.add.text(0, 0, '?', textStyle(FONT_SIZE.title)).setOrigin(0.5);
  pivot.add([glow, face, g, mark]);
  modal.add(pivot);
  return { r, rarity, pivot, face, back: [g, mark], glow };
}

// Retournement du ×10, une carte à la fois, au calendrier de la logique
// (flipSchedule) : une carte rare tremble et s'allume avant de tourner, la vedette bat
// comme un cœur pendant que les autres s'assombrissent. `finish` retourne tout d'un
// coup (appui du joueur) ; onDone est appelé une seule fois, à la fin ou à l'appui.
export function playFlip(
  scene: Phaser.Scene,
  modal: Phaser.GameObjects.Container,
  faces: readonly Phaser.GameObjects.Container[],
  results: readonly PullResult[],
  schedule: FlipSchedule,
  onCue: (cue: Cue) => void,
  onDone: (tapped: boolean) => void,
): { seq: Sequence; finish: (tapped: boolean) => void } {
  const cards = faces.map((face, i) => makeFlipCard(scene, modal, resultCardRect(i), face, results[i]!.item.rarity));
  const particles = new Particles(scene, modal, 2);
  const seq = new Sequence(scene);
  const starStep = schedule.steps[schedule.steps.length - 1]!;
  const star = cards[starStep.index]!;

  const show = (c: FlipCard) => {
    c.back.forEach(o => o.setVisible(false));
    c.glow.setAlpha(0);
    c.face.setVisible(true);
  };
  // Liseré de la couleur de la vedette, posé sous la carte (FR-008).
  let highlighted = false;
  const highlight = () => {
    if (highlighted) return;
    highlighted = true;
    const r = star.r;
    const g = scene.add.graphics();
    const pad = REVEAL_FX.starStroke / 2;
    g.lineStyle(REVEAL_FX.starStroke, COLORS.rarity[star.rarity], 1)
      .strokeRoundedRect(-r.w / 2 - pad, -r.h / 2 - pad, r.w + 2 * pad, r.h + 2 * pad, RADIUS + pad);
    star.pivot.addAt(g, 0);
  };

  // Anticipation : le dos tremble et la lueur de la rareté pulse ; l'énergie converge.
  const anticipate = (c: FlipCard, ms: number) => {
    const k = rankOf(c.rarity);
    seq.tween({ targets: c.glow, alpha: { from: 0.3, to: 1 }, duration: 120, yoyo: true, repeat: -1 });
    seq.tween({ targets: c.pivot, angle: { from: -1.5 * k, to: 1.5 * k }, duration: 50, yoyo: true, repeat: -1 });
    const { x, y } = { x: c.r.x + c.r.w / 2, y: c.r.y + c.r.h / 2 };
    particles.stream(() => particles.converge({
      x, y, colors: colorsOf(c.rarity), shapes: ['spark', 'dot'], radius: [60, 110], size: [2, 3], life: [200, 300],
    }, 1), 15 + 10 * k, 30 + 15 * k, Math.max(0, ms - 200));
  };

  // Vedette : les cartes déjà vues s'assombrissent, puis son dos bat comme un cœur.
  const heartbeat = (c: FlipCard, ms: number) => {
    const k = rankOf(c.rarity);
    cards.filter(o => o !== c).forEach(o =>
      seq.tween({ targets: o.pivot, alpha: REVEAL_FX.dimAlpha, duration: 250, ease: 'Quad.easeOut' }));
    modal.bringToTop(c.pivot);
    modal.bringToTop(particles.graphics);
    seq.tween({ targets: c.glow, alpha: 1, duration: ms * 0.3 });
    const beats = k >= 3 ? 3 : 2;
    const beat = ms / beats;
    for (let b = 0; b < beats; b++) {
      seq.at(b * beat, () => seq.tween({
        targets: c.pivot, scale: 1.08 + 0.02 * k, duration: beat * 0.3, yoyo: true, ease: 'Quad.easeOut',
      }));
    }
    const { x, y } = { x: c.r.x + c.r.w / 2, y: c.r.y + c.r.h / 2 };
    particles.stream(() => particles.converge({
      x, y, colors: colorsOf(c.rarity), shapes: ['spark', 'dot'], radius: [80, 150], size: [2, 4], life: [250, 380],
    }, 1), 20 + 10 * k, 60 + 20 * k, Math.max(0, ms - 300));
  };

  const turn = (c: FlipCard, ms: number, isStar: boolean) => {
    scene.tweens.killTweensOf([c.pivot, c.glow]);
    c.pivot.setAngle(0).setScale(1);
    const k = rankOf(c.rarity);
    seq.tween({
      targets: c.pivot, scaleX: 0, duration: ms / 2, ease: 'Quad.easeIn',
      onComplete: () => {
        show(c);
        if (isStar) highlight();
        cardBurst(particles, c.r, c.rarity, isStar ? 1.6 : 1);
        if (k >= 2 || isStar) cardWave(scene, seq, modal, c.r, COLORS.rarity[c.rarity]);
        if (isStar && k >= 3) rain(particles, c.rarity, 1200, k === 4 ? 35 : 20);
        const bounce = REVEAL.cardBounce[k]! + (isStar ? 0.06 : 0);
        seq.tween({ targets: c.pivot, scaleX: bounce, scaleY: bounce, duration: ms / 2, ease: 'Quad.easeOut', onComplete: () => {
          seq.tween({ targets: c.pivot, scale: 1, duration: 120, ease: 'Quad.easeIn' });
        } });
      },
    });
  };

  let done = false;
  const finish = (tapped: boolean) => {
    if (done) return;
    done = true;
    seq.stop();
    particles.stopStreams();
    scene.tweens.killTweensOf(cards.flatMap(c => [c.pivot, c.glow]));
    cards.forEach(c => {
      show(c);
      c.pivot.setScale(1).setAngle(0);
      // Fin naturelle : les cartes assombries reviennent en douceur ; à l'appui, d'un coup.
      if (tapped) c.pivot.setAlpha(1);
      else if (c.pivot.alpha < 1) scene.tweens.add({ targets: c.pivot, alpha: 1, duration: 200 });
    });
    highlight();
    sparkleBest(particles, cards);
    onDone(tapped);
  };

  for (const step of schedule.steps) {
    const card = cards[step.index]!;
    seq.at(step.at, () => {
      if (step.star) heartbeat(card, step.anticipation);
      else if (step.anticipation > 0) anticipate(card, step.anticipation);
    });
    seq.at(step.at + step.anticipation, () => turn(card, step.turn, step.star));
  }
  seq.at(schedule.duration, () => finish(false));
  flipCues(schedule).forEach(c => seq.at(c.at, () => onCue(c.cue)));
  return { seq, finish };
}
