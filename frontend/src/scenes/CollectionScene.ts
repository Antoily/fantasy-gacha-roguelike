import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, CSS, FONTS, FONT_FAMILY, STROKE } from '../config';
import { makeButton, makePanel, makeTitle, rarityColor, rarityLabel, fadeIn, transitionTo } from '../ui/UIManager';
import { HERO_POOL, HeroDefinition, ROLE_ICONS, ROLE_LABELS } from '../data/heroes';

const ROW_LABELS: Record<string, string> = {
  front: 'Rang avant', back: 'Rang arrière',
};

export class CollectionScene extends Phaser.Scene {
  private modalContainer: Phaser.GameObjects.Container | null = null;
  // Vrai si le pointeur a glissé : sert à distinguer défilement et clic sur une carte
  private dragged = false;

  constructor() { super('Collection'); }

  create(): void {
    const gs = window.gameState;

    this.modalContainer = null;
    this.dragged = false;
    fadeIn(this);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background);
    makeTitle(this, GAME_WIDTH / 2, 32, '📚 COLLECTION');
    this.add.text(GAME_WIDTH / 2, 58, `${gs.unlockedHeroIds.length}/${HERO_POOL.length} héros débloqués`, {
      ...FONTS.body, align: 'center',
    }).setOrigin(0.5);

    const perRow = 3;
    const cardW = 100, cardH = 140;
    const padX = (GAME_WIDTH - perRow * (cardW + 8)) / 2 + cardW / 2;

    // Toutes les cartes vivent dans un conteneur déplaçable verticalement.
    const grid = this.add.container(0, 0);

    HERO_POOL.forEach((hero, i) => {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const x = padX + col * (cardW + 8);
      const y = 90 + row * (cardH + 8);
      const unlocked = gs.unlockedHeroIds.includes(hero.id);
      const color = rarityColor(hero.rarity);

      grid.add(makePanel(this, x, y + cardH / 2, cardW, cardH));
      const border = this.add.rectangle(x, y + cardH / 2, cardW - 2, cardH - 2, COLORS.panel)
        .setStrokeStyle(STROKE.base, unlocked ? color : COLORS.textFaint);
      grid.add(border);

      if (unlocked) {
        // Contenu réparti dans les 140px de la carte. La description de capacité
        // n'y tient pas (elle débordait sur la carte suivante) : elle vit dans la modale.
        grid.add(this.add.image(x, y + 34, `hero_${hero.id}`).setDisplaySize(56, 56));
        grid.add(this.add.text(x, y + 76, hero.name, { ...FONTS.small, align: 'center', wordWrap: { width: cardW - 10 } }).setOrigin(0.5));
        grid.add(this.add.text(x, y + 104, rarityLabel(hero.rarity), {
          fontSize: '9px', color: `#${color.toString(16).padStart(6, '0')}`, fontFamily: FONT_FAMILY, fontStyle: 'bold', align: 'center',
        }).setOrigin(0.5));
        grid.add(this.add.text(x, y + 122, `${ROLE_ICONS[hero.role]} ${hero.ability.name}`, {
          fontSize: '9px', color: CSS.textDim, fontFamily: FONT_FAMILY, fontStyle: 'bold',
          align: 'center', wordWrap: { width: cardW - 10 },
        }).setOrigin(0.5));

        border.setInteractive({ useHandCursor: true })
          .on('pointerover', () => border.setStrokeStyle(STROKE.thick, COLORS.ink))
          .on('pointerout', () => border.setStrokeStyle(STROKE.base, color))
          .on('pointerup', () => { if (!this.dragged) this.openModal(hero); });
      } else {
        grid.add(this.add.text(x, y + 55, '?', { fontFamily: FONT_FAMILY, fontSize: '36px', fontStyle: 'bold', color: CSS.textFaint }).setOrigin(0.5));
        grid.add(this.add.text(x, y + 90, '???', { ...FONTS.small, color: CSS.textFaint }).setOrigin(0.5));
        grid.add(this.add.text(x, y + 110, rarityLabel(hero.rarity), {
          fontSize: '9px', color: `#${color.toString(16).padStart(6, '0')}`, fontFamily: FONT_FAMILY, fontStyle: 'bold',
        }).setOrigin(0.5));
      }
    });

    const rows = Math.ceil(HERO_POOL.length / perRow);
    this.setupScroll(grid, 90 + rows * (cardH + 8));

    makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 38, '← RETOUR', () => transitionTo(this, 'MainMenu'), 200, 40, COLORS.btn.neutral);
  }

  // Défilement vertical : glisser au doigt ou molette, borné au contenu.
  // Un masque évite que les cartes débordent sur l'en-tête et sur le bouton retour.
  private setupScroll(grid: Phaser.GameObjects.Container, contentBottom: number): void {
    const viewTop = 78;
    const viewBottom = GAME_HEIGHT - 62;
    const maxScroll = Math.max(0, contentBottom - viewBottom);

    const maskShape = this.make.graphics({});
    maskShape.fillRect(0, viewTop, GAME_WIDTH, viewBottom - viewTop);
    grid.setMask(maskShape.createGeometryMask());

    if (maxScroll === 0) return;

    const apply = (y: number) => { grid.y = Phaser.Math.Clamp(y, -maxScroll, 0); };

    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => apply(grid.y - dy * 0.6));

    let startPointerY = 0;
    let startGridY = 0;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      startPointerY = p.y;
      startGridY = grid.y;
      this.dragged = false;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown) return;
      const delta = p.y - startPointerY;
      // Seuil : en deçà, c'est un appui sur une carte, pas un défilement
      if (Math.abs(delta) > 6) this.dragged = true;
      if (this.dragged) apply(startGridY + delta);
    });

    // Indice de défilement, visible seulement s'il y a de quoi défiler
    this.add.text(GAME_WIDTH - 8, viewBottom - 2, '↕', {
      ...FONTS.small, color: CSS.textFaint, fontSize: '16px',
    }).setOrigin(1, 1);
  }

  private openModal(hero: HeroDefinition): void {
    this.closeModal();

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const panelW = 280, panelH = 400;
    const color = rarityColor(hero.rarity);
    const colorHex = `#${color.toString(16).padStart(6, '0')}`;

    const overlay = this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, COLORS.scrim, 0.82)
      .setInteractive()
      .on('pointerdown', () => this.closeModal());

    const panel = this.add.rectangle(cx, cy, panelW, panelH, COLORS.panel)
      .setStrokeStyle(STROKE.thick, color);

    const portrait = this.add.image(cx, cy - 130, `hero_${hero.id}`)
      .setDisplaySize(120, 120);

    const nameText = this.add.text(cx, cy - 62, hero.name, {
      fontFamily: FONT_FAMILY, fontSize: '16px', fontStyle: 'bold', color: CSS.text, align: 'center',
      wordWrap: { width: panelW - 20 },
    }).setOrigin(0.5);

    const rarityText = this.add.text(cx, cy - 44, rarityLabel(hero.rarity), {
      fontFamily: FONT_FAMILY, fontSize: '11px', fontStyle: 'bold', color: colorHex,
    }).setOrigin(0.5);

    const classRow = this.add.text(cx, cy - 28, `${ROLE_ICONS[hero.role]} ${ROLE_LABELS[hero.role]}  ·  ${ROW_LABELS[hero.row]}`, {
      fontFamily: FONT_FAMILY, fontSize: '10px', fontStyle: 'bold', color: CSS.textDim,
    }).setOrigin(0.5);

    // Séparateur
    const sep1 = this.add.rectangle(cx, cy - 16, panelW - 40, 2, COLORS.ink);

    // Stats
    const statsY = cy - 4;
    const statLabels = [`❤ ${hero.hp}`, `⚔ ${hero.atk}`, `⚡ ${hero.spd}`];
    const statColors = [CSS.hpLow, CSS.accent, CSS.rarity.rare];
    const statSpacing = (panelW - 40) / 3;
    const statsTexts = statLabels.map((label, idx) =>
      this.add.text(cx - (panelW - 40) / 2 + statSpacing * idx + statSpacing / 2, statsY, label, {
        fontFamily: FONT_FAMILY, fontSize: '10px', fontStyle: 'bold', color: statColors[idx],
      }).setOrigin(0.5)
    );

    const sep2 = this.add.rectangle(cx, cy + 14, panelW - 40, 2, COLORS.ink);

    // Capacité
    const abilityTitle = this.add.text(cx, cy + 26, hero.ability.name, {
      fontFamily: FONT_FAMILY, fontSize: '11px', fontStyle: 'bold', color: CSS.magic, align: 'center',
    }).setOrigin(0.5);

    const abilityDesc = this.add.text(cx, cy + 52, hero.ability.text, {
      fontFamily: FONT_FAMILY, fontSize: '9px', color: CSS.textDim, align: 'center',
      wordWrap: { width: panelW - 30 },
    }).setOrigin(0.5);

    const sep3 = this.add.rectangle(cx, cy + 88, panelW - 40, 2, COLORS.ink);

    // Lore
    const loreText = this.add.text(cx, cy + 108, `"${hero.lore}"`, {
      fontFamily: FONT_FAMILY, fontSize: '8px', color: CSS.textDim, align: 'center',
      wordWrap: { width: panelW - 30 }, fontStyle: 'italic',
    }).setOrigin(0.5);

    // Bouton fermer
    const closeBtn = this.add.text(cx + panelW / 2 - 14, cy - panelH / 2 + 14, '✕', {
      fontFamily: FONT_FAMILY, fontSize: '14px', fontStyle: 'bold', color: CSS.textDim,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerover', function(this: Phaser.GameObjects.Text) { this.setColor(CSS.ink); })
      .on('pointerout', function(this: Phaser.GameObjects.Text) { this.setColor(CSS.textDim); })
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
