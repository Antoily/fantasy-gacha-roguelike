# Charte graphique — illustrations et visuels d'interface

Référence commune de tous les visuels du jeu (feature 007). Chaque visuel est dessiné
séparément, souvent par un agent différent : cette charte est ce qui les fait tenir
ensemble. Les fiches de chaque visuel sont dans [`briefs.md`](briefs.md).

## 1. Intention

**Cartoon BD détaillé.** On garde l'ADN de l'interface actuelle (papier crème, couleurs
franches, gros contour encre) mais on passe d'aplats nus à un rendu **fini, pro** :
ombrage en cel-shading, reflets, matières, accessoires qui racontent le personnage,
visages expressifs. Pensez illustration de jeu mobile cartoon haut de gamme ou
d'album jeunesse moderne : lisible d'un coup d'œil, généreux en détails quand on regarde
de près. Ni réalisme, ni croquis, ni « clipart » plat.

Univers : un monde de conte loufoque et tendre (peintres maladroits, pirates de cuisine,
chats-nuages, baleines-bulles). L'humour passe par la pose, l'expression et l'accessoire.

## 2. Format technique (vérifié par `npm run art:check`)

- **SVG** avec `xmlns="http://www.w3.org/2000/svg"`, un `viewBox`, `width`/`height` égaux au viewBox.
- Fond **transparent** (aucun rectangle plein cadre), sauf pour les fonds d'écran.
- Autorisé : `path`, `circle`, `ellipse`, `rect`, `polygon`, `polyline`, `line`, `g`,
  `defs`, `use`, `clipPath`, `mask`, `linearGradient`, `radialGradient`, `filter` avec
  `feGaussianBlur` / `feMerge` / `feOffset` / `feColorMatrix` (lueurs, avec parcimonie).
- **Interdit** : `text` (aucune police n'est garantie : pas de lettres, dessiner les signes
  en formes), `image`, `foreignObject`, `script`, `style`, `class`, animations, toute
  référence externe ou `data:`.
- Attributs de présentation directement sur les éléments (`fill`, `stroke`…).
- **Tous les `id` préfixés par le nom du fichier** : `gribouille-tete`, `orb-verre`…
  (plusieurs SVG peuvent cohabiter dans une même page).
