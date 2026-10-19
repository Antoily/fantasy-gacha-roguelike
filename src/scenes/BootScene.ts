import Phaser from 'phaser';
import { parseSave, SAVE_KEY } from '../logic/save';

// Lit la sauvegarde une fois au démarrage et passe l'état à l'écran de tirage.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(SAVE_KEY);
    } catch {
      // Stockage indisponible (navigation privée stricte) : partie neuve non persistée.
    }
    this.scene.start('Gacha', parseSave(raw));
  }
}
