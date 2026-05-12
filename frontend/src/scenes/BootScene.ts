import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config';

// Generates colored placeholder rectangles for all game assets.
// Replace with real AI-generated images by loading them in preload() with the same keys.
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload(): void {
    this.createLoadingBar();
    this.generatePlaceholderTextures();
  }

  create(): void {
    this.scene.start('MainMenu');
  }

  private createLoadingBar(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    this.add.rectangle(cx, cy - 20, 300, 8, 0x333344);
    const bar = this.add.rectangle(cx - 150 + 1, cy - 20, 0, 6, COLORS.accent).setOrigin(0, 0.5);
    this.add.text(cx, cy + 10, 'Chargement…', { fontFamily: 'Arial', fontSize: '14px', color: '#9999bb' }).setOrigin(0.5);

    this.load.on('progress', (v: number) => { bar.width = 298 * v; });
  }

  private generatePlaceholderTextures(): void {
    // Hero portraits
    const heroColors: Record<string, number> = {
      aldric: 0x4466cc,
      sylva: 0x44aa44,
      zara: 0xaa44aa,
      finn: 0xddcc44,
      shade: 0x444466,
      gorvak: 0xcc6644,
      lyra: 0x44ccaa,
      vex: 0xcc8844,
    };

    for (const [id, color] of Object.entries(heroColors)) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(color, 1);
      g.fillRoundedRect(0, 0, 80, 80, 8);
      g.fillStyle(0xffffff, 0.15);
      g.fillCircle(40, 28, 18);
      g.fillRoundedRect(12, 48, 56, 30, 6);
      g.generateTexture(`hero_${id}`, 80, 80);
      g.destroy();
    }

    // Enemy textures
    const enemyColors: Record<string, number> = {
      goblin_grunt: 0x667733,
      orc_berserker: 0x884422,
      dark_archer: 0x334455,
      skeleton_mage: 0x889999,
      stone_golem: 0x778877,
      shadow_assassin: 0x222233,
      cursed_knight: 0x553366,
      forest_witch: 0x336633,
      dungeon_lord: 0x993311,
      corrupted_ancient: 0x551166,
    };

    for (const [id, color] of Object.entries(enemyColors)) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(color, 1);
      g.fillRoundedRect(0, 0, 60, 60, 6);
      g.fillStyle(0xff3333, 0.6);
      g.fillCircle(30, 22, 12);
      g.generateTexture(`enemy_${id}`, 60, 60);
      g.destroy();
    }

    // Room backgrounds
    const bgColors: Record<string, number> = {
      combat: 0x1a0a0a,
      event: 0x0a1a0a,
      shop: 0x1a1a0a,
      rest: 0x0a0a1a,
      boss: 0x220011,
    };
    for (const [type, color] of Object.entries(bgColors)) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(color, 1);
      g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      g.generateTexture(`bg_${type}`, GAME_WIDTH, GAME_HEIGHT);
      g.destroy();
    }

    // Relic icons (small squares with glyph feel)
    const relicColors = [0xaaaaaa, 0x4488ff, 0xbb44ff, 0xffaa00, 0x44dd88];
    const relicIds = ['bloodstone_ring','swiftness_boots','war_banner','shadow_cloak','ancient_tome',
                      'iron_fortress','emerald_pendant','void_crystal','gold_idol','dragon_scale',
                      'berserker_heart','amulet_of_focus'];
    relicIds.forEach((id, i) => {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      const col = relicColors[i % relicColors.length];
      g.fillStyle(col, 0.8);
      g.fillRoundedRect(0, 0, 48, 48, 6);
      g.fillStyle(0xffffff, 0.3);
      g.fillCircle(24, 24, 14);
      g.generateTexture(`relic_${id}`, 48, 48);
      g.destroy();
    });

    // UI elements
    const cardG = this.make.graphics({ x: 0, y: 0, add: false });
    cardG.fillStyle(COLORS.panel, 1);
    cardG.fillRoundedRect(0, 0, 100, 140, 8);
    cardG.lineStyle(2, COLORS.panelBorder);
    cardG.strokeRoundedRect(0, 0, 100, 140, 8);
    cardG.generateTexture('card_frame', 100, 140);
    cardG.destroy();

    // Grid cell
    const cellG = this.make.graphics({ x: 0, y: 0, add: false });
    cellG.fillStyle(0x1e1e3a, 1);
    cellG.fillRoundedRect(0, 0, 80, 80, 6);
    cellG.lineStyle(1, 0x3d3d7a);
    cellG.strokeRoundedRect(0, 0, 80, 80, 6);
    cellG.generateTexture('grid_cell', 80, 80);
    cellG.destroy();

    const cellHoverG = this.make.graphics({ x: 0, y: 0, add: false });
    cellHoverG.fillStyle(0x2a2a5a, 1);
    cellHoverG.fillRoundedRect(0, 0, 80, 80, 6);
    cellHoverG.lineStyle(2, COLORS.accentLight);
    cellHoverG.strokeRoundedRect(0, 0, 80, 80, 6);
    cellHoverG.generateTexture('grid_cell_hover', 80, 80);
    cellHoverG.destroy();
  }
}

// Re-export COLORS so BootScene consumers don't need a separate import
export { COLORS };
