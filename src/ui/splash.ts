import Phaser from 'phaser';
import { RARITIES, type Rarity } from '../data/gachaConfig';
import type { SplashVariant } from '../data/sounds';
import type { PullResult } from '../logic/gacha';
import { artKey, hasArt, uiImage } from './art';
import { HEIGHT, SPLASH, SPLASH_MOTION, SPLASH_TIMING, WIDTH } from './layout';
import { Particles } from './particles';
import { Sequence, colorsOf } from './reveal';
import { ART_FX, COLORS, CSS, FONT_SIZE, RADIUS, STROKE } from './theme';
import { makeBadge, makeEmblem, makePortrait, textStyle } from './widgets';

export interface SplashOptions {
  // Réduire les animations (FR-019, SC-009) : la présentation s'affiche d'emblée dans son
  // état final, immobile.
  readonly reduced: boolean;
  // La nuit tombe en fondu sur un écran clair (résultats du ×10) ; au ×1, la révélation
  // finit déjà de nuit et un fondu laisserait voir l'écran de tirage.
  readonly fadeIn: boolean;
}

export interface Splash {
  // Ferme la présentation : tout s'arrête, plus rien ne réagit, et elle s'efface par-dessus
  // l'écran suivant, qui s'ouvre aussitôt (aucun signal de l'e2e n'attend la sortie).
  leave(): void;
}

const T = SPLASH_TIMING;
const M = SPLASH_MOTION;
const V = Phaser.Math.Vector2;

// Le nom tombé en tampon touche « le sol » à 45 % de son entrée : la poussière d'étoiles part
// de là, et le « ta-da » de la fanfare y tombe.
const NAME_LANDS = 0.45;

// Instants de la fanfare (005, FR-021), pris sur ceux de l'image : l'impact sur l'éclair, le
// « ta-da » sur le nom. En mouvement réduit, tout est là d'emblée : l'impact part tout de suite.
export function splashSound(rarity: Rarity, reduced: boolean): SplashVariant {
  const flash = reduced ? 0 : T.silhouette;
  return { kind: 'splash', rarity, flash, stamp: flash + T.nameDelay + T.name * NAME_LANDS };
}

// Phase pour l'e2e : `silhouette`, puis `color` après l'éclair (FR-020).
const setPhase = (phase: 'silhouette' | 'color') => { document.body.dataset.splashPhase = phase; };

