# Contrat — Écrans (changements de 002)

Complète [001/contracts/ui-screens.md](../../001-tirage/contracts/ui-screens.md).

## Écran de tirage

```text
┌──────────────────────────────┐
│ 🪙 9 000    ◆ 12      7 / 20 │  pièces · éclats (FR-018) · possédés/total
│          [ orbe ]            │  rayon 64
│ Légendaire garanti dans 23 tirages au plus │  ligne de pity (FR-006)
│ [ Tirer ×1 — 100 ]           │
│ [ Tirer ×10 — 900 ]          │
│ message de manque            │
│ [ Échanger des éclats ]      │  ouvre la liste d'échange (FR-012)
│ [ Taux ]   [ Recommencer ]   │
└──────────────────────────────┘
```

## Carte de résultat

- Doublon : « Déjà possédé ×N » et « +X éclats » (FR-010).
- Forcé par le pity : badge « Garanti ! » (FR-005).

## Fenêtre des taux

Ajoute : « Légendaire ou mieux garanti au plus tard au 40ᵉ tirage ; le compteur
repart de zéro à chaque Légendaire ou Ultra rare. » (FR-007)

## Liste d'échange

- Titre « Échanger des éclats » + solde ; grille 2 × 10 des éléments manquants
  (`exchangeableItems`), chaque case : pastille, nom, coût. Case grisée si solde
  insuffisant (FR-015). Liste vide : « Tu possèdes déjà tout ! » (cas limite).
- Appui sur une case disponible → confirmation « Échanger X contre N éclats ? »
  (Échanger / Annuler) → carte de résultat « Nouveau ! » (FR-014, SC-006 : 3 appuis).
