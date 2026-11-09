# Feature Specification: Illustrations

**Feature Branch**: `feat/007-illustrations`

**Created**: 2026-10-30

**Status**: Draft

**Input**: User description: "J'ai envie qu'on travaille un peu les splash arts et la beauté du jeu. Je trouve que ça fait très très simple, trop simple, et ça manque de professionnalisme. Les assets sont vraiment trop simples et pas assez beaux. […] Toujours dans ce style cartoon, mais un peu plus de détails. […] Commence à faire tous les assets, au moins un premier jet."

## Contexte

Depuis 001, un personnage n'est qu'une pastille de la couleur de sa rareté avec son
initiale, et l'écran de tirage une suite d'aplats unis. L'utilisateur trouve le jeu
« trop simple, pas pro ». Cette feature donne à chacun des 20 éléments du catalogue son
**illustration** (splash art) cartoon détaillée, la montre partout où l'élément
apparaît, présente en grand les plus belles prises et **habille** l'écran : fond
illustré, orbe, dos de carte, icônes et emblèmes de rareté. La règle de style commune
est la [charte graphique](../../docs/art/charte.md).

La mise en scène du tirage (suspense, particules) est revue en parallèle dans la spec
de [004](../004-revelation/spec.md) (révision du 2026-10-30).

## Clarifications

### Session 2026-10-30

- Q: Quand un Légendaire ou un Ultra rare sort, le présenter en grand avant les résultats ? → A: Toujours : plein écran pour chaque Légendaire ou Ultra rare obtenu, même si le joueur a passé l'animation ; un appui pour continuer.
- Q: Dans la collection, comment montrer un élément pas encore obtenu ? → A: Silhouette sombre : forme reconnaissable, détails cachés.
- Q: Quelle ambiance pour le fond de l'écran de tirage ? → A: Ciel de rêve pastel : nuages cartoon, îles flottantes, l'orbe sur un socle ornementé baigné de lumière ; clair, l'interface reste lisible.
- Q: Quel style ? → A (demande de l'utilisateur) : toujours cartoon, avec nettement plus de détails ; la richesse d'une illustration croît avec la rareté.

### Révision du 2026-11-09 (écran vivant)

- Q: L'écran de tirage est statique ; que faut-il animer ? → A (demande de l'utilisateur : « rendre un peu de vie », sans nouvelle feature, choix laissé à Claude) : une ambiance au repos (orbe qui lévite, lueurs dans le ciel), un halo sur les tirages payables, des montants qui défilent, un bandeau de bannière qui glisse, des fenêtres qui apparaissent en fondu (User Story 5, FR-013 à FR-019). Les sons d'interface vont dans la révision de [005](../005-son/spec.md).
- Q: Les nuages du fond bougent-ils ? → A: Non : le fond est une seule illustration (ADR 0007) ; la découper reviendrait à refaire des visuels. Les lueurs suffisent à faire vivre le ciel.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Voir qui l'on a obtenu (Priority: P1)

Après un tirage, chaque carte de résultat montre l'illustration de l'élément : en grand
sur la carte du ×1, en buste sur chacune des dix cartes du ×10. Les informations
d'avant restent (nom, type, rareté, « Nouveau ! » ou exemplaires possédés, éclats,
« Garanti ! »).

**Why this priority**: c'est le cœur de la demande ; le joueur tire pour obtenir des
personnages, il doit les voir.

**Independent Test**: un tirage ×1 montre l'illustration complète de l'élément obtenu ;
un ×10 montre dix bustes, chacun celui de son élément, avec les mêmes textes qu'avant.

**Acceptance Scenarios**:

1. **Given** un tirage ×1, **When** la carte s'affiche, **Then** elle montre l'illustration entière de l'élément obtenu, son nom, son type, sa rareté et « Nouveau ! » ou ses exemplaires.
2. **Given** un tirage ×10, **When** les cartes sont retournées, **Then** chacune montre le buste de son élément, et ses textes restent lisibles en entier.
3. **Given** un échange d'éclats réussi, **When** la carte « Nouveau ! » s'affiche, **Then** elle montre l'illustration de l'élément échangé.

---

### User Story 2 - Admirer une belle prise (Priority: P1)

Quand un Légendaire ou un Ultra rare sort, le jeu le présente en plein écran avant les
résultats : illustration en grand, nom, rareté, sa phrase de présentation, « Nouveau ! »
s'il l'est. Un appui continue.

**Why this priority**: c'est le moment le plus attendu d'un gacha ; sans lui, une prise
à 0,5 % arrive sur une petite carte comme un Commun.

