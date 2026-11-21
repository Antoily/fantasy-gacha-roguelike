import Phaser from 'phaser';
import { CATALOGUE } from '../data/catalogue';
import type { Item } from '../data/catalogue';
import { GACHA_CONFIG, RARITIES, SHARD_COST, type Rarity } from '../data/gachaConfig';
import { TRANSITIONS, WINDOW } from '../data/ambienceConfig';
import { CARD_MOTION } from '../data/revealConfig';
import { SHARDS_AFTER_COINS, SPLASH_FADE_MS } from '../data/sounds';
import { formatAmount } from '../logic/format';
import { rollAmount } from '../logic/motion';
import type { PullResult } from '../logic/gacha';
import { collectionEntries, isComplete, raritySummary, type CollectionEntry } from '../logic/collection';
import {
  activeBanner, canAfford, cycleBanner, distinctOwned, exchange, hasFeaturedGuarantee, pull, pullsUntilPity, reset,
  type Progression, type PullCount,
} from '../logic/progression';
import { featuredRatePercent, formatPercent, ratePercent, rarityTable } from '../logic/rates';
import { presentations } from '../logic/presentation';
import { flipSchedule, planReveal } from '../logic/reveal';
import { SETTINGS_KEY, serializeSettings, type Settings } from '../logic/settings';
import { SAVE_KEY, serializeSave, type SaveStatus } from '../logic/save';
import { Ambience, prefersReducedMotion } from '../ui/ambience';
import { ART_READY, uiImage } from '../ui/art';
import { R } from '../ui/display';
import {
  BANNER, COLLECTION, CONFIRM_DIALOG_H, DIALOG, GACHA, HEIGHT, RESULTS, REVEAL, SHEET, WARNING_DIALOG_H, WIDTH,
  bannerTextArea, center, ratesDialogH, collectionCellRect, dialogButtons, dialogRect, resultCardRect, type Rect,
} from '../ui/layout';
import { Particles } from '../ui/particles';
import { celebrateSingle, glossBest, playFlip, playReveal, sparkleBest, type Sequence } from '../ui/reveal';
import { playSplash, splashSound } from '../ui/splash';
import { Sfx } from '../ui/sfx';
import { ART_FX, COLORS, CSS, FONT_SIZE, RADIUS, STROKE, WINDOW_FX } from '../ui/theme';
import {
  Opening, fitWidth, makeButton, makeEmblem, setButtonSound, makeModal, makeOrb, makePanel, makePortrait, makeResultCard,
  makeShardAmount, makeShardIcon, makeSheet, textStyle, type Button,
} from '../ui/widgets';

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
  private ambience!: Ambience;
  // Horloge du jeu : somme des pas de Phaser, celle des minuteries et des tweens. Les tests
  // chronométrés la lisent (dataset.clockTap, dataset.clockModal) : sur une machine chargée,
  // Phaser borne son pas et le jeu tourne au ralenti ; une mesure en temps réel jugeait la
  // machine, pas la mise en scène.
  private clockMs = 0;
  private reducedMotion = false;
  // Image où la dernière fenêtre s'est fermée : une fenêtre ouverte dans la même la remplace.
  private closedFrame = -1;
  // Montants de l'en-tête tels qu'affichés, qui rattrapent la partie en défilant (FR-015).
  private shown = { currency: 0, shards: 0 };
  private rolls: Partial<Record<'currency' | 'shards', Phaser.Tweens.Tween>> = {};
  private coinIcon: Phaser.GameObjects.Image | null = null;
  private muteIcon!: Phaser.GameObjects.Graphics;
  // Icônes illustrées du son (007), à la place du dessin quand elles existent.
  private muteImages: { on: Phaser.GameObjects.Image; off: Phaser.GameObjects.Image } | null = null;
  private bannerPortrait: Phaser.GameObjects.Container | null = null;
  // Bandeaux clairs sous les textes posés sur le fond (FR-008), redessinés à chaque refresh.
  private textPlates!: Phaser.GameObjects.Graphics;
  private currencyText!: Phaser.GameObjects.Text;
  private shardIcon!: Phaser.GameObjects.Image | Phaser.GameObjects.Graphics;
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
    // Rendu à la densité de l'écran (ADR 0007) : la scène reste en coordonnées 360 × 640.
    this.cameras.main.setZoom(R).centerOn(WIDTH / 2, HEIGHT / 2);
    uiImage(this, 'bg-main', WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT);
    // Couche de l'ambiance (007, FR-013) : juste au-dessus du fond, sous toute l'interface.
    const ambienceLayer = this.add.container(0, 0);
    this.progression = data.progression;
    this.modalOpen = false;
    this.sfx = new Sfx(this, data.settings.muted);
    this.clockMs = 0;
    this.events.on(Phaser.Scenes.Events.UPDATE, (_time: number, delta: number) => {
      this.clockMs += delta;
    });
    this.input.on(Phaser.Input.Events.POINTER_UP, () => {
      document.body.dataset.clockTap = String(Math.round(this.clockMs));
    });
    setButtonSound(cue => this.sfx.play(cue));
    this.drawHeader();
    this.drawOrb();
    this.reducedMotion = prefersReducedMotion();
    this.ambience = new Ambience(this, ambienceLayer, this.orb, this.reducedMotion);
    this.drawMuteButton();
    this.drawBannerSelector();

    this.singleButton = makeButton(this, GACHA.pullSingle,
      `Tirer ×1 — ${formatAmount(GACHA_CONFIG.costSingle)}`, COLORS.btn.primary, () => this.onPull(1));
    this.tenButton = makeButton(this, GACHA.pullTen,
      `Tirer ×10 — ${formatAmount(GACHA_CONFIG.costTen)}`, COLORS.btn.primary, () => this.onPull(10),
      'Un Rare ou mieux garanti');
    // Reflet des tirages payables (007, révision du 2026-11-13 : FR-021), montré par setGlow.
    this.ambience.addGloss('single', GACHA.pullSingle, this.singleButton.visual, 0);
    this.ambience.addGloss('ten', GACHA.pullTen, this.tenButton.visual, 1);
    // Les bandeaux AVANT les textes qu'ils portent : créés après, ils recouvraient le message de
    // pénurie (ordre d'affichage = ordre de création), le seul qui dit quoi faire.
    this.textPlates = this.add.graphics();
    this.shortageText = this.add.text(GACHA.pullSingle.x + GACHA.pullSingle.w / 2, GACHA.shortageMessageY, '',
      { ...textStyle(FONT_SIZE.body, CSS.textDim), align: 'center', wordWrap: { width: GACHA.pullSingle.w } })
      .setOrigin(0.5, 0);
    this.pityText = this.add.text(GACHA.orb.x, GACHA.pityLineY, '', textStyle(FONT_SIZE.body, CSS.textDim)).setOrigin(0.5);
    this.featuredText = this.add.text(GACHA.orb.x, GACHA.featuredLineY, '', textStyle(FONT_SIZE.body)).setOrigin(0.5);
    makeButton(this, GACHA.collection, 'Collection', COLORS.btn.secondary, () => this.showCollection());
    makeButton(this, GACHA.rates, 'Taux', COLORS.btn.secondary, () => this.showRates());
    makeButton(this, GACHA.reset, 'Recommencer', COLORS.btn.neutral, () => this.showResetConfirm());

    this.shown = { currency: this.progression.currency, shards: this.progression.shards };
    this.drawAmount('currency');
    this.drawAmount('shards');
    this.refresh();
    // Les illustrations arrivent juste après l'écran (SC-004) : le portrait de la vedette suit.
    const onArt = () => this.refresh();
    this.game.events.on(ART_READY, onArt);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off(ART_READY, onArt));
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
    this.coinIcon = uiImage(this, 'icon-coin', coinX, cy, 30, 30);
    if (!this.coinIcon) {
      const coin = this.add.graphics();
      coin.fillStyle(COLORS.coin, 1).fillCircle(coinX, cy, 12);
      coin.lineStyle(STROKE.thin, COLORS.ink, 1).strokeCircle(coinX, cy, 12);
    }
    this.currencyText = this.add.text(coinX + 20, cy, '', textStyle(FONT_SIZE.big)).setOrigin(0, 0.5);
    // Éclats calés à droite : le nombre d'éléments possédés, qui était là, n'est plus que
    // dans la collection (003, FR-013). refresh() place l'icône devant le montant.
    this.shardsText = this.add.text(h.x + h.w - 16, cy, '', textStyle(FONT_SIZE.big)).setOrigin(1, 0.5);
    this.shardIcon = makeShardIcon(this, 0, cy, 12);
  }

  private drawOrb() {
    const { x, y, r } = GACHA.orb;
    this.orb = makeOrb(this, r).setPosition(x, y);
  }

  // Bouton son (005) : haut-parleur avec ondes, ou barré quand le son est coupé.
  private drawMuteButton() {
    const r = GACHA.mute;
    // Pendant une fenêtre, le voile le recouvre : il ne reçoit pas l'appui.
    const button = makeButton(this, r, '', COLORS.btn.neutral, () => {
      this.sfx.setMuted(!this.sfx.isMuted);
      // Le bruit d'appui confirme le son rétabli ; coupé, rien ne sonne (FR-011).
      this.sfx.play('tap');
      this.persistSettings();
      this.drawMuteIcon();
    }, undefined, null);
    this.muteIcon = this.add.graphics();
    const { x, y } = center(r);
    const on = uiImage(this, 'icon-sound-on', x, y, 30, 30);
    const off = uiImage(this, 'icon-sound-off', x, y, 30, 30);
    this.muteImages = on && off ? { on, off } : null;
    // L'icône s'écrase avec le bouton (FR-021).
    for (const icon of [this.muteIcon, on, off]) if (icon) button.attach(icon);
    this.drawMuteIcon();
  }

  private drawMuteIcon() {
    const { x, y } = center(GACHA.mute);
    const g = this.muteIcon.clear();
    if (this.muteImages) {
      this.muteImages.on.setVisible(!this.sfx.isMuted);
      this.muteImages.off.setVisible(this.sfx.isMuted);
      return;
    }
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
    const { y } = center(GACHA.banner);
    this.bannerName = this.add.text(0, y - 8, '', textStyle(FONT_SIZE.body)).setOrigin(0.5);
    this.bannerDetail = this.add.text(0, y + 10, '', textStyle(FONT_SIZE.micro, CSS.textDim)).setOrigin(0.5);
    const V = Phaser.Math.Vector2;
    for (const [r, step] of [[GACHA.bannerPrev, -1], [GACHA.bannerNext, 1]] as const) {
      const button = makeButton(this, r, '', COLORS.btn.neutral, () => this.onCycleBanner(step), undefined, 'swish');
      const c = center(r);
      // La flèche s'écrase avec son bouton (FR-021).
      const arrow = uiImage(this, 'icon-arrow', c.x, c.y, 28, 28)?.setFlipX(step < 0);
      if (arrow) {
        button.attach(arrow);
        continue;
      }
      const tip = step * 6;
      button.attach(this.add.graphics().fillStyle(COLORS.ink, 1)
        .fillPoints([new V(c.x + tip, c.y), new V(c.x - tip, c.y - 8), new V(c.x - tip, c.y + 8)], true));
    }
  }

  // Sans garde modalOpen : le voile d'une fenêtre recouvre les flèches (vérifié par
  // l'e2e « les flèches ne réagissent pas sous une fenêtre », mutation survivante).
  private onCycleBanner(step: 1 | -1) {
    this.progression = cycleBanner(this.progression, step);
    this.persist();
    this.refresh();
    this.slideBanner(step);
  }

  // Le contenu du bandeau entre depuis le côté de la flèche touchée (007, FR-016).
  private slideBanner(step: 1 | -1) {
    if (this.reducedMotion) return;
    const offset = step * TRANSITIONS.slideOffset;
    for (const target of [this.bannerName, this.bannerDetail, this.bannerPortrait]) {
      if (!target) continue;
      this.tweens.killTweensOf(target);
      this.tweens.add({
        targets: target, x: { from: target.x + offset, to: target.x }, alpha: { from: 0, to: 1 },
        duration: TRANSITIONS.slide, ease: 'Cubic.Out',
      });
    }
    const vedette = activeBanner(this.progression).featured;
    const portrait = this.bannerPortrait;
    if (!vedette || !portrait) return;
    // La vedette surgit, cernée d'un anneau de sa rareté qui s'élargit (révision du 2026-11-13).
    this.tweens.add({ targets: portrait, scale: { from: 0, to: 1 }, duration: TRANSITIONS.portraitPop, ease: 'Back.Out' });
    const ring = this.add.graphics().setPosition(GACHA.banner.x + BANNER.portraitX, portrait.y);
    ring.lineStyle(STROKE.thick, COLORS.rarity[vedette.rarity], 1).strokeCircle(0, 0, BANNER.portraitD / 2);
    this.tweens.add({
      targets: ring, scale: TRANSITIONS.portraitRing.scale, alpha: 0, duration: TRANSITIONS.portraitRing.duration,
      ease: 'Quad.Out', onComplete: () => ring.destroy(),
    });
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
    this.showAmounts();
    const left = pullsUntilPity(p);
    this.pityText.setText(left === 1
      ? 'Légendaire garanti au prochain tirage'
      : `Légendaire garanti dans ${left} tirages au plus`);
    const banner = activeBanner(p);
    // Signal pour l'e2e : la bannière active, sans lire le canvas.
    document.body.dataset.banner = banner.id;
    const vedette = banner.featured;
    // Portrait de la vedette dans le bandeau (007, FR-005) ; le texte se centre à côté.
    this.bannerPortrait?.destroy();
    this.bannerPortrait = null;
    const b = GACHA.banner;
    const area = bannerTextArea(vedette !== null);
    const textX = area.x + area.w / 2;
    this.bannerName.setX(textX);
    this.bannerDetail.setX(textX);
    // L'ambiance prend la couleur de la vedette (007, révision du 2026-11-13 : FR-023).
    this.ambience.setTint(vedette?.rarity ?? null);
    if (vedette) {
      const count = p.owned[vedette.id] ?? 0;
      // Portrait dans un conteneur centré sur lui : il surgit autour de son centre (slideBanner).
      const px = b.x + BANNER.portraitX;
      const py = b.y + b.h / 2;
      this.bannerPortrait = this.add.container(px, py, [
        makePortrait(this, px, py, BANNER.portraitD, vedette, true).setPosition(-px, -py),
      ]);
      this.bannerName.setText(vedette.name);
      // « non obtenu » plutôt que « pas encore obtenu » (qui débordait avec Comic Sans MS) :
      // la ligne garde sa taille, même avec une police de repli plus large.
      this.bannerDetail.setText(`${rarityLabel(vedette.rarity)} · ${count > 0 ? `possédé ×${count}` : 'non obtenu'}`);
    } else {
      this.bannerName.setText('Bannière standard');
      this.bannerDetail.setText('Tous les éléments, taux de base');
    }
    // Filet de sécurité si la police embarquée manque : le repli est plus large (ADR 0008).
    fitWidth(this.bannerName, FONT_SIZE.body, area.w);
    fitWidth(this.bannerDetail, FONT_SIZE.micro, area.w);
    // Tournure sans accord : la vedette peut être féminine (Marquise Cerise).
    this.featuredText.setText(vedette && hasFeaturedGuarantee(p)
      ? `Prochain ${rarityLabel(vedette.rarity)} garanti\u00a0: ${vedette.name}`
      : '');
    document.body.dataset.featuredLine = this.featuredText.text;
    this.drawTextPlates();
    const single = canAfford(p, 1);
    const ten = canAfford(p, 10);
    this.singleButton.setEnabled(single);
    this.tenButton.setEnabled(ten);
    this.ambience.setGlow(
      [...(single ? [GACHA.pullSingle] : []), ...(ten ? [GACHA.pullTen] : [])],
      [...(single ? ['single'] : []), ...(ten ? ['ten'] : [])],
    );
    this.shortageText.setText(
      !single
        // Espaces insécables dans les guillemets : un « » ne doit jamais finir seul sur sa ligne.
        ? 'Plus assez de pièces pour tirer. «\u00a0Recommencer\u00a0» remet le stock de départ.'
        : !ten
          ? `Pas assez de pièces pour un ×10 (il en faut ${formatAmount(GACHA_CONFIG.costTen)}).`
          : '',
    );
  }

  // Montants (007, FR-015) : ils ne défilent que sur l'écran visible ; sous une fenêtre,
  // l'ancien montant reste affiché et défile à la fermeture (closeModal).
  private showAmounts() {
    if (this.modalOpen) return;
    const coins = this.rollTo('currency', this.progression.currency, this.coinIcon);
    // Éclats après les pièces quand les deux défilent : leurs tintements se suivent (FR-022).
    this.rollTo('shards', this.progression.shards,
      this.shardIcon instanceof Phaser.GameObjects.Image ? this.shardIcon : null, coins ? SHARDS_AFTER_COINS : 0);
  }

  // Une fenêtre en remplace souvent une autre dans la même image (révélation → résultats) :
  // on attend l'image suivante pour savoir si l'écran est vraiment revenu.
  private showAmountsSoon() {
    this.time.delayedCall(0, () => this.showAmounts());
  }

  // Vrai si le montant défile (et tinte).
  private rollTo(key: 'currency' | 'shards', to: number, icon: Phaser.GameObjects.Image | null, delay = 0): boolean {
    // Un montant qui change en plein défilement repart de la valeur affichée.
    const from = this.shown[key];
    if (from === to) return false;
    // Pièces ou éclats qui tintent le temps du défilement (005, FR-012) ; les pièces
    // descendent quand le solde baisse, montent quand il monte (FR-022).
    if (key === 'currency') this.sfx.play('coins', { kind: 'coins', dir: to < from ? 'down' : 'up' });
    else this.sfx.play('shards', { kind: 'shards', delay });
    this.rolls[key]?.remove();
    const set = (n: number) => {
      this.shown[key] = n;
      this.drawAmount(key);
    };
    if (this.reducedMotion) {
      set(to);
      return true;
    }
    this.rolls[key] = this.tweens.addCounter({
      from: 0, to: 1, duration: TRANSITIONS.roll, ease: 'Cubic.Out',
      onUpdate: tw => set(rollAmount(from, to, tw.getValue() ?? 0)),
      onComplete: () => set(to),
    });
    if (!icon) return true;
    // Échelle de repos mémorisée : un rebond coupé en route ne doit pas la fausser.
    const base = (icon.getData('baseScale') as number | undefined) ?? icon.scaleX;
    icon.setData('baseScale', base);
    this.tweens.killTweensOf(icon);
    icon.setScale(base);
    this.tweens.add({ targets: icon, scale: base * TRANSITIONS.iconBounce, duration: TRANSITIONS.roll / 4, yoyo: true, ease: 'Quad.Out' });
    return true;
  }

  private drawAmount(key: 'currency' | 'shards') {
    const n = this.shown[key];
    // Signal pour l'e2e : le montant affiché, sans lire le canvas.
    if (key === 'currency') {
      this.currencyText.setText(formatAmount(n));
      document.body.dataset.shownCurrency = String(n);
      return;
    }
    this.shardsText.setText(formatAmount(n));
    this.shardIcon.setX(this.shardsText.x - this.shardsText.width - 16);
    document.body.dataset.shownShards = String(n);
  }

  // Un bandeau par bloc de texte non vide, à la largeur du texte.
  private drawTextPlates() {
    const g = this.textPlates.clear().fillStyle(ART_FX.textPlate, ART_FX.textPlateAlpha);
    const lines = [this.pityText, this.featuredText].filter(t => t.text !== '');
    if (lines.length > 0) {
      const w = Math.max(...lines.map(t => t.width)) + 24;
      const top = Math.min(...lines.map(t => t.y - t.height / 2)) - 4;
      const bottom = Math.max(...lines.map(t => t.y + t.height / 2)) + 4;
      g.fillRoundedRect(GACHA.orb.x - w / 2, top, w, bottom - top, (bottom - top) / 2 > 12 ? 12 : (bottom - top) / 2);
    }
    const s = this.shortageText;
    if (s.text !== '') g.fillRoundedRect(s.x - s.width / 2 - 12, s.y - 4, s.width + 24, s.height + 8, 12);
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
    // Fenêtre d'abord : le solde ne défile qu'au retour sur l'écran (FR-015).
    this.showReveal(outcome.results, before);
    this.refresh();
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
      // Présentations plein écran (007, FR-003), même quand la révélation est passée : au ×1
      // avant la carte, au ×10 par-dessus les résultats, dans l'ordre de retournement.
      const queue = presentations(results, plan.flipOrder);
      const counts = runningCounts(results, ownedBefore);
      if (results.length === 1) {
        this.showSplashes(queue, results, counts, () => this.showResults(results, ownedBefore, { night: true }));
        return;
      }
      // Passer montre tout de suite toutes les cartes, déjà retournées (FR-006).
      this.showResults(results, ownedBefore, {
        night: true, flipOrder: skipped ? undefined : plan.flipOrder,
        onShown: () => this.showSplashes(queue, results, counts, () => {}),
      });
    };
    const seq = playReveal(this, modal, plan, SKIP_ARM_MS, (cue, variant, delay) => this.sfx.play(cue, variant, delay), () => finish(false),
      this.sfx.leadMs);
    this.addSkipZone(modal, seq, SKIP_ARM_MS, () => finish(true));
  }

  // Présentations à la suite (007) ; `done` quand la dernière est fermée. Au ×1, aucune
  // fenêtre n'est ouverte dessous : le verrou reste tenu jusqu'à la carte.
  private showSplashes(queue: readonly number[], results: PullResult[], counts: readonly number[], done: () => void) {
    const under = document.body.dataset.modal;
    const next = (i: number) => {
      if (i >= queue.length) {
        if (under) this.markModal(under);
        else {
          delete document.body.dataset.modal;
          this.modalOpen = false;
          this.ambience.setActive(true);
          this.showAmountsSoon();
        }
        done();
        return;
      }
      const index = queue[i]!;
      this.modalOpen = true;
      this.ambience.setActive(false);
      this.markModal('splash');
      delete document.body.dataset.skip;
      document.body.dataset.splash = results[index]!.item.id;
      const modal = this.add.container(0, 0).setDepth(200);
      // Voile transparent : rien de ce qui est dessous ne réagit pendant la présentation.
      modal.add(this.add.rectangle(0, 0, WIDTH, HEIGHT, COLORS.ink, 0).setOrigin(0).setInteractive());
      // La nuit tombe en fondu sur les résultats du ×10 ; une présentation qui suit une autre
      // s'ouvre sous elle, qui s'efface par-dessus.
      const options = { reduced: this.reducedMotion, fadeIn: i === 0 && under !== undefined };
      // Fanfare d'entrée (005, FR-021), éteinte en fondu quand le joueur ferme.
      this.sfx.play('splash', splashSound(results[index]!.item.rarity, this.reducedMotion));
      const splash = playSplash(this, modal, results[index]!, counts[index]!, options, () => {
        this.sfx.fade('splash', SPLASH_FADE_MS);
        splash.leave();
        delete document.body.dataset.splash;
        delete document.body.dataset.skip;
        next(i + 1);
      });
    };
    next(0);
  }

  // Zone plein écran au-dessus de tout le contenu de la fenêtre.
  private addSkipZone(modal: Phaser.GameObjects.Container, seq: Sequence, armMs: number, onTap: () => void) {
    const r = REVEAL.skip;
    const zone = this.add.zone(r.x, r.y, r.w, r.h).setOrigin(0);
    zone.on('pointerup', onTap);
    modal.add(zone);
    // Signal pour l'e2e : sur un runner lent, l'armement tombe plus tard qu'un délai fixe.
    const arm = () => {
      zone.setInteractive();
      document.body.dataset.skip = 'armed';
    };
    if (armMs === 0) arm();
    else seq.at(armMs, arm);
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
  // Toute ouverture de fenêtre passe par ici : le nom et l'instant (horloge du jeu) pour l'e2e.
  private markModal(name: string) {
    document.body.dataset.modal = name;
    document.body.dataset.clockModal = String(Math.round(this.clockMs));
  }

  // `night` : la fenêtre se pose sur la nuit de la révélation (révision 3 de 004, B2), sans
  // voile papier ni fondu d'entrée : rien de l'écran de tirage ne doit transparaître.
  private openModal(name: string, night = false): Phaser.GameObjects.Container {
    this.modalOpen = true;
    this.ambience.setActive(false);
    this.markModal(name);
    delete document.body.dataset.skip;
    const modal = makeModal(this);
    // La révélation plonge dans la nuit sans voile papier (004, FR-018) : son voile reste
    // là pour bloquer l'écran de tirage (FR-007), mais transparent.
    if (name === 'reveal' || night) (modal.list[0] as Phaser.GameObjects.Rectangle).setFillStyle(COLORS.scrim, 0);
    if (night) {
      modal.add(uiImage(this, 'bg-reveal', WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT)
        ?? this.add.rectangle(0, 0, WIDTH, HEIGHT, ART_FX.night, 1).setOrigin(0));
    }
    // Fondu d'entrée (007, FR-017) : l'opacité seule change, les boutons répondent déjà.
    // La révélation a sa propre entrée (la nuit tombe).
    if (!this.reducedMotion && name !== 'reveal' && !night) {
      this.tweens.add({ targets: modal, alpha: { from: 0, to: 1 }, duration: TRANSITIONS.fade });
    }
    return modal;
  }

  // Ouverture animée d'une fenêtre déjà construite (007, révision du 2026-11-13 : FR-024), autour
  // de `pivot`, le centre de son panneau. Signaux pour l'e2e : `dataset.opening` (nom de la
  // fenêtre) le temps qu'elle s'ouvre, puis `dataset.clockOpened` (horloge du jeu, comme
  // clockModal). Les zones d'appui sont à leur place dès l'ouverture (voir Opening).
  private opening(modal: Phaser.GameObjects.Container, pivot: { x: number; y: number }): Opening {
    const name = document.body.dataset.modal ?? '';
    const animate = !this.reducedMotion;
    if (animate) document.body.dataset.opening = name;
    const replacing = this.closedFrame === this.game.loop.frame;
    return new Opening(this, modal, pivot, animate, replacing, complete => {
      if (document.body.dataset.opening === name) delete document.body.dataset.opening;
      if (complete) document.body.dataset.clockOpened = String(Math.round(this.clockMs));
    });
  }

  private closeModal(modal: Phaser.GameObjects.Container) {
    this.closedFrame = this.game.loop.frame;
    modal.destroy();
    this.modalOpen = false;
    this.ambience.setActive(true);
    this.showAmountsSoon();
    delete document.body.dataset.modal;
    delete document.body.dataset.skip;
  }

  // `flipOrder` donné (×10 regardé jusqu'au bout) : les cartes arrivent face cachée et
  // se retournent dans cet ordre (FR-008). Sinon elles sont toutes visibles d'emblée.
  // `night` : résultats d'un tirage, posés sur la nuit de la révélation (révision 3, B2) ;
  // l'échange garde la fenêtre claire.
  private showResults(
    results: PullResult[], ownedBefore: Readonly<Record<string, number>>,
    opts: { readonly flipOrder?: readonly number[] | undefined; readonly onShown?: () => void; readonly night?: boolean } = {},
  ): Phaser.GameObjects.Container {
    const { flipOrder, onShown = () => {}, night = false } = opts;
    const flip = flipOrder !== undefined && results.length > 1;
    const modal = this.openModal(flip ? 'flip' : 'results', night);
    const counts = runningCounts(results, ownedBefore);
    const addOk = () => makeButton(this, RESULTS.ok, 'OK', COLORS.btn.primary, () => this.closeModal(modal));
    // Titre clair cerné d'encre sur la nuit, foncé sur le papier.
    const title = (x: number, y: number, s: string) => modal.add(this.add.text(x, y, s, night
      ? { ...textStyle(FONT_SIZE.big, ART_FX.splashText), stroke: ART_FX.splashStroke, strokeThickness: 5 }
      : textStyle(FONT_SIZE.big)).setOrigin(0.5));
    if (results.length === 1) {
      const r = RESULTS.single;
      // Titre entre l'en-tête et la carte agrandie (007), sans chevaucher l'en-tête.
      title(r.x + r.w / 2, r.y - 22, 'Tu as obtenu…');
      const card = makeResultCard(this, r, results[0]!, counts[0]!, true);
      modal.add(card);
      celebrateSingle(this, modal, card, r, results[0]!.item.rarity, { night, reduced: this.reducedMotion });
      modal.add(addOk().container);
      return modal;
    }
    if (!night) modal.add(makePanel(this, RESULTS.panel, COLORS.background));
    title(RESULTS.panel.x + RESULTS.panel.w / 2, RESULTS.titleY, 'Tirage ×10');
    const faces = results.map((res, i) => makeResultCard(this, resultCardRect(i), res, counts[i]!));
    if (!flip) {
      modal.add(faces);
      const cards = results.map((res, i) => ({ r: resultCardRect(i), rarity: res.item.rarity }));
      sparkleBest(new Particles(this, modal, 2), cards);
      glossBest(this, modal, cards, this.reducedMotion);
      modal.add(addOk().container);
      onShown();
      return modal;
    }
    this.playFlip(modal, faces, results, flipOrder, () => {
      // OK arrive (B1) : son dessin monte en fondu, la zone répond déjà à sa place de layout.ts.
      const ok = addOk();
      modal.add(ok.container);
      if (!this.reducedMotion) {
        const { y } = ok.visual;
        ok.visual.setY(y + RESULTS.okRise).setAlpha(0);
        this.tweens.add({ targets: ok.visual, y, alpha: 1, duration: CARD_MOTION.okIn, ease: 'Back.easeOut' });
      }
      onShown();
    });
    return modal;
  }

  private playFlip(
    modal: Phaser.GameObjects.Container,
    faces: Phaser.GameObjects.Container[],
    results: PullResult[],
    order: readonly number[],
    addOk: () => void,
  ) {
    const hint = this.add.text(RESULTS.ok.x + RESULTS.ok.w / 2, RESULTS.ok.y + RESULTS.ok.h / 2,
      'Touche pour tout retourner', textStyle(FONT_SIZE.small, ART_FX.splashText)).setOrigin(0.5).setAlpha(0.8);
    modal.add(hint);
    const flip = playFlip(this, modal, faces, results, flipSchedule(results, order), this.reducedMotion,
      (cue, v, delay) => this.sfx.play(cue, v, delay), tapped => {
        if (tapped) this.sfx.stopAll();
        zone.destroy();
        if (this.reducedMotion || tapped) hint.destroy();
        else this.tweens.add({ targets: hint, alpha: 0, duration: CARD_MOTION.hintOut, onComplete: () => hint.destroy() });
        delete document.body.dataset.skip;
        this.markModal('results');
        addOk();
      }, this.sfx.leadMs);
    // Appui pendant le retournement : tout se retourne, OK apparaît ; il ne ferme rien.
    const zone = this.addSkipZone(modal, flip.seq, 0, () => flip.finish(true));
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
    // Une ligne par rareté, puis les règles : elles entrent l'une après l'autre (FR-024).
    const rows: Phaser.GameObjects.Container[] = [];
    for (const r of rarityTable()) {
      rows.push(this.add.container(0, 0, [
        makeEmblem(this, left + 10, y + 11, 24, r.id),
        this.add.text(left + 30, y + 11, r.label, textStyle(FONT_SIZE.body)).setOrigin(0, 0.5),
        this.add.text(right, y + 11, formatPercent(ratePercent(r.id)), textStyle(FONT_SIZE.body)).setOrigin(1, 0.5),
      ]));
      y += 34;
    }
    const notes = this.add.container(0, 0);
    rows.push(notes);
    modal.add(rows);
    // « 40e » et non « 40ᵉ » : la police embarquée n'a pas le glyphe en exposant (trou dans le texte).
    const rules = this.add.text(left, y + 6,
      '×10 : au moins un Rare ou mieux garanti.\n'
      + `Légendaire ou mieux garanti au plus tard au ${GACHA_CONFIG.pityThreshold}e tirage ; `
      + 'le compteur repart de zéro à chaque Légendaire ou Ultra rare.',
      { ...textStyle(FONT_SIZE.body, CSS.textDim), wordWrap: { width: right - left }, lineSpacing: 2 });
    notes.add(rules);
    if (vedette) {
      // Bannière vedette (006, FR-016) : sa chance par tirage et la règle du 50/50.
      y = rules.y + rules.height + 16;
      const label = rarityLabel(vedette.rarity);
      notes.add(this.add.text(left, y, `Vedette\u00a0: ${vedette.name}`, textStyle(FONT_SIZE.body)));
      notes.add(this.add.text(right, y, formatPercent(featuredRatePercent(vedette)), textStyle(FONT_SIZE.body)).setOrigin(1, 0));
      notes.add(this.add.text(left, y + 26,
        `Quand un ${label} tombe ici, une chance sur deux que ce soit ${vedette.name}. `
        + `Sinon, le prochain ${label} de cette bannière sera ${vedette.name}.`,
        { ...textStyle(FONT_SIZE.body, CSS.textDim), wordWrap: { width: right - left }, lineSpacing: 2 }));
    }
    const [close] = dialogButtons(rect, 1);
    modal.add(makeButton(this, close!, 'Fermer', COLORS.btn.secondary, () => this.closeModal(modal)).container);
    const open = this.opening(modal, center(rect));
    const w = WINDOW.rows;
    rows.forEach((row, i) => open.enter(row, { dx: -w.shift, alpha: 0 }, i * w.stagger, w.duration));
    open.finish();
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
    const counters = summary.map((s, i) => {
      const x = panel.x + slot * i + slot / 2;
      modal.add(makeEmblem(this, x - 16, COLLECTION.summaryY, 18, s.rarity));
      const t = this.add.text(x - 5, COLLECTION.summaryY, `${s.owned}/${s.total}`, textStyle(FONT_SIZE.small)).setOrigin(0, 0.5);
      modal.add(t);
      return { t, s };
    });

    // Coûts des manquants échangeables : ils pulsent ensemble, une fois la fenêtre ouverte.
    const pulses: Phaser.GameObjects.Container[] = [];
    const cells = collectionEntries(p).map((entry, i) => this.makeCollectionCell(collectionCellRect(i), entry, modal, pulses));
    modal.add(cells);
    modal.add(makeButton(this, COLLECTION.close, 'Fermer', COLORS.btn.neutral, () => this.closeModal(modal)).container);

    // Ouverture (FR-024) : le panneau s'ouvre, les cases arrivent rangée par rangée, les compteurs
    // montent de zéro. Les zones des cases sont fixes dès la première image (Opening).
    const open = this.opening(modal, center(panel));
    const c = WINDOW.cascade;
    cells.forEach((cell, i) => open.enter(cell, { dy: c.rise, alpha: 0 }, Math.floor(i / 2) * c.step, c.duration));
    for (const { t, s } of counters) {
      if (!open.animate || s.owned === 0) continue;
      const k = { v: 0 };
      t.setText(`0/${s.total}`);
      open.tween({
        targets: k, v: 1, duration: WINDOW.count,
        onUpdate: () => t.setText(`${rollAmount(0, s.owned, k.v)}/${s.total}`),
      });
    }
    if (pulses.length > 0) {
      const pulse = WINDOW.costPulse;
      open.loop({ targets: pulses, scale: pulse.scale, duration: pulse.period, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
    open.finish();
  }

  private makeCollectionCell(
    r: Rect, entry: CollectionEntry, modal: Phaser.GameObjects.Container, pulses: Phaser.GameObjects.Container[],
  ) {
    const { item, count, cost, affordable } = entry;
    const owned = count > 0;
    const c = this.add.container(0, 0);
    // Manquant : grisé, nom visible (clarification de la spec).
    c.add(makePanel(this, r, owned ? COLORS.panel : COLORS.btn.disabled));
    // Portrait (possédé) ou silhouette (manquant), 007 FR-004.
    c.add(makePortrait(this, r.x + 22, r.y + r.h / 2, 32, item, owned));
    const textX = r.x + 44;
    c.add(this.add.text(textX, r.y + 5, item.name, textStyle(FONT_SIZE.small, owned ? CSS.text : CSS.textDim)));
    if (owned) {
      const kind = item.kind === 'character' ? 'Personnage' : 'Créature';
      c.add(this.add.text(textX, r.y + 24, `${kind} · ×${count}`, textStyle(FONT_SIZE.micro, CSS.textDim)));
      // Un possédé se montre en grand (FR-014).
      c.add(this.cellZone(r, () => {
        this.closeModal(modal);
        this.showSheet(item, count, r);
      }));
      return c;
    }
    // Coût mis en évidence s'il est abordable, estompé sinon (FR-004).
    const amount = makeShardAmount(this, textX, r.y + 30, formatAmount(cost), 0);
    if (!affordable) {
      c.add(amount.setAlpha(0.4));
      return c;
    }
    // Échangeable tout de suite (FR-025) : liseré des éclats et coût qui pulse autour de son
    // centre (pivot posé sur lui, le montant y garde ses coordonnées d'écran).
    const bounds = amount.getBounds();
    const pivot = this.add.container(bounds.centerX, bounds.centerY, [amount.setPosition(-bounds.centerX, -bounds.centerY)]);
    pulses.push(pivot);
    const inset = STROKE.base;
    c.add(this.add.graphics().lineStyle(STROKE.thin, WINDOW_FX.affordableRim, 1)
      .strokeRoundedRect(r.x + inset, r.y + inset, r.w - 2 * inset, r.h - 2 * inset, RADIUS - inset));
    c.add(pivot);
    c.add(this.cellZone(r, () => {
      this.closeModal(modal);
      this.showExchangeConfirm(item);
    }));
    return c;
  }

  private cellZone(r: Rect, onTap: () => void) {
    const zone = this.add.zone(r.x, r.y, r.w, r.h).setOrigin(0).setInteractive({ useHandCursor: true });
    zone.on('pointerup', onTap);
    return zone;
  }

  // Fiche d'un possédé (003, révision du 2026-11-08) : elle ne fait que montrer ; « Retour »
  // rouvre la collection, comme « Annuler » sur un échange.
  // `from` : la case touchée, d'où naît l'illustration (FR-025).
  private showSheet(item: Item, count: number, from: Rect) {
    const modal = this.openModal('fiche');
    // Signal pour l'e2e : l'élément montré, sans lire le canvas.
    document.body.dataset.fiche = item.id;
    modal.add(makePanel(this, RESULTS.panel, COLORS.background));
    const { container, art, image } = makeSheet(this, item, count);
    modal.add(container);
    modal.add(makeButton(this, SHEET.back, 'Retour', COLORS.btn.neutral, () => {
      delete document.body.dataset.fiche;
      this.closeModal(modal);
      this.showCollection();
    }).container);
    const open = this.opening(modal, center(RESULTS.panel));
    // L'illustration part de la case touchée, petite, et se pose à sa place ; un éclat de sa
    // rareté l'accueille, puis elle flotte. Légendaire et Ultra rare scintillent sur le bord.
    const w = WINDOW.sheet;
    const home = { x: art.x, y: art.y };
    const start = center(from);
    open.enter(art, { dx: start.x - home.x, dy: start.y - home.y, alpha: 0, scale: w.from }, 0, w.fly, 'Cubic.Out', () => {
      const particles = new Particles(this, modal, 4);
      const rank = RARITIES.find(r => r.id === item.rarity)!.rank;
      particles.burst({
        x: home.x, y: home.y, count: 20 + 6 * rank, colors: [COLORS.rarity[item.rarity], WINDOW_FX.sheetBurst],
        shapes: ['star', 'spark'], speed: [140, 260 + 30 * rank], size: [3, 6], life: [400, 700],
        spawnRadius: [60, 120], drag: 1.6,
      });
      sparkleBest(particles, [{ r: SHEET.art, rarity: item.rarity }]);
      open.loop({ targets: image, y: image.y - 2 * w.float, duration: w.floatPeriod, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    });
    open.finish();
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
      const shown = this.showResults(
        [{ item: outcome.item, isNew: true, guaranteed: false, pity: false, shards: 0, featuredGuarantee: false }], before);
      this.refresh();
      if (!this.reducedMotion) this.spendShards(shown, cost);
    }).container);
    modal.add(makeButton(this, cancel!, 'Annuler', COLORS.btn.neutral, () => {
      this.closeModal(modal);
      this.showCollection();
    }).container);
    this.opening(modal, center(rect)).finish();
  }

  // Échange (FR-025) : le montant dépensé quitte le compteur de l'en-tête, ses éclats volent
  // jusqu'à l'illustration de la carte et l'éclat part quand le dernier l'atteint. Surcouche de
  // la fenêtre de résultats : la carte et OK répondent d'emblée ; tout s'arrête avec elle.
  private spendShards(modal: Phaser.GameObjects.Container, cost: number) {
    const e = WINDOW.exchange;
    const from = { x: this.shardIcon.x, y: GACHA.header.y + GACHA.header.h / 2 };
    const r = RESULTS.single;
    const to = { x: r.x + r.w / 2, y: r.y + RESULTS.singleArt.pad + RESULTS.singleArt.h / 2 };
    const tweens: Phaser.Tweens.Tween[] = [];
    modal.once(Phaser.GameObjects.Events.DESTROY, () => tweens.forEach(t => t.remove()));
    const label = makeShardAmount(this, from.x, from.y + 30, `-${formatAmount(cost)}`, 0.5, FONT_SIZE.button);
    modal.add(label);
    tweens.push(this.tweens.add({ targets: label, y: -e.rise, alpha: 0, duration: e.label, ease: 'Cubic.In' }));
    const particles = new Particles(this, modal, 5);
    for (let i = 0; i < e.count; i++) {
      // Départ en tournesol autour du compteur (angle d'or) : réparti, sans hasard.
      const a = i * 2.39996;
      const d = e.spread * Math.sqrt((i + 1) / e.count);
      const shard = makeShardIcon(this, 0, 0, 7).setPosition(from.x + d * Math.cos(a), from.y + d * Math.sin(a));
      modal.add(shard);
      const last = i === e.count - 1;
      tweens.push(this.tweens.add({
        targets: shard, x: to.x, y: to.y, scale: 0.6, delay: i * e.stagger, duration: e.flight, ease: 'Cubic.In',
        onComplete: () => {
          shard.destroy();
          if (!last) return;
          particles.burst({
            x: to.x, y: to.y, count: 40, colors: WINDOW_FX.exchangeBurst, shapes: ['shard', 'star'],
            speed: [140, 320], size: [3, 6.5], life: [450, 800], spawnRadius: [10, 40], drag: 1.6,
          });
        },
      }));
    }
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
    this.opening(modal, center(rect)).finish();
  }

  private showWarning() {
    const { modal, rect } = this.dialog('warning', WARNING_DIALOG_H,
      'Ta sauvegarde n’a pas pu être relue : nouvelle partie.');
    const [ok] = dialogButtons(rect, 1);
    modal.add(makeButton(this, ok!, 'OK', COLORS.btn.primary, () => this.closeModal(modal)).container);
    this.opening(modal, center(rect)).finish();
  }
}

// Exemplaires atteints À CHAQUE résultat : deux doublons d'une même salve montrent ×2 puis
// ×3, pas deux fois le total final (cartes et présentations).
function runningCounts(results: readonly PullResult[], ownedBefore: Readonly<Record<string, number>>): number[] {
  const running: Record<string, number> = { ...ownedBefore };
  return results.map(r => (running[r.item.id] = (running[r.item.id] ?? 0) + 1));
}
