import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, FONTS } from '../config';
import { makeButton, makeTitle, makePanel, fadeIn, transitionTo, staggerIn } from '../ui/UIManager';
import { RunManager } from '../systems/RunManager';
import { GachaSystem } from '../systems/GachaSystem';
import { STARTER_HERO_IDS } from '../data/heroes';

// Global game state shared across scenes via scene data / registry
declare global {
  interface Window {
    gameState: GameState;
  }
}

export interface GameState {
  runManager: RunManager;
  gacha: GachaSystem;
  unlockedHeroIds: string[];
  totalGold: number;  // persistent gold (separate from run gold)
  bestRun: { zonesCleared: number; roomsCleared: number };
  // Vitesse de lecture des combats (1 / 2 / 4) — préférence du joueur, elle
  // doit survivre d'un combat à l'autre et d'une session à l'autre.
  combatSpeed: number;
}

export class MainMenuScene extends Phaser.Scene {
  constructor() { super('MainMenu'); }

  create(): void {
    if (!window.gameState) {
      window.gameState = {
        runManager: new RunManager(),
        gacha: new GachaSystem(),
        unlockedHeroIds: [...STARTER_HERO_IDS],
        totalGold: 0,
        bestRun: { zonesCleared: 0, roomsCleared: 0 },
        combatSpeed: 1,
      };
      this.loadProgress();
      applyDebugGold();
    }

    fadeIn(this);
    this.drawBackground();
    this.drawTitle();
    this.drawButtons();
    this.drawStats();
  }

  private drawBackground(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background);

    // Trame de points façon impression BD — remplace le champ d'étoiles,
    // qui était invisible sur un fond clair.
    const STEP = 24;
    for (let x = STEP / 2; x < GAME_WIDTH; x += STEP) {
      for (let y = STEP / 2; y < GAME_HEIGHT; y += STEP) {
        this.add.circle(x, y, 2, COLORS.backgroundAlt, 1);
      }
    }

    // Quelques bulles colorées cernées qui flottent, pour animer le fond
    const bubbleColors = [COLORS.accent, COLORS.secondary, COLORS.gold, COLORS.btn.magic];
    for (let i = 0; i < 10; i++) {
      const x = Phaser.Math.Between(16, GAME_WIDTH - 16);
      const y = Phaser.Math.Between(16, GAME_HEIGHT - 16);
      const r = Phaser.Math.Between(5, 12);
      const bubble = this.add.circle(x, y, r, Phaser.Utils.Array.GetRandom(bubbleColors), 0.5)
        .setStrokeStyle(2, COLORS.ink, 0.5);
      this.tweens.add({
        targets: bubble,
        y: y - Phaser.Math.Between(10, 24),
        duration: Phaser.Math.Between(1800, 3400),
        delay: Phaser.Math.Between(0, 1200),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });
    }
  }

  private drawTitle(): void {
    const title = makeTitle(this, GAME_WIDTH / 2, 100, 'FANTASY\nROGUELIKE');
    const subtitle = this.add.text(GAME_WIDTH / 2, 155, 'Tactique · Gacha · Roguelike', {
      ...FONTS.small, align: 'center',
    }).setOrigin(0.5);

    staggerIn(this, [title, subtitle], 12, 80);
    // Flottement continu du titre — démarre après l'animation d'entrée pour éviter un conflit de tween sur y
    this.tweens.add({ targets: title, y: 104, duration: 2200, delay: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  private drawButtons(): void {
    const buttons = [
      makeButton(this, GAME_WIDTH / 2, 248, 'LANCER UN RUN', () => transitionTo(this, 'TeamSelect', { auto: false }), 220, 46),
      makeButton(this, GAME_WIDTH / 2, 302, 'RUN AUTO (+30% 💰)', () => transitionTo(this, 'TeamSelect', { auto: true }), 220, 50, COLORS.btn.gold, 'Choix aléatoire'),
      makeButton(this, GAME_WIDTH / 2, 356, 'GACHA', () => transitionTo(this, 'Gacha'), 220, 42, COLORS.btn.magic),
      makeButton(this, GAME_WIDTH / 2, 404, 'COLLECTION', () => transitionTo(this, 'Collection'), 220, 42, COLORS.btn.success),
    ];
    staggerIn(this, buttons, 20);

  }

  private drawStats(): void {
    const gs = window.gameState;
    makePanel(this, GAME_WIDTH / 2, 555, 300, 80);
    this.add.text(GAME_WIDTH / 2, 532, `Or total : ${gs.totalGold}`, { ...FONTS.gold, align: 'center' }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 558, `Héros débloqués : ${gs.unlockedHeroIds.length}`, { ...FONTS.body, align: 'center' }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 578, `Meilleur run : Zone ${gs.bestRun.zonesCleared}`, { ...FONTS.small, align: 'center' }).setOrigin(0.5);
  }

  private loadProgress(): void {
    try {
      const raw = localStorage.getItem('fantasy_roguelike_save');
      if (!raw) return;
      const save = JSON.parse(raw);
      const gs = window.gameState;
      if (save.unlockedHeroIds) gs.unlockedHeroIds = save.unlockedHeroIds;
      if (save.totalGold !== undefined) gs.totalGold = save.totalGold;
      if (save.bestRun) gs.bestRun = save.bestRun;
      if (save.combatSpeed) gs.combatSpeed = save.combatSpeed;
      if (save.gacha) gs.gacha.load(save.gacha);
    } catch { /* fresh start */ }
  }
}

// ⚠️ TEMPORAIRE — or de test pour explorer le gacha sans farmer.
// Mettre DEBUG_GOLD à 0 (ou supprimer l'appel dans create()) avant toute publication.
export const DEBUG_GOLD = 9_999_999;

function applyDebugGold(): void {
  if (DEBUG_GOLD <= 0) return;
  window.gameState.totalGold = DEBUG_GOLD;
  saveProgress();
}

export function saveProgress(): void {
  try {
    const gs = window.gameState;
    const save = {
      unlockedHeroIds: gs.unlockedHeroIds,
      totalGold: gs.totalGold,
      bestRun: gs.bestRun,
      combatSpeed: gs.combatSpeed,
      gacha: gs.gacha.serialize(),
    };
    localStorage.setItem('fantasy_roguelike_save', JSON.stringify(save));
  } catch { /* storage not available */ }
}
