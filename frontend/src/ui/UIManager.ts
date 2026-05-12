import Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH } from '../config';
import type { Rarity } from '../data/heroes';

export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  width = 200,
  height = 44,
  color = COLORS.accent,
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const bg = scene.add.rectangle(0, 0, width, height, color, 1).setInteractive({ useHandCursor: true });
  const border = scene.add.rectangle(0, 0, width, height).setStrokeStyle(1, COLORS.accentLight, 0.6);
  const text = scene.add.text(0, 0, label, { ...FONTS.button, align: 'center' }).setOrigin(0.5);
  container.add([bg, border, text]);

  bg.on('pointerover', () => bg.setFillStyle(color + 0x222222));
  bg.on('pointerout', () => bg.setFillStyle(color));
  bg.on('pointerdown', () => { bg.setFillStyle(color - 0x111111); onClick(); });
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

export function makeHpBar(
  scene: Phaser.Scene,
  x: number, y: number,
  width: number, height: number,
  pct: number,
): Phaser.GameObjects.Container {
  const bg = scene.add.rectangle(0, 0, width, height, 0x333344);
  const fill = scene.add.rectangle(-(width / 2) + (width * pct) / 2, 0, width * pct, height - 2, pct > 0.4 ? COLORS.hp : COLORS.hpLow);
  const container = scene.add.container(x, y, [bg, fill]);
  return container;
}

export function makeGoldText(scene: Phaser.Scene, x: number, y: number, amount: number): Phaser.GameObjects.Text {
  return scene.add.text(x, y, `💰 ${amount}`, { ...FONTS.gold }).setOrigin(0.5);
}

export function showToast(scene: Phaser.Scene, message: string, duration = 2000): void {
  const bg = scene.add.rectangle(GAME_WIDTH / 2, 580, 300, 40, 0x000000, 0.85);
  const text = scene.add.text(GAME_WIDTH / 2, 580, message, { ...FONTS.body, align: 'center' }).setOrigin(0.5);
  scene.time.delayedCall(duration, () => { bg.destroy(); text.destroy(); });
}

export function makeTitle(scene: Phaser.Scene, x: number, y: number, label: string): Phaser.GameObjects.Text {
  return scene.add.text(x, y, label, { ...FONTS.title, align: 'center' }).setOrigin(0.5);
}
