# Quickstart — 003 Collection

Mêmes commandes que [001](../001-tirage/quickstart.md) :
`npm run lint && npm run typecheck && npm test && npm run e2e`.

## Scénarios e2e

1. **Partie neuve** : Collection → 20 cases manquantes, résumé à 0 partout (capture).
2. **Après des tirages** : sauvegarde forgée (Gribouille ×3, Orbulle ×1) → la
   collection montre ces deux éléments possédés, le reste manquant ; total 2 / 20
   (capture).
3. **Échange depuis la collection** (scénarios 002 réécrits) : Légendaire manquant +
   150 éclats → Collection → case → Échanger → possédé, 0 éclat, 3 appuis ;
   trop cher → rien ; Annuler → retour à `collection`.
4. **Appui sur un possédé** *(révision du 2026-11-08)* : sa fiche s'ouvre (`fiche`,
   `dataset.fiche` = son id ; capture) ; Retour → `collection` ; sauvegarde inchangée.
   Un manquant n'ouvre jamais de fiche.
5. **Collection complète** : message de félicitation (capture) ; la première case ouvre sa fiche.
6. Fermer → retour à l'écran de tirage, sauvegarde inchangée.
