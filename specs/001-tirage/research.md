# Research — 001 Tirage

Chaque décision : ce qui est retenu, pourquoi, ce qui a été écarté. Versions relevées
sur npm le 2026-10-19.

## R1 — Version de Node

- **Décision** : Node **24** (LTS active), fixé par `.nvmrc` ; Node 24 en CI.
- **Pourquoi** : toute la chaîne actuelle l'exige — Vite 8 (`^20.19 || >=22.12`),
  Vitest 5 (`^22.12 || ^24`), ESLint 10 (`^22.13 || >=24`), Playwright 1.64 (`>=20`).
  Node 24.3 est déjà installé via nvm sur la machine de dev.
- **Écarté** : rester sur le Node 18 système (fin de vie depuis avril 2025, oblige à
  épingler des versions anciennes — c'était le piège du prototype avec Vitest 2).
- **Piège** : le `node` du PATH non interactif est `/usr/bin/node` (18). Toujours
  charger nvm : `source ~/.nvm/nvm.sh && nvm use` avant `npm`.

## R2 — Moteur de jeu

- **Décision** : **Phaser 4.2** (4.2.1, juillet 2026). Remplace l'ADR 0003 sur ce
  point → ADR 0004.
- **Pourquoi** : Phaser 4 est stable depuis le 2026-04-10 ; l'API de scènes, objets,
  tweens et Scale Manager reste celle de Phaser 3, le moteur de rendu est réécrit.
  Démarrer un projet neuf sur la v3, figée depuis mai 2025, serait une dette d'emblée.
- **Écarté** : Phaser 3.90 (dernière v3, plus d'évolutions) ; UI DOM (déjà écartée
  par l'ADR 0003).

## R3 — Outillage

- **Décision** : Vite 8, TypeScript **6.0**, Vitest 5, ESLint 10 + typescript-eslint 8
  (configuration *flat* `eslint.config.js`), Playwright 1.64.
- **Pourquoi TypeScript 6.0 et pas 7.0** : typescript-eslint 8.71 déclare
  `typescript >=4.8.4 <6.1.0`. TS 7 (portage natif) attendra que le lint le supporte.
- **Écarté** : l'ESLint 8 « legacy » du prototype (plus maintenu).

## R4 — Hasard injectable

- **Décision** : un générateur est une fonction `() => number` dans `[0, 1)`. En jeu :
  `Math.random`. En test : **mulberry32** à graine fixe, écrit dans `src/logic/rng.ts`
  (une dizaine de lignes, pas de dépendance).
- **Pourquoi** : constitution IV — tout tirage doit pouvoir être rejoué à l'identique.
  Une fonction suffit ; une classe ou une interface serait de l'abstraction sans usage.
- **Écarté** : `vi.spyOn(Math, 'random')` (méthode du prototype) — couple les tests à
  l'ordre exact des appels internes et ne permet pas les tests statistiques.

## R5 — Représentation des taux

- **Décision** : des **poids entiers sur 1 000** (Commun 600, Peu commun 270, Rare 100,
  Légendaire 25, Ultra rare 5). Le pourcentage affiché est calculé à partir de ces
  poids (`poids / total × 100`, formaté à la française : « 2,5 % »).
- **Pourquoi** : pas d'arrondi flottant dans le tirage ; une seule source pour le
  tirage et l'affichage (FR-016) ; la somme à 100 % se vérifie par un test.

## R6 — Garantie du ×10

- **Décision** : tirer 9 résultats normalement ; si aucun n'est Rare ou mieux, le 10ᵉ
  est tiré avec la table restreinte à Rare / Légendaire / Ultra rare (poids 100 / 25 /
  5, donc mêmes proportions relatives) ; sinon le 10ᵉ est un tirage normal.
- **Pourquoi** : c'est exactement FR-007, et c'est la règle la plus courante et la plus
  simple à expliquer au joueur.
- **Écarté** : relancer tout le ×10 jusqu'à obtenir un Rare (change toutes les
  probabilités de la salve, difficile à afficher honnêtement).

## R7 — Sauvegarde

- **Décision** : `localStorage`, clé `gacha.save`, JSON `{ version: 1, currency,
  owned: { [id]: count } }`, écrit **en une seule opération** après chaque tirage →
  ADR 0005.
- **Pourquoi** : FR-011 (débit et gains indissociables) est garanti par construction :
  le nouvel état est calculé en entier par la logique pure, puis écrit d'un bloc.
  Le numéro de version et une table de migrations répondent à la constitution VI et
  au cas « sauvegarde d'une version antérieure ».
- **Lecture défensive** : JSON invalide, champ manquant, valeur négative ou non
  entière → partie neuve + avertissement au joueur. Un identifiant inconnu du
  catalogue est ignoré (le catalogue est provisoire et changera).
- **Écarté** : IndexedDB (asynchrone, inutile pour quelques centaines d'octets).

## R8 — Vérifier le jeu réel (mécanisme de merge)

- **Décision** : un test **Playwright** de bout en bout lancé sur le **build** (`vite
  preview`), en local et en CI : il clique sur le canvas, relit la sauvegarde dans
  `localStorage`, recharge la page, et produit des captures d'écran jointes à la CI.
- **Pourquoi** : la constitution exige un comportement vérifié dans le jeu réel avant
  merge, et l'utilisateur veut que Claude se dote des contrôles pour merger seul.
  Leçon du prototype : le serveur de dev a déjà servi du JS obsolète ; on teste le
  build.
- **Comment viser les boutons** : les positions viennent de `src/ui/layout.ts`
  (constantes pures, sans Phaser), importé à la fois par les scènes et par le test.
- **WSL2** : Chromium headless avec `--use-gl=angle --use-angle=swiftshader
  --enable-unsafe-swiftshader`, sinon WebGL échoue (« Framebuffer Unsupported »).
  Les captures passent par `page.screenshot()`.

## R9 — Écran

- **Décision** : résolution logique **360 × 640** (portrait), `Scale.FIT` +
  `CENTER_BOTH`. Marge latérale 16 px, largeur de contenu 328 px.
- **Pourquoi** : reprend la grille éprouvée du prototype ; le format portrait est la
  cible même si la 001 se joue sur PC.

## R10 — Typographie et thème

- **Décision** : pile système arrondie (« Comic Neue », « Comic Sans MS »,
  « Chalkboard SE », « Trebuchet MS », sans-serif), tous les tokens (couleurs,
  contours, tailles) dans `src/ui/theme.ts`. Aucune police téléchargée.
- **Pourquoi** : constitution VI ; jeu jouable hors ligne.
