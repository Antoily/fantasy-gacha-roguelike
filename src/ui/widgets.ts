import Phaser from 'phaser';
import type { PullResult } from '../logic/gacha';
import { RARITIES } from '../data/gachaConfig';
import { HEIGHT, WIDTH, type Rect } from './layout';
import { COLORS, CSS, FONT_FAMILY, FONT_SIZE, RADIUS, SCRIM_ALPHA, SHADOW_OFFSET, STROKE } from './theme';

export function textStyle(size: number, color: string = CSS.text): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontFamily: FONT_FAMILY, fontSize: `${size}px`, fontStyle: 'bold', color };
}

// Panneau blanc cerné de noir. Dessiné dans un Graphics ajouté au parent fourni.
export function makePanel(scene: Phaser.Scene, r: Rect, fill: number = COLORS.panel): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(fill, 1).fillRoundedRect(r.x, r.y, r.w, r.h, RADIUS);
  g.lineStyle(STROKE.base, COLORS.ink, 1).strokeRoundedRect(r.x, r.y, r.w, r.h, RADIUS);
  return g;
}

export interface Button {
  readonly container: Phaser.GameObjects.Container;
  setEnabled(enabled: boolean): void;
}

// Bouton cerné de noir avec ombre portée pleine. Le sous-titre éventuel tient DANS la
// case : une explication qui accompagne un bouton ne déborde pas dessous.
// Réagit sur pointerup : un appui glissé hors du bouton ne déclenche rien.
export function makeButton(
  scene: Phaser.Scene,
  r: Rect,
  label: string,
  fill: number,
  onClick: () => void,
  subtitle?: string,
): Button {
  const container = scene.add.container(0, 0);
  const g = scene.add.graphics();
  const title = scene.add.text(r.x + r.w / 2, r.y + r.h / 2 - (subtitle ? 10 : 0), label, textStyle(FONT_SIZE.button))
    .setOrigin(0.5);
  const sub = subtitle
    ? scene.add.text(r.x + r.w / 2, r.y + r.h / 2 + 14, subtitle, textStyle(FONT_SIZE.small, CSS.textDim)).setOrigin(0.5)
    : null;
  const zone = scene.add.zone(r.x, r.y, r.w, r.h).setOrigin(0).setInteractive({ useHandCursor: true });
  container.add([g, title, ...(sub ? [sub] : []), zone]);

  let enabled = true;
  const draw = (pressed: boolean) => {
    const dy = pressed ? SHADOW_OFFSET : 0;
    g.clear();
    if (enabled && !pressed) {
      g.fillStyle(COLORS.ink, 1).fillRoundedRect(r.x + SHADOW_OFFSET, r.y + SHADOW_OFFSET, r.w, r.h, RADIUS);
    }
    g.fillStyle(enabled ? fill : COLORS.btn.disabled, 1).fillRoundedRect(r.x + dy, r.y + dy, r.w, r.h, RADIUS);
    g.lineStyle(STROKE.base, COLORS.ink, 1).strokeRoundedRect(r.x + dy, r.y + dy, r.w, r.h, RADIUS);
    title.setY(r.y + r.h / 2 - (subtitle ? 10 : 0) + dy).setColor(enabled ? CSS.text : CSS.textFaint);
    sub?.setY(r.y + r.h / 2 + 14 + dy);
  };
  draw(false);

  // Un bouton désactivé sort de la détection des clics (disableInteractive) : ces
  // gestionnaires ne s'exécutent alors jamais.
  zone.on('pointerdown', () => draw(true));
  zone.on('pointerout', () => draw(false));
  zone.on('pointerup', () => {
    draw(false);
    onClick();
  });

  return {
    container,
    setEnabled(value: boolean) {
      enabled = value;
      if (value) zone.setInteractive({ useHandCursor: true });
      else zone.disableInteractive();
      draw(false);
    },
  };
}

// Voile papier plein écran : empêche les boutons du dessous de réagir visuellement.
// Il ne suffit PAS à bloquer les actions : Phaser traite deux clics rapprochés dans la
// même image, avant que le voile existe. Les scènes gardent donc leur propre verrou.
// Tout ce qui est ajouté au conteneur s'affiche au-dessus ; le détruire ferme la fenêtre.
export function makeModal(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0).setDepth(100);
  const scrim = scene.add.rectangle(0, 0, WIDTH, HEIGHT, COLORS.scrim, SCRIM_ALPHA).setOrigin(0).setInteractive();
  container.add(scrim);
  return container;
}

const rarityInfo = (id: string) => RARITIES.find(r => r.id === id)!;

