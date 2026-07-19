import Phaser from 'phaser';
import { COLORS, CSS, FONTS, FONT_FAMILY, STROKE, GAME_WIDTH, GAME_HEIGHT } from '../config';
import type { Rarity } from '../data/heroes';

// Décalage de l'ombre portée pleine des éléments BD (pas de flou, un simple aplat noir)
const SHADOW_OFFSET = 3;

// Éclaircit une couleur sans déborder sur les canaux voisins.
// (l'ancien `color + 0x222222` faisait baver le rouge dans le vert dès que R > 0xdd)
export function lighten(color: number, amount = 0.15): number {
  return Phaser.Display.Color.IntegerToColor(color).brighten(amount * 100).color;
}

// Durées standard des animations UI (ms) — centralisées pour garder un rythme cohérent
export const ANIM = {
  sceneFade: 200,
  buttonPress: 70,
  stagger: 60,
} as const;

// Les fondus se font vers le papier, pas vers le noir — sinon chaque transition
// réintroduit un flash sombre au milieu d'un thème clair.
const FADE_RGB = Phaser.Display.Color.IntegerToColor(COLORS.background);

// Fondu d'entrée de scène — à appeler en début de create()
export function fadeIn(scene: Phaser.Scene, duration: number = ANIM.sceneFade): void {
  scene.cameras.main.fadeIn(duration, FADE_RGB.red, FADE_RGB.green, FADE_RGB.blue);
}

// Vrai pendant un fondu de sortie — à vérifier avant toute mutation d'état
// déclenchée par un clic, pour neutraliser les double-clics pendant la transition
export function isTransitioning(scene: Phaser.Scene): boolean {
  return scene.cameras.main.fadeEffect.isRunning;
}

// Transition vers une autre scène avec fondu de sortie.
// Ignore les appels pendant un fondu déjà en cours (anti double-clic).
export function transitionTo(scene: Phaser.Scene, key: string, data?: object, duration: number = ANIM.sceneFade): void {
  const cam = scene.cameras.main;
  if (cam.fadeEffect.isRunning) return;
  cam.fadeOut(duration, FADE_RGB.red, FADE_RGB.green, FADE_RGB.blue);
  cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => scene.scene.start(key, data));
}

export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  width = 200,
  height = 44,
  color: number = COLORS.accent,
  // Ligne secondaire rendue À L'INTÉRIEUR du bouton, sous le libellé
  subtitle?: string,
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  // Ombre pleine décalée : donne le relief « autocollant » du style BD
  const shadow = scene.add.rectangle(SHADOW_OFFSET, SHADOW_OFFSET, width, height, COLORS.ink, 1);
  const bg = scene.add.rectangle(0, 0, width, height, color, 1)
    .setStrokeStyle(STROKE.base, COLORS.ink)
    .setInteractive({ useHandCursor: true });
  const text = scene.add.text(0, subtitle ? -8 : 0, label, { ...FONTS.button, align: 'center' }).setOrigin(0.5);
  container.add([shadow, bg, text]);

  if (subtitle) {
    container.add(scene.add.text(0, 11, subtitle, {
      ...FONTS.button, fontSize: '11px', strokeThickness: 3, align: 'center',
    }).setOrigin(0.5));
  }

  bg.on('pointerover', () => {
    bg.setFillStyle(lighten(color));
    scene.tweens.add({ targets: container, scale: 1.03, duration: 80, ease: 'Quad.Out' });
  });
  bg.on('pointerout', () => {
    bg.setFillStyle(color);
    scene.tweens.add({ targets: container, scale: 1, duration: 80, ease: 'Quad.Out' });
  });
  bg.on('pointerdown', () => {
    // Punch tactile avant l'action — le clic doit se "sentir".
    // Le bouton s'enfonce sur son ombre, qui se rétracte en même temps.
    scene.tweens.add({ targets: [bg, text], x: '+=2', y: '+=2', duration: ANIM.buttonPress, yoyo: true, ease: 'Quad.Out' });
    scene.tweens.add({
      targets: container,
      scale: 0.94,
      duration: ANIM.buttonPress,
      yoyo: true,
      ease: 'Quad.Out',
    });
    onClick();
  });
  bg.on('pointerup', () => bg.setFillStyle(color));

  return container;
}

// Rend un conteneur défilable verticalement (glisser au doigt + molette), borné
// au contenu et masqué à la zone visible. Utilisé partout où une liste de héros
// dépasse l'écran — collection et composition d'équipe.
export interface ScrollHandle {
  // Vrai si le dernier appui était un glissement : à tester avant d'ouvrir une
  // fiche sur 'pointerup', sinon chaque défilement déclenche un clic.
  wasDragged: () => boolean;
  // Phaser ne tient PAS compte du masque pour la détection des clics : une carte
  // défilée hors du cadre continue d'intercepter les appuis dans l'en-tête ou le
  // pied de page. Tout gestionnaire de carte doit filtrer avec ceci.
  isInView: (y: number) => boolean;
}

