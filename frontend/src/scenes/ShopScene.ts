import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, FONTS } from '../config';
import { makeButton, makePanel, makeTitle, rarityColor, rarityLabel, showToast } from '../ui/UIManager';
import { RELIC_POOL } from '../data/relics';
import { HERO_POOL, getHeroById } from '../data/heroes';
import { shuffle } from '../utils/random';
import type { RelicDefinition } from '../data/relics';
import type { HeroDefinition } from '../data/heroes';

const RELIC_PRICE = 60;
const HERO_PRICE = 120;
const HEAL_PRICE = 40;

export class ShopScene extends Phaser.Scene {
  private shopRelics: RelicDefinition[] = [];
  private shopHero: HeroDefinition | null = null;
  private goldText!: Phaser.GameObjects.Text;

  constructor() { super('Shop'); }

  create(): void {
    const run = window.gameState.runManager.state;

    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg_shop').setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55);

    makeTitle(this, GAME_WIDTH / 2, 38, '🛒 MARCHAND');
    this.goldText = this.add.text(GAME_WIDTH / 2, 65, `💰 ${run.gold} or`, { ...FONTS.gold, align: 'center' }).setOrigin(0.5);

    this.generateShopItems();
    this.drawRelics();
    this.drawHero();
    this.drawHeal();
    this.drawLeaveButton();
  }

  private generateShopItems(): void {
    const run = window.gameState.runManager.state;
    const ownedIds = run.relics.map(r => r.id);
    const available = RELIC_POOL.filter(r => !ownedIds.includes(r.id));
    this.shopRelics = shuffle(available).slice(0, 3);

    const gs = window.gameState;
    const unownedHeroes = HERO_POOL.filter(h => !gs.unlockedHeroIds.includes(h.id));
    this.shopHero = unownedHeroes.length > 0
      ? shuffle(unownedHeroes)[0]
      : HERO_POOL[Math.floor(Math.random() * HERO_POOL.length)];
  }

  private drawRelics(): void {
    const run = window.gameState.runManager.state;
    this.add.text(20, 90, 'Reliques', { ...FONTS.body, color: '#bb44ff' });

    this.shopRelics.forEach((relic, i) => {
      const y = 115 + i * 70;
      makePanel(this, GAME_WIDTH / 2, y + 22, 330, 60);
      this.add.rectangle(34, y + 22, 44, 44, COLORS.panel).setStrokeStyle(2, rarityColor(relic.rarity));
      this.add.text(34, y + 22, relic.name.slice(0, 3), { ...FONTS.small, fontSize: '10px' }).setOrigin(0.5);

      this.add.text(60, y + 10, relic.name, { ...FONTS.body, color: `#${rarityColor(relic.rarity).toString(16).padStart(6, '0')}` });
      this.add.text(60, y + 28, relic.description, { ...FONTS.small, wordWrap: { width: 200 } });

      const canAfford = run.gold >= RELIC_PRICE;
      makeButton(this, GAME_WIDTH - 46, y + 22, `${RELIC_PRICE}💰`, () => this.buyRelic(relic), 80, 34,
        canAfford ? 0x553388 : 0x333333);
    });
  }

  private drawHero(): void {
    if (!this.shopHero) return;
    const run = window.gameState.runManager.state;
    const y = 340;
    this.add.text(20, y - 12, 'Héros à recruter', { ...FONTS.body, color: '#44bbff' });
    makePanel(this, GAME_WIDTH / 2, y + 30, 330, 64);
    this.add.image(36, y + 30, `hero_${this.shopHero.id}`).setDisplaySize(48, 48);
    this.add.text(65, y + 14, this.shopHero.name, { ...FONTS.body, color: `#${rarityColor(this.shopHero.rarity).toString(16).padStart(6, '0')}` });
    this.add.text(65, y + 32, this.shopHero.ability.description, { ...FONTS.small, wordWrap: { width: 170 } });

    const canAfford = run.gold >= HERO_PRICE;
    const atMax = run.heroes.length >= 5;
    const label = atMax ? 'Équipe pleine' : `${HERO_PRICE}💰`;
    makeButton(this, GAME_WIDTH - 46, y + 30, label, () => this.buyHero(), 90, 34,
      (canAfford && !atMax) ? 0x335566 : 0x333333);
  }

  private drawHeal(): void {
    const run = window.gameState.runManager.state;
    const y = 450;
    makePanel(this, GAME_WIDTH / 2, y + 22, 330, 46);
    this.add.text(20, y + 10, '🏥 Soins — Récupère 40 PV à tous', { ...FONTS.body });
    const canAfford = run.gold >= HEAL_PRICE;
    makeButton(this, GAME_WIDTH - 46, y + 22, `${HEAL_PRICE}💰`, () => this.buyHeal(), 80, 34,
      canAfford ? 0x335533 : 0x333333);
  }

  private drawLeaveButton(): void {
    makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 44, 'QUITTER LE MARCHAND', () => this.leave(), 260, 44, 0x444455);
  }

  private buyRelic(relic: RelicDefinition): void {
    const run = window.gameState.runManager.state;
    if (run.gold < RELIC_PRICE) { showToast(this, 'Pas assez d\'or !'); return; }
    run.gold -= RELIC_PRICE;
    run.applyRelic(relic);
    showToast(this, `${relic.name} obtenu !`);
    this.updateGold();
    this.shopRelics = this.shopRelics.filter(r => r.id !== relic.id);
    this.scene.restart();
  }

  private buyHero(): void {
    const run = window.gameState.runManager.state;
    if (!this.shopHero || run.gold < HERO_PRICE || run.heroes.length >= 5) {
      showToast(this, run.heroes.length >= 5 ? 'Équipe pleine !' : 'Pas assez d\'or !');
      return;
    }
    run.gold -= HERO_PRICE;
    run.completeRoom({ heroId: this.shopHero.id });
    showToast(this, `${this.shopHero.name} rejoint l\'équipe !`);
    this.scene.start('RunMap');
  }

  private buyHeal(): void {
    const run = window.gameState.runManager.state;
    if (run.gold < HEAL_PRICE) { showToast(this, 'Pas assez d\'or !'); return; }
    run.gold -= HEAL_PRICE;
    run.heroes.forEach(h => { h.currentHp = Math.min(h.maxHp, h.currentHp + 40); });
    showToast(this, '+40 PV à tous les héros !');
    this.updateGold();
  }

  private leave(): void {
    const run = window.gameState.runManager.state;
    run.completeRoom({});
    this.scene.start('RunMap');
  }

  private updateGold(): void {
    const run = window.gameState.runManager.state;
    this.goldText.setText(`💰 ${run.gold} or`);
  }
}
