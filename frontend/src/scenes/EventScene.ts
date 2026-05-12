import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, FONTS } from '../config';
import { makeButton, makePanel, makeTitle } from '../ui/UIManager';
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

    const run = window.gameState.runManager.state;
    let resultMsg = choice.description;

    switch (choice.outcomeType) {
      case 'gain_relic': {
        const relicPool = RELIC_POOL.filter(r => r.rarity === (choice.outcomeRarity ?? 'common'));
        const relic = pickRandom(relicPool);
        run.applyRelic(relic);
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
        (hero as Record<string, number>)[stat] = ((hero as Record<string, number>)[stat] ?? 0) + (choice.outcomeValue ?? 10);
        resultMsg = `${hero.name} gagne +${choice.outcomeValue} ${stat.toUpperCase()}`;
        break;
      }
    }

    this.showResult(resultMsg);
  }

  private showResult(msg: string): void {
    const run = window.gameState.runManager.state;

    // Clear choices
    this.children.list
      .filter(c => c.type === 'Container')
      .forEach(c => c.destroy());

    makePanel(this, GAME_WIDTH / 2, 350, 320, 80);
    this.add.text(GAME_WIDTH / 2, 350, msg, {
      ...FONTS.body, align: 'center', wordWrap: { width: 300 },
    }).setOrigin(0.5);

    makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 60, 'CONTINUER', () => {
      run.completeRoom({});
      if (run.isOver) {
        this.scene.start('GameOver');
      } else {
        this.scene.start('RunMap');
      }
    }, 220, 46);
  }
}
