# Research — 003 Collection

Pas de nouvelle dépendance, pas de nouvelle donnée sauvegardée.

## R1 — Remplacer la fenêtre d'échange par la collection

- **Décision** : la fenêtre `exchange` de 002 devient `collection` : même panneau,
  même grille 2 × 10, mais elle liste **les 20 éléments** (possédés et manquants) au
  lieu des seuls manquants. La confirmation d'échange et ses règles sont réutilisées
  telles quelles.
- **Pourquoi** : clarification Q2 (fusion). Les deux écrans auraient partagé 90 % de
  leur code et de leur géométrie.
- **Conséquence** : `exchangeableItems` (002) n'a plus d'appelant à l'écran ; il est
  remplacé par `collectionEntries` qui ordonne tout le catalogue de la même façon.
  Les scénarios e2e d'échange de 002 sont conservés et passent par la collection.

## R2 — Tenir 20 cases et un résumé sur 640 px

- **Décision** : titre (y 36), ligne « ◆ solde · N / 20 » (y 60), ligne de résumé par
  rareté (5 pastilles « n / total », y 82), grille à partir de y 100 en cases de
  156 × 42 espacées de 4 px (fin à y 556), bouton Fermer à y 568.
- **Pourquoi** : SC-002 (tout visible sans défilement) ; aucune liste défilante, donc
  pas du piège « Phaser ignore les masques pour les clics » de `CLAUDE.md`.

## R3 — Contenu d'une case

- **Possédé** : pastille de rareté + initiale, nom (12 px), puis « Personnage · ×3 »
  (10 px). La rareté est portée par la couleur de la pastille (légende : résumé).
- **Manquant** : fond grisé, pastille estompée, nom grisé, coût en éclats ; coût mis
  en évidence s'il est abordable, estompé sinon (FR-004). Zone cliquable seulement si
  abordable (FR-011).
- **Écarté** : écrire la rareté en toutes lettres dans la case (« Personnage · Peu
  commun · ×3 » dépasse 114 px à 10 px).