**Independent Test**: un tirage dont le résultat est Légendaire affiche la présentation
plein écran de l'élément, puis, après un appui, l'écran de résultats habituel ; un
tirage sans Légendaire ni Ultra rare n'en affiche aucune.

**Acceptance Scenarios**:

1. **Given** un tirage ×1 Légendaire, **When** l'animation se termine, **Then** la présentation plein écran de l'élément s'affiche, puis un appui mène à sa carte.
2. **Given** un tirage ×10 contenant deux Légendaires, **When** le retournement se termine, **Then** les deux sont présentés l'un après l'autre (ordre de retournement), puis l'écran de résultats reste affiché.
3. **Given** un joueur qui passe l'animation d'un tirage Ultra rare, **When** les cartes s'affichent, **Then** la présentation de l'Ultra rare s'affiche quand même.
4. **Given** un Légendaire déjà possédé, **When** il est présenté, **Then** la présentation indique ses exemplaires au lieu de « Nouveau ! ».
5. **Given** un tirage dont le meilleur résultat est Rare, **When** les cartes s'affichent, **Then** aucune présentation plein écran n'apparaît.

---

### User Story 3 - Parcourir une collection illustrée (Priority: P2)

Dans la collection, chaque élément possédé montre son portrait ; chaque élément
manquant montre sa silhouette sombre, reconnaissable sans dévoiler le dessin.

**Why this priority**: la collection devient une galerie qui donne envie de la
compléter ; mais les cartes (US1) portent déjà l'essentiel.

**Independent Test**: dans une partie où l'on possède 3 éléments, la collection montre
3 portraits et 17 silhouettes, aux mêmes places et avec les mêmes textes qu'avant.

**Acceptance Scenarios**:

1. **Given** un élément possédé, **When** la collection s'ouvre, **Then** sa case montre son portrait, son nom, son type et ses exemplaires.
2. **Given** un élément manquant, **When** la collection s'ouvre, **Then** sa case montre sa silhouette sombre, son nom et son coût en éclats, et reste utilisable pour l'échange comme avant.

---

### User Story 4 - Un écran de tirage habillé (Priority: P2)

L'écran de tirage a un fond illustré (ciel de rêve pastel, l'orbe sur un socle),
l'orbe devient une sphère de cristal détaillée, les pièces, éclats, son et flèches
ont des icônes illustrées, les raretés des emblèmes, les cartes du ×10 un dos
illustré, et la bannière d'une vedette montre son portrait.

**Why this priority**: c'est ce que le joueur voit en permanence, mais le jeu reste
jouable sans.

**Independent Test**: l'écran de tirage, la fenêtre des taux, la collection et le
retournement du ×10 montrent les nouveaux visuels ; tous les textes restent lisibles et
tous les boutons répondent aux mêmes endroits qu'avant.

**Acceptance Scenarios**:

1. **Given** l'écran de tirage, **When** il s'affiche, **Then** le fond illustré, l'orbe détaillée et les icônes apparaissent, et chaque texte posé sur le fond reste lisible.
2. **Given** la bannière d'une vedette, **When** elle est active, **Then** le portrait de la vedette apparaît dans le bandeau de la bannière.
3. **Given** la fenêtre des taux ou le résumé de la collection, **When** ils s'affichent, **Then** chaque rareté est désignée par son emblème au lieu d'une pastille unie.
4. **Given** un ×10 regardé, **When** les cartes arrivent face cachée, **Then** elles montrent le dos illustré.

---

### User Story 5 - Un écran de tirage vivant (Priority: P3)

*Révision du 2026-11-09.* Au repos, l'écran respire : l'orbe lévite et son éclat pulse,
des lueurs montent dans le ciel, le bouton d'un tirage payable est entouré d'un halo.
Quand un montant change, il défile ; quand le joueur change de bannière, le bandeau
glisse ; une fenêtre apparaît en fondu. Rien de cela ne change les règles ni ne retarde
un appui.

**Why this priority**: l'utilisateur trouve l'écran trop statique ; le jeu reste
complet sans ces animations.

**Independent Test**: écran ouvert, sans rien toucher : deux images prises à 1 s
d'écart diffèrent autour de l'orbe, et tous les parcours d'avant passent à l'identique ;
avec « réduire les animations » demandé par le système, les deux images sont identiques.

**Acceptance Scenarios**:

