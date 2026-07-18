import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, CSS, FONTS, FONT_FAMILY, STROKE } from '../config';
import { makeButton, makePanel, makeTitle, fadeIn, transitionTo, staggerIn, countUp } from '../ui/UIManager';
import { saveProgress } from './MainMenuScene';
import { apiClient } from '../api/apiClient';

export class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOver'); }

  create(): void {
    const gs = window.gameState;
    const run = gs.runManager.state;
    const victory = run.victory;

    fadeIn(this, 300);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, victory ? COLORS.result.win : COLORS.result.lose);

    // Braises / étoiles qui dérivent lentement vers le haut
    for (let i = 0; i < 30; i++) {
      const ember = this.add.circle(
        Phaser.Math.Between(0, GAME_WIDTH),
        Phaser.Math.Between(0, GAME_HEIGHT),
        Phaser.Math.FloatBetween(1, 3),
        victory ? COLORS.gold : COLORS.btn.danger,
        Phaser.Math.FloatBetween(0.2, 0.7),
      );
      if (i % 2 === 0) {
        this.tweens.add({
          targets: ember,
          y: ember.y - Phaser.Math.Between(30, 80),
          alpha: 0.05,
          duration: Phaser.Math.Between(3000, 6000),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.InOut',
        });
      }
    }

    // Update best run
    const zonesCleared = run.zoneIndex + (victory ? 1 : 0);
    const roomsCleared = run.rooms.filter(r => r.completed).length;
    if (zonesCleared > gs.bestRun.zonesCleared ||
        (zonesCleared === gs.bestRun.zonesCleared && roomsCleared > gs.bestRun.roomsCleared)) {
      gs.bestRun = { zonesCleared, roomsCleared };
    }

    // Carry over run gold to meta gold
    gs.totalGold += run.gold;

    saveProgress();
    this.reportRun(zonesCleared, roomsCleared, victory, run.gold);

    const title = makeTitle(this, GAME_WIDTH / 2, 70, victory ? '🏆 VICTOIRE !' : '💀 DÉFAITE');
    title.setScale(0);
    this.tweens.add({ targets: title, scale: 1, duration: 450, ease: 'Back.Out' });
    if (!victory) this.cameras.main.shake(300, 0.006);

    this.add.text(GAME_WIDTH / 2, 115, victory
      ? 'Vous avez conquis le donjon !'
      : 'Vos héros sont tombés dans l\'obscurité.', {
      ...FONTS.body, align: 'center', wordWrap: { width: 300 },
    }).setOrigin(0.5);

    this.drawStats(zonesCleared, roomsCleared, run.gold);
    this.drawHeroSummary();

    makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 60, 'MENU PRINCIPAL', () => transitionTo(this, 'MainMenu'), 240, 48,
      victory ? COLORS.btn.success : COLORS.btn.danger);
    makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 108, 'NOUVEAU RUN',
      () => transitionTo(this, 'TeamSelect', { auto: false }), 240, 40);
  }

  private drawStats(zones: number, rooms: number, gold: number): void {
    makePanel(this, GAME_WIDTH / 2, 240, 320, 130);
    const goldRecovered = gold;
    const lines = [
      `Zones traversées : ${zones}`,
      `Salles terminées : ${rooms}`,
    ];
    const texts = lines.map((l, i) =>
      this.add.text(GAME_WIDTH / 2, 192 + i * 28, l, { ...FONTS.body, align: 'center' }).setOrigin(0.5)
    );
    const goldText = this.add.text(GAME_WIDTH / 2, 192 + 3 * 28, `Or gagné : 0 💰`, { ...FONTS.body, align: 'center' }).setOrigin(0.5);
    staggerIn(this, [...texts, goldText], 10, 90);
    countUp(this, goldText, 0, goldRecovered, n => `Or gagné : ${n} 💰`, 800);
  }

  private drawHeroSummary(): void {
    const run = window.gameState.runManager.state;
    const y = 360;
    this.add.text(GAME_WIDTH / 2, y - 10, 'État des héros', { ...FONTS.small, align: 'center' }).setOrigin(0.5);
    run.heroes.forEach((h, i) => {
      const cx = 20 + i * 68;
      const alive = h.currentHp > 0;
      this.add.rectangle(cx + 26, y + 32, 52, 44, COLORS.panel)
        .setStrokeStyle(STROKE.thin, alive ? COLORS.hp : COLORS.btn.danger);
      this.add.text(cx + 26, y + 22, alive ? '✓' : '✗', { fontSize: '18px', color: alive ? CSS.hp : CSS.danger, fontFamily: FONT_FAMILY, fontStyle: 'bold' }).setOrigin(0.5);
      this.add.text(cx + 26, y + 42, h.short, { fontSize: '8px', color: CSS.textDim, fontFamily: FONT_FAMILY, fontStyle: 'bold' }).setOrigin(0.5);
    });
  }

  private reportRun(zones: number, rooms: number, victory: boolean, gold: number): void {
    const run = window.gameState.runManager.state;
    if (!apiClient.isAuthenticated()) return;
    apiClient.saveRun({
      zonesCleared: zones,
      roomsCleared: rooms,
      victory,
      goldEarned: gold,
      heroesUsed: run.heroes.map(h => h.definitionId),
    }).catch(() => { /* offline, no-op */ });
  }
}
