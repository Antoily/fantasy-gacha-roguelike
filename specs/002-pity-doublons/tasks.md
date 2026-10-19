# Tasks: Pity & doublons

**Input**: Design documents from `specs/002-pity-doublons/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/logic-api.md), [quickstart.md](quickstart.md)

**Tests**: exigés (constitution V). Chaque test de logique est écrit avant le code,
vu rouge, puis validé par mutation (`scripts/mutate.sh`).

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

Aucune : pas de nouvelle dépendance ni d'outillage.

---

## Phase 2: Foundational (Blocking Prerequisites)

- [ ] T001 Ajouter à `src/data/gachaConfig.ts` : `pityThreshold` 40, `pityMinRank` 3, `shardGain` « Commun 1 · Peu commun 2 · Rare 5 · Légendaire 15 · Ultra rare 30 », `shardCost` « Commun 10 · Peu commun 20 · Rare 50 · Légendaire 150 · Ultra rare 300 » ; tests dans `src/data/catalogue.test.ts` : valeurs exactes, `pityThreshold > 10`, gains et coûts croissants avec le rang
- [ ] T002 Étendre `Progression` dans `src/logic/progression.ts` avec `pity` (« entier 0–39 ») et `shards` (« entier ≥ 0 ») ; `initialProgression`/`reset` → `{ currency: 9000, owned: {}, pity: 0, shards: 0 }` ; mettre à jour les tests existants de `progression.test.ts` et `save.test.ts`
- [ ] T003 Passer la sauvegarde en v2 dans `src/logic/save.ts` : format `{ version: 2, currency, owned, pity, shards }`, migration `1 → 2` (`pity: 0`, `shards: 0`), `pity` non entier ou hors 0–39 et `shards` non entier ou négatif ⇒ `corrupted` ; tests : relecture v2, migration d'une vraie sauvegarde v1 sans perte (FR-020), cas corrompus ; mutations (migration absente, bornes de `pity`)

**Checkpoint**: la logique de 001 passe toujours, avec le nouvel état.

---

## Phase 3: User Story 1 - Être protégé de la malchance (Priority: P1) 🎯 MVP

**Goal**: Légendaire ou mieux au plus tard au 40ᵉ tirage.

**Independent Test**: à `pity = 39`, le tirage suivant est Légendaire ou mieux.

- [ ] T004 [US1] Écrire les tests dans `src/logic/gacha.test.ts` : à `pity = 39` un ×1 donne rang ≥ 3, `pity: true`, et renvoie `pity = 0` ; à `pity = 37` le 3ᵉ résultat d'un ×10 sans Légendaire avant est rang ≥ 3 ; un rang ≥ 3 naturel remet le compteur à 0 ; table restreinte Légendaire/Ultra à 25/5 (±5 % relatif) ; 100 000 tirages enchaînés sans écart > 40 entre deux rangs ≥ 3 (SC-001) ; avec `pity` loin du seuil, fréquences de 001 inchangées (SC-002) ; seuil et garantie ×10 sur le même résultat ⇒ rang ≥ 3
- [ ] T005 [US1] Implémenter dans `src/logic/gacha.ts` : `pullSingle`/`pullTen` reçoivent et renvoient `pity`, `minRank = max(pity, garantie ×10)`, drapeau `PullResult.pity` ; propager dans `pull` de `src/logic/progression.ts` (`pity` de la progression mis à jour) et adapter les tests de 001
- [ ] T006 [US1] Valider T004 par mutation : seuil décalé (39 → 40), compteur non remis à zéro sur un rang ≥ 3 naturel, compteur non avancé dans une salve, table restreinte au rang 2, drapeau `pity` jamais posé
- [ ] T007 [US1] Carte de résultat dans `src/ui/widgets.ts` : badge « Garanti ! » (couleur `theme.ts`) quand `result.pity`

---

## Phase 4: User Story 2 - Voir où en est la garantie (Priority: P1)

**Goal**: compteur visible en permanence, règle expliquée.

**Independent Test**: le compteur diminue de 1 par ×1 et revient à 40 après un Légendaire.

- [ ] T008 [US2] Ajouter `pullsUntilPity(p)` dans `src/logic/progression.ts` avec son test (40 au départ, 39 après un tirage sans Légendaire, 40 après un Légendaire)
- [ ] T009 [US2] Revoir `src/ui/layout.ts` (orbe rayon 64, ligne de pity, boutons ×1/×10 remontés, message de manque, bouton « Échanger des éclats », en-tête à trois zones) et afficher dans `src/scenes/GachaScene.ts` « Légendaire garanti dans N tirages au plus »
- [ ] T010 [US2] Fenêtre des taux dans `src/scenes/GachaScene.ts` : ajouter la règle du pity (FR-007), hauteur ajustée au contenu dans `layout.ts`

---

## Phase 5: User Story 3 - Tirer profit d'un doublon (Priority: P1)

**Goal**: chaque doublon rapporte ses éclats, affichés sur la carte.

**Independent Test**: tout possédé → un ×10 crédite la somme des gains des dix résultats.

- [ ] T011 [P] [US3] Tests dans `src/logic/gacha.test.ts` et `progression.test.ts` : doublon ⇒ `shards = shardGain[rareté]`, nouveau ⇒ 0 ; doublon dans la même salve (2ᵉ exemplaire seulement) ; `pull` crédite exactement `Σ shards` en même temps que le débit ; état d'entrée jamais muté
- [ ] T012 [US3] Implémenter `PullResult.shards` dans `src/logic/gacha.ts` et le crédit dans `pull` ; valider par mutation (gain sur un nouvel élément, mauvaise rareté, crédit oublié)
- [ ] T013 [US3] En-tête : solde d'éclats (icône losange, `theme.ts`) dans `src/scenes/GachaScene.ts` ; carte de doublon : « +X éclats » dans `src/ui/widgets.ts`, sans débordement dans la case 156 × 92

---

## Phase 6: User Story 4 - Utiliser ce que rapportent les doublons (Priority: P2)

**Goal**: échanger des éclats contre un élément manquant choisi.

**Independent Test**: un Légendaire manquant, 150 éclats → échange en 3 appuis, éclats à 0.

- [ ] T014 [P] [US4] Tests dans `src/logic/progression.test.ts` : `exchange` débite exactement `shardCost[rareté]`, rend l'élément possédé (×1), laisse `currency` et `pity` intacts ; refus `already-owned`, `insufficient-shards`, `unknown-item` sans aucune modification ; `exchangeableItems` = non possédés, rareté décroissante puis ordre du catalogue ; liste vide quand tout est possédé
- [ ] T015 [US4] Implémenter `exchange` et `exchangeableItems` dans `src/logic/progression.ts` ; valider par mutation (coût d'une autre rareté, échange d'un élément possédé autorisé, `pity` modifié, ordre de tri)
- [ ] T016 [US4] Fenêtre d'échange dans `src/scenes/GachaScene.ts` (+ `exchangeCellRect(i)` dans `src/ui/layout.ts`) : titre + solde, grille 2 × 10, case grisée si solde insuffisant, message « Tu possèdes déjà tout ! » ; confirmation « Échanger X contre N éclats ? » ; sauvegarde d'un bloc puis carte « Nouveau ! » ; verrou `modalOpen` respecté

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T017 Étendre `tests/e2e/gacha.spec.ts` avec les scénarios 1 à 6 de [quickstart.md](quickstart.md) (positions et ordre d'échange importés de `layout.ts` et `progression.ts`) ; valider par mutation de la scène (sauvegarde oubliée après échange, case grisée cliquable)
- [ ] T018 [P] Contrôles de conformité : aucune couleur/police hors `theme.ts`, aucune valeur de règle en dur dans les scènes, `src/logic/` toujours pur
- [ ] T019 Relire toutes les captures e2e (écran avec compteur, cartes « +X éclats » et « Garanti ! », liste d'échange pleine et partielle, confirmation, taux) : rien ne déborde, fenêtres ajustées au contenu
- [ ] T020 [P] Mettre à jour `CLAUDE.md` (pity, éclats, sauvegarde v2), `docs/ROADMAP.md` (002 → Fait) et cocher ce fichier

---

## Dependencies & Execution Order

- Phase 2 (config, état, sauvegarde v2) bloque tout le reste.
- US1 (T004–T007) avant US2 (le compteur affiché dépend du pity).
- US3 logique (T011–T012) indépendante de US1/US2 ; son affichage (T013) suit T009 (en-tête revu).
- US4 dépend de US3 (il faut des éclats) et de T009 (bouton Échanger).
- Polish en dernier ; T017 est le critère de merge.

## Parallel Example

```bash
# Après la phase 2, en parallèle côté logique :
T004 tests du pity   T011 tests des éclats   T014 tests de l'échange
```

## Implementation Strategy

1. Phase 2 puis US1 : le pity protège déjà le joueur (MVP).
2. US2 : il le voit.
3. US3 puis US4 : les doublons deviennent utiles.
4. Polish : e2e, captures, docs → PR d'implémentation, merge quand la CI est verte.