export function attachScroll(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  viewTop: number,
  viewBottom: number,
  contentBottom: number,
): ScrollHandle {
  const maskShape = scene.make.graphics({});
  maskShape.fillRect(0, viewTop, GAME_WIDTH, viewBottom - viewTop);
  container.setMask(maskShape.createGeometryMask());

  const isInView = (y: number) => y >= viewTop && y <= viewBottom;
  const maxScroll = Math.max(0, contentBottom - viewBottom);
  let dragged = false;
  if (maxScroll === 0) return { wasDragged: () => false, isInView };

  const apply = (y: number) => { container.y = Phaser.Math.Clamp(y, -maxScroll, 0); };

  scene.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => apply(container.y - dy * 0.6));

  let startPointerY = 0;
  let startY = 0;
  scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
    startPointerY = p.y;
    startY = container.y;
    dragged = false;
  });
  scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
    if (!p.isDown) return;
    const delta = p.y - startPointerY;
    // Seuil : en deçà, c'est un appui sur une carte, pas un défilement
    if (Math.abs(delta) > 6) dragged = true;
    if (dragged) apply(startY + delta);
  });

  scene.add.text(GAME_WIDTH - 6, viewBottom - 2, '↕', {
    ...FONTS.small, color: CSS.textFaint, fontSize: '16px',
  }).setOrigin(1, 1).setDepth(5);

  return { wasDragged: () => dragged, isInView };
}

// Au-dessus des cartes défilables : sans ça, une carte sortie du cadre par le
// défilement capte le clic à la place de la puce de tri.
const SORT_BAR_DEPTH = 20;

// Au-dessus de tout le reste, barre de tri comprise.
const MODAL_DEPTH = 1000;

// Barre de tri : une puce par critère, la puce active est pleine.
// Rappelle `onChange` avec l'id choisi.
export function makeSortBar(
  scene: Phaser.Scene,
  y: number,
  options: { id: string; label: string }[],
  activeId: string,
  onChange: (id: string) => void,
): void {
  const MARGIN = 16;
  const gap = 6;
  const w = (GAME_WIDTH - MARGIN * 2 - gap * (options.length - 1)) / options.length;

  options.forEach((opt, i) => {
    const x = MARGIN + w / 2 + i * (w + gap);
    const active = opt.id === activeId;
    const bg = scene.add.rectangle(x, y, w, 26, active ? COLORS.accent : COLORS.panel)
      .setStrokeStyle(STROKE.thin, COLORS.ink)
      .setDepth(SORT_BAR_DEPTH)
      .setInteractive({ useHandCursor: true });
    scene.add.text(x, y, opt.label, {
      ...FONTS.small, fontSize: '11px',
      color: active ? CSS.textLight : CSS.text,
    }).setOrigin(0.5).setDepth(SORT_BAR_DEPTH);
    if (!active) bg.on('pointerup', () => onChange(opt.id));
  });
}

export function makePanel(
  scene: Phaser.Scene,
  x: number, y: number,
  w: number, h: number,
): Phaser.GameObjects.Rectangle {
  return scene.add.rectangle(x, y, w, h, COLORS.panel, 1).setStrokeStyle(STROKE.base, COLORS.panelBorder);
}

export function rarityColor(rarity: Rarity): number {
  return COLORS.rarity[rarity];
}

// Version chaîne d'une couleur Phaser, pour les styles de texte.
// `padStart` est indispensable : sans lui, une couleur dont l'octet de poids
// fort est faible (0x0abcde) produirait '#abcde', que Phaser lit de travers.
export function toCssColor(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

// Couleur CSS d'une rareté — pendant de `rarityColor` pour les textes.
export function rarityCss(rarity: Rarity): string {
  return toCssColor(COLORS.rarity[rarity]);
}

// Modale plein écran : voile bloquant + contenu, au-dessus de tout le reste.
// Renvoie un conteneur auquel ajouter le contenu, et sa fermeture.
// Le voile intercepte les clics : sans lui, on interagit avec l'écran derrière.
export interface Modal {
  container: Phaser.GameObjects.Container;
  close: () => void;
}

export function makeModal(
  scene: Phaser.Scene,
  // Action au clic sur le voile. Omis = le voile absorbe le clic sans rien
  // faire, pour les modales qui exigent une réponse explicite (choisir qui
  // quitte l'équipe, confirmer un abandon). Une fermeture animée passe son
  // propre callback plutôt que `close`.
  onScrimClick?: () => void,
): Modal {
  const container = scene.add.container(0, 0).setDepth(MODAL_DEPTH);
  const scrim = scene.add
    .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.scrim, 0.82)
    .setInteractive();
  container.add(scrim);

  if (onScrimClick) scrim.on('pointerdown', onScrimClick);

  return { container, close: () => container.destroy() };
}

export function rarityLabel(rarity: Rarity): string {
  const map: Record<Rarity, string> = {
    common: 'Commun',
    rare: 'Rare',
    epic: 'Épique',
    legendary: 'Légendaire',
  };
  return map[rarity];
}

