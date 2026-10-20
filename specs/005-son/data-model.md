# Data Model — 005 Son

`gacha.save` v2 inchangée.

## Settings (`gacha.settings`, ADR 0006)

| Champ | Type | Règle |
|-------|------|-------|
| `muted` | booléen | défaut `false` (partie neuve : son actif) ; illisible ⇒ défaut |

## SoundCue (vue dérivée, `src/logic/soundCues.ts`)

| Champ | Type | Règle |
|-------|------|-------|
| `at` | ms | instant depuis le début de la révélation (ou du retournement) |
| `cue` | `'suspense' \| 'tier:<rareté>' \| 'rise' \| 'laugh' \| 'card' \| 'star'` | |

Invariants testés : un `suspense` à 0 ; un `tier:*` par palier montré, au même instant
que son éclat ; `laugh` ⇔ leurre ; `rise` ⇔ montée ; dernier `tier:*` = vrai palier ;
au ×10, 9 `card` puis 1 `star`, triés par instant.
