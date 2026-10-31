# Data Model: Illustrations

Aucune donnée sauvegardée : la sauvegarde v3 et les réglages sont inchangés.

## Illustration (fichiers de données)

`public/art/characters/<id>.svg` — un par élément du catalogue (`id` de
`src/data/catalogue.ts`), cadre `0 0 400 500`.

`public/art/characters/<id>.json` — cadrages :

| Champ | Type | Règle |
|---|---|---|
| `bust` | `{ x, y, w, h }` | format 4:5 (w/h = 0,8 ± 0,02), w ≥ 120, dans le cadre |
| `head` | `{ cx, cy, r }` | disque du visage, 40 ≤ r ≤ 160, dans le cadre |

Contrôlés par `npm run art:check` (illustration ou cadrage manquant = erreur).

## Visuels d'interface

`public/art/ui/` : `bg-main`, `bg-reveal`, `magic-circle`, `orb`, `orb-cracks-1..3`,
`card-back`, `icons/icon-{coin,shard,sound-on,sound-off,arrow,star}`,
`rarity/rarity-{common,uncommon,rare,legendary,ultra}`. Formats : charte § 8.

## Textures fabriquées au démarrage (`src/ui/art.ts`)

| Clé | Contenu | Taille rastérisée |
|---|---|---|
| `art:<id>` | illustration entière | taille d'affichage maximale (présentation) × R |
| `art:<id>:head` | tête découpée en disque | diamètre d'affichage maximal × R |
| `art:<id>:bust` | buste découpé en rectangle arrondi | cadre des cartes ×10 × R |
| `art:<id>:shadow` | silhouette sombre de la tête | comme `:head` |
| `ui:<nom>` | visuel d'interface | taille d'affichage × R |

## Présentation (logique pure, `src/logic/presentation.ts`)

```ts
// Index des résultats à présenter en plein écran (Légendaire ou mieux), dans l'ordre
// de retournement donné.
presentations(results: readonly PullResult[], order: readonly number[]): number[]
```

## Échelle de rendu (`src/ui/layout.ts`)

```ts
// R = clamp(ceil(densité × min(largeur / 360, hauteur / 640)), 1, 3)
renderScale(devicePixelRatio: number, viewportW: number, viewportH: number): number
```