1. **Given** l'écran de tirage au repos, **When** le joueur ne touche rien, **Then** l'orbe monte et descend lentement de quelques pixels, son éclat pulse et des lueurs montent dans le ciel, derrière l'interface.
2. **Given** assez de pièces pour un tirage, **When** l'écran est au repos, **Then** le bouton de ce tirage porte un halo qui respire ; un tirage que le joueur ne peut pas payer n'en a pas.
3. **Given** un tirage ou un échange, **When** le solde ou les éclats changent, **Then** le montant défile de l'ancienne valeur à la nouvelle et son icône rebondit ; la valeur finale est exacte.
4. **Given** l'écran de tirage, **When** le joueur touche ◀ ou ▶, **Then** le contenu du bandeau entre en glissant depuis le côté de la flèche touchée.
5. **Given** l'écran de tirage, **When** une fenêtre s'ouvre (taux, collection, fiche, confirmation), **Then** elle apparaît en fondu et ses boutons répondent dès l'ouverture.
6. **Given** l'orbe en pleine lévitation, **When** un tirage commence, **Then** la révélation part de l'orbe à sa position de repos ; l'ambiance reprend au retour sur l'écran.
7. **Given** le système de l'appareil demande de réduire les animations, **When** l'écran s'affiche, **Then** il reste fixe et les changements (montants, bandeau, fenêtres) sont instantanés ; la révélation (004) est inchangée.

---

### Edge Cases

