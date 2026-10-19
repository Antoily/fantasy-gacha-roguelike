# Data Model — 002 Pity & doublons

Extensions du modèle de [001](../001-tirage/data-model.md). Tout reste en TS pur.

## GachaConfig (ajouts)

| Champ | Valeur |
|-------|--------|
| `pityThreshold` | 40 |
| `pityMinRank` | 3 (Légendaire) |
| `shardGain` | Commun 1 · Peu commun 2 · Rare 5 · Légendaire 15 · Ultra rare 30 |
| `shardCost` | Commun 10 · Peu commun 20 · Rare 50 · Légendaire 150 · Ultra rare 300 |

Invariants testés : `pityThreshold > 10` (une seule garantie par salve) ;
`shardGain` et `shardCost` croissants avec le rang.

## PullResult (ajouts)

| Champ | Type | Règle |
|-------|------|-------|
| `pity` | booléen | vrai si tiré dans la table restreinte du pity |
| `shards` | entier ≥ 0 | `shardGain[rareté]` si doublon (`isNew` faux), sinon 0 |

## Progression (ajouts)

| Champ | Type | Règle |
|-------|------|-------|
| `pity` | entier 0–39 | résultats consécutifs sans Légendaire ou mieux |
| `shards` | entier ≥ 0 | solde d'éclats |

Dérivé : `pullsUntilPity = pityThreshold − pity` (affiché).

### Transitions

```text
pull(×1 | ×10)   currency −coût ; owned + résultats ; shards + Σ résultats.shards ;
                 pity : pour chaque résultat, 0 si rang ≥ 3 sinon +1
exchange(id)     [non possédé, shards ≥ coût] shards −coût ; owned[id] = 1 ;
                 currency et pity inchangés
                 sinon refus : already-owned | insufficient-shards | unknown-item
reset()          { currency: 9000, owned: {}, pity: 0, shards: 0 }
```

## SaveFile v2

```json
{ "version": 2, "currency": 8100, "owned": { "gribouille": 2 }, "pity": 17, "shards": 4 }
```

- Migration `1 → 2` : ajoute `pity: 0`, `shards: 0`.
- `pity` non entier ou hors 0–39, `shards` non entier ou négatif ⇒ `corrupted`.