// Carte d'un résultat (FR-012) : pastille de rareté + initiale, nom, type, rareté,
// et « Nouveau ! » ou le nombre d'exemplaires possédés.
export function makeResultCard(
  scene: Phaser.Scene,
  r: Rect,
  result: PullResult,
  ownedCount: number,
  large = false,
): Phaser.GameObjects.Container {
  const { item } = result;
  const info = rarityInfo(item.rarity);
  const color = COLORS.rarity[item.rarity];
  const c = scene.add.container(0, 0);
  c.add(makePanel(scene, r));

  const pad = large ? 20 : 10;
  const radius = large ? 34 : 17;
  const cx = large ? r.x + r.w / 2 : r.x + pad + radius;
  const cy = r.y + pad + radius;
  const disc = scene.add.graphics();
  disc.fillStyle(color, 1).fillCircle(cx, cy, radius);
  disc.lineStyle(STROKE.thin, COLORS.ink, 1).strokeCircle(cx, cy, radius);
  c.add(disc);
  c.add(scene.add.text(cx, cy, item.name.charAt(0), textStyle(large ? FONT_SIZE.title : FONT_SIZE.button)).setOrigin(0.5));

  const kind = item.kind === 'character' ? 'Personnage' : 'Créature';
  const badge = result.isNew ? 'Nouveau !' : `Déjà possédé ×${ownedCount}`;

  if (large) {
    let y = cy + radius + 14;
    c.add(scene.add.text(cx, y, item.name, textStyle(FONT_SIZE.big)).setOrigin(0.5, 0));
    y += 32;
    c.add(scene.add.text(cx, y, `${kind} · ${info.label}`, textStyle(FONT_SIZE.body, CSS.textDim)).setOrigin(0.5, 0));
    y += 24;
    c.add(makeBadge(scene, cx, y, badge, result.isNew, 0.5));
    if (result.shards > 0) c.add(makeShardAmount(scene, cx, y + 34, `+${result.shards} éclats`, 0.5));
    if (result.pity) c.add(makeSticker(scene, r.x + r.w - 8, r.y - 8, 'Garanti !'));
    return c;
  }

  const textX = cx + radius + 8;
  const textW = r.x + r.w - pad - textX;
  c.add(scene.add.text(textX, r.y + pad, item.name, { ...textStyle(FONT_SIZE.body), wordWrap: { width: textW } }));
  c.add(scene.add.text(r.x + pad, r.y + 53, `${kind} · ${info.label}`, textStyle(FONT_SIZE.micro, CSS.textDim)));
  c.add(makeBadge(scene, r.x + pad, r.y + 70, badge, result.isNew, 0));
  if (result.shards > 0) c.add(makeShardAmount(scene, r.x + r.w - pad, r.y + 79, `+${result.shards}`, 1));
  // Pastille façon autocollant, à cheval sur le bord : la ligne du bas est déjà pleine
  // quand un résultat forcé est aussi un doublon.
  if (result.pity) c.add(makeSticker(scene, r.x + r.w - 6, r.y - 7, 'Garanti !'));
  return c;
}

// Losange des éclats, centré en (x, y).
export function makeShardIcon(scene: Phaser.Scene, x: number, y: number, size: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  const V = Phaser.Math.Vector2;
  const points = [new V(x, y - size), new V(x + size * 0.75, y), new V(x, y + size), new V(x - size * 0.75, y)];
  g.fillStyle(COLORS.shard, 1).fillPoints(points, true);
  g.lineStyle(STROKE.thin, COLORS.ink, 1).strokePoints(points, true);
  return g;
}

// Montant d'éclats précédé du losange. originX : 0 = à gauche de x, 0,5 = centré, 1 = à droite.
export function makeShardAmount(
  scene: Phaser.Scene, x: number, y: number, label: string, originX: number, size: number = FONT_SIZE.tiny,
): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const t = scene.add.text(0, 0, label, textStyle(size));
  const icon = size * 0.55;
  const w = icon * 1.5 + 4 + t.width;
  const left = x - originX * w;
  c.add(makeShardIcon(scene, left + icon * 0.75, y, icon));
  t.setPosition(left + icon * 1.5 + 4, y).setOrigin(0, 0.5);
  c.add(t);
  return c;
}

function makeSticker(scene: Phaser.Scene, rightX: number, topY: number, label: string): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const t = scene.add.text(0, 0, label, textStyle(FONT_SIZE.tiny));
  const w = t.width + 12;
  const h = t.height + 4;
  const g = scene.add.graphics();
  g.fillStyle(COLORS.badgePity, 1).fillRoundedRect(rightX - w, topY, w, h, h / 2);
  g.lineStyle(STROKE.thin, COLORS.ink, 1).strokeRoundedRect(rightX - w, topY, w, h, h / 2);
  t.setPosition(rightX - w + 6, topY + 2);
  c.add([g, t]);
  return c;
}

function makeBadge(scene: Phaser.Scene, x: number, y: number, label: string, isNew: boolean, originX: number) {
  const c = scene.add.container(0, 0);
  const t = scene.add.text(0, 0, label, textStyle(FONT_SIZE.tiny, isNew ? CSS.text : CSS.textDim));
  const w = t.width + 12;
  const h = t.height + 4;
  const left = x - originX * w;
  if (isNew) {
    const g = scene.add.graphics();
    g.fillStyle(COLORS.badgeNew, 1).fillRoundedRect(left, y, w, h, h / 2);
    g.lineStyle(STROKE.thin, COLORS.ink, 1).strokeRoundedRect(left, y, w, h, h / 2);
    c.add(g);
  }
  t.setPosition(left + 6, y + 2);
  c.add(t);
  return c;
}
