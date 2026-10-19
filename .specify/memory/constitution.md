# Gacha (nom de travail) — Constitution

Jeu de collection à tirages (gacha), DA cartoon non figée. On construit **un mécanisme
à la fois** : d'abord le gacha seul, ensuite le gameplay qui permet de l'alimenter.

## Core Principles

### I. Un mécanisme à la fois (NON NÉGOCIABLE)

- Chaque feature est une spec `specs/NNN-nom/` qui porte sur **un seul** mécanisme
  joueur, énonçable en une phrase.
- On n'ouvre la spec suivante que lorsque la précédente est **mergée et jouable**.
- Ce qui sort du périmètre va dans `docs/ROADMAP.md` (« Plus tard »), jamais dans le code.
  Pas de code « préparatoire » pour une feature future, pas d'abstraction sans deuxième
  usage réel (YAGNI).

*Pourquoi :* le prototype précédent (run, combat, reliques, talents, backend, gacha en
même temps) a montré qu'empiler les features empêche d'en finir une seule correctement.

### II. Spécifier avant de coder (NON NÉGOCIABLE)

- Ordre imposé : `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` →
  `/speckit-tasks` → `/speckit-analyze` → `/speckit-implement`.
- **Aucun code applicatif sans `spec.md` clarifiée et mergée.** Les choix de design
  (contenu, règles, équilibrage) sont posés à l'utilisateur pendant `/speckit-clarify` ;
  tout le reste (plan, tâches, merge) est décidé par Claude en autonomie.
- Une spec est prête quand `scripts/check-docs.py` passe (aucune clarification en
  suspens, checklist qualité complète) ; un plan l'est quand `/speckit-analyze` ne
  remonte aucun problème critique.
- `spec.md` dit le *quoi* et le *pourquoi*, du point de vue du joueur, sans technique.
  La technique vit dans `plan.md`.
- Un écart découvert pendant l'implémentation se corrige **d'abord dans la spec**
  (puis plan/tâches), ensuite dans le code.

### III. Décisions tracées (ADR)

- Toute décision structurante est un ADR dans `docs/adr/NNNN-titre.md`, au format de
  `docs/adr/0000-template.md` : stack, architecture, format de sauvegarde, règle de
  design durable, option écartée qu'on ne veut pas rediscuter.
- Statuts : `Proposé` → `Accepté` → éventuellement `Remplacé par NNNN`. Claude accepte
  les ADR techniques ; un ADR qui tranche un choix de design est soumis à l'utilisateur.
- **Un ADR accepté n'est jamais réécrit** : on en écrit un nouveau qui le remplace.
- `plan.md` cite les ADR qu'il respecte et ceux qu'il propose ; un ADR proposé par un
  plan est accepté en même temps que ce plan.

### IV. Gacha transparent et reproductible

- Les taux de chaque rareté sont **affichés au joueur** et lus dans la même source de
  données que celle qu'utilise le tirage : impossible qu'ils divergent.
- Le hasard est **injecté** (générateur passé en paramètre, graine possible) : tout
  tirage est rejouable à l'identique dans un test.
- Les règles (taux, pity, doublons, coûts) sont écrites dans la spec et vérifiées par
  des tests, y compris statistiques (distribution sur un grand nombre de tirages).
- Pas d'argent réel, de monnaie premium ni de mécanique de pression (offre à durée
  limitée, etc.) sans ADR dédié.

### V. Logique pure, tests qui mordent

- Les règles de jeu sont du TypeScript **pur** (ni Phaser, ni DOM, ni `localStorage`)
  dans un dossier dédié ; les scènes ne font qu'afficher et relayer les actions.
- Tests Vitest sur toute la logique. **Un test ne compte que si on l'a vu échouer** :
  le valider par mutation (casser la règle, voir rougir, restaurer). Les assertions
  portent sur l'effet réel, jamais sur un champ descriptif recopié à côté.
- Lint, typecheck, tests et build verts avant chaque commit.

### VI. Simplicité et DA interchangeable

- La DA cartoon est provisoire : couleurs, polices et contours sont des **tokens d'un
  seul fichier de thème**. Aucune couleur ni police en dur dans une scène. Changer de
  DA doit rester le chantier d'un fichier (plus les visuels).
- Le contenu (personnages, raretés, taux, coûts) vit dans des fichiers de données,
  jamais dans les scènes.
- Local-only : sauvegarde navigateur **versionnée** (numéro de version + migration).
  Un serveur ne revient que par ADR.

## Contraintes techniques

- Phaser 3 + TypeScript strict + Vite ; tests Vitest ; lint ESLint (ADR 0003).
- Écran de référence : mobile portrait. Les dimensions exactes se fixent au plan de la
  première feature.
- Langue : spécifications, ADR, commentaires de code et textes du jeu en **français**.

## Workflow de développement

- Une branche par feature : `feat/NNN-nom` pour `specs/NNN-nom/` ; `chore/…` et `fix/…`
  pour le reste. Jamais de push direct sur `main`.
- **Merge en autonomie** : Claude merge lui-même toute PR qu'il juge prête, sans demander.
  À lui de mettre en place les contrôles qui lui permettent d'en juger (CI, scripts,
  tests, captures) ; l'absence de contrôle n'est pas une raison de demander.
- **PR de spec** (`spec.md` + `plan.md` + `tasks.md` + ADR éventuels) : mergée quand la
  CI est verte (dont `scripts/check-docs.py`) et que `/speckit-analyze` est propre.
- **PR d'implémentation** : CI verte et comportement vérifié dans le jeu réel (build
  statique, capture d'écran) avant le merge ; `tasks.md` coché au fil de l'eau.
- Une fois la feature mergée, `docs/ROADMAP.md` est mis à jour.

## Governance

- Cette constitution prime sur `CLAUDE.md`, qui prime sur les habitudes. En cas de
  conflit, on amende ici plutôt que de contourner.
- Amendement : PR dédiée, sur demande de l'utilisateur ou proposée par Claude et
  signalée à l'utilisateur ; version semver (MAJOR : principe
  retiré ou redéfini ; MINOR : principe ou section ajouté ; PATCH : formulation).
- `/speckit-analyze` vérifie la conformité à la constitution avant toute implémentation ;
  une violation se corrige ou se justifie dans la section *Complexity Tracking* du plan.

**Version**: 2.0.0 | **Ratified**: 2026-10-19 | **Last Amended**: 2026-10-19
