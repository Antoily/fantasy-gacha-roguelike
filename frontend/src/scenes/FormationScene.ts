import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, FONTS } from '../config';
import { makeButton, makePanel, makeTitle, makeHpBar, rarityColor, fadeIn, transitionTo } from '../ui/UIManager';
import type { HeroInstance } from '../entities/Hero';
import { isHeroAlive } from '../entities/Hero';
import { getEnemyById } from '../data/enemies';
import type { EnemyFormation } from '../data/enemies';

const CELL_SIZE = 72;
const CELL_GAP = 6;
const GRID_ROWS = 3;
const GRID_COLS = 3;

export class FormationScene extends Phaser.Scene {
  private selectedHero: HeroInstance | null = null;
  private heroCards: Phaser.GameObjects.Container[] = [];
  private gridCells: Phaser.GameObjects.Container[][] = [];
  private placedHeroes: (HeroInstance | null)[][] = [];
  constructor() { super('Formation'); }

  create(): void {
    const run = window.gameState.runManager.state;

    // Initialize empty grid — la scène est réutilisée entre les combats,
    // heroCards doit être vidé sinon selectHero itère sur des cartes détruites
    this.placedHeroes = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null));
    this.selectedHero = null;
    this.heroCards = [];
    this.gridCells = [];

    fadeIn(this);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0f0f1e);
    makeTitle(this, GAME_WIDTH / 2, 28, 'FORMATION');

    const room = run.rooms[run.currentRoomIndex];
    if (room.formation) {
      this.drawEnemyPreview(room.formation);
    }

    this.drawPlayerGrid();
    this.drawHeroRoster();
    this.drawLegend();

    makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 38, 'LANCER LE COMBAT ▶', () => this.startCombat(), 260, 46);
  }

  private drawEnemyPreview(formation: EnemyFormation): void {
    makePanel(this, GAME_WIDTH / 2, 95, 340, 90);
    this.add.text(GAME_WIDTH / 2, 62, `Ennemi : ${formation.name}`, { ...FONTS.body, color: '#ff7777', align: 'center' }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 80, formation.hint, { ...FONTS.small, align: 'center', wordWrap: { width: 320 } }).setOrigin(0.5);

    // Mini enemy grid
    const startX = GAME_WIDTH / 2 - 65;
    const startY = 105;
    const miniCell = 22;

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const x = startX + c * (miniCell + 2);
        const y = startY + r * (miniCell + 2);
        const eid = formation.grid[r]?.[c];
        const color = eid ? 0x552222 : 0x1e1e2e;
        this.add.rectangle(x + miniCell / 2, y + miniCell / 2, miniCell, miniCell, color).setStrokeStyle(1, 0x443333);
        if (eid) {
          const edef = getEnemyById(eid);
          this.add.text(x + miniCell / 2, y + miniCell / 2, edef?.name.slice(0, 3) ?? '?', {
            fontSize: '7px', color: '#ffaaaa',
          }).setOrigin(0.5);
        }
      }
    }
  }

  private drawPlayerGrid(): void {
    const gridX = GAME_WIDTH / 2 - ((GRID_COLS * (CELL_SIZE + CELL_GAP)) / 2) + CELL_SIZE / 2;
    const gridY = 220;

    this.add.text(GAME_WIDTH / 2, gridY - 22, 'Ta Formation (Front → Arrière)', { ...FONTS.small, align: 'center' }).setOrigin(0.5);
    const rowLabels = ['Avant', 'Milieu', 'Arrière'];

    for (let r = 0; r < GRID_ROWS; r++) {
      this.gridCells[r] = [];
      const cellY = gridY + r * (CELL_SIZE + CELL_GAP);
      this.add.text(8, cellY, rowLabels[r], { ...FONTS.small, fontSize: '9px' }).setOrigin(0, 0.5);

      for (let c = 0; c < GRID_COLS; c++) {
        const cellX = gridX + c * (CELL_SIZE + CELL_GAP);
        const container = this.add.container(cellX, cellY);
        const bg = this.add.image(0, 0, 'grid_cell').setDisplaySize(CELL_SIZE, CELL_SIZE);
        container.add(bg);
        this.gridCells[r][c] = container;

        const rCopy = r, cCopy = c;
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerover', () => bg.setTexture('grid_cell_hover'));
        bg.on('pointerout', () => {
          if (!this.placedHeroes[rCopy][cCopy]) bg.setTexture('grid_cell');
        });
        bg.on('pointerdown', () => this.onCellClick(rCopy, cCopy));
      }
    }
  }

  private drawHeroRoster(): void {
    const run = window.gameState.runManager.state;
    const liveHeroes = run.heroes.filter(isHeroAlive);

    const startY = 460;
    this.add.text(GAME_WIDTH / 2, startY - 22, 'Héros disponibles (appui pour sélectionner)', { ...FONTS.small, align: 'center' }).setOrigin(0.5);

    liveHeroes.forEach((hero, i) => {
      const x = 20 + i * 68;
      const y = startY;
      const container = this.add.container(x, y);
      const bg = this.add.rectangle(28, 28, 56, 56, COLORS.panel).setStrokeStyle(1, rarityColor(hero.rarity));
      const icon = this.add.image(28, 20, `hero_${hero.definitionId}`).setDisplaySize(40, 40);
      const name = this.add.text(28, 44, hero.name.split(' ')[0], { ...FONTS.small, fontSize: '9px', align: 'center' }).setOrigin(0.5);
      const hpBar = makeHpBar(this, 28, 56, 50, 5, hero.currentHp / hero.maxHp);
      container.add([bg, icon, name, hpBar]);

      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => this.selectHero(hero, bg));
      // Rareté mémorisée pour restaurer la bonne couleur de bordure à la désélection
      container.setData('rarity', hero.rarity);
      this.heroCards.push(container);

      // Check if already placed
      const isPlaced = this.placedHeroes.flat().some(h => h?.instanceId === hero.instanceId);
      if (isPlaced) bg.setFillStyle(0x2a2a4a);
    });
  }

  private drawLegend(): void {
    this.add.text(GAME_WIDTH / 2, 420, '💡 Sélectionne un héros puis une case', { ...FONTS.small, align: 'center', color: '#777799' }).setOrigin(0.5);
  }

  private selectHero(hero: HeroInstance, bg: Phaser.GameObjects.Rectangle): void {
    // Deselect previous — chaque carte retrouve la couleur de sa propre rareté
    this.heroCards.forEach(c => {
      const b = c.list[0] as Phaser.GameObjects.Rectangle;
      b.setStrokeStyle(1, rarityColor(c.getData('rarity')));
    });
    this.selectedHero = hero;
    bg.setStrokeStyle(2, 0xffffff);
  }

  private onCellClick(row: number, col: number): void {
    if (!this.selectedHero) return;

    // Remove hero from any existing position
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (this.placedHeroes[r][c]?.instanceId === this.selectedHero.instanceId) {
          this.placedHeroes[r][c] = null;
          this.refreshCell(r, c);
        }
      }
    }

    // If occupied, swap
    const existing = this.placedHeroes[row][col];
    this.placedHeroes[row][col] = this.selectedHero;
    this.selectedHero.gridRow = row;
    this.selectedHero.gridCol = col;

    if (existing) {
      // Put existing back to roster (unplace)
      existing.gridRow = null;
      existing.gridCol = null;
    }

    this.refreshCell(row, col);
    this.selectedHero = null;
  }

  private refreshCell(row: number, col: number): void {
    const container = this.gridCells[row][col];
    // Remove previous hero display (keep bg at index 0)
    while (container.list.length > 1) container.remove(container.list[1], true);

    const hero = this.placedHeroes[row][col];
    if (hero) {
      const icon = this.add.image(0, -8, `hero_${hero.definitionId}`).setDisplaySize(48, 48);
      const name = this.add.text(0, 26, hero.name.split(' ')[0], { ...FONTS.small, fontSize: '9px', align: 'center' }).setOrigin(0.5);
      container.add([icon, name]);
      // Pop de placement : feedback immédiat sur la case choisie
      icon.setScale(icon.scaleX * 1.5).setAlpha(0);
      this.tweens.add({ targets: icon, scale: icon.scaleX / 1.5, alpha: 1, duration: 180, ease: 'Back.Out' });
    }
  }

  private startCombat(): void {
    // Apply grid positions to heroes
    const run = window.gameState.runManager.state;
    run.heroes.forEach(h => {
      if (!this.placedHeroes.flat().some(ph => ph?.instanceId === h.instanceId)) {
        h.gridRow = null;
        h.gridCol = null;
      }
    });

    // If no heroes placed, auto-assign
    const placed = run.heroes.filter(h => h.gridRow !== null);
    if (placed.length === 0) {
      const liveHeroes = run.heroes.filter(isHeroAlive);
      liveHeroes.forEach((h, i) => {
        h.gridRow = Math.floor(i / 3);
        h.gridCol = i % 3;
      });
    }

    transitionTo(this, 'Combat');
  }
}
