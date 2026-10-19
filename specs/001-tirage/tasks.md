# Tasks: Tirage

**Input**: Design documents from `specs/001-tirage/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/logic-api.md), [quickstart.md](quickstart.md)

**Tests**: exigés par la constitution (principe V). Chaque test de logique est écrit
avant le code qu'il couvre, vu rouge, puis **validé par mutation** une fois vert
(casser la règle, voir le test échouer, restaurer).

## Format: `[ID] [P?] [Story] Description`

- **[P]** : parallélisable (fichiers différents, aucune dépendance en cours)
- **[USn]** : user story de la spec

---

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 Créer `.nvmrc` (`24`), `package.json` (scripts `dev`, `build`, `preview`, `lint`, `typecheck`, `test`, `e2e`) et installer phaser@4.2, vite@8, typescript@6.0, vitest@5, eslint@10, typescript-eslint@8, @playwright/test@1.64 à la racine
- [x] T002 [P] Créer `tsconfig.json` (strict, `noEmit`, `moduleResolution: bundler`) et `vite.config.ts` (base relative, sortie `dist/`)
- [x] T003 [P] Créer `eslint.config.js` (flat, typescript-eslint strict, `no-explicit-any` en erreur, `no-restricted-imports` interdisant `phaser` dans `src/logic/**`)
- [x] T004 [P] Créer `playwright.config.ts` (webServer = `vite preview --port 4173` sur le build, Chromium avec `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`, viewport 360×640, captures dans `test-results/`)
- [x] T005 Ajouter `test-results/`, `playwright-report/` au `.gitignore` et un job `game` à `.github/workflows/ci.yml` (Node depuis `.nvmrc`, `npm ci`, lint, typecheck, test, build, `npx playwright install --with-deps chromium`, e2e, captures en artefact)

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: aucune user story ne commence avant la fin de cette phase.

- [x] T006 [P] Écrire `src/logic/rng.test.ts` (même graine ⇒ même suite ; valeurs dans `[0, 1)`) puis `src/logic/rng.ts` (type `Rng`, `mulberry32`)
- [x] T007 [P] Créer `src/data/gachaConfig.ts` : raretés `'common' | 'uncommon' | 'rare' | 'legendary' | 'ultra'` avec rang 0–4, libellés, « poids 600 / 270 / 100 / 25 / 5 ; somme = 1 000 » ; `costSingle` 100, `costTen` 900, `startingCurrency` 9 000, `guaranteedMinRank` 2
- [x] T008 [P] Créer `src/data/catalogue.ts` : les 20 éléments de [catalogue.md](catalogue.md) (`id` kebab-case « unique, stable », `name`, `kind: 'character' | 'creature'`, `rarity`, `blurb`)
- [x] T009 Écrire `src/data/catalogue.test.ts` : 20 éléments, ids uniques, répartition 6/5/4/3/2, au moins un personnage et une créature par rareté, `costTen < 10 × costSingle` (FR-003, FR-009)
- [x] T010 [P] Créer `src/ui/theme.ts` (fond papier, encre noire, couleurs des 5 raretés, couleurs de boutons par intention, contours 2/3/4 px, pile de polices arrondies) et `src/ui/layout.ts` (360×640, marge 16, largeur 328, rectangles des boutons ×1, ×10, Taux, Recommencer, OK, Effacer, Annuler)
- [x] T011 [P] Créer `src/ui/widgets.ts` : `makeButton` (contour noir, ombre pleine, sous-titre interne, état désactivé), `makePanel`, `makeModal` (voile papier bloquant les clics), couleurs lues dans `theme.ts`
- [x] T012 Créer `index.html`, `src/main.ts` (Phaser 360×640, `Scale.FIT`, `CENTER_BOTH`) et `src/scenes/BootScene.ts` → `GachaScene.ts` vide ; vérifier que `npm run build` et `npm run preview` affichent l'écran

**Checkpoint**: le jeu démarre sur un écran vide, lint/typecheck/test/build verts.

---

## Phase 3: User Story 1 - Faire un tirage simple (Priority: P1) 🎯 MVP

**Goal**: dépenser 100 pour un tirage ×1 et voir le résultat.

**Independent Test**: depuis 9 000, Tirer ×1 → solde 8 900, une carte affichée, un élément possédé.

### Tests for User Story 1

- [x] T013 [P] [US1] Écrire `src/logic/gacha.test.ts` (partie ×1) : un tirage renvoie 1 résultat ; rareté puis élément uniforme dans la rareté ; `isNew` vrai si non possédé, faux sinon ; catalogue entièrement possédé ⇒ le tirage fonctionne et tous les résultats ont `isNew` faux (cas limite « tous possédés »)
- [x] T014 [P] [US1] Écrire `src/logic/progression.test.ts` (partie ×1) : `initialProgression` = 9 000 et rien possédé ; `pull(…, 1)` débite exactement 100 et incrémente le compte de l'élément ; solde < 100 ⇒ `{ ok: false, reason: 'insufficient-funds' }` et état d'entrée inchangé (FR-010) ; solde = 100 ⇒ accepté, solde 0 ; l'état d'entrée n'est jamais muté

### Implementation for User Story 1

- [x] T015 [US1] Implémenter `src/logic/rates.ts` (table des raretés lue dans `gachaConfig`, tirage pondéré d'une rareté) et `pullSingle` dans `src/logic/gacha.ts`
- [x] T016 [US1] Implémenter `src/logic/progression.ts` : `initialProgression`, `canAfford`, `pull` (×1), `distinctOwned` — transitions sans mutation
- [x] T017 [US1] Valider T013–T014 par mutation (taux ignoré, mauvais débit, refus absent, mutation de l'entrée) et consigner les mutations essayées dans le message de commit
- [x] T018 [US1] Dans `src/scenes/GachaScene.ts` : en-tête solde, bouton « Tirer ×1 — 100 » (désactivé + message « Pas assez de… » si solde < 100), modale de résultat (carte : pastille de rareté + initiale, nom, Personnage/Créature, rareté, « Nouveau ! » ou « Déjà possédé ×N », bouton OK) ; verrou : aucun tirage tant que la modale est ouverte

**Checkpoint**: un tirage ×1 fonctionne à l'écran (état en mémoire, non sauvegardé).

---

## Phase 4: User Story 2 - Faire un tirage ×10 avec garantie (Priority: P1)

**Goal**: dix résultats pour 900, dont au moins un Rare ou mieux.

**Independent Test**: Tirer ×10 → solde −900, dix cartes, au moins une de rang ≥ Rare.

### Tests for User Story 2

- [x] T019 [P] [US2] Compléter `src/logic/gacha.test.ts` : `pullTen` renvoie 10 résultats ; sur 10 000 salves à graine fixe, 100 % contiennent un rang ≥ 2 (SC-003) ; avec un générateur forcé qui ne donne que des Communs, le 10ᵉ est `guaranteed` et de rang ≥ 2 ; sur un grand nombre de 10ᵉ garantis, proportions Rare/Légendaire/Ultra à ±5 % relatif de 100/25/5 ; une salve qui contient déjà un Rare n'a aucun résultat `guaranteed` ; doublon dans la même salve ⇒ premier `isNew`, second non (US2-3)
- [x] T020 [P] [US2] Compléter `src/logic/progression.test.ts` : `pull(…, 10)` débite exactement 900 et ajoute les 10 résultats ; solde entre 100 et 899 ⇒ ×10 refusé, ×1 accepté (US2-4)

### Implementation for User Story 2

- [x] T021 [US2] Implémenter `pullTen` dans `src/logic/gacha.ts` (9 tirages normaux, 10ᵉ restreint aux rangs ≥ 2 si besoin, suivi de `isNew` au fil de la salve) et le ×10 dans `pull` de `src/logic/progression.ts`
- [x] T022 [US2] Valider T019–T020 par mutation (garantie supprimée, garantie appliquée même avec un Rare déjà présent, mauvais poids restreints, `isNew` calculé sur l'état d'avant la salve)
- [x] T023 [US2] Dans `src/scenes/GachaScene.ts` : bouton « Tirer ×10 — 900 » avec sous-titre « Un Rare ou mieux garanti », désactivé si solde < 900 ; modale de résultats en grille 2 × 5 dans l'ordre du tirage

**Checkpoint**: ×1 et ×10 jouables, garantie vérifiée par les tests.

---

## Phase 5: User Story 3 - Consulter les taux (Priority: P2)

**Goal**: voir la probabilité de chaque rareté et la règle du ×10.

**Independent Test**: la fenêtre des taux liste 60 / 27 / 10 / 2,5 / 0,5 % et la garantie ; les fréquences simulées correspondent.

### Tests for User Story 3

- [x] T024 [P] [US3] Écrire `src/logic/rates.test.ts` : somme des pourcentages = 100 ; `ratePercent('legendary')` = 2.5 ; `formatPercent(2.5)` = « 2,5 % », `formatPercent(60)` = « 60 % » ; sur 1 000 000 de tirages à graine fixe, chaque rareté à ±5 % relatif de son taux (SC-002)

### Implementation for User Story 3

- [x] T025 [US3] Compléter `src/logic/rates.ts` (`rarityTable`, `ratePercent`, `formatPercent`) et valider T024 par mutation (poids modifié dans le tirage seulement ⇒ le test statistique doit rougir)
- [x] T026 [US3] Dans `src/scenes/GachaScene.ts` : bouton « Taux » ouvrant une modale (5 lignes couleur + libellé + pourcentage lus dans `rarityTable()`, mention « ×10 : au moins un Rare ou mieux garanti », bouton Fermer)

**Checkpoint**: les taux affichés et appliqués viennent de la même table.

---

## Phase 6: User Story 4 - Retrouver sa progression (Priority: P2)

**Goal**: solde et possessions survivent au rechargement ; compteur « possédés / 20 ».

**Independent Test**: tirer, recharger : mêmes solde et compteur.

### Tests for User Story 4

- [x] T027 [P] [US4] Écrire `src/logic/save.test.ts` : `parseSave(serializeSave(p))` redonne `p` ; `null` ⇒ `new` + état initial ; JSON invalide, `version` inconnue, `currency` négative ou non entière, compte non entier ou < 1 ⇒ `corrupted` + état initial ; identifiant inconnu du catalogue ignoré ; une sauvegarde `version` antérieure passe par la migration (table de migrations testée avec une v0 fictive de test)

### Implementation for User Story 4

- [x] T028 [US4] Implémenter `src/logic/save.ts` (`SAVE_KEY = 'gacha.save'`, format `{ version: 1, currency, owned }`, migrations) et valider T027 par mutation
- [x] T029 [US4] `BootScene` lit `localStorage` via `parseSave` et transmet l'état ; `GachaScene` écrit la sauvegarde **d'un seul `setItem`** après chaque tirage accepté, **avant** d'ouvrir la modale de résultats (FR-011) ; compteur « N / 20 » dans l'en-tête ; bandeau d'avertissement si `corrupted`

**Checkpoint**: progression conservée au rechargement.

---

## Phase 7: User Story 5 - Recommencer de zéro (Priority: P3)

**Goal**: effacer la progression après confirmation.

**Independent Test**: Recommencer → Annuler : rien ne change ; → Effacer : 9 000 et 0 / 20.

- [x] T030 [P] [US5] Ajouter `reset()` à `src/logic/progression.ts` avec son test dans `src/logic/progression.test.ts` (renvoie l'état initial), validé par mutation
- [x] T031 [US5] Dans `src/scenes/GachaScene.ts` : bouton « Recommencer » → modale « Tout effacer et repartir avec 9 000 ? » (Effacer / Annuler) ; Effacer sauvegarde l'état initial et rafraîchit l'écran

---

## Phase 8: Polish & Cross-Cutting Concerns

- [x] T032 Écrire `tests/e2e/gacha.spec.ts` : scénario complet du [quickstart](quickstart.md) (étapes 1 à 8), positions lues dans `src/ui/layout.ts`, assertions sur `localStorage` et sur les captures ; la sauvegarde est déjà à jour **pendant** que la modale de résultats est ouverte (FR-011) ; un double-clic sur « Tirer ×1 » ne débite que 100 (appuis répétés) ; premier résultat visible en moins de 10 s et en 1 appui depuis le chargement (SC-001) ; valider par mutation (bouton ×10 qui débite 1 000 ⇒ l'e2e doit rougir)
- [x] T033 [P] Vérifier qu'aucune couleur `0x…`/`#…` ni police n'apparaît hors `src/ui/theme.ts` (`grep`), qu'aucun contenu n'est écrit en dur dans les scènes, et que `src/logic/` n'importe ni `phaser` ni `window`/`localStorage`
- [x] T034 [P] Mettre à jour `CLAUDE.md` (commandes, nvm, structure `src/`), `README.md` (lancer le jeu) et `docs/ROADMAP.md` (001 → Fait)
- [x] T035 Relire les captures de l'e2e (écran de tirage, ×1, ×10, taux, recommencer, avertissement, boutons désactivés) : aucun chevauchement, textes dans leurs cadres, marges de 16 px

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → **Foundational (Phase 2)** → user stories.
- **US1** est le socle de la scène : **US2** réutilise sa modale de résultats et son
  `pull`, **US3**, **US4**, **US5** ajoutent chacune un morceau d'écran indépendant.
  Ordre retenu : US1 → US2 → US3 → US4 → US5 (un seul développeur, même fichier de scène).
- Côté logique, US3 (`rates.test.ts`), US4 (`save.ts`) et US5 (`reset`) sont
  indépendantes de US2 et peuvent être écrites en parallèle.
- **Polish (Phase 8)** après toutes les stories ; T032 est le critère de merge.

## Parallel Example: Foundational

```bash
# Fichiers indépendants, lancés ensemble :
T006 src/logic/rng.ts   T007 src/data/gachaConfig.ts   T008 src/data/catalogue.ts
T010 src/ui/theme.ts + layout.ts   T011 src/ui/widgets.ts
```

## Implementation Strategy

1. Phases 1–2, puis **US1** : MVP jouable (tirage ×1 visible).
2. **US2** : le gacha est complet côté règles.
3. **US3 → US5** : transparence, persistance, remise à zéro.
4. Phase 8 : e2e, contrôles de conformité, relecture des captures → PR
   d'implémentation, merge quand la CI (dont l'e2e) est verte.
