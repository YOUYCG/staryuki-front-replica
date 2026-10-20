import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, 'dist');
const files = fs.readdirSync(dist, { recursive: true }).filter(name => fs.statSync(path.join(dist, name)).isFile());
const failures = [];
const resources = new Set(['/','/login/']);
let audioCount = 0;
for (const name of files) {
  if (/\.js$/.test(name)) {
    try { execFileSync(process.execPath, ['--check', path.join(dist, name)], { stdio: 'pipe' }); }
    catch { failures.push(`Syntax: ${name}`); }
  }
  if (!/\.(html|css)$/.test(name)) continue;
  // Ignore inline SVG bodies before scanning references: their filter url(#id)
  // fragments are internal to the data URL, not standalone network resources.
  const text = fs.readFileSync(path.join(dist, name), 'utf8')
    .replace(/url\((["'])data:[\s\S]*?\1\)/gi, '');
  const matches = [...text.matchAll(/(?:src|href)="([^"#]+)"|url\(\s*["']?([^\s)"']+)/g)];
  for (const match of matches) {
    const reference = (match[1] || match[2]).replaceAll('&amp;', '&');
    if (/^(?:https?:|data:|#|mailto:)/i.test(reference)) continue;
    const url = new URL(reference, `http://localhost/${name.replaceAll('\\', '/')}`);
    let target = path.join(dist, decodeURIComponent(url.pathname));
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
    if (!fs.existsSync(target)) failures.push(`Missing: ${name} → ${reference}`);
    resources.add(url.pathname);
  }
}
for (const required of ['index.html','login/index.html','app.js','effects.js','peonia.js','login.js']) {
  if (!fs.existsSync(path.join(dist,required))) failures.push(`Required file missing: ${required}`);
}
const audioManifest = JSON.parse(fs.readFileSync(path.join(dist, 'audio/manifest.json'), 'utf8'));
for (const [id, resource] of Object.entries(audioManifest.sounds)) {
  resources.add(resource);
  const file = path.join(dist, resource);
  if (!fs.existsSync(file)) { failures.push(`Missing sound: ${id}`); continue; }
  const wav = fs.readFileSync(file);
  if (wav.toString('ascii', 0, 4) !== 'RIFF' || wav.toString('ascii', 8, 12) !== 'WAVE' || wav.readUInt16LE(34) !== 16 || wav.readUInt32LE(40) !== wav.length - 44) {
    failures.push(`Invalid PCM WAV: ${id}`); continue;
  }
  let peak = 0, energy = 0;
  const samples = (wav.length - 44) / 2;
  for (let index = 44; index < wav.length; index += 2) {
    const value = wav.readInt16LE(index) / 32768;
    peak = Math.max(peak, Math.abs(value)); energy += value * value;
  }
  if (peak > .96 || Math.sqrt(energy / samples) < .005 || samples < 400) failures.push(`Silent, clipped, or truncated audio: ${id}`);
  audioCount++;
}
const urlFlag = process.argv.indexOf('--url');
if (urlFlag >= 0) {
  const base = process.argv[urlFlag + 1];
  for (const resource of resources) {
    try {
      const response = await fetch(new URL(resource, base), { method: 'HEAD' });
      if (!response.ok) failures.push(`HTTP ${response.status}: ${resource}`);
      if (resource.endsWith('.wav') && !response.headers.get('content-type')?.startsWith('audio/wav')) failures.push(`Incorrect audio MIME: ${resource}`);
    } catch (error) { failures.push(`HTTP: ${resource}: ${error.message}`); }
  }
  const post = await fetch(new URL('/login/', base), {method:'POST',body:'test'});
  if (post.status !== 405) failures.push('Static server must reject login POST requests.');
}
if (failures.length) {
  console.error(failures.join('\n')); process.exitCode = 1;
} else {
  console.log(`PASS: ${files.length} files; JavaScript syntax and ${resources.size} local resource paths.`);
  console.log(`PASS: ${audioCount} PCM sound files have valid headers, audible levels and clipping headroom.`);
  if (urlFlag >= 0) console.log('PASS: Both page routes and all linked assets serve successfully; server rejects POST.');
}
