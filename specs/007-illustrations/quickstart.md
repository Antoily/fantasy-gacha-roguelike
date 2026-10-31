# Quickstart: Illustrations

Scénarios de vérification (e2e `tests/e2e/illustrations.spec.ts`, captures relues).

1. **Écran habillé** : partie neuve → fond illustré, orbe, icônes ; capture.
2. **×1 Commun** : hasard scripté → carte avec l'illustration entière, aucune `splash`.
3. **×1 Légendaire** : `splash` s'ouvre après la révélation avec `dataset.splash` = id ;
   un appui avant 400 ms ne la ferme pas ; un appui après mène à `results`.
4. **×1 Ultra rare passé** : appui pendant la révélation → `splash` quand même.
5. **×10 avec deux Légendaires** : après le retournement, deux `splash` successives dans
   l'ordre de retournement, puis `results`.
6. **×10 sans Légendaire** : aucune `splash` ; dix bustes ; dos illustrés pendant le
   retournement (capture).
7. **Collection** : 3 possédés → 3 portraits, 17 silhouettes ; échange toujours possible.
8. **Bannière vedette** : portrait de la vedette dans le bandeau (capture).
9. **Repli** : SVG de Gloups en 404 → `dataset.artMissing = 'gloups'`, aucune
   `pageerror`, sa carte garde la pastille.
10. **Densité 2** : fenêtre 360 × 640 à `deviceScaleFactor: 2` → les boutons répondent
    aux mêmes endroits ; capture nette.
11. **Contrôles** : `npm run art:check` et `npm run art:contrast` passent.
