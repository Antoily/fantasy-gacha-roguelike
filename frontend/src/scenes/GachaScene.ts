import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, CSS, FONTS, FONT_FAMILY, STROKE } from '../config';
import { makeButton, makePanel, makeTitle, rarityColor, rarityLabel, showToast, fadeIn, transitionTo, pulse } from '../ui/UIManager';
import type { GachaPullResult } from '../systems/GachaSystem';
import type { Rarity } from '../data/heroes';
import { saveProgress } from './MainMenuScene';

// Hiérarchie des raretés : sert à choisir l'animation d'une salve (la meilleure gagne)
const RARITY_RANK: Record<Rarity, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };

// Intensité de l'annonce par rareté. `hold` est la durée avant la révélation :
// une légendaire se fait attendre, une commune ne fait pas perdre de temps.
const RARITY_FX: Record<Rarity, { rays: number; sparks: number; shake: number; hold: number }> = {
  common:    { rays: 0,  sparks: 6,  shake: 0,   hold: 700 },
  rare:      { rays: 0,  sparks: 12, shake: 0,   hold: 950 },
  epic:      { rays: 8,  sparks: 20, shake: 120, hold: 1300 },
  legendary: { rays: 14, sparks: 32, shake: 260, hold: 1750 },
};

export class GachaScene extends Phaser.Scene {
  private results: GachaPullResult[] = [];

  constructor() { super('Gacha'); }

  create(): void {
    const gs = window.gameState;

    fadeIn(this);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background);
    for (let i = 0; i < 40; i++) {
      const star = this.add.star(
        Phaser.Math.Between(0, GAME_WIDTH),
        Phaser.Math.Between(0, GAME_HEIGHT),
        5, 2, Phaser.Math.Between(4, 8),
        COLORS.accent, Phaser.Math.FloatBetween(0.1, 0.4),
      );
      // Rotation lente d'un tiers des étoiles pour une ambiance mystique
      if (i % 3 === 0) {
        this.tweens.add({ targets: star, angle: 360, duration: Phaser.Math.Between(8000, 16000), repeat: -1 });
      }
    }

    makeTitle(this, GAME_WIDTH / 2, 40, '✨ INVOCATION');
    this.add.text(GAME_WIDTH / 2, 70, `Pity : ${gs.gacha.pullsUntilPity} tirages avant légendaire garanti`, {
      ...FONTS.small, align: 'center',
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 90, `Or disponible : ${gs.totalGold} 💰`, { ...FONTS.gold, align: 'center' }).setOrigin(0.5);

    this.drawInfoPanel();
    this.drawPullButtons();
    this.drawBackButton();
  }

  private drawInfoPanel(): void {
    makePanel(this, GAME_WIDTH / 2, 180, 330, 120);
    this.add.text(GAME_WIDTH / 2, 136, 'Taux de tirage', { ...FONTS.body, color: CSS.textDim, align: 'center' }).setOrigin(0.5);
    const rates = [
      { label: 'Légendaire', rate: '3%', color: CSS.rarity.legendary },
      { label: 'Épique', rate: '12%', color: CSS.rarity.epic },
      { label: 'Rare', rate: '25%', color: CSS.rarity.rare },
      { label: 'Commun', rate: '60%', color: CSS.rarity.common },
    ];
    rates.forEach((r, i) => {
      const x = 34 + (i % 2) * 160;
      const y = 158 + Math.floor(i / 2) * 28;
      this.add.text(x, y, `${r.label} : ${r.rate}`, { ...FONTS.small, color: r.color });
    });
    this.add.text(GAME_WIDTH / 2, 228, '🛡 Un héros à chaque tirage', { ...FONTS.small, align: 'center' }).setOrigin(0.5);
  }

