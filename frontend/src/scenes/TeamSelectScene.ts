import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, CSS, FONTS, FONT_FAMILY, STROKE } from '../config';
import { makeButton, makeTitle, rarityColor, fadeIn, transitionTo, isTransitioning, showToast } from '../ui/UIManager';
import { getHeroById, STARTER_HERO_IDS } from '../data/heroes';
import { MAX_TEAM } from '../systems/RunManager';
import { RELIC_POOL } from '../data/relics';

interface HeroCard {
  id: string;
  bg: Phaser.GameObjects.Rectangle;
  badge: Phaser.GameObjects.Text;
}

// Écran de composition d'équipe : le joueur choisit jusqu'à MAX_TEAM héros parmi
// ses héros débloqués avant de lancer un run (normal ou auto).
export class TeamSelectScene extends Phaser.Scene {
  private auto = false;
  private selected: string[] = [];
  private cards: HeroCard[] = [];
  private counterText!: Phaser.GameObjects.Text;

  constructor() { super('TeamSelect'); }

  create(data?: { auto?: boolean }): void {
    this.auto = data?.auto ?? false;
    this.cards = [];

    fadeIn(this);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background);
    makeTitle(this, GAME_WIDTH / 2, 40, this.auto ? '🤖 ÉQUIPE — AUTO' : 'COMPOSE TON ÉQUIPE');
    this.add.text(GAME_WIDTH / 2, 72, `Choisis jusqu'à ${MAX_TEAM} héros`, { ...FONTS.small, align: 'center' }).setOrigin(0.5);

    // Sélection par défaut : les starters débloqués (le bouton Lancer marche tout de suite)
    const unlocked = window.gameState.unlockedHeroIds.filter(id => getHeroById(id) !== undefined);
    this.selected = unlocked.filter(id => STARTER_HERO_IDS.includes(id)).slice(0, MAX_TEAM);
    if (this.selected.length === 0) this.selected = unlocked.slice(0, MAX_TEAM);

    this.drawHeroGrid(unlocked);

    this.counterText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 108, '', { ...FONTS.body, align: 'center' }).setOrigin(0.5);
    makeButton(this, 96, GAME_HEIGHT - 54, '← Menu', () => transitionTo(this, 'MainMenu'), 130, 44, COLORS.btn.neutral);
    makeButton(this, 254, GAME_HEIGHT - 54, 'LANCER ▶', () => this.begin(), 170, 46);

    this.refreshAll();
  }

  private drawHeroGrid(unlocked: string[]): void {
    const colX = [70, 180, 290];
    const startY = 140;
    const rowH = 104;

    unlocked.forEach((id, i) => {
      const hero = getHeroById(id)!;
      const x = colX[i % 3];
      const y = startY + Math.floor(i / 3) * rowH;

      const card = this.add.container(x, y);
      const bg = this.add.rectangle(0, 0, 100, 92, COLORS.panel, 1).setStrokeStyle(STROKE.base, rarityColor(hero.rarity));
      const icon = this.add.image(0, -14, `hero_${id}`).setDisplaySize(46, 46);
      const name = this.add.text(0, 20, hero.name.split(' ')[0], { ...FONTS.small, fontSize: '10px', color: CSS.text }).setOrigin(0.5);
      const cls = this.add.text(0, 34, hero.class, { ...FONTS.small, fontSize: '8px' }).setOrigin(0.5);
      // Pastille d'ordre de sélection (1..5), masquée tant que le héros n'est pas pris
      const badge = this.add.text(40, -38, '', {
        fontFamily: FONT_FAMILY, fontSize: '13px', fontStyle: 'bold', color: CSS.textLight, backgroundColor: CSS.accent,
        padding: { x: 5, y: 2 },
      }).setOrigin(0.5).setVisible(false);
      card.add([bg, icon, name, cls, badge]);

      bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.toggle(id));
      this.cards.push({ id, bg, badge });
    });
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
    const bonuses = gs.talentTree.getBonuses();
    const startRelicIds: string[] = [];
    if (bonuses.startRelicCount > 0) {
      const commonRelics = RELIC_POOL.filter(r => r.rarity === 'common');
      for (let i = 0; i < bonuses.startRelicCount && i < commonRelics.length; i++) {
        startRelicIds.push(commonRelics[i].id);
      }
    }

    gs.runManager.startRun({
      teamHeroIds: this.selected,
      hpBonus: bonuses.hpBonus,
      atkPct: bonuses.atkPct,
      goldBonusPct: bonuses.goldBonusPct,
      startRelicIds,
      startGold: bonuses.startGold,
      hasRevivePassive: bonuses.hasRevivePassive,
      reviveHpPct: bonuses.reviveHpPct,
      extraHeroSlot: bonuses.extraHeroSlot,
      autoMode: this.auto,
    });

    transitionTo(this, 'RunMap');
  }
}
