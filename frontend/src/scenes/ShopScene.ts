import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, FONTS } from '../config';
import { makeButton, makePanel, makeTitle, rarityColor, showToast, fadeIn, transitionTo, isTransitioning } from '../ui/UIManager';
import { RELIC_POOL } from '../data/relics';
import { HERO_POOL } from '../data/heroes';
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

  create(data?: { noFade?: boolean }): void {
    const run = window.gameState.runManager.state;

    // Pas de fondu lors d'un restart (après achat) pour éviter un flash noir
    if (!data?.noFade) fadeIn(this);
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg_shop').setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55);

    makeTitle(this, GAME_WIDTH / 2, 38, '🛒 MARCHAND');
    this.goldText = this.add.text(GAME_WIDTH / 2, 65, `💰 ${run.gold} or`, { ...FONTS.gold, align: 'center' }).setOrigin(0.5);

    this.generateShopItems();
    this.drawRelics();
    this.drawHero();
    this.drawHeal();
    this.drawLeaveButton();

    // Mode auto : achats aléatoires puis sortie
    if (run.autoMode) {
      this.add.text(GAME_WIDTH - 10, 20, '🤖 AUTO', { ...FONTS.small, color: '#ffcc55' }).setOrigin(1, 0.5);
      this.scheduleAuto();
    }
  }

  private scheduleAuto(): void {
    // Achats aléatoires en une seule passe (sans scene.restart pour éviter une boucle
    // de redémarrages de scène), puis sortie.
    this.time.delayedCall(900, () => {
      if (isTransitioning(this)) return;
      const gs = window.gameState;
      const run = gs.runManager.state;

      // Chaque relique proposée a 50% de chances d'être achetée tant qu'il reste de l'or
      this.shopRelics.forEach(relic => {
        if (run.gold >= RELIC_PRICE && Math.random() < 0.5) {
          run.gold -= RELIC_PRICE;
          gs.runManager.applyRelic(relic);
        }
      });

      // Soin si des héros sont blessés et qu'il reste de l'or
      const injured = run.heroes.some(h => h.currentHp < h.maxHp);
      if (injured && run.gold >= HEAL_PRICE && Math.random() < 0.5) {
        run.gold -= HEAL_PRICE;
        run.heroes.forEach(h => { h.currentHp = Math.min(h.maxHp, h.currentHp + 40); });
      }

      this.updateGold();
      // Court délai pour voir l'or se mettre à jour, puis on quitte le marchand
      this.time.delayedCall(500, () => this.leave());
    });
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
      this.add.text(60, y + 10, relic.name, {
        ...FONTS.body,
        color: `#${rarityColor(relic.rarity).toString(16).padStart(6, '0')}`,
      });
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
    this.add.text(65, y + 14, this.shopHero.name, {
      ...FONTS.body,
      color: `#${rarityColor(this.shopHero.rarity).toString(16).padStart(6, '0')}`,
    });
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
    const gs = window.gameState;
    const run = gs.runManager.state;
    if (run.gold < RELIC_PRICE) { showToast(this, 'Pas assez d\'or !'); return; }
    run.gold -= RELIC_PRICE;
    gs.runManager.applyRelic(relic);
    showToast(this, `${relic.name} obtenu !`);
    this.updateGold();
    this.scene.restart({ noFade: true });
  }

  private buyHero(): void {
    if (isTransitioning(this)) return;
    const gs = window.gameState;
    const run = gs.runManager.state;
    if (!this.shopHero || run.gold < HERO_PRICE || run.heroes.length >= 5) {
      showToast(this, run.heroes.length >= 5 ? 'Équipe pleine !' : 'Pas assez d\'or !');
      return;
    }
    run.gold -= HERO_PRICE;
    gs.runManager.completeRoom({ heroId: this.shopHero.id });
    showToast(this, `${this.shopHero.name} rejoint l\'équipe !`);
    transitionTo(this, 'RunMap');
  }

  private buyHeal(): void {
    const gs = window.gameState;
    const run = gs.runManager.state;
    if (run.gold < HEAL_PRICE) { showToast(this, 'Pas assez d\'or !'); return; }
    run.gold -= HEAL_PRICE;
    run.heroes.forEach(h => { h.currentHp = Math.min(h.maxHp, h.currentHp + 40); });
    showToast(this, '+40 PV à tous les héros !');
    this.updateGold();
  }

  private leave(): void {
    if (isTransitioning(this)) return;
    const gs = window.gameState;
    gs.runManager.completeRoom({});
    transitionTo(this, 'RunMap');
  }

  private updateGold(): void {
    const run = window.gameState.runManager.state;
    this.goldText.setText(`💰 ${run.gold} or`);
  }
}
