import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, CSS, FONTS, FONT_FAMILY, STROKE } from '../config';
import { makeButton, makeTitle, makeSortBar, attachScroll, rarityColor, fadeIn, transitionTo, isTransitioning, showToast } from '../ui/UIManager';
import type { ScrollHandle } from '../ui/UIManager';
import { getHeroById, STARTER_HERO_IDS, ROLE_ICONS } from '../data/heroes';
import type { HeroDefinition } from '../data/heroes';
import { HERO_SORTS, sortHeroes } from '../data/heroSort';
import { MAX_TEAM } from '../systems/RunManager';

interface HeroCard {
  id: string;
  bg: Phaser.GameObjects.Rectangle;
  badge: Phaser.GameObjects.Text;
}

const GRID_TOP = 174;
const ROW_H = 104;

// Écran de composition d'équipe : le joueur choisit jusqu'à MAX_TEAM héros parmi
// ses héros débloqués avant de lancer un run (normal ou auto).
export class TeamSelectScene extends Phaser.Scene {
  private auto = false;
  private selected: string[] = [];
  private cards: HeroCard[] = [];
  private counterText!: Phaser.GameObjects.Text;
  private sortId = HERO_SORTS[0].id;
  private scroll: ScrollHandle | null = null;

  constructor() { super('TeamSelect'); }

  create(data?: { auto?: boolean; sortId?: string; selected?: string[] }): void {
    this.auto = data?.auto ?? false;
    // La scène se relance à chaque changement de tri : on reprend le tri et la
    // sélection en cours pour ne rien faire perdre au joueur.
    this.sortId = data?.sortId ?? HERO_SORTS[0].id;
    this.cards = [];
    this.scroll = null;

    fadeIn(this);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background);
    makeTitle(this, GAME_WIDTH / 2, 40, this.auto ? 'ÉQUIPE — AUTO' : 'COMPOSE TON ÉQUIPE');
    this.add.text(GAME_WIDTH / 2, 72, `Choisis jusqu'à ${MAX_TEAM} héros`, { ...FONTS.small, align: 'center' }).setOrigin(0.5);

    const unlocked = window.gameState.unlockedHeroIds
      .map(id => getHeroById(id))
      .filter((h): h is HeroDefinition => h !== undefined);

    // Sélection par défaut : les starters débloqués (le bouton Lancer marche tout de suite)
    if (data?.selected) {
      this.selected = data.selected;
    } else {
      this.selected = unlocked.filter(h => STARTER_HERO_IDS.includes(h.id)).map(h => h.id).slice(0, MAX_TEAM);
      if (this.selected.length === 0) this.selected = unlocked.slice(0, MAX_TEAM).map(h => h.id);
    }

    makeSortBar(this, 104, HERO_SORTS, this.sortId, id => {
      this.scene.restart({ auto: this.auto, sortId: id, selected: this.selected });
    });

    this.drawHeroGrid(sortHeroes(unlocked, this.sortId));

    this.counterText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 108, '', { ...FONTS.body, align: 'center' }).setOrigin(0.5);
    makeButton(this, 96, GAME_HEIGHT - 54, '← Menu', () => transitionTo(this, 'MainMenu'), 130, 44, COLORS.btn.neutral);
    makeButton(this, 254, GAME_HEIGHT - 54, 'LANCER ▶', () => this.begin(), 170, 46);

    this.refreshAll();
  }

  private drawHeroGrid(heroes: HeroDefinition[]): void {
    const colX = [70, 180, 290];
    // Les cartes vivent dans un conteneur défilable : 20 héros ne tiennent pas
    // sur un écran de 640px.
    const grid = this.add.container(0, 0);

    heroes.forEach((hero, i) => {
      const x = colX[i % 3];
      const y = GRID_TOP + Math.floor(i / 3) * ROW_H;

      const card = this.add.container(x, y);
      const bg = this.add.rectangle(0, 0, 100, 92, COLORS.panel, 1).setStrokeStyle(STROKE.base, rarityColor(hero.rarity));
      const icon = this.add.image(0, -14, `hero_${hero.id}`).setDisplaySize(46, 46);
      const name = this.add.text(0, 20, hero.short, { ...FONTS.small, fontSize: '10px', color: CSS.text }).setOrigin(0.5);
      const stats = this.add.text(0, 34, `${ROLE_ICONS[hero.role]} ${hero.atk} ATK · ${hero.hp} PV`, {
        ...FONTS.small, fontSize: '8px',
      }).setOrigin(0.5);
      // Pastille d'ordre de sélection, masquée tant que le héros n'est pas pris
      const badge = this.add.text(40, -38, '', {
        fontFamily: FONT_FAMILY, fontSize: '13px', fontStyle: 'bold', color: CSS.textLight, backgroundColor: CSS.accent,
        padding: { x: 5, y: 2 },
      }).setOrigin(0.5).setVisible(false);
      card.add([bg, icon, name, stats, badge]);
      grid.add(card);

      // Sur 'pointerup' et non 'pointerdown' : un glissement de défilement ne
      // doit pas sélectionner un héros au passage.
      bg.setInteractive({ useHandCursor: true })
        .on('pointerup', (pointer: Phaser.Input.Pointer) => {
          if (this.scroll?.wasDragged() || !this.scroll?.isInView(pointer.y)) return;
          this.toggle(hero.id);
        });
      this.cards.push({ id: hero.id, bg, badge });
    });

    const rows = Math.ceil(heroes.length / 3);
    this.scroll = attachScroll(this, grid, 124, GAME_HEIGHT - 124, GRID_TOP + rows * ROW_H - ROW_H / 2);
  }

  private toggle(id: string): void {
    const idx = this.selected.indexOf(id);
    if (idx >= 0) {
      this.selected.splice(idx, 1);
    } else if (this.selected.length >= MAX_TEAM) {
      showToast(this, `Équipe pleine (max ${MAX_TEAM})`);
      return;
    } else {
      this.selected.push(id);
    }
    this.refreshAll();
  }

  private refreshAll(): void {
    this.cards.forEach(c => {
      const order = this.selected.indexOf(c.id);
      if (order >= 0) {
        // Sélection = gros cerne noir (le blanc serait invisible sur le panneau clair)
        c.bg.setStrokeStyle(STROKE.thick, COLORS.ink);
        c.badge.setText(`${order + 1}`).setVisible(true);
      } else {
        c.bg.setStrokeStyle(STROKE.base, rarityColor(getHeroById(c.id)!.rarity));
        c.badge.setVisible(false);
      }
    });
    this.counterText.setText(`${this.selected.length}/${MAX_TEAM} sélectionné(s)`);
  }

  private begin(): void {
    if (isTransitioning(this)) return;
    if (this.selected.length === 0) { showToast(this, 'Choisis au moins un héros'); return; }

    const gs = window.gameState;
    gs.runManager.startRun({ teamHeroIds: this.selected, autoMode: this.auto });

    transitionTo(this, 'RunMap');
  }
}
