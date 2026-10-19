# CLAUDE.md

Instructions pour Claude Code. À lire entièrement avant toute action sur ce repo.

## ⚠️ Tenir ce fichier à jour

À chaque interaction, inscrire ici toute nouvelle consigne, convention ou décision
durable de l'utilisateur. Ne pas dupliquer ce que disent déjà la constitution, les
ADR, les specs, le code ou git.

## Où sont les règles

1. **`.specify/memory/constitution.md`** : les principes non négociables. Elle prime
   sur ce fichier. La relire avant chaque feature.
2. **`docs/ROADMAP.md`** : ce qui est en cours, ce qui vient ensuite, ce qu'on ne
   code pas.
3. **`docs/adr/`** : les décisions structurantes. Un ADR accepté ne se réécrit pas, on
   le remplace (gabarit : `0000-template.md`).
4. **`specs/NNN-nom/`** : spec, plan et tâches de chaque feature.

## État du projet

Remise à zéro le 2026-10-19 (ADR 0002). L'ancien prototype « Fantasy Roguelike
Gacha » est sous le tag `legacy-v1` et la branche `legacy` (ne pas supprimer). On
construit d'abord **le gacha seul** ; le gameplay viendra après. Stack : Phaser 4 +
TS 6 + Vite 8 sur Node 24, local-only (ADR 0004). Feature livrée : 001 Tirage.

## Commandes

**Toujours charger nvm d'abord** : le `node` du PATH non interactif est le Node 18
système, trop vieux pour toute la chaîne (`.nvmrc` = 24).

```bash
source ~/.nvm/nvm.sh && nvm use
npm run lint && npm run typecheck && npm test   # logique pure (Vitest)
npm run e2e        # build + vite preview + Playwright ; captures dans test-results/captures/
npm run dev        # jeu en local (pour vérifier un rendu : e2e ou preview, pas dev)
scripts/mutate.sh <fichier> '<ancien>' '<nouveau>' [filtre]   # validation par mutation
```

## Structure

```
src/data/     contenu : catalogue.ts (20 éléments), gachaConfig.ts (raretés, poids, coûts)
src/logic/    TS pur, testé : rng, rates, gacha, progression, save, format (lint : ni phaser ni navigateur)
src/ui/       theme.ts (SEULES couleurs/polices), layout.ts (géométrie, partagée avec l'e2e), widgets.ts
src/scenes/   BootScene (lit la sauvegarde) → GachaScene (écran + fenêtres)
tests/e2e/    parcours Playwright du quickstart, critère de merge
```

- Positions : toute zone cliquable vient de `src/ui/layout.ts`, que le test e2e
  importe pour cliquer au même endroit. Déplacer un bouton = changer `layout.ts`.
- `GachaScene` pose `document.body.dataset.ready = 'gacha'` quand l'écran est prêt :
  c'est le signal qu'attend l'e2e.
- **Relire les captures de l'e2e** avant chaque merge touchant l'affichage : un test
  vert n'empêche ni un texte qui déborde ni une fenêtre trop haute.

## Workflow Spec Kit

Skills installés dans `.claude/skills/speckit-*` (Spec Kit **v1.2.1**, épinglé) :

```
/speckit-specify   → specs/NNN-nom/spec.md   (le quoi, sans technique)
/speckit-clarify   → questions à l'utilisateur, réponses intégrées à la spec
/speckit-plan      → plan.md, research.md, data-model.md… (le comment, ADR cités)
/speckit-tasks     → tasks.md
/speckit-analyze   → cohérence spec/plan/tâches + conformité constitution
/speckit-implement → code, en cochant tasks.md
```

