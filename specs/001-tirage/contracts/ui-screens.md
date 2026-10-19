# Contrat — Écrans (360 × 640, portrait)

Les positions des zones cliquables sont des constantes de `src/ui/layout.ts`, partagées
entre les scènes et le test de bout en bout.

## Écran de tirage (`GachaScene`) — l'unique écran

```text
┌──────────────────────────────┐
│  🪙 9 000          7 / 20    │  en-tête : solde (FR-017) · possédés/total
│                              │
│        [ illustration ]      │  pastille du gacha (provisoire)
│                              │
│  ┌────────────────────────┐  │
│  │  Tirer ×1   — 100      │  │  désactivé si solde < 100 (US1-4)
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │  Tirer ×10  — 900      │  │  désactivé si solde < 900 (US2-4)
│  │  Un Rare ou mieux garanti │ │  sous-titre dans le bouton
│  └────────────────────────┘  │
│  message « Pas assez de… »   │  visible quand un bouton est désactivé
│                              │
│  [ Taux ]      [ Recommencer ]│  boutons secondaires
└──────────────────────────────┘
```

## Fenêtre de résultats (modale par-dessus l'écran de tirage)

- ×1 : une grande carte. ×10 : grille 2 colonnes × 5 lignes, dans l'ordre du tirage.
- Carte : pastille colorée de la rareté + initiale, nom, « Personnage » / « Créature »,
  rareté (texte + couleur), badge « Nouveau ! » ou « Déjà possédé ×N » (FR-012/013).
- Bouton « OK » pour fermer. Tant que la modale est ouverte, aucun tirage n'est
  possible (cas « appuis répétés »).

## Fenêtre des taux

Les 5 raretés dans l'ordre, couleur + libellé + pourcentage (lus dans `rarityTable()`),
puis « ×10 : au moins un Rare ou mieux garanti ». Bouton « Fermer ».

## Confirmation « Recommencer »

« Tout effacer et repartir avec 9 000 ? » — boutons « Effacer » / « Annuler » (US5).

## Avertissement de sauvegarde illisible

Au démarrage, si `parseSave` renvoie `corrupted` : bandeau « Ta sauvegarde n'a pas pu
être relue, nouvelle partie. » avec « OK ».
