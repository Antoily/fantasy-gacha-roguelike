# Data Model — 004 Révélation

Aucun champ nouveau dans la progression ni dans la sauvegarde (v2 inchangée).

## RevealConfig (`src/data/revealConfig.ts`)

| Champ | Valeur | Règle |
|-------|--------|-------|
| `riseChance` | 0,25 | montée, palier Rare ou plus (FR-011) |
| `lureChance` | 0,10 | leurre, palier Rare seulement (FR-012) |
| `lureUltraShare` | 0,2 | part des leurres qui montrent Ultra rare |
| `timing` | ms, voir research R3 | suspense, révélation par rareté, palier de fausse piste, transition, retournement |

## RevealPlan (vue dérivée, `src/logic/reveal.ts`)

| Champ | Type | Règle |
|-------|------|-------|
| `kind` | `'direct' \| 'rise' \| 'lure'` | tiré selon R2 |
| `steps` | `Rarity[]` (1 ou 2) | paliers montrés dans l'ordre ; **dernier = meilleure rareté** |
| `final` | `Rarity` | `bestRarity(results)` |
| `flipOrder` | `number[]` | ×10 : indices 0–9 dans l'ordre du tirage, sauf la carte vedette, placée en dernier ; ×1 : `[0]` |

Carte vedette : le **dernier** résultat tiré de la meilleure rareté.

Invariants testés : `steps.at(-1) = final` ; `rise` ⇒ `steps = [rang − 1, final]` et
`final ≥ Rare` ; `lure` ⇒ `final = Rare` et `steps[0] ∈ {Légendaire, Ultra rare}` ;
`flipOrder` est une permutation de `0…n−1`.
