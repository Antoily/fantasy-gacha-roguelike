# Research: Illustrations

## R1. Format des visuels : SVG faits main

- **Décision** : chaque visuel est un SVG écrit à la main (formes, dégradés, découpes),
  contrôlé par `scripts/art/check.mjs` et rastérisé par le navigateur au chargement
  (`this.load.svg(clé, url, { width, height })`) à la taille où le jeu l'affiche, × R.
- **Pourquoi** : net à toute taille (on choisit la taille de rastérisation), léger
  (20 à 45 Ko par illustration), modifiable ligne à ligne, aucune chaîne d'export ; le
  rendu de l'aperçu (Chromium de Playwright) est celui du jeu.
- **Écarté** : PNG exportés (double source, poids × 10, flous si agrandis) ; formes
  dessinées en code Phaser (illisible à ce niveau de détail) ; images d'un tiers ou
  générées par un service payant (droits, coût, style incohérent).
- **Production** : un agent par visuel, dans son propre contexte, avec la charte
  commune, une fiche par visuel et une boucle dessiner → aperçu → regarder → corriger.

## R2. Netteté : rendu à la densité de l'écran

- **Décision** : `R = clamp(ceil(densité × agrandissement), 1, 3)` où l'agrandissement
  est celui du mode FIT (fenêtre / 360 × 640). Canvas de 360R × 640R, caméra de chaque
  scène zoomée ×R et centrée : toute la géométrie (`layout.ts`, e2e) reste en 360 × 640.
  Textes avec `resolution: R`, SVG rastérisés à taille d'affichage × R.
- **Pourquoi** : Phaser 4 n'a plus d'option de résolution ; sans cela, un écran agrandi
  ×1,5 (bureau) ou ×3 (téléphone) étire une image de 360 × 640.
- **Effets** : l'e2e (fenêtre 360 × 640, densité 1) garde R = 1, donc un rendu et des
  temps identiques ; un test à densité 2 vérifie que les appuis tombent juste.
- **Écarté** : jeu fixé à 720 × 1280 (géométrie et e2e à doubler).

## R3. Vignettes : tête, buste, silhouette

- **Décision** : au démarrage, pour chaque illustration chargée, on dessine dans des
  textures canvas (API 2D) la tête découpée en disque, le buste découpé en rectangle
  arrondi et la silhouette de la tête (`source-in` d'une couleur sombre), d'après les
  cadrages `<id>.json`.
- **Pourquoi** : une fois pour toutes, sans masque ni filtre par image (coûteux en
  WebGL, et 20 cases dans la collection).
- **Écarté** : masques Phaser 4 (filtres par objet) ; recadrage seul (coins carrés qui
  dépassent du cadre arrondi).

## R4. Présentations plein écran

- **Décision** : `presentations(results, flipOrder)` (logique pure) rend les index des
  Légendaires et Ultra rares dans l'ordre de retournement. ×1 : révélation → présentation
  → carte. ×10 : révélation → retournement → présentations par-dessus les résultats.
  Passer la révélation ne les supprime pas (clarification). Fenêtre `splash`
  (`dataset.modal`, et `dataset.splash` = id présenté) ; l'appui n'est accepté qu'après
  l'entrée (400 ms), comme le délai de 004 pour passer.
- **Écarté** : présentation au moment où la carte se retourne (couperait le rythme du
  retournement) ; seulement pour les nouveaux (rejeté par l'utilisateur).

## R5. Révélation (004, FR-016, FR-017)

- **Nuit** : la fenêtre de révélation pose `bg-reveal` (fondu 250 ms) au lieu du voile
  crème ; le nom du palier garde son contour clair, lisible sur la nuit.
- **Suspense 1 600 ms** (`REVEAL_TIMING.suspense`) : cercle magique (tourne, s'allume),
  aspiration de plus en plus dense, fissures 1, 2, 3 à 45 %, 65 % et 82 % (petit choc,
  éclats), tremblement croissant, **temps figé** sur les 150 dernières ms (tout s'arrête,
  silence), puis éclatement. Lumière des fissures neutre (blanc chaud).
- **Particules** : comptes doublés (`REVEAL.burst`, `cardBurst`), nouvelles formes
  `shard` (éclat de verre triangulaire, encre fine) et `glow` (disque doux additif),
  traînées plus longues ; cercle magique teinté du palier ; pluie plus dense.
- **Son** : la sirène du suspense dure jusqu'au temps figé (1 450 ms) ; un craquement
  (`crack`) à chaque fissure. Calendrier dans `soundCues.ts`, testé.
- **Bornes FR-010** : 1 600 + 600 = 2 200 ms au plus bas, 1 600 + 1 000 + 2 000 = 4 600 ms
  au plus haut : tenues, vérifiées par les tests existants.

## R6. Contraste des textes sur le fond (SC-003)

- **Décision** : `scripts/art/contrast.mjs` rend `bg-main.svg` dans Chromium et mesure,
  sous chaque ligne de texte de l'écran de tirage (rectangles tirés de `layout.ts`), le
  pire contraste avec la couleur du texte ; échec sous 4,5:1. Lancé par la CI.

## R7. Repli (FR-010)

- **Décision** : `src/ui/art.ts` note les clés que le chargeur n'a pas pu lire
  (`loaderror`) ; tout widget demande `hasArt(id)` et retombe sur la pastille + initiale
  sinon. `dataset.artMissing` liste les ids en repli (e2e : route 404 sur un SVG,
  zéro `pageerror`, carte en repli).