- **Illustration indisponible** (fichier manquant ou illisible) : l'élément s'affiche comme avant (pastille de sa rareté et initiale), le jeu continue sans erreur.
- **Noms longs** (« Capitaine Tartine », « Cosmo l'Infini ») sur une carte ×10 : le nom passe sur deux lignes sans chevaucher le buste ni les textes du dessous.
- **Plusieurs Légendaires / Ultra rares dans un ×10** : une présentation par élément, dans l'ordre de retournement ; le même élément tiré deux fois est présenté deux fois (le second comme déjà possédé).
- **Présentation et échange d'éclats** : un échange n'est pas un tirage ; sa carte s'affiche directement, sans présentation plein écran (comme l'animation, 004).
- **Appui pendant l'entrée de la présentation** : l'appui ne la ferme qu'une fois l'illustration entrée (un double appui sur « Passer » ne doit pas la faire disparaître à l'insu du joueur).
- **Écran agrandi ou haute densité** : les illustrations et les textes restent nets, sans flou d'agrandissement.
- **Collection complète** : 20 portraits, aucune silhouette.
- **Montant qui change pendant qu'il défile** (révision du 2026-11-09) : le défilement repart de la valeur affichée vers la nouvelle ; la valeur finale est celle de la partie.
- **Onglet masqué puis rouvert** : l'ambiance reprend où elle en était, sans rattrapage accéléré.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Chacun des 20 éléments du catalogue MUST avoir sa propre illustration, dans le style commun de la [charte](../../docs/art/charte.md) (cartoon détaillé, contour encre, ombrage, lumière en haut à gauche) ; la richesse de l'illustration MUST croître avec la rareté.
- **FR-002**: La carte du ×1 MUST montrer l'illustration entière de l'élément ; chaque carte du ×10 MUST montrer son buste. Les informations de 001–002 (nom, type, rareté en texte et en couleur, « Nouveau ! » ou exemplaires possédés, éclats, « Garanti ! ») MUST rester affichées et lisibles.
- **FR-003**: Chaque Légendaire et Ultra rare obtenu par un tirage MUST être présenté en plein écran avant l'écran de résultats : illustration en grand, nom, rareté, phrase de présentation, « Nouveau ! » ou exemplaires. Au ×1, après l'animation (004) ; au ×10, après le retournement, dans l'ordre de retournement. Un appui passe à la présentation suivante, puis aux résultats. Passer l'animation (004, FR-006) MUST NOT supprimer ces présentations.
- **FR-004**: Dans la collection, un élément possédé MUST montrer son portrait ; un élément manquant MUST montrer sa silhouette sombre (forme reconnaissable, aucun détail ni couleur de l'illustration). Textes, places, coûts et échange restent ceux de 003.
- **FR-005**: La bannière d'une vedette (006) MUST montrer le portrait de la vedette.
- **FR-006**: L'écran de tirage MUST avoir un fond illustré (ciel de rêve pastel, l'orbe posée sur un socle), une orbe illustrée, des icônes illustrées pour les pièces, les éclats, le son et les flèches de bannière ; les cartes du ×10 face cachée MUST montrer un dos illustré.
- **FR-007**: Chaque rareté MUST avoir un emblème qui la distingue par la forme autant que par la couleur ; il remplace la pastille unie dans la fenêtre des taux, le résumé de la collection et sur les cartes.
- **FR-008**: Tout texte posé directement sur le fond illustré MUST garder un contraste d'au moins 4,5:1 avec ce qui est derrière lui.
- **FR-009**: Illustrations et textes MUST rester nets quand le jeu est agrandi pour remplir l'écran ou affiché sur un écran haute densité.
- **FR-010**: Si une illustration ne peut pas être affichée, l'élément MUST s'afficher comme avant (pastille et initiale) sans interrompre le jeu.
- **FR-011**: Les visuels MUST être des créations propres au projet (aucune image d'un tiers) et respecter la charte ; un contrôle automatique MUST refuser un visuel hors format.
- **FR-012**: Cette feature MUST NOT changer les règles : taux, tirage, pity, éclats, bannières et sauvegarde restent ceux de 001–006 ; les zones d'appui restent aux mêmes places (sauf la présentation plein écran, nouvelle).
- **FR-013**: *(Révision du 2026-11-09.)* Au repos, l'écran de tirage MUST montrer une ambiance animée en boucle : orbe en lévitation lente (quelques pixels, cycle de 2 à 4 s) dont l'éclat pulse, et lueurs qui montent dans le ciel, derrière l'interface.
- **FR-014**: Un bouton de tirage que le joueur peut payer MUST porter un halo qui respire ; un bouton qu'il ne peut pas payer MUST NOT en porter.
- **FR-015**: Quand le solde ou les éclats changent, le montant affiché MUST défiler jusqu'à la nouvelle valeur en 0,6 s au plus et son icône rebondir ; à la fin, la valeur affichée MUST être exactement celle de la partie.
- **FR-016**: Changer de bannière MUST faire entrer le contenu du bandeau en glissant depuis le côté de la flèche touchée, en 0,25 s au plus.
- **FR-017**: Une fenêtre MUST apparaître en fondu en 0,2 s au plus ; ses boutons MUST répondre dès l'ouverture.
- **FR-018**: Ces animations MUST NOT retarder ni empêcher un appui, déplacer une zone qu'on touche, ni consommer le hasard du tirage ; la révélation MUST reprendre l'orbe à sa position de repos.
- **FR-019**: Si le système de l'appareil demande de réduire les animations, FR-013 à FR-017 MUST céder la place à un écran fixe et à des changements instantanés.

### Key Entities

- **Illustration** : le dessin d'un élément du catalogue, avec deux cadrages : le **buste** (cartes ×10) et la **tête** (collection, bannière). Sa silhouette se déduit du dessin.
- **Visuels d'interface** : fond de l'écran de tirage, orbe, dos de carte, icônes, emblèmes de rareté.
- **Présentation** : écran plein qui met en scène un Légendaire ou un Ultra rare obtenu ; aucune donnée sauvegardée.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 20 éléments sur 20 ont une illustration conforme à la charte (contrôle automatique sans erreur).
- **SC-002**: 100 % des Légendaires et Ultra rares obtenus par un tirage sont présentés en plein écran, et aucun élément de rareté inférieure.
- **SC-003**: Sur l'écran de référence (360 × 640), chaque texte posé sur le fond garde un contraste ≥ 4,5:1.
- **SC-004**: L'écran de tirage est prêt à jouer en moins de 3 s après l'ouverture du jeu (illustrations chargées comprises), mesuré sur le jeu construit dans l'environnement des tests de bout en bout.
- **SC-005**: Pour une même suite de tirages, solde, collection, pity, éclats et sauvegarde sont identiques à ceux d'avant la feature.
- **SC-006**: Affiché en double densité, un contour d'illustration reste net (pas d'agrandissement d'une image plus petite que son affichage).
- **SC-007**: *(Révision du 2026-11-09.)* Au repos, deux images de l'écran prises à 1 s d'écart diffèrent autour de l'orbe ; avec « réduire les animations », elles sont identiques.
- **SC-008**: Tous les parcours de bout en bout d'avant la révision passent sans changement de leurs attentes, et l'écran reste prêt en moins de 3 s (SC-004).

## Assumptions

- Le style est celui demandé par l'utilisateur : cartoon, gros contour encre, mais détaillé ; la charte (`docs/art/charte.md`) le fixe pour tous les visuels.
- Les illustrations sont dessinées pour le projet (vectoriel) ; l'univers et la DA restent provisoires (constitution VI) : elles pourront être refaites avec l'univers définitif.
- Les illustrations sont fixes : c'est le jeu qui les anime (entrée, rebond, scintillement, lévitation de l'orbe).
- « Réduire les animations » est le réglage d'accessibilité du système de l'appareil ; le jeu n'ajoute pas son propre réglage (révision du 2026-11-09).
- La présentation plein écran ne concerne que les tirages ; un échange d'éclats reste sans mise en scène (004, hypothèse conservée).
- Pas de galerie séparée ni de fiche détaillée d'un élément (hors périmètre de 003, inchangé).
- Pas de nom de jeu ni d'écran titre : le nom du jeu reste à choisir (roadmap).
