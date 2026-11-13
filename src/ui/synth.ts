import {
  SOUND_ATTACK_MS, SOUND_LIMITER, SOUND_MASTER_GAIN, SOUND_RELEASE_MS, type Tone,
} from '../data/sounds';
import { mulberry32 } from '../logic/rng';

// Moteur des bruitages (révision du 2026-11-13, FR-014 à FR-016) : Web Audio seul, sans
// Phaser, pour que le rendu hors navigateur (OfflineAudioContext) passe par le même code que
// le jeu. src/ui/sfx.ts y ajoute le journal, le réglage et le rire.

// Une source en train de sonner (ou programmée), avec son gain pour l'éteindre en fondu et le
// nom de son bruitage pour l'étouffement.
export interface Voice {
  readonly name: string;
  readonly src: AudioScheduledSourceNode;
  readonly gain: GainNode;
  // Hauteur à faire descendre quand le faux palier se dégonfle.
  readonly pitch: AudioParam;
}

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

// Programme les notes d'un bruitage à partir de `t0` (secondes du contexte) vers `dest`.
export function scheduleTones(ctx: BaseAudioContext, tones: readonly Tone[], t0: number, dest: AudioNode, name: string): Voice[] {
  return tones.map(tone => scheduleTone(ctx, tone, t0, dest, name));
}

function scheduleTone(ctx: BaseAudioContext, tone: Tone, t0: number, dest: AudioNode, name: string): Voice {
  const start = t0 + tone.at / 1000;
  const end = start + tone.dur / 1000;
  const release = (tone.release ?? SOUND_RELEASE_MS) / 1000;
  let src: AudioScheduledSourceNode;
  let pitch: AudioParam;
  if (tone.wave === 'noise') {
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer(ctx);
    noise.loop = true;
    pitch = noise.playbackRate;
    src = noise;
    noiseCursor = (noiseCursor + NOISE_STEP) % 1;
  } else {
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
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(tone.gain, start + SOUND_ATTACK_MS / 1000);
  if (tone.decay !== undefined) {
    gain.gain.setTargetAtTime(tone.gain * (tone.sustain ?? 0), start + SOUND_ATTACK_MS / 1000, tone.decay / 1000 / 3);
  } else if (tone.gainTo !== undefined) {
    gain.gain.linearRampToValueAtTime(tone.gainTo, end);
  }
  gain.gain.setTargetAtTime(0, end, release / 5);
  out.connect(gain).connect(dest);
  if (src instanceof AudioBufferSourceNode) src.start(start, noiseCursor);
  else src.start(start);
  src.stop(end + release);
  return { name, src, gain, pitch };
}

// Fige un paramètre à sa valeur courante avant une nouvelle rampe : sinon une rampe déjà
// programmée (relâche, glissando) écrase la coupure (même piège que les tweens concurrents).
function hold(param: AudioParam, now: number) {
  if (typeof param.cancelAndHoldAtTime === 'function') {
    param.cancelAndHoldAtTime(now);
  } else {
    const value = param.value;
    param.cancelScheduledValues(now);
    param.setValueAtTime(value, now);
  }
}

// Éteint une voix en `ms`, sans claquement ; `pitch` < 1 la fait descendre en même temps
// (bande qui ralentit). Une voix pas encore commencée ne sonnera jamais : son arrêt tombe
// avant son départ.
export function fadeVoice(voice: Voice, now: number, ms: number, pitch = 1) {
  const until = now + ms / 1000;
  hold(voice.gain.gain, now);
  voice.gain.gain.linearRampToValueAtTime(0, until);
  if (pitch !== 1) {
    hold(voice.pitch, now);
    voice.pitch.exponentialRampToValueAtTime(Math.max(1e-3, voice.pitch.value * pitch), until);
  }
  try {
    voice.src.stop(until);
  } catch {
    // Déjà arrêtée.
  }
}

// Baisse une voix d'un facteur `factor` en `ms`, sans l'arrêter.
export function duckVoice(voice: Voice, now: number, ms: number, factor: number) {
  hold(voice.gain.gain, now);
  voice.gain.gain.linearRampToValueAtTime(voice.gain.gain.value * factor, now + ms / 1000);
}
