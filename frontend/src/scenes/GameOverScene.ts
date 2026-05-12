import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, FONTS } from '../config';
import { makeButton, makePanel, makeTitle } from '../ui/UIManager';
import { saveProgress } from './MainMenuScene';
import { apiClient } from '../api/apiClient';

export class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOver'); }

  create(): void {
    const gs = window.gameState;
    const run = gs.runManager.state;
    const victory = run.victory;

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, victory ? 0x0a1a0a : 0x1a0a0a);

    // Stars / embers
    for (let i = 0; i < 30; i++) {
      this.add.circle(
        Phaser.Math.Between(0, GAME_WIDTH),
        Phaser.Math.Between(0, GAME_HEIGHT),
        Phaser.Math.FloatBetween(1, 3),
        victory ? 0xffd700 : 0xff4422,
        Phaser.Math.FloatBetween(0.2, 0.7),
      );
    }

    // Add talent points to tree
    gs.talentTree.addPoints(run.talentPointsEarned);

    // Update best run
    const zonesCleared = run.zoneIndex + (victory ? 1 : 0);
    const roomsCleared = run.rooms.filter(r => r.completed).length;
    if (zonesCleared > gs.bestRun.zonesCleared ||
        (zonesCleared === gs.bestRun.zonesCleared && roomsCleared > gs.bestRun.roomsCleared)) {
      gs.bestRun = { zonesCleared, roomsCleared };
    }

    // Carry over run gold to meta gold
    gs.totalGold += Math.floor(run.gold * 0.3);

    saveProgress();
    this.reportRun(zonesCleared, roomsCleared, victory, run.gold);

    makeTitle(this, GAME_WIDTH / 2, 70, victory ? '🏆 VICTOIRE !' : '💀 DÉFAITE');

    this.add.text(GAME_WIDTH / 2, 115, victory
      ? 'Vous avez conquis le donjon !'
      : 'Vos héros sont tombés dans l\'obscurité.', {
      ...FONTS.body, align: 'center', wordWrap: { width: 300 },
    }).setOrigin(0.5);

    this.drawStats(zonesCleared, roomsCleared, run.talentPointsEarned, run.gold);
    this.drawHeroSummary();

    makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 60, 'MENU PRINCIPAL', () => this.scene.start('MainMenu'), 240, 48,
      victory ? 0x335533 : 0x553333);
    makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 108, 'NOUVEAU RUN', () => {
      const bonuses = gs.talentTree.getBonuses();
      gs.runManager.startRun({
        unlockedHeroIds: gs.unlockedHeroIds,
        hpBonus: bonuses.hpBonus,
        atkPct: bonuses.atkPct,
        goldBonusPct: bonuses.goldBonusPct,
        startRelicIds: [],
        startGold: bonuses.startGold,
        hasRevivePassive: bonuses.hasRevivePassive,
        reviveHpPct: bonuses.reviveHpPct,
        extraHeroSlot: bonuses.extraHeroSlot,
      });
      this.scene.start('RunMap');
    }, 240, 40);
  }

  private drawStats(zones: number, rooms: number, pts: number, gold: number): void {
    makePanel(this, GAME_WIDTH / 2, 240, 320, 130);
    const lines = [
      `Zones traversées : ${zones}`,
      `Salles terminées : ${rooms}`,
      `Points de talent gagnés : ${pts}`,
      `Or récupéré (30%) : ${Math.floor(gold * 0.3)} 💰`,
    ];
    lines.forEach((l, i) => {
      this.add.text(GAME_WIDTH / 2, 192 + i * 28, l, { ...FONTS.body, align: 'center' }).setOrigin(0.5);
    });
  }

  private drawHeroSummary(): void {
    const run = window.gameState.runManager.state;
    const y = 360;
    this.add.text(GAME_WIDTH / 2, y - 10, 'État des héros', { ...FONTS.small, align: 'center' }).setOrigin(0.5);
    run.heroes.forEach((h, i) => {
      const cx = 20 + i * 68;
      const alive = h.currentHp > 0;
      this.add.rectangle(cx + 26, y + 32, 52, 44, alive ? 0x1e2a1e : 0x2a1e1e).setStrokeStyle(1, alive ? 0x44cc44 : 0xcc4444);
      this.add.text(cx + 26, y + 22, alive ? '✓' : '✗', { fontSize: '18px', color: alive ? '#44cc44' : '#cc4444' }).setOrigin(0.5);
      this.add.text(cx + 26, y + 42, h.name.split(' ')[0], { fontSize: '8px', color: '#888899' }).setOrigin(0.5);
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
