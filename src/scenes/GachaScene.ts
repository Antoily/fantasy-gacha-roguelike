import Phaser from 'phaser';
import { CATALOGUE } from '../data/catalogue';
import type { Item } from '../data/catalogue';
import { GACHA_CONFIG, RARITIES, SHARD_COST, type Rarity } from '../data/gachaConfig';
import { REVEAL_TIMING } from '../data/revealConfig';
import { formatAmount } from '../logic/format';
import type { PullResult } from '../logic/gacha';
import { collectionEntries, isComplete, raritySummary, type CollectionEntry } from '../logic/collection';
import {
  activeBanner, canAfford, cycleBanner, distinctOwned, exchange, hasFeaturedGuarantee, pull, pullsUntilPity, reset,
  type Progression, type PullCount,
} from '../logic/progression';
import { featuredRatePercent, formatPercent, ratePercent, rarityTable } from '../logic/rates';
import { planReveal } from '../logic/reveal';
import { SETTINGS_KEY, serializeSettings, type Settings } from '../logic/settings';
import { flipCues } from '../logic/soundCues';
import { SAVE_KEY, serializeSave, type SaveStatus } from '../logic/save';
import {
  COLLECTION, CONFIRM_DIALOG_H, DIALOG, GACHA, RESULTS, REVEAL, WARNING_DIALOG_H,
  center, ratesDialogH, collectionCellRect, dialogButtons, dialogRect, resultCardRect, type Rect,
} from '../ui/layout';
import { playReveal, Sequence } from '../ui/reveal';
import { Sfx } from '../ui/sfx';
import { COLORS, CSS, FONT_SIZE, RADIUS, REVEAL_FX, STROKE } from '../ui/theme';
import {
  makeButton, makeModal, makeOrb, makePanel, makeResultCard, makeShardAmount, makeShardIcon, textStyle, type Button,
} from '../ui/widgets';

// Carte du ×10 montée sur un pivot centré, pour se retourner autour de son milieu.
interface FlipCard {
  readonly pivot: Phaser.GameObjects.Container;
  readonly face: Phaser.GameObjects.Container;
  readonly back: readonly (Phaser.GameObjects.Graphics | Phaser.GameObjects.Text)[];
}

// Délai avant qu'un appui passe l'animation : un double appui sur « Tirer » ne doit
// pas la passer à l'insu du joueur (research R5).
const SKIP_ARM_MS = 200;

const rarityLabel = (rarity: Rarity) => RARITIES.find(r => r.id === rarity)!.label;

interface GachaData {
  progression: Progression;
  status: SaveStatus;
  settings: Settings;
}

// L'unique écran de la feature 001. Toute règle vit dans src/logic : la scène affiche
// l'état, relaie les appuis et sauvegarde l'état complet d'un bloc.
export class GachaScene extends Phaser.Scene {
  private progression!: Progression;
  private modalOpen = false;
  private orb!: Phaser.GameObjects.Container;
  private sfx!: Sfx;
  private muteIcon!: Phaser.GameObjects.Graphics;
  private currencyText!: Phaser.GameObjects.Text;
  private counterText!: Phaser.GameObjects.Text;
  private shardsText!: Phaser.GameObjects.Text;
  private pityText!: Phaser.GameObjects.Text;
  private bannerName!: Phaser.GameObjects.Text;
  private bannerDetail!: Phaser.GameObjects.Text;
  private featuredText!: Phaser.GameObjects.Text;
  private shortageText!: Phaser.GameObjects.Text;
  private singleButton!: Button;
  private tenButton!: Button;

  constructor() {
    super('Gacha');
  }

