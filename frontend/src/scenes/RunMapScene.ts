import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, CSS, FONTS, STROKE } from '../config';
import { makeButton, makePanel, makeTitle, makeHpBar, fadeIn, transitionTo, staggerIn, pulse, isTransitioning } from '../ui/UIManager';
import type { Room, RoomType } from '../systems/RunManager';
import { ROLE_ICONS } from '../data/heroes';

const ROOM_ICONS: Record<RoomType, string> = {
  combat: '⚔',
  recruit: '⚑',
  rest: '🏕',
  boss: '💀',
};

const ROOM_LABELS: Record<RoomType, string> = {
  combat: 'Combat',
  recruit: 'Renfort',
  rest: 'Campement',
  boss: 'Boss',
};

// Grille de mise en page : tous les blocs partagent la même marge latérale et la
// même largeur de contenu, pour un alignement cohérent sur tout l'écran.
const MARGIN = 16;
const CONTENT_W = GAME_WIDTH - MARGIN * 2; // 328
const CX = GAME_WIDTH / 2;

export class RunMapScene extends Phaser.Scene {
  constructor() { super('RunMap'); }

  create(): void {
    const gs = window.gameState;
    const run = gs.runManager.state;

    fadeIn(this);
    this.add.rectangle(CX, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background);
    makeTitle(this, CX, 30, `Zone ${run.zoneIndex + 1} — Salle ${run.currentRoomIndex + 1}/${run.rooms.length}`);
    this.add.text(CX, 54, `💰 ${run.gold} or`, { ...FONTS.gold, align: 'center' }).setOrigin(0.5);

    this.drawHeroPanel();
    this.drawRoomMap();
    this.drawAbandonButton();

    // Mode auto : on entre automatiquement dans la salle courante après un court délai
    if (run.autoMode) {
      this.add.text(GAME_WIDTH - MARGIN, 30, '🤖 AUTO', { ...FONTS.small, color: CSS.accent }).setOrigin(1, 0.5);
      this.time.delayedCall(700, () => this.enterRoom(run.rooms[run.currentRoomIndex]));
    }
  }

  private drawHeroPanel(): void {
    const run = window.gameState.runManager.state;
    // Label à 72 (bas ≈78), panneau juste en dessous avec ~10px d'écart : top 87.
    this.add.text(MARGIN, 72, 'Équipe :', { ...FONTS.small }).setOrigin(0, 0.5);
    makePanel(this, CX, 120, CONTENT_W, 66);

    run.heroes.forEach((h, i) => {
      // Cartes alignées à gauche dans le panneau (marge interne de 14px)
      const cx = MARGIN + 14 + 23 + i * 64;
      const alive = h.currentHp > 0;
      // Carte (92–138) centrée dans le panneau : icône en haut, nom en bas, barre de vie dessous.
      this.add.rectangle(cx, 115, 46, 46, alive ? COLORS.panel : COLORS.backgroundAlt, 1)
        .setStrokeStyle(STROKE.thin, alive ? COLORS.ink : COLORS.textFaint);
      this.add.text(cx, 109, alive ? ROLE_ICONS[h.role] : '💀', { fontSize: '18px' }).setOrigin(0.5);
      this.add.text(cx, 129, h.short, { ...FONTS.small, fontSize: '9px' }).setOrigin(0.5);
      const pct = h.currentHp / h.maxHp;
      makeHpBar(this, cx, 146, 44, 6, Math.max(0, pct));
    });
  }

