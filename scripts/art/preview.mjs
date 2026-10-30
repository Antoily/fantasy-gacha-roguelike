// Aperçu d'un visuel SVG aux tailles où le jeu l'affiche, rendu par le Chromium de
// Playwright : c'est le moteur qui rastérise les SVG pour Phaser, donc ce qu'on voit ici
// est ce que verra le joueur. Sortie dans test-results/art/<nom>/ (non versionné).
//
//   npm run art:preview -- character <id>
//   npm run art:preview -- ui <fichier.svg> [--size LxH]... [--bg #couleur]... [--mock main|reveal|cards]...
//
// Les maquettes (--mock) reprennent la géométrie réelle de src/ui/layout.ts et posent tous
// les visuels d'interface déjà présents dans public/art/ui : on juge un visuel avec les autres.

import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const load = rel => import(pathToFileURL(join(root, rel)).href);
const { CATALOGUE } = await load('src/data/catalogue.ts');
const { RARITIES } = await load('src/data/gachaConfig.ts');
const { COLORS, FONT_FAMILY } = await load('src/ui/theme.ts');
const L = await load('src/ui/layout.ts');

const hex = n => `#${n.toString(16).padStart(6, '0')}`;
const INK = hex(COLORS.ink);
const PAPER = hex(COLORS.background);
const ui = name => join(root, 'public/art/ui', name);
const uri = path => `data:image/svg+xml;base64,${readFileSync(path).toString('base64')}`;
const maybe = path => (existsSync(path) ? uri(path) : null);

// Fenêtre w×h px sur la zone (x, y, cw, ch) d'une illustration de 400×500.
function crop(src, { x, y, w: cw, h: ch }, w, h, style = '') {
  const s = w / cw;
  return `<div style="position:relative;overflow:hidden;width:${w}px;height:${h}px;flex:none;${style}">`
    + `<img src="${src}" style="position:absolute;left:${-x * s}px;top:${-y * s}px;width:${400 * s}px;height:${500 * s}px"></div>`;
}

const panel = (w, h, inner, style = '') =>
  `<div style="position:relative;width:${w}px;height:${h}px;background:#fff;border:3px solid ${INK};border-radius:12px;box-sizing:border-box;flex:none;overflow:hidden;${style}">${inner}</div>`;

const label = text => `<div class="label">${text}</div>`;
const block = (title, body) => `<div class="block">${label(title)}<div class="row">${body}</div></div>`;

const PAGE = (body, width) => `<!doctype html><html><head><meta charset="utf-8"><style>
  body { margin: 0; padding: 16px; width: ${width}px; background: #3a3530; font-family: ${FONT_FAMILY}; color: #f0e6d2; }
  .row { display: flex; gap: 16px; align-items: flex-start; flex-wrap: wrap; }
  .block { margin: 0 16px 16px 0; display: inline-block; vertical-align: top; }
  .label { font: bold 13px sans-serif; margin-bottom: 6px; color: #f0e6d2; }
  .checker { background-color: #fff; background-image:
    linear-gradient(45deg, #ddd 25%, transparent 25%), linear-gradient(-45deg, #ddd 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #ddd 75%), linear-gradient(-45deg, transparent 75%, #ddd 75%);
    background-size: 20px 20px; background-position: 0 0, 0 10px, 10px -10px, -10px 0; }
  .t { font-weight: bold; color: ${INK}; }
</style></head><body>${body}</body></html>`;

