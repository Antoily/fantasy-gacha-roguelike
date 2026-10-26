# Quickstart : Bannières

Parcours vérifiés par `tests/e2e/bannieres.spec.ts` (build statique, hasard scripté).

1. **Premier lancement** : bannière standard active (`data-banner="standard"`), flèches visibles.
2. **Changer de bannière** : ▶ → `roi-barbichon` ; ◀ depuis la standard → `orbulle` (boucle) ; le choix survit à un rechargement.
3. **50/50 gagné** : sur `roi-barbichon`, hasard « Légendaire, 50/50 gagné » → le ×1 donne Roi Barbichon, sans « Garanti ! », sans garantie ouverte.
4. **50/50 perdu puis garanti** : hasard « Légendaire, 50/50 perdu, élément » → un autre Légendaire, ligne « Prochain Légendaire garanti : Roi Barbichon », `guarantees: ["roi-barbichon"]` ; puis hasard « Légendaire » seul → Roi Barbichon « Garanti ! », garantie refermée.
5. **Garantie attachée à sa bannière** : garantie ouverte sur `roi-barbichon`, passage sur `tonnerrouf`, Légendaire tiré → 50/50 de Tonnerrouf ; `guarantees` contient toujours `roi-barbichon` ; retour sur `roi-barbichon` → ligne de garantie affichée.
6. **Pity partagé** : sauvegarde à `pity: 25`, passage d'une bannière à l'autre → « 15 tirages » partout.
7. **Taux** : fenêtre des taux sur `orbulle` → « 0,25 % » et la règle du 50/50 ; sur la standard, pas de ligne vedette.
8. **Sauvegarde v2** : chargée sans perte, bannière standard.
9. **Recommencer** : bannière standard, aucune garantie.
10. **Fenêtre ouverte** : appui sur l'emplacement des flèches pendant la fenêtre des taux → bannière inchangée.
