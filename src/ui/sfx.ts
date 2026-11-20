import Phaser from 'phaser';
import { LAUGH, type SoundVariant } from '../data/sounds';
import type { Cue } from '../logic/soundCues';
import { Mixer } from './synth';

// Lecteur des sons du tirage (005, ADR 0006). Les bruitages sont synthétisés et mixés par
// src/ui/synth.ts sur le contexte Web Audio de Phaser ; le rire est un fichier chargé par
// BootScene, joué dans le même bus. Rien ici ne doit pouvoir bloquer le jeu (FR-008) : sans
// audio, il se tait.
export class Sfx {
  private muted: boolean;
  private mixer: { ctx: AudioContext; mixer: Mixer } | null = null;

  constructor(private readonly scene: Phaser.Scene, muted: boolean) {
    this.muted = muted;
    document.body.dataset.muted = muted ? '1' : '0';
  }

  get isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    document.body.dataset.muted = muted ? '1' : '0';
    if (muted) this.stopAll();
  }

  // Journal des sons émis depuis le dernier tirage, lu par l'e2e (research R6) : la CI
  // n'entend rien, elle vérifie ce qui a été joué.
  resetLog() {
    document.body.dataset.sounds = '';
  }

  // La variante (rang d'une fissure, palier transposé, instants, rang, sens) change le son, pas le journal.
  play(cue: Cue, variant?: SoundVariant) {
    if (this.muted) return;
    const log = document.body.dataset.sounds;
    document.body.dataset.sounds = log ? `${log} ${cue}` : cue;
    try {
      const mixer = this.output();
      if (!mixer) return;
      mixer.play(cue, variant);
    } catch {
      // Contexte audio refusé ou fermé : le jeu continue en silence.
    }
  }

  // Éteint en fondu ce qui sonne encore d'un bruitage (la fanfare quand la présentation ferme).
  fade(cue: Cue, ms: number) {
    try {
      this.mixer?.mixer.fade(cue, ms);
    } catch {
      // Contexte fermé : plus rien ne sonne de toute façon.
    }
  }

  // Passer l'animation ou couper le son éteint ce qui sonne encore (FR-005, FR-016).
  stopAll() {
    try {
      this.mixer?.mixer.stopAll();
    } catch {
      // Contexte fermé : plus rien ne sonne de toute façon.
    }
  }

  private output(): Mixer | null {
    const sound = this.scene.sound as Partial<Phaser.Sound.WebAudioSoundManager>;
    const ctx = sound.context;
    if (!ctx) return null;
    if (ctx.state === 'suspended') void ctx.resume();
    if (this.mixer?.ctx !== ctx) {
      // Nombre de sources en train de sonner, lu par l'e2e : passer doit le ramener à 0.
      const mixer = new Mixer(ctx, () => this.laugh(), n => { document.body.dataset.soundsLive = String(n); });
      this.mixer = { ctx, mixer };
    }
    return this.mixer.mixer;
  }

  private laugh(): AudioBuffer | null {
    const buffer: unknown = this.scene.cache.audio.get(LAUGH.key);
    return buffer instanceof AudioBuffer ? buffer : null;
  }
}
