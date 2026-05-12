import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, FONTS } from '../config';
import { makeButton, makePanel, makeTitle, rarityColor, rarityLabel, showToast } from '../ui/UIManager';
import type { GachaPullResult } from '../systems/GachaSystem';
import { saveProgress } from './MainMenuScene';

export class GachaScene extends Phaser.Scene {
  private results: GachaPullResult[] = [];

  constructor() { super('Gacha'); }

  create(): void {
    const gs = window.gameState;

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background);
    for (let i = 0; i < 40; i++) {
      this.add.star(
        Phaser.Math.Between(0, GAME_WIDTH),
        Phaser.Math.Between(0, GAME_HEIGHT),
        5, 2, Phaser.Math.Between(4, 8),
        COLORS.accent, Phaser.Math.FloatBetween(0.1, 0.4),
      );
    }

    makeTitle(this, GAME_WIDTH / 2, 40, '✨ INVOCATION');
    this.add.text(GAME_WIDTH / 2, 70, `Pity : ${gs.gacha.pullsUntilPity} tirages avant légendaire garanti`, {
      ...FONTS.small, align: 'center',
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 90, `Or disponible : ${gs.totalGold} 💰`, { ...FONTS.gold, align: 'center' }).setOrigin(0.5);

    this.drawInfoPanel();
    this.drawPullButtons();
    this.drawBackButton();
  }

  private drawInfoPanel(): void {
    makePanel(this, GAME_WIDTH / 2, 180, 330, 120);
    this.add.text(GAME_WIDTH / 2, 136, 'Taux de tirage', { ...FONTS.body, color: '#9999bb', align: 'center' }).setOrigin(0.5);
    const rates = [
      { label: 'Légendaire', rate: '3%', color: '#ffaa00' },
      { label: 'Épique', rate: '12%', color: '#bb44ff' },
      { label: 'Rare', rate: '25%', color: '#4488ff' },
      { label: 'Commun', rate: '60%', color: '#aaaaaa' },
    ];
    rates.forEach((r, i) => {
      const x = 34 + (i % 2) * 160;
      const y = 158 + Math.floor(i / 2) * 28;
      this.add.text(x, y, `${r.label} : ${r.rate}`, { ...FONTS.small, color: r.color });
    });
    this.add.text(GAME_WIDTH / 2, 228, '🛡 Héros ou Relique à chaque tirage', { ...FONTS.small, align: 'center' }).setOrigin(0.5);
  }

  private drawPullButtons(): void {
    const gs = window.gameState;
    const cost1 = gs.gacha.costFor(1);
    const cost10 = gs.gacha.costFor(10);

    makeButton(this, GAME_WIDTH / 2, 300, `Tirer ×1 — ${cost1} 💰`, () => this.pull(1), 280, 50,
      gs.totalGold >= cost1 ? COLORS.accent : 0x333333);
    makeButton(this, GAME_WIDTH / 2, 368, `Tirer ×10 — ${cost10} 💰`, () => this.pull(10), 280, 50,
      gs.totalGold >= cost10 ? 0x553388 : 0x333333);
  }

  private pull(count: number): void {
    const gs = window.gameState;
    const cost = gs.gacha.costFor(count);
    if (gs.totalGold < cost) { showToast(this, 'Pas assez d\'or !'); return; }

    gs.totalGold -= cost;
    this.results = gs.gacha.pullMulti(count, gs.unlockedHeroIds, gs.ownedRelicIds);

    // Apply results
    for (const r of this.results) {
      if (r.type === 'hero' && r.heroDefinition && !gs.unlockedHeroIds.includes(r.heroDefinition.id)) {
        gs.unlockedHeroIds.push(r.heroDefinition.id);
      }
      if (r.type === 'relic' && r.relicDefinition && !gs.ownedRelicIds.includes(r.relicDefinition.id)) {
        gs.ownedRelicIds.push(r.relicDefinition.id);
      }
    }

    saveProgress();
    this.showResults();
  }

  private showResults(): void {
    // Clear current scene content
    this.children.list.slice().forEach(c => c.destroy());

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background);
    makeTitle(this, GAME_WIDTH / 2, 30, '✨ RÉSULTATS');

    const perRow = 5;
    const cardW = 62, cardH = 88;
    const padX = (GAME_WIDTH - perRow * (cardW + 6)) / 2 + cardW / 2;

    this.results.forEach((r, i) => {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const x = padX + col * (cardW + 6);
      const y = 70 + row * (cardH + 10);

      const rarity = r.rarity;
      const color = rarityColor(rarity);

      this.add.rectangle(x, y, cardW, cardH, COLORS.panel).setStrokeStyle(2, color);

      if (r.type === 'hero' && r.heroDefinition) {
        this.add.image(x, y - 14, `hero_${r.heroDefinition.id}`).setDisplaySize(44, 44);
        this.add.text(x, y + 24, r.heroDefinition.name.split(' ')[0], { ...FONTS.small, fontSize: '9px', align: 'center' }).setOrigin(0.5);
      } else if (r.type === 'relic' && r.relicDefinition) {
        this.add.image(x, y - 14, `relic_${r.relicDefinition.id}`).setDisplaySize(38, 38);
        this.add.text(x, y + 24, r.relicDefinition.name.split(' ')[0], { ...FONTS.small, fontSize: '9px', align: 'center' }).setOrigin(0.5);
      }

      this.add.text(x, y + 38, rarityLabel(rarity), { fontSize: '8px', color: `#${color.toString(16).padStart(6, '0')}`, fontFamily: 'Arial' }).setOrigin(0.5);

      if (r.isPity) {
        this.add.text(x, y - 40, '★ PITY', { fontSize: '10px', color: '#ffaa00', fontFamily: 'Arial' }).setOrigin(0.5);
      }
    });

    makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 50, 'RETOUR', () => this.scene.start('MainMenu'), 200, 44);
  }

  private drawBackButton(): void {
    makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 50, '← RETOUR', () => this.scene.start('MainMenu'), 200, 44, 0x444455);
  }
}
