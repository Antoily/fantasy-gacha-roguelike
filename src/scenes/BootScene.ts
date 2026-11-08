import Phaser from 'phaser';
import { LAUGH } from '../data/sounds';
import { ART_READY, queueArt, rasterizeCharacters, rasterizeUi } from '../ui/art';
import { loadFont } from '../ui/font';
import { parseSave, SAVE_KEY } from '../logic/save';
import { parseSettings, SETTINGS_KEY } from '../logic/settings';

// Lit la sauvegarde une fois au démarrage et passe l'état à l'écran de tirage.
export class BootScene extends Phaser.Scene {
  private font: Promise<void> = Promise.resolve();

  constructor() {
    super('Boot');
  }

  // Le rire du leurre (005). Un fichier introuvable ne bloque pas le démarrage : le
  // chargeur le signale et le jeu restera muet sur ce son (FR-008).
  preload() {
    // La police (ADR 0008) se charge pendant les autres fichiers ; create() l'attend.
    this.font = loadFont();
    this.load.audio(LAUGH.key, [...LAUGH.urls]);
    // Visuels (007) : un fichier introuvable laisse le dessin d'avant à sa place (FR-010).
    queueArt(this.load);
  }

  create() {
    void Promise.all([rasterizeUi(this), this.font]).then(() => {
      this.startGacha();
      // Les gestionnaires de textures et de cache sont ceux du jeu : ils survivent à cette scène.
      return rasterizeCharacters(this);
    }).then(missing => {
      // Signaux pour l'e2e : illustrations prêtes, et celles en repli (FR-010).
      if (missing.length > 0) document.body.dataset.artMissing = missing.join(',');
      else delete document.body.dataset.artMissing;
      document.body.dataset.art = 'ready';
      this.game.events.emit(ART_READY);
    });
  }

  private startGacha() {
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
