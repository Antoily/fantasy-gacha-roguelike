import Phaser from 'phaser';
import type { Item } from '../data/catalogue';
import { RARITIES, type Rarity } from '../data/gachaConfig';
import type { PullResult } from '../logic/gacha';
import { artKey, bustKey, hasArt, headKey, orbSize, shadowKey, uiImage } from './art';
import { R } from './display';
import { ART, HEIGHT, RESULTS, SHEET, WIDTH, type Rect } from './layout';
import {
  ART_FX, COLORS, CSS, FONT_FAMILY, FONT_SIZE, FONT_SIZE_MIN, RADIUS, SCRIM_ALPHA, SHADOW_OFFSET, STROKE,
} from './theme';

// `resolution` : le texte est rastérisé à l'échelle de rendu, net sous la caméra ×R.
export function textStyle(size: number, color: string = CSS.text): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontFamily: FONT_FAMILY, fontSize: `${size}px`, fontStyle: 'bold', color, resolution: R };
}

// Panneau blanc cerné de noir. Dessiné dans un Graphics ajouté au parent fourni.
export function makePanel(scene: Phaser.Scene, r: Rect, fill: number = COLORS.panel): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(fill, 1).fillRoundedRect(r.x, r.y, r.w, r.h, RADIUS);
  g.lineStyle(STROKE.base, COLORS.ink, 1).strokeRoundedRect(r.x, r.y, r.w, r.h, RADIUS);
  return g;
}

export interface Button {
  readonly container: Phaser.GameObjects.Container;
  setEnabled(enabled: boolean): void;
}

// Bouton cerné de noir avec ombre portée pleine. Le sous-titre éventuel tient DANS la
// case : une explication qui accompagne un bouton ne déborde pas dessous.
// Réagit sur pointerup : un appui glissé hors du bouton ne déclenche rien.
// Son d'un appui (005, révision du 2026-11-09 : FR-011), posé une fois par la scène : les
// widgets ne dépendent pas du lecteur de sons.
export type PressSound = 'tap' | 'swish';
let pressSound: (cue: PressSound) => void = () => {};
export function setButtonSound(play: (cue: PressSound) => void) {
  pressSound = play;
}

// `sound` : null pour un bouton qui joue lui-même son retour (le bouton son).
export function makeButton(
  scene: Phaser.Scene,
  r: Rect,
  label: string,
  fill: number,
  onClick: () => void,
  subtitle?: string,
  sound: PressSound | null = 'tap',
): Button {
  const container = scene.add.container(0, 0);
  const g = scene.add.graphics();
  const title = scene.add.text(r.x + r.w / 2, r.y + r.h / 2 - (subtitle ? 10 : 0), label, textStyle(FONT_SIZE.button))
    .setOrigin(0.5);
  const sub = subtitle
    ? scene.add.text(r.x + r.w / 2, r.y + r.h / 2 + 14, subtitle, textStyle(FONT_SIZE.small, CSS.textDim)).setOrigin(0.5)
    : null;
  const zone = scene.add.zone(r.x, r.y, r.w, r.h).setOrigin(0).setInteractive({ useHandCursor: true });
  container.add([g, title, ...(sub ? [sub] : []), zone]);

  let enabled = true;
  const draw = (pressed: boolean) => {
    const dy = pressed ? SHADOW_OFFSET : 0;
    g.clear();
    if (enabled && !pressed) {
      g.fillStyle(COLORS.ink, 1).fillRoundedRect(r.x + SHADOW_OFFSET, r.y + SHADOW_OFFSET, r.w, r.h, RADIUS);
    }
    g.fillStyle(enabled ? fill : COLORS.btn.disabled, 1).fillRoundedRect(r.x + dy, r.y + dy, r.w, r.h, RADIUS);
    g.lineStyle(STROKE.base, COLORS.ink, 1).strokeRoundedRect(r.x + dy, r.y + dy, r.w, r.h, RADIUS);
    title.setY(r.y + r.h / 2 - (subtitle ? 10 : 0) + dy).setColor(enabled ? CSS.text : CSS.textFaint);
    // Grisé avec le titre : un sous-titre resté foncé faisait croire le bouton actif.
    sub?.setY(r.y + r.h / 2 + 14 + dy).setColor(enabled ? CSS.textDim : CSS.textFaint);
  };
  draw(false);

  // Un bouton désactivé sort de la détection des clics (disableInteractive) : ces
  // gestionnaires ne s'exécutent alors jamais.
  zone.on('pointerdown', () => draw(true));
  zone.on('pointerout', () => draw(false));
  zone.on('pointerup', () => {
    draw(false);
    // Avant l'action : « Tirer » remet ensuite le journal des sons à zéro (dataset.sounds).
    if (sound) pressSound(sound);
    onClick();
  });

  return {
    container,
    setEnabled(value: boolean) {
      enabled = value;
      if (value) zone.setInteractive({ useHandCursor: true });
      else zone.disableInteractive();
      draw(false);
    },
  };
}

