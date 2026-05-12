import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, FONTS } from '../config';
import { makeButton, makePanel, makeTitle, rarityColor, rarityLabel } from '../ui/UIManager';
import { HERO_POOL } from '../data/heroes';

export class CollectionScene extends Phaser.Scene {
  constructor() { super('Collection'); }

  create(): void {
    const gs = window.gameState;

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background);
    makeTitle(this, GAME_WIDTH / 2, 32, '📚 COLLECTION');
    this.add.text(GAME_WIDTH / 2, 58, `${gs.unlockedHeroIds.length}/${HERO_POOL.length} héros débloqués`, {
      ...FONTS.body, align: 'center',
    }).setOrigin(0.5);

    const perRow = 3;
    const cardW = 100, cardH = 140;
    const padX = (GAME_WIDTH - perRow * (cardW + 8)) / 2 + cardW / 2;

    HERO_POOL.forEach((hero, i) => {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const x = padX + col * (cardW + 8);
      const y = 90 + row * (cardH + 8);
      const unlocked = gs.unlockedHeroIds.includes(hero.id);
      const color = rarityColor(hero.rarity);

      makePanel(this, x, y + cardH / 2, cardW, cardH);
      this.add.rectangle(x, y + cardH / 2, cardW - 2, cardH - 2, COLORS.panel).setStrokeStyle(2, unlocked ? color : 0x333344);

      if (unlocked) {
        this.add.image(x, y + 38, `hero_${hero.id}`).setDisplaySize(64, 64);
        this.add.text(x, y + 76, hero.name, { ...FONTS.small, align: 'center', wordWrap: { width: cardW - 10 } }).setOrigin(0.5);
        this.add.text(x, y + 96, rarityLabel(hero.rarity), {
          fontSize: '9px', color: `#${color.toString(16).padStart(6, '0')}`, fontFamily: 'Arial', align: 'center',
        }).setOrigin(0.5);
        this.add.text(x, y + 112, hero.ability.name, { fontSize: '9px', color: '#9999bb', fontFamily: 'Arial', align: 'center' }).setOrigin(0.5);
        this.add.text(x, y + 128, hero.ability.description, {
          fontSize: '7px', color: '#666677', fontFamily: 'Arial', align: 'center', wordWrap: { width: cardW - 10 },
        }).setOrigin(0.5);
      } else {
        this.add.text(x, y + 55, '?', { fontFamily: 'Georgia', fontSize: '36px', color: '#333355' }).setOrigin(0.5);
        this.add.text(x, y + 90, '???', { ...FONTS.small, color: '#333355' }).setOrigin(0.5);
        this.add.text(x, y + 110, rarityLabel(hero.rarity), {
          fontSize: '9px', color: `#${color.toString(16).padStart(6, '0')}`, fontFamily: 'Arial',
        }).setOrigin(0.5);
      }
    });

    makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 38, '← RETOUR', () => this.scene.start('MainMenu'), 200, 40, 0x444455);
  }
}
