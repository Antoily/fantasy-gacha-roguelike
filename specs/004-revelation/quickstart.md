# Quickstart — 004 Révélation

Mêmes commandes que [001](../001-tirage/quickstart.md) :
`npm run lint && npm run typecheck && npm test && npm run e2e`.

## Scénarios e2e

Hasard scripté (research R6) sauf mention contraire.

1. **Un palier par rareté** : 5 tirages ×1 scriptés (Commun → Ultra rare), déroulé
   direct : `reveal` = la rareté obtenue ; capture pendant chaque révélation ; à la
   fin, `results` avec la carte attendue.
2. **Montée** : ×1 Légendaire avec `u < 0,25` → `reveal` = `rare>legendary` (capture
   pendant chaque palier).
3. **Leurre** : ×1 Rare avec `u < 0,10`, `v < 0,2` → `ultra>rare` ; avec `v ≥ 0,2` →
   `legendary>rare` (captures).
4. **×10** : meilleur résultat Légendaire en 4ᵉ position → `reveal` finit sur
   `legendary`, puis `flip`, puis `results` avec OK ; capture en cours de retournement.
5. **Passer** : appui pendant `reveal` → `results` en moins de 0,5 s, 10 cartes
   visibles ; sauvegarde identique à celle d'avant l'appui (SC-002, SC-004).
6. **Appui pendant `flip`** : toutes retournées, fenêtre toujours ouverte, OK ferme.
7. **Verrou** : double appui sur « Tirer » → un seul débit ; pendant `reveal`, appui
   sur l'emplacement de « Collection » → aucune autre fenêtre.
8. **Durée** (hasard réel) : de l'appui à `results`, ×1 regardé jusqu'au bout < 5,5 s.
9. **Échange** : un échange d'éclats ouvre `results` sans passer par `reveal`.
10. **Tirage refusé** (pièces insuffisantes) : aucune fenêtre `reveal` (FR-001).
11. **Rechargement pendant `reveal`** : la sauvegarde contient déjà le tirage ; au
    retour, écran de tirage sans animation (cas limite de la spec, FR-009).
12. Les parcours de 001–003 passent l'animation avant de viser OK.
