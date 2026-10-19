# Research — 002 Pity & doublons

Pas de nouvelle dépendance ni de nouvelle technologie : la feature étend la logique
pure et l'écran de 001 (ADR 0004, 0005). Les décisions portent sur le modèle.

## R1 — Représentation du compteur de garantie

- **Décision** : `pity` = nombre de résultats consécutifs **sans** Légendaire ou mieux
  (0 à 39). Le résultat qui porterait `pity` à 40 est tiré dans la table restreinte
  (rang ≥ 3). Affiché : `40 − pity` (« dans N tirages au plus »).
- **Pourquoi** : un entier borné suffit, se valide simplement à la lecture de la
  sauvegarde (entier 0–39), et rend la règle triviale à tester.
- **Écarté** : stocker « tirages restants » (même information, mais la remise à zéro
  dépend alors du seuil, qui pourrait changer sans migration).

## R2 — Combiner la garantie du ×10 et le pity

- **Décision** : chaque résultat est tiré avec `minRank = max(rang exigé par le pity,
  rang exigé par la garantie du ×10)`, où la garantie du ×10 ne vaut que pour le
  10ᵉ résultat d'une salve sans Rare. Le compteur avance après chaque résultat, à
  l'intérieur de la salve.
- **Pourquoi** : FR-004 et le cas limite « seuil au milieu d'un ×10 » exigent que le
  pity s'applique au résultat exact ; un résultat forcé Légendaire satisfait aussi
  la garantie Rare.
- **Signalement** : `pity: true` sur un résultat forcé par le pity (badge
  « Garanti ! », FR-005). La garantie du ×10 garde son drapeau `guaranteed` existant,
  sans badge (inchangé depuis 001).

## R3 — Éclats

- **Décision** : `shards` = entier ≥ 0 dans la progression. Gain par doublon et coût
  d'échange par rareté dans `src/data/gachaConfig.ts` (FR-009, FR-013). Chaque
  `PullResult` porte `shards` (0 pour un nouvel élément) : la carte l'affiche et le
  crédit se calcule à partir des résultats, dans la même transition que le débit
  (FR-011).
- **Échange** : `exchange(p, itemId)` pur ; refus typés `already-owned`,
  `insufficient-shards`, `unknown-item`. N'affecte ni `pity` ni `currency` (FR-016).

## R4 — Sauvegarde v2

- **Décision** : `{ version: 2, currency, owned, pity, shards }` ; migration `1 → 2`
  ajoutant `pity: 0`, `shards: 0` (FR-020, pas de rétribution rétroactive).
  Validation : `pity` entier 0–39, `shards` entier ≥ 0, sinon `corrupted`.
- **Pourquoi** : c'est exactement le chemin prévu par l'ADR 0005 ; aucun nouvel ADR.

## R5 — Liste d'échange

- **Décision** : grille 2 colonnes × 10 lignes au plus (20 éléments = catalogue entier,
  donc jamais de défilement), triée par **rareté décroissante** puis ordre du
  catalogue. L'ordre est calculé par une fonction pure (`exchangeableItems`) que la
  scène et l'e2e utilisent toutes deux.
- **Pourquoi** : les éléments qui manquent en fin de partie sont presque toujours
  Légendaires ou Ultra rares (simulation, spec) : les mettre en tête évite de les
  chercher. Pas de défilement = pas du piège « Phaser ignore les masques » de
  `CLAUDE.md`.

## R6 — Mise en page de l'écran de tirage

- **Décision** : l'en-tête affiche pièces · éclats · « N / 20 » ; une ligne de pity
  sous l'orbe ; un bouton pleine largeur « Échanger des éclats » entre le message de
  manque et la rangée Taux / Recommencer. L'orbe est réduite (rayon 64) pour libérer
  la place. Toutes les positions restent dans `src/ui/layout.ts`.
- **Écarté** : trois boutons sur la rangée du bas (« Recommencer » ne tient pas dans
  98 px en 18 px gras).
