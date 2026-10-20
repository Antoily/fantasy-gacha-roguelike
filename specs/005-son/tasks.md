# Tasks: Son

**Input**: Design documents from `specs/005-son/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/logic-api.md), [quickstart.md](quickstart.md)

**Tests**: exigés (constitution V), validés par mutation.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [x] T001 `public/sounds/` : rire Ogg (original) + MP3 (ffmpeg), `CREDITS.md` (auteur, lien, CC0, conversion)
- [x] T002 [P] `src/data/sounds.ts` : recettes de research R4

## Phase 2: Foundational

- [x] T003 Écrire les tests puis `src/logic/soundCues.ts` (`revealCues`, `flipCues`) et `src/logic/settings.ts` (`parseSettings`, `serializeSettings`)
- [x] T004 Valider T003 par mutation : rire sur une montée, rire absent d'un leurre, instant d'un palier décalé, vedette en `card`, défaut `muted: true`, réglage illisible accepté
- [x] T005 `src/ui/sfx.ts` : synthèse des recettes sur le contexte de Phaser, rire, `stopAll`, coupure, journal `dataset.sounds` ; muet sans erreur si l'audio manque

## Phase 3: User Story 1 - Entendre la révélation (P1) 🎯 MVP

- [x] T006 [US1] `BootScene` charge le rire (Ogg + MP3) et les réglages ; `reveal.ts` programme `revealCues` sur la `Sequence`

## Phase 4: User Story 2 - Le rire du leurre (P1)

- [x] T007 [US2] Cue `laugh` jouée par le fichier ; vérifier le calage sur la retombée

## Phase 5: User Story 3 - Couper le son (P1)

- [x] T008 [US3] `GACHA.mute` dans `layout.ts`, icône actif / coupé, bascule, `gacha.settings`, `dataset.muted`

## Phase 6: User Story 4 - Entendre les cartes (P2)

- [x] T009 [US4] `GachaScene.playFlip` programme `flipCues` ; passer arrête les sons (`stopAll`)

## Phase 7: Polish

- [x] T010 `tests/e2e/son.spec.ts` (scénarios 1–8 du [quickstart](quickstart.md)), argument d'autoplay dans `playwright.config.ts` ; mutations de scène (rire non programmé, coupure ignorée, réglage non relu, `stopAll` absent)
- [x] T011 [P] Contrôles de conformité (couleurs, valeurs en dur, logique pure, licences)
- [x] T012 Relire les captures (bouton actif / coupé) ; écoute réelle impossible en CI : noter dans la PR que les sons sont à juger par l'utilisateur
- [x] T013 [P] `CLAUDE.md`, `docs/ROADMAP.md` (005 → Fait), cocher ce fichier

## Dependencies & Execution Order

Setup → Phase 2 → US1 → US2 → US3 → US4 → Polish. T010 est le critère de merge.

## Implementation Strategy

Calendrier et réglages purs d'abord (T003–T004), puis le moteur audio, puis le
branchement scène par scène, puis l'e2e.
