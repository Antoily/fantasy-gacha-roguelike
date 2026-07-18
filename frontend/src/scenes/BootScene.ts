import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, CSS, FONT_FAMILY, STROKE } from '../config';

// Generates colored placeholder rectangles for all game assets.
// Replace with real AI-generated images by loading them in preload() with the same keys.
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload(): void {
    this.createLoadingBar();
    this.load.image('hero_aldric', 'assets/hero_aldric.png');
  }

  create(): void {
    this.generatePlaceholderTextures();
    this.scene.start('MainMenu');
  }

  private createLoadingBar(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    this.add.rectangle(cx, cy - 20, 300, 14, COLORS.panel).setStrokeStyle(STROKE.base, COLORS.ink);
    const fill = this.add.rectangle(cx - 147, cy - 20, 294, 8, COLORS.accent).setOrigin(0, 0.5).setScale(0, 1);
    this.add.text(cx, cy + 14, 'Chargement…', { fontFamily: FONT_FAMILY, fontSize: '14px', color: CSS.textDim, fontStyle: 'bold' }).setOrigin(0.5);
    this.load.on('progress', (value: number) => fill.setScale(value, 1));
  }

  private g(): Phaser.GameObjects.Graphics {
    return this.add.graphics();
  }

  // Pastille cernée de noir : la brique de base du style BD.
  // Le tracé est rentré de lw/2 car generateTexture coupe tout ce qui déborde de 0..w.
  private outlinedRect(
    gfx: Phaser.GameObjects.Graphics,
    w: number, h: number,
    fill: number,
    radius = 8,
    lw: number = STROKE.base,
  ): void {
    const i = lw / 2;
    gfx.fillStyle(fill, 1);
    gfx.fillRoundedRect(i, i, w - lw, h - lw, radius);
    gfx.lineStyle(lw, COLORS.ink, 1);
    gfx.strokeRoundedRect(i, i, w - lw, h - lw, radius);
  }

  private generatePlaceholderTextures(): void {
    // Portraits de héros — aplats saturés, tête et buste cernés
    const heroColors: Record<string, number> = {
      thane: 0x7f9ec4,
      brann: 0x9e8f6b,
      sylva: 0x5cc85c,
      zara: 0xc45cd6,
      finn: 0xffd95c,
      sora: 0xffe9a8,
      shade: 0x6b6f9e,
      gorvak: 0xff7a4d,
      kael: 0xd6674d,
      nix: 0x4dd6c4,
      lyra: 0x4ecdc4,
      vex: 0xffa63d,
    };

    for (const [id, color] of Object.entries(heroColors)) {
      const gfx = this.g();
      this.outlinedRect(gfx, 80, 80, color, 10, STROKE.thick);
      gfx.fillStyle(COLORS.textLight, 0.9);
      gfx.lineStyle(STROKE.thin, COLORS.ink, 1);
      gfx.fillCircle(40, 28, 15);
      gfx.strokeCircle(40, 28, 15);
      gfx.fillRoundedRect(16, 50, 48, 24, 8);
      gfx.strokeRoundedRect(16, 50, 48, 24, 8);
      gfx.generateTexture(`hero_${id}`, 80, 80);
      gfx.destroy();
    }

    // Ennemis — même grammaire, teintes plus froides/acides pour les distinguer
    const enemyColors: Record<string, number> = {
      goblin_grunt: 0x8fbc3f,
      orc_berserker: 0xc8703f,
      dark_archer: 0x5b7f9e,
      skeleton_mage: 0xd6d6c4,
      stone_golem: 0x9e9e8f,
      shadow_assassin: 0x5c5c7a,
      cursed_knight: 0x8f5cb0,
      forest_witch: 0x4fa36b,
      dungeon_lord: 0xd6453f,
      corrupted_ancient: 0xa03fd6,
    };

    for (const [id, color] of Object.entries(enemyColors)) {
      const gfx = this.g();
      this.outlinedRect(gfx, 60, 60, color, 8, STROKE.base);
      gfx.fillStyle(COLORS.ink, 1);
      gfx.fillCircle(23, 24, 4);
      gfx.fillCircle(37, 24, 4);
      gfx.generateTexture(`enemy_${id}`, 60, 60);
      gfx.destroy();
    }

    // Fonds de salle — nuances de papier teinté, jamais de fond sombre
    const bgColors: Record<string, number> = {
      combat: 0xf6ded2,
      recruit: 0xdcefe0,
      rest: 0xdde8f5,
      boss: 0xf2d3d8,
    };
    for (const [type, color] of Object.entries(bgColors)) {
      const gfx = this.g();
      gfx.fillStyle(color, 1);
      gfx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      gfx.generateTexture(`bg_${type}`, GAME_WIDTH, GAME_HEIGHT);
      gfx.destroy();
    }

    // Cadre de carte
    const cardG = this.g();
    this.outlinedRect(cardG, 100, 140, COLORS.panel, 10, STROKE.base);
    cardG.generateTexture('card_frame', 100, 140);
    cardG.destroy();

    // Case de grille (normale)
    const cellG = this.g();
    this.outlinedRect(cellG, 80, 80, COLORS.panel, 8, STROKE.base);
    cellG.generateTexture('grid_cell', 80, 80);
    cellG.destroy();

    // Case de grille (survolée) — l'accent remplit la case, le contour reste noir
    const cellHoverG = this.g();
    this.outlinedRect(cellHoverG, 80, 80, COLORS.accentLight, 8, STROKE.thick);
    cellHoverG.generateTexture('grid_cell_hover', 80, 80);
    cellHoverG.destroy();

    // Particule d'impact — un rond franc cerné, pas une lueur diffuse
    const sparkG = this.g();
    sparkG.fillStyle(COLORS.gold, 1);
    sparkG.fillCircle(8, 8, 6);
    sparkG.lineStyle(2, COLORS.ink, 1);
    sparkG.strokeCircle(8, 8, 6);
    sparkG.generateTexture('spark', 16, 16);
    sparkG.destroy();
  }
}

export { COLORS };
