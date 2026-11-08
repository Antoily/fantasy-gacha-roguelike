# Contrat — Écrans (changements de 003)

## Écran de tirage

Le bouton « Échanger des éclats » devient **« Collection »** (même position).

## Collection (remplace la liste d'échange de 002)

```text
┌────────────────────────────────┐
│          Collection            │ y 36
│     ◆ 60 éclats · 7 / 20       │ y 60 (FR-012, total)
│ ●1/2  ●0/3  ●2/4  ●2/5  ●2/6   │ y 82 résumé par rareté (FR-006), légende des couleurs
│ ┌────────────┐ ┌────────────┐  │ grille 2 × 10, cases 156 × 42, dès y 100
│ │● Cosmo     │ │● Orbulle   │  │ manquant : grisé, nom visible, ◆ coût
│ │  ◆ 300     │ │  Créature·×1│ │ possédé : nom, type · ×N
│ └────────────┘ └────────────┘  │
│        …                       │
│ [          Fermer          ]   │ y 568
└────────────────────────────────┘
```

- Appui sur un manquant abordable → « Échanger X contre N éclats ? » (002) ;
  Annuler → retour à la collection ; Échanger → carte « Nouveau ! ».
- Appui sur un manquant trop cher → rien (FR-011) ; sur un possédé → sa fiche (révision ci-dessous).
- Collection complète → le titre devient « Collection complète ! » (FR-007) : la grille
  occupe toute la hauteur, il n'y a pas de place pour une ligne de plus.
- Nom de fenêtre exposé à l'e2e : `collection` (au lieu de `exchange`).

## Révision du 2026-11-08

**En-tête de l'écran de tirage** : pièces à gauche, éclats calés à droite ; le total
« N / 20 » n'y est plus (FR-013), il ne reste qu'en haut de la collection.

**Bandeau de bannière** : textes centrés dans `bannerTextArea()` (à côté du portrait d'une
vedette, à 6 px du portrait et du cadre), réduits jusqu'à 8 px s'ils n'y tiennent pas ;
« pas encore obtenu » devient « non obtenu ».

**Fiche** (fenêtre `fiche`, `dataset.fiche` = id de l'élément) :

```text
┌────────────────────────────────┐
│   ┌────────────────────────┐   │ illustration entière, 280 × 340 dès y 36
│   │      (illustration)    │   │ (pastille et initiale en repli, 007 FR-010)
│   └────────────────────────┘   │
│         Roi Barbichon          │ y 386
│   ◉ Personnage · Légendaire    │ y 428
│          Possédé ×2            │ y 444
│ ┌────────────────────────────┐ │ phrase de présentation, y 476
│ │ Monarque minuscule à la …  │ │
│ └────────────────────────────┘ │
│ [          Retour          ]   │ y 568, à la place de « Fermer » → collection
└────────────────────────────────┘
```
