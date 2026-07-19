import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, CSS, FONTS, STROKE } from '../config';
import { makeButton, makePanel, makeTitle, makeHpBar, makeModal, rarityColor, fadeIn, transitionTo, isTransitioning, showToast, staggerIn } from '../ui/UIManager';
import { getHeroById, ROLE_ICONS, ROLE_LABELS } from '../data/heroes';
import type { HeroDefinition } from '../data/heroes';
import { MAX_TEAM } from '../systems/RunManager';
import { isHeroAlive } from '../entities/Hero';
import { pickRandom } from '../utils/random';

const REST_HEAL = 40;

// Même grille de marge que RunMapScene, qui sert de référence de layout.
const MARGIN = 16;
const CONTENT_W = GAME_WIDTH - MARGIN * 2; // 328

// Bouton « Passer » : le bandeau d'équipe se positionne au-dessus, donc sa
// géométrie doit être partagée plutôt que recopiée de part et d'autre.
const SKIP_H = 44;
const SKIP_CY = GAME_HEIGHT - 46;
const SKIP_TOP = SKIP_CY - SKIP_H / 2;

// Salle de renfort : le joueur choisit un héros parmi trois. Si son équipe est
// pleine, il doit décider qui laisse sa place — c'est la seule vraie décision
// d'un run, et elle porte uniquement sur les personnages.
export class RecruitScene extends Phaser.Scene {
  private resolved = false;

  constructor() { super('Recruit'); }

  create(): void {
    this.resolved = false;

    const run = window.gameState.runManager.state;
    const offers = (run.rooms[run.currentRoomIndex].offers ?? [])
      .map(id => getHeroById(id))
      .filter((h): h is HeroDefinition => h !== undefined);

    fadeIn(this);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background);
    makeTitle(this, GAME_WIDTH / 2, 36, '⚑ RENFORT');
    this.add.text(GAME_WIDTH / 2, 64, 'Un héros peut rejoindre ton équipe.', {
      ...FONTS.small, align: 'center',
    }).setOrigin(0.5);

    this.drawOffers(offers);
    this.drawTeamStrip();

    makeButton(this, GAME_WIDTH / 2, SKIP_CY, `Passer (+${REST_HEAL} PV à l'équipe)`,
      () => this.skip(), 300, SKIP_H, COLORS.btn.neutral);

