# CLAUDE.md — Fantasy Roguelike Gacha

Instructions pour Claude Code. À lire entièrement avant toute action sur ce repo.

---

## ⚠️ Règle prioritaire — Tenir ce fichier à jour

**À chaque interaction avec l'utilisateur, mettre à jour ce `CLAUDE.md`** dès qu'une
nouvelle instruction, préférence, convention ou décision durable apparaît :

- Nouvelle consigne de l'utilisateur sur la façon de travailler → l'inscrire ici.
- Nouvelle convention de code / layout / archi adoptée → la documenter dans la bonne section.
- Changement de workflow, d'outil ou de priorité → mettre à jour la section concernée.

Ne pas dupliquer ce que le code ou l'historique git disent déjà. Ce fichier est la
mémoire partagée du projet : il doit refléter l'état réel des règles à tout moment.

---

## Contexte du projet

Jeu mobile **Fantasy Roguelike Gacha** — runs procéduraux + combat automatique sur grille + gacha de héros.
Le joueur ne décide que d'une chose : **quels personnages composent son équipe**.

- **Repo** : https://github.com/Antoily/fantasy-gacha-roguelike
- **Stack** : Phaser.js (TypeScript) + Capacitor (Android) | Node.js + Express + PostgreSQL + Prisma
- **Monorepo** : `frontend/` (jeu) · `backend/` (API REST) · `assets/` (prompts IA)

---

## Workflow Git — règles absolues

1. **Jamais de push direct sur `main`** — toujours passer par une PR.
2. **Branche par feature** : nommage `feat/nom-court`, `fix/nom-court`, `chore/nom-court`.
3. **Séquence standard** :
   ```
   git checkout -b feat/ma-feature
   # travail
   git add <fichiers spécifiques>
   git commit -m "feat: description"
   git push -u origin feat/ma-feature
   gh pr create --title "..." --body "..."
   ```
4. **Après merge d'une PR** : supprimer la branche locale et distante.
5. **Ne jamais committer** : `.env`, `node_modules/`, `dist/`, `android/`.

---

## Authentification GitHub

Le token gh CLI peut ne pas avoir le scope `workflow` au départ.  
Si `git push` échoue avec "refusing to allow an OAuth App to create workflow" :
```bash
gh auth refresh -h github.com --scopes workflow
# suivre le flux device (https://github.com/login/device)
git remote set-url origin https://Antoily:$(gh auth token)@github.com/Antoily/fantasy-gacha-roguelike.git
git push
git remote set-url origin https://github.com/Antoily/fantasy-gacha-roguelike.git  # nettoyer le token de l'URL
```

---

## CI/CD

3 workflows GitHub Actions :
- **`ci.yml`** : lint + typecheck + build sur chaque push/PR → `frontend/` et `backend/`
- **`pr-checks.yml`** : validation typecheck sur chaque PR + commentaire auto
- **`deploy-backend.yml`** : deploy VPS via SSH sur push `main` (nécessite secrets `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`)

**Prérequis CI** : les `package-lock.json` doivent exister. Les générer avec :
```bash
cd frontend && npm install && cd ../backend && npm install
```

**Fix CI cassée** : toujours ouvrir une PR (`fix/ci-...`), ne pas patcher directement sur main.

**Lint** : config ESLint legacy (`.eslintrc.json`) dans `frontend/` et `backend/`,
format imposé par ESLint 8.57 + typescript-eslint 7 épinglés. Ne pas migrer vers
`eslint.config.js` sans monter ESLint en v9+. `no-explicit-any` est en **erreur** ;
`no-non-null-assertion` est désactivé (le `!` est délibéré : `getHeroById(id)!`,
`req.userId!`, `slot.enemy!`). Lancer `npm run lint` dans chaque package avant de
committer — la CI l'exécute désormais réellement.

---

## Vérifier le rendu à l'écran

⚠️ **Le serveur de dev (`npm run dev`) peut servir du JS obsolète au navigateur** même
après modification des sources et purge de `node_modules/.vite` — observé sur WSL2 :
`curl` renvoyait le code à jour pendant que la page rendait l'ancien. Une capture d'écran
prise via le serveur de dev peut donc valider du code qui n'est pas celui du disque.

Pour vérifier un changement visuel, **passer par le build statique** :
```bash
cd frontend && npm run build && npx serve -s dist -l 4173
```
puis piloter `http://localhost:4173/` (Playwright, viewport 360×640 → canvas 1:1).
Le canvas est en WebGL sans `preserveDrawingBuffer` : le lire via `getImageData`
renvoie du vide, il faut utiliser `page.screenshot()`.

