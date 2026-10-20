# Tasks: Révélation

**Input**: Design documents from `specs/004-revelation/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/logic-api.md), [quickstart.md](quickstart.md)

**Tests**: exigés (constitution V), validés par mutation.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [ ] T001 `src/data/revealConfig.ts` : `riseChance` 0,25, `lureChance` 0,10, `lureUltraShare` 0,2 et les durées de research R3

## Phase 2: Foundational

- [ ] T002 Écrire `src/logic/reveal.test.ts` puis `src/logic/reveal.ts` : `bestRarity`, `planReveal` (consommation 1 + 1 valeur, R2), `flipOrder` (vedette = dernier résultat de la meilleure rareté, en dernier), `revealDuration`, `flipDuration` ; tests à `scriptedRng` aux bornes exactes de `u` et `v`, test statistique sur 100 000 déroulés (SC-006, SC-007), parcours de tous les plans pour les bornes de FR-010
- [ ] T003 Valider T002 par mutation : seuil 0,10 / 0,35 / 0,25 / 0,2, montée autorisée pour Peu commun, leurre autorisé pour Légendaire, `steps` qui ne finit pas sur `final`, vedette = premier au lieu du dernier, durée d'Ultra gonflée au-delà de 5 000

## Phase 3: User Story 1 - Deviner son meilleur résultat avant les cartes (P1) 🎯 MVP

- [ ] T004 [US1] `src/ui/theme.ts` : tokens d'effet (rayons, onde, éclair) dérivés de la palette ; `src/ui/reveal.ts` : jouer un déroulé direct depuis `GACHA.orb` (suspense commun, révélation à l'ampleur croissante avec le rang, R4), rappel de fin
- [ ] T005 [US1] `src/scenes/GachaScene.ts` : `onPull` → fenêtre `reveal` (`dataset.reveal`, `modalOpen` tenu) → `showResults` ; l'échange d'éclats garde `showResults` direct

## Phase 4: User Story 2 - Passer l'animation (P1)

- [ ] T006 [US2] Zone plein écran de `reveal` armée après 200 ms : `pointerup` → arrêt des tweens, `results` cartes retournées ; texte « Touche pour passer »

## Phase 5: User Story 3 - Montée de palier (P2)

- [ ] T007 [US3] `src/ui/reveal.ts` : déroulé `rise` (palier du dessous, l'orbe se fend, vrai palier)

## Phase 6: User Story 4 - Faux espoir (P2)

- [ ] T008 [US4] `src/ui/reveal.ts` : déroulé `lure` (faux palier, l'effet se dégonfle, retombée sur Rare)

## Phase 7: User Story 5 - Cartes du ×10 une par une (P2)

- [ ] T009 [US5] Fenêtre `flip` dans `GachaScene` : cartes face cachée aux places de `resultCardRect`, retournées selon `flipOrder`, vedette mise en valeur ; appui → tout retourné ; OK seulement après

## Phase 8: Polish

- [ ] T010 `tests/e2e/helpers.ts` : hasard scripté (`addInitScript`, file `window.__rng`) et `skipReveal` ; adapter les tirages de `gacha.spec.ts`, `pity-eclats.spec.ts`, `collection.spec.ts` ; écrire `tests/e2e/revelation.spec.ts` (scénarios 1–11 du [quickstart](quickstart.md)) ; valider par mutation de la scène (verrou retiré, passage non armé, OK présent pendant `flip`, échange qui joue `reveal`)
- [ ] T011 [P] Contrôles de conformité (couleurs, valeurs en dur, logique pure, aucun `Phaser.Math.Between`)
- [ ] T012 Relire les captures : 5 paliers reconnaissables sans texte (SC-005), montée, leurre, retournement, rien qui déborde
- [ ] T013 [P] `CLAUDE.md`, `docs/ROADMAP.md` (004 → Fait), cocher ce fichier

## Dependencies & Execution Order

Setup → Phase 2 → US1 → US2 → US3, US4, US5 (même fichier de dessin pour US3–US4,
même scène pour US5 : en séquence) → Polish. T010 est le critère de merge.

## Implementation Strategy

Logique d'abord (T001–T003) : tout le hasard et toutes les bornes sont fixés et mutés
avant le premier pixel. Puis le palier direct jouable et passable (MVP), puis les
fausses pistes, le retournement, l'e2e et les captures.
