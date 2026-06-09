import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, FONTS } from '../config';
import { makeButton, makePanel, makeTitle, rarityColor, rarityLabel } from '../ui/UIManager';
import { HERO_POOL, HeroDefinition } from '../data/heroes';

const CLASS_LABELS: Record<string, string> = {
  warrior: 'Guerrier', ranger: 'Archer', mage: 'Mage', priest: 'Prêtre', assassin: 'Assassin',
};
const ROW_LABELS: Record<string, string> = {
  front: 'Avant', mid: 'Milieu', back: 'Arrière', any: 'Libre',
};

export class CollectionScene extends Phaser.Scene {
  private modalContainer: Phaser.GameObjects.Container | null = null;

  constructor() { super('Collection'); }

  create(): void {
    const gs = window.gameState;

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background);
    makeTitle(this, GAME_WIDTH / 2, 32, '📚 COLLECTION');
    this.add.text(GAME_WIDTH / 2, 58, `${gs.unlockedHeroIds.length}/${HERO_POOL.length} héros débloqués`, {
      ...FONTS.body, align: 'center',
    }).setOrigin(0.5);

    const perRow = 3;
    const cardW = 100, cardH = 140;
    const padX = (GAME_WIDTH - perRow * (cardW + 8)) / 2 + cardW / 2;

    HERO_POOL.forEach((hero, i) => {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const x = padX + col * (cardW + 8);
      const y = 90 + row * (cardH + 8);
      const unlocked = gs.unlockedHeroIds.includes(hero.id);
      const color = rarityColor(hero.rarity);

      makePanel(this, x, y + cardH / 2, cardW, cardH);
      const border = this.add.rectangle(x, y + cardH / 2, cardW - 2, cardH - 2, COLORS.panel)
        .setStrokeStyle(2, unlocked ? color : 0x333344);

      if (unlocked) {
        this.add.image(x, y + 38, `hero_${hero.id}`).setDisplaySize(64, 64);
        this.add.text(x, y + 76, hero.name, { ...FONTS.small, align: 'center', wordWrap: { width: cardW - 10 } }).setOrigin(0.5);
        this.add.text(x, y + 96, rarityLabel(hero.rarity), {
          fontSize: '9px', color: `#${color.toString(16).padStart(6, '0')}`, fontFamily: 'Arial', align: 'center',
        }).setOrigin(0.5);
        this.add.text(x, y + 112, hero.ability.name, { fontSize: '9px', color: '#9999bb', fontFamily: 'Arial', align: 'center' }).setOrigin(0.5);
        this.add.text(x, y + 128, hero.ability.description, {
          fontSize: '7px', color: '#666677', fontFamily: 'Arial', align: 'center', wordWrap: { width: cardW - 10 },
        }).setOrigin(0.5);

        border.setInteractive({ useHandCursor: true })
          .on('pointerover', () => border.setStrokeStyle(3, 0xffffff))
          .on('pointerout', () => border.setStrokeStyle(2, color))
          .on('pointerdown', () => this.openModal(hero));
      } else {
        this.add.text(x, y + 55, '?', { fontFamily: 'Georgia', fontSize: '36px', color: '#333355' }).setOrigin(0.5);
        this.add.text(x, y + 90, '???', { ...FONTS.small, color: '#333355' }).setOrigin(0.5);
        this.add.text(x, y + 110, rarityLabel(hero.rarity), {
          fontSize: '9px', color: `#${color.toString(16).padStart(6, '0')}`, fontFamily: 'Arial',
        }).setOrigin(0.5);
      }
    });

    makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 38, '← RETOUR', () => this.scene.start('MainMenu'), 200, 40, 0x444455);
  }

  private openModal(hero: HeroDefinition): void {
    this.closeModal();

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const panelW = 280, panelH = 400;
    const color = rarityColor(hero.rarity);
    const colorHex = `#${color.toString(16).padStart(6, '0')}`;

    const overlay = this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7)
      .setInteractive()
      .on('pointerdown', () => this.closeModal());

    const panel = this.add.rectangle(cx, cy, panelW, panelH, COLORS.panel)
      .setStrokeStyle(2, color);

    const portrait = this.add.image(cx, cy - 130, `hero_${hero.id}`)
      .setDisplaySize(120, 120);

    const nameText = this.add.text(cx, cy - 62, hero.name, {
      fontFamily: 'Georgia', fontSize: '16px', color: '#ffffff', align: 'center',
      wordWrap: { width: panelW - 20 },
    }).setOrigin(0.5);

    const rarityText = this.add.text(cx, cy - 44, rarityLabel(hero.rarity), {
      fontFamily: 'Arial', fontSize: '11px', color: colorHex,
    }).setOrigin(0.5);

    const classRow = this.add.text(cx, cy - 28, `${CLASS_LABELS[hero.class]}  ·  Rang : ${ROW_LABELS[hero.preferredRow]}`, {
      fontFamily: 'Arial', fontSize: '10px', color: '#9999bb',
    }).setOrigin(0.5);

    // Séparateur
    const sep1 = this.add.rectangle(cx, cy - 16, panelW - 40, 1, 0x333355);

    // Stats
    const statsY = cy - 4;
    const statLabels = [`❤ ${hero.baseHp}`, `⚔ ${hero.baseAtk}`, `🛡 ${hero.baseDef}`, `⚡ ${hero.baseSpd}`];
    const statColors = ['#dd4444', '#ddaa44', '#4488dd', '#44dd88'];
    const statSpacing = (panelW - 40) / 4;
    const statsTexts = statLabels.map((label, idx) =>
      this.add.text(cx - (panelW - 40) / 2 + statSpacing * idx + statSpacing / 2, statsY, label, {
        fontFamily: 'Arial', fontSize: '10px', color: statColors[idx],
      }).setOrigin(0.5)
    );

    const sep2 = this.add.rectangle(cx, cy + 14, panelW - 40, 1, 0x333355);

    // Capacité
    const abilityTypeLabel = hero.ability.type === 'active' ? '[Actif]' : '[Passif]';
    const abilityTitle = this.add.text(cx, cy + 26, `${hero.ability.name}  ${abilityTypeLabel}`, {
      fontFamily: 'Arial', fontSize: '11px', color: '#ccaaff', align: 'center',
    }).setOrigin(0.5);

    const abilityDesc = this.add.text(cx, cy + 52, hero.ability.description, {
      fontFamily: 'Arial', fontSize: '9px', color: '#aaaacc', align: 'center',
      wordWrap: { width: panelW - 30 },
    }).setOrigin(0.5);

    const sep3 = this.add.rectangle(cx, cy + 88, panelW - 40, 1, 0x333355);

    // Lore
    const loreText = this.add.text(cx, cy + 108, `"${hero.lore}"`, {
      fontFamily: 'Georgia', fontSize: '8px', color: '#666677', align: 'center',
      wordWrap: { width: panelW - 30 }, fontStyle: 'italic',
    }).setOrigin(0.5);

    // Bouton fermer
    const closeBtn = this.add.text(cx + panelW / 2 - 14, cy - panelH / 2 + 14, '✕', {
      fontFamily: 'Arial', fontSize: '14px', color: '#666688',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerover', function(this: Phaser.GameObjects.Text) { this.setColor('#ffffff'); })
      .on('pointerout', function(this: Phaser.GameObjects.Text) { this.setColor('#666688'); })
      .on('pointerdown', () => this.closeModal());

    this.modalContainer = this.add.container(0, 0, [
      overlay, panel, portrait, nameText, rarityText, classRow,
      sep1, ...statsTexts, sep2, abilityTitle, abilityDesc, sep3, loreText, closeBtn,
    ]);

    // Animation d'ouverture
    this.modalContainer.setAlpha(0);
    panel.setScale(0.85);
    this.tweens.add({
      targets: [this.modalContainer, panel],
      alpha: 1,
      scale: 1,
      duration: 150,
      ease: 'Back.Out',
    });
  }

  private closeModal(): void {
    if (!this.modalContainer) return;
    const container = this.modalContainer;
    this.modalContainer = null;
    this.tweens.add({
      targets: container,
      alpha: 0,
      duration: 100,
      onComplete: () => container.destroy(),
    });
  }
}