⚠️ `tsconfig.json` ne définit pas `noEmit` : un `tsc` sans `--noEmit` compile des `.js`
à côté de chaque `.ts` dans `src/`. Ne jamais les committer. (`npm run build` et
`npm run type-check` passent bien `--noEmit`.)

**Vérification headless sur WSL2** : le WebGL par défaut échoue
(« Framebuffer Unsupported »). Lancer Chromium avec
`--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`.

---

## Structure des fichiers — où tout se trouve

```
frontend/src/
  data/          # Données statiques (heroes, enemies)
  entities/      # Hero.ts, Enemy.ts — instances runtime
  systems/       # RunManager, CombatResolver, GachaSystem
  scenes/        # Scènes Phaser (une scène = un écran)
  ui/            # UIManager (helpers Phaser réutilisables)
  api/           # apiClient.ts (fetch vers le backend)
  config.ts      # Constantes globales (couleurs, fonts, taille écran)
  main.ts        # Point d'entrée Phaser

backend/src/
  routes/        # auth.ts, progress.ts, runs.ts, leaderboard.ts
  middleware/    # auth.ts (JWT requireAuth)
  index.ts       # Express app
backend/prisma/
  schema.prisma  # Modèles User, Progress, Run

assets/
  ASSET_PROMPTS.md  # Prompts IA pour tous les visuels
```

---

## Principe de game design — à ne pas perdre de vue

**La seule chose qui demande de l'attention au joueur, c'est le choix de ses personnages.**
Tout le reste doit se résoudre sans décision. Conséquences, à respecter pour toute
nouvelle fonctionnalité :

- **La puissance vient uniquement des héros.** Pas de reliques, pas d'objets,
  pas d'arbre de talents, pas d'amélioration de statistiques. Si une idée rend le
  joueur plus fort autrement que par « un meilleur personnage dans l'équipe »,
  elle est hors sujet.
- **Un héros = 3 statistiques et UN effet**, énonçable en une phrase. Deux phrases
  = trop compliqué. Le joueur doit pouvoir comparer deux héros d'un coup d'œil.
- **Le joueur ne place personne** sur la grille : `autoPlaceHeroes()` positionne
  selon le champ `row` du héros (`front` / `back`).
- Une salle ne propose **qu'un seul type de décision, et elle porte sur des
  personnages** : recruter, remplacer, soigner.

---

## Données du jeu — IDs à connaître

### Héros (`frontend/src/data/heroes.ts`)

20 héros, 3 stats (`hp` / `atk` / `spd`), un rôle, une rangée, une compétence.

| id | Nom court | Rôle | Rangée | Rareté | Compétence (`ability.id`) |
|----|-----------|------|--------|--------|---------------------------|
| `aldric` | Aldric | tank | front | legendary | `taunt` — attaqué en priorité |
| `thane` | Thane | tank | front | epic | `aegis` — équipe -25% dégâts |
| `brann` | Brann | tank | front | rare | `thorns` — renvoie 30% |
| `gorvak` | Gorvak | dps | front | rare | `cleave` — frappe le rang avant |
| `kael` | Kael | dps | front | common | `riposte` — +4 ATK par kill |
| `shade` | Shade | dps | back | epic | `execute` — cible le plus blessé |
| `zara` | Zara | dps | back | epic | `column` — frappe une colonne |
| `sylva` | Sylva | dps | back | epic | `double_shot` — attaque 2× |
| `vex` | Vex | dps | back | rare | `ambush` — +50% sur cible intacte |
| `nix` | Nix | dps | back | rare | `first_strike` — joue en premier |
| `finn` | Finn | heal | back | rare | `heal_one` — +50 PV au plus blessé |
| `sora` | Sora | heal | back | epic | `heal_all` — +20 PV à l'équipe |
| `lyra` | Lyra | support | back | rare | `weaken` — -50% ATK au plus fort |
| `ourg` | Ourg | tank | front | common | `parry` — ignore la 1re attaque reçue |
| `ysolde` | Ysolde | tank | front | epic | `regen` — +10 PV à chaque coup reçu |
| `corvus` | Corvus | dps | back | rare | `snipe` — cible la plus forte ATK |
| `ignis` | Ignis | dps | back | epic | `splash` — cible + voisins |
| `aubepine` | Aubépine | heal | back | legendary | `revive` — relève un allié, 1×/combat |
| `orin` | Orin | support | back | rare | `rally` — équipe +15% ATK |
| `sibylle` | Sibylle | support | back | epic | `slow` — ennemis -25% VIT |

