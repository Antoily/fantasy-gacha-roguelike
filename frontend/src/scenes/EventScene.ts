import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, FONTS } from '../config';
import { makeButton, makePanel, makeTitle, fadeIn, transitionTo, isTransitioning } from '../ui/UIManager';
import { getRandomEvents } from '../data/events';
import { RELIC_POOL } from '../data/relics';
import type { EventDefinition, EventChoice } from '../data/events';
import { pickRandom } from '../utils/random';

export class EventScene extends Phaser.Scene {
  private event!: EventDefinition;
  private resolved = false;

  constructor() { super('Event'); }

  create(): void {
    const run = window.gameState.runManager.state;
    const room = run.rooms[run.currentRoomIndex];

    this.event = room.event ?? getRandomEvents(1)[0];
    this.resolved = false;

    fadeIn(this);
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg_event').setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.5);

    makeTitle(this, GAME_WIDTH / 2, 50, this.event.title);
    makePanel(this, GAME_WIDTH / 2, 160, 330, 120);
    this.add.text(GAME_WIDTH / 2, 120, this.event.description, {
      ...FONTS.body, align: 'center', wordWrap: { width: 310 },
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 170, this.event.flavourText, {
      ...FONTS.small, align: 'center', wordWrap: { width: 310 }, fontStyle: 'italic',
    }).setOrigin(0.5);

    this.drawChoices();
  }

  private drawChoices(): void {
    this.event.choices.forEach((choice, i) => {
      const y = 280 + i * 70;
      makeButton(this, GAME_WIDTH / 2, y, choice.label, () => this.applyChoice(choice), 280, 48,
        choice.outcomeType === 'nothing' ? 0x444455 : COLORS.accent);
    });
  }

  private applyChoice(choice: EventChoice): void {
    if (this.resolved) return;
    this.resolved = true;

    const gs = window.gameState;
    const run = gs.runManager.state;
    let resultMsg = choice.description;

    switch (choice.outcomeType) {
      case 'gain_relic': {
        const relicPool = RELIC_POOL.filter(r => r.rarity === (choice.outcomeRarity ?? 'common'));
        const relic = pickRandom(relicPool);
        gs.runManager.applyRelic(relic);
        resultMsg = `${choice.description} (${relic.name})`;
        if ((choice.outcomeValue ?? 0) < 0) {
          run.heroes.forEach(h => { h.currentHp = Math.max(1, h.currentHp + (choice.outcomeValue ?? 0)); });
        }
        break;
      }
      case 'gain_gold':
        run.gold = Math.max(0, run.gold + (choice.outcomeValue ?? 0));
        break;
      case 'heal_all':
        run.heroes.forEach(h => { h.currentHp = Math.min(h.maxHp, h.currentHp + (choice.outcomeValue ?? 20)); });
        break;
      case 'lose_hp':
        run.heroes.forEach(h => { h.currentHp = Math.max(1, h.currentHp - (choice.outcomeValue ?? 15)); });
        break;
      case 'buff_hero': {
        const hero = pickRandom(run.heroes);
        const stat = pickRandom(['atk', 'def', 'spd'] as const);
        // Type-safe stat bump
        if (stat === 'atk') hero.atk += (choice.outcomeValue ?? 10);
        else if (stat === 'def') hero.def += (choice.outcomeValue ?? 10);
        else hero.spd += (choice.outcomeValue ?? 10);
        resultMsg = `${hero.name} gagne +${choice.outcomeValue} ${stat.toUpperCase()}`;
        break;
      }
    }

    this.showResult(resultMsg);
  }

  private showResult(msg: string): void {
    const gs = window.gameState;

    // Clear choice buttons
    this.children.list
      .filter(c => c.type === 'Container')
      .forEach(c => c.destroy());

    const panel = makePanel(this, GAME_WIDTH / 2, 350, 320, 80);
    const text = this.add.text(GAME_WIDTH / 2, 350, msg, {
      ...FONTS.body, align: 'center', wordWrap: { width: 300 },
    }).setOrigin(0.5);

    // Le résultat surgit pour marquer la conséquence du choix
    [panel, text].forEach(obj => {
      obj.setScale(0.8).setAlpha(0);
      this.tweens.add({ targets: obj, scale: 1, alpha: 1, duration: 220, ease: 'Back.Out' });
    });

    makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 60, 'CONTINUER', () => {
      if (isTransitioning(this)) return;
      gs.runManager.completeRoom({});
      transitionTo(this, gs.runManager.state.isOver ? 'GameOver' : 'RunMap');
    }, 220, 46);
  }
}