// Voile papier plein écran : empêche les boutons du dessous de réagir visuellement.
// Il ne suffit PAS à bloquer les actions : Phaser traite deux clics rapprochés dans la
// même image, avant que le voile existe. Les scènes gardent donc leur propre verrou.
// Tout ce qui est ajouté au conteneur s'affiche au-dessus ; le détruire ferme la fenêtre.
export function makeModal(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0).setDepth(100);
  const scrim = scene.add.rectangle(0, 0, WIDTH, HEIGHT, COLORS.scrim, SCRIM_ALPHA).setOrigin(0).setInteractive();
  container.add(scrim);
  return container;
}

// Orbe de l'écran de tirage, centrée sur l'origine du conteneur : la révélation (004)
// la déplace et la fait grossir.
export function makeOrb(scene: Phaser.Scene, r: number): Phaser.GameObjects.Container {
  const size = orbSize(r);
  const img = uiImage(scene, 'orb', 0, 0, size, size);
  if (img) return scene.add.container(0, 0, [img]);
  const g = scene.add.graphics();
  g.fillStyle(COLORS.ink, 1).fillCircle(5, 5, r);
  g.fillStyle(COLORS.rarity.ultra, 1).fillCircle(0, 0, r);
  g.fillStyle(COLORS.rarity.rare, 1).fillCircle(0, 0, r * 0.7);
  g.fillStyle(COLORS.coin, 1).fillCircle(0, 0, r * 0.4);
  g.lineStyle(STROKE.thick, COLORS.ink, 1).strokeCircle(0, 0, r);
  const mark = scene.add.text(0, 0, '?', textStyle(FONT_SIZE.title * 1.6)).setOrigin(0.5);
  return scene.add.container(0, 0, [g, mark]);
}

const rarityInfo = (id: string) => RARITIES.find(r => r.id === id)!;
const kindLabel = (item: Item) => (item.kind === 'character' ? 'Personnage' : 'Créature');

// Emblème de rareté (007, FR-007), centré en (x, y) ; pastille de couleur en repli.
export function makeEmblem(scene: Phaser.Scene, x: number, y: number, size: number, rarity: Rarity) {
  const img = uiImage(scene, `rarity-${rarity}`, x, y, size, size);
  if (img) return img;
  const g = scene.add.graphics();
  g.fillStyle(COLORS.rarity[rarity], 1).fillCircle(x, y, size / 2);
  g.lineStyle(STROKE.thin, COLORS.ink, 1).strokeCircle(x, y, size / 2);
  return g;
}

// Emblème suivi d'un texte, centré verticalement sur y. originX : 0 = à partir de x, 0,5 = centré.
function makeRarityLine(scene: Phaser.Scene, x: number, y: number, label: string, rarity: Rarity, size: number, originX: number) {
  const c = scene.add.container(0, 0);
  const t = scene.add.text(0, 0, label, textStyle(size, CSS.textDim)).setOrigin(0, 0.5);
  const icon = size + 4;
  const w = icon + 4 + t.width;
  const left = x - originX * w;
  c.add(makeEmblem(scene, left + icon / 2, y, icon, rarity));
  c.add(t.setPosition(left + icon + 4, y));
  return c;
}

