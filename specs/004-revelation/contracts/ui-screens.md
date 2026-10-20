# Contrat — Écrans (changements de 004)

## Enchaînement d'un tirage

```text
Tirer ─▶ reveal ──(fin ou appui)──▶ ×1 : results
                                  ▶ ×10 : flip ──(fin ou appui)──▶ results (OK)
         └─ appui pendant reveal ─▶ results, toutes cartes retournées
```

Noms exposés à l'e2e (`document.body.dataset.modal`) : `reveal`, `flip`, `results`.
`document.body.dataset.reveal` = paliers montrés, séparés par `>` (ex. `rare>legendary`),
posé pendant `reveal`.

## Fenêtre `reveal`

```text
┌────────────────────────────────┐
│ (voile papier)                 │
│            ✶ ✶ ✶               │
│         ✶ ( orbe ) ✶           │ centre = GACHA.orb, couleur du palier
│            ✶ ✶ ✶               │ rayons / onde / éclair selon le rang
│                                │
│     Touche pour passer         │ petit texte en bas (y 600), estompé
└────────────────────────────────┘
```

- Zone plein écran, armée après 200 ms : appui → `results` direct (FR-006).
- Aucun bouton de l'écran de tirage ne réagit (FR-007).

## Fenêtre `flip` (×10)

- Même géométrie que `results` (`resultCardRect`), cartes face cachée (dos uni,
  contour encre) qui se retournent dans l'ordre `flipOrder` ; la vedette, en dernier,
  grossit brièvement et s'entoure de la couleur de sa rareté.
- Pas de bouton OK tant qu'une carte est face cachée ; appui → tout retourné → OK.

## Fenêtre `results`

Inchangée (001–003). L'échange d'éclats l'ouvre directement, sans `reveal`.
