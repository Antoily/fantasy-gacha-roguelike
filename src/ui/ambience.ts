import Phaser from 'phaser';
import { AMBIENCE } from '../data/ambienceConfig';
import { GACHA } from './layout';
import type { Rect } from './layout';
import { Particles } from './particles';
import { AMBIENCE_FX, RADIUS, STROKE } from './theme';

// Écran vivant (007, révision du 2026-11-09) : l'orbe lévite, son éclat pulse, des lueurs
// montent dans le ciel, les tirages payables portent un halo. Tout vit dans une couche posée
// juste au-dessus du fond : rien ne passe devant l'interface, aucune zone cliquable ne bouge.
// Le hasard vient des Particles (graine propre), jamais de Math.random (leçon 004).

export const prefersReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export class Ambience {
  private readonly tweens: Phaser.Tweens.Tween[] = [];
  private readonly motes: Particles | null;
  private readonly halo: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Container,
    orb: Phaser.GameObjects.Container,
    private readonly reduced: boolean,
  ) {
    document.body.dataset.motion = reduced ? 'reduced' : 'full';
    const { x, y, r } = GACHA.orb;
    const orbGlow = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD).setPosition(x, y);
    orbGlow.fillStyle(AMBIENCE_FX.orbGlow, 1).fillCircle(0, 0, r * 1.25);
    this.halo = scene.add.graphics();
    layer.add([orbGlow, this.halo]);
    const [lo, hi] = AMBIENCE.haloAlpha;
    if (reduced) {
      // FR-019 : écran fixe ; le halo reste, sans respirer, pour dire ce qui est payable.
      orbGlow.setAlpha(AMBIENCE.orbGlow[0]);
      this.halo.setAlpha((lo + hi) / 2);
      this.motes = null;
      return;
    }
    this.motes = new Particles(scene, layer, 7);
    this.tweens.push(
      scene.tweens.add({
        targets: orb, y: y - AMBIENCE.orbFloat, duration: AMBIENCE.orbCycle / 2,
        ease: 'Sine.InOut', yoyo: true, repeat: -1,
      }),
      scene.tweens.add({
        targets: orbGlow, y: y - AMBIENCE.orbFloat, duration: AMBIENCE.orbCycle / 2,
        ease: 'Sine.InOut', yoyo: true, repeat: -1,
      }),
      scene.tweens.add({
        targets: orbGlow, alpha: { from: AMBIENCE.orbGlow[0], to: AMBIENCE.orbGlow[1] },
        scale: { from: 1, to: AMBIENCE.orbGlowScale }, duration: AMBIENCE.orbCycle / 4,
        ease: 'Sine.InOut', yoyo: true, repeat: -1,
      }),
      scene.tweens.add({
        targets: this.halo, alpha: { from: lo, to: hi }, duration: AMBIENCE.haloCycle / 2,
        ease: 'Sine.InOut', yoyo: true, repeat: -1,
      }),
    );
    this.startMotes();
  }

  // Halo autour des tirages que le joueur peut payer (FR-014).
  setGlow(buttons: readonly Rect[], names: readonly string[]) {
    document.body.dataset.glow = names.join(' ');
    const g = this.halo.clear();
    for (const [gap, alpha] of AMBIENCE.haloRings) {
      g.lineStyle(STROKE.thick, AMBIENCE_FX.halo, alpha);
      for (const b of buttons) {
        g.strokeRoundedRect(b.x - gap, b.y - gap, b.w + 2 * gap, b.h + 2 * gap, RADIUS + gap);
      }
    }
  }

  // Pendant une fenêtre, l'ambiance se tait : le voile la cache, et la révélation garde
  // toute la puissance de rendu (test chronométré SC-003 de 004 sur le runner de la CI).
  setActive(active: boolean) {
    if (this.reduced) return;
    for (const t of this.tweens) {
      if (active) t.resume();
      else t.pause();
    }
    if (active) this.startMotes();
    else this.motes?.clear();
  }

  private startMotes() {
    const m = this.motes;
    if (!m) return;
    m.stopStreams();
    const a = AMBIENCE.moteArea;
    m.stream(() => m.burst({
      x: m.between(a.x, a.x + a.w), y: m.between(a.y, a.y + a.h), count: 1,
      colors: AMBIENCE_FX.motes, shapes: ['dot'], fadeIn: AMBIENCE.moteFadeIn,
      speed: AMBIENCE.moteSpeed, size: AMBIENCE.moteSize, life: AMBIENCE.moteLife,
      angle: [-Math.PI / 2 - 0.3, -Math.PI / 2 + 0.3],
    }), AMBIENCE.moteRate, AMBIENCE.moteRate, Infinity);
  }
}