// Fond d'une fenêtre d'illustration : la teinte de la rareté, éclaircie au centre.
function artBackdrop(scene: Phaser.Scene, r: Rect, rarity: Rarity, radius: number) {
  const g = scene.add.graphics();
  g.fillStyle(COLORS.panel, 1).fillRoundedRect(r.x, r.y, r.w, r.h, radius);
  g.fillStyle(COLORS.rarity[rarity], ART_FX.artTint).fillRoundedRect(r.x, r.y, r.w, r.h, radius);
  // Halo en paliers, plus doux qu'un seul aplat.
  for (const k of [1, 0.75, 0.5]) {
    g.fillStyle(COLORS.panel, ART_FX.artHalo / 3).fillEllipse(r.x + r.w / 2, r.y + r.h * 0.42, r.w * 0.9 * k, r.h * 0.7 * k);
  }
  return g;
}

function frame(scene: Phaser.Scene, r: Rect, radius: number) {
  return scene.add.graphics().lineStyle(STROKE.thin, COLORS.ink, 1).strokeRoundedRect(r.x, r.y, r.w, r.h, radius);
}

// Pastille et initiale : la représentation d'avant, en repli d'une illustration (FR-010).
function initialDisc(scene: Phaser.Scene, x: number, y: number, radius: number, item: Item, size: number, alpha = 1) {
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();
  g.fillStyle(COLORS.rarity[item.rarity], alpha).fillCircle(x, y, radius);
  g.lineStyle(STROKE.thin, COLORS.ink, alpha).strokeCircle(x, y, radius);
  c.add([g, scene.add.text(x, y, item.name.charAt(0), textStyle(size)).setOrigin(0.5).setAlpha(alpha)]);
  return c;
}

// Texte qui tient en `lines` lignes de `maxW` : la police rétrécit pour un mot trop long.
function fitText(scene: Phaser.Scene, x: number, y: number, s: string, size: number, maxW: number, lines: number) {
  const t = scene.add.text(x, y, s, { ...textStyle(size), wordWrap: { width: maxW } });
  for (let fs = size; fs > FONT_SIZE.micro && (t.width > maxW || t.getWrappedText().length > lines); fs--) {
    t.setFontSize(fs - 1);
  }
  return t;
}

// Texte d'une ligne ramené à `maxW` : la police rétrécit, au plus jusqu'à FONT_SIZE_MIN.
export function fitWidth(t: Phaser.GameObjects.Text, size: number, maxW: number) {
  t.setFontSize(size);
  for (let fs = size; t.width > maxW && fs > FONT_SIZE_MIN; fs--) t.setFontSize(fs - 1);
  return t;
}

// Portrait rond (collection, bannière) : la tête, ou la silhouette d'un manquant (FR-004).
export function makePortrait(scene: Phaser.Scene, x: number, y: number, d: number, item: Item, owned: boolean) {
  const c = scene.add.container(0, 0);
  if (!hasArt(scene, item)) {
    c.add(initialDisc(scene, x, y, d / 2 - 1, item, FONT_SIZE.small, owned ? 1 : 0.45));
    return c;
  }
  const g = scene.add.graphics();
  g.fillStyle(owned ? COLORS.panel : COLORS.btn.disabled, 1).fillCircle(x, y, d / 2);
  if (owned) g.fillStyle(COLORS.rarity[item.rarity], ART_FX.artTint).fillCircle(x, y, d / 2);
  const ring = scene.add.graphics();
  if (owned) ring.lineStyle(STROKE.thin, COLORS.rarity[item.rarity], 1).strokeCircle(x, y, d / 2 - 2);
  ring.lineStyle(STROKE.thin, COLORS.ink, owned ? 1 : 0.45).strokeCircle(x, y, d / 2);
  c.add([g, scene.add.image(x, y, owned ? headKey(item.id) : shadowKey(item.id)).setDisplaySize(d, d), ring]);
  return c;
}

