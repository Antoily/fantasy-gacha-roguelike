import Phaser from 'phaser';
import { RARITIES, type Rarity } from '../data/gachaConfig';
import { REVEAL_TIMING } from '../data/revealConfig';
import type { RevealKind, RevealPlan } from '../logic/reveal';
import { GACHA, HEIGHT, REVEAL, WIDTH } from './layout';
import { COLORS, CSS, FONT_SIZE, REVEAL_FX, STROKE } from './theme';
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

// Joue un déroulé calculé par la logique (src/logic/reveal.ts) : la scène ne décide de
// rien, elle montre `plan.steps` dans l'ordre aux instants de REVEAL_TIMING, puis
// appelle onDone. Aucun hasard ici : `Phaser.Math.Between` lirait Math.random et
// décalerait le hasard scripté de l'e2e (research R6).
export function playReveal(
  scene: Phaser.Scene, modal: Phaser.GameObjects.Container, plan: RevealPlan, onDone: () => void,
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
  modal.add([fx, orb, flash, label, hint]);

  // Suspense, identique pour tous les paliers (FR-002) : l'orbe gagne le centre, grossit
  // et tremble de plus en plus.
  seq.tween({ targets: orb, x, y, scale: REVEAL.orbScale, duration: 400, ease: 'Cubic.easeOut' });
  const shake = seq.tween({
    targets: orb, angle: { from: -5, to: 5 }, duration: 60, yoyo: true, repeat: -1, delay: 400,
  });

  const burst = (rarity: Rarity, last: boolean) => {
    const k = rankOf(rarity);
    const color = COLORS.rarity[rarity];
    // Une transition encore en cours (leurre qui se dégonfle) écraserait ce palier.
    scene.tweens.killTweensOf([fx, orb, ...fx.list]);
    fx.removeAll(true);
    fx.setScale(1).setAlpha(1).setAngle(0);
    orb.setScale(REVEAL.orbScale).setAngle(0);

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

    // Éclair plein écran pour les deux plus hauts paliers.
    if (k >= 3) {
      flash.setFillStyle(color, 1);
      seq.tween({ targets: flash, alpha: { from: 0, to: REVEAL_FX.flashAlpha }, duration: 140, yoyo: true });
    }

    // Le nom de la rareté n'apparaît qu'au vrai palier : une fausse piste reste muette.
    if (last) {
      label.setText(`${labelOf(rarity)}\u00a0!`).setScale(0.6);
      seq.tween({ targets: label, alpha: 1, scale: 1, duration: 300, ease: 'Back.easeOut' });
    }
  };

  const transition = (kind: RevealKind) => {
    if (kind === 'rise') {
      // Montée : l'orbe se fend dans un éclair blanc avant le vrai palier.
      flash.setFillStyle(COLORS.panel, 1);
      seq.tween({ targets: flash, alpha: { from: 0, to: 0.9 }, duration: t.transition / 2, yoyo: true });
      seq.tween({ targets: orb, angle: { from: -12, to: 12 }, duration: 50, yoyo: true, repeat: 2 });
    } else {
      // Leurre : l'effet se dégonfle et l'orbe retombe.
      seq.tween({ targets: fx, scale: 0.2, alpha: 0, duration: t.transition, ease: 'Cubic.easeIn' });
      seq.tween({ targets: orb, scale: REVEAL.orbScale * 0.8, duration: t.transition, ease: 'Cubic.easeIn' });
    }
  };

  let time = t.suspense;
  plan.steps.forEach((rarity, i) => {
    const last = i === plan.steps.length - 1;
    seq.at(time, () => {
      shake.stop();
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
  return seq;
}
