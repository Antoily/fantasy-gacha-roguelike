import {
  DEFLATE, LAUGH, LAUGH_DUCK, SOUND_ATTACK_MS, SOUND_CHOKES, SOUND_DIP, SOUND_LIMITER, SOUND_MASTER_GAIN,
  SOUND_RELEASE_MS, SOUND_STOP_FADE_MS, soundRecipe, type SoundVariant, type Tone,
} from '../data/sounds';
import { mulberry32 } from '../logic/rng';
import type { Cue } from '../logic/soundCues';

// Moteur des bruitages (révision du 2026-11-13, FR-014 à FR-016) : Web Audio seul, sans
// Phaser, pour que le rendu hors navigateur (OfflineAudioContext) passe par le même code que
// le jeu. src/ui/sfx.ts y ajoute le journal, le réglage et l'accès au contexte de Phaser.

// Une source en train de sonner (ou programmée), avec le nom de son bruitage pour
// l'étouffement. `out` est un gain réservé aux coupures (1 au départ) : l'enveloppe garde ses
// rampes, celui-ci n'a que les nôtres, dont on garde la trace (`level`) pour savoir à tout
// instant où il en est. (cancelAndHoldAtTime sur l'enveloppe en cours a donné, dans Chromium,
// une valeur tenue fausse : un claquement à la coupure, vu au rendu hors navigateur.)
export interface Voice {
  readonly name: string;
  readonly src: AudioScheduledSourceNode;
  readonly out: GainNode;
  level: Ramp;
  // Hauteur à faire descendre quand le faux palier se dégonfle, et sa valeur à l'instant t.
  readonly pitch: AudioParam;
  readonly pitchAt: (t: number) => number;
}

interface Ramp {
  readonly from: number;
  readonly to: number;
  readonly t0: number;
  readonly t1: number;
}

const levelAt = ({ from, to, t0, t1 }: Ramp, t: number): number =>
  t >= t1 ? to : t <= t0 ? from : from + ((to - from) * (t - t0)) / (t1 - t0);

// Bus maître : les bruitages passent par `synth` (volume général), le rire entre directement
// dans le limiteur (il a son propre gain) ; tout ressort par le limiteur.
export interface Bus {
  readonly synth: GainNode;
  readonly limiter: DynamicsCompressorNode;
}

export function createBus(ctx: BaseAudioContext): Bus {
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = SOUND_LIMITER.threshold;
  limiter.knee.value = SOUND_LIMITER.knee;
  limiter.ratio.value = SOUND_LIMITER.ratio;
  limiter.attack.value = SOUND_LIMITER.attack / 1000;
  limiter.release.value = SOUND_LIMITER.release / 1000;
  limiter.connect(ctx.destination);
  const synth = ctx.createGain();
  synth.gain.value = SOUND_MASTER_GAIN;
  synth.connect(limiter);
  return { synth, limiter };
}

// Bruit blanc d'une seconde, calculé une fois par contexte à graine fixe : jamais Math.random,
// que l'e2e remplace par une file de valeurs scriptées (le tirage serait décalé).
const NOISE_SEED = 0x5eed;
const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();
export function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  let buffer = noiseBuffers.get(ctx);
  if (!buffer) {
    buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    const rng = mulberry32(NOISE_SEED);
    for (let i = 0; i < data.length; i++) data[i] = rng() * 2 - 1;
    noiseBuffers.set(ctx, buffer);
  }
  return buffer;
}

// Départ dans le bruit, décalé à chaque souffle pour que deux souffles simultanés ne soient
// pas le même signal (ils s'additionneraient en phase). Suite fixe, pas de hasard.
let noiseCursor = 0;
const NOISE_STEP = 0.618;

