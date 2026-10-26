# Implementation Plan: Bannières

**Branch**: `feat/006-bannieres` | **Date**: 2026-10-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/006-bannieres/spec.md`

## Summary

Ajouter des bannières au tirage : la standard (inchangée) et une par élément Légendaire
ou Ultra rare, dérivées du catalogue. Sur une bannière vedette, la rareté se tire comme
avant ; quand elle est celle de la vedette, un 50/50 décide, et un échec ouvre une
garantie vedette propre à la bannière. Tout est dans la logique pure (`banners.ts`,
`gacha.ts`, `progression.ts`, sauvegarde v3) ; l'écran gagne un sélecteur de bannière
sous l'en-tête, une ligne de garantie vedette et des taux qui décrivent la bannière.

## Technical Context

**Language/Version**: TypeScript 6.0 (strict), Node 24 — inchangé (ADR 0004)

**Primary Dependencies**: Phaser 4.2, Vite 8 — aucune nouvelle dépendance

**Storage**: `localStorage` `gacha.save`, format **v3** avec migration depuis v2 (ADR 0005)

**Testing**: Vitest (graine fixe, `scriptedRng`, statistiques), Playwright sur le build (hasard scripté), `scripts/mutate.sh` et `scripts/mutate-e2e.sh`

**Target Platform**: navigateur, portrait 360 × 640 — inchangé

**Project Type**: jeu web mono-package

**Performance Goals**: inchangés (un ×10 calculé et sauvegardé < 50 ms)

**Constraints**: positions dans `src/ui/layout.ts` ; la scène ne tire aucun autre hasard que le tirage et le déroulé (leçon 004) ; la révélation n'est pas touchée (travail parallèle sur `src/ui/reveal.ts`)

**Scale/Scope**: 1 écran modifié (sélecteur, ligne de garantie), 1 fenêtre modifiée (taux)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Vérification | Statut |
|----------|--------------|--------|
| I. Un mécanisme à la fois | Un mécanisme : choisir sa bannière et tirer avec une vedette mise en avant. Bannières limitées dans le temps et visuels exclus (roadmap). | ✅ |
| II. Spécifier avant de coder | Spec clarifiée (3 questions), checklist complète, `check-docs.py` vert. | ✅ |
| III. Décisions tracées | Sauvegarde v3 = chemin prévu par l'ADR 0005. Bannières permanentes : décidé en clarification, et la constitution IV interdit déjà la pression temporelle sans ADR. Aucun ADR nouveau. | ✅ |
| IV. Gacha transparent et reproductible | Chance de la vedette affichée, calculée depuis `featuredChance` et les poids du tirage ; ordre de consommation du hasard contractuel ; tests statistiques SC-001/002/003 ; bannière standard identique bit à bit (SC-006). Aucune limite de temps. | ✅ |
| V. Logique pure, tests qui mordent | Bannières, 50/50, garanties et sauvegarde dans `src/logic/` ; mutations listées dans les tâches. | ✅ |
| VI. Simplicité, DA interchangeable | Bannières dérivées du catalogue (aucun texte par bannière) ; `featuredChance` dans `gachaConfig.ts` ; couleurs dans `theme.ts`. | ✅ |

**Re-check après Phase 1** : le modèle ajoute une chaîne et une liste à la progression,
une valeur à la configuration ; l'écran réutilise `makeButton`, `makePanel`. ✅

## Project Structure

### Documentation (this feature)

```text
specs/006-bannieres/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
├── contracts/logic-api.md · contracts/ui-screens.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (fichiers touchés)

```text
src/data/gachaConfig.ts      + featuredChance (1/2), featuredMinRank (3)
src/logic/banners.ts         NOUVEAU : liste des bannières dérivée du catalogue, voisine en boucle
src/logic/gacha.ts           50/50 et garantie vedette dans step(), PullResult.featuredGuarantee
src/logic/progression.ts     banner, guarantees ; pull() sur la bannière active ; cycleBanner()
src/logic/save.ts            v3 + migration 2 → 3, validation banner / guarantees
src/logic/rates.ts           featuredRatePercent ; formatPercent à deux décimales
src/ui/layout.ts             sélecteur sous l'en-tête, orbe réduit, ligne de garantie vedette, ratesDialogH()
src/ui/widgets.ts            « Garanti ! » aussi pour la garantie vedette
src/scenes/GachaScene.ts     sélecteur, refresh, fenêtre des taux, littéral PullResult de l'échange
tests/e2e/bannieres.spec.ts  NOUVEAU : scénarios du quickstart 006
tests/e2e/helpers.ts         FRESH en v3, bannerRoll()
```

**Structure Decision**: aucune nouvelle couche. `banners.ts` est un module de logique
pure à part parce que la scène et l'e2e en ont besoin sans passer par le tirage.

## Complexity Tracking

Aucune violation de la constitution à justifier.
