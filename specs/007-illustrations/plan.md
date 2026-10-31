# Implementation Plan: Illustrations

**Branch**: `feat/007-illustrations` | **Date**: 2026-10-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/007-illustrations/spec.md`, et révision du
2026-10-30 de [004](../004-revelation/spec.md) (FR-016, FR-017), livrée avec elle.

## Summary

Vingt illustrations et dix-neuf visuels d'interface, dessinés à la main en SVG
selon une charte commune (`docs/art/`), rastérisés par le navigateur au chargement à la
taille exacte où le jeu les affiche. Le jeu rend désormais à la densité de l'écran
(canvas ×R, caméra ×R) pour qu'ils restent nets. Les cartes, la collection, la bannière
et l'écran de tirage les affichent ; une nouvelle fenêtre `splash` présente chaque
Légendaire et Ultra rare ; la révélation gagne la nuit, le cercle magique, les fissures
de l'orbe, un temps figé et deux fois plus de particules.

## Technical Context

**Language/Version**: TypeScript 6.0 (strict), Node 24 — inchangé (ADR 0004)

**Primary Dependencies**: Phaser 4.2, Vite 8 — aucune nouvelle dépendance ; Playwright
(déjà là) sert aussi d'outil d'aperçu des visuels (`scripts/art/preview.mjs`)

**Storage**: aucun changement (sauvegarde v3, réglages `gacha.settings`)

**Testing**: Vitest (présentations, échelle de rendu, calendrier de la révélation),
Playwright sur le build (enchaînement des fenêtres, `splash`, repli sans illustration,
rendu ×2), `npm run art:check` et `npm run art:contrast` en CI, relecture des captures

**Target Platform**: navigateur, portrait 360 × 640 agrandi pour remplir l'écran

**Project Type**: jeu web mono-package

**Performance Goals**: écran de tirage prêt en < 3 s (SC-004) ; 60 images/s pendant la
révélation sur un téléphone récent (particules dans un seul Graphics, pas de filtre par
objet dans les listes)

**Constraints**: positions dans `src/ui/layout.ts` (e2e) ; aucun hasard de la scène hors
`mulberry32` décoratif (leçon 004) ; couleurs de l'interface dans `theme.ts`, celles
des visuels dans leurs SVG (constitution VI : « plus les visuels »)

**Scale/Scope**: 20 illustrations, 19 visuels d'interface ; 5 écrans touchés (tirage,
révélation, résultats ×1/×10, collection, taux) ; 1 fenêtre nouvelle (`splash`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Vérification | Statut |
|----------|--------------|--------|
| I. Un mécanisme à la fois | 007 : voir ses personnages (illustrations partout, présentation des belles prises). La révision de 004 reste dans 004 (FR-016, FR-017). Univers définitif, nom du jeu, écran titre : hors périmètre. | ✅ |
| II. Spécifier avant de coder | Spec clarifiée (4 questions tranchées par l'utilisateur), checklist complète, `check-docs.py` vert. Les dessins sont du contenu, produits pendant la spec à la demande de l'utilisateur ; leur intégration attend cette PR. | ✅ |
| III. Décisions tracées | ADR 0007 (proposé ici, accepté avec ce plan) : visuels SVG faits main + rendu à la densité de l'écran. | ✅ |
| IV. Gacha transparent et reproductible | Rien ne change au tirage ; la présentation se déduit des résultats (logique pure) ; la scène ne consomme aucun hasard de plus. | ✅ |
| V. Logique pure, tests qui mordent | `presentations()` (logique) et `renderScale()` (géométrie) testés et mutés ; calendrier de révélation testé ; enchaînement `splash` et repli testés en e2e et mutés. | ✅ |
| VI. Simplicité, DA interchangeable | Couleurs d'interface dans `theme.ts` ; visuels dans `public/art/` sous une charte ; cadrages dans des JSON de données ; un seul module de chargement (`src/ui/art.ts`). | ✅ |

**Re-check après Phase 1** : aucune donnée sauvegardée ; les cadrages sont des données ;
les vignettes sont fabriquées une fois au démarrage (pas de masque par image). ✅

## Project Structure

### Documentation (this feature)

```text
specs/007-illustrations/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
├── contracts/ui-screens.md
├── checklists/requirements.md
└── tasks.md
docs/art/charte.md · briefs.md · exemple-technique.svg   charte et fiches des visuels
docs/adr/0007-visuels-svg-et-densite.md                   NOUVEAU (accepté avec ce plan)
```

### Source Code (fichiers touchés)

```text
public/art/characters/<id>.svg + <id>.json   NOUVEAU : 20 illustrations et leurs cadrages
public/art/ui/…                              NOUVEAU : fonds, orbe, fissures, cercle, dos, icônes, emblèmes
scripts/art/check.mjs · preview.mjs          contrôle et aperçu des visuels (outillage)
scripts/art/contrast.mjs                     NOUVEAU : contraste des textes posés sur le fond (SC-003)
src/logic/presentation.ts                    NOUVEAU : quels résultats présenter, dans quel ordre
src/ui/layout.ts                             renderScale() ; carte ×1 agrandie ; cadres buste/portrait ; SPLASH
src/ui/art.ts                                NOUVEAU : chargement, vignettes (tête, buste, silhouette), repli
src/ui/theme.ts                              teintes de la nuit, lueurs, cadres de rareté
src/ui/widgets.ts                            cartes illustrées, icônes, emblèmes, orbe en image
src/ui/reveal.ts                             nuit, cercle magique, fissures, temps figé, particules ×2
src/ui/particles.ts                          formes « shard » (éclat de verre) et « glow » (lueur)
src/ui/splash.ts                             NOUVEAU : présentation plein écran
src/scenes/BootScene.ts                      charge les visuels (taille × R), fabrique les vignettes
src/scenes/GachaScene.ts                     fond, icônes, bannière illustrée, file de présentations
src/main.ts                                  canvas 360R × 640R, caméra ×R
src/data/revealConfig.ts · sounds.ts         suspense 1,6 s en trois temps, sons des fissures
tests/e2e/illustrations.spec.ts              NOUVEAU : quickstart 007
tests/e2e/helpers.ts                         passer les présentations
.github/workflows/ci.yml                     art:check et art:contrast
```

**Structure Decision**: aucune nouvelle couche. Le chargement et la fabrication des
vignettes vivent dans `src/ui/art.ts` (affichage) ; la seule règle nouvelle (qui est
présenté, dans quel ordre) est de la logique pure.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Rendu à la densité de l'écran (canvas ×R) | Sans lui, le jeu agrandi par le navigateur rend toute illustration floue (FR-009) | Fixer le jeu à 720 × 1280 : toute la géométrie et l'e2e à doubler |
