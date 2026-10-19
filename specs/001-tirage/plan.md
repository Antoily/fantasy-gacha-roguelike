# Implementation Plan: Tirage

**Branch**: `feat/001-tirage` | **Date**: 2026-10-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-tirage/spec.md`

## Summary

Premier code du projet : un jeu Phaser à un seul écran où le joueur dépense un stock
fixe de 9 000 pour des tirages ×1 (100) ou ×10 (900, un Rare ou mieux garanti) parmi
20 personnages et créatures, consulte les taux, et retrouve sa progression au
rechargement. Toute la règle (taux, tirage, garantie, porte-monnaie, sauvegarde) est
du TypeScript pur testé de façon déterministe ; les scènes ne font qu'afficher. Le
projet se dote en même temps de sa CI complète (lint, types, tests, build, test de
bout en bout avec captures), qui sert de critère de merge.

## Technical Context

**Language/Version**: TypeScript 6.0 (strict), Node 24 (`.nvmrc`)

**Primary Dependencies**: Phaser 4.2, Vite 8 (ADR 0004)

**Storage**: `localStorage`, clé `gacha.save`, JSON versionné (ADR 0005)

**Testing**: Vitest 5 (logique pure, graine fixe, tests statistiques) ; Playwright 1.64
sur le build pour le bout en bout ; ESLint 10 + typescript-eslint 8

**Target Platform**: navigateur de bureau récent (Chromium, Firefox), affichage portrait
360 × 640 mis à l'échelle (`Scale.FIT`)

**Project Type**: jeu web mono-package (front uniquement)

**Performance Goals**: 60 fps à l'écran ; un tirage ×10 calculé et sauvegardé en moins
de 50 ms ; premier tirage visible < 10 s après ouverture (SC-001)

**Constraints**: hors ligne (aucune ressource distante), aucune couleur ni police en dur
hors `src/ui/theme.ts`, aucune donnée de contenu hors `src/data/`

**Scale/Scope**: 1 écran + 3 modales, 20 éléments, 5 raretés, 1 joueur local

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Vérification | Statut |
|----------|--------------|--------|
| I. Un mécanisme à la fois | Seul le tirage est construit ; pity, valeur des doublons, collection et animation sont exclus (spec, *Assumptions*). Aucun code préparatoire pour 002–004. | ✅ |
| II. Spécifier avant de coder | Spec clarifiée (2 questions), aucune clarification en suspens, checklist 16/16. | ✅ |
| III. Décisions tracées | ADR 0004 (versions, remplace 0003) et 0005 (sauvegarde) créés par ce plan. | ✅ |
| IV. Gacha transparent et reproductible | Taux lus dans une seule table (R5) pour le tirage et l'affichage ; générateur injecté (R4) ; tests statistiques SC-002/SC-003. Ni argent réel ni pression. | ✅ |
| V. Logique pure, tests qui mordent | `src/logic/` sans Phaser ni navigateur ; validation par mutation prévue pour chaque test (tâches dédiées). | ✅ |
| VI. Simplicité, DA interchangeable | Tokens dans `src/ui/theme.ts`, contenu dans `src/data/` ; sauvegarde versionnée ; local-only. | ✅ |
| Workflow | PR de spec (ce plan) puis PR d'implémentation ; CI sur toutes les PR. | ✅ |

**Re-check après Phase 1** : le modèle de données et les contrats n'introduisent ni
abstraction sans second usage (pas de classe, pas d'interface de stockage : la scène
appelle `localStorage` directement, la logique ne fait que (dé)sérialiser), ni
dépendance hors ADR 0004. ✅

## Project Structure

### Documentation (this feature)

```text
specs/001-tirage/
├── spec.md              # /speckit-specify + /speckit-clarify
├── catalogue.md         # annexe : les 20 éléments
├── plan.md              # ce fichier
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1 — guide de validation
├── contracts/
│   ├── logic-api.md     # surface de src/logic/ et garanties testées
│   └── ui-screens.md    # écran, modales, zones cliquables
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
.nvmrc                   # 24
package.json             # scripts : dev, build, preview, lint, typecheck, test, e2e
index.html
vite.config.ts
tsconfig.json            # strict, noEmit
eslint.config.js
playwright.config.ts     # webServer = vite preview sur le build, Chromium swiftshader

src/
├── main.ts              # configuration Phaser (360×640, FIT), liste des scènes
├── data/
│   ├── catalogue.ts     # les 20 éléments (contenu de catalogue.md)
│   └── gachaConfig.ts   # raretés + poids, coûts, stock de départ
├── logic/               # TS pur — aucune importation de phaser ni d'API navigateur
│   ├── rng.ts           # type Rng, mulberry32
│   ├── rates.ts         # table des raretés, pourcentages, formatage
│   ├── gacha.ts         # pullSingle, pullTen (garantie)
│   ├── progression.ts   # état joueur, pull, reset
│   └── save.ts          # serializeSave, parseSave, migrations
├── ui/
│   ├── theme.ts         # couleurs, contours, polices, couleurs de rareté
│   ├── layout.ts        # constantes de position (partagées avec l'e2e)
│   └── widgets.ts       # bouton, panneau, modale, carte de résultat
└── scenes/
    ├── BootScene.ts     # lit la sauvegarde, passe l'état à GachaScene
    └── GachaScene.ts    # écran de tirage + modales résultats / taux / recommencer

tests/
└── e2e/
    └── gacha.spec.ts    # scénario du quickstart, captures

.github/workflows/ci.yml # + job « game » : lint, typecheck, test, build, e2e (+ captures en artefact)
```

Les tests unitaires sont à côté du code qu'ils couvrent (`src/logic/*.test.ts`).

**Structure Decision**: un seul package à la racine. Le backend du prototype a
disparu (ADR 0002) ; un découpage `frontend/` + `backend/` n'aurait aujourd'hui
qu'un seul membre. La frontière qui compte est `src/logic/` (pur, testé) contre
`src/scenes/` + `src/ui/` (affichage), et elle est vérifiée par une règle de lint
interdisant d'importer `phaser` depuis `src/logic/`.

## Complexity Tracking

Aucune violation de la constitution à justifier.
