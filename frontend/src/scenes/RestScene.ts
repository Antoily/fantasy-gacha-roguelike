import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, FONTS } from '../config';
import { makeButton, makePanel, makeTitle, makeHpBar, fadeIn, transitionTo, floatText } from '../ui/UIManager';
import { isHeroAlive, healHero } from '../entities/Hero';

const HEAL_AMOUNT = 35;
const UPGRADE_STAT_BONUS = 8;

export class RestScene extends Phaser.Scene {
  // Verrou anti double-clic : completeRoom ne doit s'appliquer qu'une fois
  private leaving = false;

  constructor() { super('Rest'); }

  create(): void {
    this.leaving = false;
    fadeIn(this);
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg_rest').setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.5);

    makeTitle(this, GAME_WIDTH / 2, 38, '🏕 REPOS');
    this.add.text(GAME_WIDTH / 2, 65, 'Choisissez une action', { ...FONTS.body, align: 'center' }).setOrigin(0.5);

    this.drawHeroList();
    this.drawActions();
  }

  private drawHeroList(): void {
    const run = window.gameState.runManager.state;
    const y = 100;
    this.add.text(18, y - 8, 'Héros', { ...FONTS.small });
    run.heroes.forEach((h, i) => {
      const cx = 20 + i * 65;
      const cy = y + 35;
      const alive = isHeroAlive(h);
      this.add.rectangle(cx + 26, cy, 56, 60, alive ? COLORS.panel : 0x1a1a1a).setStrokeStyle(1, alive ? COLORS.accentLight : 0x444444);
      this.add.image(cx + 26, cy - 12, `hero_${h.definitionId}`).setDisplaySize(36, 36);
      this.add.text(cx + 26, cy + 12, h.name.split(' ')[0], { fontSize: '8px', color: '#ffffff' }).setOrigin(0.5);
      const pct = Math.max(0, h.currentHp / h.maxHp);
      makeHpBar(this, cx + 26, cy + 25, 52, 5, pct);
      this.add.text(cx + 26, cy + 35, `${h.currentHp}/${h.maxHp}`, { ...FONTS.small, fontSize: '8px' }).setOrigin(0.5);
    });
  }

  private drawActions(): void {
    makePanel(this, GAME_WIDTH / 2, 238, 330, 72);
    this.add.text(GAME_WIDTH / 2, 218, '🏥 Soin de groupe', { ...FONTS.body, color: '#44dd88', align: 'center' }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 238, `Restaure ${HEAL_AMOUNT} PV à tous les héros vivants.`, { ...FONTS.small, align: 'center' }).setOrigin(0.5);
    makeButton(this, GAME_WIDTH / 2, 258, 'Soigner l\'équipe', () => this.healAll(), 200, 36, 0x225533);

    makePanel(this, GAME_WIDTH / 2, 340, 330, 72);
    this.add.text(GAME_WIDTH / 2, 318, '⚡ Entraînement', { ...FONTS.body, color: '#7744ff', align: 'center' }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 338, `Améliore l\'ATK d\'un héros de +${UPGRADE_STAT_BONUS}.`, { ...FONTS.small, align: 'center' }).setOrigin(0.5);
    makeButton(this, GAME_WIDTH / 2, 358, 'Choisir un héros', () => this.selectHeroForUpgrade(), 200, 36, 0x553377);

    makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 50, 'QUITTER LE CAMP', () => this.leave(), 240, 44, 0x444455);
  }

  private healAll(): void {
    if (this.leaving) return;
    this.leaving = true;
    const gs = window.gameState;
    const run = gs.runManager.state;
    run.heroes.filter(isHeroAlive).forEach((h, i) => {
      healHero(h, HEAL_AMOUNT);
      // +PV flottant au-dessus de chaque héros avant de quitter le camp
      floatText(this, 46 + i * 65, 110, `+${HEAL_AMOUNT}`, '#55ff88');
    });
    gs.runManager.completeRoom({});
    this.time.delayedCall(550, () => transitionTo(this, 'RunMap'));
  }

  private selectHeroForUpgrade(): void {
    const gs = window.gameState;
    const run = gs.runManager.state;
    const live = run.heroes.filter(isHeroAlive);
    if (live.length === 0) return;

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7).setInteractive();
    makePanel(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, 320, 260);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 110, 'Sélectionne un héros', { ...FONTS.body, align: 'center' }).setOrigin(0.5);

    live.forEach((h, i) => {
      const cx = GAME_WIDTH / 2 - 90 + i * 65;
      const cy = GAME_HEIGHT / 2 - 30;
      const bg = this.add.rectangle(cx, cy, 58, 60, COLORS.panel).setStrokeStyle(1, COLORS.accentLight).setInteractive({ useHandCursor: true });
      this.add.image(cx, cy - 12, `hero_${h.definitionId}`).setDisplaySize(36, 36);
      this.add.text(cx, cy + 12, h.name.split(' ')[0], { ...FONTS.small, fontSize: '9px' }).setOrigin(0.5);
      bg.on('pointerdown', () => {
        if (this.leaving) return;
        this.leaving = true;
        h.atk += UPGRADE_STAT_BONUS;
        gs.runManager.completeRoom({});
        floatText(this, cx, cy - 30, `+${UPGRADE_STAT_BONUS} ATK`, '#bb88ff');
        this.time.delayedCall(550, () => transitionTo(this, 'RunMap'));
      });
    });
  }

  private leave(): void {
    if (this.leaving) return;
    this.leaving = true;
    const gs = window.gameState;
    gs.runManager.completeRoom({});
    transitionTo(this, 'RunMap');
  }
}
