# 0008 — Police embarquée : Fredoka, chargée avant le premier texte

- **Statut** : Accepté
- **Date** : 2026-11-08
- **Spec liée** : — (DA, constitution VI ; révision de 003 pour le débordement du bandeau)

## Contexte

Le thème demandait `"Comic Neue", "Comic Sans MS", "Chalkboard SE", "Trebuchet MS",
sans-serif` sans fournir de police : chaque appareil prenait la sienne. Sous Windows, le
poste de l'utilisateur, c'était Comic Sans MS, jugée « trop cheap » ; sur la CI,
DejaVu Sans, bien plus large. Les largeurs de texte changeaient donc d'un appareil à
l'autre : le bandeau de bannière débordait chez l'utilisateur (« Ultra rare · pas encore
obtenu » : 156 px pour 141 de place) alors que les captures de l'e2e ne montraient pas son
rendu. L'utilisateur a laissé le choix de la police (« prends ce que tu préfères »).

Phaser dessine ses textes dans un canvas avec la police disponible **au moment où le texte
est créé** : une police web arrivée après coup n'est ni utilisée ni remesurée.

## Options envisagées

1. **Garder une pile de polices système** (sans Comic Sans) — *Pour :* rien à charger.
   *Contre :* rendu et largeurs différents selon l'appareil, le problème reste entier.
2. **Google Fonts par leur CDN** — *Pour :* rien à héberger. *Contre :* le jeu dépend
   d'un tiers et du réseau (local-only, ADR 0005), et transmet l'adresse du joueur.
3. **Police libre embarquée dans le jeu** (WOFF2 sous `public/fonts/`), chargée par
   `FontFace` avant le premier texte — *Pour :* même rendu partout, CI comprise ; aucun
   appel extérieur. *Contre :* un fichier et sa licence à tenir ; un délai au démarrage.

Polices comparées sur les textes du jeu, à ses tailles : Fredoka, Baloo 2, Nunito,
Grandstander, Sniglet, Mali. Fredoka (arrondie, épaisse, encre BD) colle au trait du jeu
et reste la plus compacte ; Baloo 2 a des interlignes trop hauts pour les mises en page
actuelles ; Nunito fait « application » plus que cartoon ; Sniglet et Mali deviennent
illisibles en petit.

## Décision

- Police de tous les textes : **Fredoka** (SIL OFL 1.1, Google Fonts), **instance fixe
  SemiBold (graisse 600, largeur 100)**, réduite aux caractères latins et à la ponctuation
  (`public/fonts/fredoka-semibold.woff2`, ~16 Ko). Déclarée **grasse** : le jeu écrit tout
  en gras (`textStyle`), la graisse 600 est celle qu'il obtient.
- Licence et provenance dans `public/fonts/` : `OFL.txt` et `CREDITS.md` (source, version,
  transformations). Une police sous une autre licence que l'OFL demande un nouvel ADR.
- Chargement par `FontFace` lancé dès `BootScene.preload()`, attendu avant d'ouvrir
  l'écran de tirage, borné dans le temps. Un échec (fichier absent ou illisible, délai
  dépassé) laisse la pile de repli `Trebuchet MS, sans-serif`, sans erreur ni blocage.
  Signal pour l'e2e : `document.body.dataset.font = 'ready' | 'fallback'`.
- Nom, fichier et graisse de la police vivent dans `src/ui/theme.ts`, comme les couleurs
  (constitution VI) ; plus de Comic Sans MS ni de Comic Neue dans la pile.

## Conséquences

- Les captures de l'e2e montrent ce que voit le joueur, sur tout appareil : la relecture
  des captures juge enfin le vrai rendu. Les mesures de largeur (`fitWidth`) ne servent
  plus que de filet de sécurité, pour le repli.
- Changer de police = un fichier sous `public/fonts/` (avec sa licence) et une ligne du
  thème. Un caractère absent de l'instance (« ᵉ ») est dessiné par la police de repli,
  comme avant : à ajouter au sous-ensemble s'il devient visible.
- À revoir si un texte du jeu sort de l'alphabet latin, ou si une graisse fine devient
  nécessaire (il faudrait alors une seconde instance, ou la police variable).
