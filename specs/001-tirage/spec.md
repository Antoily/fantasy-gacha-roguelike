# Feature Specification: Tirage

**Feature Branch**: `feat/001-tirage`

**Created**: 2026-10-19

**Status**: Draft

**Input**: User description: "Le gacha seul : dépenser une monnaie pour un tirage ×1 ou ×10, voir les taux par rareté, voir ce qu'on a obtenu, progression sauvegardée. On collectionne des personnages et des créatures. Raretés : Commun, Peu commun, Rare, Légendaire, Ultra rare. La monnaie vient d'un stock de départ fixe. Le ×10 coûte moins cher que dix ×1 et garantit un Rare."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Faire un tirage simple (Priority: P1)

Le joueur ouvre le jeu, voit combien de monnaie il possède, et lance un tirage ×1. Il
dépense le coût d'un tirage et découvre ce qu'il a obtenu : un personnage ou une
créature, avec son nom, sa rareté et s'il est nouveau ou déjà possédé.

**Why this priority**: c'est le mécanisme lui-même. Sans lui, rien d'autre n'a de sens.

**Independent Test**: avec la monnaie de départ, un tirage ×1 débite le coût, affiche
un résultat et ajoute l'élément obtenu à ce que possède le joueur.

**Acceptance Scenarios**:

1. **Given** un joueur avec assez de monnaie pour un tirage, **When** il lance un tirage ×1, **Then** son solde baisse exactement du coût d'un tirage ×1 et un résultat s'affiche.
2. **Given** un tirage qui donne un élément jamais obtenu, **When** le résultat s'affiche, **Then** il est signalé comme « Nouveau ».
3. **Given** un tirage qui donne un élément déjà possédé, **When** le résultat s'affiche, **Then** il est signalé comme déjà possédé et le nombre d'exemplaires de cet élément augmente de 1.
4. **Given** un joueur dont le solde est inférieur au coût d'un tirage ×1, **When** il regarde l'écran de tirage, **Then** le tirage ×1 est indisponible et un message explique qu'il manque de la monnaie.

---

### User Story 2 - Faire un tirage ×10 avec garantie (Priority: P1)

Le joueur lance un tirage ×10, moins cher que dix tirages ×1. Il obtient dix
résultats, dont au moins un de rareté Rare ou supérieure.

**Why this priority**: c'est la façon principale de tirer dans un gacha, et la
garantie fait partie de la promesse faite au joueur dès cette première version.

**Independent Test**: un tirage ×10 débite le coût ×10, affiche dix résultats et
contient toujours au moins un Rare ou mieux, quel que soit le hasard.

**Acceptance Scenarios**:

1. **Given** un joueur avec assez de monnaie pour un ×10, **When** il lance un tirage ×10, **Then** son solde baisse exactement du coût ×10 et dix résultats s'affichent ensemble.
2. **Given** n'importe quel tirage ×10, **When** les dix résultats sont connus, **Then** au moins l'un d'eux est de rareté Rare, Légendaire ou Ultra rare.
3. **Given** un tirage ×10 contenant deux fois le même élément jamais obtenu, **When** les résultats s'affichent, **Then** le premier est signalé « Nouveau », le second comme déjà possédé, et le joueur en possède deux exemplaires.
4. **Given** un joueur qui peut payer un ×1 mais pas un ×10, **When** il regarde l'écran de tirage, **Then** seul le ×10 est indisponible.

---

### User Story 3 - Consulter les taux (Priority: P2)

Avant de tirer, le joueur peut consulter la probabilité de chaque rareté et la règle
de garantie du ×10.

**Why this priority**: la transparence des taux est un principe du projet
(constitution, principe IV), mais on peut tirer sans l'avoir consultée.

**Independent Test**: l'écran des taux liste les cinq raretés avec leur probabilité,
dont la somme fait 100 %, et mentionne la garantie du ×10. Sur un grand nombre de
tirages ×1, les fréquences observées correspondent aux taux affichés.

**Acceptance Scenarios**:

1. **Given** l'écran de tirage, **When** le joueur ouvre les taux, **Then** il voit les cinq raretés dans l'ordre, chacune avec son pourcentage, et la mention « ×10 : au moins un Rare ou mieux garanti ».
2. **Given** les taux affichés, **When** on simule 100 000 tirages ×1, **Then** la fréquence de chaque rareté s'écarte de moins d'un point de pourcentage du taux affiché.

