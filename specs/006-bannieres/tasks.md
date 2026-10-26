# Tasks: Bannières

**Input**: Design documents from `specs/006-bannieres/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/logic-api.md), [quickstart.md](quickstart.md)

**Tests**: exigés (constitution V). Chaque test de logique est écrit avant le code,
vu rouge, puis validé par mutation (`scripts/mutate.sh`, `scripts/mutate-e2e.sh`).

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

Aucune : pas de nouvelle dépendance ni d'outillage.

---

## Phase 2: Foundational (Blocking Prerequisites)

- [ ] T001 Ajouter `featuredChance: 0.5` et `featuredMinRank: 3` à `GACHA_CONFIG` (`src/data/gachaConfig.ts`) ; test : `featuredMinRank` > `guaranteedMinRank` (un Rare forcé par le ×10 n'est jamais une vedette)
- [ ] T002 Créer `src/logic/banners.ts` (`STANDARD`, `bannerList`, `findBanner`, `neighbourBanner`) et ses tests : 6 bannières, standard en tête, vedettes = rang ≥ 3 dans l'ordre du catalogue, voisines en boucle dans les deux sens ; mutations (rang 2 inclus, boucle cassée)
- [ ] T003 Étendre `Progression` (`banner`, `guarantees`), `initialProgression`/`reset` (`'standard'`, `[]`) ; adapter les tests existants
- [ ] T004 Sauvegarde v3 dans `src/logic/save.ts` : sérialisation, migration 2 → 3, validation (research R4) ; tests : relecture v3, migration v2 et v1 sans perte (FR-019), bannière inconnue ⇒ standard, garantie inconnue ou en double ignorée, types invalides ⇒ corrompue ; mutations (migration absente, bannière inconnue gardée)

**Checkpoint**: les 110 tests existants passent avec le nouvel état.

---

## Phase 3: User Story 2 - Tirer sur une bannière vedette (Priority: P1) 🎯 MVP

**Goal**: 50/50 et garantie vedette, logique pure.

**Independent Test**: `scriptedRng` → vedette au 50/50 gagné ; autre élément puis vedette garantie.

- [ ] T005 [US2] Tests dans `src/logic/gacha.test.ts` : sans vedette, mêmes résultats qu'avant pour une graine donnée (SC-006) ; rareté de la vedette + 50/50 gagné ⇒ vedette, garantie fermée ; perdu ⇒ autre élément de la rareté (jamais la vedette), garantie ouverte ; garantie ouverte ⇒ vedette sans consommer de hasard d'élément, `featuredGuarantee: true`, garantie fermée ; autre rareté ⇒ garantie inchangée ; deux résultats de la rareté dans un ×10 (échec puis garantie) ; pity forcé sur la rareté de la vedette ⇒ 50/50 appliqué ; 1 000 000 tirages : raretés inchangées (SC-001), vedette = moitié de sa rareté hors garanties (SC-002) ; 100 000 séquences sans deux résultats consécutifs de la rareté sans vedette (SC-003) ; perdants uniformes entre les autres éléments
- [ ] T006 [US2] Implémenter dans `src/logic/gacha.ts` (`FeaturedState`, `featuredGuaranteed`, `PullResult.featuredGuarantee`) selon l'ordre de research R1
- [ ] T007 [US2] `pull()` sur la bannière active dans `src/logic/progression.ts` (ouvre / referme l'entrée de `guarantees`), `activeBanner`, `hasFeaturedGuarantee` ; tests : la garantie d'une autre bannière n'est ni utilisée ni effacée (FR-014), compteur des 40 commun (FR-013)
- [ ] T008 [US2] Valider T005–T007 par mutation : 50/50 inversé, garantie jamais ouverte, garantie non refermée, vedette possible parmi les perdants, garantie appliquée à une autre rareté, garantie lue sur la mauvaise bannière, élément tiré même sous garantie
- [ ] T009 [US2] Carte de résultat (`src/ui/widgets.ts`) : « Garanti ! » si `pity || featuredGuarantee` ; littéral de l'échange dans `GachaScene` complété

---

## Phase 4: User Story 1 - Choisir sa bannière (Priority: P1)

**Goal**: sélecteur sur l'écran de tirage.

**Independent Test**: ▶ change `data-banner`, un tirage part sur la bannière affichée.

- [ ] T010 [US1] `cycleBanner(p, step)` dans `src/logic/progression.ts` et ses tests (ne touche que `banner`)
- [ ] T011 [US1] `src/ui/layout.ts` : `bannerPrev`, `bannerNext`, `banner`, orbe réduit, `featuredLineY`, boutons décalés
- [ ] T012 [US1] `src/scenes/GachaScene.ts` : bandeau (flèches, nom, détail), `dataset.banner`, sauvegarde au changement ; vérifier que les flèches sont sous le voile d'une fenêtre

---

## Phase 5: User Story 3 - Changer de bannière sans rien perdre (Priority: P1)

- [ ] T013 [US3] Ligne « Vedette garantie au prochain <rareté> » (`featuredLineY`), affichée seulement si la bannière active a sa garantie ouverte

---

## Phase 6: User Story 4 - Connaître les taux de la bannière (Priority: P2)

- [ ] T014 [US4] `featuredRatePercent` et `formatPercent` à deux décimales (`src/logic/rates.ts`) ; tests : 1,25 % et 0,25 %, valeurs existantes inchangées ; mutation (arrondi à une décimale)
- [ ] T015 [US4] Fenêtre des taux : ligne vedette et règle du 50/50, hauteur `ratesDialogH(featured)` dans `layout.ts`

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T016 `tests/e2e/helpers.ts` (FRESH v3) et `tests/e2e/bannieres.spec.ts` : les 10 parcours du quickstart ; mutations de scène (`scripts/mutate-e2e.sh`) : flèche qui ne sauvegarde pas, ligne de garantie toujours vide, tirage sur la standard quelle que soit la bannière
- [ ] T017 Relire les captures (bandeau, noms longs comme « Cosmo l'Infini », fenêtre des taux vedette, ligne de garantie) ; suite e2e complète verte
- [ ] T018 Mettre à jour `CLAUDE.md` (sauvegarde v3, `dataset.banner`, leçons), `docs/ROADMAP.md` (006 dans « Fait »), cocher ce fichier

---

## Dependencies & Execution Order

- Phase 2 bloque tout. T005 → T006 → T007 → T008. T010–T012 dépendent de T003. T013 dépend de T007 et T012. T015 dépend de T014 et T011. T016 en dernier.
