import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, CSS, FONTS, FONT_FAMILY, STROKE } from '../config';
import { makeButton, makePanel, makeHpBar, setHpBar, floatText, fadeIn, transitionTo, isTransitioning } from '../ui/UIManager';
import { resolveCombat, type CombatLogEntry, type CombatEffect } from '../systems/CombatResolver';
import { createEnemyInstance, type EnemyInstance } from '../entities/Enemy';
import type { HeroInstance } from '../entities/Hero';
import { getEnemyById } from '../data/enemies';
import { saveProgress } from './MainMenuScene';

const CELL_W = 52;
const CELL_H = 56;
const CELL_GAP = 4;
const GRID_W = 3 * CELL_W + 2 * CELL_GAP;
const GRID_LEFT = (GAME_WIDTH - GRID_W) / 2 + CELL_W / 2;
const ENEMY_TOP = 76;   // centre de la rangée arrière ennemie
const HERO_TOP = 262;   // centre de la rangée avant héros
const STEP_DELAY = 450; // rythme de base entre deux actions (ms)

// Vue d'une unité sur la grille — le combat est résolu d'avance,
// la scène ne fait que rejouer le journal en animations.
interface UnitView {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  frame: Phaser.GameObjects.Rectangle;
  bar: Phaser.GameObjects.Container;
  maxHp: number;
  hp: number;
  side: 'hero' | 'enemy';
}

export class CombatScene extends Phaser.Scene {
  private log: CombatLogEntry[] = [];
  private logIndex = 0;
  private logLines: string[] = [];
  private logText!: Phaser.GameObjects.Text;
  private units = new Map<string, UnitView>();
  private speed = 1;
  private finished = false;
  private victory = false;
  private goldReward = 0;
  private heroesRef: HeroInstance[] = [];
  private enemiesRef: EnemyInstance[] = [];
  private skipBtn: Phaser.GameObjects.Container | null = null;
  private speedBtn: Phaser.GameObjects.Text | null = null;

  constructor() { super('Combat'); }

