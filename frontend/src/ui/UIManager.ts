import Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH } from '../config';
import type { Rarity } from '../data/heroes';

// Durées standard des animations UI (ms) — centralisées pour garder un rythme cohérent
export const ANIM = {
  sceneFade: 200,
  buttonPress: 70,
  stagger: 60,
} as const;

// Fondu d'entrée de scène — à appeler en début de create()
export function fadeIn(scene: Phaser.Scene, duration: number = ANIM.sceneFade): void {
  scene.cameras.main.fadeIn(duration, 13, 13, 26);
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
  cam.fadeOut(duration, 13, 13, 26);
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
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const bg = scene.add.rectangle(0, 0, width, height, color, 1).setInteractive({ useHandCursor: true });
  const border = scene.add.rectangle(0, 0, width, height).setStrokeStyle(1, COLORS.accentLight, 0.6);
  const text = scene.add.text(0, 0, label, { ...FONTS.button, align: 'center' }).setOrigin(0.5);
  container.add([bg, border, text]);

  bg.on('pointerover', () => {
    bg.setFillStyle(color + 0x222222);
    scene.tweens.add({ targets: container, scale: 1.03, duration: 80, ease: 'Quad.Out' });
  });
  bg.on('pointerout', () => {
    bg.setFillStyle(color);
    scene.tweens.add({ targets: container, scale: 1, duration: 80, ease: 'Quad.Out' });
  });
  bg.on('pointerdown', () => {
    // Punch tactile avant l'action — le clic doit se "sentir"
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

export function makePanel(
  scene: Phaser.Scene,
  x: number, y: number,
  w: number, h: number,
): Phaser.GameObjects.Rectangle {
  return scene.add.rectangle(x, y, w, h, COLORS.panel, 0.92).setStrokeStyle(1, COLORS.panelBorder);
}

export function rarityColor(rarity: Rarity): number {
  return COLORS.rarity[rarity];
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
  const bg = scene.add.rectangle(0, 0, width, height, 0x333344);
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
  const bg = scene.add.rectangle(0, 0, 300, 40, 0x000000, 0.85).setStrokeStyle(1, COLORS.panelBorder);
  const text = scene.add.text(0, 0, message, { ...FONTS.body, align: 'center' }).setOrigin(0.5);
  container.add([bg, text]);

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
  color = '#ffffff',
  fontSize = '14px',
): void {
  const t = scene.add.text(x, y, message, {
    fontFamily: 'Arial, sans-serif', fontSize, color, fontStyle: 'bold',
    stroke: '#000000', strokeThickness: 3,
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
