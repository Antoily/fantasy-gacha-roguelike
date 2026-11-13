# Implementation Plan: Son

**Branch**: `feat/005-son` | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/005-son/spec.md`

## Summary

Sonoriser la révélation de 004 : suspense, un son par palier, montée, rire diabolique
du leurre, cartes du ×10 ; plus un bouton son coupé / actif mémorisé. Le **calendrier
des sons** se déduit du déroulé de 004 par une fonction pure (testée, mutée) ; la scène
le programme sur la même `Sequence` que l'animation, donc passer coupe tout. Bruitages
synthétisés (Web Audio de Phaser), rire = fichier CC0 tracé (ADR 0006).

## Technical Context

**Language/Version**: TypeScript 6.0 (strict), Node 24 — inchangé (ADR 0004)

**Primary Dependencies**: Phaser 4.2 (gestionnaire de son Web Audio, chargeur) — aucune nouvelle

**Storage**: nouvelle clé `gacha.settings` `{ muted }` (ADR 0006) ; `gacha.save` v2 inchangée

**Testing**: Vitest (calendrier des sons, réglages), Playwright (journal des sons émis, bouton, persistance), `scripts/mutate.sh`, `scripts/mutate-e2e.sh`

**Target Platform**: navigateur, portrait 360 × 640

**Project Type**: jeu web mono-package

**Performance Goals**: son calé sur l'image (mêmes minuteries) ; arrêt < 0,1 s au passage (SC-003)

**Constraints**: aucune dépendance ; fichiers CC0 seulement ; jeu jouable sans audio (FR-008)

**Scale/Scope**: 7 bruitages synthétisés, 1 fichier (rire), 1 bouton

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Vérification | Statut |
|----------|--------------|--------|
| I. Un mécanisme à la fois | Un seul : entendre le tirage (et pouvoir se taire). Musique, volume, sons d'interface exclus. | ✅ |
| II. Spécifier avant de coder | 2 clarifications, checklist complète, `check-docs.py` vert. | ✅ |
| III. Décisions tracées | ADR 0006 (synthèse, CC0 tracé, clé de réglages hors sauvegarde), accepté avec ce plan. | ✅ |
| IV. Gacha transparent et reproductible | Aucun hasard nouveau : les sons suivent le déroulé déjà tiré (004). | ✅ |
| V. Logique pure, tests qui mordent | `src/logic/soundCues.ts` et `src/logic/settings.ts` purs, testés, mutés. | ✅ |
| VI. Simplicité et DA interchangeable | Recettes des bruitages en données (`src/data/sounds.ts`) ; fichier dans `public/sounds/` ; icône du bouton aux couleurs du thème. | ✅ |

**Re-check après Phase 1** : deux modules purs, un module audio, un bouton. ✅

## Project Structure

### Documentation (this feature)

```text
specs/005-son/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
├── contracts/logic-api.md · contracts/ui-screens.md
├── checklists/requirements.md
└── tasks.md
docs/adr/0006-son-synthese-et-reglages.md
```

### Source Code (fichiers touchés)

```text
public/sounds/rire-diabolique.{ogg,mp3}, CREDITS.md   rire CC0 (research R2)
src/data/sounds.ts              nouveau : recettes des bruitages synthétisés
src/logic/soundCues.ts          nouveau : revealCues, flipCues (+ test)
src/logic/settings.ts           nouveau : parseSettings, serializeSettings, SETTINGS_KEY (+ test)
src/ui/sfx.ts                   nouveau : synthèse, lecture du rire, coupure, journal e2e
src/ui/reveal.ts                programme les sons du déroulé sur la Sequence
src/ui/layout.ts · theme.ts     bouton son
src/scenes/BootScene.ts         charge le rire et les réglages
src/scenes/GachaScene.ts        bouton son, sons du retournement, arrêt au passage
tests/e2e/son.spec.ts           nouveaux scénarios du quickstart
```

**Structure Decision**: inchangée.

## Complexity Tracking

Aucune violation de la constitution à justifier.

## Révision du 2026-11-09 (sons d'interface, avec la révision de 007)

Spec : User Story 5, FR-011 à FR-013, SC-006.

- **Recettes** : `tap`, `swish`, `coins`, `shards` dans `SOUND_RECIPES`
  (`src/data/sounds.ts`), synthétisés comme les autres (FR-013), gain nettement sous
  celui des paliers ; `coins` / `shards` taillés à la durée du défilement (007 FR-015).
- **Branchement** : `makeButton` reçoit le son de son appui par une fonction posée une
  fois par la scène (`setButtonSound`, `src/ui/widgets.ts`) : un seul point d'appel, les
  widgets ne dépendent pas de `Sfx`. Les flèches de bannière passent `swish`.
- **Journal** : les nouveaux sons entrent dans `dataset.sounds` ; « Tirer » remet le
  journal à zéro après son `tap`, donc les attentes des tirages ne changent pas.
- **e2e** : `tap` à l'ouverture de « Taux », `swish` sur ▶, `coins` après un tirage,
  rien son coupé ; mutations de la scène.

Constitution : I (pas de mécanisme), II, V (journal vérifié et muté), VI (recettes en
données). ✅

## Révision du 2026-11-13 (immersion sonore)

Spec : User Story 6, FR-014 à FR-024, SC-007 à SC-009. Recherche détaillée (mesures,
recettes, niveaux cibles, pièges) : [research-immersion.md](research-immersion.md) ; ses
retouches A1–C6 sont la feuille de route technique.

- **Lot A, moteur** (`sfx.ts`, type `Tone`) : bruit blanc d'un `AudioBuffer` calculé une fois
  par `mulberry32` à graine fixe, filtres, décroissance, crescendo ; bus maître avec limiteur ;
  rire joué par le lecteur dans le même bus ; fondu de 25 ms à l'arrêt ; étouffement des voix
  du faux palier (montée, leurre). Les sources de bruit comptent dans `soundsLive`.
- **Lot B, révélation** (`sounds.ts`, `revealConfig.ts`, `reveal.ts`) : battements partagés
  par `REVEAL_TIMING.beats`, fissures, `impact(k)`, Commun revoicé, montée transposée,
  dégonflement du leurre, paillettes (instants tirés une fois à graine fixe).
- **Lot C, cartes et interface** : `play(cue, variant?)` (la variante n'entre pas dans le
  journal), `cardRecipe` sur la face des cartes, vedette, `splash` (seul jeton nouveau du
  journal), pièces selon le sens, souffle de bannière, éclair de passage vers les cartes,
  avance de latence.
- **Tests** : le contrôle « interface plus discrète » passe des gains de note à une énergie
  (Σ gain² × durée), validé par mutation ; fins audibles bornées relâche comprise ; journaux
  attendus de `son.spec.ts` mis à jour pour `splash` seulement.

Constitution : I (aucun mécanisme), II (spec révisée d'abord), IV (hasard du tirage intact :
bruit et paillettes à graine fixe), V (bornes et journal testés, mutations), VI (recettes en
données). ✅
