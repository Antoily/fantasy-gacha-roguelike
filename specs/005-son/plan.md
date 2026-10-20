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