// Carte d'un résultat (001, FR-012 ; 007, FR-002) : illustration entière au ×1, buste au
// ×10 ; nom, type, rareté, et « Nouveau ! » ou le nombre d'exemplaires possédés.
export function makeResultCard(
  scene: Phaser.Scene,
  r: Rect,
  result: PullResult,
  ownedCount: number,
  large = false,
): Phaser.GameObjects.Container {
  const { item } = result;
  const info = rarityInfo(item.rarity);
  const c = scene.add.container(0, 0);
  c.add(makePanel(scene, r));
  const badge = result.isNew ? 'Nouveau !' : `Déjà possédé ×${ownedCount}`;

  if (large) {
    const pad = RESULTS.singleArt.pad;
    const win = { x: r.x + pad, y: r.y + pad, w: r.w - 2 * pad, h: RESULTS.singleArt.h };
    const cx = r.x + r.w / 2;
    c.add(artBackdrop(scene, win, item.rarity, RADIUS - 4));
    if (hasArt(scene, item)) {
      const h = win.h - 8;
      c.add(scene.add.image(cx, win.y + win.h / 2 + 2, artKey(item.id)).setDisplaySize(h * 0.8, h));
    } else {
      c.add(initialDisc(scene, cx, win.y + win.h / 2, 34, item, FONT_SIZE.title));
    }
    c.add(frame(scene, win, RADIUS - 4));
    let y = win.y + win.h + 10;
    c.add(scene.add.text(cx, y, item.name, textStyle(FONT_SIZE.big)).setOrigin(0.5, 0));
    y += 41;
    c.add(makeRarityLine(scene, cx, y, `${kindLabel(item)} · ${info.label}`, item.rarity, FONT_SIZE.body, 0.5));
    y += 17;
    c.add(makeBadge(scene, cx, y, badge, result.isNew, 0.5));
    if (result.shards > 0) c.add(makeShardAmount(scene, cx, y + 34, `+${result.shards} éclats`, 0.5));
    if (result.pity || result.featuredGuarantee) c.add(makeSticker(scene, r.x + r.w - 8, r.y - 8, 'Garanti !'));
    return c;
  }

  const bust = { x: r.x + 6, y: r.y + 6, w: ART.bust.w, h: ART.bust.h };
  c.add(artBackdrop(scene, bust, item.rarity, ART.bust.radius));
  if (hasArt(scene, item)) c.add(scene.add.image(bust.x, bust.y, bustKey(item.id)).setOrigin(0).setDisplaySize(bust.w, bust.h));
  else c.add(initialDisc(scene, bust.x + bust.w / 2, bust.y + bust.h / 2, 17, item, FONT_SIZE.button));
  c.add(frame(scene, bust, ART.bust.radius));
  const textX = bust.x + bust.w + 7;
  const textW = r.x + r.w - 6 - textX;
  c.add(fitText(scene, textX, r.y + 5, item.name, FONT_SIZE.body, textW, 2));
  c.add(scene.add.text(textX, r.y + 39, kindLabel(item), textStyle(FONT_SIZE.micro, CSS.textDim)));
  c.add(makeRarityLine(scene, textX, r.y + 59, info.label, item.rarity, FONT_SIZE.micro, 0));
  c.add(makeBadge(scene, r.x + 6, r.y + 70, badge, result.isNew, 0));
  if (result.shards > 0) c.add(makeShardAmount(scene, r.x + r.w - 8, r.y + 79, `+${result.shards}`, 1));
  // Pastille façon autocollant, à cheval sur le bord : la ligne du bas est déjà pleine
  // quand un résultat forcé est aussi un doublon ; à gauche, elle ne couvre plus le nom.
  if (result.pity || result.featuredGuarantee) {
    const k = RESULTS.sticker;
    c.add(makeSticker(scene, r.x + k.dx, r.y + k.dy, 'Garanti !', 0).setAngle(k.tilt));
  }
  return c;
}

