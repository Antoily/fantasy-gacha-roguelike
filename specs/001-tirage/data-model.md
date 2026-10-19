# Data Model — 001 Tirage

Tout ce qui suit est du TypeScript pur (`src/logic/`, `src/data/`), sans Phaser ni
navigateur.

## Rarity

Union de littéraux, dans l'ordre croissant :
`'common' | 'uncommon' | 'rare' | 'legendary' | 'ultra'`.

| Champ | Type | Règle |
|-------|------|-------|
| `id` | `Rarity` | unique |
| `rank` | entier 0–4 | ordre de la spec (FR-002) ; sert à « Rare ou mieux » = `rank >= 2` |
| `label` | texte | « Commun », « Peu commun », « Rare », « Légendaire », « Ultra rare » |
| `weight` | entier | 600 / 270 / 100 / 25 / 5 ; somme = 1 000 (FR-006) |

La couleur de chaque rareté est un token de `src/ui/theme.ts`, pas une donnée de logique.

## Item (élément du catalogue)

| Champ | Type | Règle |
|-------|------|-------|
| `id` | texte `kebab-case` | unique, stable : c'est la clé de la sauvegarde |
| `name` | texte | nom affiché (annexe `catalogue.md`) |
| `kind` | `'character' \| 'creature'` | FR-001 |
| `rarity` | `Rarity` | |
| `blurb` | texte | description d'une ligne |

**Invariants du catalogue** (vérifiés par test) : 20 éléments ; ids uniques ;
répartition 6/5/4/3/2 ; chaque rareté contient au moins un personnage et une
créature (FR-003).

## GachaConfig

| Champ | Valeur |
|-------|--------|
| `costSingle` | 100 |
| `costTen` | 900 |
| `startingCurrency` | 9 000 |
| `guaranteedMinRank` | 2 (Rare) |

Invariant testé : `costTen < 10 × costSingle` (FR-009).

## PullResult

| Champ | Type | Règle |
|-------|------|-------|
| `item` | `Item` | |
| `isNew` | booléen | vrai si l'élément n'était pas possédé **avant ce résultat**, y compris dans la même salve (US2-3) |
| `guaranteed` | booléen | vrai si ce résultat vient de la table restreinte du ×10 |

## Progression

| Champ | Type | Règle |
|-------|------|-------|
| `currency` | entier ≥ 0 | |
| `owned` | `Record<id, entier ≥ 1>` | absent = non possédé |

Dérivés : `distinctOwned = nombre de clés de owned` ; affiché « distinctOwned / 20 ».

### Transitions

```text
          pull(×1 | ×10)  [currency >= coût]
Progression ───────────────────────────────▶ Progression'  (currency - coût, owned + résultats)
     │        [currency < coût] → refus, état inchangé (FR-010)
     │
     └── reset() ──▶ Progression initiale (startingCurrency, owned = {})   (FR-019)
```

Une transition renvoie un **nouvel** objet (aucune mutation) : la scène sauvegarde
l'état complet d'un bloc, ce qui rend FR-011 vrai par construction.

## SaveFile (format persistant — ADR 0005)

```json
{ "version": 1, "currency": 8100, "owned": { "gribouille": 2, "orbulle": 1 } }
```

Lecture : `parseSave(texte) → { progression, status: 'new' | 'loaded' | 'corrupted' }`.

- `null` (rien en stockage) → `new`, progression initiale.
- JSON invalide, `version` inconnue ou supérieure, `currency` non entière ou négative,
  `owned` non objet ou compte non entier ≥ 1 → `corrupted`, progression initiale.
- `version` antérieure → passée par la chaîne de migrations jusqu'à la version courante.
- Identifiant absent du catalogue → ignoré silencieusement.