// Barre de PV : le remplissage est un rect pleine largeur à origine gauche,
// dont scaleX = pct — permet d'animer la barre via un simple tween de scaleX.
export function makeHpBar(
  scene: Phaser.Scene,
  x: number, y: number,
  width: number, height: number,
  pct: number,
): Phaser.GameObjects.Container {
  const clamped = Phaser.Math.Clamp(pct, 0, 1);
  const bg = scene.add.rectangle(0, 0, width, height, COLORS.panel).setStrokeStyle(STROKE.thin, COLORS.ink);
  const fill = scene.add.rectangle(-width / 2 + 1, 0, width - 2, height - 2, clamped > 0.4 ? COLORS.hp : COLORS.hpLow)
    .setOrigin(0, 0.5)
    .setScale(clamped, 1);
  const container = scene.add.container(x, y, [bg, fill]);
  container.setData('fill', fill);
  return container;
}

// Anime la barre de PV vers un nouveau pourcentage
export function setHpBar(scene: Phaser.Scene, bar: Phaser.GameObjects.Container, pct: number, duration = 250): void {
  const fill = bar.getData('fill') as Phaser.GameObjects.Rectangle | undefined;
  if (!fill) return;
  const clamped = Phaser.Math.Clamp(pct, 0, 1);
  fill.setFillStyle(clamped > 0.4 ? COLORS.hp : COLORS.hpLow);
  scene.tweens.add({ targets: fill, scaleX: clamped, duration, ease: 'Quad.Out' });
}

export function makeGoldText(scene: Phaser.Scene, x: number, y: number, amount: number): Phaser.GameObjects.Text {
  return scene.add.text(x, y, `💰 ${amount}`, { ...FONTS.gold }).setOrigin(0.5);
}

export function showToast(scene: Phaser.Scene, message: string, duration = 2000): void {
  const container = scene.add.container(GAME_WIDTH / 2, 596).setDepth(100).setAlpha(0);
  const shadow = scene.add.rectangle(SHADOW_OFFSET, SHADOW_OFFSET, 300, 40, COLORS.ink, 1);
  const bg = scene.add.rectangle(0, 0, 300, 40, COLORS.panel, 1).setStrokeStyle(STROKE.base, COLORS.panelBorder);
  const text = scene.add.text(0, 0, message, { ...FONTS.body, align: 'center' }).setOrigin(0.5);
  container.add([shadow, bg, text]);

  scene.tweens.chain({
    targets: container,
    tweens: [
      { y: 580, alpha: 1, duration: 180, ease: 'Back.Out' },
      { alpha: 1, duration: duration - 380 },
      { y: 596, alpha: 0, duration: 200, ease: 'Quad.In' },
    ],
    onComplete: () => container.destroy(),
  });
}

export function makeTitle(scene: Phaser.Scene, x: number, y: number, label: string): Phaser.GameObjects.Text {
  return scene.add.text(x, y, label, { ...FONTS.title, align: 'center' }).setOrigin(0.5);
}

// Texte flottant (dégâts, soins, gains) qui monte et disparaît
export function floatText(
  scene: Phaser.Scene,
  x: number, y: number,
  message: string,
  // Typés explicitement : CSS est `as const`, sans annotation le défaut
  // narrowerait le paramètre au seul littéral '#ffffff'
  color: string = CSS.textLight,
  fontSize: string = '14px',
): void {
  const t = scene.add.text(x, y, message, {
    fontFamily: FONT_FAMILY, fontSize, color, fontStyle: 'bold',
    stroke: CSS.ink, strokeThickness: 4,
  }).setOrigin(0.5).setDepth(60);
  scene.tweens.add({
    targets: t,
    y: y - 30,
    alpha: 0,
    duration: 750,
    ease: 'Quad.Out',
    onComplete: () => t.destroy(),
  });
}

// Entrée en cascade : les objets glissent vers leur position avec un léger décalage
export function staggerIn(
  scene: Phaser.Scene,
  targets: (Phaser.GameObjects.Components.Transform & Phaser.GameObjects.Components.AlphaSingle)[],
  offsetY = 16,
  delayStep: number = ANIM.stagger,
): void {
  targets.forEach((obj, i) => {
    const finalY = obj.y;
    obj.setAlpha(0);
    obj.y = finalY + offsetY;
    scene.tweens.add({
      targets: obj,
      y: finalY,
      alpha: 1,
      duration: 260,
      delay: i * delayStep,
      ease: 'Quad.Out',
    });
  });
}

// Pulsation continue (mise en avant d'un élément interactif)
export function pulse(scene: Phaser.Scene, target: Phaser.GameObjects.Components.Transform, amplitude = 1.04, duration = 600): Phaser.Tweens.Tween {
  return scene.tweens.add({
    targets: target,
    scaleX: amplitude,
    scaleY: amplitude,
    duration,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.InOut',
  });
}

// Compteur animé (or, scores) — le texte défile de `from` à `to`
export function countUp(
  scene: Phaser.Scene,
  textObj: Phaser.GameObjects.Text,
  from: number,
  to: number,
  format: (n: number) => string,
  duration = 600,
): void {
  const counter = { value: from };
  scene.tweens.add({
    targets: counter,
    value: to,
    duration,
    ease: 'Quad.Out',
    onUpdate: () => textObj.setText(format(Math.round(counter.value))),
    onComplete: () => textObj.setText(format(to)),
  });
}