  private drawRoomMap(): void {
    const run = window.gameState.runManager.state;
    // 8 salles entre le panneau équipe (151) et la bande reliques (≈538).
    // Largeur de contenu pleine ; espacement 44 → la dernière finit vers 521.
    // Label à 165 (bas ≈171), première salle à 202 (haut ≈181) : ~10px d'écart.
    const startY = 202;
    const spacing = 42;
    // Repères horizontaux internes au container de salle (centré sur CX)
    const half = CONTENT_W / 2;       // 164
    const leftEdge = -half + 12;      // bord gauche utile
    const rightEdge = half - 12;      // bord droit utile

    this.add.text(MARGIN, 165, 'Salles :', { ...FONTS.small }).setOrigin(0, 0.5);

    const rows: Phaser.GameObjects.Container[] = [];

    run.rooms.forEach((room, i) => {
      const y = startY + i * spacing;
      const isCurrent = i === run.currentRoomIndex;
      const isDone = room.completed;

      const color = isDone ? COLORS.backgroundAlt : (isCurrent ? COLORS.accent : COLORS.panel);
      // Le contour reste noir partout : c'est lui qui porte le style BD
      const border = COLORS.panelBorder;

      // Chaque salle est un container : permet l'entrée en cascade et la pulsation
      const row = this.add.container(CX, y);
      const bg = this.add.rectangle(0, 0, CONTENT_W, 42, color, 1).setStrokeStyle(isCurrent ? STROKE.thick : STROKE.thin, border);
      row.add(bg);

      if (isCurrent) {
        const marker = this.add.text(leftEdge + 4, 0, '▶', { fontSize: '16px', color: CSS.ink }).setOrigin(0.5);
        row.add(marker);
        // Le marqueur oscille pour guider l'œil vers la salle active
        this.tweens.add({ targets: marker, x: leftEdge + 8, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      }

      row.add(this.add.text(leftEdge + 28, 0, ROOM_ICONS[room.type], { fontSize: '18px' }).setOrigin(0.5));
      row.add(this.add.text(leftEdge + 52, 0, ROOM_LABELS[room.type], {
        ...FONTS.body,
        color: isDone ? CSS.textFaint : (isCurrent ? CSS.textLight : CSS.text),
      }).setOrigin(0, 0.5));

      // Élément de droite : ✓ si la salle est faite, sinon le nom de la formation
      // (aligné à droite pour ne jamais déborder du cadre).
      if (isDone) {
        row.add(this.add.text(rightEdge, 0, '✓', { fontSize: '16px', color: CSS.hp }).setOrigin(1, 0.5));
      } else if (room.type === 'combat' && room.formation) {
        row.add(this.add.text(rightEdge, 0, room.formation.name, { ...FONTS.small, color: CSS.textDim }).setOrigin(1, 0.5));
      }

      if (isCurrent) {
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerdown', () => this.enterRoom(run.rooms[i]));
        // La salle active est le CTA principal : pulsation pour signaler qu'on peut la toucher
        pulse(this, row, 1.025, 700);
      }

      rows.push(row);
    });

    staggerIn(this, rows, 14, 45);
  }

  private drawAbandonButton(): void {
    // Bouton pleine largeur de contenu, aligné sur la même grille que le reste
    makeButton(this, CX, 600, '✕ Abandonner la run', () => this.confirmAbandon(), CONTENT_W, 38, COLORS.btn.danger);
  }

  private confirmAbandon(): void {
    if (isTransitioning(this)) return;

    const cy = GAME_HEIGHT / 2;
    const overlay = this.add.container(0, 0).setDepth(1000);

    // Voile bloquant : empêche d'interagir avec la carte derrière la modale
    const blocker = this.add.rectangle(CX, cy, GAME_WIDTH, GAME_HEIGHT, COLORS.scrim, 0.82).setInteractive();
    const panel = makePanel(this, CX, cy, 300, 176);
    const title = this.add.text(CX, cy - 56, 'Abandonner la run en cours ?', {
      ...FONTS.body, align: 'center', wordWrap: { width: 260 },
    }).setOrigin(0.5);
    const sub = this.add.text(CX, cy - 24, 'La progression de ce run sera perdue.', {
      ...FONTS.small, align: 'center', wordWrap: { width: 260 },
    }).setOrigin(0.5);
    const yes = makeButton(this, CX, cy + 20, 'Oui, quitter', () => transitionTo(this, 'MainMenu'), 220, 40, COLORS.btn.danger);
    const no = makeButton(this, CX, cy + 68, 'Annuler', () => overlay.destroy(), 220, 38, COLORS.accent);

    overlay.add([blocker, panel, title, sub, yes, no]);
  }

  private enterRoom(room: Room): void {
    if (isTransitioning(this)) return;
    const target: Record<RoomType, string> = {
      combat: 'Combat',
      recruit: 'Recruit',
      rest: 'Rest',
      boss: 'Combat',
    };
    transitionTo(this, target[room.type]);
  }
}