  create(): void {
    // La scène est réutilisée entre les combats : remise à zéro de l'état de playback
    this.log = [];
    this.logIndex = 0;
    this.logLines = [];
    this.units.clear();
    this.finished = false;
    this.skipBtn = null;
    this.speedBtn = null;

    const gs = window.gameState;
    const run = gs.runManager.state;
    const room = run.rooms[run.currentRoomIndex];

    // La vitesse est une préférence du joueur : on la reprend telle quelle,
    // sans la réinitialiser ni la forcer en mode auto.
    this.speed = gs.combatSpeed;

    if (!room.formation) {
      this.scene.start('RunMap');
      return;
    }

    fadeIn(this);
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, `bg_${room.isBossRoom ? 'boss' : 'combat'}`).setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background, 0.25);

    // Construit les ennemis depuis la formation
    const enemies = room.formation.grid.flatMap((rowArr, r) =>
      rowArr.map((eid, c) => {
        if (!eid) return null;
        const def = getEnemyById(eid);
        if (!def) return null;
        return createEnemyInstance(def, r, c);
      }).filter((e): e is NonNullable<typeof e> => e !== null)
    );

    // PV de départ des héros — resolveCombat mute les instances,
    // le playback doit partir de l'état d'avant combat
    const heroStartHp = new Map(run.heroes.map(h => [h.instanceId, h.currentHp]));

    const result = resolveCombat(run.heroes, enemies);

    this.log = result.log;
    this.victory = result.victory;
    // Le bonus d'or du mode auto s'applique ici, le résolveur ne le connaît pas
    this.goldReward = Math.round(result.goldReward * gs.runManager.getGoldMultiplier());
    this.heroesRef = run.heroes;
    this.enemiesRef = enemies;

    this.drawHeader(room.formation.name, room.isBossRoom);
    this.drawUnits(heroStartHp);
    this.drawLogPanel();
    this.drawControls();

    this.time.delayedCall(500, () => this.playNext());
  }

  private drawHeader(formationName: string, isBoss: boolean): void {
    this.add.text(GAME_WIDTH / 2, 24, isBoss ? `⚔ BOSS — ${formationName}` : `⚔ ${formationName}`, {
      fontFamily: FONT_FAMILY, fontSize: '18px', fontStyle: 'bold', stroke: CSS.ink, strokeThickness: 4,
      color: isBoss ? CSS.danger : CSS.textLight, align: 'center',
    }).setOrigin(0.5);
  }

  private drawUnits(heroStartHp: Map<string, number>): void {
    // Grille ennemie en haut : rangée arrière (2) en haut, front (0) en bas, face aux héros
    this.enemiesRef.forEach(e => {
      const x = GRID_LEFT + e.gridCol * (CELL_W + CELL_GAP);
      const y = ENEMY_TOP + (2 - e.gridRow) * (CELL_H + CELL_GAP);
      this.addUnit(e.instanceId, e.name, `enemy_${e.definitionId}`, x, y, e.maxHp, e.maxHp, 'enemy', e.isBoss);
    });

    // Séparateur central
    this.add.text(GAME_WIDTH / 2, (ENEMY_TOP + 2 * (CELL_H + CELL_GAP) + HERO_TOP) / 2, '— VS —', {
      ...FONTS.small, color: CSS.textDim,
    }).setOrigin(0.5);

    // Grille héros en bas : front (0) en haut
    this.heroesRef.forEach(h => {
      if (h.gridRow === null || h.gridCol === null) return;
      const startHp = heroStartHp.get(h.instanceId) ?? h.maxHp;
      if (startHp <= 0) return;
      const x = GRID_LEFT + h.gridCol * (CELL_W + CELL_GAP);
      const y = HERO_TOP + h.gridRow * (CELL_H + CELL_GAP);
      this.addUnit(h.instanceId, h.short, `hero_${h.definitionId}`, x, y, startHp, h.maxHp, 'hero', false);
    });
  }

  private addUnit(
    id: string, name: string, texture: string,
    x: number, y: number,
    hp: number, maxHp: number,
    side: 'hero' | 'enemy', isBoss: boolean,
  ): void {
    const frame = this.add.rectangle(0, 0, CELL_W, CELL_H, side === 'hero' ? COLORS.side.hero : COLORS.side.enemy, 1)
      .setStrokeStyle(STROKE.thin, COLORS.ink);
    const sprite = this.add.image(0, -8, texture).setDisplaySize(isBoss ? 40 : 32, isBoss ? 40 : 32);
    const label = this.add.text(0, 12, name.split(' ')[0], { fontSize: '7px', color: CSS.text, fontFamily: FONT_FAMILY, fontStyle: 'bold' }).setOrigin(0.5);
    const bar = makeHpBar(this, 0, 22, CELL_W - 8, 4, hp / maxHp);
    const container = this.add.container(x, y, [frame, sprite, label, bar]);

    // Entrée en scène : les unités surgissent avec un léger pop
    container.setScale(0);
    this.tweens.add({ targets: container, scale: 1, duration: 250, delay: Phaser.Math.Between(0, 200), ease: 'Back.Out' });

    this.units.set(id, { container, sprite, frame, bar, maxHp, hp, side });
  }

  private drawLogPanel(): void {
    makePanel(this, GAME_WIDTH / 2, 487, 340, 92);
    this.logText = this.add.text(24, 447, '', {
      ...FONTS.small, fontSize: '10px', lineSpacing: 4, wordWrap: { width: 312 },
    });
  }

  private drawControls(): void {
    this.speedBtn = this.add.text(GAME_WIDTH - 16, 24, `▶ ×${this.speed}`, {
      fontFamily: FONT_FAMILY, fontSize: '13px', fontStyle: 'bold', color: CSS.textDim,
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.speed = this.speed >= 4 ? 1 : this.speed * 2;
        this.speedBtn?.setText(`▶ ×${this.speed}`);
        window.gameState.combatSpeed = this.speed;
        saveProgress();
      });

    this.skipBtn = makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 55, 'PASSER ▶▶', () => this.skipToEnd(), 180, 40, COLORS.btn.neutral);
  }

  // ---- Playback ----

  private playNext(): void {
    if (this.finished) return;
    if (this.logIndex >= this.log.length) {
      this.showResult();
      return;
    }

    const entry = this.log[this.logIndex++];
    this.appendLogLine(entry);

    const actor = this.units.get(entry.actorId);
    const dur = 150 / this.speed;

    if (actor && actor.hp > 0) {
      // Élan vers le camp adverse + cadre mis en avant
      actor.container.setDepth(10);
      const dy = entry.actorSide === 'hero' ? -12 : 12;
      this.tweens.add({
        targets: actor.container,
        y: actor.container.y + dy,
        duration: dur,
        yoyo: true,
        ease: 'Quad.Out',
        onComplete: () => actor.container.setDepth(0),
      });
    }

    // Les effets tombent au sommet de l'élan
    this.time.delayedCall(dur, () => {
      if (this.finished) return;
      entry.effects.forEach(eff => this.applyEffect(eff));
    });

    this.time.delayedCall(STEP_DELAY / this.speed, () => this.playNext());
  }

  private applyEffect(eff: CombatEffect): void {
    const unit = this.units.get(eff.unitId);
    if (!unit) return;
    const { x, y } = unit.container;

    switch (eff.kind) {
      case 'damage': {
        floatText(this, x, y - 26, `-${eff.amount}`, CSS.hpLow, eff.amount >= 35 ? '16px' : '13px');
        unit.sprite.setTintFill(COLORS.ink);
        this.time.delayedCall(70 / this.speed, () => unit.sprite.clearTint());
        // Tremblement de la cible
        this.tweens.add({ targets: unit.container, x: x + 4, duration: 40, yoyo: true, repeat: 2, onComplete: () => { unit.container.x = x; } });
        if (eff.amount >= 35) this.cameras.main.shake(90, 0.005);
        break;
      }
      case 'revive':
      case 'heal': {
        floatText(this, x, y - 26, `+${eff.amount}`, CSS.hp);
        unit.sprite.setTint(COLORS.hp);
        this.time.delayedCall(180 / this.speed, () => unit.sprite.clearTint());
        if (eff.kind === 'revive') {
          // L'unité était grisée et couchée : on la remet debout
          unit.container.setAlpha(1).setAngle(0).setScale(1);
          unit.sprite.clearTint();
          floatText(this, x, y - 42, '✨ Debout !', CSS.gold, '12px');
        }
        break;
      }
      case 'debuff':
        floatText(this, x, y - 26, `-${eff.amount}% ATK`, CSS.magic, '11px');
        break;
    }

    unit.hp = eff.hpAfter;
    setHpBar(this, unit.bar, eff.hpAfter / unit.maxHp, 200 / this.speed);

    if (eff.hpAfter <= 0) this.killUnit(unit);
  }

  private killUnit(unit: UnitView): void {
    this.tweens.add({
      targets: unit.container,
      alpha: 0.25,
      angle: unit.side === 'hero' ? -8 : 8,
      scale: 0.9,
      duration: 250 / this.speed,
      ease: 'Quad.In',
    });
    unit.sprite.setTint(COLORS.textFaint);
  }

  private appendLogLine(entry: CombatLogEntry): void {
    let line: string;
    if (entry.heal > 0) line = `${entry.actorName} soigne ${entry.targetName} (+${entry.heal} PV)`;
    else if (entry.damage > 0) line = `${entry.actorName} → ${entry.targetName} : ${entry.damage}${entry.special ? ` [${entry.special}]` : ''}`;
    else line = `${entry.actorName} : ${entry.special}`;

    this.logLines.push(line);
    if (this.logLines.length > 5) this.logLines.shift();
    this.logText.setText(this.logLines.join('\n'));
  }

  // Avance directement à l'état final (toutes les animations annulées)
  private skipToEnd(): void {
    if (this.finished) return;
    this.tweens.killAll();
    this.time.removeAllEvents();

    const finalHp = new Map<string, number>();
    this.heroesRef.forEach(h => finalHp.set(h.instanceId, h.currentHp));
    this.enemiesRef.forEach(e => finalHp.set(e.instanceId, e.currentHp));

    this.units.forEach((unit, id) => {
      const hp = finalHp.get(id) ?? unit.hp;
      unit.hp = hp;
      unit.container.setScale(hp > 0 ? 1 : 0.9).setAlpha(hp > 0 ? 1 : 0.25);
      unit.container.setAngle(hp > 0 ? 0 : (unit.side === 'hero' ? -8 : 8));
      unit.sprite.clearTint();
      const fill = unit.bar.getData('fill') as Phaser.GameObjects.Rectangle | undefined;
      if (fill) {
        const pct = Phaser.Math.Clamp(hp / unit.maxHp, 0, 1);
        fill.setScale(pct, 1).setFillStyle(pct > 0.4 ? COLORS.hp : COLORS.hpLow);
      }
      if (hp <= 0) unit.sprite.setTint(COLORS.textFaint);
    });

    this.showResult();
  }

  // ---- Résultat ----

  private showResult(): void {
    if (this.finished) return;
    this.finished = true;
    this.skipBtn?.destroy();
    this.speedBtn?.destroy();

    const gs = window.gameState;
    const auto = gs.runManager.state.autoMode;
    const cx = GAME_WIDTH / 2;

    const overlay = this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.scrim, 0).setDepth(80);
    this.tweens.add({ targets: overlay, fillAlpha: 0.82, duration: 300 });

    const banner = this.add.text(cx, 290, this.victory ? '✨ VICTOIRE' : '💀 DÉFAITE', {
      fontFamily: FONT_FAMILY, fontSize: '32px', fontStyle: 'bold', stroke: CSS.ink, strokeThickness: 7,
      color: this.victory ? CSS.gold : CSS.danger, align: 'center',
    }).setOrigin(0.5).setDepth(81).setScale(0);
    this.tweens.add({ targets: banner, scale: 1, duration: 380, ease: 'Back.Out' });

    if (this.victory) {
      // Pluie d'étincelles dorées autour de la bannière
      for (let i = 0; i < 14; i++) {
        const spark = this.add.image(cx + Phaser.Math.Between(-90, 90), 290 + Phaser.Math.Between(-30, 30), 'spark')
          .setDepth(81).setTint(COLORS.gold).setAlpha(0).setScale(Phaser.Math.FloatBetween(0.4, 1));
        this.tweens.add({
          targets: spark,
          alpha: { from: 1, to: 0 },
          y: spark.y - Phaser.Math.Between(20, 50),
          delay: 200 + i * 60,
          duration: 700,
          onComplete: () => spark.destroy(),
        });
      }

      const goldText = this.add.text(cx, 335, '+0 💰', { ...FONTS.gold, fontSize: '20px', align: 'center' })
        .setOrigin(0.5).setDepth(81);
      const counter = { value: 0 };
      this.tweens.add({
        targets: counter,
        value: this.goldReward,
        delay: 300,
        duration: 600,
        ease: 'Quad.Out',
        onUpdate: () => goldText.setText(`+${Math.round(counter.value)} 💰`),
      });

      const proceed = () => {
        if (isTransitioning(this)) return;
        gs.runManager.completeRoom({ gold: this.goldReward });
        if (gs.runManager.state.isOver || gs.runManager.heroesAllDead()) {
          if (!gs.runManager.state.isOver) gs.runManager.endRun(false);
          transitionTo(this, 'GameOver');
        } else {
          transitionTo(this, 'RunMap');
        }
      };
      makeButton(this, cx, GAME_HEIGHT - 55, 'CONTINUER ▶', proceed, 240, 46).setDepth(82);
      // Mode auto : on enchaîne sans attendre le clic
      if (auto) this.time.delayedCall(1400, proceed);
    } else {
      this.cameras.main.shake(250, 0.008);
      this.add.text(cx, 335, 'Vos héros sont tombés.', { ...FONTS.small, align: 'center' })
        .setOrigin(0.5).setDepth(81);

      const end = () => {
        if (isTransitioning(this)) return;
        gs.runManager.endRun(false);
        transitionTo(this, 'GameOver');
      };
      makeButton(this, cx, GAME_HEIGHT - 55, 'FIN DU RUN', end, 240, 46, COLORS.btn.danger).setDepth(82);
      if (auto) this.time.delayedCall(1600, end);
    }
  }
}
