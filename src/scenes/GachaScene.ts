import Phaser from 'phaser';
import { CATALOGUE } from '../data/catalogue';
import type { Item } from '../data/catalogue';
import { GACHA_CONFIG, SHARD_COST } from '../data/gachaConfig';
import { formatAmount } from '../logic/format';
import type { PullResult } from '../logic/gacha';
import { collectionEntries, isComplete, raritySummary, type CollectionEntry } from '../logic/collection';
import {
  canAfford, distinctOwned, exchange, pull, pullsUntilPity, reset, type Progression, type PullCount,
} from '../logic/progression';
import { formatPercent, ratePercent, rarityTable } from '../logic/rates';
import { SAVE_KEY, serializeSave, type SaveStatus } from '../logic/save';
import {
  COLLECTION, CONFIRM_DIALOG_H, DIALOG, GACHA, RATES_DIALOG_H, RESULTS, WARNING_DIALOG_H,
  collectionCellRect, dialogButtons, dialogRect, resultCardRect, type Rect,
} from '../ui/layout';
import { COLORS, CSS, FONT_SIZE, STROKE } from '../ui/theme';
import {
  makeButton, makeModal, makePanel, makeResultCard, makeShardAmount, makeShardIcon, textStyle, type Button,
} from '../ui/widgets';

interface GachaData {
  progression: Progression;
  status: SaveStatus;
}

// L'unique écran de la feature 001. Toute règle vit dans src/logic : la scène affiche
// l'état, relaie les appuis et sauvegarde l'état complet d'un bloc.
export class GachaScene extends Phaser.Scene {
  private progression!: Progression;
  private modalOpen = false;
  private currencyText!: Phaser.GameObjects.Text;
  private counterText!: Phaser.GameObjects.Text;
  private shardsText!: Phaser.GameObjects.Text;
  private pityText!: Phaser.GameObjects.Text;
  private shortageText!: Phaser.GameObjects.Text;
  private singleButton!: Button;
  private tenButton!: Button;

  constructor() {
    super('Gacha');
  }

  create(data: GachaData) {
    this.progression = data.progression;
    this.modalOpen = false;
    this.drawHeader();
    this.drawOrb();

    this.singleButton = makeButton(this, GACHA.pullSingle,
      `Tirer ×1 — ${formatAmount(GACHA_CONFIG.costSingle)}`, COLORS.btn.primary, () => this.onPull(1));
    this.tenButton = makeButton(this, GACHA.pullTen,
      `Tirer ×10 — ${formatAmount(GACHA_CONFIG.costTen)}`, COLORS.btn.primary, () => this.onPull(10),
      'Un Rare ou mieux garanti');
    this.shortageText = this.add.text(GACHA.pullSingle.x + GACHA.pullSingle.w / 2, GACHA.shortageMessageY, '',
      { ...textStyle(FONT_SIZE.body, CSS.textDim), align: 'center', wordWrap: { width: GACHA.pullSingle.w } })
      .setOrigin(0.5, 0);

    this.pityText = this.add.text(GACHA.orb.x, GACHA.pityLineY, '', textStyle(FONT_SIZE.body, CSS.textDim)).setOrigin(0.5);
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
    const g = this.add.graphics();
    g.fillStyle(COLORS.ink, 1).fillCircle(x + 5, y + 5, r);
    g.fillStyle(COLORS.rarity.ultra, 1).fillCircle(x, y, r);
    g.fillStyle(COLORS.rarity.rare, 1).fillCircle(x, y, r * 0.7);
    g.fillStyle(COLORS.coin, 1).fillCircle(x, y, r * 0.4);
    g.lineStyle(STROKE.thick, COLORS.ink, 1).strokeCircle(x, y, r);
    this.add.text(x, y, '?', textStyle(FONT_SIZE.title * 1.6)).setOrigin(0.5);
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
    this.showResults(outcome.results, before);
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

  private showResults(results: PullResult[], ownedBefore: Readonly<Record<string, number>>) {
    const modal = this.openModal('results');
    // Chaque carte affiche le nombre d'exemplaires atteint À CE résultat : deux doublons
    // d'une même salve montrent ×2 puis ×3, pas deux fois le total final.
    const running: Record<string, number> = { ...ownedBefore };
    const counts = results.map(r => (running[r.item.id] = (running[r.item.id] ?? 0) + 1));
    if (results.length === 1) {
      const r = RESULTS.single;
      modal.add(this.add.text(r.x + r.w / 2, r.y - 40, 'Tu as obtenu…', textStyle(FONT_SIZE.big)).setOrigin(0.5));
      modal.add(makeResultCard(this, r, results[0]!, counts[0]!, true));
    } else {
      modal.add(makePanel(this, RESULTS.panel, COLORS.background));
      modal.add(this.add.text(RESULTS.panel.x + RESULTS.panel.w / 2, RESULTS.titleY, 'Tirage ×10', textStyle(FONT_SIZE.big))
        .setOrigin(0.5));
      results.forEach((res, i) => modal.add(makeResultCard(this, resultCardRect(i), res, counts[i]!)));
    }
    modal.add(makeButton(this, RESULTS.ok, 'OK', COLORS.btn.primary, () => this.closeModal(modal)).container);
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
    const { modal, rect, bodyY } = this.dialog('rates', RATES_DIALOG_H, 'Taux par rareté');
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
      this.showResults([{ item: outcome.item, isNew: true, guaranteed: false, pity: false, shards: 0 }], before);
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