- **Autonomie complète** (consigne de l'utilisateur, 2026-10-19) : ne jamais demander
  s'il faut merger. Merger toute PR jugée prête, et construire soi-même les contrôles
  nécessaires pour en juger. Seules les questions de **design** (contenu, règles,
  équilibrage) vont à l'utilisateur, pendant `/speckit-clarify`, une à la fois.
- Garde-fou des PR de spec : `scripts/check-docs.py` (lancé par la CI). L'étendre dès
  qu'une erreur de document passe à travers.
- Branche git `feat/NNN-nom` (le script Spec Kit ne crée pas de branche, il crée
  seulement le dossier `specs/NNN-nom/`).
- Deux PR par feature : **PR de spec** (mergée quand la CI est verte et
  `/speckit-analyze` propre), puis **PR d'implémentation** (CI verte et rendu vérifié).
- Mettre à jour `docs/ROADMAP.md` en ouvrant et en clôturant une feature.
- `specify` est installé via `uv tool` (`~/.local/bin/specify`). Montée de version :
  `uv tool install --force specify-cli --from git+https://github.com/github/spec-kit.git@vX.Y.Z`
  puis `specify init --here --force --non-interactive --integration claude --script sh`,
  et relire le diff (la constitution n'est pas écrasée, les gabarits si).

## Git et GitHub

- Remote en **SSH** (`git@github.com:Antoily/fantasy-gacha-roguelike.git`) : le HTTPS
  n'a pas d'identifiants sur cette machine.
- `gh` : toujours `env -u GITHUB_TOKEN -u GH_TOKEN gh …` (ces variables pointent vers
  un autre compte).
- Jamais de push sur `main`, jamais de force-push ; supprimer la branche après merge.
- **PR empilées** : rebasculer la PR fille sur `main` (`gh api -X PATCH repos/…/pulls/N -f base=main`) **avant** de merger la mère avec `--delete-branch` ; sinon GitHub ferme la fille définitivement (#17 perdue ainsi). `gh pr edit` échoue (dépréciation Projects classic) : passer par `gh api`.
- Ne jamais committer : `.env`, `node_modules/`, `dist/`, `android/`.
- `.claude/` est ignoré **sauf** `.claude/skills/` (les skills Spec Kit sont versionnés).
- CI (`.github/workflows/ci.yml`) sur **toutes** les PR, pas seulement celles qui
  visent `main`. Pour l'instant : contrôle des documents ; le jeu y ajoute lint,
  typecheck, tests et build avec la feature 001.

## Leçons du prototype à réappliquer

- **Vérifier un rendu via le build statique**, jamais via `npm run dev` : sur WSL2, le
  serveur de dev a servi du JS obsolète au navigateur. `npm run e2e` le fait.
- **Headless WSL2** : WebGL échoue par défaut (« Framebuffer Unsupported ») ; lancer
  Chromium avec `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`.
  Le canvas WebGL se capture avec `page.screenshot()`, pas avec `getImageData`.
- `tsc` sans `--noEmit` compile des `.js` à côté des `.ts` : mettre `noEmit` dans le
  `tsconfig`.
- **Phaser ignore les masques pour les clics** : dans une liste défilante, filtrer les
  appuis hors cadre et passer l'UI fixe au-dessus (`setDepth`). Réagir sur
  `pointerup`, pas `pointerdown`, sinon un défilement sélectionne au passage.
- **Un panneau au contenu variable se dimensionne d'après ce contenu**, jamais en
  hauteur fixe.
- **Tests qui mordent** : plusieurs tests du prototype passaient sans rien vérifier
  (scénario qui contournait la règle testée, assertion sur une constante recopiée).
  D'où le principe V de la constitution : mutation systématique (`scripts/mutate.sh`).

## Leçons de la feature 001

- **Le voile d'une fenêtre ne bloque pas un double-clic** : Phaser traite deux clics
  rapprochés dans la même image, avant que le voile existe. Toute action qui ne doit
  pas partir deux fois garde son propre verrou (`modalOpen` dans `GachaScene`) ;
  la mutation qui l'enlève fait débiter deux tirages.
- **Montants** : `formatAmount` sépare les milliers par U+00A0 (insécable). Pas de
  `toLocaleString('fr-FR')` (U+202F, carré dans certaines polices) ni d'espace
  ordinaire (« 9 / 000 » coupé en fin de ligne).
- Une mutation peut créer une boucle infinie synchrone que vitest n'interrompt pas :
  `scripts/mutate.sh` borne chaque essai à 180 s et compte le blocage comme détecté.
- Tests à graine fixe : pour vérifier une table de tirage précise, un `scriptedRng`
  (`src/logic/testing.ts`) rend des valeurs choisies ; l'ordre de consommation du
  hasard (rareté puis élément) est contractuel.

## Conventions de code

- TypeScript strict, pas de `any`. Imports relatifs.
- Commentaires en français, sur le *pourquoi*.
- Données (personnages, taux, coûts) dans des fichiers de données ; couleurs et
  polices dans un seul fichier de thème.
