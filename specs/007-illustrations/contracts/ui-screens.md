# Contrat des écrans : Illustrations

Géométrie dans `src/ui/layout.ts` (partagée avec l'e2e) ; toutes les zones d'appui
existantes restent aux mêmes places.

## Écran de tirage

- Fond `bg-main` (360 × 640) sous tout le reste ; orbe `orb` à la place de l'ancienne,
  même centre (180, 182), sphère de rayon 54.
- En-tête : `icon-coin` et `icon-shard` à la place du disque et du losange.
- Bannière : flèches `icon-arrow` (miroir à gauche) ; sur une bannière vedette, portrait
  de la vedette (`art:<id>:head`) à gauche du nom dans le bandeau.
- Bouton son : `icon-sound-on` / `icon-sound-off`.
- `dataset.modal`, `dataset.ready`, `dataset.banner`, `dataset.featuredLine` : inchangés.

## Révélation (`dataset.modal = 'reveal'`)

- Nuit `bg-reveal` en fondu, cercle magique sous l'orbe, fissures 1–3, temps figé,
  éclatement (004, FR-016, FR-017). `dataset.reveal` inchangé.

## Résultats

- **×1** (`RESULTS.single` agrandie) : fenêtre d'illustration (fond dégradé de la
  rareté), illustration entière, puis nom, « type · rareté » avec l'emblème, badge,
  éclats, « Garanti ! ».
- **×10** : chaque carte (156 × 92) montre le buste (`art:<id>:bust`) à gauche, nom
  (deux lignes au plus), emblème et rareté, badge et éclats ; dos `card-back` avant
  retournement.

## Présentation (nouveau : `dataset.modal = 'splash'`)

- Plein écran : nuit, rayons et lueur de la rareté, illustration entière en grand, nom,
  emblème et rareté, phrase de l'élément, « Nouveau ! » ou exemplaires,
  « Touche pour continuer ».
- `dataset.splash` = id de l'élément présenté, tant qu'il l'est.
- Appui accepté 400 ms après l'ouverture ; il passe à la présentation suivante, puis
  rend la main : à la carte du ×1 (`results`) ou aux résultats du ×10 (`results`).

## Collection

- Possédé : portrait (`art:<id>:head`) dans un disque cerné à la couleur de la rareté.
- Manquant : silhouette (`art:<id>:shadow`) sur fond grisé ; nom, coût et zone
  d'échange inchangés.
- Résumé par rareté : emblèmes `rarity-*` au lieu des pastilles.

## Taux

- Emblèmes `rarity-*` au lieu des pastilles ; textes inchangés.

## Repli (FR-010)

- `dataset.artMissing` = ids des illustrations non chargées, séparés par des virgules
  (absent si tout est chargé) ; leurs cartes et cases gardent la pastille et l'initiale.
