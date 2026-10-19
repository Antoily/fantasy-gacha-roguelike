# Implementation Plan: Pity & doublons

**Branch**: `feat/002-pity-doublons` | **Date**: 2026-10-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-pity-doublons/spec.md`

## Summary

Étendre le tirage de 001 avec une garantie à seuil (Légendaire ou mieux au plus tard
au 40ᵉ tirage, compteur visible) et une seconde monnaie, les éclats, gagnée sur
chaque doublon et dépensée pour obtenir un élément manquant choisi. Tout se joue
dans la logique pure (`pity` et `shards` dans la progression, sauvegarde v2 avec
migration) ; l'écran gagne un compteur, un solde d'éclats, un badge « Garanti ! »,
la mention des éclats sur les cartes et une liste d'échange.

## Technical Context

**Language/Version**: TypeScript 6.0 (strict), Node 24 — inchangé (ADR 0004)

**Primary Dependencies**: Phaser 4.2, Vite 8 — aucune nouvelle dépendance

**Storage**: `localStorage` `gacha.save`, format **v2** avec migration depuis v1 (ADR 0005)

**Testing**: Vitest (logique, graine fixe, statistiques), Playwright sur le build, `scripts/mutate.sh`

**Target Platform**: navigateur de bureau, portrait 360 × 640 — inchangé

**Project Type**: jeu web mono-package

**Performance Goals**: inchangés (un ×10 calculé et sauvegardé < 50 ms)

**Constraints**: liste d'échange sans défilement (20 éléments au plus) ; positions dans `src/ui/layout.ts`

**Scale/Scope**: 1 écran + 1 nouvelle fenêtre (échange) + 1 confirmation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Vérification | Statut |
|----------|--------------|--------|
| I. Un mécanisme à la fois | Un seul mécanisme : protéger de la malchance (pity) et rendre les doublons utiles (éclats → échange). Collection (003) et animation (004) exclues ; la liste d'échange ne montre que les manquants, sans fiche ni tri. | ✅ |
| II. Spécifier avant de coder | Spec clarifiée (3 questions), checklist complète, `check-docs.py` vert. | ✅ |
| III. Décisions tracées | Format de sauvegarde v2 = chemin prévu par l'ADR 0005 ; aucune décision structurante nouvelle, donc pas d'ADR. | ✅ |
| IV. Gacha transparent et reproductible | Règle du pity affichée dans les taux et sur l'écran ; table restreinte dérivée des mêmes poids ; tests statistiques SC-001/SC-002. Les éclats ne s'achètent pas. | ✅ |
| V. Logique pure, tests qui mordent | `pity`, `shards`, `exchange` dans `src/logic/` ; mutations prévues dans les tâches. | ✅ |
| VI. Simplicité, DA interchangeable | Valeurs dans `gachaConfig.ts`, couleurs dans `theme.ts`, positions dans `layout.ts`. | ✅ |

**Re-check après Phase 1** : le modèle ajoute deux entiers et une transition ; la
liste d'échange réutilise `makeModal`, `makePanel`, `makeButton`. ✅

## Project Structure

### Documentation (this feature)

```text
specs/002-pity-doublons/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
├── contracts/logic-api.md · contracts/ui-screens.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (fichiers touchés)

```text
src/data/gachaConfig.ts      + pityThreshold, pityMinRank, shardGain, shardCost
src/logic/gacha.ts           pity en entrée/sortie, minRank combiné, PullResult.pity/.shards
src/logic/progression.ts     pity, shards, exchange, exchangeableItems, pullsUntilPity
src/logic/save.ts            v2 + migration 1 → 2, validation pity/shards
src/ui/layout.ts             en-tête à 3 zones, ligne de pity, bouton Échanger, grille d'échange
src/ui/theme.ts              couleur des éclats, du badge « Garanti ! »
src/ui/widgets.ts            carte : « +X éclats », « Garanti ! »
src/scenes/GachaScene.ts     compteur, solde d'éclats, fenêtre d'échange + confirmation, taux
tests/e2e/gacha.spec.ts      + scénarios du quickstart 002
```

**Structure Decision**: aucune nouvelle couche ; la frontière `src/logic/` (pur) /
`src/scenes/` + `src/ui/` (affichage) de 001 est conservée.

## Complexity Tracking

Aucune violation de la constitution à justifier.
