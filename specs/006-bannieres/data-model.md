# Data Model: Bannières

## Configuration (`src/data/gachaConfig.ts`)

| Champ | Valeur | Rôle |
|-------|--------|------|
| `featuredChance` | 0.5 | Chance que la vedette soit le résultat quand sa rareté tombe, hors garantie (FR-008) |
| `featuredMinRank` | 3 | Rang minimal d'une vedette : Légendaire et Ultra rare (FR-001) |

## Bannière (dérivée, `src/logic/banners.ts`)

```ts
type Banner =
  | { readonly id: 'standard' }
  | { readonly id: string; readonly featured: Item };   // id = featured.id
```

Ordre : standard, puis les éléments de rang ≥ 3 dans l'ordre du catalogue
(aujourd'hui : roi-barbichon, marquise-cerise, tonnerrouf, cosmo-l-infini, orbulle).

## Progression (étendue, `src/logic/progression.ts`)

| Champ | Type | Invariant |
|-------|------|-----------|
| `banner` | string | id d'une bannière de `bannerList()` |
| `guarantees` | readonly string[] | ids de bannières vedettes, sans doublon ; garantie vedette ouverte |

Départ / « Recommencer » : `banner: 'standard'`, `guarantees: []`.

### Transitions de la garantie vedette (par bannière B de vedette V, rareté R)

| État de B | Résultat de rareté R tiré sur B | Nouvel état | Résultat |
|-----------|---------------------------------|-------------|----------|
| fermée | 50/50 gagné | fermée | V |
| fermée | 50/50 perdu | **ouverte** | un autre élément de R |
| ouverte | — | fermée | V, `featuredGuarantee: true` (« Garanti ! ») |

Un résultat d'une autre rareté, ou un tirage sur une autre bannière, ne change pas B.

## Résultat (étendu, `src/logic/gacha.ts`)

`PullResult.featuredGuarantee: boolean` — vrai si le résultat vient de la garantie
vedette. La carte affiche « Garanti ! » si `pity || featuredGuarantee`.

## Sauvegarde v3 (`src/logic/save.ts`)

```json
{ "version": 3, "currency": 8000, "owned": { "gloups": 2 }, "pity": 12, "shards": 3,
  "banner": "orbulle", "guarantees": ["tonnerrouf"] }
```

Migration 2 → 3 : `banner: "standard"`, `guarantees: []`. Validation : voir research R4.