function characterSheet(id) {
  const item = CATALOGUE.find(i => i.id === id);
  if (!item) throw new Error(`id inconnu dans src/data/catalogue.ts : ${id}`);
  const svg = join(root, 'public/art/characters', `${id}.svg`);
  if (!existsSync(svg)) throw new Error(`introuvable : ${svg}`);
  const metaPath = join(root, 'public/art/characters', `${id}.json`);
  const meta = existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, 'utf8')) : {};
  if (!meta.bust || !meta.head) console.warn(`⚠ ${id}.json absent ou incomplet : cadrages par défaut`);
  const bust = meta.bust ?? { x: 80, y: 20, w: 240, h: 300 };
  const head = meta.head ?? { cx: 200, cy: 150, r: 90 };
  const headBox = { x: head.cx - head.r, y: head.cy - head.r, w: 2 * head.r, h: 2 * head.r };
  const src = uri(svg);
  const color = hex(COLORS.rarity[item.rarity]);
  const rarity = RARITIES.find(r => r.id === item.rarity).label;
  const kind = item.kind === 'character' ? 'Personnage' : 'Créature';
  const tint = `radial-gradient(circle at 50% 40%, #fff 0%, ${color}55 70%, ${color}aa 100%)`;

  const full = `<div class="checker" style="width:400px;height:500px"><img src="${src}" width="400" height="500"></div>`;
  const single = panel(240, 330,
    `<div style="position:absolute;left:10px;top:10px;width:214px;height:240px;border-radius:8px;background:${tint};border:2px solid ${INK};box-sizing:border-box;overflow:hidden">`
    + `<img src="${src}" style="position:absolute;left:11px;top:2px;width:188px;height:235px"></div>`
    + `<div class="t" style="position:absolute;top:258px;width:100%;text-align:center;font-size:22px">${item.name}</div>`
    + `<div style="position:absolute;top:290px;width:100%;text-align:center;font:bold 14px sans-serif;color:#6b6258">${kind} · ${rarity}</div>`);
  const ten = scale => panel(156 * scale, 92 * scale,
    `<div style="position:absolute;left:${5 * scale}px;top:${5 * scale}px;border-radius:${8 * scale}px;overflow:hidden;border:${2 * scale}px solid ${INK};background:${tint}">`
    + crop(src, bust, 60 * scale, 75 * scale) + '</div>'
    + `<div class="t" style="position:absolute;left:${72 * scale}px;top:${8 * scale}px;font-size:${14 * scale}px;width:${80 * scale}px">${item.name}</div>`,
    `transform-origin:0 0;border-width:${3 * scale}px`);
  const cell = scale => panel(156 * scale, 42 * scale,
    `<div style="position:absolute;left:${5 * scale}px;top:${5 * scale}px;border-radius:50%;border:${2 * scale}px solid ${INK};background:${tint};overflow:hidden">`
    + crop(src, headBox, 28 * scale, 28 * scale) + '</div>'
    + `<div class="t" style="position:absolute;left:${42 * scale}px;top:${5 * scale}px;font-size:${12 * scale}px">${item.name}</div>`,
    `border-width:${3 * scale}px`);
  const silhouette = `<div style="width:200px;height:250px;background:#d9d2c5;border-radius:12px;border:3px solid ${INK}">`
    + `<img src="${src}" style="width:200px;height:250px;filter:brightness(0);opacity:.45"></div>`;
  const splash = `<div style="width:320px;height:420px;border-radius:12px;background:radial-gradient(circle at 50% 45%, ${color} 0%, #241b3a 60%, #120d1f 100%);display:flex;align-items:center;justify-content:center">`
    + `<img src="${src}" style="width:304px;height:380px"></div>`;
  const heads = [32, 64, 128].map(d =>
    `<div style="border-radius:50%;border:2px solid ${INK};background:${tint};overflow:hidden">${crop(src, headBox, d, d)}</div>`).join('');

  const body = block('Plein cadre 400×500 (damier = transparence)', full)
    + block('Carte ×1 (maquette)', single)
    + block('Silhouette (élément manquant)', silhouette)
    + block('Écran de splash (fond sombre)', splash)
    + block('Cartes ×10 : buste, taille réelle puis ×2', ten(1) + ten(2))
    + block('Collection : tête, taille réelle puis ×2', cell(1) + cell(2))
    + block('Cadrage tête (cercle de head) : 32, 64, 128 px', heads)
    + block('Cadrage buste (bust) ×2', `<div style="border:2px solid ${INK}">${crop(src, bust, 160, 200)}</div>`);
  return { name: id, pages: [
    { file: 'sheet.png', html: PAGE(body, 1180), width: 1212, scale: 1 },
    { file: 'zoom.png', html: PAGE(`<div class="checker" style="width:800px;height:1000px"><img src="${src}" width="800" height="1000"></div>`, 800), width: 832, scale: 1 },
  ] };
}

