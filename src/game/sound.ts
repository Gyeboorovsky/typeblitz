/** Tiny WebAudio synth — every effect is an oscillator envelope, zero assets.
 * Gated by settings via configureSound(); safe to call anywhere. */

export type SoundKind = 'click' | 'error' | 'combo' | 'star' | 'fanfare' | 'levelup' | 'boom';

let enabled = true;
let volume = 0.5;
let ctx: AudioContext | null = null;

export function configureSound(on: boolean, vol: number): void {
  enabled = on;
  volume = vol;
}

function audio(): AudioContext | null {
  if (!enabled) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  ac: AudioContext,
  type: OscillatorType,
  freq: number,
  startAt: number,
  duration: number,
  peak: number,
): void {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startAt);
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(peak * volume, startAt + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
}

/** `pitch` nudges the combo blip upward as combos grow. */
export function play(kind: SoundKind, pitch = 0): void {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  switch (kind) {
    case 'click':
      tone(ac, 'square', 620 + Math.min(pitch, 40) * 8, t, 0.03, 0.12);
      break;
    case 'error':
      tone(ac, 'sawtooth', 150, t, 0.12, 0.2);
      break;
    case 'combo':
      tone(ac, 'triangle', 440 + Math.min(pitch, 60) * 12, t, 0.08, 0.18);
      break;
    case 'boom':
      tone(ac, 'sawtooth', 90, t, 0.25, 0.3);
      tone(ac, 'square', 60, t, 0.3, 0.2);
      break;
    case 'star':
      [523, 659, 784].forEach((f, i) => tone(ac, 'triangle', f, t + i * 0.09, 0.15, 0.2));
      break;
    case 'levelup':
      [392, 523, 659, 784].forEach((f, i) => tone(ac, 'triangle', f, t + i * 0.1, 0.18, 0.22));
      break;
    case 'fanfare':
      [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(ac, 'triangle', f, t + i * 0.11, 0.2, 0.22));
      break;
  }
}
