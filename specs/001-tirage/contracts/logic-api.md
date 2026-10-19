# Contrat — API de la logique de tirage (`src/logic/`)

Seule surface que les scènes ont le droit d'appeler. Fonctions pures : mêmes entrées
(dont le générateur) ⇒ mêmes sorties. Aucune n'écrit dans le stockage.

```ts
type Rng = () => number;                         // [0, 1)

// rng.ts
mulberry32(seed: number): Rng

// rates.ts — source unique des taux (FR-016)
rarityTable(): readonly RarityInfo[]             // ordre croissant, poids inclus
ratePercent(rarity: Rarity): number              // 2.5 pour 'legendary'
formatPercent(value: number): string             // "2,5 %"

// gacha.ts
pullSingle(rng: Rng, owned: Owned): PullResult[]          // longueur 1
pullTen(rng: Rng, owned: Owned): PullResult[]             // longueur 10, ≥ 1 rang ≥ 2

// progression.ts
initialProgression(): Progression
canAfford(p: Progression, count: 1 | 10): boolean
pull(p: Progression, count: 1 | 10, rng: Rng):
  { ok: true; progression: Progression; results: PullResult[] }
| { ok: false; reason: 'insufficient-funds' }
distinctOwned(p: Progression): number

// save.ts
SAVE_KEY = 'gacha.save'
serializeSave(p: Progression): string
parseSave(raw: string | null): { progression: Progression; status: 'new' | 'loaded' | 'corrupted' }
```

## Garanties vérifiées par les tests

| Garantie | Exigence |
|----------|----------|
| `pull` refusé ⇒ aucune donnée modifiée | FR-010 |
| `pull` accepté ⇒ `currency` baisse exactement du coût | US1-1, US2-1 |
| `pullTen` contient toujours ≥ 1 rang ≥ 2 (10 000 salves) | FR-007, SC-003 |
| 10ᵉ résultat garanti tiré parmi rang ≥ 2 avec poids 100/25/5 | FR-007 |
| fréquences sur 10⁶ tirages à ±5 % relatif des taux | SC-002 |
| `isNew` correct à l'intérieur d'une même salve | US2-3 |
| `parseSave(serializeSave(p))` redonne `p` | FR-018, SC-004 |
| sauvegarde corrompue ⇒ `corrupted` + état initial | Edge cases |
