import Phaser from 'phaser';
import { RARITIES, type Rarity } from '../data/gachaConfig';
import { CARD_MOTION, FLIP_TIMING, REVEAL_MOTION, REVEAL_TIMING } from '../data/revealConfig';
import { PAN_SPREAD, STAR_RAIN_MS, type SoundVariant } from '../data/sounds';
import type { PullResult } from '../logic/gacha';
import type { FlipSchedule, RevealKind, RevealPlan } from '../logic/reveal';
import { glossBand } from '../logic/motion';
import { advanced, beatTimes, crackTimes, flipCues, revealCues, type Cue, type SoundCue } from '../logic/soundCues';
import { orbSize, uiImage } from './art';
import { GACHA, HEIGHT, RESULTS, REVEAL, WIDTH, resultCardRect, type Rect } from './layout';
import { Particles, type Shape } from './particles';
import { ART_FX, CARD_FX, COLORS, CSS, FONT_SIZE, RADIUS, REVEAL_FX, STROKE } from './theme';
import { R } from './display';
import { makeEmblem, makeOrb, textStyle } from './widgets';

// Minuteries et tweens d'une mise en scène, gardés pour tout arrêter d'un coup quand
// le joueur passe (FR-006) : sans ça, un rappel en retard rouvrirait une fenêtre.
export class Sequence {
  private readonly timers: Phaser.Time.TimerEvent[] = [];
  private readonly tweens: Phaser.Tweens.Tween[] = [];
  private readonly cleanups: (() => void)[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  at(ms: number, fn: () => void) {
    this.timers.push(this.scene.time.delayedCall(ms, fn));
  }

  tween(config: Phaser.Types.Tweens.TweenBuilderConfig): Phaser.Tweens.Tween {
    const t = this.scene.tweens.add(config);
    this.tweens.push(t);
    return t;
  }

  // Ménage à faire quand la mise en scène s'arrête, fin naturelle ou appui.
  onStop(fn: () => void) {
    this.cleanups.push(fn);
  }

  stop() {
    this.timers.forEach(t => t.remove(false));
    this.tweens.forEach(t => t.stop());
    this.timers.length = 0;
    this.tweens.length = 0;
    this.cleanups.splice(0).forEach(fn => fn());
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
export const colorsOf = (rarity: Rarity): number[] =>
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

// Éclat d'une carte qui vient d'apparaître, selon sa rareté. Les particules naissent sur le
// bord (révision 3, B4) : au centre, les confettis cachaient l'illustration.
function cardBurst(particles: Particles, r: Rect, rarity: Rarity, boost = 1) {
  const k = rankOf(rarity);
  particles.burst({
    x: r.x + r.w / 2, y: r.y + r.h / 2, count: Math.round(REVEAL.cardBurst[k]! * boost),
    colors: k === 0 ? [COLORS.rarity.common] : colorsOf(rarity), shapes: SHAPES[k]!,
    speed: [60, 120 + 50 * k * boost], size: [2.5, 4 + k], life: [350, 600 + 120 * k],
    spawnRadius: [r.h / 2, r.w / 2], gravity: k >= 2 ? 220 : 40, drag: 1.5,
  });
}

// Reflet qui balaie les cartes Légendaire et Ultra rare (révision 3, B5), tant que la fenêtre
// vit : une bande oblique découpée à la forme de la carte (glossBand), sans masque. Ses tweens
// meurent avec la fenêtre. Mouvement réduit : aucun.
export function glossBest(
  scene: Phaser.Scene, parent: Phaser.GameObjects.Container,
  cards: readonly { readonly r: Rect; readonly rarity: Rarity }[], reduced: boolean,
) {
  if (reduced) return;
  const k = RESULTS.gloss;
  const m = CARD_MOTION;
  cards.filter(c => rankOf(c.rarity) >= 3).forEach(({ r }, i) => {
    const g = scene.add.graphics();
    parent.add(g);
    const sweep = { p: 0 };
    scene.tweens.add({
      targets: sweep, p: 1, duration: m.glossSweep, ease: 'Sine.easeInOut',
      delay: m.glossSweep + i * 300, repeat: -1, repeatDelay: m.glossEvery - m.glossSweep,
      onUpdate: () => {
        const pts = glossBand(r, RADIUS, k.width, k.slant, sweep.p);
        g.clear();
        if (pts.length >= 3) {
          g.fillStyle(CARD_FX.gloss, CARD_FX.glossAlpha).fillPoints(pts.map(([px, py]) => new Phaser.Math.Vector2(px, py)), true);
        }
      },
      onRepeat: () => g.clear(),
    });
    g.once(Phaser.GameObjects.Events.DESTROY, () => scene.tweens.killTweensOf(sweep));
  });
}

// Tweens en boucle d'un objet de fenêtre : arrêtés quand la fenêtre l'emporte.
function loop(
  scene: Phaser.Scene, target: Phaser.GameObjects.GameObject, config: Omit<Phaser.Types.Tweens.TweenBuilderConfig, 'targets'>,
) {
  scene.tweens.add({ ...config, targets: target });
  target.once(Phaser.GameObjects.Events.DESTROY, () => scene.tweens.killTweensOf(target));
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

// Carte du ×1 : elle surgit avec l'éclat de sa rareté. Issue d'un tirage (`night`), elle se
// pose sur la nuit de la révélation (révision 3, B2) : dès Rare, des rayons de sa couleur
// tournent derrière elle, et son illustration flotte. Les particules passent sous la carte,
// seul le scintillement du bord reste dessus (B4). Mouvement réduit : rendu fixe.
export function celebrateSingle(
  scene: Phaser.Scene, modal: Phaser.GameObjects.Container, card: Phaser.GameObjects.Container, r: Rect, rarity: Rarity,
  opts: { readonly night: boolean; readonly reduced: boolean },
) {
  const k = rankOf(rarity);
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const under = scene.add.container(0, 0);
  const pivot = scene.add.container(cx, cy);
  modal.remove(card);
  card.setPosition(-cx, -cy);
  pivot.add(card);
  modal.add([under, pivot]);
  if (opts.night && k >= 2) {
    const rays = scene.add.graphics().setPosition(cx, cy).setBlendMode(Phaser.BlendModes.ADD);
    const n = RESULTS.singleRays;
    const len = RESULTS.singleRayLength;
    rays.fillStyle(COLORS.rarity[rarity], CARD_FX.singleRayAlpha);
    for (let j = 0; j < n; j++) {
      const a = (j / n) * 2 * Math.PI;
      const w = Math.PI / n / 3;
      rays.fillTriangle(0, 0, len * Math.cos(a - w), len * Math.sin(a - w), len * Math.cos(a + w), len * Math.sin(a + w));
    }
    under.add(rays);
    if (!opts.reduced) loop(scene, rays, { angle: 360, duration: 360_000 / CARD_MOTION.rayTurn, repeat: -1 });
  }
  const art = card.getByName('art') as Phaser.GameObjects.Image | null;
  if (art && opts.night && !opts.reduced) {
    loop(scene, art, {
      y: { from: art.y - RESULTS.float, to: art.y + RESULTS.float }, duration: CARD_MOTION.float / 2,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }
  const particles = new Particles(scene, under, 3);
  if (opts.reduced) {
    sparkleBest(new Particles(scene, modal, 4), [{ r, rarity }]);
    return pivot;
  }
  pivot.setScale(0.7);
  const seq = new Sequence(scene);
  seq.tween({ targets: pivot, scale: 1, duration: 260 + 40 * k, ease: 'Back.easeOut' });
  cardBurst(particles, r, rarity, 1.5);
  if (k >= 2) cardWave(scene, seq, under, r, COLORS.rarity[rarity]);
  sparkleBest(new Particles(scene, modal, 4), [{ r, rarity }]);
  glossBest(scene, modal, [{ r, rarity }], opts.reduced);
  return pivot;
}

// Textures de lumière (révision 3, lot A) : blanches, peintes une fois au pixel près puis
// teintées. Une Image teintée en mélange additif ne coûte presque rien, là où un Graphics
// redessiné à chaque image pèserait sur le runner de la CI (rendu logiciel) ; et un
// dégradé fait une lumière sans bord net, que des disques pleins ne donnent pas.
type LightTexture = 'glow' | 'ray' | 'ring' | 'star';
const LIGHT_SIZE: Record<LightTexture, readonly [number, number]> = {
  glow: [64, 64], ray: [128, 24], ring: [96, 96], star: [32, 32],
};
// Opacité de chaque texture en (u, v) ∈ [0, 1]² ; le rayon part du bord gauche.
const LIGHT_ALPHA: Record<LightTexture, (u: number, v: number) => number> = {
  glow: (u, v) => Math.max(0, 1 - 2 * Math.hypot(u - 0.5, v - 0.5)) ** 1.8,
  // Anneau fin à 86 % du rayon : sa taille d'affichage se règle en conséquence (RING_PEAK).
  ring: (u, v) => Math.exp(-(((2 * Math.hypot(u - 0.5, v - 0.5) - RING_PEAK) / 0.06) ** 2)),
  // Faisceau qui s'évase en s'éloignant du cœur et s'éteint vers sa pointe.
  ray: (u, v) => {
    const across = (2 * Math.abs(v - 0.5)) / (0.12 + 0.88 * u);
    return Math.max(0, 1 - across * across) * (1 - u) ** 1.2 * Math.min(1, u * 10);
  },
  // Étincelle à quatre branches et cœur doux.
  star: (u, v) => {
    const dx = 2 * Math.abs(u - 0.5);
    const dy = 2 * Math.abs(v - 0.5);
    const branch = Math.max(Math.exp(-dx * 12) * (1 - dy), Math.exp(-dy * 12) * (1 - dx));
    return Math.min(1, branch + 0.6 * Math.max(0, 1 - Math.hypot(dx, dy)) ** 3);
  },
};
const RING_PEAK = 0.86;
const lightKey = (name: LightTexture) => `fx-${name}`;

function lightTextures(scene: Phaser.Scene) {
  const base = REVEAL_FX.light;
  for (const name of Object.keys(LIGHT_SIZE) as LightTexture[]) {
    if (scene.textures.exists(lightKey(name))) continue;
    // Peinte à l'échelle de rendu : nette à densité 2 (007, ADR 0007).
    const w = Math.round(LIGHT_SIZE[name][0] * R);
    const h = Math.round(LIGHT_SIZE[name][1] * R);
    const tex = scene.textures.createCanvas(lightKey(name), w, h);
    if (!tex) continue;
    const ctx = tex.getContext();
    const img = ctx.createImageData(w, h);
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const i = 4 * (py * w + px);
        img.data[i] = (base >> 16) & 0xff;
        img.data[i + 1] = (base >> 8) & 0xff;
        img.data[i + 2] = base & 0xff;
        img.data[i + 3] = Math.round(255 * LIGHT_ALPHA[name]((px + 0.5) / w, (py + 0.5) / h));
      }
    }
    ctx.putImageData(img, 0, 0);
    tex.refresh();
  }
}

// Une lumière additive teintée, de taille (w, h) en px d'écran.
function light(
  scene: Phaser.Scene, name: LightTexture, x: number, y: number, w: number, h: number, color: number, alpha = 1,
) {
  return scene.add.image(x, y, lightKey(name)).setDisplaySize(w, h).setTint(color).setAlpha(alpha)
    .setBlendMode(Phaser.BlendModes.ADD);
}

// Mélange de deux couleurs (0 : a, 1 : b), canal par canal.
function mix(a: number, b: number, k: number): number {
  const ch = (shift: number) => Math.round(((a >> shift) & 0xff) * (1 - k) + ((b >> shift) & 0xff) * k) << shift;
  return ch(16) | ch(8) | ch(0);
}

// Tous les objets d'un conteneur, enfants des enfants compris : pour arrêter leurs tweens
// avant de les détruire (leçon 004 : un tween en cours écrase ce qu'on repose).
function descendants(c: Phaser.GameObjects.Container): Phaser.GameObjects.GameObject[] {
  return c.list.flatMap(o => (o instanceof Phaser.GameObjects.Container ? [o, ...descendants(o)] : [o]));
}

// Joue un déroulé calculé par la logique (src/logic/reveal.ts) : la scène ne décide de
// rien, elle montre `plan.steps` dans l'ordre aux instants de REVEAL_TIMING, puis
// appelle onDone. Les sons (005) suivent le même calendrier, sur les mêmes minuteries :
// passer l'animation annule aussi ceux qui restaient à jouer. Aucun hasard ici : `Phaser.Math.Between` lirait Math.random et
// décalerait le hasard scripté de l'e2e (research R6) ; la secousse est faite main pour la
// même raison (`cameras.main.shake` le lit aussi).
// Révision 3 (lot A, FR-018 à FR-021) : nuit directe, cœur qui bat en lumière, fissures à
// à-coups, gel, impact franc, palier fait de lumière et toujours en mouvement, fausses pistes
// jouées, sortie dans un voile de lumière. Les durées restent celles de REVEAL_TIMING.
// Sons d'une mise en scène, déclenchés `lead` ms plus tôt et programmés pour sonner à leur
// instant (latence de sortie, FR-024). Avec lead = 0, chacun part à son instant.
function scheduleCues(
  seq: Sequence, cues: readonly SoundCue[], lead: number,
  onCue: (cue: Cue, variant?: SoundVariant, delay?: number) => void,
) {
  for (const c of cues) {
    const { callAt, delay } = advanced(c.at, lead);
    seq.at(callAt, () => onCue(c.cue, c.variant, delay));
  }
}

export function playReveal(
  scene: Phaser.Scene,
  modal: Phaser.GameObjects.Container,
  plan: RevealPlan,
  armMs: number,
  onCue: (cue: Cue, variant?: SoundVariant, delay?: number) => void,
  onDone: () => void,
  lead = 0,
): Sequence {
  lightTextures(scene);
  const seq = new Sequence(scene);
  const { x, y } = REVEAL.center;
  const t = REVEAL_TIMING;
  const m = REVEAL_MOTION;
  const or = GACHA.orb.r;
  const neutral = ART_FX.crackLight;

  // Nuit directe (FR-018) : aucun voile papier dessous (openModal), la nuit tombe d'un coup.
  const night = uiImage(scene, 'bg-reveal', WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT)
    ?? scene.add.rectangle(0, 0, WIDTH, HEIGHT, ART_FX.night, ART_FX.nightAlpha).setOrigin(0);
  night.setAlpha(0);
  seq.tween({ targets: night, alpha: 1, duration: m.nightIn, ease: 'Quad.easeIn' });
  // Voile d'encre du gel : la nuit fonce juste avant l'éclat.
  const dusk = scene.add.rectangle(0, 0, WIDTH, HEIGHT, REVEAL_FX.dusk, 1).setOrigin(0).setAlpha(0);

  // Plateau : ce qui bouge avec l'impact (gel, coup de poing, secousse), pivot au centre de
  // l'écran. La nuit reste fixe dessous : une secousse ne découvre jamais l'écran de tirage.
  // La caméra porte l'échelle de rendu R : on ne la touche pas.
  const stage = scene.add.container(WIDTH / 2, HEIGHT / 2);
  const layer = scene.add.container(-WIDTH / 2, -HEIGHT / 2);
  stage.add(layer);

  // Cercle magique sous l'orbe : il s'allume, tourne de plus en plus vite, puis prend la
  // couleur du palier. Lumière neutre jusque-là : le suspense ne trahit rien (FR-002).
  const circle = uiImage(scene, 'magic-circle', x, y, REVEAL.circle, REVEAL.circle);
  const circleScale = circle?.scaleX ?? 1;
  circle?.setAlpha(0).setTint(neutral);
  // Lumière qui filtre par les fissures, derrière l'orbe (neutre, FR-016).
  const glowSize = GACHA.orb.r * REVEAL.orbScale * 3.2;
  const crackGlow = light(scene, 'glow', x, y, glowSize, glowSize, neutral, 0);
  const crackGlowScale = crackGlow.scaleX;
  // Effets du palier (halo, rayons, ondes, orbite), centrés.
  const fx = scene.add.container(x, y);
  // Anneau du battement autour de l'orbe agrandie.
  const ringSize = (2 * (or * REVEAL.orbScale + 6)) / RING_PEAK;
  const beatRing = light(scene, 'ring', x, y, ringSize, ringSize, REVEAL_FX.heartbeat, 0);
  const ringScale = beatRing.scaleX;
  // Orbe : `holder` porte la place, l'échelle et le tremblement ; `orb`, les pulsations.
  const holder = scene.add.container(GACHA.orb.x, GACHA.orb.y);
  const orb = makeOrb(scene, or);
  holder.add(orb);
  // Ce qui dessine l'orbe intacte, masqué quand elle éclate.
  const sphere = [...orb.list] as unknown as Phaser.GameObjects.Components.Visible[];
  // Fissures : trois calques de plus en plus fendus, dans la lumière neutre.
  const size = orbSize(or);
  const cracks = (['orb-cracks-1', 'orb-cracks-2', 'orb-cracks-3'] as const)
    .map(name => uiImage(scene, name, 0, 0, size, size)?.setVisible(false).setTint(neutral) ?? null);
  // Le cœur qui bat (lueur neutre posée sur l'orbe), puis le cœur lumineux du palier.
  const heart = light(scene, 'glow', 0, 0, or * 2.4, or * 2.4, neutral, 0);
  const core = scene.add.container(0, 0);
  orb.add([...cracks.filter(c => c !== null), heart, core]);
  layer.add([...(circle ? [circle] : []), crackGlow, fx, beatRing, holder]);
  const particles = new Particles(scene, layer, 1);
  // Impact : éclair neutre, puis la couleur du palier qui s'éteint (FR-020). Additifs tous
  // deux : en mélange normal, un éclair à mi-course voile la nuit de gris au lieu de l'éclairer.
  const flash = scene.add.rectangle(0, 0, WIDTH, HEIGHT, REVEAL_FX.flash, 1).setOrigin(0).setAlpha(0)
    .setBlendMode(Phaser.BlendModes.ADD);
  const tintFlash = scene.add.rectangle(0, 0, WIDTH, HEIGHT, neutral, 1).setOrigin(0).setAlpha(0)
    .setBlendMode(Phaser.BlendModes.ADD);
  const label = scene.add.text(x, REVEAL.labelY, '', { ...textStyle(FONT_SIZE.title), stroke: CSS.outline, strokeThickness: 6 })
    .setOrigin(0.5).setAlpha(0);
  // « Touche pour passer » n'apparaît qu'une fois l'appui armé, puis respire.
  const hint = scene.add.text(x, REVEAL.hintY, 'Touche pour passer', textStyle(FONT_SIZE.small, CSS.textFaint))
    .setOrigin(0.5).setAlpha(0);
  modal.add([night, dusk, stage, flash, tintFlash, label, hint]);
  seq.at(armMs, () => seq.tween({
    targets: hint, alpha: REVEAL_FX.hintAlpha[1], duration: m.hintIn, onComplete: () => seq.tween({
      targets: hint, alpha: REVEAL_FX.hintAlpha[0], duration: m.hintPulse, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    }),
  }));

  // Secousse faite main, déterministe : le plateau oscille et s'amortit.
  let jolting: Phaser.Tweens.Tween | null = null;
  const jolt = (amp: number, ms: number) => {
    jolting?.stop();
    const p = { v: 0 };
    jolting = seq.tween({
      targets: p, v: 1, duration: ms,
      onUpdate: () => {
        const k = amp * (1 - p.v);
        stage.setPosition(WIDTH / 2 + k * Math.sin(p.v * 37), HEIGHT / 2 + k * Math.cos(p.v * 29));
      },
      onComplete: () => stage.setPosition(WIDTH / 2, HEIGHT / 2),
    });
  };

  // Suspense en trois temps, identique pour tous les paliers (FR-002, FR-016) : l'orbe gagne
  // le centre au-dessus du cercle, en traînant de la lumière, et aspire l'énergie ; son cœur
  // bat ; elle se fissure trois fois par à-coups ; tout se fige ; puis elle éclate.
  seq.tween({
    targets: holder, x, y, scale: REVEAL.orbScale, duration: m.orbIn, ease: 'Back.easeOut', easeParams: [1.2],
  });
  // Traînée de lueurs une fois la nuit tombée : en additif sur le ciel pastel, elles saturaient au blanc.
  for (let i = 1; i < 4; i++) {
    seq.at(m.nightIn * (0.4 + 0.3 * i), () => particles.burst({
      x: holder.x, y: holder.y, count: 2, colors: [neutral], shapes: ['glow'],
      speed: [0, 20], size: [10, 16], life: [260, 420], spawnRadius: [0, or * 0.5],
    }));
  }
  let spin: Phaser.Tweens.Tween | null = null;
  if (circle) {
    seq.tween({ targets: circle, alpha: 0.85, duration: 500, delay: 200 });
    spin = seq.tween({ targets: circle, angle: REVEAL.circleTurn, duration: t.suspense - t.freeze, ease: 'Cubic.easeIn' });
  }
  let shake = seq.tween({
    targets: holder, angle: { from: -2, to: 2 }, duration: 80, yoyo: true, repeat: -1, delay: m.orbIn,
  });
  for (const at of beatTimes()) {
    seq.at(at, () => {
      // Battement en lumière (FR-018) : un anneau part de l'orbe, son cœur s'allume, elle enfle.
      beatRing.setScale(ringScale).setAlpha(REVEAL_FX.heartbeatAlpha);
      seq.tween({ targets: beatRing, scale: ringScale * REVEAL.heartRing, alpha: 0, duration: m.beat, ease: 'Quad.easeOut' });
      heart.setAlpha(REVEAL_FX.heartGlowAlpha);
      seq.tween({ targets: heart, alpha: 0, duration: m.beat, ease: 'Quad.easeOut' });
      seq.tween({ targets: orb, scale: REVEAL.beatScale, duration: m.beatPulse, yoyo: true, ease: 'Quad.easeOut' });
    });
  }
  crackTimes().forEach((at, i) => seq.at(at, () => {
    // Fissure : le calque suivant, un à-coup (l'orbe sursaute, le plateau tressaille), la
    // lumière derrière l'orbe monte d'un cran, un anneau fin part, des éclats de verre.
    cracks.forEach((c, j) => c?.setVisible(j === i));
    shake.stop();
    const amp = 3 + 2 * i;
    holder.setAngle(amp * 1.6);
    shake = seq.tween({ targets: holder, angle: { from: -amp, to: amp }, duration: 60 - 8 * i, yoyo: true, repeat: -1 });
    seq.tween({
      targets: holder, scale: { from: REVEAL.orbScale * REVEAL.crackJolt, to: REVEAL.orbScale },
      duration: m.crackJolt, ease: 'Quad.easeOut',
    });
    jolt(REVEAL.crackShake[i]!, m.crackJolt);
    seq.tween({
      targets: crackGlow, alpha: REVEAL_FX.crackGlowAlpha[i]!, scale: crackGlowScale * REVEAL.crackGlowScale[i]!,
      duration: m.crackGlowIn, ease: 'Quad.easeOut',
    });
    const ring = light(scene, 'ring', x, y, ringSize, ringSize, neutral, 0.8);
    layer.addAt(ring, layer.getIndex(holder));
    seq.tween({
      targets: ring, scale: ringScale * REVEAL.crackRingScale, alpha: 0, duration: m.crackRing, ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    });
    particles.burst({
      x, y, count: 8 + 6 * i, colors: [ART_FX.glass, neutral], shapes: ['shard', 'spark'],
      speed: [90, 220], size: [2.5, 4.5], life: [300, 520],
      spawnRadius: [or * 0.6, or * REVEAL.orbScale], gravity: 300, drag: 1,
    });
  }));
  const charge = {
    x, y, colors: REVEAL_FX.charge, shapes: ['spark', 'dot', 'glow'] as Shape[],
    radius: [110, 210] as const, size: [2, 4] as const, life: [280, 420] as const,
  };
  seq.at(150, () => particles.stream(() => particles.converge(charge, 1), 30, 180, t.suspense - t.freeze - 150));
  // Temps figé : tout s'arrête net où il en est (particules, anneau, tremblement), la nuit
  // fonce, le plateau avance d'un rien et la lumière des fissures monte.
  seq.at(t.suspense - t.freeze, () => {
    shake.stop();
    holder.setAngle(0);
    jolting?.stop();
    stage.setPosition(WIDTH / 2, HEIGHT / 2);
    particles.stopStreams();
    particles.timeScale = 0;
    spin?.pause();
    scene.tweens.killTweensOf([beatRing, heart, orb, crackGlow]);
    seq.tween({ targets: holder, scale: REVEAL.orbScale * REVEAL.freezeSwell, duration: t.freeze, ease: 'Quad.easeIn' });
    seq.tween({ targets: stage, scale: REVEAL.freezeZoom, duration: t.freeze, ease: 'Quad.easeIn' });
    seq.tween({ targets: dusk, alpha: REVEAL_FX.duskAlpha, duration: t.freeze });
    seq.tween({ targets: crackGlow, alpha: 1, duration: t.freeze, ease: 'Quad.easeIn' });
  });

  // Palier affiché : ses boucles (rotation, respiration, couleurs) et ses lumières teintées,
  // que la transition éteint ou fait virer.
  const loops: Phaser.Tweens.Tween[] = [];
  const loop = (config: Phaser.Types.Tweens.TweenBuilderConfig) => loops.push(seq.tween(config));
  const stopLoops = () => loops.splice(0).forEach(l => l.stop());
  const tints = new Map<Phaser.GameObjects.Image, number>();
  let rays: Phaser.GameObjects.Image[] = [];
  let rayBox: Phaser.GameObjects.Container | null = null;
  let haloBox: Phaser.GameObjects.Container | null = null;
  let emblem: Phaser.GameObjects.Image | Phaser.GameObjects.Graphics | null = null;

  let shattered = false;
  const burst = (rarity: Rarity, last: boolean) => {
    const k = rankOf(rarity);
    const color = COLORS.rarity[rarity];
    const ultra = rarity === 'ultra' ? Object.values(COLORS.rarity) : null;
    particles.timeScale = 1;
    // Premier éclat : l'orbe vole en éclats de verre (FR-017).
    if (!shattered) {
      shattered = true;
      sphere.forEach(o => o.setVisible(false));
      cracks.forEach(c => c?.setVisible(false));
      heart.setAlpha(0);
      beatRing.setAlpha(0);
      seq.tween({ targets: crackGlow, alpha: 0, duration: 300, ease: 'Quad.easeOut' });
      particles.burst({
        x, y, count: REVEAL.shards[k]!, colors: [ART_FX.glass, neutral, color], shapes: ['shard'],
        speed: [180, 440], size: [4, 8], life: [600, 1000],
        spawnRadius: [10, or * REVEAL.orbScale * 0.8], gravity: 380, drag: 0.6,
      });
    }
    // Une transition encore en cours (leurre qui se dégonfle) écraserait ce palier.
    stopLoops();
    if (circle) {
      scene.tweens.killTweensOf(circle);
      circle.setTint(color).setAlpha(1).setScale(circleScale * 1.15);
      seq.tween({ targets: circle, scale: circleScale, duration: 400, ease: 'Cubic.easeOut' });
      loop({ targets: circle, angle: circle.angle + 360, duration: (360 / m.rayTurn[0]) * 1000, repeat: -1 });
    }
    scene.tweens.killTweensOf([fx, holder, orb, core, stage, dusk, flash, tintFlash, ...descendants(fx), ...descendants(core)]);
    fx.removeAll(true);
    core.removeAll(true);
    tints.clear();
    fx.setScale(1).setAlpha(1).setAngle(0).setPosition(x, y);
    holder.setScale(REVEAL.orbScale).setAngle(0).setPosition(x, y);
    orb.setScale(1);
    core.setScale(1).setAlpha(1);

    // Impact (FR-020) : éclair neutre qui vire à la couleur du palier, coup de poing dès Rare,
    // secousse dès Légendaire ; la nuit reprend sa teinte.
    seq.tween({
      targets: flash, alpha: REVEAL_FX.flashAlpha[k]!, duration: m.flashIn, ease: 'Quad.easeOut',
      onComplete: () => seq.tween({ targets: flash, alpha: 0, duration: m.flashOut, ease: 'Quad.easeIn' }),
    });
    tintFlash.setFillStyle(color, 1).setAlpha(0);
    seq.at(m.flashIn, () => {
      tintFlash.setAlpha(REVEAL_FX.flashTintAlpha);
      seq.tween({ targets: tintFlash, alpha: 0, duration: m.flashOut, ease: 'Quad.easeOut' });
    });
    stage.setScale(k >= 2 ? REVEAL.punch : stage.scale);
    seq.tween({ targets: stage, scale: 1, duration: m.punch, ease: 'Quad.easeOut' });
    if (REVEAL.shake[k]! > 0) jolt(REVEAL.shake[k]!, m.shake);
    else {
      jolting?.stop();
      stage.setPosition(WIDTH / 2, HEIGHT / 2);
    }
    seq.tween({ targets: dusk, alpha: 0, duration: 400 });

    // Palier fait de lumière (FR-019), plus ample avec le rang : halo, rayons longs et fins
    // qui tournent dans un sens, courts et larges dans l'autre, anneau, cœur à trois disques
    // (couleur du palier vers la lumière neutre au centre), étincelles en orbite.
    const tinted = (img: Phaser.GameObjects.Image, c: number) => {
      tints.set(img, c);
      return img.setTint(c);
    };
    const len = REVEAL.rayLength[k]!;
    const halo = REVEAL_FX.halo;
    haloBox = scene.add.container(0, 0, [
      tinted(light(scene, 'glow', 0, 0, len * 2.6, len * 2.6, color, halo[0]), color),
      tinted(light(scene, 'glow', 0, 0, len * 1.3, len * 1.3, color, halo[1]), color),
    ]);
    const n = REVEAL.rays[k]!;
    const rayColor = (j: number) => (ultra ? ultra[j % ultra.length]! : color);
    const long = scene.add.container(0, 0);
    const short = scene.add.container(0, 0);
    rays = [];
    for (let j = 0; j < n; j++) {
      const a = (360 * j) / n;
      const ray = tinted(light(scene, 'ray', 0, 0, len, len * REVEAL.rayLong, rayColor(j), REVEAL_FX.rayLong), rayColor(j));
      long.add(ray.setOrigin(0, 0.5).setAngle(a));
      rays.push(ray);
      if (j % 2 === 0) {
        const sl = len * REVEAL.rayShort.length;
        const wide = tinted(
          light(scene, 'ray', 0, 0, sl, sl * REVEAL.rayShort.width, rayColor(j + 2), REVEAL_FX.rayShort), rayColor(j + 2),
        );
        short.add(wide.setOrigin(0, 0.5).setAngle(a + 180 / n));
        rays.push(wide);
      }
    }
    rayBox = scene.add.container(0, 0, [long, short]).setScale(0);
    const edge = (2 * or * REVEAL.orbScale * 1.15) / RING_PEAK;
    const ring = tinted(light(scene, 'ring', 0, 0, edge, edge, color, REVEAL_FX.ring), color);
    const orbit = scene.add.container(0, 0);
    const count = REVEAL.orbit.count[k]!;
    const [r0, r1] = REVEAL.orbit.radius;
    const sparkColors = ultra ?? [color, neutral];
    for (let i = 0; i < count; i++) {
      // Rayons et tailles étalés par le nombre d'or : réguliers sans être alignés.
      const a = (2 * Math.PI * i) / count;
      const r = r0 + (r1 - r0) * ((i * 0.618) % 1);
      const s = 14 + 10 * ((i * 0.382) % 1);
      const c = sparkColors[i % sparkColors.length]!;
      const star = tinted(light(scene, 'star', r * Math.cos(a), r * Math.sin(a), s, s, c, REVEAL_FX.orbit), c);
      orbit.add(star);
      loop({
        targets: star, alpha: 0.3, scale: star.scaleX * 0.6, duration: 300 + 40 * (i % 5), yoyo: true, repeat: -1,
        ease: 'Sine.easeInOut', delay: 60 * i,
      });
    }
    fx.add([haloBox, rayBox, ring, orbit]);
    core.add([
      tinted(light(scene, 'glow', 0, 0, or * 3, or * 3, color, REVEAL_FX.core[0]), color),
      tinted(light(scene, 'glow', 0, 0, or * 2, or * 2, color, REVEAL_FX.core[1]), color),
      tinted(light(scene, 'glow', 0, 0, or * 0.9, or * 0.9, neutral, REVEAL_FX.core[2]), neutral),
    ]);
    seq.tween({ targets: rayBox, scale: 1, duration: 260, ease: 'Back.easeOut' });
    seq.tween({ targets: holder, scale: REVEAL.orbScale * REVEAL.pulse[k]!, duration: 180, yoyo: true, ease: 'Quad.easeOut' });
    loop({ targets: long, angle: 360, duration: (360 / Math.abs(m.rayTurn[0])) * 1000, repeat: -1 });
    loop({ targets: short, angle: -360, duration: (360 / Math.abs(m.rayTurn[1])) * 1000, repeat: -1 });
    loop({
      targets: [long, short], alpha: REVEAL_FX.rayBreath, duration: m.rayBreath, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    loop({
      targets: [core, haloBox], scale: REVEAL.coreBreath, duration: m.coreBreath, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    loop({ targets: orbit, angle: 360, duration: m.orbit, repeat: -1 });
    if (ultra) {
      // Ultra rare : rayons, halo et cœur passent par toutes les couleurs de rareté, en boucle
      // (les rayons décalés entre eux) ; sinon l'additif fondait l'arc-en-ciel dans le rose.
      const hue = { v: 0 };
      const at = (p: number) => mix(ultra[Math.floor(p) % ultra.length]!, ultra[(Math.floor(p) + 1) % ultra.length]!, p % 1);
      const washes = [...haloBox.list, ...core.list.slice(0, 2)] as Phaser.GameObjects.Image[];
      loop({
        targets: hue, v: ultra.length, duration: m.hueCycle, repeat: -1,
        onUpdate: () => {
          rays.forEach((ray, j) => tinted(ray, at(hue.v + j)));
          washes.forEach(w => tinted(w, at(hue.v)));
        },
      });
    }

    // Onde de choc en lumière ; double à partir de Légendaire.
    const waves = k >= 3 ? 2 : 1;
    for (let w = 0; w < waves; w++) {
      const d = (2 * REVEAL.wave[k]!) / RING_PEAK;
      const wave = light(scene, 'ring', 0, 0, d, d, w === 0 ? neutral : color, 1);
      const s1 = wave.scaleX;
      wave.setScale(s1 * 0.3);
      fx.add(wave);
      seq.tween({ targets: wave, scale: s1, alpha: 0, duration: m.wave, delay: w * m.waveGap, ease: 'Cubic.easeOut' });
    }

    // Explosion de particules : nombre, vitesse et formes montent avec le rang. Une
    // fausse piste explose comme un vrai palier : elle doit y faire croire.
    particles.stopStreams();
    const speed = REVEAL.burstSpeed[k]!;
    particles.burst({
      x, y, count: REVEAL.burst[k]!, colors: k === 0 ? [color] : colorsOf(rarity), shapes: SHAPES[k]!,
      speed: [speed * 0.3, speed], size: [3, 5 + 1.5 * k], life: [500, 900 + 180 * k],
      spawnRadius: [or * 0.6, or * REVEAL.orbScale], gravity: k >= 2 ? 260 : 60, drag: 1.1,
    });
    // Lueurs additives : la lumière du palier qui inonde la nuit.
    particles.burst({
      x, y, count: REVEAL.glows[k]!, colors: colorsOf(rarity), shapes: ['glow'],
      speed: [30, 150], size: [8, 14 + 2 * k], life: [500, 950], spawnRadius: [0, or],
    });
    // Pluie d'étoiles pour les deux plus hauts paliers.
    if (k >= 3) rain(particles, rarity, t.final[rarity], k === 4 ? 90 : 50);

    // Le nom de la rareté n'apparaît qu'au vrai palier : une fausse piste reste muette. Il
    // rebondit deux fois, et l'emblème de la rareté se pose à sa gauche, en tampon.
    if (last) {
      label.setText(`${labelOf(rarity)}\u00a0!`).setScale(0.6);
      const gap = 8;
      const e = REVEAL.emblem;
      label.setX(x + (e + gap) / 2);
      seq.tween({ targets: label, alpha: 1, scale: 1, duration: m.labelIn, ease: 'Back.easeOut' });
      seq.at(m.labelRebound, () => seq.tween({
        targets: label, scale: REVEAL.labelRebound, duration: m.labelReboundMs / 2, yoyo: true, ease: 'Quad.easeOut',
      }));
      emblem = makeEmblem(scene, 0, 0, e, rarity);
      emblem.setPosition(label.x - label.width / 2 - gap - e / 2, REVEAL.labelY).setAlpha(0);
      modal.add(emblem);
      const s0 = emblem.scaleX;
      seq.at(m.emblemDelay, () => {
        emblem?.setAlpha(1).setScale(s0 * REVEAL.emblemStamp);
        seq.tween({ targets: emblem, scale: s0, duration: m.emblemIn, ease: 'Back.easeOut' });
      });
    }
  };

  // Leurre, avant la transition : le cœur du faux palier a le hoquet (FR-021).
  const hiccup = () => {
    seq.tween({
      targets: orb, scale: { from: 1 + REVEAL.hiccup, to: 1 - REVEAL.hiccup }, duration: m.hiccups / 6,
      yoyo: true, repeat: 2, ease: 'Sine.easeInOut', onComplete: () => orb.setScale(1),
    });
  };

  const transition = (kind: RevealKind) => {
    particles.stopStreams();
    stopLoops();
    scene.tweens.killTweensOf([holder, orb, core, ...(rayBox ? [rayBox] : []), ...(haloBox ? [haloBox] : [])]);
    if (kind === 'rise') {
      // Montée : l'orbe aspire tout (énergie, rayons, cœur), s'étire, puis éclate plus haut.
      particles.stream(() => particles.converge({
        x, y, colors: [neutral, ...REVEAL_FX.charge], shapes: ['spark', 'glow'],
        radius: [90, 180], size: [2, 4], life: [140, 200],
      }, 1), 140, 220, m.riseSuck);
      const suck = { duration: m.riseSuck, ease: 'Quad.easeIn' };
      seq.tween({ targets: core, scale: REVEAL.riseSuck, ...suck });
      if (rayBox) seq.tween({ targets: rayBox, scale: REVEAL.riseSuck * 0.6, alpha: 0.5, ...suck });
      if (haloBox) seq.tween({ targets: haloBox, scale: REVEAL.riseSuck, ...suck });
      seq.tween({ targets: holder, angle: { from: -12, to: 12 }, duration: 50, yoyo: true, repeat: 1 });
      seq.at(m.riseSuck, () => {
        holder.setAngle(0);
        const rest = t.transition - m.riseSuck;
        seq.tween({ targets: holder, scaleY: REVEAL.orbScale * REVEAL.riseStretch, duration: rest, ease: 'Quad.easeIn' });
        seq.tween({ targets: flash, alpha: 0.9, duration: rest, ease: 'Quad.easeIn' });
        particles.burst({
          x, y, count: 30, colors: [REVEAL_FX.sparkle, ...REVEAL_FX.charge], shapes: ['spark'],
          speed: [250, 480], size: [2, 4], life: [220, 420], drag: 2,
        });
      });
    } else {
      // Leurre : la lumière vire à l'éteint, les rayons s'éteignent un à un, le tout se
      // dégonfle et tombe ; l'énergie retombe en cendres.
      particles.fadeAll(t.transition);
      particles.burst({
        x, y, count: 24, colors: [REVEAL_FX.fizzle], shapes: ['dot'], speed: [20, 90],
        angle: [0, Math.PI], spawnRadius: [10, or], size: [2, 4], life: [500, 800], gravity: 420,
      });
      const from = new Map(tints);
      const p = { v: 0 };
      seq.tween({
        targets: p, v: 1, duration: m.fizzle,
        onUpdate: () => from.forEach((c, img) => img.setTint(mix(c, REVEAL_FX.fizzle, p.v))),
      });
      const step = (t.transition - 60) / Math.max(1, rays.length);
      rays.forEach((ray, j) => seq.tween({ targets: ray, alpha: 0, duration: 60, delay: j * step }));
      const fall = { duration: t.transition, ease: 'Cubic.easeIn' };
      seq.tween({ targets: [holder, fx], y: y + REVEAL.drop, ...fall });
      seq.tween({ targets: holder, scale: REVEAL.orbScale * 0.8, ...fall });
      seq.tween({ targets: core, alpha: 0.4, ...fall });
      if (haloBox) seq.tween({ targets: haloBox, scale: 0.5, alpha: 0, ...fall });
      if (circle) seq.tween({ targets: circle, alpha: 0.3, duration: t.transition });
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
      if (plan.kind === 'lure') seq.at(time + t.fakeStep - m.hiccups, hiccup);
      seq.at(time + t.fakeStep, () => transition(plan.kind));
      time += t.fakeStep + t.transition;
    }
  });

  // Sortie naturelle (FR-020) : un voile de lumière monte sur la fin, puis survit à la
  // fenêtre et s'efface sur l'écran suivant (cartes ou présentation) : l'écran de tirage
  // ne réapparaît jamais entre les deux. Un appui pour passer n'en a pas (SC-002).
  let veil: Phaser.GameObjects.Rectangle | null = null;
  seq.onStop(() => {
    veil?.destroy();
    veil = null;
  });
  seq.at(time - m.outro, () => {
    // En lumière additive : un voile clair en mélange normal grisait la nuit à mi-course.
    veil = scene.add.rectangle(0, 0, WIDTH, HEIGHT, REVEAL_FX.flash, 1).setOrigin(0).setDepth(REVEAL.veilDepth).setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD);
    seq.tween({ targets: veil, alpha: 1, duration: m.outro, ease: 'Quad.easeIn' });
  });
  seq.at(time, () => {
    const v = veil;
    veil = null;
    onDone();
    if (!v) return;
    scene.tweens.killTweensOf(v);
    v.setAlpha(1);
    scene.tweens.add({ targets: v, alpha: 0, duration: m.outroFade, ease: 'Quad.easeOut', onComplete: () => v.destroy() });
  });
  scheduleCues(seq, revealCues(plan), lead, onCue);
  return seq;
}

// Carte du ×10. `pivot` porte la place, l'échelle et l'inclinaison (distribution, voyage de la
// vedette, battement) ; `body`, centré dedans, porte le retournement en relief (écrasement,
// soulèvement), pour que les deux mouvements ne s'écrasent pas l'un l'autre (leçon 004).
interface FlipCard {
  readonly r: Rect;
  readonly rarity: Rarity;
  readonly home: { readonly x: number; readonly y: number };
  readonly pivot: Phaser.GameObjects.Container;
  readonly body: Phaser.GameObjects.Container;
  readonly face: Phaser.GameObjects.Container;
  readonly back: readonly (Phaser.GameObjects.Graphics | Phaser.GameObjects.Text | Phaser.GameObjects.Image)[];
  // Lueur de la rareté autour du dos, pendant l'anticipation.
  readonly glow: Phaser.GameObjects.Graphics;
  // Ombre d'encre qui s'écarte quand la carte se soulève (relief, B4).
  readonly shadow: Phaser.GameObjects.Graphics;
  // Éclair neutre sur la face qui apparaît.
  readonly flash: Phaser.GameObjects.Rectangle;
}

function makeFlipCard(
  scene: Phaser.Scene, modal: Phaser.GameObjects.Container, r: Rect, face: Phaser.GameObjects.Container, rarity: Rarity,
): FlipCard {
  const home = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
  const pivot = scene.add.container(home.x, home.y);
  const body = scene.add.container(0, 0);
  face.setPosition(-home.x, -home.y).setVisible(false);
  const glow = scene.add.graphics().setAlpha(0);
  const pad = REVEAL_FX.glowStroke / 2;
  glow.lineStyle(REVEAL_FX.glowStroke, COLORS.rarity[rarity], 1)
    .strokeRoundedRect(-r.w / 2 - pad, -r.h / 2 - pad, r.w + 2 * pad, r.h + 2 * pad, RADIUS + pad);
  const off = RESULTS.shadow[0];
  const shadow = scene.add.graphics().setPosition(off, off);
  shadow.fillStyle(CARD_FX.shadow, CARD_FX.shadowAlpha).fillRoundedRect(-r.w / 2, -r.h / 2, r.w, r.h, RADIUS);
  const flash = scene.add.rectangle(0, 0, r.w, r.h, CARD_FX.flash, 1).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
  // Dos illustré (007) ; en repli, l'aplat et le « ? » d'avant.
  const art = uiImage(scene, 'card-back', 0, 0, r.w, r.h);
  let back: FlipCard['back'];
  if (art) back = [art];
  else {
    const g = scene.add.graphics();
    g.fillStyle(REVEAL_FX.cardBack, 1).fillRoundedRect(-r.w / 2, -r.h / 2, r.w, r.h, RADIUS);
    g.lineStyle(STROKE.base, COLORS.ink, 1).strokeRoundedRect(-r.w / 2, -r.h / 2, r.w, r.h, RADIUS);
    back = [g, scene.add.text(0, 0, '?', textStyle(FONT_SIZE.title)).setOrigin(0.5)];
  }
  body.add([shadow, glow, face, ...back, flash]);
  pivot.add(body);
  modal.add(pivot);
  return { r, rarity, home, pivot, body, face, back, glow, shadow, flash };
}

// Retournement du ×10, au calendrier de la logique (flipSchedule). Révision 3 (FR-022 à
// FR-024) : les dos sont distribués depuis l'orbe, sur la nuit ; chaque carte se soulève en se
// retournant (relief, ombre, éclair) ; une carte rare tremble et s'allume avant de tourner ;
// avant la vedette, un voile de nuit assombrit les autres et elle gagne le centre, au premier
// plan, bat, se retourne et éclate là, puis regagne sa case une fois tout fini. La face apparaît
// toujours à mi-retournement (at + anticipation + turn / 2) : le son des cartes s'y cale.
// `finish` retourne tout d'un coup (appui du joueur) ; onDone est appelé une seule fois.
// Mouvement réduit : cartes posées d'emblée, vedette à sa place, aucun reflet.
export function playFlip(
  scene: Phaser.Scene,
  modal: Phaser.GameObjects.Container,
  faces: readonly Phaser.GameObjects.Container[],
  results: readonly PullResult[],
  schedule: FlipSchedule,
  reduced: boolean,
  onCue: (cue: Cue, variant?: SoundVariant, delay?: number) => void,
  onDone: (tapped: boolean) => void,
  lead = 0,
): { seq: Sequence; finish: (tapped: boolean) => void } {
  lightTextures(scene);
  const m = CARD_MOTION;
  const cards = faces.map((face, i) => makeFlipCard(scene, modal, resultCardRect(i), face, results[i]!.item.rarity));
  const particles = new Particles(scene, modal, 2);
  const seq = new Sequence(scene);
  const starStep = schedule.steps[schedule.steps.length - 1]!;
  const star = cards[starStep.index]!;
  const sc = RESULTS.starCenter;
  // Rectangle de la vedette au centre, agrandie : son éclat et son onde partent de là.
  const starRect: Rect = {
    x: sc.x - (star.r.w * RESULTS.starScale) / 2, y: sc.y - (star.r.h * RESULTS.starScale) / 2,
    w: star.r.w * RESULTS.starScale, h: star.r.h * RESULTS.starScale,
  };
  let starAway = false;

  // Distribution depuis l'orbe (FR-022) : chaque dos part du centre de la révélation, petit et
  // incliné, et vole jusqu'à sa case ; une lueur neutre marque l'orbe le temps de la donne.
  if (!reduced) {
    const { x, y } = REVEAL.center;
    const size = GACHA.orb.r * 3;
    const dealGlow = light(scene, 'glow', x, y, size, size, ART_FX.crackLight, 0);
    modal.addAt(dealGlow, modal.getIndex(cards[0]!.pivot));
    const dealEnd = schedule.deal[schedule.deal.length - 1]! + FLIP_TIMING.deal.flight;
    seq.tween({
      targets: dealGlow, alpha: CARD_FX.dealGlowAlpha, duration: m.dealGlow, ease: 'Quad.easeOut',
      onComplete: () => seq.tween({
        targets: dealGlow, alpha: 0, delay: Math.max(0, dealEnd - 2 * m.dealGlow), duration: m.dealGlow,
        onComplete: () => dealGlow.destroy(),
      }),
    });
    cards.forEach((c, i) => {
      c.pivot.setPosition(x, y).setScale(RESULTS.dealScale).setAngle(i % 2 === 0 ? -RESULTS.dealTilt : RESULTS.dealTilt)
        .setVisible(false);
      seq.at(schedule.deal[i]!, () => {
        c.pivot.setVisible(true);
        particles.burst({
          x, y, count: 4, colors: [ART_FX.crackLight, ...REVEAL_FX.charge], shapes: ['spark'],
          speed: [80, 200], size: [1.5, 3], life: [200, 350], drag: 2,
        });
        seq.tween({
          targets: c.pivot, x: c.home.x, y: c.home.y, scale: 1, angle: 0,
          duration: FLIP_TIMING.deal.flight, ease: 'Cubic.easeOut',
        });
      });
    });
  }

  const show = (c: FlipCard) => {
    c.back.forEach(o => o.setVisible(false));
    c.glow.setAlpha(0);
    c.face.setVisible(true);
  };
  // « Garanti ! » se pose en tampon quand sa carte se retourne (B5).
  const stamp = (c: FlipCard) => {
    const sticker = c.face.getByName('sticker') as Phaser.GameObjects.Container | null;
    if (sticker && !reduced) seq.tween({ targets: sticker, scale: { from: 1.6, to: 1 }, duration: m.stamp, ease: 'Back.easeOut' });
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
    star.body.addAt(g, 1);
  };

  // Anticipation : le dos tremble et la lueur de la rareté pulse ; l'énergie converge.
  const anticipate = (c: FlipCard, ms: number) => {
    const k = rankOf(c.rarity);
    seq.tween({ targets: c.glow, alpha: { from: 0.3, to: 1 }, duration: 120, yoyo: true, repeat: -1 });
    seq.tween({ targets: c.pivot, angle: { from: -1.5 * k, to: 1.5 * k }, duration: 50, yoyo: true, repeat: -1 });
    particles.stream(() => particles.converge({
      x: c.home.x, y: c.home.y, colors: colorsOf(c.rarity), shapes: ['spark', 'dot'], radius: [60, 110], size: [2, 3],
      life: [200, 300],
    }, 1), 15 + 10 * k, 30 + 15 * k, Math.max(0, ms - 200));
  };

  // Voile de nuit entre la vedette et les autres (FR-023) : posé à la pause d'avant la vedette.
  const dim = scene.add.rectangle(0, 0, WIDTH, HEIGHT, CARD_FX.dim, 1).setOrigin(0).setAlpha(0);
  modal.add(dim);
  seq.at(starStep.at - FLIP_TIMING.starPause, () => {
    modal.bringToTop(dim);
    modal.bringToTop(star.pivot);
    modal.bringToTop(particles.graphics);
    seq.tween({ targets: dim, alpha: CARD_FX.dimAlpha, duration: m.dim, ease: 'Quad.easeOut' });
    if (reduced) return;
    // La vedette quitte sa case pour le centre, agrandie, au premier plan.
    starAway = true;
    seq.tween({
      targets: star.pivot, x: sc.x, y: sc.y, scale: RESULTS.starScale, angle: 0, duration: m.toCenter, ease: 'Cubic.easeOut',
    });
  });

  // Vedette : son dos bat comme un cœur, l'énergie converge vers elle.
  const heartbeat = (c: FlipCard, ms: number) => {
    const k = rankOf(c.rarity);
    const base = starAway ? RESULTS.starScale : 1;
    const at = starAway ? sc : c.home;
    seq.tween({ targets: c.glow, alpha: 1, duration: ms * 0.3 });
    const beats = k >= 3 ? 3 : 2;
    const beat = ms / beats;
    for (let b = 0; b < beats; b++) {
      seq.at(b * beat, () => seq.tween({
        targets: c.pivot, scale: base * (1.08 + 0.02 * k), duration: beat * 0.3, yoyo: true, ease: 'Quad.easeOut',
      }));
    }
    particles.stream(() => particles.converge({
      x: at.x, y: at.y, colors: colorsOf(c.rarity), shapes: ['spark', 'dot'], radius: [80 * base, 150 * base], size: [2, 4],
      life: [250, 380],
    }, 1), 20 + 10 * k, 60 + 20 * k, Math.max(0, ms - 300));
  };

  // Retournement en relief (B4) : la carte s'écrase en se soulevant (étirée, montée, ombre qui
  // s'écarte), la face apparaît à mi-course dans un éclair, puis elle retombe avec un rebond.
  const turn = (c: FlipCard, ms: number, isStar: boolean) => {
    scene.tweens.killTweensOf([c.pivot, c.glow, c.body, c.shadow]);
    const base = isStar && starAway ? RESULTS.starScale : 1;
    c.pivot.setAngle(0).setScale(base);
    const k = rankOf(c.rarity);
    const [near, far] = RESULTS.shadow;
    const r = isStar && starAway ? starRect : c.r;
    seq.tween({ targets: c.shadow, x: far, y: far, duration: ms / 2, ease: 'Sine.easeIn' });
    seq.tween({
      targets: c.body, scaleX: 0, scaleY: RESULTS.liftScale, y: -RESULTS.lift, duration: ms / 2, ease: 'Sine.easeIn',
      onComplete: () => {
        show(c);
        stamp(c);
        if (isStar) highlight();
        c.flash.setAlpha(CARD_FX.flashAlpha);
        seq.tween({ targets: c.flash, alpha: 0, duration: m.flash, ease: 'Quad.easeOut' });
        cardBurst(particles, r, c.rarity, isStar ? 1.6 : 1);
        if (k >= 2 || isStar) cardWave(scene, seq, modal, r, COLORS.rarity[c.rarity]);
        // Même durée que les paillettes de la vedette (src/data/sounds.ts).
        if (isStar && k >= 3) rain(particles, c.rarity, STAR_RAIN_MS, k === 4 ? 35 : 20);
        const bounce = REVEAL.cardBounce[k]! + (isStar ? 0.06 : 0);
        seq.tween({ targets: c.shadow, x: near, y: near, duration: ms / 2, ease: 'Back.easeOut' });
        seq.tween({
          targets: c.body, scaleX: bounce, scaleY: bounce, y: 0, duration: ms / 2, ease: 'Back.easeOut', easeParams: [1.4],
          onComplete: () => seq.tween({ targets: c.body, scaleX: 1, scaleY: 1, duration: 120, ease: 'Quad.easeIn' }),
        });
      },
    });
  };

  let done = false;
  const finish = (tapped: boolean) => {
    if (done) return;
    done = true;
    seq.stop();
    particles.stopStreams();
    scene.tweens.killTweensOf(cards.flatMap(c => [c.pivot, c.glow, c.body, c.shadow, c.flash]));
    scene.tweens.killTweensOf(dim);
    const [near] = RESULTS.shadow;
    cards.forEach(c => {
      show(c);
      c.body.setScale(1).setY(0);
      c.shadow.setPosition(near, near);
      c.flash.setAlpha(0);
      c.pivot.setVisible(true).setAngle(0);
      const sticker = c.face.getByName('sticker') as Phaser.GameObjects.Container | null;
      sticker?.setScale(1);
      // Fin naturelle : la vedette regagne sa case et le voile se retire en douceur ; à l'appui,
      // tout se pose d'un coup.
      if (c === star && starAway && !tapped) {
        scene.tweens.add({ targets: c.pivot, x: c.home.x, y: c.home.y, scale: 1, duration: m.back, ease: 'Back.easeOut' });
      } else {
        c.pivot.setPosition(c.home.x, c.home.y).setScale(1);
      }
    });
    if (tapped || dim.alpha === 0) dim.destroy();
    else scene.tweens.add({ targets: dim, alpha: 0, duration: m.undim, onComplete: () => dim.destroy() });
    highlight();
    sparkleBest(particles, cards);
    glossBest(scene, modal, cards, reduced);
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
  // Le son d'une carte vient de sa colonne (FR-020).
  const panOf = (i: number) => (2 * (resultCardRect(i).x + resultCardRect(i).w / 2) / WIDTH - 1) * PAN_SPREAD;
  scheduleCues(seq, flipCues(schedule, panOf), lead, onCue);
  return { seq, finish };
}
