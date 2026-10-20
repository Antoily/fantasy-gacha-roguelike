import Phaser from 'phaser';
import { LAUGH } from '../data/sounds';
import { parseSave, SAVE_KEY } from '../logic/save';
import { parseSettings, SETTINGS_KEY } from '../logic/settings';

// Lit la sauvegarde une fois au démarrage et passe l'état à l'écran de tirage.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  // Le rire du leurre (005). Un fichier introuvable ne bloque pas le démarrage : le
  // chargeur le signale et le jeu restera muet sur ce son (FR-008).
  preload() {
    this.load.audio(LAUGH.key, [...LAUGH.urls]);
  }

  create() {
    let raw: string | null = null;
    let settings: string | null = null;
    try {
      raw = localStorage.getItem(SAVE_KEY);
      settings = localStorage.getItem(SETTINGS_KEY);
    } catch {
      // Stockage indisponible (navigation privée stricte) : partie neuve non persistée.
    }
    this.scene.start('Gacha', { ...parseSave(raw), settings: parseSettings(settings) });
  }
}
