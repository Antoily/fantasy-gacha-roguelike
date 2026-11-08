import Phaser from 'phaser';
import { RARITIES } from '../data/gachaConfig';
import type { PullResult } from '../logic/gacha';
import { artKey, hasArt, uiImage } from './art';
import { HEIGHT, SPLASH, WIDTH } from './layout';
import { Particles } from './particles';
import { Sequence, colorsOf } from './reveal';
import { ART_FX, COLORS, CSS, FONT_SIZE, RADIUS, STROKE } from './theme';
import { makeBadge, makeEmblem, makePortrait, textStyle } from './widgets';

// Présentation plein écran d'un Légendaire ou d'un Ultra rare (007, FR-003) : nuit,
// rayons et halo de la rareté, illustration qui entre en grand, nom, emblème, phrase.
// L'appui n'est armé qu'après SPLASH.armMs : un appui répété (sur « passer ») ne la ferme
// pas à l'insu du joueur. Aucun hasard ici hors du générateur décoratif des particules.
export function playSplash(
  scene: Phaser.Scene,
  modal: Phaser.GameObjects.Container,
  result: PullResult,
  ownedCount: number,
  onTap: () => void,
): Sequence {
  const seq = new Sequence(scene);
  const { item } = result;
  const rank = RARITIES.find(r => r.id === item.rarity)!.rank;
  const color = COLORS.rarity[item.rarity];
  const { x, y, w, h } = SPLASH.art;

  modal.add(uiImage(scene, 'bg-reveal', WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT)
    ?? scene.add.rectangle(0, 0, WIDTH, HEIGHT, ART_FX.night, ART_FX.nightAlpha).setOrigin(0));

  // Rayons de la rareté qui tournent lentement derrière l'illustration.
  const rays = scene.add.graphics().setPosition(x, y);
  const n = 16 + 4 * rank;
  const V = Phaser.Math.Vector2;
  for (let j = 0; j < n; j++) {
    const a = (2 * Math.PI * j) / n;
    const s = (Math.PI / n) * 0.5;
    rays.fillStyle(color, ART_FX.splashRayAlpha * (j % 2 ? 0.6 : 1))
      .fillPoints([new V(0, 0), new V(460 * Math.cos(a - s), 460 * Math.sin(a - s)), new V(460 * Math.cos(a + s), 460 * Math.sin(a + s))], true);
  }
  const halo = scene.add.graphics().setPosition(x, y);
  for (const k of [1, 0.78, 0.56, 0.36]) halo.fillStyle(color, 0.16).fillCircle(0, 0, 150 * k);
  modal.add([rays, halo]);
  seq.tween({ targets: rays, angle: 360, duration: 30000, repeat: -1 });
  seq.tween({ targets: halo, scale: { from: 0.92, to: 1.06 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

  const particles = new Particles(scene, modal, 7);
  const colors = colorsOf(item.rarity);
  particles.burst({
    x, y, count: 70 + 30 * (rank - 3), colors, shapes: ['star', 'confetti', 'spark', 'glow'],
    speed: [120, 420], size: [3, 7], life: [700, 1400], spawnRadius: [20, 80], gravity: 160, drag: 1.2,
  });
  particles.stream(() => particles.burst({
    x: particles.between(20, WIDTH - 20), y: particles.between(60, 460), count: 1, colors, shapes: ['star', 'glow'],
    speed: [5, 25], size: [3, 6], life: [600, 1100],
  }), 14, 14, Infinity);

  // L'illustration surgit et rebondit ; repli sur la pastille sans elle (FR-010).
  const art = hasArt(scene, item)
    ? scene.add.image(x, y, artKey(item.id)).setDisplaySize(w, h)
    : makePortrait(scene, x, y, 150, item, true);
  modal.add(art);
  const base = art instanceof Phaser.GameObjects.Image ? art.scale : 1;
  art.setScale(base * 0.55).setAlpha(0);
  seq.tween({ targets: art, scale: base, alpha: 1, duration: 420, ease: 'Back.easeOut' });
  seq.tween({ targets: art, y: { from: y + 4, to: y - 4 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 420 });

  const named = { ...textStyle(FONT_SIZE.title + 4, ART_FX.splashText), stroke: ART_FX.splashStroke, strokeThickness: 7 };
  const name = scene.add.text(WIDTH / 2, SPLASH.nameY, item.name, named).setOrigin(0.5);
  const label = scene.add.text(0, SPLASH.rarityY, RARITIES[rank]!.label,
    { ...textStyle(FONT_SIZE.button, ART_FX.splashText), stroke: ART_FX.splashStroke, strokeThickness: 5 }).setOrigin(0, 0.5);
  const icon = 30;
  const left = WIDTH / 2 - (icon + 6 + label.width) / 2;
  label.setX(left + icon + 6);
  const emblem = makeEmblem(scene, left + icon / 2, SPLASH.rarityY, icon, item.rarity);
  const b = SPLASH.blurb;
  const ribbon = scene.add.graphics();
  ribbon.fillStyle(ART_FX.ribbon, 1).fillRoundedRect(b.x, b.y, b.w, b.h, RADIUS);
  ribbon.lineStyle(STROKE.base, COLORS.ink, 1).strokeRoundedRect(b.x, b.y, b.w, b.h, RADIUS);
  const blurb = scene.add.text(WIDTH / 2, b.y + b.h / 2, item.blurb,
    { ...textStyle(FONT_SIZE.body, CSS.textDim), align: 'center', wordWrap: { width: b.w - 24 } }).setOrigin(0.5);
  const badge = makeBadge(scene, WIDTH / 2, SPLASH.badgeY, result.isNew ? 'Nouveau !' : `Déjà possédé ×${ownedCount}`, true, 0.5);
  const texts = [name, label, emblem, ribbon, blurb, badge];
  modal.add(texts);
  for (const t of texts) t.setAlpha(0);
  seq.tween({ targets: texts, alpha: 1, duration: 300, delay: 260 });
  seq.tween({ targets: name, scale: { from: 0.6, to: 1 }, duration: 380, delay: 260, ease: 'Back.easeOut' });

  const hint = scene.add.text(WIDTH / 2, SPLASH.hintY, 'Touche pour continuer', textStyle(FONT_SIZE.small, ART_FX.splashText))
    .setOrigin(0.5).setAlpha(0);
  const zone = scene.add.zone(0, 0, WIDTH, HEIGHT).setOrigin(0);
  zone.on('pointerup', onTap);
  modal.add([hint, zone]);
  seq.at(SPLASH.armMs, () => {
    zone.setInteractive();
    // Signal pour l'e2e, comme l'appui qui passe la révélation.
    document.body.dataset.skip = 'armed';
    seq.tween({ targets: hint, alpha: { from: 0.35, to: 1 }, duration: 700, yoyo: true, repeat: -1 });
  });
  return seq;
}