Starters (`STARTER_HERO_IDS`) : `aldric`, `sylva`, `finn` — trois pour une équipe
de quatre, pour que le manque se fasse sentir dès la première partie.

### Formations ennemies (`frontend/src/data/enemies.ts`)
`spear_rush` · `arrow_rain` · `shield_wall` · `spread_assault` · `death_squad`

Les ennemis ont eux aussi 3 stats (plus de `def`).

---

## Système de combat — logique clé

- Grille **3×3**, remplie automatiquement : `front` → rang 0, `back` → rang 1.
- Tour trié par **VIT décroissante**. `first_strike` passe devant tout le monde.
- **Dégâts = ATK × [0.85–1.15]**. Il n'y a pas de défense : ce qu'un héros encaisse
  se lit dans ses PV, ce qu'il inflige dans son ATK. Rien à calculer pour le joueur.
- Ciblage : `taunt` prime sur tous les autres patterns ennemis.
- `resolveCombat(heroes, enemies)` résout tout le combat d'avance ; `CombatScene`
  ne fait que rejouer le journal en animations.
- Le multiplicateur d'or du mode auto est appliqué **par la scène**, pas par le
  résolveur.

---

## Boucle de run

`TeamSelect` → `RunMap` → salles → `GameOver`.

- **Équipe de `MAX_TEAM` (= 4)** héros, exporté par `RunManager.ts`.
- Une zone = 8 salles : `combat` ×4, `recruit` ×2, `rest` ×1, puis `boss`.
  3 zones pour gagner (`TOTAL_ZONES`).
- **`recruit` (`RecruitScene`)** : 3 héros proposés (tirés à la génération de la
  zone, donc stables). Équipe pleine → modale « qui laisse sa place ». Passer
  soigne l'équipe de 40 PV.
- **`rest` (`RestScene`)** : choisir UN héros à soigner à fond, ou à relever s'il
  est tombé (50% de ses PV).
- Un héros tombé reste à 0 PV : on le relève au campement, ou on le remplace au
  renfort. C'est la seule façon de se rattraper — et c'est un choix de personnage.
- L'or d'un run est reversé **en totalité** au méta-or en fin de run.

## Mode auto (run automatique)

Run en pilote automatique (bouton « 🤖 RUN AUTO (+30% 💰) »).

- Flag `autoMode` dans `RunState` · bonus d'or via `RunManager.getGoldMultiplier()`.
- Chaque scène de run, si `run.autoMode`, déclenche son action via
  `this.time.delayedCall(...)` avec un choix aléatoire (`pickRandom`).
- Un badge « 🤖 AUTO » est affiché en haut de chaque scène concernée.

## Gacha — animation de tirage

`GachaScene.playRarityIntro(rarity, onDone)` annonce la rareté **avant** de révéler
les cartes. L'intensité (rayons, étincelles, secousse, durée) vient de `RARITY_FX`.
Sur un tirage ×10, c'est la **meilleure** rareté de la salve qui dicte l'animation
(`RARITY_RANK`).

---

## Or de test

`MainMenuScene.ts` expose `DEBUG_GOLD`, appliqué au chargement par
`applyDebugGold()`. **Valeur par défaut : `0` (désactivé) — c'est l'état à
conserver.** Toute valeur > 0 écrase l'or du joueur à chaque rechargement de
page, ce qui rend l'économie intestable. Le remettre à `0` après usage.

---

## Progression méta

La **seule** progression entre les runs est le déblocage de héros :

- L'or gagné en run alimente le **gacha** (`GachaSystem`), qui ne distribue que des
  héros. Un doublon est converti en or (`DUPLICATE_REFUND`).
- Pity à **80 tirages** (configurable via `GachaSystem(pityCap)`).
- Plus de héros débloqués = plus de choix à la composition. C'est tout le jeu.

---

## État global du jeu (runtime)

`window.gameState` (défini dans `MainMenuScene.ts`) contient :
```ts
{
  runManager: RunManager,      // état du run en cours
  gacha: GachaSystem,
  unlockedHeroIds: string[],   // héros débloqués (persistant) — la seule progression
  totalGold: number,           // or méta (persistant)
  bestRun: { zonesCleared, roomsCleared }
}
```

