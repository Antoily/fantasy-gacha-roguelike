import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, FONTS } from '../config';
import { makeButton, makePanel, makeTitle, makeHpBar, fadeIn, transitionTo, staggerIn, pulse } from '../ui/UIManager';
import type { Room, RoomType } from '../systems/RunManager';

const ROOM_ICONS: Record<RoomType, string> = {
  combat: '⚔',
  event: '❓',
  shop: '🛒',
  rest: '🏕',
  boss: '💀',
};

const ROOM_LABELS: Record<RoomType, string> = {
  combat: 'Combat',
  event: 'Événement',
  shop: 'Marchand',
  rest: 'Repos',
  boss: 'Boss',
};

export class RunMapScene extends Phaser.Scene {
  constructor() { super('RunMap'); }

  create(): void {
    const gs = window.gameState;
    const run = gs.runManager.state;

    fadeIn(this);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background);
    makeTitle(this, GAME_WIDTH / 2, 35, `Zone ${run.zoneIndex + 1} — Salle ${run.currentRoomIndex + 1}/${run.rooms.length}`);
    this.add.text(GAME_WIDTH / 2, 62, `💰 ${run.gold} or`, { ...FONTS.gold, align: 'center' }).setOrigin(0.5);

    this.drawHeroPanel();
    this.drawRoomMap();
    this.drawRelics();
    this.drawCurrentRoomInfo();
  }

  private drawHeroPanel(): void {
    const run = window.gameState.runManager.state;
    makePanel(this, GAME_WIDTH / 2, 118, 340, 80);
    this.add.text(10, 84, 'Équipe :', { ...FONTS.small }).setOrigin(0, 0.5);

    run.heroes.forEach((h, i) => {
      const x = 20 + i * 68;
      const y = 100;
      const alive = h.currentHp > 0;
      this.add.rectangle(x + 26, y + 10, 52, 52, alive ? 0x1e2a3a : 0x1a1a1a, 0.9).setStrokeStyle(1, alive ? COLORS.accentLight : 0x444444);
      this.add.text(x + 26, y + 8, alive ? ROOM_ICONS.combat : '💀', { fontSize: '18px' }).setOrigin(0.5);
      this.add.text(x + 26, y + 28, h.name.split(' ')[0], { ...FONTS.small, fontSize: '9px' }).setOrigin(0.5);
      // HP bar
      const pct = h.currentHp / h.maxHp;
      makeHpBar(this, x + 26, y + 42, 50, 6, Math.max(0, pct));
    });
  }

  private drawRoomMap(): void {
    const run = window.gameState.runManager.state;
    const startY = 195;
    const spacing = 52;
    const cx = GAME_WIDTH / 2;

    this.add.text(cx, startY - 18, 'Salles', { ...FONTS.small, align: 'center' }).setOrigin(0.5);

    const rows: Phaser.GameObjects.Container[] = [];

    run.rooms.forEach((room, i) => {
      const y = startY + i * spacing;
      const isCurrent = i === run.currentRoomIndex;
      const isDone = room.completed;

      const color = isDone ? 0x333355 : (isCurrent ? COLORS.accent : COLORS.panel);
      const border = isCurrent ? COLORS.accentLight : (isDone ? 0x444466 : COLORS.panelBorder);

      // Chaque salle est un container : permet l'entrée en cascade et la pulsation
      const row = this.add.container(cx, y);
      const bg = this.add.rectangle(0, 0, 280, 44, color, 0.9).setStrokeStyle(isCurrent ? 2 : 1, border);
      row.add(bg);

      if (isCurrent) {
        const marker = this.add.text(-100, 0, '▶', { fontSize: '16px', color: '#b47cff' }).setOrigin(0.5);
        row.add(marker);
        // Le marqueur oscille pour guider l'œil vers la salle active
        this.tweens.add({ targets: marker, x: -96, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      }

      row.add(this.add.text(-85, 0, ROOM_ICONS[room.type], { fontSize: '18px' }).setOrigin(0.5));
      row.add(this.add.text(-55, 0, ROOM_LABELS[room.type], {
        ...FONTS.body,
        color: isDone ? '#555577' : '#ffffff',
      }).setOrigin(0, 0.5));

      if (room.type === 'combat' && room.formation) {
        row.add(this.add.text(60, 0, room.formation.name, { ...FONTS.small, color: '#9999bb' }).setOrigin(0, 0.5));
      }

      if (isDone) {
        row.add(this.add.text(110, 0, '✓', { fontSize: '16px', color: '#44cc44' }).setOrigin(0.5));
      }

      if (isCurrent) {
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerdown', () => this.enterRoom(run.rooms[i]));
      }

      rows.push(row);
    });

    staggerIn(this, rows, 14, 45);
  }

  private drawRelics(): void {
    const run = window.gameState.runManager.state;
    if (run.relics.length === 0) return;
    const cy = GAME_HEIGHT - 55;
    this.add.text(10, cy - 18, 'Reliques :', { ...FONTS.small }).setOrigin(0, 0.5);
    run.relics.slice(0, 6).forEach((r, i) => {
      this.add.rectangle(20 + i * 50, cy + 2, 44, 44, COLORS.panel).setStrokeStyle(1, COLORS.rarity[r.rarity]);
      this.add.text(20 + i * 50, cy + 2, r.name.slice(0, 4), { ...FONTS.small, fontSize: '9px' }).setOrigin(0.5);
    });
  }

  private drawCurrentRoomInfo(): void {
    const run = window.gameState.runManager.state;
    const room = run.rooms[run.currentRoomIndex];

    const btnY = GAME_HEIGHT - 100;
    let label = 'Entrer';
    if (room.type === 'boss') label = '⚔ Affronter le Boss';
    else if (room.type === 'combat') label = '⚔ Combattre';
    else if (room.type === 'event') label = '❓ Explorer';
    else if (room.type === 'shop') label = '🛒 Marchand';
    else if (room.type === 'rest') label = '🏕 Se reposer';

    const btn = makeButton(this, GAME_WIDTH / 2, btnY, label, () => this.enterRoom(room), 260, 48, room.isBossRoom ? 0x881122 : COLORS.accent);
    if (room.isBossRoom) pulse(this, btn, 1.04, 500);
  }

  private enterRoom(room: Room): void {
    const target = {
      combat: 'Formation',
      event: 'Event',
      shop: 'Shop',
      rest: 'Rest',
      boss: 'Formation',
    }[room.type];
    transitionTo(this, target);
  }
}