  create(data: GachaData) {
    this.progression = data.progression;
    this.modalOpen = false;
    this.sfx = new Sfx(this, data.settings.muted);
    this.drawHeader();
    this.drawOrb();
    this.drawMuteButton();
    this.drawBannerSelector();

    this.singleButton = makeButton(this, GACHA.pullSingle,
      `Tirer ×1 — ${formatAmount(GACHA_CONFIG.costSingle)}`, COLORS.btn.primary, () => this.onPull(1));
    this.tenButton = makeButton(this, GACHA.pullTen,
      `Tirer ×10 — ${formatAmount(GACHA_CONFIG.costTen)}`, COLORS.btn.primary, () => this.onPull(10),
      'Un Rare ou mieux garanti');
    this.shortageText = this.add.text(GACHA.pullSingle.x + GACHA.pullSingle.w / 2, GACHA.shortageMessageY, '',
      { ...textStyle(FONT_SIZE.body, CSS.textDim), align: 'center', wordWrap: { width: GACHA.pullSingle.w } })
      .setOrigin(0.5, 0);

    this.pityText = this.add.text(GACHA.orb.x, GACHA.pityLineY, '', textStyle(FONT_SIZE.body, CSS.textDim)).setOrigin(0.5);
    this.featuredText = this.add.text(GACHA.orb.x, GACHA.featuredLineY, '', textStyle(FONT_SIZE.body)).setOrigin(0.5);
    makeButton(this, GACHA.collection, 'Collection', COLORS.btn.secondary, () => this.showCollection());
    makeButton(this, GACHA.rates, 'Taux', COLORS.btn.secondary, () => this.showRates());
    makeButton(this, GACHA.reset, 'Recommencer', COLORS.btn.neutral, () => this.showResetConfirm());

    this.refresh();
    // Signal pour le test de bout en bout : l'écran est prêt à recevoir des appuis.
    document.body.dataset.ready = 'gacha';
    if (data.status === 'corrupted') {
      this.persist();
      this.showWarning();
    }
  }

  private drawHeader() {
    const h = GACHA.header;
    makePanel(this, h);
    const coinX = h.x + 26;
    const cy = h.y + h.h / 2;
    const coin = this.add.graphics();
    coin.fillStyle(COLORS.coin, 1).fillCircle(coinX, cy, 12);
    coin.lineStyle(STROKE.thin, COLORS.ink, 1).strokeCircle(coinX, cy, 12);
    this.currencyText = this.add.text(coinX + 20, cy, '', textStyle(FONT_SIZE.big)).setOrigin(0, 0.5);
    this.counterText = this.add.text(h.x + h.w - 16, cy, '', textStyle(FONT_SIZE.big)).setOrigin(1, 0.5);
    const shardX = h.x + h.w / 2 - 6;
    makeShardIcon(this, shardX, cy, 12);
    this.shardsText = this.add.text(shardX + 16, cy, '', textStyle(FONT_SIZE.big)).setOrigin(0, 0.5);
  }

  private drawOrb() {
    const { x, y, r } = GACHA.orb;
    this.orb = makeOrb(this, r).setPosition(x, y);
  }

  // Bouton son (005) : haut-parleur avec ondes, ou barré quand le son est coupé.
  private drawMuteButton() {
    const r = GACHA.mute;
    // Pendant une fenêtre, le voile le recouvre : il ne reçoit pas l'appui.
    makeButton(this, r, '', COLORS.btn.neutral, () => {
      this.sfx.setMuted(!this.sfx.isMuted);
      this.persistSettings();
      this.drawMuteIcon();
    });
    this.muteIcon = this.add.graphics();
    this.drawMuteIcon();
  }

  private drawMuteIcon() {
    const { x, y } = center(GACHA.mute);
    const g = this.muteIcon.clear();
    const V = Phaser.Math.Vector2;
    g.fillStyle(COLORS.ink, 1);
    g.fillRect(x - 11, y - 4, 6, 8);
    g.fillPoints([new V(x - 6, y - 4), new V(x + 1, y - 10), new V(x + 1, y + 10), new V(x - 6, y + 4)], true);
    g.lineStyle(STROKE.base, COLORS.ink, 1);
    if (this.sfx.isMuted) {
      g.lineBetween(x + 5, y - 5, x + 13, y + 5);
      g.lineBetween(x + 13, y - 5, x + 5, y + 5);
      return;
    }
    for (const radius of [6, 11]) {
      g.beginPath();
      g.arc(x + 1, y, radius, -Math.PI / 4, Math.PI / 4);
      g.strokePath();
    }
  }