// Programme une note d'un bruitage commencé à `t0` (secondes du contexte) vers `dest`.
function scheduleTone(ctx: BaseAudioContext, tone: Tone, t0: number, dest: AudioNode, name: string): Voice {
  const start = t0 + tone.at / 1000;
  const end = start + tone.dur / 1000;
  const release = (tone.release ?? SOUND_RELEASE_MS) / 1000;
  let src: AudioScheduledSourceNode;
  let pitch: AudioParam;
  let pitchAt: (t: number) => number = () => 1;
  if (tone.wave === 'noise') {
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer(ctx);
    noise.loop = true;
    pitch = noise.playbackRate;
    src = noise;
    noiseCursor = (noiseCursor + NOISE_STEP) % 1;
  } else {
    const { freq, to } = tone;
    pitchAt = t => (to === undefined || t <= start ? freq : freq * (to / freq) ** Math.min(1, (t - start) / (end - start)));
    const osc = ctx.createOscillator();
    osc.type = tone.wave;
    osc.frequency.setValueAtTime(tone.freq, start);
    if (tone.to !== undefined) osc.frequency.exponentialRampToValueAtTime(tone.to, end);
    if (tone.detune !== undefined) osc.detune.value = tone.detune;
    pitch = osc.frequency;
    src = osc;
  }
  let out: AudioNode = src;
  if (tone.filter) {
    const f = ctx.createBiquadFilter();
    f.type = tone.filter.type;
    f.frequency.setValueAtTime(tone.filter.freq, start);
    if (tone.filter.to !== undefined) f.frequency.exponentialRampToValueAtTime(tone.filter.to, end);
    if (tone.filter.q !== undefined) f.Q.value = tone.filter.q;
    out = out.connect(f);
  }
  // Enveloppe : attaque courte (sans quoi la note claque), puis décroissance naturelle,
  // crescendo ou plateau, et relâche exponentielle (τ = relâche / 5, à −43 dB à la fin).
  const attack = (tone.attack ?? SOUND_ATTACK_MS) / 1000;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(tone.gain, start + attack);
  if (tone.decay !== undefined) {
    gain.gain.setTargetAtTime(tone.gain * (tone.sustain ?? 0), start + attack, tone.decay / 1000 / 3);
  } else {
    // Plateau ou crescendo, creusé à chaque `dips` : on enchaîne des rampes linéaires sur la
    // même droite, abaissée de SOUND_DIP.gain le temps du creux.
    const a = start + attack;
    const to = tone.gainTo ?? tone.gain;
    const line = (x: number) => tone.gain + ((to - tone.gain) * (x - a)) / (end - a);
    for (const d of tone.dips ?? []) {
      const t1 = start + d / 1000;
      const t2 = t1 + SOUND_DIP.down / 1000, t3 = t2 + SOUND_DIP.hold / 1000, t4 = t3 + SOUND_DIP.up / 1000;
      if (t1 <= a || t4 >= end) continue;
      gain.gain.linearRampToValueAtTime(line(t1), t1);
      gain.gain.linearRampToValueAtTime(line(t2) * SOUND_DIP.gain, t2);
      gain.gain.linearRampToValueAtTime(line(t3) * SOUND_DIP.gain, t3);
      gain.gain.linearRampToValueAtTime(line(t4), t4);
    }
    if (tone.gainTo !== undefined || tone.dips?.length) gain.gain.linearRampToValueAtTime(to, end);
  }
  gain.gain.setTargetAtTime(0, end, release / 5);
  const cut = ctx.createGain();
  out = out.connect(gain).connect(cut);
  // Panoramique : le son d'une carte vient de sa colonne (FR-020). Le StereoPanner répartit une
  // source mono à puissance constante : au centre, chaque côté reçoit 1/√2, soit −3 dB par
  // rapport à une voix non placée (recopiée telle quelle à gauche et à droite) ; on les rend.
  if (tone.pan !== undefined && tone.pan !== 0) {
    const pan = ctx.createStereoPanner();
    pan.pan.value = tone.pan;
    const lift = ctx.createGain();
    lift.gain.value = Math.SQRT2;
    out = out.connect(lift).connect(pan);
  }
  out.connect(dest);
  if (src instanceof AudioBufferSourceNode) src.start(start, noiseCursor);
  else src.start(start);
  src.stop(end + release);
  return { name, src, out: cut, level: { from: 1, to: 1, t0: 0, t1: 0 }, pitch, pitchAt };
}

// Mène le gain de coupure d'une voix de sa valeur courante à `to` en `ms`.
function rampLevel(voice: Voice, now: number, to: number, ms: number) {
  const from = levelAt(voice.level, now);
  const t1 = now + ms / 1000;
  voice.out.gain.cancelScheduledValues(now);
  voice.out.gain.setValueAtTime(from, now);
  voice.out.gain.linearRampToValueAtTime(to, t1);
  voice.level = { from, to, t0: now, t1 };
}

// Éteint une voix en `ms`, sans claquement ; `pitch` < 1 la fait aussi descendre (bande qui
// ralentit). Une voix pas encore commencée ne sonnera jamais : son arrêt tombe avant son départ.
export function fadeVoice(voice: Voice, now: number, ms: number, pitch = 1) {
  rampLevel(voice, now, 0, ms);
  const until = now + ms / 1000;
  if (pitch !== 1) {
    const from = voice.pitchAt(now);
    voice.pitch.cancelScheduledValues(now);
    voice.pitch.setValueAtTime(from, now);
    voice.pitch.exponentialRampToValueAtTime(from * pitch, until);
  }
  try {
    voice.src.stop(until);
  } catch {
    // Déjà arrêtée.
  }
}

