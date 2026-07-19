import { RunManager } from '../systems/RunManager';
import { GachaSystem } from '../systems/GachaSystem';
import { STARTER_HERO_IDS } from '../data/heroes';

// État global partagé par toutes les scènes. Il vivait dans `MainMenuScene`,
// ce qui obligeait Combat/Gacha/GameOver à importer une *scène* juste pour
// sauvegarder. L'état n'est pas un écran : il a sa place ici.
declare global {
  interface Window {
    gameState: GameState;
  }
}

export interface GameState {
  runManager: RunManager;
  gacha: GachaSystem;
  // Héros débloqués (persistant) — la seule progression méta du jeu
  unlockedHeroIds: string[];
  // Or méta, distinct de l'or du run en cours
  totalGold: number;
  bestRun: { zonesCleared: number; roomsCleared: number };
  // Vitesse de lecture des combats (1 / 2 / 4) — préférence du joueur, elle
  // doit survivre d'un combat à l'autre et d'une session à l'autre.
  combatSpeed: number;
}

const SAVE_KEY = 'fantasy_roguelike_save';

// Or de test pour explorer le gacha sans farmer. À 0 = désactivé, ce qui doit
// rester l'état par défaut : toute valeur > 0 écrase l'or du joueur à CHAQUE
// rechargement de page, ce qui rend l'économie intestable.
export const DEBUG_GOLD = 0;

function freshState(): GameState {
  return {
    runManager: new RunManager(),
    gacha: new GachaSystem(),
    unlockedHeroIds: [...STARTER_HERO_IDS],
    totalGold: 0,
    bestRun: { zonesCleared: 0, roomsCleared: 0 },
    combatSpeed: 1,
  };
}

function loadProgress(): void {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const save = JSON.parse(raw);
    const gs = window.gameState;
    if (save.unlockedHeroIds) gs.unlockedHeroIds = save.unlockedHeroIds;
    if (save.totalGold !== undefined) gs.totalGold = save.totalGold;
    if (save.bestRun) gs.bestRun = save.bestRun;
    if (save.combatSpeed) gs.combatSpeed = save.combatSpeed;
    if (save.gacha) gs.gacha.load(save.gacha);
  } catch { /* sauvegarde illisible : on repart d'un état neuf */ }
}

export function saveProgress(): void {
  try {
    const gs = window.gameState;
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      unlockedHeroIds: gs.unlockedHeroIds,
      totalGold: gs.totalGold,
      bestRun: gs.bestRun,
      combatSpeed: gs.combatSpeed,
      gacha: gs.gacha.serialize(),
    }));
  } catch { /* storage indisponible */ }
}

// Initialise l'état au premier passage puis ne fait plus rien : un retour au
// menu principal ne doit jamais réinitialiser la progression en cours.
export function initGameState(): void {
  if (window.gameState) return;

  window.gameState = freshState();
  loadProgress();

  if (DEBUG_GOLD > 0) {
    window.gameState.totalGold = DEBUG_GOLD;
    saveProgress();
  }
}