  private drawPullButtons(): void {
    const gs = window.gameState;
    const cost1 = gs.gacha.costFor(1);
    const cost10 = gs.gacha.costFor(10);

    makeButton(this, GAME_WIDTH / 2, 300, `Tirer ×1 — ${cost1} 💰`, () => this.pull(1), 280, 50,
      gs.totalGold >= cost1 ? COLORS.accent : COLORS.btn.disabled);
    makeButton(this, GAME_WIDTH / 2, 368, `Tirer ×10 — ${cost10} 💰`, () => this.pull(10), 280, 50,
      gs.totalGold >= cost10 ? COLORS.btn.magic : COLORS.btn.disabled);
  }

  private pull(count: number): void {
    const gs = window.gameState;
    const cost = gs.gacha.costFor(count);
    if (gs.totalGold < cost) { showToast(this, 'Pas assez d\'or !'); return; }

    gs.totalGold -= cost;
    this.results = gs.gacha.pullMulti(count, gs.unlockedHeroIds);

    // Application : un héros inédit rejoint la collection, un doublon rend de l'or
    for (const r of this.results) {
      if (!r.isDuplicate) {
        gs.unlockedHeroIds.push(r.heroDefinition.id);
      } else {
        gs.totalGold += r.goldRefund;
      }
    }

    saveProgress();
    this.playRevealAnimation();
  }