Sauvegarde locale : `localStorage` clé `fantasy_roguelike_save` via `saveProgress()` dans `MainMenuScene.ts`.  
Sauvegarde serveur : **non branchée**. `apiClient` expose `saveProgress()`,
`login()`, `register()`, `loadProgress()`, `getLeaderboard()`, `setToken()` et
`clearToken()`, mais aucun n'a d'appelant : il n'y a pas d'écran de connexion.
Seuls `isAuthenticated()` et `saveRun()` sont utilisés (dans `GameOverScene`),
et `isAuthenticated()` est toujours faux tant que rien n'appelle `setToken()`.
La progression est donc **locale uniquement**. Ne pas supposer que le backend
reçoit quoi que ce soit.

---

## Conventions de code

- **TypeScript strict** partout — pas de `any` sauf cas exceptionnel documenté
- **Imports** : chemins relatifs, pas d'alias `@/`
- **Scènes Phaser** : toute logique de jeu dans `create()`, `update()` uniquement pour les animations continues
- **Pas de `require()` dynamique** dans les scènes — utiliser les imports statiques en haut de fichier
- **Commentaires** : en français, expliquer le "pourquoi" pas le "quoi"
- **Nouvelles données** (héros, reliques, events) : ajouter dans `data/`, jamais hardcodées dans les scènes

### Backend — règles non négociables

- **Un seul client Prisma** : importer `prisma` depuis `src/db.ts`. Ne jamais
  faire `new PrismaClient()` dans un fichier de routes — c'est un pool de
  connexions supplémentaire vers la même base.
- **Toute route `async` passe par `asyncHandler`** (`middleware/asyncHandler.ts`).
  Express 4 n'attrape pas les promesses rejetées : sans lui, une erreur Prisma
  laisse la requête pendre jusqu'au timeout et lève un `unhandledRejection`.
- **Les variables d'environnement obligatoires sont lues dans `src/config.ts`**,
  via `required()` qui fait échouer le démarrage si elles manquent. Ne jamais
  écrire `process.env.X ?? ''` pour un secret : ça transforme une config absente
  en faille silencieuse (avec `JWT_SECRET` vide, tous les tokens étaient
  forgeables).
- `errorHandler` doit rester le **dernier** `app.use` d'`index.ts`.

### Thème visuel — BD claire (cartoon)

Le jeu utilise un thème **bande dessinée claire** : fond papier crème, aplats de
couleur francs, **gros contours noirs**, typo arrondie en gras.

- **Toutes les couleurs viennent de `config.ts`.** Aucune valeur `0x…` ou `#…` en
  dur dans les scènes (seule exception : la conversion `rarityColor(...).toString(16)`).
  Un changement de thème doit rester un chantier d'un seul fichier.
- Tokens disponibles : `COLORS` (nombres, pour Phaser) et `CSS` (chaînes, pour les
  styles de texte) — les deux sont maintenus en parallèle et doivent rester synchrones.
  Familles : `background` / `panel` / `ink` / `accent` / `secondary` / `gold` / `hp`,
  textes (`text`, `textLight`, `textDim`, `textFaint`), `rarity.*`, `btn.*`
  (`primary`, `secondary`, `success`, `danger`, `magic`, `gold`, `neutral`, `disabled`),
  `side.*`, `result.*`, `scrim`.
- **Choisir un token par intention, pas par teinte** : `COLORS.btn.danger`, pas « le rouge ».
- Contours : `STROKE.thin | base | thick` (2/3/4 px). Le trait est **noir** (`COLORS.ink`)
  partout ; c'est lui qui porte le style, pas la couleur du contour.
- Typo : `FONTS.*` ou `FONT_FAMILY` (pile Comic Sans → Comic Neue → Chalkboard →
  Trebuchet). Toujours `fontStyle: 'bold'`. Jamais `'Arial'` ni `'Georgia'` en dur.
- Les **voiles** (modales, écrans de résultat) utilisent `COLORS.scrim` (papier, ~0.82),
  jamais un voile noir : le noir vire au brun sur le fond crème.
- `makeButton` produit un bouton cerné de noir avec **ombre portée pleine** décalée ;
  `makePanel` un panneau blanc à contour noir. Ne pas redessiner de boutons à la main.
  Son dernier paramètre optionnel `subtitle` rend une seconde ligne **à l'intérieur**
  du bouton : une explication qui accompagne un bouton doit tenir dans sa case.

### Listes défilables et tri

