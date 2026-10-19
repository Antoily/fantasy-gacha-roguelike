# Quickstart — 002 Pity & doublons

Mêmes prérequis et commandes que [001](../001-tirage/quickstart.md) :
`npm run lint && npm run typecheck && npm test && npm run e2e`.

## Scénarios ajoutés à l'e2e (`tests/e2e/`)

1. **Pity** : sauvegarde forgée avec `pity: 39` → Tirer ×1 → l'élément gagné est
   Légendaire ou Ultra rare ; sauvegarde : `pity: 0`. Capture : badge « Garanti ! ».
2. **Compteur** : après un ×1 sans Légendaire depuis une partie neuve, `pity: 1` et
   l'écran affiche « dans 39 tirages au plus » (capture).
3. **Doublons** : sauvegarde où tout est possédé → Tirer ×10 → `shards` a augmenté de
   la somme des gains des dix éléments ; captures des cartes « +X éclats ».
4. **Échange** : sauvegarde à qui il manque un Légendaire, `shards: 150` → Échanger
   des éclats → case → Échanger → l'élément est possédé, `shards: 0`, `pity` et
   `currency` inchangés (3 appuis, SC-006).
5. **Échange impossible** : `shards: 10`, un Légendaire manquant → la case est grisée,
   un appui ne change rien.
6. **Migration** : sauvegarde v1 → rechargement → Tirer ×1 → sauvegarde en v2 avec
   les possessions d'origine conservées.
7. Parcours de 001 inchangé (non-régression).
