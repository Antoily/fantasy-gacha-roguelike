# Tasks: Collection

**Input**: Design documents from `specs/003-collection/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/logic-api.md), [quickstart.md](quickstart.md)

**Tests**: exigés (constitution V), validés par mutation.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

Aucune.

## Phase 2: Foundational

- [ ] T001 Écrire `src/logic/collection.test.ts` puis `src/logic/collection.ts` : `collectionEntries` (20 entrées, « rareté décroissante, puis ordre du catalogue », `count` = exemplaires ou 0, `cost` = `SHARD_COST[rareté]`, `affordable` « manquant et shards ≥ cost »), `raritySummary` (Ultra rare → Commun, `owned / total`, Σ = `distinctOwned`), `isComplete`
- [ ] T002 Supprimer `exchangeableItems` de `src/logic/progression.ts` et ses tests (remplacé par `collectionEntries`)
- [ ] T003 Valider T001 par mutation : ordre de tri, `count` d'un manquant, borne `shards ≥ cost`, possédé abordable, somme du résumé, `isComplete` à 19 / 20

## Phase 3: User Story 1 - Voir ce que je possède (P1) 🎯 MVP

- [ ] T004 [US1] `src/ui/layout.ts` : remplacer `EXCHANGE`/`exchangeCellRect`/`exchangeLayout` par `COLLECTION` (titre y 36, solde y 60, résumé y 82, grille dès y 100, cases 156 × 42, écart 4, Fermer y 568) et `collectionCellRect(i)` ; renommer le bouton de l'écran de tirage en `collection`
- [ ] T005 [US1] `src/scenes/GachaScene.ts` : `showCollection()` (fenêtre `collection`) avec les cases possédées (pastille, nom, « type · ×N ») ; bouton « Collection »

## Phase 4: User Story 2 - Voir ce qui me manque (P1)

- [ ] T006 [US2] Cases manquantes dans `showCollection()` : fond grisé, pastille estompée, nom grisé, coût en éclats ; message « Collection complète ! » quand `isComplete`

## Phase 5: User Story 3 - Progression par rareté (P2)

- [ ] T007 [US3] Ligne de résumé (5 pastilles « n / total ») et ligne « ◆ solde · N / 20 » dans `showCollection()`

## Phase 6: User Story 4 - Obtenir un manquant depuis la collection (P1)

- [ ] T008 [US4] Zone cliquable sur les seuls manquants abordables ; confirmation de 002 ; Annuler → `showCollection()` ; coût mis en évidence si abordable, estompé sinon

## Phase 7: Polish

- [ ] T009 Réécrire les scénarios d'échange de `tests/e2e/pity-eclats.spec.ts` via la collection et ajouter `tests/e2e/collection.spec.ts` (scénarios 1, 2, 4, 5, 6 du [quickstart](quickstart.md)) ; valider par mutation de la scène (possédé cliquable, manquant trop cher cliquable, Annuler qui ferme)
- [ ] T010 [P] Contrôles de conformité (couleurs, valeurs en dur, logique pure)
- [ ] T011 Relire les captures : 20 cases lisibles, noms longs, ×N, résumé, collection complète
- [ ] T012 [P] `CLAUDE.md`, `docs/ROADMAP.md` (003 → Fait), cocher ce fichier

## Dependencies & Execution Order

Phase 2 → US1 → US2 → US3 → US4 (même fenêtre, même fichier) → Polish.
T009 est le critère de merge.

## Implementation Strategy

Logique d'abord (T001–T003), puis la fenêtre en une passe (T004–T008), puis e2e et captures.