Deux écrans servent à comparer des héros (collection, composition d'équipe) et
partagent leurs briques :

- `attachScroll(scene, container, viewTop, viewBottom, contentBottom)` rend un
  conteneur défilable (glisser + molette), le masque et renvoie un `ScrollHandle`.
- `makeSortBar(scene, y, options, activeId, onChange)` affiche les puces de tri.
  Les critères vivent dans `data/heroSort.ts` (`HERO_SORTS`, `sortHeroes`) —
  ajouter un tri là, pas dans une scène.
- Changer de tri **relance la scène** (`scene.restart`) en lui repassant `sortId`
  (et la sélection en cours pour `TeamSelect`) : ne rien faire perdre au joueur.

⚠️ **Phaser ignore les masques pour la détection des clics.** Une carte sortie du
cadre par le défilement continue d'intercepter les appuis dans l'en-tête ou le
pied de page — un clic sur la barre de tri sélectionnait un héros invisible.
Deux protections, à conserver ensemble :
1. tout gestionnaire de carte filtre avec `scroll.isInView(pointer.y)` ;
2. l'UI fixe posée sur la zone défilante (barre de tri) est au-dessus via `setDepth`.

Les cartes réagissent sur **`pointerup`**, jamais `pointerdown` : sinon un
glissement de défilement déclenche une sélection au passage.

### Layout des scènes (écran 360×640)

- **Grille de marge unique** : marge latérale `MARGIN = 16px`, largeur de contenu
  `CONTENT_W = 328px`. Tous les blocs principaux (panneaux, listes, boutons pleine
  largeur) partagent cette largeur et cette marge — pas de largeurs ad hoc.
- **Labels de section** alignés à gauche sur la marge (`x = MARGIN`), suffixe `:`
  (« Équipe : », « Salles : », « Ton équipe : »), avec **~9–10px d'écart** entre le
  label et la boîte qu'il introduit.
- **Contenu d'une carte/élément** : centrer verticalement dans son conteneur (ne pas
  coller en haut). Positionner les éléments internes par rapport aux bords du cadre,
  pas en coordonnées absolues en dur.
- Noms longs (formations, etc.) : aligner à droite (`setOrigin(1, …)`) pour éviter
  tout débordement du cadre.
- `RunMapScene` sert de référence pour ces conventions.

### Quitter une run

`RunMapScene` expose un bouton **« ✕ Abandonner la run »** (modale de confirmation →
retour à `MainMenu`). Abandonner = run perdu, aucune sauvegarde méta. Toute nouvelle
scène de run doit offrir un moyen clair de revenir au menu.

---

## Ajouter un héros — checklist

1. `frontend/src/data/heroes.ts` → ajouter dans `HERO_POOL` (3 stats, `short`,
   `role`, `row`, et **une** compétence énonçable en une phrase)
2. `frontend/src/systems/CombatResolver.ts` → ajouter le `case` dans `heroAction`
   (sans `case`, le héros fait une attaque simple — c'est un défaut valable)
3. `frontend/src/scenes/BootScene.ts` → ajouter une couleur dans `heroColors`
4. `assets/ASSET_PROMPTS.md` → ajouter le prompt portrait

---

## Backend — déploiement VPS

Variables à configurer dans GitHub → Settings → Variables/Secrets :
- `VPS_HOST` (variable) : IP ou domaine du VPS
- `VPS_USER` (variable) : utilisateur SSH (ex: `ubuntu`)
- `VPS_SSH_KEY` (secret) : clé privée SSH

Sur le VPS, structure attendue :
```
~/fantasy-roguelike/backend/   # repo cloné ici
~/.env                         # ou backend/.env avec DATABASE_URL + JWT_SECRET
```

Migration DB au premier déploiement : `npx prisma migrate deploy`

---

## Priorités de développement (ordre)

1. ✅ Prototype jouable (boucle run complète)
2. ✅ Système grille + combat auto
3. ✅ 8 héros, 12 reliques, gacha avec pity
4. ✅ Méta-progression (déblocage de héros via gacha)
5. ✅ Backend auth + save + leaderboard
6. 🔲 Assets IA réels (remplacer les placeholders de `BootScene.ts`) — **style BD claire**,
   contours noirs épais, aplats francs (voir `assets/ASSET_PROMPTS.md` à réaligner)
7. 🔲 Animations (idle/attaque) via spritesheets
8. 🔲 Son et musique
9. 🔲 Export Android (Capacitor)
10. 🔲 Monnaie premium + offres IAP
