# Implementation Plan: Révélation

**Branch**: `feat/004-revelation` | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-revelation/spec.md`

## Summary

Intercaler entre l'appui sur « Tirer » et les cartes une animation à 5 paliers (un par
rareté), choisie d'après la meilleure rareté du tirage, avec deux fausses pistes
tirées au hasard (montée 1/4 pour Rare ou mieux, leurre 1/10 pour Rare). Au ×10, les
cartes se retournent ensuite une à une, la meilleure en dernier. Un appui passe tout.
Le **déroulé** (paliers montrés, ordre de retournement, durées) est calculé par une
fonction pure, testée et mutée ; la scène ne fait que le jouer. Rien n'est sauvegardé
de nouveau : le tirage est décidé et écrit avant l'animation, comme en 001.

## Technical Context

**Language/Version**: TypeScript 6.0 (strict), Node 24 — inchangé (ADR 0004)

**Primary Dependencies**: Phaser 4.2 (tweens, Graphics), Vite 8 — aucune nouvelle

**Storage**: aucun changement (sauvegarde v2, ADR 0005)

**Testing**: Vitest (déroulé pur, statistiques des fausses pistes, bornes de durée),
Playwright sur le build (enchaînement des fenêtres, passage, hasard scripté),
`scripts/mutate.sh`

**Target Platform**: navigateur, portrait 360 × 640

**Project Type**: jeu web mono-package

**Performance Goals**: animation fluide sur le rendu logiciel de la CI ; passage < 0,5 s (SC-002)

**Constraints**: durées bornées (FR-010) ; aucune couleur hors `theme.ts` ; positions dans `layout.ts`

**Scale/Scope**: 1 fenêtre nouvelle (`reveal`), 1 état nouveau de la fenêtre de résultats (`flip`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Vérification | Statut |
|----------|--------------|--------|
| I. Un mécanisme à la fois | Un seul : la révélation d'un tirage. Ni son, ni réglage, ni animation d'échange. | ✅ |
| II. Spécifier avant de coder | 6 clarifications (dont 1 défaut signalé), checklist complète, `check-docs.py` vert. | ✅ |
| III. Décisions tracées | Pas de décision structurante : un module pur de plus, une fenêtre de plus. Le leurre est une décision de design de l'utilisateur, consignée dans la spec. | ✅ |
| IV. Gacha transparent et reproductible | Taux, cartes et règles inchangés ; les fausses pistes sont de la mise en scène (spec FR-005). Le hasard du déroulé est **injecté** (même `Rng` que le tirage, consommé après lui) : tout déroulé est rejouable. Probabilités testées statistiquement (SC-006, SC-007). | ✅ |
| V. Logique pure, tests qui mordent | `src/logic/reveal.ts` pur (déroulé, ordre de retournement, durées) ; tests mutés. | ✅ |
| VI. Simplicité et DA interchangeable | Probabilités et durées dans `src/data/revealConfig.ts` ; couleurs des paliers = `COLORS.rarity` ; dessin dans `src/ui/reveal.ts`. | ✅ |

**Re-check après Phase 1** : une fonction pure, un module de dessin, deux états de
fenêtre ; aucune abstraction sans usage. ✅

## Project Structure

### Documentation (this feature)

```text
specs/004-revelation/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
├── contracts/logic-api.md · contracts/ui-screens.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (fichiers touchés)

```text
src/data/revealConfig.ts        nouveau : probabilités des fausses pistes, durées
src/logic/reveal.ts             nouveau : bestRarity, planReveal, flipOrder, revealDuration (+ test)
src/ui/theme.ts                 tokens des effets (rayons, éclair) dérivés de la palette
src/ui/reveal.ts                nouveau : dessin et tweens d'un déroulé (Phaser), passage
src/scenes/GachaScene.ts        onPull → fenêtre reveal → résultats (retournement au ×10)
tests/e2e/helpers.ts            hasard scripté (Math.random), passage de l'animation
tests/e2e/revelation.spec.ts    nouveaux scénarios du quickstart
tests/e2e/*.spec.ts             tirages existants : passer l'animation avant OK
```

**Structure Decision**: inchangée ; le déroulé rejoint `src/logic/`, son dessin `src/ui/`.

## Complexity Tracking

Aucune violation de la constitution à justifier.