  // Bannières (006) : flèches en boucle. Pendant une fenêtre, le voile les recouvre.
  private drawBannerSelector() {
    makePanel(this, GACHA.banner);
    const { x, y } = center(GACHA.banner);
    this.bannerName = this.add.text(x, y - 8, '', textStyle(FONT_SIZE.body)).setOrigin(0.5);
    this.bannerDetail = this.add.text(x, y + 10, '', textStyle(FONT_SIZE.micro, CSS.textDim)).setOrigin(0.5);
    const V = Phaser.Math.Vector2;
    for (const [r, step] of [[GACHA.bannerPrev, -1], [GACHA.bannerNext, 1]] as const) {
      makeButton(this, r, '', COLORS.btn.neutral, () => this.onCycleBanner(step));
      const c = center(r);
      const tip = step * 6;
      this.add.graphics().fillStyle(COLORS.ink, 1)
        .fillPoints([new V(c.x + tip, c.y), new V(c.x - tip, c.y - 8), new V(c.x - tip, c.y + 8)], true);
    }
  }

  // Sans garde modalOpen : le voile d'une fenêtre recouvre les flèches (vérifié par
  // l'e2e « les flèches ne réagissent pas sous une fenêtre », mutation survivante).
  private onCycleBanner(step: 1 | -1) {
    this.progression = cycleBanner(this.progression, step);
    this.persist();
    this.refresh();
  }

