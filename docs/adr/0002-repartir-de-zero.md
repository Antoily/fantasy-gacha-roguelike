# 0002 — Repartir de zéro, centré sur le gacha

- **Statut** : Accepté
- **Date** : 2026-10-19
- **Spec liée** : —

## Contexte

Le prototype « Fantasy Roguelike Gacha » (Phaser + backend Express/Prisma) mélangeait
roguelike, combat sur grille et gacha. Le thème fantasy a déjà été remplacé par une
DA cartoon. On veut garder la mécanique de gacha, sans être lié à un univers ni à un
gameplay précis.

## Options envisagées

1. **Élaguer le code existant** — *Pour :* rien à réécrire. *Contre :* le code est
   structuré autour du run et du combat ; tout ce qui reste porte cette forme.
2. **Nouveau dépôt** — *Pour :* table rase nette. *Contre :* on perd l'historique, les
   issues, et le lien avec ce qui a été appris.
3. **Archiver dans ce dépôt puis vider `main`** — *Pour :* historique conservé, ancien
   code consultable. *Contre :* le nom du dépôt ne correspond plus au projet.

## Décision

Option 3. L'ancien code est figé sous le tag **`legacy-v1`** et la branche **`legacy`** ;
`main` repart sans code applicatif. Le **gacha est la première et la seule cible**
jusqu'à ce qu'il soit fini. Le gameplay qui fait gagner la monnaie viendra ensuite,
dans ses propres specs.

## Conséquences

- Le backend jamais déployé disparaît de `main` (il n'a jamais tourné en production).
- On peut reprendre des idées ou du code de `legacy` (thème, animations de tirage),
  mais seulement à travers une spec, jamais par copie en bloc.
- Le nom du dépôt (`fantasy-gacha-roguelike`) pourra changer quand l'univers sera
  choisi : décision à part.