    if (run.autoMode) {
      this.add.text(GAME_WIDTH - 10, 36, '🤖 AUTO', { ...FONTS.small, color: CSS.accent }).setOrigin(1, 0.5);
      this.time.delayedCall(900, () => {
        if (offers.length > 0 && Math.random() < 0.75) this.choose(pickRandom(offers));
        else this.skip();
      });
    }
  }

  // Carte d'offre : rôle, stats, et l'unique ligne de compétence.
  private drawOffers(offers: HeroDefinition[]): void {
    const cardH = 106;
    const cards = offers.map((hero, i) => {
      const y = 100 + i * (cardH + 10);
      const card = this.add.container(GAME_WIDTH / 2, y + cardH / 2);

      const bg = this.add.rectangle(0, 0, 328, cardH, COLORS.panel)
        .setStrokeStyle(STROKE.base, rarityColor(hero.rarity))
        .setInteractive({ useHandCursor: true });
      const icon = this.add.image(-128, -14, `hero_${hero.id}`).setDisplaySize(52, 52);
      const name = this.add.text(-92, -36, hero.name, { ...FONTS.body }).setOrigin(0, 0.5);
      const role = this.add.text(-92, -16, `${ROLE_ICONS[hero.role]} ${ROLE_LABELS[hero.role]}`, {
        ...FONTS.small, color: CSS.textDim,
      }).setOrigin(0, 0.5);
      const stats = this.add.text(-92, 6, `❤ ${hero.hp}    ⚔ ${hero.atk}    ⚡ ${hero.spd}`, {
        ...FONTS.small, fontSize: '12px', color: CSS.text,
      }).setOrigin(0, 0.5);
      const ability = this.add.text(-148, 34, `« ${hero.ability.text} »`, {
        ...FONTS.small, color: CSS.accent, wordWrap: { width: 296 },
      }).setOrigin(0, 0.5);

      card.add([bg, icon, name, role, stats, ability]);
      bg.on('pointerdown', () => this.choose(hero));
      return card;
    });

    staggerIn(this, cards, 16);
  }

  // Bandeau d'équipe : sert de rappel avant le choix, et de sélecteur quand il
  // faut écarter quelqu'un.
  private drawTeamStrip(): void {
    const run = window.gameState.runManager.state;

    // Géométrie dérivée du contenu, ancrée sur le bouton du bas. En dur, le
    // panneau était trop court de 10px pour ce qu'il contenait : les PV
    // débordaient sur le bord des cases et le label collait au cadre.
    const PAD = 10;
    const BOX_W = 60;
    const BOX_H = 48;          // nom + barre + PV, tous à l'intérieur
    const LABEL_GAP = 10;      // écart label / boîte imposé par la charte

    const panelH = PAD * 2 + BOX_H;
    const panelBottom = SKIP_TOP - 16;   // 16px au-dessus du bouton
    const panelTop = panelBottom - panelH;
    const boxCy = panelTop + PAD + BOX_H / 2;

    this.add.text(MARGIN, panelTop - LABEL_GAP - 6, `Ton équipe (${run.heroes.length}/${MAX_TEAM}) :`, {
      ...FONTS.small,
    }).setOrigin(0, 0.5);
    makePanel(this, GAME_WIDTH / 2, panelTop + panelH / 2, CONTENT_W, panelH);

    // Les cases occupent MAX_TEAM emplacements répartis sur toute la largeur :
    // une équipe incomplète laisse un trou visible, ce qui est l'information utile.
    const slot = CONTENT_W / MAX_TEAM;

    run.heroes.forEach((h, i) => {
      const cx = MARGIN + slot * i + slot / 2;
      const alive = isHeroAlive(h);
      this.add.rectangle(cx, boxCy, BOX_W, BOX_H, COLORS.panel)
        .setStrokeStyle(STROKE.thin, alive ? COLORS.ink : COLORS.textFaint);
      this.add.text(cx, boxCy - 15, `${ROLE_ICONS[h.role]} ${h.short}`, {
        ...FONTS.small, fontSize: '9px', color: alive ? CSS.text : CSS.textFaint,
      }).setOrigin(0.5);
      makeHpBar(this, cx, boxCy + 1, 50, 5, Math.max(0, h.currentHp / h.maxHp));
      this.add.text(cx, boxCy + 15, `${Math.max(0, h.currentHp)}/${h.maxHp}`, {
        ...FONTS.small, fontSize: '8px',
      }).setOrigin(0.5);
    });
  }

  private choose(hero: HeroDefinition): void {
    if (this.resolved || isTransitioning(this)) return;
    const gs = window.gameState;
    const run = gs.runManager.state;

    if (run.heroes.length < MAX_TEAM) {
      this.resolved = true;
      gs.runManager.recruitHero(hero.id);
      showToast(this, `${hero.name} rejoint l'équipe !`);
      this.finish();
      return;
    }

    // Équipe pleine : il faut choisir qui part. En mode auto, personne n'est là
    // pour répondre — on tire au sort, sinon le run reste figé sur la modale.
    if (run.autoMode) {
      this.resolved = true;
      const leaving = pickRandom(run.heroes);
      gs.runManager.recruitHero(hero.id, leaving.instanceId);
      showToast(this, `${hero.name} remplace ${leaving.short}`);
      this.finish();
      return;
    }

    this.askWhoLeaves(hero);
  }

  private askWhoLeaves(hero: HeroDefinition): void {
    const run = window.gameState.runManager.state;
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    // Pas de fermeture au clic sur le voile : il faut désigner qui part,
    // ou annuler explicitement.
    const { container: overlay, close } = makeModal(this);

    // Géométrie dérivée du nombre de héros : avec une équipe pleine, la hauteur
    // fixe de 260px faisait chevaucher le bouton « Annuler » sur la 4e ligne.
    const ROW_H = 46;
    const PAD = 16;
    const TITLE_H = 44;   // le titre tient sur deux lignes
    const CANCEL_H = 36;
    const rowsH = run.heroes.length * ROW_H;
    const panelH = PAD + TITLE_H + 8 + rowsH + PAD + CANCEL_H + PAD;
    const top = cy - panelH / 2;
    const firstRowY = top + PAD + TITLE_H + 8 + ROW_H / 2;
    const cancelY = firstRowY + (run.heroes.length - 1) * ROW_H + ROW_H / 2 + PAD + CANCEL_H / 2;

    const panel = makePanel(this, cx, cy, 320, panelH);
    const title = this.add.text(cx, top + PAD + TITLE_H / 2, `Qui laisse sa place à\n${hero.name} ?`, {
      ...FONTS.body, align: 'center', wordWrap: { width: 280 },
    }).setOrigin(0.5);

    overlay.add([panel, title]);

    run.heroes.forEach((h, i) => {
      const y = firstRowY + i * ROW_H;
      const row = this.add.rectangle(cx, y, 280, 40, COLORS.panel)
        .setStrokeStyle(STROKE.thin, COLORS.ink)
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(cx - 126, y, `${ROLE_ICONS[h.role]} ${h.name}`, {
        ...FONTS.small, color: CSS.text,
      }).setOrigin(0, 0.5);
      const hp = this.add.text(cx + 126, y, `${Math.max(0, h.currentHp)}/${h.maxHp}`, {
        ...FONTS.small, color: h.currentHp <= 0 ? CSS.danger : CSS.textDim,
      }).setOrigin(1, 0.5);

      row.on('pointerdown', () => {
        if (this.resolved) return;
        this.resolved = true;
        window.gameState.runManager.recruitHero(hero.id, h.instanceId);
        showToast(this, `${hero.name} remplace ${h.name}`);
        close();
        this.finish();
      });

      overlay.add([row, label, hp]);
    });

    const cancel = makeButton(this, cx, cancelY, 'Annuler', close, 220, CANCEL_H, COLORS.btn.neutral);
    overlay.add(cancel);
  }

  private skip(): void {
    if (this.resolved || isTransitioning(this)) return;
    this.resolved = true;
    window.gameState.runManager.healTeam(REST_HEAL);
    showToast(this, `L'équipe récupère ${REST_HEAL} PV`);
    this.finish();
  }

  private finish(): void {
    window.gameState.runManager.completeRoom({});
    this.time.delayedCall(650, () => transitionTo(this, 'RunMap'));
  }
}
