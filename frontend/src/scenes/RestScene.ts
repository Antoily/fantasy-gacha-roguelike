import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, CSS, FONTS, STROKE } from '../config';
import { makeButton, makeTitle, makeHpBar, fadeIn, transitionTo, floatText, isTransitioning, staggerIn } from '../ui/UIManager';
import { isHeroAlive } from '../entities/Hero';
import { ROLE_ICONS, ROLE_LABELS } from '../data/heroes';
import { pickRandom } from '../utils/random';

const REVIVE_PCT = 0.5;

// Salle de repos : une seule décision, et elle porte sur un personnage —
// quel héros remettre d'aplomb. Les héros tombés reviennent à moitié soignés.
export class RestScene extends Phaser.Scene {
  private resolved = false;

  constructor() { super('Rest'); }

  create(): void {
    this.resolved = false;
    const run = window.gameState.runManager.state;

    fadeIn(this);
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg_rest').setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background, 0.35);

    makeTitle(this, GAME_WIDTH / 2, 40, '🏕 CAMPEMENT');
    this.add.text(GAME_WIDTH / 2, 70, 'Choisis un héros à remettre d\'aplomb.', {
      ...FONTS.small, align: 'center',
    }).setOrigin(0.5);

    this.drawHeroChoices();

    if (run.autoMode) {
      this.add.text(GAME_WIDTH - 10, 40, '🤖 AUTO', { ...FONTS.small, color: CSS.accent }).setOrigin(1, 0.5);
      this.time.delayedCall(900, () => this.restore(pickRandom(run.heroes.map(h => h.instanceId))));
    }
  }

  private drawHeroChoices(): void {
    const run = window.gameState.runManager.state;
    const cardH = 74;

    const cards = run.heroes.map((h, i) => {
      const y = 130 + i * (cardH + 12);
      const card = this.add.container(GAME_WIDTH / 2, y + cardH / 2);
      const fallen = !isHeroAlive(h);
      const full = h.currentHp >= h.maxHp;

      const bg = this.add.rectangle(0, 0, 328, cardH, COLORS.panel)
        .setStrokeStyle(STROKE.base, fallen ? COLORS.btn.danger : COLORS.ink);
      const icon = this.add.image(-130, 0, `hero_${h.definitionId}`).setDisplaySize(48, 48);
      const name = this.add.text(-96, -20, h.name, { ...FONTS.body }).setOrigin(0, 0.5);
      const role = this.add.text(-96, -2, `${ROLE_ICONS[h.role]} ${ROLE_LABELS[h.role]}`, {
        ...FONTS.small, color: CSS.textDim,
      }).setOrigin(0, 0.5);
      const bar = makeHpBar(this, -30, 20, 120, 8, Math.max(0, h.currentHp / h.maxHp));
      const hp = this.add.text(40, 20, `${Math.max(0, h.currentHp)}/${h.maxHp}`, {
        ...FONTS.small, fontSize: '10px', color: fallen ? CSS.danger : CSS.textDim,
      }).setOrigin(0, 0.5);

      card.add([bg, icon, name, role, bar, hp]);

      // Un héros déjà au maximum ne propose rien : le bouton ne s'affiche pas,
      // pour que le choix utile saute aux yeux.
      if (!full) {
        const label = fallen ? 'Relever' : 'Soigner';
        const btn = makeButton(this, 122, 0, label, () => this.restore(h.instanceId), 78, 34,
          fallen ? COLORS.btn.danger : COLORS.btn.success);
        card.add(btn);
      } else {
        card.add(this.add.text(122, 0, 'En forme', { ...FONTS.small, color: CSS.hp }).setOrigin(0.5));
      }

      return card;
    });

    staggerIn(this, cards, 16);

    makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 46, 'Lever le camp', () => this.leave(), 300, 44, COLORS.btn.neutral);
  }

  private restore(instanceId: string): void {
    if (this.resolved || isTransitioning(this)) return;
    const run = window.gameState.runManager.state;
    const hero = run.heroes.find(h => h.instanceId === instanceId);
    if (!hero) return;

    this.resolved = true;
    const wasFallen = !isHeroAlive(hero);
    hero.currentHp = wasFallen ? Math.max(1, Math.round(hero.maxHp * REVIVE_PCT)) : hero.maxHp;

    floatText(this, GAME_WIDTH / 2, GAME_HEIGHT / 2,
      wasFallen ? `${hero.name} se relève !` : `${hero.name} est au mieux`,
      wasFallen ? CSS.gold : CSS.hp, '16px');

    this.leave();
  }

  private leave(): void {
    if (isTransitioning(this)) return;
    this.resolved = true;
    window.gameState.runManager.completeRoom({});
    this.time.delayedCall(600, () => transitionTo(this, 'RunMap'));
  }
}
