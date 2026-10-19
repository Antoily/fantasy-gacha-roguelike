import Phaser from 'phaser';
import { CATALOGUE } from '../data/catalogue';
import { GACHA_CONFIG } from '../data/gachaConfig';
import { formatAmount } from '../logic/format';
import type { PullResult } from '../logic/gacha';
import { canAfford, distinctOwned, pull, reset, type Progression, type PullCount } from '../logic/progression';
import { formatPercent, ratePercent, rarityTable } from '../logic/rates';
import { SAVE_KEY, serializeSave, type SaveStatus } from '../logic/save';
import {
  CONFIRM_DIALOG_H, DIALOG, GACHA, RATES_DIALOG_H, RESULTS, WARNING_DIALOG_H,
  dialogButtons, dialogRect, resultCardRect, type Rect,
} from '../ui/layout';
import { COLORS, CSS, FONT_SIZE, STROKE } from '../ui/theme';
import { makeButton, makeModal, makePanel, makeResultCard, textStyle, type Button } from '../ui/widgets';

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

  private openModal(): Phaser.GameObjects.Container {
    this.modalOpen = true;
    return makeModal(this);
  }

  private closeModal(modal: Phaser.GameObjects.Container) {
    modal.destroy();
    this.modalOpen = false;
  }

  private showResults(results: PullResult[], ownedBefore: Readonly<Record<string, number>>) {
    const modal = this.openModal();
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

  private dialog(h: number, title: string): { modal: Phaser.GameObjects.Container; rect: Rect; bodyY: number } {
    const modal = this.openModal();
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
    const { modal, rect, bodyY } = this.dialog(RATES_DIALOG_H, 'Taux par rareté');
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
    modal.add(this.add.text(left, y + 6, '×10 : au moins un Rare ou mieux garanti',
      { ...textStyle(FONT_SIZE.body, CSS.textDim), wordWrap: { width: right - left } }));
    const [close] = dialogButtons(rect, 1);
    modal.add(makeButton(this, close!, 'Fermer', COLORS.btn.secondary, () => this.closeModal(modal)).container);
  }

  private showResetConfirm() {
    if (this.modalOpen) return;
    const { modal, rect } = this.dialog(CONFIRM_DIALOG_H,
      `Tout effacer et repartir avec ${formatAmount(GACHA_CONFIG.startingCurrency)} pièces ?`);
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
    const { modal, rect } = this.dialog(WARNING_DIALOG_H,
      'Ta sauvegarde n’a pas pu être relue : nouvelle partie.');
    const [ok] = dialogButtons(rect, 1);
    modal.add(makeButton(this, ok!, 'OK', COLORS.btn.primary, () => this.closeModal(modal)).container);
  }
}
