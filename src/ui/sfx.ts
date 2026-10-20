import Phaser from 'phaser';
import {
  LAUGH, SOUND_ATTACK_MS, SOUND_MASTER_GAIN, SOUND_RECIPES, SOUND_RELEASE_MS, type Tone,
} from '../data/sounds';
import type { Cue } from '../logic/soundCues';

// Lecteur des sons du tirage (005, ADR 0006). Les bruitages sont synthétisés sur le
// contexte Web Audio de Phaser ; le rire est un fichier chargé par BootScene.
// Rien ici ne doit pouvoir bloquer le jeu (FR-008) : sans audio, il se tait.
export class Sfx {
  private muted: boolean;
  private readonly live = new Set<OscillatorNode>();
  private laugh: Phaser.Sound.BaseSound | null = null;

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

  play(cue: Cue) {
    if (this.muted) return;
    const log = document.body.dataset.sounds;
    document.body.dataset.sounds = log ? `${log} ${cue}` : cue;
    try {
      if (cue === 'laugh') this.playLaugh();
      else this.synth(SOUND_RECIPES[cue]);
    } catch {
      // Contexte audio refusé ou fermé : le jeu continue en silence.
    }
  }

  // Passer l'animation coupe aussitôt ce qui sonne encore (FR-005).
  stopAll() {
    this.live.forEach(osc => {
      try {
        osc.stop();
      } catch {
        // Déjà arrêté.
      }
    });
    this.live.clear();
    this.laugh?.stop();
    this.showLive();
  }

  // Nombre de notes en train de sonner, lu par l'e2e : passer doit le ramener à 0.
  private showLive() {
    document.body.dataset.soundsLive = String(this.live.size);
  }

  private context(): AudioContext | null {
    const sound = this.scene.sound as Partial<Phaser.Sound.WebAudioSoundManager>;
    return sound.context ?? null;
  }

  private synth(tones: readonly Tone[]) {
    const ctx = this.context();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();
    const now = ctx.currentTime;
    const attack = SOUND_ATTACK_MS / 1000;
    const release = SOUND_RELEASE_MS / 1000;
    for (const tone of tones) {
      const start = now + tone.at / 1000;
      const end = start + tone.dur / 1000;
      const osc = ctx.createOscillator();
      osc.type = tone.wave;
      osc.frequency.setValueAtTime(tone.freq, start);
      if (tone.to !== undefined) osc.frequency.exponentialRampToValueAtTime(tone.to, end);
      // Enveloppe : attaque et relâche courtes, sans quoi chaque note claque.
      const gain = ctx.createGain();
      const peak = tone.gain * SOUND_MASTER_GAIN;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(peak, start + attack);
      gain.gain.setValueAtTime(peak, end);
      gain.gain.linearRampToValueAtTime(0, end + release);
      osc.connect(gain).connect(ctx.destination);
      osc.onended = () => {
        this.live.delete(osc);
        this.showLive();
      };
      this.live.add(osc);
      this.showLive();
      osc.start(start);
      osc.stop(end + release + 0.01);
    }
  }

  private playLaugh() {
    if (!this.scene.cache.audio.exists(LAUGH.key)) return;
    this.laugh ??= this.scene.sound.add(LAUGH.key, { volume: LAUGH.gain });
    this.laugh.play();
  }
}
