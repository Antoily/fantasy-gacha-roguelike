# Contrat — API de la logique (changements de 004)

```ts
// reveal.ts (nouveau)
bestRarity(results: readonly PullResult[]): Rarity            // plus haut rang du tirage
planReveal(results: readonly PullResult[], rng: Rng): RevealPlan
flipOrder(results: readonly PullResult[]): number[]           // vedette en dernier
revealDuration(plan: RevealPlan): number                      // ms, suspense + paliers
flipDuration(count: number): number                           // ms, retournement du ×10
```

Consommation du hasard par `planReveal` (contractuelle) : 1 valeur toujours, +1 pour un leurre.

## Garanties vérifiées par les tests

| Garantie | Exigence |
|----------|----------|
| palier final = meilleure rareté, au ×1 comme au ×10 | FR-003, SC-001 |
| montée : palier juste en dessous puis vrai palier ; jamais pour Commun / Peu commun | FR-011, US3 |
| leurre : Légendaire ou Ultra rare puis Rare ; seulement pour Rare | FR-012, US4 |
| bornes exactes de `u` (0,10 / 0,35 / 0,25) et de `v` (0,2) | FR-011, FR-012 |
| 100 000 déroulés : montée 25 %, leurre 10 % dont 1/5 Ultra (± marge) | SC-006, SC-007 |
| vedette = dernier résultat de la meilleure rareté ; permutation complète | FR-008 |
| tous les plans : Commun ≤ 3 000 ms, tout plan ≤ 5 000 ms, retournement ≤ 4 000 ms | FR-010, SC-003 |
| `planReveal` ne lit que le hasard : mêmes résultats + même `rng` ⇒ même plan | constitution IV |
