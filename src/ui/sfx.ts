import Phaser from 'phaser';
import {
  DEFLATE, LAUGH, LAUGH_DUCK, SOUND_CHOKES, SOUND_RECIPES, SOUND_STOP_FADE_MS, type Tone,
} from '../data/sounds';
import type { Cue } from '../logic/soundCues';
import { createBus, duckVoice, fadeVoice, scheduleTones, type Bus, type Voice } from './synth';

// Lecteur des sons du tirage (005, ADR 0006). Les bruitages sont synthétisés (src/ui/synth.ts)
// sur le contexte Web Audio de Phaser ; le rire est un fichier chargé par BootScene, joué ici
// dans le même bus pour que la coupure et le limiteur le tiennent aussi.
// Rien ici ne doit pouvoir bloquer le jeu (FR-008) : sans audio, il se tait.
export class Sfx {
  private muted: boolean;
  // Toutes les sources qui sonnent ou vont sonner : notes, souffles et rire.
  private readonly live = new Set<Voice>();
  private bus: { ctx: AudioContext; bus: Bus } | null = null;

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
      const ctx = this.context();
      if (!ctx) return;
      if (ctx.state === 'suspended') void ctx.resume();
      const now = ctx.currentTime;
      // Montée et rire étouffent le faux palier qui sonne encore (FR-019) ; le vrai palier
      // baisse le rire qui sonne encore, pour se faire entendre dessous.
      if (cue === 'rise' || cue === 'laugh') this.choke(now, SOUND_CHOKES[cue]);
      if (cue.startsWith('tier:')) this.each(v => v.name === 'laugh', v => duckVoice(v, now, LAUGH_DUCK.ms, LAUGH_DUCK.gain));
      if (cue === 'laugh') {
        this.playLaugh(ctx, now);
        this.synth(ctx, DEFLATE, 'deflate');
      } else {
        this.synth(ctx, SOUND_RECIPES[cue], cue);
      }
    } catch {
      // Contexte audio refusé ou fermé : le jeu continue en silence.
    }
  }

  // Passer l'animation ou couper le son éteint ce qui sonne encore (FR-005, FR-016) : fondu
  // de 25 ms plutôt qu'un arrêt net, qui claque. Le compteur tombe à zéro tout de suite,
  // puisque plus rien ne peut se faire entendre au-delà du fondu.
  stopAll() {
    const ctx = this.context();
    const now = ctx?.currentTime ?? 0;
    this.live.forEach(voice => {
      try {
        fadeVoice(voice, now, SOUND_STOP_FADE_MS);
      } catch {
        // Contexte fermé : la voix ne sonne plus de toute façon.
      }
    });
    this.live.clear();
    this.showLive();
  }

  // Nombre de sources en train de sonner, lu par l'e2e : passer doit le ramener à 0.
  private showLive() {
    document.body.dataset.soundsLive = String(this.live.size);
  }

  private context(): AudioContext | null {
    const sound = this.scene.sound as Partial<Phaser.Sound.WebAudioSoundManager>;
    return sound.context ?? null;
  }

  private output(ctx: AudioContext): Bus {
    if (this.bus?.ctx !== ctx) this.bus = { ctx, bus: createBus(ctx) };
    return this.bus.bus;
  }

  private each(match: (v: Voice) => boolean, act: (v: Voice) => void) {
    this.live.forEach(v => {
      if (match(v)) act(v);
    });
  }

  private choke(now: number, { ms, pitch }: { ms: number; pitch: number }) {
    this.each(v => v.name.startsWith('tier:'), v => {
      fadeVoice(v, now, ms, pitch);
      this.live.delete(v);
    });
    this.showLive();
  }

  private track(voice: Voice) {
    voice.src.onended = () => {
      this.live.delete(voice);
      this.showLive();
    };
    this.live.add(voice);
    this.showLive();
  }

  private synth(ctx: AudioContext, tones: readonly Tone[], name: string) {
    // Chaque voix est suivie dès sa création : si une suivante plante, celles déjà
    // programmées restent coupables.
    const bus = this.output(ctx);
    for (const tone of tones) {
      for (const voice of scheduleTones(ctx, [tone], ctx.currentTime, bus.synth, name)) this.track(voice);
    }
  }

  // Le rire passe par le lecteur (et non par scene.sound) : même bus, même coupure.
  private playLaugh(ctx: AudioContext, now: number) {
    const buffer: unknown = this.scene.cache.audio.get(LAUGH.key);
    if (!(buffer instanceof AudioBuffer)) return;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = LAUGH.gain;
    src.connect(gain).connect(this.output(ctx).limiter);
    src.start(now);
    this.track({ name: 'laugh', src, gain, pitch: src.playbackRate });
  }
}
