# Contrat : écrans

## Écran de tirage

| Zone (`GACHA` dans `layout.ts`) | Contenu |
|---------------------------------|---------|
| `bannerPrev`, `bannerNext` | flèches ◀ ▶, un appui = bannière voisine (en boucle) |
| `banner` (entre les flèches) | nom (« Bannière standard » ou nom de la vedette), détail en petit dessous |
| `orb` | rayon réduit pour laisser la place au bandeau |
| `pityLineY` | inchangé dans son texte |
| `featuredLineY` | « Vedette garantie au prochain <rareté> » si la garantie de la bannière active est ouverte, vide sinon |

`document.body.dataset.banner` = id de la bannière active, posé à chaque `refresh()`,
pour que l'e2e vérifie le sélecteur sans lire le canvas.

## Fenêtre des taux (`data-modal="rates"`)

- Standard : identique à 005.
- Vedette : lignes des raretés, puis « Vedette : <nom> — <x,xx %> par tirage », puis la
  règle : « Quand un <rareté> tombe : une chance sur deux que ce soit <nom> ; sinon, le
  prochain <rareté> de cette bannière sera <nom>. »
- Hauteur : `ratesDialogH(featured: boolean)`.

## Cartes de résultat

« Garanti ! » si `result.pity || result.featuredGuarantee`.
