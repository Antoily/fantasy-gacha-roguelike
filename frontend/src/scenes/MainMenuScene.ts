import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, FONTS } from '../config';
import { makeButton, makeTitle, makePanel } from '../ui/UIManager';
import { RunManager } from '../systems/RunManager';
import { TalentTreeSystem } from '../systems/TalentTree';
import { GachaSystem } from '../systems/GachaSystem';
import { RELIC_POOL } from '../data/relics';
import type { RelicDefinition } from '../data/relics';

// Global game state shared across scenes via scene data / registry
declare global {
  interface Window {
    gameState: GameState;
  }
}

export interface GameState {
  runManager: RunManager;
  talentTree: TalentTreeSystem;
  gacha: GachaSystem;
  unlockedHeroIds: string[];
  ownedRelicIds: string[];
  totalGold: number;  // persistent gold (separate from run gold)
  bestRun: { zonesCleared: number; roomsCleared: number };
}

export class MainMenuScene extends Phaser.Scene {
  constructor() { super('MainMenu'); }

  create(): void {
    if (!window.gameState) {
      window.gameState = {
        runManager: new RunManager(),
        talentTree: new TalentTreeSystem(),
        gacha: new GachaSystem(),
        unlockedHeroIds: ['aldric', 'sylva'],
        ownedRelicIds: [],
        totalGold: 0,
        bestRun: { zonesCleared: 0, roomsCleared: 0 },
      };
      this.loadProgress();
    }

    this.drawBackground();
    this.drawTitle();
    this.drawButtons();
    this.drawStats();
  }

  private drawBackground(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background);
    // Stars
    for (let i = 0; i < 60; i++) {
      const x = Phaser.Math.Between(0, GAME_WIDTH);
      const y = Phaser.Math.Between(0, GAME_HEIGHT);
      const size = Phaser.Math.FloatBetween(0.5, 2);
      this.add.circle(x, y, size, 0xffffff, Phaser.Math.FloatBetween(0.2, 0.8));
    }
  }

  private drawTitle(): void {
    makeTitle(this, GAME_WIDTH / 2, 100, 'FANTASY\nROGUELIKE');
    this.add.text(GAME_WIDTH / 2, 155, 'Tactique · Gacha · Roguelike', {
      ...FONTS.small, align: 'center',
    }).setOrigin(0.5);
  }

  private drawButtons(): void {
    makeButton(this, GAME_WIDTH / 2, 260, 'LANCER UN RUN', () => this.startRun(), 220, 50);
    makeButton(this, GAME_WIDTH / 2, 330, 'GACHA', () => this.scene.start('Gacha'), 220, 44, 0x553388);
    makeButton(this, GAME_WIDTH / 2, 395, 'ARBRE DE TALENTS', () => this.scene.start('Meta'), 220, 44, 0x335566);
    makeButton(this, GAME_WIDTH / 2, 455, 'COLLECTION', () => this.scene.start('Collection'), 220, 44, 0x335533);
  }

  private drawStats(): void {
    const gs = window.gameState;
    makePanel(this, GAME_WIDTH / 2, 555, 300, 80);
    this.add.text(GAME_WIDTH / 2, 532, `Or total : ${gs.totalGold}`, { ...FONTS.gold, align: 'center' }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 558, `Héros débloqués : ${gs.unlockedHeroIds.length}`, { ...FONTS.body, align: 'center' }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 578, `Meilleur run : Zone ${gs.bestRun.zonesCleared}`, { ...FONTS.small, align: 'center' }).setOrigin(0.5);
  }

  private startRun(): void {
    const gs = window.gameState;
    const bonuses = gs.talentTree.getBonuses();
    const startRelicIds: string[] = [];

    // Give start relics from talent (common relics only)
    if (bonuses.startRelicCount > 0) {
      const availableRelics = RELIC_POOL.filter((r: RelicDefinition) => r.rarity === 'common');
      for (let i = 0; i < bonuses.startRelicCount && i < availableRelics.length; i++) {
        startRelicIds.push(availableRelics[i].id);
      }
    }

    gs.runManager.startRun({
      unlockedHeroIds: gs.unlockedHeroIds,
      hpBonus: bonuses.hpBonus,
      atkPct: bonuses.atkPct,
      goldBonusPct: bonuses.goldBonusPct,
      startRelicIds,
      startGold: bonuses.startGold,
      hasRevivePassive: bonuses.hasRevivePassive,
      reviveHpPct: bonuses.reviveHpPct,
      extraHeroSlot: bonuses.extraHeroSlot,
    });

    this.scene.start('RunMap');
  }

  private loadProgress(): void {
    try {
      const raw = localStorage.getItem('fantasy_roguelike_save');
      if (!raw) return;
      const save = JSON.parse(raw);
      const gs = window.gameState;
      if (save.unlockedHeroIds) gs.unlockedHeroIds = save.unlockedHeroIds;
      if (save.ownedRelicIds) gs.ownedRelicIds = save.ownedRelicIds;
      if (save.totalGold !== undefined) gs.totalGold = save.totalGold;
      if (save.bestRun) gs.bestRun = save.bestRun;
      if (save.talentTree) gs.talentTree.load(save.talentTree);
      if (save.gacha) gs.gacha.load(save.gacha);
    } catch { /* fresh start */ }
  }
}

export function saveProgress(): void {
  try {
    const gs = window.gameState;
    const save = {
      unlockedHeroIds: gs.unlockedHeroIds,
      ownedRelicIds: gs.ownedRelicIds,
      totalGold: gs.totalGold,
      bestRun: gs.bestRun,
      talentTree: gs.talentTree.serialize(),
      gacha: gs.gacha.serialize(),
    };
    localStorage.setItem('fantasy_roguelike_save', JSON.stringify(save));
  } catch { /* storage not available */ }
}
