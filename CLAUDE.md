# CLAUDE.md

Instructions pour Claude Code. À lire entièrement avant toute action sur ce repo.

**Projet perso** (GitHub `Antoily`), sans lien avec un contexte professionnel : ces consignes
s'appliquent ici quel que soit le compte Claude ou la machine ; ne pas utiliser ici de compte, dépôt
ou outil du travail. Autre machine : `infra/docs/nouvelle-machine.md` (dépôt `Antoily/infra`).

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
TS 6 + Vite 8 sur Node 24, local-only (ADR 0004). Features livrées : 001 Tirage,
002 Pity & doublons, 003 Collection, 004 Révélation, 005 Son.

## Commandes

**Node 24 obligatoire** (`.nvmrc`). Sur la WSL, toujours charger nvm d'abord : le `node`
du PATH non interactif y est le Node 18 système. Ailleurs, vérifier `node -v` (Mac :
`brew install node@24` ou nvm).

```bash
source ~/.nvm/nvm.sh && nvm use
npm run lint && npm run typecheck && npm test   # logique pure (Vitest)
npm run e2e        # build + vite preview + Playwright ; captures dans test-results/captures/
npm run dev        # jeu en local (pour vérifier un rendu : e2e ou preview, pas dev)
scripts/mutate.sh <fichier> '<ancien>' '<nouveau>' [filtre]   # validation par mutation
scripts/mutate-e2e.sh <fichier> '<ancien>' '<nouveau>' <spec e2e> [-g titre]   # idem pour une scène
```

## Structure

```
src/data/     contenu : catalogue.ts (20 éléments), gachaConfig.ts (raretés, poids, coûts), revealConfig.ts (fausses pistes, durées), sounds.ts (recettes des bruitages)
src/logic/    TS pur, testé : rng, rates, gacha, progression, save, format, collection, reveal, soundCues, settings (lint : ni phaser ni navigateur)
src/ui/       theme.ts (SEULES couleurs/polices), layout.ts (géométrie, partagée avec l'e2e), widgets.ts, reveal.ts (animation), sfx.ts (son)
src/scenes/   BootScene (lit la sauvegarde) → GachaScene (écran + fenêtres)
tests/e2e/    parcours Playwright du quickstart, critère de merge
public/sounds/ enregistrements CC0 seulement, chacun listé dans CREDITS.md (ADR 0006)
```

- Positions : toute zone cliquable vient de `src/ui/layout.ts`, que le test e2e
  importe pour cliquer au même endroit. Déplacer un bouton = changer `layout.ts`.
- `GachaScene` pose `document.body.dataset.ready = 'gacha'` quand l'écran est prêt, et
  `document.body.dataset.modal = '<nom>'` tant qu'une fenêtre est ouverte (`reveal`,
  `flip`, `results`, `rates`, `collection`, `confirm-exchange`, `confirm-reset`,
  `warning`), et `dataset.reveal` = paliers montrés (`rare>legendary`) pendant
  `reveal` ; `dataset.sounds` (sons émis depuis le dernier tirage), `dataset.soundsLive`
  (notes en train de sonner) et `dataset.muted`. L'e2e s'en sert pour vérifier l'enchaînement des écrans : sans lui, deux
  mutations de la 002 survivaient (une confirmation ouverte à tort que la logique
  refusait ensuite).
- Playwright tourne avec **un seul worker** : les captures sont numérotées dans
  l'ordre d'exécution et deux fichiers en parallèle s'écrasaient mutuellement.
- Sauvegarde **v2** (`{ version, currency, owned, pity, shards }`) ; migration 1 → 2
  dans `src/logic/save.ts`. Ajouter un champ = version + 1, migration, tests.
- Réglages de l'appareil (son coupé…) dans **`gacha.settings`**, hors sauvegarde de
  partie : « Recommencer » ne les touche pas (ADR 0006).
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

- Remote en **SSH** (`git@github.com:Antoily/fantasy-gacha-roguelike.git`) ; sur une
  autre machine, `new-machine.sh` le redirige vers la clé perso de la machine.
- `gh` = compte Antoily : `gha …` s'il existe, sinon `env -u GITHUB_TOKEN -u GH_TOKEN gh …`
  (ces variables pointent vers un autre compte). Ne jamais changer le compte gh actif.
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
- **Headless WSL2** (ailleurs, Chromium headless suffit en principe) : WebGL échoue par défaut (« Framebuffer Unsupported ») ; lancer
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
- Insécables aussi entre un montant et son unité (« 150\u00a0éclats ») et devant
  « ? » / « ! » : Phaser coupe les lignes sur les espaces ordinaires.
