# 0007 — Visuels SVG faits main, rendu à la densité de l'écran

- **Statut** : Accepté
- **Date** : 2026-10-30
- **Spec liée** : `specs/007-illustrations/`

## Contexte

Le jeu n'avait aucun visuel : formes dessinées en code (pastilles, disques). La feature
007 apporte 20 illustrations détaillées et des visuels d'interface. Il faut un format
qui reste net quand le navigateur agrandit le jeu (bureau ×1,5, téléphone ×3), que l'on
puisse produire et corriger sans outil de dessin, et qui ne pose aucune question de
droits. Phaser 4 n'a plus d'option de résolution : un canvas de 360 × 640 agrandi est flou.

## Décision

1. Tous les visuels sont des **SVG écrits à la main** sous la charte
   `docs/art/charte.md`, contrôlés par `scripts/art/check.mjs` (CI), rastérisés par le
   navigateur au chargement à leur taille d'affichage.
2. Le jeu rend à **R = clamp(ceil(densité × agrandissement), 1, 3)** : canvas de
   360R × 640R, caméra zoomée ×R ; la géométrie du jeu reste en 360 × 640.
3. Aucune image d'un tiers ; un visuel d'un tiers ne reviendrait que par un nouvel ADR
   (licence, crédits), comme les sons (ADR 0006).

## Conséquences

- Netteté à toute densité ; poids faible ; chaque visuel se corrige comme du code.
- Le démarrage rastérise les visuels (quelques centaines de ms).
- Les textes doivent porter `resolution: R` ; toute nouvelle image se charge à sa taille
  d'affichage × R.
- Écarté : PNG exportés, jeu fixé à 720 × 1280, images générées par un service tiers.
