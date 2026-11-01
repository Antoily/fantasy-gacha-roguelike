# Tasks: Illustrations

**Input**: Design documents from `specs/007-illustrations/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/ui-screens.md), [quickstart.md](quickstart.md)

**Tests**: exigés (constitution V). Chaque test de logique est écrit avant le code,
vu rouge, puis validé par mutation (`scripts/mutate.sh`, `scripts/mutate-e2e.sh`) ; les
effets purement visuels sont jugés sur les captures (leçon 003).

## Format: `[ID] [P?] [Story] Description`

Vocabulaire : la « présentation » de la spec est la fenêtre `splash` du code et de l'e2e.

---

## Phase 1: Setup

- [x] T001 Charte, fiches, exemple de technique (`docs/art/`) ; `scripts/art/check.mjs` (format, éléments interdits, identifiants, cadrages) et `scripts/art/preview.mjs` (aperçu aux tailles du jeu, maquettes, galerie) ; scripts npm `art:check`, `art:preview`
- [ ] T002 Produire les 20 illustrations et les visuels d'interface (un agent par visuel, charte + fiche) dans `public/art/` ; `npm run art:check` vert
- [ ] T003 `scripts/art/contrast.mjs` (research R6) + script npm `art:contrast` ; CI : `art:check` et `art:contrast` dans le job du jeu

---

## Phase 2: Foundational (Blocking Prerequisites)

- [ ] T004 `renderScale()` dans `src/ui/layout.ts` + tests (densité 1 et fenêtre 360 × 640 ⇒ 1 ; bureau ×1,5 ⇒ 2 ; téléphone densité 3 ⇒ 3 ; jamais > 3 ni < 1) ; mutations (borne haute retirée, arrondi inférieur)
- [ ] T005 Canvas 360R × 640R et caméra ×R (`src/main.ts`, scènes), `resolution: R` dans `textStyle` (`src/ui/widgets.ts`) ; e2e existant vert à R = 1
- [ ] T006 `src/ui/art.ts` : chargement des visuels (taille d'affichage × R), cadrages, vignettes tête / buste / silhouette (research R3), `hasArt()`, `dataset.artMissing` ; `BootScene` charge tout avant l'écran de tirage
- [ ] T007 `presentations()` dans `src/logic/presentation.ts` + tests (aucun sous Légendaire, ordre de retournement, doublons présentés deux fois, ×1) ; mutations (rang 3 exclu, ordre du tirage au lieu du retournement)

**Checkpoint**: les tests existants passent ; le jeu démarre avec les visuels chargés.

---

## Phase 3: User Story 1 - Voir qui l'on a obtenu (Priority: P1) 🎯 MVP

- [ ] T008 [US1] Carte ×1 agrandie (`RESULTS.single`) avec fenêtre d'illustration, emblème de rareté ; carte ×10 avec buste et textes réorganisés (`src/ui/widgets.ts`, `src/ui/layout.ts`)
- [ ] T009 [US1] Repli pastille + initiale quand `hasArt(id)` est faux (FR-010) ; e2e : SVG en 404 ⇒ `dataset.artMissing`, zéro `pageerror` ; mutation (repli retiré)

---

## Phase 4: User Story 2 - Admirer une belle prise (Priority: P1)

- [ ] T010 [US2] `src/ui/splash.ts` : nuit, rayons et lueur de la rareté, illustration en grand, nom, emblème, phrase, « Nouveau ! » ou exemplaires, particules ; appui armé à 400 ms ; `dataset.modal = 'splash'`, `dataset.splash`
- [ ] T011 [US2] File de présentations dans `GachaScene` : ×1 entre révélation et carte, ×10 après le retournement, y compris quand la révélation est passée ; échange sans présentation
- [ ] T012 [US2] e2e quickstart 3, 4, 5, 6 ; helper `passSplashes` ; adapter les e2e existants qui tirent un Légendaire ou mieux ; mutations (présentation absente quand on passe, appui accepté avant 400 ms, ordre)

---

## Phase 5: User Story 3 - Parcourir une collection illustrée (Priority: P2)

- [ ] T013 [US3] Cases de la collection : portrait (possédé), silhouette (manquant), emblèmes du résumé ; e2e quickstart 7 (captures)

---

## Phase 6: User Story 4 - Un écran de tirage habillé (Priority: P2)

- [ ] T014 [US4] Fond `bg-main`, orbe en image, icônes de l'en-tête, des flèches et du son, portrait de la vedette dans le bandeau ; emblèmes dans la fenêtre des taux ; dos de carte illustré au ×10 ; e2e quickstart 1, 8 (captures)

---

## Phase 7: Révision de 004 (FR-016, FR-017)

- [ ] T015 `REVEAL_TIMING` : suspense 1 600 ms, fissures à 45 / 65 / 82 %, temps figé 150 ms (`src/data/revealConfig.ts`) ; tests de bornes FR-010 inchangés et verts
- [ ] T016 Calendrier sonore : sirène jusqu'au temps figé, `crack` à chaque fissure (`src/logic/soundCues.ts`, `src/data/sounds.ts`) + tests ; mutation (craquement absent)
- [ ] T017 `src/ui/reveal.ts` : nuit, cercle magique teinté et tournant, fissures, éclats de verre, temps figé ; `src/ui/particles.ts` : formes `shard` et `glow`, comptes doublés (`REVEAL` dans `layout.ts`) ; captures palier par palier

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T018 e2e quickstart 10 (densité 2 : appuis justes, capture nette) ; e2e SC-004 : écran prêt (`dataset.ready`) en moins de 3 s après le chargement de la page
- [ ] T019 Relire toutes les captures (débordements, lisibilité, cohérence) ; vidéo d'une révélation Ultra rare (horloge virtuelle, leçon révision 004)
- [ ] T020 `CLAUDE.md` (structure, leçons), `docs/ROADMAP.md` ; galerie d'aperçu publiée pour l'utilisateur

---

## Dependencies & Execution Order

- T001–T003 avant tout ; T004–T007 bloquent les user stories.
- US1 (T008–T009) puis US2 (T010–T012) ; US3, US4 et la révision de 004 sont
  indépendantes entre elles une fois la phase 2 faite.
- T018–T020 en dernier.