- Phaser 4 a supprimé `Phaser.Geom.Point` : utiliser `Phaser.Math.Vector2` (ex.
  `fillPoints`).
- Une fenêtre au contenu variable dérive sa géométrie d'une fonction de `layout.ts`,
  que l'e2e appelle aussi pour viser ses boutons.
- **003** : la collection a remplacé la liste d'échange de 002 (fusion décidée par
  l'utilisateur). L'échange d'éclats ne passe plus que par elle ; l'ordre des cases
  vient de `collectionEntries` (`src/logic/collection.ts`), importé par l'e2e.
- Mutations « purement visuelles » (un élément dessiné en trop, sans effet sur l'état
  ni les fenêtres) : l'e2e ne peut pas les voir, seule la relecture des captures le
  peut. Les signaler comme telles plutôt que d'alourdir les tests.
- Tests à graine fixe : pour vérifier une table de tirage précise, un `scriptedRng`
  (`src/logic/testing.ts`) rend des valeurs choisies ; l'ordre de consommation du
  hasard (rareté puis élément) est contractuel.

## Leçons de la feature 004

- **Hasard scripté dans l'e2e** : `installRng` / `scriptRng` (`tests/e2e/helpers.ts`)
  remplacent `Math.random` par une file. Ça ne tient que parce que l'ordre de
  consommation est contractuel (tirage, puis déroulé) et que la scène ne tire **aucun**
  autre hasard : pas de `Phaser.Math.Between` / `FloatBetween` (ils lisent `Math.random`).
- **Tweens concurrents** : un tween encore en cours écrase une valeur posée à la main
  (le leurre « dégonflé » effaçait les rayons du vrai palier). `killTweensOf` sur la
  cible et ses enfants avant de reposer un état. Bug invisible aux tests, vu sur capture.
- Une mise en scène garde ses minuteries et tweens (`Sequence`, `src/ui/reveal.ts`) pour
  tout arrêter d'un coup quand le joueur passe ; sinon un rappel en retard rouvre une
  fenêtre.
- **Mutations de scène** : `scripts/mutate-e2e.sh` (même principe que `mutate.sh`, mais
  l'e2e) ; il refuse de tourner si un `vite preview` écoute déjà (build non muté).
- L'outil d'écriture de fichier transforme `\u00a0` en vrai U+00A0, que le lint refuse
  (`no-irregular-whitespace`) : réécrire l'échappement après coup.

## Leçons de la feature 005

- **Tester du son sans l'entendre** : le lecteur (`src/ui/sfx.ts`) tient un journal
  (`dataset.sounds`) et le nombre de notes en cours (`dataset.soundsLive`). Le journal
  seul laissait survivre la mutation « passer ne coupe pas le son en cours ».
- Chromium headless a besoin de `--autoplay-policy=no-user-gesture-required`
  (`playwright.config.ts`) pour que le contexte audio tourne.
- Un `try/catch` défensif ne compte que si un test le fait servir : l'e2e « un son qui
  plante » casse `createOscillator` et exige zéro `pageerror`.
- Une garde jamais vue échouer est retirée plutôt que gardée (le voile bloquait déjà
  le bouton son pendant une fenêtre).
- `ffmpeg` (installé via apt sur la WSL) sert à convertir / mesurer les sons :
  `ffprobe -show_entries format=duration`, spectre avec `showspectrumpic`.

## Leçons de la révision 004 (particules)

- **Particules faites main** (`src/ui/particles.ts`, un Graphics redessiné à chaque
  image) : l'émetteur de Phaser et `cameras.main.shake` lisent `Math.random` et
  décaleraient le hasard scripté de l'e2e. Le décor tire son hasard d'un `mulberry32`
  à graine propre.
- **Deux worktrees en parallèle** : `E2E_PORT=4183 npm run e2e`. Sans ça, Playwright
  réutilise le `vite preview` de l'autre copie sur 4173 et teste **son** build.
- **Filmer une animation** : la capture vidéo de Playwright ralentit le rendu logiciel
  et Phaser borne alors son delta (page « hors focus ») : le jeu passe au ralenti.
  Remplacer `requestAnimationFrame` et `performance.now` par une horloge virtuelle,
  avancer de 1/30 s, `page.screenshot()` à chaque image, puis `ffmpeg -framerate 30`.

## Conventions de code

- TypeScript strict, pas de `any`. Imports relatifs.
- Commentaires en français, sur le *pourquoi*.
- Données (personnages, taux, coûts) dans des fichiers de données ; couleurs et
  polices dans un seul fichier de thème.