  // L'animation annonce la rareté AVANT de montrer les cartes : c'est le moment
  // de tension du gacha. Sur une salve, c'est la meilleure rareté qui la dicte.
  private playRevealAnimation(): void {
    const best = this.results.reduce((max, r) =>
      RARITY_RANK[r.rarity] > RARITY_RANK[max.rarity] ? r : max, this.results[0]);

    this.playRarityIntro(best.rarity, () => {
      this.showResults();
      const fadeOut = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.panel, 0.9).setDepth(100);
      this.tweens.add({ targets: fadeOut, fillAlpha: 0, duration: 350, onComplete: () => fadeOut.destroy() });
    });
  }

  // Plus la rareté est haute, plus l'annonce est longue et spectaculaire :
  // anneaux, rayons, étincelles et secousse s'ajoutent par paliers.
  private playRarityIntro(rarity: Rarity, onDone: () => void): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const color = rarityColor(rarity);
    const rank = RARITY_RANK[rarity];
    const cfg = RARITY_FX[rarity];

    const layer = this.add.container(0, 0).setDepth(100);
    const veil = this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, COLORS.scrim, 0).setDepth(99);
    this.tweens.add({ targets: veil, fillAlpha: 0.94, duration: 180 });

    // Rayons pour épique et légendaire
    if (rank >= 2) {
      for (let i = 0; i < cfg.rays; i++) {
        const angle = (i / cfg.rays) * Math.PI * 2;
        const ray = this.add.rectangle(cx, cy, 4, 260, color, 0.75)
          .setOrigin(0.5, 0)
          .setRotation(angle)
          .setScale(1, 0);
        layer.add(ray);
        this.tweens.add({ targets: ray, scaleY: 1, duration: 420, delay: 120 + i * 20, ease: 'Quad.Out' });
        this.tweens.add({ targets: ray, alpha: 0, duration: 380, delay: 620 + i * 20 });
      }
    }

    // Anneaux concentriques : un par palier de rareté
    for (let i = 0; i <= rank; i++) {
      const ring = this.add.circle(cx, cy, 30, undefined, 0)
        .setStrokeStyle(STROKE.thick, color, 1);
      layer.add(ring);
      this.tweens.add({
        targets: ring,
        scale: 4 + i,
        alpha: 0,
        duration: 620,
        delay: i * 130,
        ease: 'Quad.Out',
      });
    }

    // Étincelles projetées
    for (let i = 0; i < cfg.sparks; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 60 + Math.random() * 110;
      const spark = this.add.image(cx, cy, 'spark')
        .setTint(color)
        .setScale(Phaser.Math.FloatBetween(0.5, 1.2));
      layer.add(spark);
      this.tweens.add({
        targets: spark,
        x: cx + Math.cos(a) * d,
        y: cy + Math.sin(a) * d,
        alpha: 0,
        duration: 700,
        delay: 200 + Math.random() * 200,
        ease: 'Quad.Out',
      });
    }

    // Nom de la rareté, cerné de noir comme le reste du thème
    const label = this.add.text(cx, cy, rarityLabel(rarity).toUpperCase(), {
      fontFamily: FONT_FAMILY, fontSize: rank >= 2 ? '30px' : '22px', fontStyle: 'bold',
      color: `#${color.toString(16).padStart(6, '0')}`,
      stroke: CSS.ink, strokeThickness: 6, align: 'center',
    }).setOrigin(0.5).setScale(0);
    layer.add(label);
    this.tweens.add({ targets: label, scale: 1, duration: 380, delay: 150, ease: 'Back.Out' });

    if (cfg.shake > 0) this.time.delayedCall(200, () => this.cameras.main.shake(cfg.shake, 0.006));

    this.time.delayedCall(cfg.hold, () => {
      layer.destroy();
      veil.destroy();
      onDone();
    });
  }

  private showResults(): void {
    // Clear current scene content
    this.tweens.killAll();
    this.children.list.slice().forEach(c => c.destroy());

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background);
    makeTitle(this, GAME_WIDTH / 2, 30, '✨ RÉSULTATS');

    const perRow = 5;
    const cardW = 62, cardH = 88;
    const padX = (GAME_WIDTH - perRow * (cardW + 6)) / 2 + cardW / 2;

    this.results.forEach((r, i) => {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const x = padX + col * (cardW + 6);
      const y = 100 + row * (cardH + 10);

      const rarity = r.rarity;
      const color = rarityColor(rarity);

      const parts: Phaser.GameObjects.GameObject[] = [];
      parts.push(this.add.rectangle(0, 0, cardW, cardH, COLORS.panel).setStrokeStyle(STROKE.base, color));

      const hero = r.heroDefinition;
      parts.push(this.add.image(0, -14, `hero_${hero.id}`).setDisplaySize(44, 44));
      parts.push(this.add.text(0, 22, hero.short, { ...FONTS.small, fontSize: '9px', align: 'center' }).setOrigin(0.5));
      if (r.isDuplicate) {
        parts.push(this.add.text(0, 36, `+${r.goldRefund} 💰`, { ...FONTS.small, fontSize: '8px', color: CSS.gold }).setOrigin(0.5));
      }


      if (r.isPity) {
        const pity = this.add.text(0, -40, '★ PITY', { fontSize: '10px', color: CSS.rarity.legendary, fontFamily: FONT_FAMILY, fontStyle: 'bold' }).setOrigin(0.5);
        parts.push(pity);
        pulse(this, pity, 1.2, 400);
      }

      // Cartes révélées une à une, les hautes raretés claquent davantage
      const card = this.add.container(x, y, parts).setScale(0);
      const isHighRarity = rarity === 'epic' || rarity === 'legendary';
      this.tweens.add({
        targets: card,
        scale: 1,
        delay: i * 90,
        duration: isHighRarity ? 380 : 250,
        ease: 'Back.Out',
        onComplete: () => {
          if (!isHighRarity) return;
          // Halo de rareté qui s'étend derrière la carte
          const halo = this.add.rectangle(x, y, cardW, cardH, color, 0.5);
          this.tweens.add({
            targets: halo,
            scaleX: 1.5, scaleY: 1.5,
            fillAlpha: 0,
            duration: 450,
            onComplete: () => halo.destroy(),
          });
          if (rarity === 'legendary') this.cameras.main.shake(120, 0.004);
        },
      });
    });

    makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 50, 'RETOUR', () => transitionTo(this, 'MainMenu'), 200, 44);
  }

  private drawBackButton(): void {
    makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 50, '← RETOUR', () => transitionTo(this, 'MainMenu'), 200, 44, COLORS.btn.neutral);
  }
}
