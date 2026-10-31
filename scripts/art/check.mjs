// Contrôle des visuels SVG (charte docs/art/charte.md) : format, éléments interdits,
// identifiants préfixés, cadrages des illustrations. Lancé par la CI sur tout public/art.
//
//   npm run art:check                 tout public/art, illustration manquante = erreur
//   npm run art:check -- <fichier.svg>   un seul visuel (pendant qu'on le dessine)

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ART = join(root, 'public/art');
const MAX_BYTES = 150 * 1024;
// Rastérisés par le navigateur pour Phaser : rien qui dépende d'une police, du réseau ou
// d'un script, et pas d'animation (un SVG chargé en image est figé).
const FORBIDDEN = ['text', 'tspan', 'image', 'foreignObject', 'script', 'style', 'animate', 'animateTransform', 'animateMotion', 'set', 'font'];
const CHARACTER_VIEWBOX = '0 0 400 500';

// Équilibre des balises, sans dépendance : suffit à repérer un fichier tronqué ou mal fermé.
function wellFormed(text) {
  const stack = [];
  const body = text.replace(/<!--[\s\S]*?-->/g, '').replace(/<\?[\s\S]*?\?>/g, '').replace(/<!DOCTYPE[^>]*>/gi, '');
  for (const m of body.matchAll(/<(\/?)([A-Za-z][\w:.-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g)) {
    const [, closing, name, , selfClosing] = m;
    if (selfClosing) continue;
    if (!closing) stack.push(name);
    else if (stack.pop() !== name) return `balise </${name}> sans ouverture correspondante`;
  }
  return stack.length ? `balise <${stack.at(-1)}> jamais fermée` : null;
}

export function checkSvg(path) {
  const errors = [];
  const text = readFileSync(path, 'utf8');
  const name = basename(path, '.svg');
  const size = statSync(path).size;
  if (size > MAX_BYTES) errors.push(`trop lourd : ${Math.round(size / 1024)} Ko (max ${MAX_BYTES / 1024})`);
  const root = /<svg\b[^>]*>/.exec(text)?.[0];
  if (!root) return [...errors, 'pas de balise <svg>'];
  if (!/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/.test(root)) errors.push('xmlns SVG manquant sur <svg>');
  const viewBox = /viewBox="([^"]+)"/.exec(root)?.[1];
  if (!viewBox) errors.push('viewBox manquant');
  if (path.includes(`${join('art', 'characters')}`) && viewBox?.trim().replace(/[\s,]+/g, ' ') !== CHARACTER_VIEWBOX) {
    errors.push(`viewBox des illustrations : "${CHARACTER_VIEWBOX}" (trouvé "${viewBox}")`);
  }
  const malformed = wellFormed(text);
  if (malformed) errors.push(`XML mal formé : ${malformed}`);
  for (const tag of FORBIDDEN) {
    if (new RegExp(`<${tag}[\\s>/]`).test(text)) errors.push(`élément interdit : <${tag}>`);
  }
  if (/(?:href|url\()\s*=?\s*["']?(?:https?:|\/\/|data:)/i.test(text)) errors.push('référence externe ou data: interdite');
  if (/\son[a-z]+\s*=/i.test(text)) errors.push('attribut d\'événement (on…) interdit');
  if (/\sclass\s*=/.test(text)) errors.push('attribut class inutile sans <style> : attributs de présentation seulement');
  const ids = [...text.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
  const bad = ids.filter(id => !id.startsWith(`${name}-`));
  if (bad.length) errors.push(`identifiants à préfixer par "${name}-" : ${bad.slice(0, 5).join(', ')}${bad.length > 5 ? '…' : ''}`);
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dup.length) errors.push(`identifiants en double : ${[...new Set(dup)].join(', ')}`);
  for (const m of text.matchAll(/(?:href="#|url\(#)([^")]+)/g)) {
    if (!ids.includes(m[1])) errors.push(`référence vers un identifiant absent : #${m[1]}`);
  }
  return errors;
}

// Cadrages d'une illustration : buste 4:5 et cercle de la tête, dans le cadre 400×500.
export function checkMeta(path) {
  if (!existsSync(path)) return [`cadrages manquants : ${relative(root, path)}`];
  let meta;
  try {
    meta = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    return [`JSON illisible : ${e.message}`];
  }
  const errors = [];
  const { bust, head } = meta;
  const num = v => typeof v === 'number' && Number.isFinite(v);
  if (!bust || ![bust.x, bust.y, bust.w, bust.h].every(num)) errors.push('bust {x, y, w, h} manquant');
  else {
    if (bust.x < 0 || bust.y < 0 || bust.x + bust.w > 400 || bust.y + bust.h > 500) errors.push('bust sort du cadre 400×500');
    if (Math.abs(bust.w / bust.h - 0.8) > 0.02) errors.push(`bust doit être au format 4:5 (w/h = ${(bust.w / bust.h).toFixed(3)})`);
    if (bust.w < 120) errors.push('bust trop petit (w ≥ 120)');
  }
  if (!head || ![head.cx, head.cy, head.r].every(num)) errors.push('head {cx, cy, r} manquant');
  else {
    if (head.cx - head.r < 0 || head.cy - head.r < 0 || head.cx + head.r > 400 || head.cy + head.r > 500) errors.push('head sort du cadre 400×500');
    if (head.r < 40 || head.r > 160) errors.push('head.r hors de [40, 160]');
  }
  return errors;
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.svg') ? [join(dir, e.name)] : []);
}

async function main(args) {
  const report = new Map();
  const add = (file, errs) => { if (errs.length) report.set(relative(root, file), [...(report.get(relative(root, file)) ?? []), ...errs]); };
  if (args.length) {
    for (const file of args.map(a => resolve(a))) {
      add(file, checkSvg(file));
      if (file.includes(join('art', 'characters'))) add(file, checkMeta(file.replace(/\.svg$/, '.json')));
    }
  } else {
    const files = walk(ART);
    const names = files.map(f => basename(f));
    const twice = names.filter((n, i) => names.indexOf(n) !== i);
    if (twice.length) report.set('public/art', [`noms de fichier en double (préfixes d'identifiants ambigus) : ${twice.join(', ')}`]);
    for (const f of files) add(f, checkSvg(f));
    const { CATALOGUE } = await import(pathToFileURL(join(root, 'src/data/catalogue.ts')).href);
    for (const { id } of CATALOGUE) {
      const svg = join(ART, 'characters', `${id}.svg`);
      if (!existsSync(svg)) add(svg, ['illustration manquante']);
      else add(svg, checkMeta(join(ART, 'characters', `${id}.json`)));
    }
    console.log(`${files.length} visuels contrôlés`);
  }
  for (const [file, errs] of report) {
    console.error(`✗ ${file}`);
    for (const e of errs) console.error(`    ${e}`);
  }
  if (report.size) process.exit(1);
  console.log('✓ visuels conformes');
}

await main(process.argv.slice(2));
