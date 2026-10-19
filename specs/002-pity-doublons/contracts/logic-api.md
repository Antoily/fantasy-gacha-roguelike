# Contrat — API de la logique (changements de 002)

Complète [001/contracts/logic-api.md](../../001-tirage/contracts/logic-api.md).

```ts
// gacha.ts — le pity entre et sort avec les résultats
pullSingle(rng, owned, pity): { results: PullResult[]; pity: number }
pullTen(rng, owned, pity):    { results: PullResult[]; pity: number }

// progression.ts
pull(p, count, rng)            // inchangé en signature ; met à jour pity et shards
exchange(p, itemId):
  { ok: true; progression: Progression; item: Item }
| { ok: false; reason: 'already-owned' | 'insufficient-shards' | 'unknown-item' }
exchangeableItems(p): readonly Item[]   // non possédés, rareté décroissante puis catalogue
pullsUntilPity(p): number

// save.ts
SAVE_VERSION = 2               // migration 1 → 2
```

## Garanties vérifiées par les tests

| Garantie | Exigence |
|----------|----------|
| à `pity = 39`, le ×1 donne rang ≥ 3, marqué `pity`, et remet `pity` à 0 | US1-1, FR-004/005 |
| à `pity = 37`, le 3ᵉ résultat d'un ×10 est rang ≥ 3 (si aucun avant) | US1-2 |
| table restreinte Légendaire/Ultra : proportions 25/5 à ±5 % relatif | FR-004 |
| un rang ≥ 3 naturel remet `pity` à 0 | US1-3, FR-003 |
| aucun écart > 40 entre deux rangs ≥ 3 sur 100 000 tirages | SC-001 |
| hors pity, fréquences de 001 inchangées | SC-002 |
| doublon ⇒ `shards = gain[rareté]` et crédité ; nouveau ⇒ 0 | FR-008–011, SC-004 |
| `exchange` : débit exact, élément possédé, `pity`/`currency` intacts | FR-013, FR-014, FR-016 |
| `exchange` refusé ⇒ état intact (déjà possédé, solde, id inconnu) | FR-015, FR-017 |
| sauvegarde v1 ⇒ migrée, `pity` 0, `shards` 0, rien perdu | FR-020 |
