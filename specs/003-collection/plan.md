# Implementation Plan: Collection

**Branch**: `feat/003-collection` | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-collection/spec.md`

## Summary

Remplacer la liste d'échange d'éclats de 002 par une collection qui montre les 20
éléments sur un écran : possédés (nom, type, exemplaires) et manquants (grisés, nom
visible, coût en éclats), un résumé par rareté et le solde d'éclats. Un appui sur un
manquant abordable déclenche l'échange de 002. Deux vues pures (`collectionEntries`,
`raritySummary`) alimentent l'écran ; rien de nouveau n'est sauvegardé.

## Technical Context

**Language/Version**: TypeScript 6.0 (strict), Node 24 — inchangé (ADR 0004)

**Primary Dependencies**: Phaser 4.2, Vite 8 — aucune nouvelle

**Storage**: aucun changement (sauvegarde v2, ADR 0005)

**Testing**: Vitest (vues pures), Playwright sur le build, `scripts/mutate.sh`

**Target Platform**: navigateur de bureau, portrait 360 × 640

**Project Type**: jeu web mono-package

**Performance Goals**: ouverture de la collection instantanée (20 cases)

**Constraints**: 20 cases + résumé sans défilement ; positions dans `src/ui/layout.ts`

**Scale/Scope**: 1 fenêtre remplacée, 1 bouton renommé

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Vérification | Statut |
|----------|--------------|--------|
| I. Un mécanisme à la fois | Un seul : consulter sa collection (l'échange de 002 y est rattaché, sans changer ses règles). Pas de fiche, pas de tri au choix. | ✅ |
| II. Spécifier avant de coder | 2 clarifications tranchées, checklist complète, `check-docs.py` vert. | ✅ |
| III. Décisions tracées | Aucune décision structurante ; la fusion est une décision de design consignée dans la spec. | ✅ |
| IV. Gacha transparent | Les coûts d'échange restent visibles (dans chaque case manquante). | ✅ |
| V. Logique pure, tests qui mordent | `src/logic/collection.ts` pur, testé et muté. | ✅ |
| VI. Simplicité | `exchangeableItems` supprimé plutôt que gardé à côté de `collectionEntries` ; géométrie dans `layout.ts`. | ✅ |

**Re-check après Phase 1** : deux fonctions pures, une fenêtre réécrite, aucune
abstraction nouvelle. ✅

## Project Structure

### Documentation (this feature)

```text
specs/003-collection/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
├── contracts/logic-api.md · contracts/ui-screens.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (fichiers touchés)

```text
src/logic/collection.ts         nouveau : collectionEntries, raritySummary, isComplete (+ test)
src/logic/progression.ts        exchangeableItems supprimé (et ses tests)
src/ui/layout.ts                EXCHANGE → COLLECTION (géométrie de R2), collectionCellRect ; bouton renommé
src/scenes/GachaScene.ts        showExchange → showCollection ; cases possédé / manquant ; résumé
tests/e2e/pity-eclats.spec.ts   scénarios d'échange réécrits via la collection
tests/e2e/collection.spec.ts    nouveaux scénarios du quickstart
```

**Structure Decision**: inchangée ; la vue de collection rejoint `src/logic/`.

## Complexity Tracking

Aucune violation de la constitution à justifier.
