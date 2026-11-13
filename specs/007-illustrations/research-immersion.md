# Retour d'expérience : visuel, animations, immersion

Jeu joué le 2026-11-13 sur le build statique de `main` (4bad5d5), `vite preview` sur le port 4191, Chromium headless,
360 × 640 à densité 2. Le temps est simulé par une horloge virtuelle (`requestAnimationFrame` et `performance.now` remplacés),
avec une capture toutes les 33 à 250 ms.

- Captures : `critique-visuel/shots/` (357 images, nommées `<scène>-<ms>.png`, ms = temps écoulé depuis l'action).
- Planches-contact : `critique-visuel/sheets/` (`home`, `banner`, `common-a/b/zoom`, `legend-a/b`, `ten-a/b/c`, `lure-a/b`,
  `ultra`, `menus`).
- Scripts : `critique-visuel/play.cjs` (parcours, hasard scripté comme l'e2e), `sheet.cjs` / `sheet.sh` (planches).

> **Piège de mesure, utile aux futurs agents** : Chromium headless ne donne pas le focus à la page, et `TimeStep.smoothDelta`
> de Phaser borne alors chaque delta à 16,7 ms (`!this.inFocus`). Avec une horloge virtuelle au pas de 1/30 s, le jeu tourne
> deux fois trop lentement. Il faut avancer par pas de **1/60 s**.

Parcours joués :

- accueil au repos (0 à 1,6 s) et changement de bannière ;
- ×1 Commun (scripté) et ×1 Légendaire (pity 39) ;
- ×1 Ultra rare (scripté) ;
- ×10 avec Légendaire (pity 39), regardé jusqu'au bout, présentation comprise ;
- ×10 Rare avec leurre (Légendaire → Rare) ;
- collection, fiche, échange (Bidule), taux (standard et vedette), recommencer, avertissement (sauvegarde corrompue),
  écran sans pièces.

---

## 1. Constat par écran

### Accueil au repos (`01-home-0000…1600`, `14-poor`)

**Réussi**

- Le décor est très propre : ciel pastel, îles flottantes, orbe galaxie illustrée, contours encre cohérents.
- Le halo des boutons payables respire bien. On le voit entre `01-home-0000` et `01-home-0800`.

**Statique ou cheap**

- L'écran vit très peu. L'orbe lévite de 5 px sur 3,2 s, ce qu'on perçoit à peine.
- Les lueurs du ciel sont des points de 2,5 à 4,5 px qui disparaissent dans le pastel : sur les cinq images, presque rien ne
  change hors du halo.
- La galaxie de l'orbe ne tourne pas, aucune étincelle ne gravite autour d'elle, aucun reflet ne passe sur « Tirer ».
- Un appui ne fait que décaler l'ombre de 4 px, sans écrasement ni rebond.
- **Bug de lisibilité (`14-poor`)** : le message « Plus assez de pièces pour tirer… » est presque invisible. Le bandeau
  papier (`textPlates`, alpha 0,82) est créé **après** `shortageText` dans `GachaScene.create()`, donc il le recouvre.
- Sur un bouton désactivé, le sous-titre « Un Rare ou mieux garanti » reste foncé alors que le titre est grisé.

### Changement de bannière (`02-banner-0000…0297`, `02-banner-rest`, `02-banner2-rest`)

**Réussi** : le glissement du texte (220 ms) est net.

**Statique**

- Seul le cadre de 188 px change ; le reste de l'écran est identique au pixel près.
- La vedette Légendaire n'existe qu'en portrait de 30 px.
- Aucun signe d'ambiance (orbe, lueurs, couleurs) ne dit « bannière de Roi Barbichon ».
- Dans le genre, changer de bannière change toute l'affiche (Genshin, HSR). Ici on peut au moins teinter la scène.

### Révélation : entrée et suspense (`03-x1common-0000…1500`, `common-zoom`)

**Réussi**

- La nuit étoilée, le cercle magique qui s'allume et tourne, et les trois fissures sont de bonne facture.
- L'aspiration des particules se lit à densité 2.

**Problèmes**

- **Entrée laiteuse** (`03-x1common-0100`, `0200`). La fenêtre pose d'abord le voile papier (`SCRIM_ALPHA` 0,82), puis la nuit
  monte en 300 ms par-dessus. On obtient deux à trois images gris-rose délavées, où l'interface fantôme reste visible : la
  « plongée dans la nuit » ressemble à un écran qui se décolore.
- « Touche pour passer » s'affiche dès la première image, alors que l'appui n'est armé qu'à 200 ms.
- **Le cœur qui bat est invisible** (`03-x1common-0500` : aucune onde). `REVEAL_FX.heartbeat` vaut `palette.ink` : un anneau
  d'encre à 0,5 sur la nuit ne se voit pas. Le battement prévu par FR-013 n'existe donc pas à l'écran.
- La lumière ne filtre pas vraiment par les fissures. Ce sont des traits teintés, sans lueur derrière. Le gel (150 ms) n'a
  pas d'effet « temps arrêté » : les particules continuent de voler.

### Révélation : éclatement et palier (`03-x1common-1700…2100`, `04-x1legend-1600…3100`, `07-ultra-*`, `06-lure-*`)

**Réussi**

- L'éclatement en éclats de verre fonctionne bien.
- Le cercle prend la couleur du palier.
- Confettis et pluie pour Légendaire et Ultra rare ; le leurre retombe sur Rare.

**Cheap : c'est le point le plus faible du jeu**

- **Le palier est une bille d'aplat cernée d'encre, entourée de triangles cernés d'encre.**
  - Commun (`03-x1common-1700`) : une bille grise à dents, qui évoque une mine marine ou un engrenage.
  - Légendaire (`04-x1legend-2000`) : un soleil de clipart orange.
  - Ultra rare (`07-ultra-*`) : un chewing-gum rose.
  - Dans tous ces gachas, le palier est de la **lumière** (étoile filante bleue, violette ou dorée chez Genshin ; couleur du
    warp chez HSR ; enveloppe arc-en-ciel chez Blue Archive). Ici, c'est un objet plat.
- **Temps mort.** Après environ 500 ms, le palier final se fige : `04-x1legend-2300` à `3100` sont quasi identiques, et
  `07-ultra-2400` à `3700` aussi. Les rayons ne tournent que de 20 + 10k degrés en 2 s, le cœur ne respire pas.
- Le flash de Légendaire et d'Ultra rare est un aplat de la couleur de rareté à 0,65 (`04-x1legend-1600`) : brun-orangé
  plutôt qu'éblouissant.
- L'Ultra rare ne se distingue du Légendaire que par la couleur. L'« arc-en-ciel » n'existe que dans les confettis.
- Le leurre (`06-lure-2100…2500`) : le soleil se dégonfle en 300 ms, proprement mais sans drame ni humour. Le rire
  (son) porte seul la blague.
- **Sortie coupée net.**
  - Au ×1 (`03-x1common-2300`, `03b-x1common-card-0000`), la nuit disparaît d'un coup. L'écran d'accueil réapparaît une image,
    puis la carte arrive en fondu.
  - Même cassure vers la présentation (`04-x1legend-3200` → `04b-splash-0000`) et vers la grille du ×10 (`05b-flip-0000`).

### Présentation plein écran (`04b-splash-*`, `05b-flip-3600…4400`, `07b-splash-*`)

**Réussi**

- L'illustration en grand est superbe.
- Le rebond d'entrée, la lévitation, le ruban et l'appui armé à 400 ms fonctionnent.

**Problèmes**

- Rien ne prépare l'apparition : pas de silhouette, pas d'éclair. Le personnage surgit en couleur sur un fond déjà là.
  Genshin et Uma Musume tirent leur frisson de la silhouette noire qui s'illumine.
- Les rayons sont en couleur à 0,35 et en mélange normal sur la nuit : brun boueux pour le Légendaire (`04b-splash-1050`).
- Le badge « Nouveau ! » chevauche la couronne de Roi Barbichon (`04b-splash-1050`, `SPLASH.badgeY` = 84).
- Nom, emblème et phrase arrivent ensemble, en simple fondu de 300 ms : pas de « pose » du nom.

### Résultats ×1 (`03b-x1common-card-*`, `04c-card-*`, `10b-exchange-card-*`)

**Réussi** : la grande illustration et le rebond `Back.easeOut`.

**Problèmes**

- Le voile papier à 0,82 laisse voir l'accueil : « Tu as obtenu… » se superpose au fantôme de « Bannière standard ».
- Une carte Légendaire a le même cadre noir qu'une Commune, seul le fond est teinté.
- Les confettis passent **sur** l'illustration (`04c-card-0150`).
- Une fois posée, la carte d'un Commun ou d'un Rare est figée.

### Retournement ×10 (`05b-flip-*`, `06b-flip-*`)

**Réussi**

- Le rythme « le temps se mérite » fonctionne : un Commun passe vite, la vedette se fait attendre.
- Le dos de carte illustré est beau.

**Problèmes**

- Les 10 dos apparaissent d'un bloc (`05b-flip-0000`), sur un **panneau crème** : après la nuit étoilée, la tension retombe
  d'un coup.
- **Les cartes déjà vues ne s'assombrissent pas, elles pâlissent** (`05b-flip-2700`). L'alpha 0,35 sur le crème les délave,
  contrairement à FR-014 (« s'assombrissent »).
- La vedette reste dans sa petite case. Si c'est la carte 0, son explosion part dans le coin, coupée par le bord du panneau,
  et ses confettis recouvrent sa face (`05b-flip-3500`).
- Le retournement ne joue que sur `scaleX` : aucun relief, aucune élévation.
- L'éclat de la face dans `cardBurst` reste léger.
- Le bouton OK apparaît d'un coup.

### Résultats ×10 (`05d-results-0500`)

**Problèmes**

- Toutes les cartes sont le même panneau blanc. Rare, Légendaire et Commun ne se distinguent que par un emblème de 12 px.
- Le scintillement du Légendaire (6 étoiles par seconde) est à peine visible.
- **« Garanti ! » masque la fin du nom** : on lit « Roi Barbichon » coupé par l'autocollant.
- OK n'est qu'à 4 px de la dernière rangée.

### Collection (`08-collection-*`)

**Réussi** : la grille, le résumé par rareté et les coûts sont lisibles.

**Problèmes**

- **Les silhouettes ne se reconnaissent pas.** 10 manquants sur 14 sont des disques sombres pleins (Cosmo, Tonnerrouf, Lulu,
  Capitaine Tartine…) : la tête remplit le cercle, donc la silhouette aussi. FR-004 (« forme reconnaissable ») n'est pas
  tenu.
- Un manquant échangeable (coût net) n'est signalé que par l'estompage des autres ; rien n'attire l'œil.
- L'ouverture n'est qu'un fondu de 120 ms : aucune cascade.

### Fiche (`09-fiche-*`)

- La fiche est propre, mais elle apparaît en fondu puis reste parfaitement figée.
- Rien ne la relie à la case touchée.

### Échange (`10-exchange-confirm`, `10b-exchange-card-*`, `10c-home-after-*`)

- La confirmation est sobre.
- La carte obtenue ressemble à un tirage Commun : rien ne montre les éclats dépensés.
- Au retour, le montant défile de 60 à 50 et l'icône rebondit : c'est bien.

### Taux, recommencer, avertissement (`11-rates`, `11b-rates-featured`, `12-reset-confirm`, `13-warning`)

- **Bug de lisibilité** : « au plus tard au 40ᵉ tirage » s'affiche « au 40␣␣␣tirage » (`11-rates`). Le ᵉ (U+1D49) n'existe pas
  dans Fredoka et tombe sur une police de repli qui ne l'a pas non plus.
- Les fenêtres n'ont qu'un fondu de 120 ms, sans pop ni échelle : elles « apparaissent » plus qu'elles ne « s'ouvrent ».

### Sons (lecture de `src/data/sounds.ts` et `src/logic/soundCues.ts`)

- Les cues suivent bien le calendrier de la révélation.
- La présentation plein écran est **muette**, alors que c'est le sommet émotionnel. Réutiliser la cue `star` existante, sans
  nouveau son ni musique, suffirait.

---

## 2. Retouches proposées (20), en 5 lots indépendants

Conventions :

- Durées en ms, easings Phaser.
- « Effort » : S < ½ jour, M ≈ 1 jour, L > 1 jour.
- Toute nouvelle couleur passe par un token de `theme.ts`, toute nouvelle durée par un fichier de données (voir partie 3).

### Lot A — Révélation : lumière et rythme

**Fichiers** :

- `src/ui/reveal.ts`, fonction `playReveal` uniquement (lignes 124–359) ;
- `src/data/revealConfig.ts` (REVEAL_TIMING) ;
- `src/ui/layout.ts` (REVEAL) ;
- `src/ui/theme.ts` (REVEAL_FX) ;
- `GachaScene.showReveal` / `openModal`, quelques lignes.

#### A1. Plonger dans la nuit sans passer par le gris

- **Priorité / effort** : P1 · S.
- **Écran** : entrée de la révélation (`03-x1common-0100`).
- **Effet**
  - Pas de voile papier sous la révélation : alpha du scrim à 0 pour `reveal`, zone toujours interactive.
  - La nuit monte de 0 à 1 en 240 ms, `Quad.easeIn`.
  - L'orbe gagne le centre en 400 ms en `Back.easeOut` (dépassement 1,2), avec 3 à 4 lueurs `glow` en traînée.
  - « Touche pour passer » n'apparaît qu'à l'armement : fondu de 200 ms, puis pulsation d'alpha 0,5 ↔ 1 sur 1 400 ms,
    `Sine.easeInOut`.
- **Pourquoi** : le passage au ciel étoilé de Genshin et le tunnel de HSR basculent d'un coup dans un autre monde ; un fondu
  par le gris fait « chargement ».
- **Fichiers** : `GachaScene.openModal` (ne pas poser le scrim pour `reveal`, ou alpha 0), `reveal.ts`.

#### A2. Suspense lisible : cœur, fissures, gel

- **Priorité / effort** : P1 · S.
- **Écran** : suspense (`03-x1common-0500`, `1300`, `1500`).
- **Effet**
  - **Battement visible** : anneau en `crackLight`, mélange ADD, épaisseur 4, alpha 0,7 → 0, échelle 1 → 1,35, en 260 ms
    `Quad.easeOut`. À chaque battement, l'orbe pulse à ×1,03 pendant 80 ms (yoyo).
  - **Fissures** : à chacune, une lueur additive `crackLight` derrière l'orbe, à l'alpha 0,25 / 0,45 / 0,7 et à l'échelle
    1 / 1,12 / 1,25 (entrée en 90 ms), plus un anneau fin qui s'étend en 160 ms.
  - **Gel** (150 ms) : les particules s'arrêtent net, ce qui demande un `timeScale` dans `Particles`. La nuit fonce
    (voile encre 0 → 0,25), et le conteneur passe de ×1 à ×1,03, pivot au centre.
  - Tout reste en lumière neutre (FR-016).
- **Pourquoi** : aujourd'hui le battement est invisible (encre sur nuit) et le gel ne se sent pas. L'arrêt du temps juste
  avant l'éclat est le « beat » de tous les gachas du genre (pause de l'étoile filante chez Genshin, warp figé chez HSR).
- **Fichiers** : `reveal.ts`, `particles.ts` (ajout `timeScale`), `theme.ts` (REVEAL_FX.heartbeat).

#### A3. Un palier fait de lumière, en mouvement continu

- **Priorité / effort** : P1 · L.
- **Écran** : palier final (`03-x1common-1700`, `04-x1legend-2000`, `07-ultra-3000`).
- **Effet**
  - **Rayons** : plus de contour encre. Deux couches additives, l'une longue et fine (alpha 0,35, ouverture 0,18), l'autre
    courte et large (alpha 0,6). Elles tournent en sens inverse, à +25°/s et −15°/s (`repeat: -1`, Linear), pendant **toute**
    la durée finale. L'alpha respire de 0,6 à 1 sur 700 ms (`Sine.easeInOut`).
  - **Cœur** : trois disques additifs concentriques, de la couleur du palier vers `crackLight` au centre, qui respirent à
    1 ↔ 1,08 sur 600 ms. Ils remplacent la bille cernée.
  - **Étincelles** : 6 à 12 `star` en orbite selon le rang, rayon 70 à 110 px, période 1 800 ms.
  - **Label** : un second rebond à +600 ms (1 → 1,06 → 1, 240 ms). L'emblème de rareté (`makeEmblem`) se pose en tampon à
    gauche (échelle 1,8 → 1, 220 ms `Back.easeOut`, 120 ms après le label).
  - **Commun** : anneau argent et 6 rayons courts, sobre mais lumineux, jamais de bille grise.
  - **Ultra rare** : rayons alternant les 5 couleurs de rareté, dont la teinte tourne sur un cycle de 1 200 ms.
  - L'ampleur par rang reste celle de `REVEAL.rays`, `rayLength` et `pulse`.
- **Pourquoi** : c'est le moment pour lequel on tire ; il doit briller et vivre jusqu'à la dernière milliseconde, au lieu de
  passer 1 à 1,5 s figé.
- **Fichiers** : `reveal.ts` (`burst`), `layout.ts` (REVEAL), `revealConfig.ts` (périodes), `theme.ts`.

#### A4. Impact franc, sortie sans coupure

- **Priorité / effort** : P1 · M.
- **Écran** : éclatement (`04-x1legend-1600`) et passage aux cartes ou à la présentation (`03-x1common-2300`,
  `04b-splash-0000`, `05b-flip-0000`).
- **Effet**
  - **Impact** : flash `crackLight` 0 → 0,9 en 50 ms, puis vers la couleur du palier et 0 en 280 ms. Pour un rang ≥ 2,
    « coup de poing » du conteneur de la fenêtre : ×1 → ×1,035 → ×1 en 160 ms, pivot au centre (pas la caméra, qui porte R).
  - **Sortie naturelle** : dans les 120 dernières ms de la `Sequence`, voile `crackLight` 0 → 1. Une couche au-dessus de tout
    (profondeur 300) survit à la fenêtre et s'efface en 220 ms sur ce qui suit (carte, grille ou présentation).
  - **Appui pour passer** : aucun voile, pour respecter SC-002 (< 500 ms).
- **Pourquoi** : Genshin passe de l'étoile à la carte par un blanc. Ici, l'écran d'accueil réapparaît une image entre deux :
  c'est la cassure la plus visible du parcours.
- **Fichiers** : `reveal.ts`, `GachaScene.showReveal`.

#### A5. Leurre et montée qui jouent la comédie

- **Priorité / effort** : P2 · S.
- **Écran** : fausses pistes (`06-lure-2100…2500`).
- **Effet**
  - **Leurre** : trois hoquets du cœur (×1,06 / ×0,94, 70 ms chacun), teinte vers `fizzle` en 200 ms, chute de +14 px en
    `Cubic.easeIn`, puis le vrai palier. Les rayons du faux palier s'éteignent un à un.
  - **Montée** : étirement vertical `scaleY` 1,15 en 120 ms, puis éclat.
  - Tout tient dans `REVEAL_TIMING.transition`. Si on la porte de 300 à 400 ms, vérifier les bornes de FR-010 (le leurre au
    Rare fait alors 3,8 s) et les tests de `reveal.test.ts`.
- **Pourquoi** : le « faux espoir » fait parler de Uma Musume et de FGO (le faux arc-en-ciel) ; il faut que la retombée se
  voie et fasse sourire.
- **Fichiers** : `reveal.ts` (`transition`), `revealConfig.ts`.

### Lot B — Cartes : distribution, retournement, cadres

**Fichiers** :

- `src/ui/reveal.ts`, fonctions `cardWave`, `cardBurst`, `sparkleBest`, `celebrateSingle`, `makeFlipCard` et `playFlip`
  uniquement (lignes 66–122 et 361–517 : autres blocs que le lot A) ;
- `src/ui/widgets.ts` (`makeResultCard`, `makeSticker`) ;
- `src/logic/reveal.ts` (`flipSchedule`) et ses tests ;
- `src/data/revealConfig.ts` (FLIP_TIMING) ;
- `GachaScene.showResults` / `playFlip` ;
- `layout.ts` (RESULTS).

#### B1. Cartes distribuées depuis l'orbe, OK qui arrive

- **Priorité / effort** : P1 · M.
- **Écran** : début du ×10 (`05b-flip-0000`).
- **Effet**
  - Chaque dos part de `REVEAL.center` (échelle 0,4, angle ±8°) et rejoint sa case en 240 ms `Cubic.easeOut`, avec 45 ms de
    décalage entre deux cartes (≈ 650 ms en tout).
  - Ce temps entre dans `flipSchedule` (nouveau `FLIP_TIMING.deal`) et dans les bornes (4 s ; 3,5 s sans rien au-dessus du
    Rare) : la logique et ses tests changent.
  - Réutiliser la cue `card` à faible volume par carte distribuée, si la spec l'accepte.
  - À la fin, OK monte de 12 px avec un fondu de 220 ms `Back.easeOut`, en animant le visuel et pas la zone (voir partie 3) ;
    l'indication s'efface en 150 ms.
- **Pourquoi** : FGO et HSR distribuent leurs cartes ; une grille qui « apparaît » fait tableau Excel.
- **Fichiers** : `reveal.ts` (`playFlip`), `logic/reveal.ts`, `revealConfig.ts`, `GachaScene.playFlip`.

#### B2. Garder la scène de nuit pour les cartes

- **Priorité / effort** : P1 · M.
- **Écran** : retournement et résultats ×10 et ×1 (`05b-flip-*`, `05d-results-0500`, `03b-x1common-card-0400`).
- **Effet**
  - Le fond de la fenêtre de résultats issue d'un tirage devient la nuit (`bg-reveal`) plutôt que le panneau crème. Les
    cartes restent des panneaux blancs, donc lisibles.
  - Les titres « Tirage ×10 » et « Tu as obtenu… » deviennent clairs, cernés d'encre (`splashText` / `splashStroke`).
  - Au ×1, rayons de la rareté derrière la carte à partir de Rare (alpha 0,2, ADD, 12°/s). L'illustration flotte de ±2 px
    sur 2 400 ms `Sine.easeInOut`.
  - Plus de fantôme de l'accueil (« Tu as obtenu… » sur « Bannière standard »).
  - L'échange garde le fond actuel, ou le même : à trancher en spec.
- **Pourquoi** : la tension de la révélation retombe sur un fond beige ; Genshin et HSR gardent leurs résultats sur le décor
  du tirage.
- **Fichiers** : `GachaScene.showResults`, `reveal.ts` (`celebrateSingle`), `theme.ts`.

#### B3. La vedette prend le centre, les autres s'assombrissent vraiment

- **Priorité / effort** : P1 · M.
- **Écran** : avant la meilleure carte (`05b-flip-2700`, `3500`).
- **Effet**
  - Un voile d'encre de 0 à 0,55 en 250 ms se pose entre les autres cartes et la vedette, au lieu d'un alpha à 0,35 qui
    délave sur le crème.
  - La vedette quitte sa case vers le centre (échelle 1,7, 300 ms `Cubic.easeOut`), bat, se retourne et éclate au centre,
    puis regagne sa case (320 ms `Back.easeOut`). Le voile se retire en 200 ms.
  - Les trajets se prennent dans `starPause` et `starHold` (données), sans dépasser 4 s.
- **Pourquoi** : c'est conforme à FR-014 (« s'assombrissent ») ; la carte dorée de FGO et la « carte qui se soulève » de
  Blue Archive mettent la meilleure au premier plan. Aujourd'hui, son explosion est coupée par le coin du panneau.
- **Fichiers** : `reveal.ts` (`heartbeat`, `turn`), `revealConfig.ts`.

#### B4. Un retournement qui a du relief

- **Priorité / effort** : P2 · S.
- **Écran** : chaque carte du ×10 et la carte du ×1.
- **Effet**
  - **Mouvement** : à mi-course, `scaleY` 1,06 et y −6 px (la carte se soulève). Une ombre d'encre à 0,25, décalée de 4 à
    8 px, s'écarte puis revient. Première moitié en `Sine.easeIn`, seconde en `Back.easeOut` (1,4).
  - **Éclair** : à l'apparition de la face, rectangle `crackLight` 0,8 → 0 en 140 ms.
  - **Particules** : `cardBurst` naît sur le bord (`spawnRadius` ≥ r.h/2). Les `Particles` de la carte du ×1 passent sous la
    carte ; seul le scintillement de bord reste au-dessus.
- **Pourquoi** : aujourd'hui, le retournement n'agit que sur `scaleX`, et les confettis cachent l'illustration
  (`04c-card-0150`).
- **Fichiers** : `reveal.ts` (`turn`, `cardBurst`, `celebrateSingle`).

#### B5. Cadres de rareté et « Garanti ! » à sa place

- **Priorité / effort** : P1 · S.
- **Écran** : cartes de résultat (`05d-results-0500`).
- **Effet**
  - Liseré intérieur de 3 px dans la couleur de rareté dès Peu commun, et bandeau supérieur teinté à 0,35.
  - Légendaire et Ultra rare : un reflet balaie la carte toutes les 2 800 ms (bande diagonale de 18 px, `crackLight` à 0,45,
    520 ms `Sine.easeInOut`). Il ne vit que dans la fenêtre de résultats et s'arrête sous une présentation.
  - « Garanti ! » passe en haut à gauche du buste, incliné de −8°, et se pose en tampon (1,6 → 1, 200 ms `Back.easeOut`)
    quand la carte se retourne. Il ne coupe plus le nom.
  - OK garde au moins 8 px de marge.
- **Pourquoi** : les cadres or, argent et bronze de FGO, comme les cadres de Blue Archive, disent la rareté avant même qu'on
  lise. Aujourd'hui, une seule rangée de pastilles de 12 px la porte.
- **Fichiers** : `widgets.ts` (`makeResultCard`, `makeSticker`), `reveal.ts` (`sparkleBest`), `theme.ts`, `layout.ts`.

### Lot C — Présentation plein écran

**Fichiers** : `src/ui/splash.ts`, `src/ui/layout.ts` (SPLASH), `src/ui/theme.ts` (clés `splash*` d'ART_FX),
`GachaScene.showSplashes` (cue).

#### C1. Silhouette, éclair, couleur

- **Priorité / effort** : P1 · M.
- **Écran** : arrivée de la présentation (`04b-splash-0000`, `07b-splash-0000`).
- **Effet**
  - De 0 à 250 ms, l'illustration est une silhouette en teinte pleine couleur nuit, avec un contour lumineux additif dans la
    couleur de rareté.
  - À 250 ms, éclair `crackLight` 0,9 → 0 en 180 ms, passage à la couleur et rebond `Back.easeOut` existant (420 ms).
  - Jouer la cue `star` existante à 250 ms, sans nouveau son.
  - `SPLASH.armMs` reste au moins égal à la fin de l'éclair (≥ 430 ms).
- **Pourquoi** : la silhouette noire qui s'illumine est la signature de Genshin et d'Uma Musume ; aujourd'hui le personnage
  surgit sans préparation, et en silence.
- **Fichiers** : `splash.ts`, `layout.ts`, `GachaScene.showSplashes`.

#### C2. Rayons lumineux, nom qui se pose, badge dégagé

- **Priorité / effort** : P2 · S.
- **Écran** : présentation au repos (`04b-splash-1050`).
- **Effet**
  - **Rayons** : en ADD, deux couches (alpha 0,22 et 0,12) en contre-rotation à 12°/s et −7°/s ; multicolores pour l'Ultra
    rare.
  - **Nom** : en tampon (1,5 → 1, 260 ms `Back.easeOut`, 80 ms après l'éclair). L'emblème fait 360° en 400 ms
    `Cubic.easeOut`, le ruban monte de 12 px en 240 ms.
  - **Badge** : « Nouveau ! » descend sous la ligne de rareté, ou se pose en haut à gauche avec un pop à +500 ms ; il ne
    couvre plus la couronne.
  - **Repos** : l'illustration respire (échelle 1 ↔ 1,015 sur 3 200 ms) en plus de sa lévitation.
- **Pourquoi** : en mélange normal, les rayons brunissent sur la nuit ; un nom qui « tombe » donne le moment
  « Roi Barbichon a rejoint ton équipe » (Uma Musume, HSR).
- **Fichiers** : `splash.ts`, `layout.ts` (SPLASH.badgeY), `theme.ts`.

### Lot D — Écran d'accueil vivant

**Fichiers** : `src/ui/ambience.ts`, `src/data/ambienceConfig.ts`, `src/ui/widgets.ts` (`makeButton`), `GachaScene.create` /
`refresh` / `slideBanner` / `drawTextPlates`, `theme.ts` (AMBIENCE_FX).

#### D1. Rendre le message de pénurie lisible

- **Priorité / effort** : P1 · S.
- **Écran** : accueil sans pièces (`14-poor`).
- **Effet**
  - Créer `textPlates` **avant** `shortageText`, ou fixer leurs profondeurs : le texte passe au-dessus du bandeau.
  - Sur un bouton désactivé, le sous-titre prend `textFaint` comme le titre.
- **Pourquoi** : c'est un bug de lisibilité : le seul message qui dit quoi faire est invisible.
- **Fichiers** : `GachaScene.create`, `widgets.makeButton`.

#### D2. Reflet et appui qui écrase sur les boutons

- **Priorité / effort** : P1 · S.
- **Écran** : accueil (`01-home-*`).
- **Effet**
  - **Reflet** : sur chaque tirage payable, une bande diagonale `panel` à 0,35, large de 26 px, traverse en 520 ms
    `Sine.easeInOut` toutes les 3 600 ms. Le ×10 est décalé de 300 ms. La bande est dessinée bornée au rectangle, réduit de
    `RADIUS` aux coins.
  - **Appui** : au `pointerdown`, le visuel (graphique et textes, pas la zone) passe à ×0,96 en 70 ms `Quad.easeOut`. Au
    `pointerup`, il monte à ×1,04 puis revient à 1 en 160 ms `Back.easeOut`, pivot au centre.
  - Le reflet vit dans `Ambience` : en pause sous une fenêtre, coupé en mouvement réduit.
- **Pourquoi** : le bouton « Vœu » de Genshin et le « Warp » de HSR brillent et « s'enfoncent » ; c'est ce qui rend l'appui
  gratifiant.
- **Fichiers** : `ambience.ts`, `ambienceConfig.ts`, `widgets.ts`.

#### D3. Orbe et ciel qui scintillent vraiment

- **Priorité / effort** : P2 · S.
- **Écran** : accueil (`01-home-*`).
- **Effet**
  - Trois `star` en orbite elliptique autour de l'orbe : rx 70, ry 22, inclinée de −12°, période 4 200 ms. Alpha 0,4
    derrière l'orbe et 1 devant (profondeur selon l'angle).
  - Les lueurs du ciel deviennent des `star` à 4 branches de 3 à 6 px, qui scintillent (échelle 0,6 ↔ 1,2 sur 900 ms)
    en mélange normal. L'ADD sature au blanc sur le pastel (leçon de l'écran vivant).
  - Lévitation de l'orbe portée à 7 px.
- **Pourquoi** : on voit à peine la vie actuelle sur les captures, alors que FR-013 la veut perceptible.
- **Fichiers** : `ambience.ts`, `ambienceConfig.ts`, `particles.ts` (scintillement), `theme.ts`.

#### D4. Changer de bannière change l'ambiance

- **Priorité / effort** : P2 · S.
- **Écran** : bannière (`02-banner-*`).
- **Effet**
  - La lueur de l'orbe se teinte de la rareté de la vedette (tween de teinte en 300 ms ; papier pour la standard).
  - Une lueur sur trois prend cette couleur.
  - Le portrait de la vedette fait un pop (0 → 1, 260 ms `Back.easeOut`) avec un anneau de sa rareté (1 → 1,6, alpha 1 → 0,
    320 ms).
  - La flèche touchée rebondit de ±4 px en 120 ms.
  - Le glissement du texte reste ≤ 250 ms (FR-016).
- **Pourquoi** : chez Genshin et HSR, changer de bannière change toute l'affiche. Ici, seul un cadre de 188 px bouge.
- **Fichiers** : `ambience.ts` (teinte), `GachaScene.slideBanner` / `refresh`, `theme.ts`.

### Lot E — Fenêtres : collection, fiche, échange, dialogues

**Fichiers** :

- `GachaScene` : `openModal` (pop générique), `dialog`, `showRates`, `showCollection`, `makeCollectionCell`, `showSheet`,
  `showExchangeConfirm` ;
- `widgets.ts` : `makePortrait`, `makeSheet` ;
- `art.ts` (silhouettes) ;
- `theme.ts` (nouveau bloc WINDOW_FX).

#### E1. Des fenêtres qui s'ouvrent

- **Priorité / effort** : P1 · S.
- **Écran** : taux, confirmations, avertissement, collection (`11-rates`, `12-reset-confirm`, `13-warning`,
  `08-collection-0033`).
- **Effet**
  - En plus du fondu : panneau de ×0,94 à ×1 en 180 ms `Back.easeOut` (1,4), pivot au centre de la fenêtre. On anime un
    conteneur visuel ; les zones restent fixes.
  - Lignes des taux décalées de 30 ms.
  - Collection en cascade : décalage de 18 ms par rangée, alpha 0 → 1 et y +8 → 0 en 160 ms `Cubic.easeOut` (≤ 340 ms en
    tout).
  - Les compteurs du résumé montent de 0 à n en 200 ms.
- **Pourquoi** : le « pop » des fenêtres de Blue Archive et d'Uma Musume rend l'interface tactile. Un fondu de 120 ms se
  remarque à peine.
- **Fichiers** : `GachaScene.openModal` / `dialog` / `showCollection`, `ambienceConfig.ts` (TRANSITIONS).

#### E2. Des silhouettes qu'on reconnaît

- **Priorité / effort** : P1 · M.
- **Écran** : collection (`08-collection-rest`).
- **Effet**
  - Silhouette issue du **buste** ou du corps entier, réduite à 80 % du disque et centrée : la forme dépasse du fond au lieu
    de le remplir. Contour clair de 1 px.
  - Pour un manquant échangeable, le coût pulse (1 ↔ 1,08 sur 1 200 ms) et la case porte un liseré `shard`.
  - Pour un possédé, l'anneau du portrait prend la couleur de rareté en 3 px.
- **Pourquoi** : c'est FR-004 (« forme reconnaissable »). Le « Qui est ce Pokémon ? » et les silhouettes des index de gacha
  donnent envie de compléter ; dix disques noirs n'y arrivent pas. Le pouls signale ce qu'on peut faire tout de suite.
- **Fichiers** : `art.ts` (fabrication de `shadowKey`), `widgets.makePortrait`, `GachaScene.makeCollectionCell`, `theme.ts`.

#### E3. Fiche et échange qui racontent quelque chose

- **Priorité / effort** : P2 · M.
- **Écran** : fiche (`09-fiche-rest`) et échange (`10b-exchange-card-*`).
- **Effet**
  - **Fiche** : l'illustration naît de la case touchée, d'échelle 0,6 à la position de la case jusqu'à sa place, en 280 ms
    `Cubic.easeOut`. Elle flotte ensuite de ±3 px sur 3 000 ms. Légendaire et Ultra rare gardent un scintillement de bord
    (`sparkleBest`).
  - **Échange** : à la confirmation, 8 à 12 particules `shard` (`COLORS.shard`) convergent du coût vers le centre de la
    carte en 420 ms, puis `celebrateSingle` part. La carte et OK restent cliquables d'emblée : c'est une surcouche.
- **Pourquoi** : la conversion de Starglitter (Genshin) ou d'Eldorado (Uma Musume) montre ce que l'on dépense ;
  aujourd'hui un échange ressemble à un tirage Commun.
- **Fichiers** : `GachaScene.showSheet` / `showExchangeConfirm`, `widgets.makeSheet`.

#### E4. « 40ᵉ » lisible

- **Priorité / effort** : P1 · S.
- **Écran** : taux (`11-rates`).
- **Effet** : écrire « 40e » (sans exposant) ou « quarantième », ou ajouter le glyphe à la police (sous-ensemble Fredoka).
  Vérifier aussi les autres exposants du jeu.
- **Pourquoi** : on lit « au 40␣␣␣tirage » ; c'est un bug de lisibilité.
- **Fichiers** : `GachaScene.showRates`.

### Synthèse

| Lot | P1 | P2 | Effort total | Chevauchement |
|---|---|---|---|---|
| A Révélation | A1, A2, A3, A4 | A5 | ≈ 3 j | `reveal.ts` (bloc `playReveal`), `particles.ts` |
| B Cartes | B1, B2, B3, B5 | B4 | ≈ 3 j | `reveal.ts` (bloc flip), `logic/reveal.ts`, `widgets.makeResultCard` |
| C Présentation | C1 | C2 | ≈ 1 j | `splash.ts` seul |
| D Accueil | D1, D2 | D3, D4 | ≈ 1,5 j | `ambience.ts`, `widgets.makeButton` |
| E Fenêtres | E1, E2, E4 | E3 | ≈ 2 j | méthodes de fenêtres de `GachaScene`, `art.ts` |

**Fichiers partagés** :

- `theme.ts` : chaque lot ajoute ses jetons **dans son propre bloc** (REVEAL_FX pour A, nouveau CARD_FX juste après
  REVEAL_FX pour B, clés `splash*` d'ART_FX pour C, AMBIENCE_FX pour D, nouveau WINDOW_FX pour E).
- `GachaScene.ts` : des méthodes différentes par lot.
- `reveal.ts` : A et B y touchent des fonctions distinctes.

**Ordre de merge conseillé** : D, puis C, puis E, puis A, puis B. B dépend du voile de sortie de A pour son entrée, et c'est
le lot qui touche la logique.

---

## 3. Pièges à respecter

1. **Spécifier d'abord (constitution II).** Aucun code applicatif sans spec clarifiée et mergée. Ces retouches forment une
   **révision** au même titre que « écran vivant » : une révision de 004 (A, B, C) et de 007 (D, E), avec ses FR, puis
   plan, tâches, `/speckit-analyze` et `docs/ROADMAP.md`. Les questions de design (fond de nuit pour les résultats ? « 40e »
   ou « quarantième » ?) vont à l'utilisateur, une à la fois.
2. **Couleurs et polices dans `theme.ts` uniquement.**
   - `crackLight`, `glass`, `night`, `splashText` et les couleurs de rareté existent déjà ; tout nouveau voile, reflet ou
     liseré est un jeton.
   - Garder COLORS et CSS synchrones.
   - Tout texte passe par `textStyle` (netteté ×R).
3. **Durées et amplitudes dans les données** : `revealConfig.ts` (REVEAL_TIMING, FLIP_TIMING), `ambienceConfig.ts`
   (AMBIENCE, TRANSITIONS), `layout.ts` (REVEAL, SPLASH). Pas de nombres magiques nouveaux dans les scènes.
4. **Aucun hasard de `Math.random` dans la scène** :
   - interdits : `Phaser.Math.Between` / `FloatBetween` / `RND`, émetteur de particules Phaser, `cameras.main.shake` ;
   - le hasard décoratif vient de `Particles.between` (mulberry32 à graine propre) ;
   - l'ordre de consommation (tirage, puis déroulé) est contractuel pour l'e2e (`installRng` / `scriptRng`).
5. **Caméra** : `cameras.main` porte le zoom R (densité). Un « coup de poing » ou un zoom agit sur un conteneur pivoté au
   centre, jamais sur la caméra, ou alors en multipliant R.
6. **Zones cliquables de `layout.ts`.** L'e2e clique aux mêmes coordonnées et `waitModal` tape deux images après l'ouverture.
   - Ne jamais animer (échelle, glissement, cascade) le conteneur qui porte une `zone` : animer un sous-conteneur visuel.
   - Les boutons répondent dès l'ouverture (FR-017).
   - Un appui sur `pointerup` reste la règle.
7. **Bornes de durée (FR-010, FR-015, SC-002, SC-003).**
   - Révélation ≤ 3 s pour Commun et ≤ 5 s pour le plus haut palier ; retournement ≤ 4 s, ≤ 3,5 s sans rien au-dessus du Rare.
   - Les nouveaux temps (distribution, trajet de la vedette, voile de sortie) se comptent dans la logique (`revealDuration`,
     `flipSchedule`), avec tests et mutation (`scripts/mutate.sh`).
   - L'appui qui passe affiche les cartes en moins de 500 ms : aucun voile ni outro sur ce chemin.
8. **Tests e2e chronométrés fragiles sur la CI.** SC-003 est au bord de sa limite sur le runner (rendu logiciel).
   - Pas de filtres Phaser 4 (glow, blur) ni de shaders.
   - Rayons et lueurs dessinés **une fois** dans un Graphics, puis animés par transformation et alpha. Ne pas redessiner un
     Graphics à chaque image hors de `Particles`.
   - Plafonner les comptes de particules. Les nouvelles boucles d'accueil passent par `Ambience` pour se taire sous toute
     fenêtre (`setActive`).
   - Attendre des signaux (`armedSkip`, `waitModal`), jamais des délais fixes.
9. **Signaux DOM** :
   - garder la sémantique de `dataset.modal`, `skip`, `reveal`, `splash`, `glow`, `shownCurrency` et `motion` ;
   - une présentation qui gagne une silhouette doit armer `skip` après l'éclair (`SPLASH.armMs`) ;
   - un voile de sortie ne doit pas retarder le passage de `dataset.modal` à `results`, `flip` ou `splash`.
10. **Mouvement réduit** : toute nouvelle boucle d'accueil (reflet, orbite, scintillement, teinte de bannière) est coupée
    sous `prefers-reduced-motion`. L'e2e `ambiance.spec.ts` exige deux images identiques à 1 s d'écart.
11. **Leçons de rendu**
    - `killTweensOf(cible et enfants)` avant de reposer un état (leçon 004 : le leurre effaçait les rayons).
    - Toute minuterie ou tween d'une mise en scène passe par la `Sequence`, pour qu'un appui arrête tout.
    - Les flux `Infinity` de `Particles` doivent être arrêtés.
    - L'additif ne se voit que sur la nuit ; sur le ciel pastel, utiliser des couleurs en mélange normal.
    - Juger lueurs et halos **à densité 2**.
12. **Vérifier sur le build statique** avec relecture des captures. Pour filmer avec une horloge virtuelle, avancer par pas
    de **1/60 s** (delta borné hors focus, voir l'en-tête), et ne pas utiliser la vidéo Playwright.
13. **Lisibilité** :
    - un texte posé sur la nuit (titres des résultats si B2) garde un contour encre, avec un contraste ≥ 4,5:1 (FR-008,
      `npm run art:contrast` si on touche les fonds) ;
    - un nouveau SVG (silhouettes, E2) passe `npm run art:check` ;
    - les insécables s'écrivent ` ` en échappement (lint).
14. **Neutralité du suspense (FR-002, FR-016)** : battement, fissures et gel restent en lumière neutre. Aucune couleur ni
    ampleur ne doit trahir le palier avant l'éclatement, et le label n'apparaît qu'au vrai palier.
