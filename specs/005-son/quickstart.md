# Quickstart — 005 Son

Mêmes commandes que [001](../001-tirage/quickstart.md) :
`npm run lint && npm run typecheck && npm test && npm run e2e`.

## Scénarios e2e (hasard scripté de 004)

1. **Palier direct** : ×1 Ultra rare regardé jusqu'au bout → journal `suspense tier:ultra`.
2. **Montée** : ×1 Légendaire en montée → `suspense tier:rare rise tier:legendary`.
3. **Leurre** : ×1 Rare en leurre → `suspense tier:legendary laugh tier:rare` (le rire
   n'apparaît dans aucun autre scénario).
4. **×10** : → journal se terminant par 9 `card` puis `star`.
5. **Passer** : appui pendant le suspense → journal figé (`suspense` seul), plus rien
   ajouté 3 s plus tard.
6. **Couper** : bouton son → `muted=1`, tirage complet → journal vide ; rechargement →
   toujours coupé ; « Recommencer » → toujours coupé ; rebascule → sons revenus.
7. **Sans audio** : `AudioContext` retiré avant chargement → le jeu démarre et un
   tirage va jusqu'aux cartes (FR-008).
8. Captures : écran de tirage avec bouton actif, puis coupé.