- `href="#…"` (pas `xlink:href`) ; chaque référence doit viser un `id` existant.
- 150 Ko maximum ; coordonnées à une décimale au plus.
- Rendu de référence : Chromium (c'est lui qui rastérise les SVG pour Phaser).

## 3. Construction (voir [`exemple-technique.svg`](exemple-technique.svg))

Pour chaque masse (tête, corps, vêtement, accessoire) :

1. **Définir la forme une fois** dans `<defs>` (`<path id="…-tete">`) et une
   `<clipPath>` qui la réutilise.
2. **Aplat** de la couleur de base (`<use href>` rempli). Un dégradé radial doux est
   permis sur les grands volumes ronds, jamais sur tout.
3. **Ombre propre** : une grande forme à **bord net** dans un `<g clip-path>`, du côté
   opposé à la lumière ; une **occlusion** plus sombre là où les masses se touchent
   (sous le menton, sous un bras, sous un chapeau).
4. **Lumières** dans le même groupe découpé : un reflet principal en haut à gauche, un
   ou deux petits reflets nerveux ; liseré de contre-jour sur le bord ombré (dès Rare).
5. **Contour** de la silhouette **par-dessus**, en `<use>` sans remplissage.
6. **Traits intérieurs** (plis, coutures, mèches, rides) après les contours.

Ordre de dessin : de l'arrière vers l'avant (bras du fond, corps, tête, bras de devant,
accessoire tenu, effets).

## 4. Trait, lumière, couleur

- **Encre** `#1d1a16` pour tous les contours et les noirs (celle de l'interface).
- Épaisseurs pour un cadre de 400×500 : **7** contour de silhouette, **4,5** traits
  intérieurs, **2,5** petits détails. `stroke-linejoin="round"`, `stroke-linecap="round"`.
  Autres cadres : viser le même rendu à la taille d'affichage (contour ≈ 3 à 4 px affichés).
- **Lumière unique en haut à gauche**, pour tous les visuels.
- **Ombres** : la couleur de base assombrie (−25 à −35 % de luminosité), plus saturée et
  décalée vers le violet/bleu ; jamais du gris ni du noir transparent sur la couleur.
- **Lumières** : la couleur de base éclaircie et réchauffée (vers le jaune pâle).
- Blanc cassé `#fffaf0` pour le blanc des yeux et les tissus blancs ; blanc pur `#ffffff`
  réservé aux reflets.
- Ombre au sol : ellipse encre à 15–20 % d'opacité, sous les pieds (plus petite et plus
  pâle pour ce qui flotte).
- Couleurs des raretés dans l'interface : Commun `#b8b2a7`, Peu commun `#6fcf74`,
  Rare `#4d9de0`, Légendaire `#ff9f1c`, Ultra rare `#d65db1`. Un personnage peut en faire
  un accent (un détail de sa tenue), sans s'y limiter.
- Palette de chaque personnage : 3 à 5 teintes principales, chacune avec base, ombre,
  occlusion et lumière. Une couleur dominante qui le distingue des autres.

## 5. Personnages et créatures

- Cadre **`viewBox="0 0 400 500"`**. Personnage centré vers x = 200, pieds (ou bas du
  corps) vers y = 465–480, haut de la tête à y ≥ 25. Accessoires et effets peuvent occuper
  tout le cadre, sans être coupés par le bord.
- Proportions **cartoon chibi** : 2,5 à 3 têtes de haut, tête large (130 à 180 de
  large). Créatures : même masse visuelle, tête bien visible.
- **Pose** dynamique de trois quarts, jamais de face raide : ligne d'action, poids
  déporté, geste qui raconte la phrase du personnage.
- **Visage** : grands yeux (blanc cassé cerné, iris coloré, pupille, **deux reflets** :
  grand en haut à gauche, petit en bas à droite), sourcils épais qui portent
  l'expression, bouche expressive avec intérieur sombre et langue. Yeux fermés, plissés
  ou « boutons » permis quand le personnage l'exige.
- **Détails** : plis de tissu, coutures, motifs (rayures, pois, carreaux, pièces),
  textures (taches de rousseur, touffes de poils, écailles), petits accessoires et
  effets (éclaboussures, bulles, étincelles, traits de vitesse) qui racontent l'histoire.
- **Richesse selon la rareté** (le joueur doit la sentir sans lire) :
  - Commun : tenue du quotidien, 3–4 couleurs, un accessoire clé.
  - Peu commun : un accessoire marquant de plus, motifs.
  - Rare : costume plus riche, un élément magique ou lumineux, liseré de contre-jour.
  - Légendaire : ornements (dorures, bijoux, cape), pose héroïque, effet (aura, éclairs).
  - Ultra rare : cosmique, éléments lumineux, étoiles, reflets irisés ; le plus détaillé.
- **Pas de fond** : le jeu pose derrière la couleur de la rareté. Pas de cadre, pas de sol
  dessiné au-delà de l'ombre portée.

## 6. Lisibilité (vérifiée sur l'aperçu)

Une illustration est vue à quatre tailles : plein cadre (carte ×1, splash ≈ 190×240 à
300×380), **buste** (carte ×10 ≈ 60×75), **tête** (collection ≈ 28 px de diamètre) et en
**silhouette** noire (élément pas encore obtenu). Elle doit :

- se reconnaître en silhouette (forme distinctive : chapeau, oreilles, accessoire) ;
- garder un visage lisible dans le cercle de 28 px (yeux bien visibles, contraste) ;
- ne pas virer à la bouillie au buste : peu de détails minuscules collés au visage.

## 7. Cadrages : `<id>.json` à côté de `<id>.svg`

```json
{ "bust": { "x": 90, "y": 30, "w": 220, "h": 275 }, "head": { "cx": 200, "cy": 150, "r": 85 } }
```

- `bust` : rectangle au format **4:5** (w/h = 0,8), tête et épaules, visage dans le tiers
  haut ; c'est la vignette des cartes ×10.
- `head` : cercle qui contient le visage (yeux, bouche) avec un peu d'air ; c'est
  l'avatar de la collection.
- Les deux dans le cadre 400×500.

## 8. Visuels d'interface

Mêmes trait, lumière et couleurs. Formats (taille d'affichage en jeu entre parenthèses) :

| Fichier | viewBox | Rôle |
|---|---|---|
| `ui/bg-main.svg` | 360×640 | Fond de l'écran de tirage (360×640). |
| `ui/bg-reveal.svg` | 360×640 | Fond sombre de la révélation. |
| `ui/magic-circle.svg` | 400×400 | Cercle magique sous l'orbe pendant la révélation, tourné et teinté par le jeu. |
| `ui/orb.svg` | 240×240 | L'orbe : sphère de rayon 100 centrée en (120, 120) (≈ 130 px, 170 px pendant la révélation). |
| `ui/orb-cracks-1.svg` … `-3.svg` | 240×240 | Fissures lumineuses superposées à l'orbe, de plus en plus nombreuses. |
| `ui/card-back.svg` | 312×184 | Dos des cartes ×10 (156×92). |
| `ui/icons/icon-*.svg` | 64×64 | Icônes (24 à 32 px). |
| `ui/rarity/rarity-*.svg` | 64×64 | Emblème de chaque rareté (20 à 32 px). |

- Les fonds restent **en retrait** : contours colorés (teinte sombre locale) plutôt
  qu'encre pure, contraste faible là où l'interface pose du texte.
- Ce que le jeu **teinte** (cercle magique, fissures) est dessiné en blanc et gris clair :
  la teinte multiplie les couleurs.

## 9. Méthode (pour chaque visuel)

1. Lire cette charte et la fiche du visuel ; poser la composition (silhouette, pose,
   palette) avant d'écrire du SVG.
2. Écrire le SVG, puis `npm run art:check -- <fichier>` et l'aperçu :
   `npm run art:preview -- character <id>` (illustrations) ou
   `npm run art:preview -- ui <fichier> [--mock main|reveal|cards]` (interface).
3. **Regarder les PNG** produits dans `test-results/art/<nom>/` (`sheet.png`, `zoom.png`,
   `mock-*.png`) et critiquer sans complaisance : anatomie, raccords, débords, sens de la
   lumière, épaisseurs, expression, lisibilité aux petites tailles, silhouette.
4. Corriger et recommencer : **au moins trois passes** complètes, jusqu'à ce que la
   relecture ne trouve plus rien d'important.

Relecture finale : rien ne déborde d'une forme, aucun contour manquant ou doublé, les
yeux ont leurs deux reflets, l'ombre est du bon côté, le visage se lit à 28 px, la
silhouette se reconnaît, `art:check` passe.