// Fiche d'un possédé (003, révision du 2026-11-08) : l'illustration entière en grand, nom,
// type et rareté, exemplaires, et la phrase de présentation, qu'aucun autre écran ne montre
// pour les raretés sans présentation plein écran.
export function makeSheet(scene: Phaser.Scene, item: Item, ownedCount: number): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const win = SHEET.art;
  const cx = win.x + win.w / 2;
  c.add(artBackdrop(scene, win, item.rarity, RADIUS));
  if (hasArt(scene, item)) {
    const h = win.h - 8;
    c.add(scene.add.image(cx, win.y + win.h / 2 + 2, artKey(item.id)).setDisplaySize(h * 0.8, h));
  } else {
    c.add(initialDisc(scene, cx, win.y + win.h / 2, 48, item, FONT_SIZE.title));
  }
  c.add(frame(scene, win, RADIUS));
  const b = SHEET.blurb;
  c.add(fitWidth(scene.add.text(cx, SHEET.nameY, item.name, textStyle(FONT_SIZE.big)).setOrigin(0.5, 0), FONT_SIZE.big, b.w));
  c.add(makeRarityLine(scene, cx, SHEET.rarityY, `${kindLabel(item)} · ${rarityInfo(item.rarity).label}`, item.rarity,
    FONT_SIZE.body, 0.5));
  c.add(makeBadge(scene, cx, SHEET.countY, `Possédé ×${ownedCount}`, false, 0.5));
  c.add(makePanel(scene, b));
  c.add(scene.add.text(cx, b.y + b.h / 2, item.blurb,
    { ...textStyle(FONT_SIZE.body, CSS.textDim), align: 'center', wordWrap: { width: b.w - 24 } }).setOrigin(0.5));
  return c;
}

// Éclat (icône illustrée, ou losange en repli), centré en (x, y) ; size = demi-hauteur.
export function makeShardIcon(scene: Phaser.Scene, x: number, y: number, size: number) {
  const img = uiImage(scene, 'icon-shard', x, y, size * 2.3, size * 2.3);
  if (img) return img;
  const g = scene.add.graphics();
  const V = Phaser.Math.Vector2;
  const points = [new V(x, y - size), new V(x + size * 0.75, y), new V(x, y + size), new V(x - size * 0.75, y)];
  g.fillStyle(COLORS.shard, 1).fillPoints(points, true);
  g.lineStyle(STROKE.thin, COLORS.ink, 1).strokePoints(points, true);
  return g;
}

// Montant d'éclats précédé du losange. originX : 0 = à gauche de x, 0,5 = centré, 1 = à droite.
export function makeShardAmount(
  scene: Phaser.Scene, x: number, y: number, label: string, originX: number, size: number = FONT_SIZE.tiny,
): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const t = scene.add.text(0, 0, label, textStyle(size));
  const icon = size * 0.55;
  const w = icon * 1.5 + 4 + t.width;
  const left = x - originX * w;
  c.add(makeShardIcon(scene, left + icon * 0.75, y, icon));
  t.setPosition(left + icon * 1.5 + 4, y).setOrigin(0, 0.5);
  c.add(t);
  return c;
}

// Ancrée en (x, topY) : originX 1 = bord droit, 0 = bord gauche. Le conteneur est posé sur
// l'ancre pour qu'une inclinaison pivote autour d'elle.
function makeSticker(scene: Phaser.Scene, x: number, topY: number, label: string, originX = 1): Phaser.GameObjects.Container {
  const c = scene.add.container(x, topY);
  const t = scene.add.text(0, 0, label, textStyle(FONT_SIZE.tiny));
  const w = t.width + 12;
  const h = t.height + 4;
  const left = -originX * w;
  const g = scene.add.graphics();
  g.fillStyle(COLORS.badgePity, 1).fillRoundedRect(left, 0, w, h, h / 2);
  g.lineStyle(STROKE.thin, COLORS.ink, 1).strokeRoundedRect(left, 0, w, h, h / 2);
  t.setPosition(left + 6, 2);
  c.add([g, t]);
  return c;
}

export function makeBadge(scene: Phaser.Scene, x: number, y: number, label: string, isNew: boolean, originX: number) {
  const c = scene.add.container(0, 0);
  const t = scene.add.text(0, 0, label, textStyle(FONT_SIZE.tiny, isNew ? CSS.text : CSS.textDim));
  const w = t.width + 12;
  const h = t.height + 4;
  const left = x - originX * w;
  if (isNew) {
    const g = scene.add.graphics();
    g.fillStyle(COLORS.badgeNew, 1).fillRoundedRect(left, y, w, h, h / 2);
    g.lineStyle(STROKE.thin, COLORS.ink, 1).strokeRoundedRect(left, y, w, h, h / 2);
    c.add(g);
  }
  t.setPosition(left + 6, y + 2);
  c.add(t);
  return c;
}
