# Contrat : logique des bannières

## `src/logic/banners.ts`

```ts
export const STANDARD = 'standard';
export function bannerList(): readonly Banner[];
export function findBanner(id: string): Banner | undefined;
// Voisine en boucle : +1 suivante, −1 précédente (FR-004).
export function neighbourBanner(id: string, step: 1 | -1): Banner;
```

## `src/logic/gacha.ts`

```ts
export interface FeaturedState { readonly item: Item; readonly guaranteed: boolean }

export function pullSingle(rng: Rng, owned: Owned, pity: number, featured?: FeaturedState | null): PullBatch;
export function pullTen(rng: Rng, owned: Owned, pity: number, featured?: FeaturedState | null): PullBatch;

interface PullBatch {
  readonly results: PullResult[];
  readonly pity: number;
  // État de la garantie vedette après la salve ; false sans vedette.
  readonly featuredGuaranteed: boolean;
}
```

- Sans `featured` : comportement et consommation du hasard identiques à 005 (SC-006).
- Ordre de consommation : research R1, contractuel.
- Le pity (rang minimal forcé) et la garantie du ×10 s'appliquent à la rareté, avant
  la vedette (US2 scénario 5).

## `src/logic/progression.ts`

```ts
interface Progression { …; readonly banner: string; readonly guarantees: readonly string[] }

export function pull(p: Progression, count: PullCount, rng: Rng): PullOutcome;   // sur p.banner
export function cycleBanner(p: Progression, step: 1 | -1): Progression;         // ne touche rien d'autre
export function activeBanner(p: Progression): Banner;
export function hasFeaturedGuarantee(p: Progression): boolean;                 // bannière active
```

## `src/logic/rates.ts`

```ts
export function featuredRatePercent(item: Item): number;   // ratePercent(rareté) × featuredChance
export function formatPercent(value: number): string;      // deux décimales au plus
```

## `src/logic/save.ts`

`SAVE_VERSION = 3`, migration `2 → 3`, sérialisation de `banner` et `guarantees`.
