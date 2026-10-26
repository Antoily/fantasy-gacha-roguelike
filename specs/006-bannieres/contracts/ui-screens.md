# Contrat : écrans

## Écran de tirage

| Zone (`GACHA` dans `layout.ts`) | Contenu |
|---------------------------------|---------|
| `bannerPrev`, `bannerNext` | flèches ◀ ▶, un appui = bannière voisine (en boucle) |
| `banner` (entre les flèches) | nom (« Bannière standard » ou nom de la vedette), détail en petit dessous (« Légendaire · possédé ×2 », « Tous les éléments, taux de base ») |
| `orb` | rayon réduit pour laisser la place au bandeau |
| `pityLineY` | inchangé dans son texte |
| `featuredLineY` | « Prochain <rareté> garanti : <vedette> » si la garantie de la bannière active est ouverte, vide sinon (tournure sans accord : la vedette peut être féminine) |

`document.body.dataset.banner` = id de la bannière active et `dataset.featuredLine` = texte
de la ligne de garantie vedette, posés à chaque `refresh()`, pour que l'e2e vérifie le
sélecteur et la ligne sans lire le canvas.

## Fenêtre des taux (`data-modal="rates"`)

- Standard : identique à 005.
- Vedette : lignes des raretés et règles de 005, puis « Vedette : <nom> » avec sa chance
  par tirage (x,xx %) à droite, puis la règle : « Quand un <rareté> tombe ici, une chance
  sur deux que ce soit <nom>. Sinon, le prochain <rareté> de cette bannière sera <nom>. »
- Hauteur : `ratesDialogH(featured: boolean)`.

## Cartes de résultat

« Garanti ! » si `result.pity || result.featuredGuarantee`.