---

### User Story 4 - Retrouver sa progression (Priority: P2)

Le joueur ferme le jeu et le rouvre plus tard : son solde, les éléments obtenus et
leur nombre d'exemplaires sont intacts. L'écran de tirage indique combien
d'éléments différents il possède sur le total.

**Why this priority**: sans sauvegarde, la monnaie de départ se recharge à chaque
ouverture et le tirage perd tout enjeu.

**Independent Test**: tirer, fermer, rouvrir : solde et possessions sont identiques
à ce qu'ils étaient avant la fermeture.

**Acceptance Scenarios**:

1. **Given** un joueur qui a effectué des tirages, **When** il ferme puis rouvre le jeu, **Then** son solde et ses possessions sont identiques.
2. **Given** un premier lancement, **When** le jeu s'ouvre, **Then** le joueur dispose du stock de départ et ne possède aucun élément.
3. **Given** un joueur qui possède 7 éléments différents sur 20, **When** il regarde l'écran de tirage, **Then** il lit « 7 / 20 ».

---

### User Story 5 - Recommencer de zéro (Priority: P3)

Le joueur peut effacer sa progression pour retrouver le stock de départ et une
collection vide, après confirmation.

**Why this priority**: la monnaie ne vient que du stock de départ ; une fois celui-ci
dépensé, recommencer est le seul moyen de tirer à nouveau tant que le gameplay
n'existe pas.

**Independent Test**: après confirmation, solde = stock de départ et aucun élément
possédé ; une annulation ne change rien.

**Acceptance Scenarios**:

1. **Given** un joueur avec une progression, **When** il demande à recommencer et confirme, **Then** il retrouve le stock de départ et aucun élément.
2. **Given** la demande de confirmation, **When** le joueur annule, **Then** rien n'est modifié.

---

### Edge Cases

- **Solde exactement égal au coût** : le tirage est autorisé et le solde tombe à 0.
- **Appuis répétés rapides** sur un bouton de tirage : un seul tirage est effectué et débité par appui pris en compte ; aucun tirage ne part pendant l'affichage d'un résultat.
- **Fermeture du jeu juste après un tirage** : la monnaie dépensée et les éléments obtenus sont tous deux sauvegardés, ou aucun des deux.
- **Sauvegarde illisible ou corrompue** : le jeu démarre comme un premier lancement et prévient le joueur que sa progression n'a pas pu être relue.
- **Sauvegarde d'une version antérieure du jeu** : elle est reprise sans perte.
- **×10 sans aucun Rare ou mieux tiré naturellement** : la garantie s'applique (voir FR-007).
- **Tous les éléments possédés** : le tirage reste possible ; tous les résultats sont des doublons.

## Requirements *(mandatory)*

### Functional Requirements

**Contenu**

- **FR-001**: Le jeu MUST proposer un catalogue de 20 éléments à collectionner, chacun étant soit un **personnage**, soit une **créature**, avec un nom et une rareté.
- **FR-002**: Les raretés MUST être, de la plus faible à la plus forte : **Commun, Peu commun, Rare, Légendaire, Ultra rare**. Chaque rareté a une couleur distinctive.
- **FR-003**: Chaque rareté MUST contenir au moins un personnage et au moins une créature ; la répartition du catalogue est 6 Communs, 5 Peu communs, 4 Rares, 3 Légendaires, 2 Ultra rares.
- **FR-004**: Personnages et créatures MUST être tirés [NEEDS CLARIFICATION: dans un même tirage commun, ou chacun dans son propre tirage (deux boutons, deux catalogues) ?].

**Tirage**

