import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, CSS, FONTS, FONT_FAMILY, STROKE } from '../config';
import { makeButton, makePanel, makeTitle, makeHpBar, fadeIn, transitionTo, floatText } from '../ui/UIManager';
import { isHeroAlive, healHero } from '../entities/Hero';
import { pickRandom } from '../utils/random';

const HEAL_AMOUNT = 35;
const UPGRADE_STAT_BONUS = 8;

export class RestScene extends Phaser.Scene {
  // Verrou anti double-clic : completeRoom ne doit s'appliquer qu'une fois
  private leaving = false;

  constructor() { super('Rest'); }

  create(): void {
    this.leaving = false;
    fadeIn(this);
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg_rest').setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background, 0.35);

    makeTitle(this, GAME_WIDTH / 2, 38, '🏕 REPOS');
    this.add.text(GAME_WIDTH / 2, 65, 'Choisissez une action', { ...FONTS.body, align: 'center' }).setOrigin(0.5);

    this.drawHeroList();
    this.drawActions();

    // Mode auto : action de repos choisie au hasard
    if (window.gameState.runManager.state.autoMode) {
      this.add.text(GAME_WIDTH - 10, 38, '🤖 AUTO', { ...FONTS.small, color: CSS.accent }).setOrigin(1, 0.5);
      this.scheduleAuto();
    }
  }

  private scheduleAuto(): void {
    this.time.delayedCall(800, () => {
      const action = pickRandom(['heal', 'upgrade', 'leave'] as const);
      if (action === 'heal') this.healAll();
      else if (action === 'upgrade') this.autoUpgrade();
      else this.leave();
    });
  }

  private autoUpgrade(): void {
    if (this.leaving) return;
    const gs = window.gameState;
    const live = gs.runManager.state.heroes.filter(isHeroAlive);
    if (live.length === 0) { this.leave(); return; }
    this.leaving = true;
    const hero = pickRandom(live);
    hero.atk += UPGRADE_STAT_BONUS;
    gs.runManager.completeRoom({});
    floatText(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, `+${UPGRADE_STAT_BONUS} ATK`, CSS.magic);
    this.time.delayedCall(550, () => transitionTo(this, 'RunMap'));
  }

  private drawHeroList(): void {
    const run = window.gameState.runManager.state;
    const y = 100;
    this.add.text(18, y - 8, 'Héros', { ...FONTS.small });
    run.heroes.forEach((h, i) => {
      const cx = 20 + i * 65;
      const cy = y + 35;
      const alive = isHeroAlive(h);
      this.add.rectangle(cx + 26, cy, 56, 60, alive ? COLORS.panel : COLORS.backgroundAlt)
        .setStrokeStyle(STROKE.thin, alive ? COLORS.ink : COLORS.textFaint);
      this.add.image(cx + 26, cy - 12, `hero_${h.definitionId}`).setDisplaySize(36, 36);
      this.add.text(cx + 26, cy + 12, h.name.split(' ')[0], { fontSize: '8px', color: CSS.text, fontFamily: FONT_FAMILY, fontStyle: 'bold' }).setOrigin(0.5);
      const pct = Math.max(0, h.currentHp / h.maxHp);
      makeHpBar(this, cx + 26, cy + 25, 52, 5, pct);
      this.add.text(cx + 26, cy + 35, `${h.currentHp}/${h.maxHp}`, { ...FONTS.small, fontSize: '8px' }).setOrigin(0.5);
    });
  }

  // Un bloc d'action = titre / description / bouton, empilés sans se recouvrir.
  // Les boutons pleins (aplat + ombre portée) masquaient la description quand
  // les trois éléments étaient espacés de 20px seulement.
  private drawActionBlock(
    top: number,
    title: string, titleColor: string,
    description: string,
    label: string, onClick: () => void, color: number,
  ): void {
    const h = 94;
    makePanel(this, GAME_WIDTH / 2, top + h / 2, 330, h);
    this.add.text(GAME_WIDTH / 2, top + 16, title, { ...FONTS.body, color: titleColor, align: 'center' }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, top + 38, description, {
      ...FONTS.small, align: 'center', wordWrap: { width: 300 },
    }).setOrigin(0.5);
    makeButton(this, GAME_WIDTH / 2, top + 70, label, onClick, 200, 34, color);
  }

  private drawActions(): void {
    this.drawActionBlock(
      196, '🏥 Soin de groupe', CSS.hp,
      `Restaure ${HEAL_AMOUNT} PV à tous les héros vivants.`,
      'Soigner l\'équipe', () => this.healAll(), COLORS.btn.success,
    );
    this.drawActionBlock(
      310, '⚡ Entraînement', CSS.magic,
      `Améliore l\'ATK d\'un héros de +${UPGRADE_STAT_BONUS}.`,
      'Choisir un héros', () => this.selectHeroForUpgrade(), COLORS.btn.magic,
    );

    makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 50, 'QUITTER LE CAMP', () => this.leave(), 240, 44, COLORS.btn.neutral);
  }

  private healAll(): void {
    if (this.leaving) return;
    this.leaving = true;
    const gs = window.gameState;
    const run = gs.runManager.state;
    run.heroes.filter(isHeroAlive).forEach((h, i) => {
      healHero(h, HEAL_AMOUNT);
      // +PV flottant au-dessus de chaque héros avant de quitter le camp
      floatText(this, 46 + i * 65, 110, `+${HEAL_AMOUNT}`, CSS.hp);
    });
    gs.runManager.completeRoom({});
    this.time.delayedCall(550, () => transitionTo(this, 'RunMap'));
  }

  private selectHeroForUpgrade(): void {
    const gs = window.gameState;
    const run = gs.runManager.state;
    const live = run.heroes.filter(isHeroAlive);
    if (live.length === 0) return;

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.scrim, 0.82).setInteractive();
    makePanel(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, 320, 260);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 110, 'Sélectionne un héros', { ...FONTS.body, align: 'center' }).setOrigin(0.5);

    live.forEach((h, i) => {
      const cx = GAME_WIDTH / 2 - 90 + i * 65;
      const cy = GAME_HEIGHT / 2 - 30;
      const bg = this.add.rectangle(cx, cy, 58, 60, COLORS.panel).setStrokeStyle(STROKE.base, COLORS.ink).setInteractive({ useHandCursor: true });
      this.add.image(cx, cy - 12, `hero_${h.definitionId}`).setDisplaySize(36, 36);
      this.add.text(cx, cy + 12, h.name.split(' ')[0], { ...FONTS.small, fontSize: '9px' }).setOrigin(0.5);
      bg.on('pointerdown', () => {
        if (this.leaving) return;
        this.leaving = true;
        h.atk += UPGRADE_STAT_BONUS;
        gs.runManager.completeRoom({});
        floatText(this, cx, cy - 30, `+${UPGRADE_STAT_BONUS} ATK`, CSS.magic);
        this.time.delayedCall(550, () => transitionTo(this, 'RunMap'));
      });
    });
  }

  private leave(): void {
    if (this.leaving) return;
    this.leaving = true;
    const gs = window.gameState;
    gs.runManager.completeRoom({});
    transitionTo(this, 'RunMap');
  }
}
