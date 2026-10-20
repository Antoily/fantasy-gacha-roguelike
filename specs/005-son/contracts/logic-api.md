# Contrat — API de la logique (changements de 005)

```ts
// soundCues.ts (nouveau)
revealCues(plan: RevealPlan): SoundCue[]          // triés par instant
flipCues(count: number): SoundCue[]               // ×10 : card ×(n−1), star ; ×1 : []

// settings.ts (nouveau)
SETTINGS_KEY = 'gacha.settings'
parseSettings(raw: string | null): Settings       // défensif : défaut si absent / illisible
serializeSettings(s: Settings): string
```

## Garanties vérifiées par les tests

| Garantie | Exigence |
|----------|----------|
| suspense à 0 pour tout déroulé | FR-001 |
| un son par palier montré, à l'instant de son éclat ; le dernier = vrai palier | FR-001 |
| `rise` seulement et toujours pour une montée, au début de la transition | FR-002 |
| `laugh` seulement et toujours pour un leurre, au début de la transition | FR-003, SC-004 |
| ×10 : `card` aux instants des cartes ordinaires, `star` à celui de la vedette | FR-004 |
| réglages : absent / illisible / champ faux ⇒ `{ muted: false }` ; aller-retour exact | FR-007 |