- **FR-005**: Un tirage MUST d'abord déterminer une rareté selon les taux en vigueur, puis un élément de cette rareté, chaque élément d'une même rareté ayant la même chance.
- **FR-006**: Les taux par rareté MUST être [NEEDS CLARIFICATION: valeurs à fixer — proposition : Commun 55 %, Peu commun 28 %, Rare 12 %, Légendaire 4 %, Ultra rare 1 %].
- **FR-007**: Un tirage ×10 MUST contenir au moins un élément Rare ou mieux. Si les neuf premiers résultats n'en contiennent aucun, le dixième est tiré parmi Rare, Légendaire et Ultra rare uniquement, en gardant entre elles les proportions de leurs taux.
- **FR-008**: Les coûts et le stock de départ MUST être [NEEDS CLARIFICATION: valeurs à fixer — proposition : ×1 = 100, ×10 = 900, stock de départ = 3 000, soit 30 à 33 tirages].
- **FR-009**: Le coût d'un ×10 MUST être strictement inférieur à dix fois le coût d'un ×1.
- **FR-010**: Un tirage MUST être refusé si le solde est inférieur à son coût ; aucun débit n'a lieu.
- **FR-011**: Le débit de la monnaie et l'ajout des éléments obtenus MUST être indissociables : l'un n'existe jamais sans l'autre, y compris si le jeu est fermé juste après.

**Résultats**

- **FR-012**: Chaque résultat MUST afficher le nom, le type (personnage ou créature), la rareté (texte et couleur) et la mention « Nouveau » ou « Déjà possédé ».
- **FR-013**: Les dix résultats d'un ×10 MUST être visibles ensemble sur un même écran.
- **FR-014**: Obtenir un élément déjà possédé MUST augmenter son nombre d'exemplaires de 1, sans autre effet dans cette version.

**Transparence**

- **FR-015**: Le joueur MUST pouvoir consulter, depuis l'écran de tirage, le taux de chaque rareté et la règle de garantie du ×10.
- **FR-016**: Les taux affichés MUST être exactement ceux qu'applique le tirage : ils proviennent de la même définition.

**Progression**

- **FR-017**: L'écran de tirage MUST afficher en permanence le solde et le nombre d'éléments différents possédés sur le total du catalogue.
- **FR-018**: Le solde, les éléments possédés et leur nombre d'exemplaires MUST être conservés entre deux sessions, sur le même appareil.
- **FR-019**: Le joueur MUST pouvoir effacer sa progression après une confirmation explicite ; il retrouve alors le stock de départ et une collection vide.

### Key Entities

- **Élément** : ce que l'on collectionne. Identifiant, nom, type (personnage ou créature), rareté.
- **Rareté** : l'un des cinq paliers, avec son rang, sa couleur et son taux de tirage.
- **Catalogue** : l'ensemble des 20 éléments tirables.
- **Tirage** : une demande ×1 ou ×10 ; son coût ; la liste ordonnée de ses résultats.
- **Résultat** : un élément obtenu, et s'il était nouveau au moment du tirage.
- **Progression du joueur** : solde de monnaie, et pour chaque élément possédé son nombre d'exemplaires.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Depuis le lancement du jeu, un nouveau joueur voit le résultat de son premier tirage en moins de 10 secondes et en au plus 2 appuis.
- **SC-002**: Sur 100 000 tirages ×1 simulés, la fréquence observée de chaque rareté s'écarte de moins d'un point de pourcentage du taux affiché.
- **SC-003**: Sur 10 000 tirages ×10 simulés, 100 % contiennent au moins un Rare ou mieux.
- **SC-004**: Après fermeture et réouverture, 100 % des tirages effectués sont retrouvés (solde et possessions), sans écart d'une seule unité de monnaie.
- **SC-005**: Un joueur peut, sans aide, dire quelle est la probabilité d'obtenir un Ultra rare en moins de 15 secondes depuis l'écran de tirage.

## Assumptions

- Un seul joueur par appareil, sans compte ni connexion (ADR 0003).
- La monnaie a un nom et une icône provisoires ; ils seront fixés avec l'univers.
- Les 20 éléments ont des noms provisoires et une représentation simple (forme ou pastille colorée selon la rareté, initiale ou silhouette) ; les visuels réels viendront avec la DA.
- La rareté Ultra rare est au-dessus de Légendaire, dans l'ordre donné par l'utilisateur.
- Le résultat s'affiche directement, sans animation de suspense : la mise en scène est la feature 004.
- Pas de pity : le compteur de garantie sur plusieurs tirages et la valeur d'un doublon sont la feature 002. La garantie du ×10 ne porte que sur la salve en cours.
- Pas d'écran de collection : seul le compteur « possédés / total » existe ici ; la liste détaillée est la feature 003.
- Les éléments n'ont pas encore d'utilité en jeu : il n'y a ni statistiques ni compétences.
- Une fois le stock dépensé, aucune monnaie ne s'ajoute : seul « Recommencer » permet de tirer à nouveau.