  private persistSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, serializeSettings({ muted: this.sfx.isMuted }));
    } catch {
      // Stockage plein ou interdit : le réglage vaut pour la session.
    }
  }

  private refresh() {
    const p = this.progression;
    this.currencyText.setText(formatAmount(p.currency));
    this.counterText.setText(`${distinctOwned(p)} / ${CATALOGUE.length}`);
    this.shardsText.setText(formatAmount(p.shards));
    const left = pullsUntilPity(p);
    this.pityText.setText(left === 1
      ? 'Légendaire garanti au prochain tirage'
      : `Légendaire garanti dans ${left} tirages au plus`);
    const banner = activeBanner(p);
    // Signal pour l'e2e : la bannière active, sans lire le canvas.
    document.body.dataset.banner = banner.id;
    const vedette = banner.featured;
    if (vedette) {
      const count = p.owned[vedette.id] ?? 0;
      this.bannerName.setText(vedette.name);
      this.bannerDetail.setText(
        `${rarityLabel(vedette.rarity)} · ${count > 0 ? `possédé ×${count}` : 'pas encore obtenu'}`);
    } else {
      this.bannerName.setText('Bannière standard');
      this.bannerDetail.setText('Tous les éléments, taux de base');
    }
    // Tournure sans accord : la vedette peut être féminine (Marquise Cerise).
    this.featuredText.setText(vedette && hasFeaturedGuarantee(p)
      ? `Prochain ${rarityLabel(vedette.rarity)} garanti\u00a0: ${vedette.name}`
      : '');
    document.body.dataset.featuredLine = this.featuredText.text;
    const single = canAfford(p, 1);
    const ten = canAfford(p, 10);
    this.singleButton.setEnabled(single);
    this.tenButton.setEnabled(ten);
    this.shortageText.setText(
      !single
        // Espaces insécables dans les guillemets : un « » ne doit jamais finir seul sur sa ligne.
        ? 'Plus assez de pièces pour tirer. «\u00a0Recommencer\u00a0» remet le stock de départ.'
        : !ten
          ? `Pas assez de pièces pour un ×10 (il en faut ${formatAmount(GACHA_CONFIG.costTen)}).`
          : '',
    );
  }

  private onPull(count: PullCount) {
    // Verrou : tant qu'une fenêtre est ouverte, aucun tirage ne part (appuis répétés).
    if (this.modalOpen) return;
    const outcome = pull(this.progression, count, Math.random);
    if (!outcome.ok) {
      this.refresh();
      return;
    }
    const before = this.progression.owned;
    this.progression = outcome.progression;
    // Sauvegardé AVANT d'afficher : débit et gains sont écrits ensemble (FR-011).
    this.persist();
    this.refresh();
    this.showReveal(outcome.results, before);
  }

  // Révélation (004) : le tirage est déjà décidé et sauvegardé ; l'animation ne fait
  // que le montrer. Le hasard du déroulé est consommé après celui du tirage (R2).
  private showReveal(results: PullResult[], ownedBefore: Readonly<Record<string, number>>) {
    const plan = planReveal(results, Math.random);
    this.sfx.resetLog();
    const modal = this.openModal('reveal');
    document.body.dataset.reveal = plan.steps.join('>');
    // L'orbe quitte sa place : la révélation en dessine une copie qui gagne le centre.
    this.orb.setVisible(false);
    let done = false;
    const finish = (skipped: boolean) => {
      if (done) return;
      done = true;
      seq.stop();
      // Passer coupe aussi les sons en cours ; à la fin naturelle, le palier finit de sonner.
      if (skipped) this.sfx.stopAll();
      delete document.body.dataset.reveal;
      this.orb.setVisible(true);
      this.closeModal(modal);
      // Passer montre tout de suite toutes les cartes, déjà retournées (FR-006).
      this.showResults(results, ownedBefore, skipped ? undefined : plan.flipOrder);
    };
    const seq = playReveal(this, modal, plan, cue => this.sfx.play(cue), () => finish(false));
    this.addSkipZone(modal, seq, SKIP_ARM_MS, () => finish(true));
  }

  // Zone plein écran au-dessus de tout le contenu de la fenêtre.
  private addSkipZone(modal: Phaser.GameObjects.Container, seq: Sequence, armMs: number, onTap: () => void) {
    const r = REVEAL.skip;
    const zone = this.add.zone(r.x, r.y, r.w, r.h).setOrigin(0);
    zone.on('pointerup', onTap);
    modal.add(zone);
    if (armMs === 0) zone.setInteractive();
    else seq.at(armMs, () => zone.setInteractive());
    return zone;
  }

  private persist() {
    try {
      localStorage.setItem(SAVE_KEY, serializeSave(this.progression));
    } catch {
      // Stockage plein ou interdit : la partie continue, seule la persistance manque.
    }
  }

  // Le nom de la fenêtre ouverte est exposé dans le DOM pour le test de bout en bout :
  // il vérifie l'enchaînement des écrans, pas seulement la sauvegarde.
  private openModal(name: string): Phaser.GameObjects.Container {
    this.modalOpen = true;
    document.body.dataset.modal = name;
    return makeModal(this);
  }

  private closeModal(modal: Phaser.GameObjects.Container) {
    modal.destroy();
    this.modalOpen = false;
    delete document.body.dataset.modal;
  }

  // `flipOrder` donné (×10 regardé jusqu'au bout) : les cartes arrivent face cachée et
  // se retournent dans cet ordre (FR-008). Sinon elles sont toutes visibles d'emblée.
  private showResults(
    results: PullResult[], ownedBefore: Readonly<Record<string, number>>, flipOrder?: readonly number[],
  ) {
    const flip = flipOrder !== undefined && results.length > 1;
    const modal = this.openModal(flip ? 'flip' : 'results');
    // Chaque carte affiche le nombre d'exemplaires atteint À CE résultat : deux doublons
    // d'une même salve montrent ×2 puis ×3, pas deux fois le total final.
    const running: Record<string, number> = { ...ownedBefore };
    const counts = results.map(r => (running[r.item.id] = (running[r.item.id] ?? 0) + 1));
    const addOk = () =>
      modal.add(makeButton(this, RESULTS.ok, 'OK', COLORS.btn.primary, () => this.closeModal(modal)).container);
    if (results.length === 1) {
      const r = RESULTS.single;
      modal.add(this.add.text(r.x + r.w / 2, r.y - 40, 'Tu as obtenu…', textStyle(FONT_SIZE.big)).setOrigin(0.5));
      modal.add(makeResultCard(this, r, results[0]!, counts[0]!, true));
      addOk();
      return;
    }
    modal.add(makePanel(this, RESULTS.panel, COLORS.background));
    modal.add(this.add.text(RESULTS.panel.x + RESULTS.panel.w / 2, RESULTS.titleY, 'Tirage ×10', textStyle(FONT_SIZE.big))
      .setOrigin(0.5));
    const faces = results.map((res, i) => makeResultCard(this, resultCardRect(i), res, counts[i]!));
    if (!flip) {
      modal.add(faces);
      addOk();
      return;
    }
    this.playFlip(modal, faces, results, flipOrder, addOk);
  }

  private makeFlipCard(modal: Phaser.GameObjects.Container, r: Rect, face: Phaser.GameObjects.Container): FlipCard {
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    const pivot = this.add.container(cx, cy);
    face.setPosition(-cx, -cy).setVisible(false);
    const g = this.add.graphics();
    g.fillStyle(REVEAL_FX.cardBack, 1).fillRoundedRect(-r.w / 2, -r.h / 2, r.w, r.h, RADIUS);
    g.lineStyle(STROKE.base, COLORS.ink, 1).strokeRoundedRect(-r.w / 2, -r.h / 2, r.w, r.h, RADIUS);
    const mark = this.add.text(0, 0, '?', textStyle(FONT_SIZE.title)).setOrigin(0.5);
    pivot.add([face, g, mark]);
    modal.add(pivot);
    return { pivot, face, back: [g, mark] };
  }

  private playFlip(
    modal: Phaser.GameObjects.Container,
    faces: Phaser.GameObjects.Container[],
    results: PullResult[],
    order: readonly number[],
    addOk: () => void,
  ) {
    const cards = faces.map((face, i) => this.makeFlipCard(modal, resultCardRect(i), face));
    const starIndex = order[order.length - 1]!;
    const star = cards[starIndex]!;
    const t = REVEAL_TIMING;
    const seq = new Sequence(this);
    const show = (c: FlipCard) => {
      c.back.forEach(o => o.setVisible(false));
      c.face.setVisible(true);
    };
    // Liseré de la couleur de la vedette, posé sous la carte (FR-008).
    let highlighted = false;
    const highlight = () => {
      if (highlighted) return;
      highlighted = true;
      const r = resultCardRect(starIndex);
      const g = this.add.graphics();
      const pad = REVEAL_FX.starStroke / 2;
      g.lineStyle(REVEAL_FX.starStroke, COLORS.rarity[results[starIndex]!.item.rarity], 1)
        .strokeRoundedRect(-r.w / 2 - pad, -r.h / 2 - pad, r.w + 2 * pad, r.h + 2 * pad, RADIUS + pad);
      star.pivot.addAt(g, 0);
      modal.bringToTop(star.pivot);
    };
    const turn = (c: FlipCard, ms: number, onShown?: () => void) => {
      seq.tween({
        targets: c.pivot, scaleX: 0, duration: ms / 2, ease: 'Quad.easeIn',
        onComplete: () => {
          show(c);
          onShown?.();
          seq.tween({ targets: c.pivot, scaleX: 1, duration: ms / 2, ease: 'Quad.easeOut' });
        },
      });
    };

    const hint = this.add.text(RESULTS.ok.x + RESULTS.ok.w / 2, RESULTS.ok.y + RESULTS.ok.h / 2,
      'Touche pour tout retourner', textStyle(FONT_SIZE.small, CSS.textFaint)).setOrigin(0.5);
    modal.add(hint);

    let done = false;
    const finish = (tapped: boolean) => {
      if (done) return;
      done = true;
      seq.stop();
      if (tapped) this.sfx.stopAll();
      zone.destroy();
      hint.destroy();
      cards.forEach(c => { show(c); c.pivot.setScale(1); });
      highlight();
      document.body.dataset.modal = 'results';
      addOk();
    };

    let time = 0;
    order.forEach((index, k) => {
      const card = cards[index]!;
      if (k < order.length - 1) {
        seq.at(time, () => turn(card, t.flipCard));
        time += t.flipCard;
        return;
      }
      time += t.flipPause;
      seq.at(time, () => turn(card, t.flipStar / 2, () => {
        highlight();
        seq.tween({ targets: card.pivot, scale: 1.12, duration: t.flipStar / 4, yoyo: true, ease: 'Quad.easeOut' });
      }));
      time += t.flipStar;
    });
    seq.at(time, () => finish(false));
    flipCues(order.length).forEach(c => seq.at(c.at, () => this.sfx.play(c.cue)));
    // Appui pendant le retournement : tout se retourne, OK apparaît ; il ne ferme rien.
    const zone = this.addSkipZone(modal, seq, 0, () => finish(true));
  }

  private dialog(name: string, h: number, title: string): { modal: Phaser.GameObjects.Container; rect: Rect; bodyY: number } {
    const modal = this.openModal(name);
    const rect = dialogRect(h);
    modal.add(makePanel(this, rect));
    const t = this.add.text(rect.x + rect.w / 2, rect.y + DIALOG.padding, title,
      { ...textStyle(FONT_SIZE.button), align: 'center', wordWrap: { width: rect.w - 2 * DIALOG.padding } })
      .setOrigin(0.5, 0);
    modal.add(t);
    return { modal, rect, bodyY: rect.y + DIALOG.padding + t.height + 16 };
  }

  private showRates() {
    if (this.modalOpen) return;
    const vedette = activeBanner(this.progression).featured;
    const { modal, rect, bodyY } = this.dialog('rates', ratesDialogH(vedette !== null), 'Taux par rareté');
    const left = rect.x + DIALOG.padding;
    const right = rect.x + rect.w - DIALOG.padding;
    let y = bodyY;
    for (const r of rarityTable()) {
      const g = this.add.graphics();
      g.fillStyle(COLORS.rarity[r.id], 1).fillCircle(left + 10, y + 11, 10);
      g.lineStyle(STROKE.thin, COLORS.ink, 1).strokeCircle(left + 10, y + 11, 10);
      modal.add(g);
      modal.add(this.add.text(left + 30, y + 11, r.label, textStyle(FONT_SIZE.body)).setOrigin(0, 0.5));
      modal.add(this.add.text(right, y + 11, formatPercent(ratePercent(r.id)), textStyle(FONT_SIZE.body)).setOrigin(1, 0.5));
      y += 34;
    }
    const rules = this.add.text(left, y + 6,
      '×10 : au moins un Rare ou mieux garanti.\n'
      + `Légendaire ou mieux garanti au plus tard au ${GACHA_CONFIG.pityThreshold}ᵉ tirage ; `
      + 'le compteur repart de zéro à chaque Légendaire ou Ultra rare.',
      { ...textStyle(FONT_SIZE.body, CSS.textDim), wordWrap: { width: right - left }, lineSpacing: 2 });
    modal.add(rules);
    if (vedette) {
      // Bannière vedette (006, FR-016) : sa chance par tirage et la règle du 50/50.
      y = rules.y + rules.height + 16;
      const label = rarityLabel(vedette.rarity);
      modal.add(this.add.text(left, y, `Vedette\u00a0: ${vedette.name}`, textStyle(FONT_SIZE.body)));
      modal.add(this.add.text(right, y, formatPercent(featuredRatePercent(vedette)), textStyle(FONT_SIZE.body)).setOrigin(1, 0));
      modal.add(this.add.text(left, y + 26,
        `Quand un ${label} tombe ici, une chance sur deux que ce soit ${vedette.name}. `
        + `Sinon, le prochain ${label} de cette bannière sera ${vedette.name}.`,
        { ...textStyle(FONT_SIZE.body, CSS.textDim), wordWrap: { width: right - left }, lineSpacing: 2 }));
    }
    const [close] = dialogButtons(rect, 1);
    modal.add(makeButton(this, close!, 'Fermer', COLORS.btn.secondary, () => this.closeModal(modal)).container);
  }

  // Collection (003) : tout le catalogue, et le seul endroit où dépenser ses éclats.
  private showCollection() {
    if (this.modalOpen) return;
    const modal = this.openModal('collection');
    const p = this.progression;
    const panel = RESULTS.panel;
    const cx = panel.x + panel.w / 2;
    modal.add(makePanel(this, panel, COLORS.background));
    modal.add(this.add.text(cx, COLLECTION.titleY, isComplete(p) ? 'Collection complète !' : 'Collection',
      textStyle(FONT_SIZE.big)).setOrigin(0.5));
    modal.add(makeShardAmount(this, cx, COLLECTION.balanceY,
      `${formatAmount(p.shards)}\u00a0éclats · ${distinctOwned(p)} / ${CATALOGUE.length}`, 0.5, FONT_SIZE.body));

    // Résumé par rareté : il sert aussi de légende aux couleurs des pastilles.
    const summary = raritySummary(p);
    const slot = panel.w / summary.length;
    summary.forEach((s, i) => {
      const x = panel.x + slot * i + slot / 2;
      const g = this.add.graphics();
      g.fillStyle(COLORS.rarity[s.rarity], 1).fillCircle(x - 16, COLLECTION.summaryY, 7);
      g.lineStyle(STROKE.thin, COLORS.ink, 1).strokeCircle(x - 16, COLLECTION.summaryY, 7);
      modal.add(g);
      modal.add(this.add.text(x - 5, COLLECTION.summaryY, `${s.owned}/${s.total}`, textStyle(FONT_SIZE.small))
        .setOrigin(0, 0.5));
    });

    collectionEntries(p).forEach((entry, i) => modal.add(this.makeCollectionCell(collectionCellRect(i), entry, modal)));
    modal.add(makeButton(this, COLLECTION.close, 'Fermer', COLORS.btn.neutral, () => this.closeModal(modal)).container);
  }

  private makeCollectionCell(r: Rect, entry: CollectionEntry, modal: Phaser.GameObjects.Container) {
    const { item, count, cost, affordable } = entry;
    const owned = count > 0;
    const c = this.add.container(0, 0);
    // Manquant : grisé, nom visible (clarification de la spec).
    c.add(makePanel(this, r, owned ? COLORS.panel : COLORS.btn.disabled));
    const disc = this.add.graphics();
    disc.fillStyle(COLORS.rarity[item.rarity], owned ? 1 : 0.45).fillCircle(r.x + 18, r.y + r.h / 2, 10);
    disc.lineStyle(STROKE.thin, COLORS.ink, owned ? 1 : 0.45).strokeCircle(r.x + 18, r.y + r.h / 2, 10);
    c.add(disc);
    c.add(this.add.text(r.x + 34, r.y + 5, item.name, textStyle(FONT_SIZE.small, owned ? CSS.text : CSS.textDim)));
    if (owned) {
      const kind = item.kind === 'character' ? 'Personnage' : 'Créature';
      c.add(this.add.text(r.x + 34, r.y + 24, `${kind} · ×${count}`, textStyle(FONT_SIZE.micro, CSS.textDim)));
      return c;
    }
    // Coût mis en évidence s'il est abordable, estompé sinon (FR-004).
    c.add(makeShardAmount(this, r.x + 34, r.y + 30, formatAmount(cost), 0).setAlpha(affordable ? 1 : 0.4));
    if (affordable) {
      const zone = this.add.zone(r.x, r.y, r.w, r.h).setOrigin(0).setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => {
        this.closeModal(modal);
        this.showExchangeConfirm(item);
      });
      c.add(zone);
    }
    return c;
  }

  private showExchangeConfirm(item: Item) {
    const cost = SHARD_COST[item.rarity];
    // Insécables : le montant reste collé à son unité et le « ? » au mot qui précède.
    const { modal, rect } = this.dialog('confirm-exchange', CONFIRM_DIALOG_H,
      `Échanger ${item.name} contre ${formatAmount(cost)}\u00a0éclats\u00a0?`);
    const [confirm, cancel] = dialogButtons(rect, 2);
    modal.add(makeButton(this, confirm!, 'Échanger', COLORS.btn.primary, () => {
      const before = this.progression.owned;
      const outcome = exchange(this.progression, item.id);
      this.closeModal(modal);
      if (!outcome.ok) return;
      this.progression = outcome.progression;
      // Sauvegardé avant d'afficher, comme un tirage.
      this.persist();
      this.refresh();
      this.showResults([{ item: outcome.item, isNew: true, guaranteed: false, pity: false, shards: 0, featuredGuarantee: false }], before);
    }).container);
    modal.add(makeButton(this, cancel!, 'Annuler', COLORS.btn.neutral, () => {
      this.closeModal(modal);
      this.showCollection();
    }).container);
  }

  private showResetConfirm() {
    if (this.modalOpen) return;
    const { modal, rect } = this.dialog('confirm-reset', CONFIRM_DIALOG_H,
      `Tout effacer et repartir avec ${formatAmount(GACHA_CONFIG.startingCurrency)}\u00a0pièces\u00a0?`);
    const [erase, cancel] = dialogButtons(rect, 2);
    modal.add(makeButton(this, erase!, 'Effacer', COLORS.btn.danger, () => {
      this.progression = reset();
      this.persist();
      this.refresh();
      this.closeModal(modal);
    }).container);
    modal.add(makeButton(this, cancel!, 'Annuler', COLORS.btn.neutral, () => this.closeModal(modal)).container);
  }

  private showWarning() {
    const { modal, rect } = this.dialog('warning', WARNING_DIALOG_H,
      'Ta sauvegarde n’a pas pu être relue : nouvelle partie.');
    const [ok] = dialogButtons(rect, 1);
    modal.add(makeButton(this, ok!, 'OK', COLORS.btn.primary, () => this.closeModal(modal)).container);
  }
}
