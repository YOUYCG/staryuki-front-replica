import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Local approximations of the SFX events found in the public launcher source.
// These are generated sounds, not recovered recordings from the original site.
const directory = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist', 'audio');
const sampleRate = 44100;
fs.mkdirSync(directory, { recursive: true });

function synth(duration, voices, noise = 0, seed = 1) {
  const data = new Float64Array(Math.ceil(duration * sampleRate));
  let random = seed >>> 0;
  const nextNoise = () => {
    random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
    return (random / 4294967296) * 2 - 1;
  };
  for (const voice of voices) {
    const { at = 0, length = duration - at, from = 700, to = from, level = .3, wave = 'sine', grain = 0 } = voice;
    let phase = 0;
    let filtered = 0;
    for (let index = Math.floor(at * sampleRate); index < Math.min(data.length, Math.ceil((at + length) * sampleRate)); index++) {
      const time = index / sampleRate - at;
      const progress = Math.max(0, Math.min(1, time / length));
      const frequency = from * Math.pow(to / from, progress);
      phase += frequency / sampleRate;
      const signal = wave === 'square' ? Math.tanh(Math.sin(phase * Math.PI * 2) * 3) : wave === 'triangle' ? (2 / Math.PI) * Math.asin(Math.sin(phase * Math.PI * 2)) : Math.sin(phase * Math.PI * 2);
      filtered += (nextNoise() - filtered) * .24;
      const envelope = Math.min(1, time / .003) * Math.pow(1 - progress, .8) * Math.min(1, (length - time) / .009);
      const gate = grain ? (.35 + .65 * (Math.sin(time * grain * Math.PI * 2) > -.25 ? 1 : 0)) : 1;
      data[index] += (signal * level + filtered * noise) * envelope * gate;
    }
  }
  // Remove DC, keep a little headroom, and fade both edges to avoid clicks.
  const mean = data.reduce((sum, value) => sum + value, 0) / data.length;
  let peak = 0;
  for (let index = 0; index < data.length; index++) { data[index] -= mean; peak = Math.max(peak, Math.abs(data[index])); }
  const scale = peak > .75 ? .75 / peak : 1;
  const wav = Buffer.alloc(44 + data.length * 2);
  wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(data.length * 2, 40);
  for (let index = 0; index < data.length; index++) {
    const fade = Math.min(1, index / 130, (data.length - 1 - index) / 260);
    wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, data[index] * scale * fade)) * 32767), 44 + index * 2);
  }
  return wav;
}

const definitions = {
  sfx_boot_typewriter: [.032, [{ from: 1650, to: 600, level: .22, wave: 'square' }], .2],
  sfx_boot_scramble_out: [.29, [{ from: 1800, to: 150, wave: 'square', level: .16, grain: 47 }], .38],
  sfx_boot_glitch_in: [.22, [{ from: 120, to: 1700, wave: 'square', level: .15, grain: 31 }, { at: .09, length: .07, from: 2300, to: 500, level: .12 }], .35],
  sfx_boot_shuffle_settle: [.22, [0, 1, 2, 3].map(index => ({ at: index * .045, length: .065, from: 1100 - index * 190, to: 600, level: .16, wave: 'triangle' })), .08],
  sfx_global_transition: [.55, [{ from: 140, to: 1500, wave: 'triangle', level: .23 }, { at: .12, length: .3, from: 350, to: 2100, level: .09 }], .1],
  sfx_key_cursor_move: [.037, [{ from: 1300, to: 950, level: .22 }], .07],
  sfx_key_backspace: [.065, [{ from: 650, to: 220, level: .22, wave: 'triangle' }], .1],
  sfx_key_capture: [.085, [{ from: 700, to: 1800, level: .17, wave: 'triangle' }], .06],
  sfx_key_flight: [.13, [{ from: 400, to: 2300, level: .1 }], .16],
  sfx_key_land: [.055, [{ from: 520, to: 160, level: .24, wave: 'triangle' }], .12],
  sfx_verify_submit: [.18, [{ from: 350, to: 1100, level: .2, wave: 'triangle' }, { at: .07, length: .09, from: 1300, level: .1 }], .03],
  sfx_verify_scan: [.085, [{ from: 760, to: 1150, level: .16 }, { at: .045, length: .04, from: 1500, to: 900, level: .07 }], .035],
  sfx_access_denied: [.44, [{ length: .18, from: 150, to: 100, wave: 'square', level: .24 }, { at: .23, length: .19, from: 130, to: 80, wave: 'square', level: .22 }, { length: .4, from: 157, to: 98, level: .12 }], .07],
  sfx_deny_wave: [.46, [{ from: 900, to: 65, wave: 'triangle', level: .14, grain: 23 }], .24],
  sfx_deny_recover: [.16, [{ from: 350, to: 700, level: .15 }, { at: .065, length: .085, from: 920, to: 1100, level: .09 }]],
  sfx_access_granted: [.67, [660, 880, 1320].map((frequency, index) => ({ at: index * .12, length: .4, from: frequency, level: .17 })), .01],
  sfx_granted_slot_fill: [.055, [{ from: 1900, to: 1400, level: .13 }]],
  sfx_granted_shuffle: [.24, [0, 1, 2, 3, 4].map(index => ({ at: index * .035, length: .065, from: 800 + index * 240, level: .1, wave: 'triangle' }))],
  sfx_debris_hover: [.045, [{ from: 2200, to: 1700, level: .065 }]],
};

const manifest = {};
for (const [id, [duration, voices, noise = 0]] of Object.entries(definitions)) {
  const seed = Array.from(id).reduce((value, char) => (Math.imul(value, 31) + char.charCodeAt(0)) >>> 0, 7);
  fs.writeFileSync(path.join(directory, `${id}.wav`), synth(duration, voices, noise, seed));
  manifest[id] = `/audio/${id}.wav`;
}
fs.writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify({ provenance: 'Local synthesis based on observed public launcher SFX events; original recordings unavailable (HTTP 502).', sounds: manifest }, null, 2));
console.log(`Generated ${Object.keys(manifest).length} local sound effects.`);
