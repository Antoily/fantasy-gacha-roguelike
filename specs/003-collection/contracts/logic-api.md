# Contrat — API de la logique (changements de 003)

```ts
// collection.ts (nouveau)
collectionEntries(p: Progression): readonly CollectionEntry[]   // 20 entrées, rareté décroissante puis catalogue
raritySummary(p: Progression): readonly RaritySummary[]         // Ultra rare → Commun
isComplete(p: Progression): boolean

// progression.ts
exchangeableItems  // supprimé : remplacé par collectionEntries (plus aucun appelant)
exchange           // inchangé (002)
```

## Garanties vérifiées par les tests

| Garantie | Exigence |
|----------|----------|
| 20 entrées, chaque élément une fois, ordre rareté décroissante puis catalogue | FR-002 |
| `count` = exemplaires possédés, 0 si manquant | FR-003, SC-003 |
| `affordable` vrai ssi manquant et solde ≥ coût (bornes exactes) | FR-004, FR-011 |
| possédé ⇒ `affordable` faux même avec un gros solde | FR-011 |
| résumé : n / total par rareté, Σ n = `distinctOwned` | FR-006, SC-004 |
| `isComplete` vrai ssi 20 / 20 | FR-007 |