// Présentation plein écran d'un Légendaire ou d'un Ultra rare (007, FR-003 ; révision du
// 2026-11-13, FR-020). L'élément entre en silhouette cernée de lumière, un éclair le révèle
// en couleur sur des rayons qui tournent sans fin, puis le nom se pose d'un coup de tampon,
// suivi de l'emblème, du ruban et du badge. L'appui n'est armé qu'après SPLASH.armMs, une
// fois l'éclair passé : un appui répété (sur « passer ») ne la ferme pas à l'insu du joueur.
// Aucun hasard ici hors du générateur décoratif des particules.
export function playSplash(
  scene: Phaser.Scene,
  modal: Phaser.GameObjects.Container,
  result: PullResult,
  ownedCount: number,
  options: SplashOptions,
  onTap: () => void,
): Splash {
  const seq = new Sequence(scene);
  const { reduced } = options;
  const { item } = result;
  const rank = RARITIES.find(r => r.id === item.rarity)!.rank;
  const color = COLORS.rarity[item.rarity];
  const colors = colorsOf(item.rarity);
  const { x, y, w, h } = SPLASH.art;
  const flashAt = T.silhouette;

  const night = uiImage(scene, 'bg-reveal', WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT)
    ?? scene.add.rectangle(0, 0, WIDTH, HEIGHT, ART_FX.night, ART_FX.nightAlpha).setOrigin(0);
  modal.add(night);
  if (options.fadeIn && !reduced) seq.tween({ targets: night, alpha: { from: 0, to: 1 }, duration: T.enter });

  // Rayons : deux couches additives dessinées une fois, puis tournées en sens contraires
  // (aucun Graphics redessiné à chaque image : le rendu logiciel de la CI est lent).
  const rays = ART_FX.splashRayAlpha.map((alpha, layer) => {
    const g = scene.add.graphics().setPosition(x, y).setBlendMode(Phaser.BlendModes.ADD);
    const n = layer === 0 ? 14 + 4 * rank : 10 + 2 * rank;
    // Couche du dessus dans la couleur de la rareté, celle du dessous en lumière pâle :
    // un orange faible, seul, vire au brun sur la nuit.
    const palette = item.rarity === 'ultra' ? ART_FX.splashUltraRays : [layer === 0 ? color : ART_FX.crackLight];
    const width = layer === 0 ? 0.45 : 0.8;
    for (let j = 0; j < n; j++) {
      const a = (2 * Math.PI * (j + layer * 0.5)) / n;
      const s = (Math.PI / n) * width;
      // Trois longueurs empilées : le rayon est plus vif près du centre, et s'éteint au loin.
      for (const len of [470, 300, 170]) {
        g.fillStyle(palette[j % palette.length]!, alpha / 2)
          .fillPoints([new V(0, 0), new V(len * Math.cos(a - s), len * Math.sin(a - s)), new V(len * Math.cos(a + s), len * Math.sin(a + s))], true);
      }
    }
    return g;
  });
  const halo = scene.add.graphics().setPosition(x, y).setBlendMode(Phaser.BlendModes.ADD);
  for (const k of [1, 0.78, 0.56, 0.36]) halo.fillStyle(color, ART_FX.splashHaloAlpha).fillCircle(0, 0, 150 * k);
  modal.add([...rays, halo]);
  if (!reduced) {
    T.raySpeed.forEach((speed, i) => seq.tween({
      targets: rays[i], angle: Math.sign(speed) * 360, duration: (360 / Math.abs(speed)) * 1000, repeat: -1,
    }));
    for (const g of [...rays, halo]) g.setAlpha(0).setScale(M.raysFrom);
    seq.tween({ targets: [...rays, halo], alpha: 1, scale: 1, duration: T.raysOpen, delay: flashAt, ease: 'Cubic.easeOut' });
    seq.tween({
      targets: halo, scale: { from: 1, to: M.halo }, duration: T.halo, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      delay: flashAt + T.raysOpen,
    });
  }

  const particles = new Particles(scene, modal, 7);

  // L'illustration en couleur ; repli sur la pastille sans elle (FR-010). Un conteneur la
  // porte, centré sur elle : le rebond et la respiration se font autour de son centre.
  const image = hasArt(scene, item) ? scene.add.image(0, 0, artKey(item.id)).setDisplaySize(w, h) : null;
  const art = scene.add.container(x, y, [image ?? makePortrait(scene, 0, 0, 150, item, true)]);
  modal.add(art);

  // Silhouette : la même image, en aplat plus sombre que la nuit, cernée de copies
  // lumineuses de la couleur de la rareté (mélange additif, décalées de quelques pixels).
  const shadow = scene.add.container(x, y);
  if (image) {
    for (let k = 0; k < 8; k++) {
      const a = (Math.PI / 4) * k;
      shadow.add(scene.add.image(M.rim * Math.cos(a), M.rim * Math.sin(a), artKey(item.id)).setDisplaySize(w, h)
        .setTint(color).setTintMode(Phaser.TintModes.FILL).setBlendMode(Phaser.BlendModes.ADD).setAlpha(ART_FX.splashRimAlpha));
    }
    // Deux aplats empilés : les parties translucides (verre d'un casque) restent sombres,
    // le liseré ne transparaît pas au travers.
    for (let k = 0; k < 2; k++) {
      shadow.add(scene.add.image(0, 0, artKey(item.id)).setDisplaySize(w, h)
        .setTint(ART_FX.splashSilhouette).setTintMode(Phaser.TintModes.FILL));
    }
  }
  modal.add(shadow);

  // Éclair plein écran et onde de choc, au-dessus de l'illustration.
  const flash = scene.add.rectangle(0, 0, WIDTH, HEIGHT, ART_FX.crackLight, ART_FX.splashFlashAlpha).setOrigin(0).setAlpha(0);
  const shock = scene.add.graphics().setPosition(x, y).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
  shock.lineStyle(10, color, ART_FX.splashShockAlpha).strokeCircle(0, 0, 120);
  shock.lineStyle(3, ART_FX.crackLight, ART_FX.splashShockAlpha).strokeCircle(0, 0, 116);
  modal.add([shock, flash]);

  if (reduced) {
    shadow.setVisible(false);
    setPhase('color');
  } else {
    setPhase('silhouette');
    art.setVisible(false);
    // La silhouette monte et grandit pendant que l'énergie converge vers elle.
    shadow.setScale(M.silhouetteFrom).setAlpha(0);
    seq.tween({ targets: shadow, scale: 1, duration: T.silhouette, ease: 'Cubic.easeOut' });
    seq.tween({ targets: shadow, alpha: 1, duration: T.silhouette * 0.4 });
    particles.converge({
      x, y, colors, shapes: ['spark', 'glow'], radius: [140, 230], size: [2, 5], life: [T.silhouette * 0.7, T.silhouette],
    }, 26 + 8 * rank);
    seq.at(flashAt, () => {
      setPhase('color');
      shadow.setVisible(false);
      art.setVisible(true).setScale(M.popFrom);
      seq.tween({ targets: art, scale: 1, duration: T.pop, ease: 'Back.easeOut' });
      flash.setAlpha(1);
      seq.tween({ targets: flash, alpha: 0, duration: T.flash, ease: 'Quad.easeOut' });
      shock.setAlpha(1).setScale(M.shock[0]);
      seq.tween({ targets: shock, scale: M.shock[1], alpha: 0, duration: T.shock, ease: 'Cubic.easeOut' });
      particles.burst({
        x, y, count: 70 + 30 * (rank - 3), colors, shapes: ['star', 'confetti', 'spark', 'glow'],
        speed: [120, 420], size: [3, 7], life: [700, 1400], spawnRadius: [20, 80], gravity: 160, drag: 1.2,
      });
      // Étoiles qui scintillent ici et là tant que la présentation reste ouverte.
      particles.stream(() => particles.burst({
        x: particles.between(20, WIDTH - 20), y: particles.between(60, 460), count: 1, colors, shapes: ['star', 'glow'],
        speed: [5, 25], size: [3, 6], life: [600, 1100],
      }), 14, 14, Infinity);
    });
    // Repos : lévitation et respiration, une fois le rebond fini.
    const rest = flashAt + T.pop;
    seq.tween({ targets: art, y: { from: y, to: y - M.levitate }, duration: T.levitate, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: rest });
    seq.tween({ targets: art, scale: { from: 1, to: M.breathe }, duration: T.breathe, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: rest });
  }

  // Nom, rareté, phrase.
  const named = { ...textStyle(FONT_SIZE.title + 4, ART_FX.splashText), stroke: ART_FX.splashStroke, strokeThickness: 7 };
  const name = scene.add.text(WIDTH / 2, SPLASH.nameY, item.name, named).setOrigin(0.5);
  const label = scene.add.text(0, SPLASH.rarityY, RARITIES[rank]!.label,
    { ...textStyle(FONT_SIZE.button, ART_FX.splashText), stroke: ART_FX.splashStroke, strokeThickness: 5 }).setOrigin(0, 0.5);
  const icon = 30;
  const left = WIDTH / 2 - (icon + 6 + label.width) / 2;
  label.setX(left + icon + 6);
  // L'emblème tourne sur lui-même : un conteneur centré le porte (repli dessiné compris).
  const emblem = scene.add.container(left + icon / 2, SPLASH.rarityY, [makeEmblem(scene, 0, 0, icon, item.rarity)]);
  const b = SPLASH.blurb;
  const ribbon = scene.add.container(0, 0);
  const plate = scene.add.graphics();
  plate.fillStyle(ART_FX.ribbon, 1).fillRoundedRect(b.x, b.y, b.w, b.h, RADIUS);
  plate.lineStyle(STROKE.base, COLORS.ink, 1).strokeRoundedRect(b.x, b.y, b.w, b.h, RADIUS);
  ribbon.add([plate, scene.add.text(WIDTH / 2, b.y + b.h / 2, item.blurb,
    { ...textStyle(FONT_SIZE.body, CSS.textDim), align: 'center', wordWrap: { width: b.w - 24 } }).setOrigin(0.5)]);
  // Badge en haut à gauche, au-dessus de l'illustration, penché comme un autocollant.
  const sticker = makeBadge(scene, 0, 0, result.isNew ? 'Nouveau !' : `Déjà possédé ×${ownedCount}`, true, 0.5, FONT_SIZE.body);
  const sb = sticker.getBounds();
  sticker.setY(-sb.height / 2);
  const badge = scene.add.container(SPLASH.badge.left + sb.width / 2, SPLASH.badge.y, [sticker]).setRotation(SPLASH.badge.tilt);
  modal.add([name, label, emblem, ribbon, badge]);

  if (!reduced) {
    // Le nom tombe en tampon, 80 ms après l'éclair, et soulève un peu de poussière d'étoiles.
    const stamp = flashAt + T.nameDelay;
    name.setAlpha(0).setScale(M.nameFrom);
    seq.tween({ targets: name, scale: 1, duration: T.name, delay: stamp, ease: 'Back.easeOut' });
    seq.tween({ targets: name, alpha: 1, duration: T.name * 0.35, delay: stamp });
    seq.at(stamp + T.name * NAME_LANDS, () => particles.burst({
      x: WIDTH / 2, y: SPLASH.nameY + 16, count: 18, colors, shapes: ['spark', 'star'],
      speed: [60, 200], size: [2, 4], life: [300, 600], angle: [Math.PI, 2 * Math.PI], spawnRadius: [0, name.width / 2],
      gravity: 300, drag: 2,
    }));
    // L'emblème fait un tour complet en apparaissant ; le libellé glisse à sa suite.
    emblem.setAlpha(0).setScale(0.4);
    seq.tween({ targets: emblem, angle: 360, scale: 1, alpha: 1, duration: T.emblem, delay: flashAt + T.emblemDelay, ease: 'Cubic.easeOut' });
    label.setAlpha(0).setX(label.x - 12);
    seq.tween({ targets: label, x: label.x + 12, alpha: 1, duration: T.emblem * 0.6, delay: flashAt + T.emblemDelay, ease: 'Cubic.easeOut' });
    // Le ruban monte de 12 px.
    ribbon.setAlpha(0).setY(M.ribbonRise);
    seq.tween({ targets: ribbon, y: 0, alpha: 1, duration: T.ribbon, delay: flashAt + T.ribbonDelay, ease: 'Cubic.easeOut' });
    // Le badge saute en place.
    badge.setScale(0);
    seq.tween({ targets: badge, scale: 1, duration: T.badgePop, delay: T.badge, ease: 'Back.easeOut' });
  }

  const hint = scene.add.text(WIDTH / 2, SPLASH.hintY, 'Touche pour continuer', textStyle(FONT_SIZE.small, ART_FX.splashText))
    .setOrigin(0.5).setAlpha(reduced ? 1 : 0);
  const zone = scene.add.zone(0, 0, WIDTH, HEIGHT).setOrigin(0);
  zone.on('pointerup', onTap);
  modal.add([hint, zone]);
  seq.at(SPLASH.armMs, () => {
    zone.setInteractive();
    // Signal pour l'e2e, comme l'appui qui passe la révélation.
    document.body.dataset.skip = 'armed';
    if (!reduced) seq.tween({ targets: hint, alpha: { from: 0.35, to: 1 }, duration: 700, yoyo: true, repeat: -1 });
  });

  return {
    leave() {
      seq.stop();
      delete document.body.dataset.splashPhase;
      if (reduced) {
        modal.destroy();
        return;
      }
      // Plus rien ne réagit : l'écran suivant, ouvert dessous dans la même image, répond déjà.
      modal.each((o: Phaser.GameObjects.GameObject) => { o.disableInteractive(); });
      particles.stopStreams();
      modal.setDepth(modal.depth + 1);
      scene.tweens.killTweensOf([art, flash, shock]);
      flash.setAlpha(0);
      scene.tweens.add({ targets: art, scale: art.scale * M.exitScale, duration: T.exit, ease: 'Cubic.easeIn' });
      scene.tweens.add({ targets: modal, alpha: 0, duration: T.exit, ease: 'Cubic.easeOut', onComplete: () => modal.destroy() });
    },
  };
}
