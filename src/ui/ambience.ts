import Phaser from 'phaser';
import { AMBIENCE } from '../data/ambienceConfig';
import type { Rarity } from '../data/gachaConfig';
import { glossBand } from '../logic/motion';
import { GACHA } from './layout';
import type { Rect } from './layout';
import { Particles } from './particles';
import { AMBIENCE_FX, COLORS, RADIUS, STROKE } from './theme';

// Écran vivant (007, révisions du 2026-11-09 et du 2026-11-13) : l'orbe lévite, son éclat
// pulse, des étoiles gravitent autour d'elle et scintillent dans le ciel, les tirages payables
// portent un halo et un reflet, et la vedette de la bannière teinte le tout. Le décor vit
// derrière l'interface (sauf les étoiles qui passent devant l'orbe et le reflet, posé sur le
// dessin des boutons) ; aucune zone cliquable ne bouge. Le hasard vient des Particles (graine
// propre), jamais de Math.random (leçon 004).

export const prefersReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const V = Phaser.Math.Vector2;

// Étoile à quatre branches cernée d'encre, centrée sur l'origine : dessinée une fois, elle
// ne bouge ensuite que par transformation (pas de Graphics redessiné à chaque image).
function drawStar(g: Phaser.GameObjects.Graphics, size: number, color: number) {
  const pts: Phaser.Math.Vector2[] = [];
  for (let k = 0; k < 8; k++) {
    const r = k % 2 === 0 ? size : size * 0.35;
    const a = (k * Math.PI) / 4 - Math.PI / 2;
    pts.push(new V(r * Math.cos(a), r * Math.sin(a)));
  }
  g.clear().fillStyle(color, 1).fillPoints(pts, true);
  g.lineStyle(STROKE.thin / 2, COLORS.ink, 1).strokePoints(pts, true);
}

interface Gloss {
  readonly g: Phaser.GameObjects.Graphics;
  readonly tween: Phaser.Tweens.Tween;
}

export class Ambience {
  private readonly tweens: Phaser.Tweens.Tween[] = [];
  private readonly motes: Particles | null;
  private readonly halo: Phaser.GameObjects.Graphics;
  // Éclat de l'orbe : le conteneur porte la lévitation et le pouls, ses enfants la couleur.
  private readonly glow: Phaser.GameObjects.Container;
  private glowFace: Phaser.GameObjects.Graphics | null = null;
  private tint: Rarity | null | undefined = undefined;
  private moteColors: readonly number[] = AMBIENCE_FX.motes;
  private readonly orbitStars: Phaser.GameObjects.Graphics[] = [];
  private readonly glosses = new Map<string, Gloss>();

