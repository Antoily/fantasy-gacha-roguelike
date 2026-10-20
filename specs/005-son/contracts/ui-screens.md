# Contrat — Écrans (changements de 005)

## Écran de tirage

```text
┌────────────────────────────────┐
│ ● 8 900     ◆ 0        1 / 20  │ en-tête (inchangé)
│                          [🔊]  │ GACHA.mute : 44 × 40, x 300, y 76
│            ( orbe )            │
```

- Appui : bascule coupé / actif, icône mise à jour, `gacha.settings` réécrit.
- Exposé à l'e2e : `document.body.dataset.muted` = `'1'` ou `'0'` ;
  `document.body.dataset.sounds` = sons émis depuis le dernier tirage.

## Révélation et retournement

Inchangés à l'image. Sons programmés selon `revealCues` / `flipCues` ; passer arrête
tout (FR-005).