// Baisse une voix d'un facteur `factor` en `ms`, sans l'arrêter.
export function duckVoice(voice: Voice, now: number, ms: number, factor: number) {
  rampLevel(voice, now, levelAt(voice.level, now) * factor, ms);
}

// Mixage d'un contexte : bus, sources vivantes, étouffements et coupure. Toutes les sources
// (notes, souffles, rire) sont suivies, pour que la coupure les tienne toutes et que l'e2e les
// compte (`onLive`).
export class Mixer {
  private readonly live = new Set<Voice>();
  private readonly bus: Bus;

  constructor(
    private readonly ctx: BaseAudioContext,
    private readonly laugh: () => AudioBuffer | null,
    private readonly onLive: (count: number) => void = () => {},
  ) {
    this.bus = createBus(ctx);
  }

  // `variant` change la recette (rang d'une fissure, palier transposé ; instants et rang de ce que
  // le son accompagne : cartes, vedette, présentation, sens des pièces), pas le nom du bruitage.
  // `delay` (s) : son programmé plus tard, déclenché en avance pour compenser la latence (FR-024).
  play(cue: Cue, variant?: SoundVariant, delay = 0) {
    const now = this.ctx.currentTime + delay;
    // Montée et rire étouffent le faux palier qui sonne encore (FR-019) ; le vrai palier
    // baisse le rire qui sonne encore, pour se faire entendre dessous. La fanfare d'une
    // présentation éteint la vedette.
    if (cue === 'rise' || cue === 'laugh' || cue === 'splash') this.choke(now, SOUND_CHOKES[cue]);
    if (cue.startsWith('tier:')) this.live.forEach(v => {
      if (v.name === 'laugh') duckVoice(v, now, LAUGH_DUCK.ms, LAUGH_DUCK.gain);
    });
    if (cue === 'laugh') {
      this.playLaugh(now);
      this.synth(DEFLATE, 'deflate', now);
    } else {
      this.synth(soundRecipe(cue, variant), cue, now);
    }
  }

  // Éteint en `ms` ce qui sonne encore d'un bruitage (la fanfare quand on ferme la présentation).
  fade(cue: Cue, ms: number) {
    this.choke(this.ctx.currentTime, { of: cue, ms, pitch: 1 });
  }

  // Fondu de 20 ms plutôt qu'un arrêt net, qui claque (FR-016). Le compteur tombe à zéro tout
  // de suite : plus rien ne peut se faire entendre au-delà du fondu.
  stopAll() {
    const now = this.ctx.currentTime;
    this.live.forEach(voice => fadeVoice(voice, now, SOUND_STOP_FADE_MS));
    this.live.clear();
    this.onLive(0);
  }

  // Voix dont le nom commence par `of` (`tier:` pour tous les paliers).
  private choke(now: number, { of, ms, pitch }: { of: string; ms: number; pitch: number }) {
    this.live.forEach(v => {
      if (!v.name.startsWith(of)) return;
      fadeVoice(v, now, ms, pitch);
      this.live.delete(v);
    });
    this.onLive(this.live.size);
  }

  private track(voice: Voice) {
    voice.src.onended = () => {
      if (this.live.delete(voice)) this.onLive(this.live.size);
    };
    this.live.add(voice);
    this.onLive(this.live.size);
  }

  // Chaque voix est suivie dès sa création : si une suivante plante, celles déjà programmées
  // restent coupables.
  private synth(tones: readonly Tone[], name: string, now: number) {
    for (const tone of tones) this.track(scheduleTone(this.ctx, tone, now, this.bus.synth, name));
  }

  // Le rire passe par le même bus que les bruitages (et non par scene.sound) : même limiteur,
  // même coupure, et le vrai palier peut le baisser.
  private playLaugh(now: number) {
    const buffer = this.laugh();
    if (!buffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.value = LAUGH.gain;
    const cut = this.ctx.createGain();
    src.connect(gain).connect(cut).connect(this.bus.limiter);
    src.start(now);
    this.track({ name: 'laugh', src, out: cut, level: { from: 1, to: 1, t0: 0, t1: 0 }, pitch: src.playbackRate, pitchAt: () => 1 });
  }
}
