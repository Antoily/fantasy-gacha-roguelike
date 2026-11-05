import Phaser from 'phaser';
import { CATALOGUE, type Item } from '../data/catalogue';
import { R } from './display';
import { ART } from './layout';
import { ART_FX } from './theme';

// Visuels de la feature 007 (ADR 0007) : les SVG de public/art sont rastérisés au
// chargement à leur plus grande taille d'affichage × R, donc nets sous la caméra ×R.
// Les vignettes (tête, buste, silhouette) sont dessinées une fois au démarrage dans des
// textures canvas : ni masque ni filtre par image (research R3). Un visuel absent ou
// illisible laisse place au dessin d'avant (FR-010) : tout passe par hasArt / hasUi.

interface Box { readonly x: number; readonly y: number; readonly w: number; readonly h: number }
interface Crop { readonly bust: Box; readonly head: { readonly cx: number; readonly cy: number; readonly r: number } }

// Cadre commun des illustrations (charte § 5).
const FRAME_W = 400;

// Visuels d'interface : fichier sous public/art et plus grande taille d'affichage.
export const UI_ART = {
  'bg-main': { file: 'ui/bg-main.svg', w: 360, h: 640 },
  'bg-reveal': { file: 'ui/bg-reveal.svg', w: 360, h: 640 },
  'magic-circle': { file: 'ui/magic-circle.svg', w: 320, h: 320 },
  // L'orbe grossit pendant la révélation (×1,3 puis pulsations) : rastérisée en grand.
  orb: { file: 'ui/orb.svg', w: 240, h: 240 },
  'orb-cracks-1': { file: 'ui/orb-cracks-1.svg', w: 240, h: 240 },
  'orb-cracks-2': { file: 'ui/orb-cracks-2.svg', w: 240, h: 240 },
  'orb-cracks-3': { file: 'ui/orb-cracks-3.svg', w: 240, h: 240 },
  'card-back': { file: 'ui/card-back.svg', w: 312, h: 184 },
  'icon-coin': { file: 'ui/icons/icon-coin.svg', w: 40, h: 40 },
  'icon-shard': { file: 'ui/icons/icon-shard.svg', w: 40, h: 40 },
  'icon-sound-on': { file: 'ui/icons/icon-sound-on.svg', w: 40, h: 40 },
  'icon-sound-off': { file: 'ui/icons/icon-sound-off.svg', w: 40, h: 40 },
  'icon-arrow': { file: 'ui/icons/icon-arrow.svg', w: 40, h: 40 },
  'icon-star': { file: 'ui/icons/icon-star.svg', w: 40, h: 40 },
  'rarity-common': { file: 'ui/rarity/rarity-common.svg', w: 48, h: 48 },
  'rarity-uncommon': { file: 'ui/rarity/rarity-uncommon.svg', w: 48, h: 48 },
  'rarity-rare': { file: 'ui/rarity/rarity-rare.svg', w: 48, h: 48 },
  'rarity-legendary': { file: 'ui/rarity/rarity-legendary.svg', w: 48, h: 48 },
  'rarity-ultra': { file: 'ui/rarity/rarity-ultra.svg', w: 48, h: 48 },
} as const;

export type UiArt = keyof typeof UI_ART;

export const artKey = (id: string) => `art:${id}`;
export const headKey = (id: string) => `art:${id}:head`;
export const bustKey = (id: string) => `art:${id}:bust`;
export const shadowKey = (id: string) => `art:${id}:shadow`;
export const uiKey = (name: UiArt) => `ui:${name}`;
const cropKey = (id: string) => `crop:${id}`;

export const hasArt = (scene: Phaser.Scene, item: Item) => scene.textures.exists(headKey(item.id));

// L'orbe illustrée : sphère de rayon 100 dans un cadre de 240 (charte § 8).
export const orbSize = (sphereRadius: number) => sphereRadius * 2.4;
export const hasUi = (scene: Phaser.Scene, name: UiArt) => scene.textures.exists(uiKey(name));

// À appeler dans un preload : tout est chargé avant l'écran de tirage.
export function queueArt(load: Phaser.Loader.LoaderPlugin) {
  for (const { id } of CATALOGUE) {
    load.svg(artKey(id), `art/characters/${id}.svg`, { width: ART.full.w * R, height: ART.full.h * R });
    load.json(cropKey(id), `art/characters/${id}.json`);
  }
  for (const [name, a] of Object.entries(UI_ART)) {
    load.svg(uiKey(name as UiArt), `art/${a.file}`, { width: a.w * R, height: a.h * R });
  }
}

// Fabrique les vignettes de chaque illustration ; rend les ids restés sans illustration.
export function buildVignettes(scene: Phaser.Scene): string[] {
  const missing: string[] = [];
  for (const { id } of CATALOGUE) {
    const crop = scene.cache.json.get(cropKey(id)) as Crop | undefined;
    if (!scene.textures.exists(artKey(id)) || !crop?.bust || !crop.head) {
      missing.push(id);
      continue;
    }
    const img = scene.textures.get(artKey(id)).getSourceImage() as HTMLImageElement;
    // Pixels de l'image chargée par unité du cadre 400 × 500.
    const s = img.width / FRAME_W;
    const { cx, cy, r } = crop.head;
    const d = ART.head * R;
    const head = (ctx: CanvasRenderingContext2D) => {
      ctx.beginPath();
      ctx.arc(d / 2, d / 2, d / 2, 0, 2 * Math.PI);
      ctx.clip();
      ctx.drawImage(img, (cx - r) * s, (cy - r) * s, 2 * r * s, 2 * r * s, 0, 0, d, d);
    };
    vignette(scene, headKey(id), d, d, head);
    // Silhouette : la même tête, peinte d'une seule teinte sombre (aucun détail visible).
    vignette(scene, shadowKey(id), d, d, ctx => {
      head(ctx);
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = ART_FX.silhouetteCss;
      ctx.fillRect(0, 0, d, d);
    });
    const b = crop.bust;
    const bw = ART.bust.w * R;
    const bh = ART.bust.h * R;
    vignette(scene, bustKey(id), bw, bh, ctx => {
      ctx.beginPath();
      ctx.roundRect(0, 0, bw, bh, ART.bust.radius * R);
      ctx.clip();
      ctx.drawImage(img, b.x * s, b.y * s, b.w * s, b.h * s, 0, 0, bw, bh);
    });
  }
  return missing;
}

function vignette(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const texture = scene.textures.createCanvas(key, Math.round(w), Math.round(h));
  if (!texture) return;
  const ctx = texture.getContext();
  ctx.imageSmoothingQuality = 'high';
  ctx.save();
  draw(ctx);
  ctx.restore();
  texture.refresh();
}

// Image d'interface à la taille d'affichage voulue, ou null si le visuel manque.
export function uiImage(scene: Phaser.Scene, name: UiArt, x: number, y: number, w: number, h: number) {
  return hasUi(scene, name) ? scene.add.image(x, y, uiKey(name)).setDisplaySize(w, h) : null;
}
