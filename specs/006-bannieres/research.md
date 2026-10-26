# Research: Bannières

## R1 — Ordre de consommation du hasard

**Décision** : pour chaque résultat, toujours la rareté en premier. Ensuite :

| Cas | Valeurs consommées après la rareté |
|-----|------------------------------------|
| Bannière standard, ou rareté ≠ celle de la vedette | 1 : l'élément, parmi toute la rareté (comme avant) |
| Rareté de la vedette, garantie vedette ouverte | 0 : la vedette |
| Rareté de la vedette, pas de garantie | 1 : le 50/50 (`rng() < featuredChance` ⇒ vedette) ; si perdu, 1 de plus : l'élément parmi les autres de la rareté |

**Pourquoi** : la bannière standard consomme exactement comme avant, donc un même
hasard donne les mêmes tirages (SC-006) et les tests de 001–005 restent valables ;
l'e2e peut scripter un 50/50 sans connaître l'ordre du catalogue.

**Écarté** : tirer l'élément d'abord dans une table pondérée (vedette = moitié du poids)
— un seul nombre, mais impossible de distinguer « gagné au 50/50 » de « tombé par
hasard », donc pas de garantie après un échec lisible.

## R2 — Liste des bannières

**Décision** : `bannerList()` = la standard, puis un élément par élément du catalogue de
rang ≥ `featuredMinRank` (3), dans l'ordre du catalogue (Légendaires puis Ultra rares).
Identifiant : `'standard'` ou l'id de l'élément vedette.

**Pourquoi** : aucun texte à écrire par bannière (spec, hypothèses) ; un Légendaire
ajouté au catalogue a sa bannière ; l'id d'élément est déjà une clé stable de la
sauvegarde (catalogue.ts).

## R3 — Chance de la vedette et affichage

**Décision** : `featuredChance: 0.5` dans `GACHA_CONFIG`. La fenêtre des taux affiche
`ratePercent(rareté) × featuredChance` (1,25 % pour un Légendaire, 0,25 % pour un Ultra
rare). `formatPercent` passe à deux décimales au plus : les valeurs actuelles (60 %,
2,5 %…) s'affichent pareil, et 1,25 % n'est pas arrondi à 1,3 %.

**Pourquoi** : même source que le tirage (constitution IV) ; un arrondi à une décimale
afficherait 1,3 %, faux.

## R4 — Sauvegarde v3

**Décision** : `{ version: 3, currency, owned, pity, shards, banner, guarantees }`.
`banner` : chaîne ; `guarantees` : liste d'ids de bannières vedettes à garantie ouverte.
Migration 2 → 3 : `banner: 'standard'`, `guarantees: []`. Un `banner` qui n'est pas une
chaîne ou un `guarantees` qui n'est pas une liste de chaînes ⇒ sauvegarde corrompue. Une
bannière inconnue (élément retiré du catalogue) ⇒ standard ; une garantie inconnue ou
en double ⇒ ignorée.

**Pourquoi** : même tolérance que `owned` envers un catalogue provisoire (save.ts) ;
liste plutôt qu'objet : une garantie est ouverte ou non, rien d'autre à retenir.

## R5 — Écran de tirage

**Décision** : un bandeau sous l'en-tête, à gauche du bouton son : flèche ◀, nom de la
bannière (vedette : son nom ; sinon « Bannière standard ») sur une ligne, détail en
petit dessous (« Légendaire · possédé ×2 » / « Légendaire · pas encore obtenu » /
« Tous les éléments, taux de base »), flèche ▶. L'orbe passe au rayon 54 et descend ;
une ligne sous celle du pity annonce « Prochain Légendaire garanti : <vedette> » quand
la garantie de la bannière est ouverte. Les boutons descendent d'autant.

**Pourquoi** : le joueur voit la bannière active sans appui (FR-003), et chaque
bannière est à un appui (FR-004, SC-004). Pas de fenêtre de choix : 6 bannières tiennent
dans une boucle.

## R6 — Fenêtre des taux

**Décision** : la hauteur vient de `ratesDialogH(featured)` (`layout.ts`), utilisée par
la scène et l'e2e. Sur une bannière vedette, une ligne « Vedette : <nom> » avec sa
chance par tirage, et la règle du 50/50 sous celle du pity.

**Pourquoi** : leçon du prototype (panneau au contenu variable dimensionné d'après le
contenu).

## R7 — Ce qui ne change pas

La révélation (palier selon la meilleure rareté) et le son ne lisent pas la bannière :
aucun changement dans `reveal.ts` / `soundCues.ts`, ce qui évite le conflit avec la
retouche de la révélation menée en parallèle.