// Écran de tirage en maquette : fond, orbe, panneaux, boutons et icônes aux places réelles.
function mainMock() {
  const bg = maybe(ui('bg-main.svg'));
  const orb = maybe(ui('orb.svg'));
  const icon = name => maybe(ui(`icons/icon-${name}.svg`));
  const { GACHA } = L;
  const box = (r, fill, html = '', shadow = true) =>
    `<div style="position:absolute;left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;background:${fill};border:3px solid ${INK};border-radius:12px;box-sizing:border-box;${shadow ? `box-shadow:4px 4px 0 ${INK};` : ''}display:flex;align-items:center;justify-content:center;flex-direction:column">${html}</div>`;
  const img = (src, x, y, w, h, extra = '') =>
    src ? `<img src="${src}" style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;${extra}">` : '';
  const t = (s, size, color = INK) => `<div style="font-weight:bold;font-size:${size}px;color:${color}">${s}</div>`;
  const h = GACHA.header;
  const cy = h.y + h.h / 2;
  // L'orbe d'origine fait r = 54 ; le visuel (240×240, sphère de rayon 100) est mis à l'échelle.
  const o = GACHA.orb;
  const orbSize = (o.r / 100) * 240;
  const html = `<div style="position:relative;width:360px;height:640px;overflow:hidden;background:${PAPER}">`
    + img(bg, 0, 0, 360, 640)
    + box(h, '#fff', '', false)
    + (icon('coin') ? img(icon('coin'), h.x + 12, cy - 14, 28, 28) : `<div style="position:absolute;left:${h.x + 14}px;top:${cy - 12}px;width:24px;height:24px;border-radius:50%;background:#ffc93c;border:2px solid ${INK}"></div>`)
    + `<div style="position:absolute;left:${h.x + 46}px;top:${cy - 14}px">${t('9&nbsp;000', 22)}</div>`
    + (icon('shard') ? img(icon('shard'), h.x + h.w / 2 - 20, cy - 14, 28, 28) : '')
    + `<div style="position:absolute;left:${h.x + h.w / 2 + 12}px;top:${cy - 14}px">${t('0', 22)}</div>`
    + `<div style="position:absolute;right:${360 - (h.x + h.w) + 16}px;top:${cy - 14}px">${t('0 / 20', 22)}</div>`
    + box(GACHA.bannerPrev, '#f0e6d2', icon('arrow') ? `<img src="${icon('arrow')}" style="width:26px;height:26px;transform:scaleX(-1)">` : t('◀', 16))
    + box(GACHA.banner, '#fff', t('Bannière standard', 14) + t('Tous les éléments, taux de base', 10, '#6b6258'), false)
    + box(GACHA.bannerNext, '#f0e6d2', icon('arrow') ? `<img src="${icon('arrow')}" style="width:26px;height:26px">` : t('▶', 16))
    + box(GACHA.mute, '#f0e6d2', icon('sound-on') ? `<img src="${icon('sound-on')}" style="width:28px;height:28px">` : t('🔊', 16))
    + (orb ? img(orb, o.x - orbSize / 2, o.y - orbSize / 2, orbSize, orbSize)
      : `<div style="position:absolute;left:${o.x - o.r}px;top:${o.y - o.r}px;width:${2 * o.r}px;height:${2 * o.r}px;border-radius:50%;background:#d65db1;border:4px solid ${INK}"></div>`)
    + `<div style="position:absolute;top:${GACHA.pityLineY - 9}px;width:360px;text-align:center">${t('Légendaire garanti dans 40 tirages au plus', 14, '#6b6258')}</div>`
    + `<div style="position:absolute;top:${GACHA.featuredLineY - 9}px;width:360px;text-align:center">${t('Prochain Légendaire garanti&nbsp;: Tonnerrouf', 14)}</div>`
    + box(GACHA.pullSingle, '#ffc93c', t('Tirer ×1 — 100', 18))
    + box(GACHA.pullTen, '#ffc93c', t('Tirer ×10 — 900', 18) + t('Un Rare ou mieux garanti', 12, '#6b6258'))
    + box(GACHA.collection, '#7ec8e3', t('Collection', 18))
    + box(GACHA.rates, '#7ec8e3', t('Taux', 18))
    + box(GACHA.reset, '#f0e6d2', t('Recommencer', 18))
    + '</div>';
  return html;
}

// Révélation en maquette : fond sombre, orbe grossi au centre, fissures éventuelles, nom du palier.
function revealMock(cracks) {
  const bg = maybe(ui('bg-reveal.svg'));
  const orb = maybe(ui('orb.svg'));
  const crack = cracks ? maybe(ui(`orb-cracks-${cracks}.svg`)) : null;
  const { REVEAL, GACHA } = L;
  const size = (GACHA.orb.r * REVEAL.orbScale / 100) * 240;
  const at = (src, extra = '') => (src
    ? `<img src="${src}" style="position:absolute;left:${REVEAL.center.x - size / 2}px;top:${REVEAL.center.y - size / 2}px;width:${size}px;height:${size}px;${extra}">` : '');
  return `<div style="position:relative;width:360px;height:640px;overflow:hidden;background:#1b1430">`
    + (bg ? `<img src="${bg}" style="position:absolute;left:0;top:0;width:360px;height:640px">` : '')
    + at(orb) + at(crack)
    + `<div style="position:absolute;top:${REVEAL.labelY - 18}px;width:360px;text-align:center;font-weight:bold;font-size:28px;color:${INK};-webkit-text-stroke:0;text-shadow:0 0 0 #fff, 3px 0 #fff, -3px 0 #fff, 0 3px #fff, 0 -3px #fff">Légendaire&nbsp;!</div>`
    + `<div style="position:absolute;top:${REVEAL.hintY - 8}px;width:360px;text-align:center;font-weight:bold;font-size:12px;color:#a59c90">Touche pour passer</div>`
    + '</div>';
}

