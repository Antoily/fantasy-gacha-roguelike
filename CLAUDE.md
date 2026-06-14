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

Jeu mobile **Fantasy Roguelike Gacha** — runs procéduraux + combat tactique sur grille + gacha héros/reliques.

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

---

## Structure des fichiers — où tout se trouve

```
frontend/src/
  data/          # Données statiques (heroes, enemies, relics, events, talents)
  entities/      # Hero.ts, Enemy.ts — instances runtime
  systems/       # RunManager, CombatResolver, GachaSystem, TalentTree
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

## Données du jeu — IDs à connaître

### Héros (fichier `frontend/src/data/heroes.ts`)
| id | Nom | Classe | Rareté |
|----|-----|--------|--------|
| `aldric` | Aldric le Rempart | warrior | legendary |
| `sylva` | Sylva l'Œil-d'Aigle | ranger | epic |
| `zara` | Zara la Flamme Noire | mage | epic |
| `finn` | Frère Finn | priest | rare |
| `shade` | Shade l'Ombre | assassin | epic |
| `gorvak` | Gorvak le Briseur | warrior | rare |
| `lyra` | Lyra la Tisseuse | mage | rare |
| `vex` | Vex la Chasseuse | ranger | rare |

### Reliques (fichier `frontend/src/data/relics.ts`)
`bloodstone_ring` · `swiftness_boots` · `war_banner` · `shadow_cloak` · `ancient_tome` · `iron_fortress` · `emerald_pendant` · `void_crystal` · `gold_idol` · `dragon_scale` · `berserker_heart` · `amulet_of_focus`

### Formations ennemies (`frontend/src/data/enemies.ts`)
`spear_rush` · `arrow_rain` · `shield_wall` · `spread_assault` · `death_squad`

### Talents (`frontend/src/data/talents.ts`)
3 tracks : `survival` / `power` / `fortune` — 3 nœuds par track (tier 1→3)

---

## Système de combat — logique clé

- Grille **3×3** : row 0 = front, row 2 = back
- Tour trié par **SPD décroissant**
- Dégâts = `max(1, ATK - DEF*0.5) × [0.85–1.15]`
- Pity gacha = **80 tirages** (configurable via `GachaSystem(pityCap)`)
- Le `CombatResolver` importe les reliques et les applique inline
- `RunManager.completeRoom()` fait avancer la progression ET applique `emerald_pendant`

---

## Mode auto (run automatique)

Run en pilote automatique, lancé depuis le menu (bouton **« 🤖 RUN AUTO (+30% 💰) »**).

- Flag `autoMode` dans `RunState` (passé via `RunManager.startRun({ autoMode })`).
- **Bonus d'or** : `RunManager.getGoldMultiplier()` ajoute `+0.30` quand `autoMode`.
  Comme l'or de run est reversé à 30% au méta-or en fin de run, le bonus se propage.
- **Auto-pilotage** : chaque scène de run, si `run.autoMode`, déclenche son action
  via `this.time.delayedCall(...)` avec un **choix aléatoire** (`pickRandom`) :
  - `RunMapScene` → entre dans la salle courante · `FormationScene` → placement **aléatoire** des héros (cases distinctes) + combat
  - `CombatScene` → lecture ×2 + « Continuer » automatique · `EventScene` → option au hasard
  - `ShopScene` → achats aléatoires en une passe (50% par relique abordable + soin éventuel), **sans `scene.restart`**, puis sortie · `RestScene` → soin / entraînement / sortie au hasard
- Un badge **« 🤖 AUTO »** est affiché en haut de chaque scène concernée.
- Le bouton « Abandonner la run » de `RunMapScene` permet d'interrompre un run auto.

## État global du jeu (runtime)

`window.gameState` (défini dans `MainMenuScene.ts`) contient :
```ts
{
  runManager: RunManager,      // état du run en cours
  talentTree: TalentTreeSystem,
  gacha: GachaSystem,
  unlockedHeroIds: string[],   // héros débloqués (persistant)
  ownedRelicIds: string[],     // reliques gacha (persistant)
  totalGold: number,           // or méta (persistant)
  bestRun: { zonesCleared, roomsCleared }
}
```

Sauvegarde locale : `localStorage` clé `fantasy_roguelike_save` via `saveProgress()` dans `MainMenuScene.ts`.  
Sauvegarde serveur : `apiClient.saveProgress()` — appeler après chaque modification persistante.

---

## Conventions de code

- **TypeScript strict** partout — pas de `any` sauf cas exceptionnel documenté
- **Imports** : chemins relatifs, pas d'alias `@/`
- **Scènes Phaser** : toute logique de jeu dans `create()`, `update()` uniquement pour les animations continues
- **Pas de `require()` dynamique** dans les scènes — utiliser les imports statiques en haut de fichier
- **Commentaires** : en français, expliquer le "pourquoi" pas le "quoi"
- **Nouvelles données** (héros, reliques, events) : ajouter dans `data/`, jamais hardcodées dans les scènes

### Layout des scènes (écran 360×640)

- **Grille de marge unique** : marge latérale `MARGIN = 16px`, largeur de contenu
  `CONTENT_W = 328px`. Tous les blocs principaux (panneaux, listes, boutons pleine
  largeur) partagent cette largeur et cette marge — pas de largeurs ad hoc.
- **Labels de section** alignés à gauche sur la marge (`x = MARGIN`), suffixe `:`
  (« Équipe : », « Salles : », « Reliques : »), avec **~9–10px d'écart** entre le
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

1. `frontend/src/data/heroes.ts` → ajouter dans `HERO_POOL`
2. `frontend/src/scenes/BootScene.ts` → ajouter couleur dans `heroColors`
3. `assets/ASSET_PROMPTS.md` → ajouter le prompt portrait
4. Si l'ability est nouvelle → gérer dans `CombatResolver.ts` switch cases

## Ajouter une relique — checklist

1. `frontend/src/data/relics.ts` → ajouter dans `RELIC_POOL`
2. `frontend/src/systems/CombatResolver.ts` → gérer l'effet si combat
3. `frontend/src/systems/RunManager.ts` → gérer l'effet si persistant (run)
4. `frontend/src/scenes/BootScene.ts` → ajouter dans `relicIds`
5. `assets/ASSET_PROMPTS.md` → ajouter le prompt icône

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
4. ✅ Méta-progression (arbre de talents)
5. ✅ Backend auth + save + leaderboard
6. 🔲 Assets IA réels (remplacer les placeholders de `BootScene.ts`)
7. 🔲 Animations (idle/attaque) via spritesheets
8. 🔲 Son et musique
9. 🔲 Export Android (Capacitor)
10. 🔲 Monnaie premium + offres IAP
