// Contraste des textes posés directement sur le fond de l'écran de tirage (007, FR-008,
// SC-003) : rend bg-main.svg dans Chromium (le moteur du jeu) et mesure, sous chaque ligne
// de texte (rectangles tirés de src/ui/layout.ts), le contraste WCAG avec la couleur du
// texte, à travers le bandeau clair que le jeu pose dessous (ART_FX.textPlate). Échec sous
// 4,5:1 sur le 2ᵉ centile des pixels (un scintillement isolé ne compte pas).
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const load = rel => import(pathToFileURL(join(root, rel)).href);
const { GACHA, WIDTH, HEIGHT } = await load('src/ui/layout.ts');
const { ART_FX, CSS } = await load('src/ui/theme.ts');
const MIN = 4.5;

// Lignes de texte sur le fond : largeur généreuse (texte centré le plus long).
const lines = [
  { name: 'pity', color: CSS.textDim, x: 24, y: GACHA.pityLineY - 10, w: WIDTH - 48, h: 20 },
  { name: 'garantie vedette', color: CSS.text, x: 24, y: GACHA.featuredLineY - 10, w: WIDTH - 48, h: 20 },
  { name: 'message de pièces', color: CSS.textDim, x: GACHA.pullSingle.x, y: GACHA.shortageMessageY, w: GACHA.pullSingle.w, h: 40 },
];

const svg = readFileSync(join(root, 'public/art/ui/bg-main.svg')).toString('base64');
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const plate = { rgb: [(ART_FX.textPlate >> 16) & 255, (ART_FX.textPlate >> 8) & 255, ART_FX.textPlate & 255], a: ART_FX.textPlateAlpha };
  const result = await page.evaluate(async ({ svg, lines, WIDTH, HEIGHT, plate }) => {
    const img = new Image();
    img.src = `data:image/svg+xml;base64,${svg}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = WIDTH;
    c.height = HEIGHT;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, WIDTH, HEIGHT);
    const lum = ([r, g, b]) => {
      const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    return lines.map(l => {
      const t = lum(hex(l.color));
      const d = ctx.getImageData(l.x, l.y, l.w, l.h).data;
      const ratios = [];
      for (let i = 0; i < d.length; i += 4) {
        const b = lum([0, 1, 2].map(k => d[i + k] * (1 - plate.a) + plate.rgb[k] * plate.a));
        ratios.push((Math.max(t, b) + 0.05) / (Math.min(t, b) + 0.05));
      }
      ratios.sort((a, b) => a - b);
      return { name: l.name, ratio: ratios[Math.floor(ratios.length * 0.02)] };
    });
  }, { svg, lines, WIDTH, HEIGHT, plate });
  let ok = true;
  for (const r of result) {
    const pass = r.ratio >= MIN;
    ok &&= pass;
    console.log(`${pass ? '✓' : '✗'} ${r.name} : ${r.ratio.toFixed(2)}:1`);
  }
  if (!ok) process.exitCode = 1;
} finally {
  await browser.close();
}