// Grille du ×10 face cachée, sur le panneau de résultats.
function cardsMock() {
  const back = maybe(ui('card-back.svg'));
  const { RESULTS, resultCardRect } = L;
  const p = RESULTS.panel;
  let html = `<div style="position:relative;width:360px;height:640px;overflow:hidden;background:rgba(255,244,220,.82)">`
    + `<div style="position:absolute;left:${p.x}px;top:${p.y}px;width:${p.w}px;height:${p.h}px;background:${PAPER};border:3px solid ${INK};border-radius:12px;box-sizing:border-box"></div>`
    + `<div style="position:absolute;top:${RESULTS.titleY - 12}px;width:360px;text-align:center;font-weight:bold;font-size:22px;color:${INK}">Tirage ×10</div>`;
  for (let i = 0; i < 10; i++) {
    const r = resultCardRect(i);
    html += back
      ? `<img src="${back}" style="position:absolute;left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px">`
      : `<div style="position:absolute;left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;background:#7ec8e3;border:3px solid ${INK};border-radius:12px;box-sizing:border-box"></div>`;
  }
  return `${html}</div>`;
}

function uiSheet(file, sizes, bgs, mocks, cracks) {
  const path = resolve(file);
  if (!existsSync(path)) throw new Error(`introuvable : ${path}`);
  const src = uri(path);
  const name = basename(path, '.svg');
  const viewBox = /viewBox="([^"]+)"/.exec(readFileSync(path, 'utf8'))?.[1]?.split(/[\s,]+/).map(Number);
  const [vw, vh] = viewBox ? [viewBox[2], viewBox[3]] : [256, 256];
  const list = sizes.length ? sizes : [[vw, vh]];
  const swatches = (bgs.length ? bgs : [PAPER, '#2b2620', '#ffffff']).map(bg =>
    block(`Fond ${bg}`, list.map(([w, h]) =>
      `<div style="background:${bg};padding:8px;border-radius:6px"><img src="${src}" width="${w}" height="${h}" style="display:block"></div>`).join('')))
    .join('');
  const pages = [{ file: 'sheet.png', html: PAGE(block('Damier (transparence), taille du viewBox', `<div class="checker"><img src="${src}" width="${vw}" height="${vh}" style="display:block"></div>`) + swatches, 1180), width: 1212, scale: 1 }];
  for (const m of mocks) {
    const html = m === 'main' ? mainMock() : m === 'reveal' ? revealMock(cracks) : m === 'cards' ? cardsMock() : null;
    if (!html) throw new Error(`maquette inconnue : ${m} (main, reveal, cards)`);
    pages.push({ file: `mock-${m}${m === 'reveal' && cracks ? `-fissures${cracks}` : ''}.png`, html: `<!doctype html><html><body style="margin:0;font-family:${FONT_FAMILY}">${html}</body></html>`, width: 360, scale: 2 });
  }
  return { name, pages };
}

function parseArgs(argv) {
  const [mode, target, ...rest] = argv;
  const opts = { sizes: [], bgs: [], mocks: [], cracks: 0 };
  for (let i = 0; i < rest.length; i++) {
    const v = rest[i + 1];
    if (rest[i] === '--size') { opts.sizes.push(v.split('x').map(Number)); i++; }
    else if (rest[i] === '--bg') { opts.bgs.push(v); i++; }
    else if (rest[i] === '--mock') { opts.mocks.push(v); i++; }
    else if (rest[i] === '--cracks') { opts.cracks = Number(v); i++; }
    else throw new Error(`option inconnue : ${rest[i]}`);
  }
  return { mode, target, opts };
}

const { mode, target, opts } = parseArgs(process.argv.slice(2));
if (!['character', 'ui'].includes(mode) || !target) {
  console.error('usage : preview.mjs character <id> | ui <fichier.svg> [--size LxH] [--bg #hex] [--mock main|reveal|cards] [--cracks 1-3]');
  process.exit(2);
}
const sheet = mode === 'character' ? characterSheet(target) : uiSheet(target, opts.sizes, opts.bgs, opts.mocks, opts.cracks);
const out = join(root, 'test-results/art', sheet.name);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
try {
  for (const p of sheet.pages) {
    const page = await browser.newPage({ viewport: { width: p.width, height: 400 }, deviceScaleFactor: p.scale });
    await page.setContent(p.html, { waitUntil: 'load' });
    // Toutes les images décodées avant la capture (data URI : pas de réseau).
    await page.evaluate(() => Promise.all([...document.images].map(i => i.decode().catch(() => {}))));
    await page.screenshot({ path: join(out, p.file), fullPage: true });
    await page.close();
    console.log(join(out, p.file));
  }
} finally {
  await browser.close();
}