  constructor(
    private readonly scene: Phaser.Scene,
    layer: Phaser.GameObjects.Container,
    private readonly orb: Phaser.GameObjects.Container,
    private readonly reduced: boolean,
  ) {
    document.body.dataset.motion = reduced ? 'reduced' : 'full';
    const { x, y } = GACHA.orb;
    this.glow = scene.add.container(x, y);
    this.halo = scene.add.graphics();
    // Orbite : la moitié arrière sous l'orbe (dans la couche du décor), la moitié avant juste
    // au-dessus d'elle (l'Ambience est créée juste après l'orbe), sous le reste de l'interface.
    const back = scene.add.container(0, 0);
    const front = scene.add.container(0, 0);
    layer.add([this.glow, this.halo, back]);
    const o = AMBIENCE.orbit;
    for (let i = 0; i < o.count; i++) this.orbitStars.push(scene.add.graphics());
    this.paintOrbit();
    const place = (turn: number) => this.placeOrbit(turn, back, front);
    // La révélation cache l'orbe pour en animer une copie : ses étoiles disparaissent avec elle.
    const follow = () => {
      back.setVisible(orb.visible);
      front.setVisible(orb.visible);
    };
    scene.events.on(Phaser.Scenes.Events.UPDATE, follow);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, follow));
    const [lo, hi] = AMBIENCE.haloAlpha;
    if (reduced) {
      // FR-019 : écran fixe ; le halo reste, sans respirer, pour dire ce qui est payable ;
      // les étoiles de l'orbite restent posées.
      this.glow.setAlpha(AMBIENCE.orbGlow[1]);
      this.halo.setAlpha((lo + hi) / 2);
      place(0.15);
      this.motes = null;
      return;
    }
    this.motes = new Particles(scene, layer, 7);
    const turn = { t: 0 };
    this.tweens.push(
      scene.tweens.add({
        targets: [orb, this.glow], y: y - AMBIENCE.orbFloat, duration: AMBIENCE.orbCycle / 2,
        ease: 'Sine.InOut', yoyo: true, repeat: -1,
      }),
      scene.tweens.add({
        targets: this.glow, alpha: { from: AMBIENCE.orbGlow[0], to: AMBIENCE.orbGlow[1] },
        scale: { from: 1, to: AMBIENCE.orbGlowScale }, duration: AMBIENCE.orbCycle / 4,
        ease: 'Sine.InOut', yoyo: true, repeat: -1,
      }),
      scene.tweens.add({
        targets: this.halo, alpha: { from: lo, to: hi }, duration: AMBIENCE.haloCycle / 2,
        ease: 'Sine.InOut', yoyo: true, repeat: -1,
      }),
      scene.tweens.add({
        targets: turn, t: 1, duration: o.period, repeat: -1, onUpdate: () => place(turn.t),
      }),
    );
    place(0);
    this.startMotes();
  }

  // Halo autour des tirages que le joueur peut payer (FR-014), et leur reflet (FR-021).
  setGlow(buttons: readonly Rect[], names: readonly string[]) {
    document.body.dataset.glow = names.join(' ');
    const g = this.halo.clear();
    for (const [gap, alpha] of AMBIENCE.haloRings) {
      g.lineStyle(STROKE.thick, AMBIENCE_FX.halo, alpha);
      for (const b of buttons) {
        g.strokeRoundedRect(b.x - gap, b.y - gap, b.w + 2 * gap, b.h + 2 * gap, RADIUS + gap);
      }
    }
    for (const [name, gloss] of this.glosses) gloss.g.setVisible(names.includes(name));
  }

  // Reflet périodique sur le dessin d'un tirage (FR-021), montré tant que setGlow le nomme.
  // `index` décale les boutons pour que les reflets se suivent au lieu de passer ensemble.
  addGloss(name: string, rect: Rect, visual: Phaser.GameObjects.Container, index: number) {
    if (this.reduced) return;
    const k = AMBIENCE.gloss;
    // Coordonnées de l'écran dans un conteneur centré sur le bouton.
    const g = this.scene.add.graphics().setPosition(-(rect.x + rect.w / 2), -(rect.y + rect.h / 2));
    visual.add(g);
    const inner = { x: rect.x + k.inset, y: rect.y + k.inset, w: rect.w - 2 * k.inset, h: rect.h - 2 * k.inset };
    const sweep = { p: 0 };
    const tween = this.scene.tweens.add({
      targets: sweep, p: 1, duration: k.sweep, ease: 'Sine.InOut',
      delay: k.first + index * k.stagger, repeat: -1, repeatDelay: k.every - k.sweep,
      onUpdate: () => {
        const pts = glossBand(inner, RADIUS - k.inset, k.width, k.slant, sweep.p);
        g.clear();
        if (pts.length >= 3) {
          g.fillStyle(AMBIENCE_FX.gloss, AMBIENCE_FX.glossAlpha).fillPoints(pts.map(([px, py]) => new V(px, py)), true);
        }
      },
      // Entre deux passages, la bande sortie à droite ne laisse rien.
      onRepeat: () => g.clear(),
    });
    this.tweens.push(tween);
    this.glosses.set(name, { g, tween });
  }

  // Teinte de la vedette de la bannière active (FR-023) : éclat de l'orbe, une lueur sur trois
  // et une étoile de l'orbite. null : bannière standard, ambiance neutre.
  setTint(rarity: Rarity | null) {
    if (rarity === this.tint) return;
    this.tint = rarity;
    document.body.dataset.ambienceTint = rarity ?? 'neutral';
    const color = rarity ? COLORS.rarity[rarity] : null;
    this.moteColors = color === null ? AMBIENCE_FX.motes : [...AMBIENCE_FX.motes.slice(0, -1), color];
    this.paintOrbit();

    const face = this.scene.add.graphics();
    for (const [k, alpha] of AMBIENCE.orbGlowRings) {
      face.fillStyle(color ?? AMBIENCE_FX.orbGlow, alpha).fillCircle(0, 0, GACHA.orb.r * k);
    }
    this.glow.add(face);
    const old = this.glowFace;
    this.glowFace = face;
    // Premier affichage ou mouvement réduit : la couleur est posée d'emblée.
    if (!old) return;
    this.scene.tweens.killTweensOf(old);
    if (this.reduced) {
      old.destroy();
      return;
    }
    // Fondu enchaîné : l'ancienne couleur s'efface pendant que la nouvelle monte.
    face.setAlpha(0);
    this.scene.tweens.add({ targets: face, alpha: 1, duration: AMBIENCE.tintFade, ease: 'Sine.InOut' });
    this.scene.tweens.add({
      targets: old, alpha: 0, duration: AMBIENCE.tintFade, ease: 'Sine.InOut', onComplete: () => old.destroy(),
    });
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

  private paintOrbit() {
    const colors = AMBIENCE_FX.orbit;
    const color = this.tint ? COLORS.rarity[this.tint] : null;
    this.orbitStars.forEach((g, i) => {
      const last = i === this.orbitStars.length - 1;
      drawStar(g, AMBIENCE.orbit.size, last && color !== null ? color : colors[i % colors.length]!);
    });
  }

  // Étoiles sur l'ellipse inclinée autour de l'orbe (qui lévite), à `turn` tour (0 à 1). La
  // moitié basse de l'ellipse passe devant l'orbe : pleine et grande ; la moitié haute derrière.
  private placeOrbit(turn: number, back: Phaser.GameObjects.Container, front: Phaser.GameObjects.Container) {
    const o = AMBIENCE.orbit;
    const tilt = (o.tilt * Math.PI) / 180;
    const n = this.orbitStars.length;
    this.orbitStars.forEach((g, i) => {
      const a = 2 * Math.PI * (turn + i / n);
      const ex = o.rx * Math.cos(a);
      const ey = o.ry * Math.sin(a);
      const depth = Math.sin(a);
      const inFront = depth > 0;
      const parent = inFront ? front : back;
      if (g.parentContainer !== parent) {
        g.parentContainer?.remove(g);
        parent.add(g);
      }
      const k = (depth + 1) / 2;
      g.setPosition(
        this.orb.x + ex * Math.cos(tilt) - ey * Math.sin(tilt),
        this.orb.y + ex * Math.sin(tilt) + ey * Math.cos(tilt),
      )
        .setScale(o.backScale + (o.frontScale - o.backScale) * k)
        .setAlpha(inFront ? 1 : o.backAlpha)
        .setRotation(a / 2);
    });
  }

  private startMotes() {
    const m = this.motes;
    if (!m) return;
    m.stopStreams();
    const a = AMBIENCE.moteArea;
    const spawn = () => m.burst({
      x: m.between(a.x, a.x + a.w), y: m.between(a.y, a.y + a.h), count: 1,
      colors: this.moteColors, shapes: ['star'], fadeIn: AMBIENCE.moteFadeIn,
      speed: AMBIENCE.moteSpeed, size: AMBIENCE.moteSize, life: AMBIENCE.moteLife,
      angle: [-Math.PI / 2 - 0.3, -Math.PI / 2 + 0.3],
      twinkle: AMBIENCE.moteTwinkle, spin: AMBIENCE.moteSpin,
    });
    for (let i = 0; i < AMBIENCE.moteWarm; i++) spawn();
    m.stream(spawn, AMBIENCE.moteRate, AMBIENCE.moteRate, Infinity);
  }
}
