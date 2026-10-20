# Data Model — 003 Collection

Aucun champ nouveau dans la progression ni dans la sauvegarde (v2 inchangée).
Deux vues dérivées, pures (`src/logic/collection.ts`) :

## CollectionEntry

| Champ | Type | Règle |
|-------|------|-------|
| `item` | `Item` | tout le catalogue, une entrée par élément |
| `count` | entier ≥ 0 | `owned[item.id] ?? 0` ; 0 = manquant |
| `cost` | entier | `SHARD_COST[rareté]` (utile pour un manquant) |
| `affordable` | booléen | manquant **et** `shards ≥ cost` |

Ordre : rareté décroissante, puis ordre du catalogue (identique à 002).

## RaritySummary

| Champ | Type | Règle |
|-------|------|-------|
| `rarity` | `Rarity` | les 5 raretés, de la plus haute à la plus basse |
| `owned` | entier | éléments différents possédés dans la rareté |
| `total` | entier | éléments de la rareté dans le catalogue (2 / 3 / 4 / 5 / 6) |

Invariant testé : `Σ owned = distinctOwned(p)` (SC-004).
