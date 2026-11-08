# Feature Specification: Collection

**Feature Branch**: `feat/003-collection`

**Created**: 2026-10-20

**Status**: Draft

**Input**: User description: "Collection (feature 003, roadmap) : parcourir les personnages et créatures obtenus et voir ceux qui manquent. Hors périmètre : tri avancé, fiche détaillée."

## Contexte

Après 001 et 002, le joueur ne voit ce qu'il possède qu'à travers un compteur
« N / 20 » et les cartes de résultat, qui disparaissent une fois fermées. Les
éléments manquants n'apparaissent que dans la liste d'échange d'éclats (002), qui
montre leur nom et leur coût. Cette feature donne un écran où le joueur voit d'un
coup d'œil **tout le catalogue** : ce qu'il a (et en combien d'exemplaires) et ce qui
lui manque.

## Clarifications

### Session 2026-10-20

- Q: Comment apparaît un élément que le joueur ne possède pas encore ? → A: Grisé, nom visible (cohérent avec l'échange d'éclats).
- Q: Collection et échange d'éclats : deux écrans ou un seul ? → A: Un seul : un appui sur un élément manquant de la collection propose l'échange ; le bouton « Échanger des éclats » devient « Collection ».

### Révision du 2026-11-08 (retours de l'utilisateur en jeu)

- Q: Où afficher le nombre d'éléments possédés (« N / 20 ») ? → A: Uniquement dans la collection ; l'écran de tirage ne l'affiche plus (FR-013, remplace ce point de 001 FR-017).
- Q: Que fait un appui sur un élément possédé ? → A: Il le montre en grand, dans sa fiche (User Story 5, FR-014) ; avant, il ne se passait rien.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Voir ce que je possède (Priority: P1)

Depuis l'écran de tirage, le joueur ouvre sa collection et voit chaque élément
obtenu avec son nom, son type, sa rareté et son nombre d'exemplaires.

**Why this priority**: c'est la raison d'être de l'écran ; sans elle le joueur ne
peut pas relire ce qu'il a tiré.

**Independent Test**: après quelques tirages, chaque élément possédé apparaît dans la
collection avec le bon nombre d'exemplaires.

**Acceptance Scenarios**:

1. **Given** un joueur qui possède 3 exemplaires de Gribouille, **When** il ouvre la collection, **Then** Gribouille y figure avec son type, sa rareté et « ×3 ».
2. **Given** un joueur qui vient de tirer un nouvel élément, **When** il ouvre la collection, **Then** l'élément y figure comme possédé.
3. **Given** la collection ouverte, **When** le joueur la ferme, **Then** il revient à l'écran de tirage, dans le même état.

---

### User Story 2 - Voir ce qui me manque (Priority: P1)

Dans la même collection, le joueur distingue immédiatement les éléments qu'il ne
possède pas encore.

**Why this priority**: c'est l'autre moitié de la roadmap (« voir ceux qui lui
manquent ») ; c'est ce qui donne envie de tirer encore.

**Independent Test**: dans une partie neuve, les 20 éléments apparaissent comme
manquants ; après un tirage, un seul ne l'est plus.

**Acceptance Scenarios**:

1. **Given** une partie neuve, **When** le joueur ouvre la collection, **Then** les 20 éléments apparaissent comme manquants.
2. **Given** un élément manquant, **When** le joueur le regarde, **Then** il le distingue d'un élément possédé sans lire de texte (aspect visuel différent) — FR-004 précise ce qui reste visible.
3. **Given** une collection complète, **When** le joueur l'ouvre, **Then** aucun élément n'apparaît comme manquant et l'écran le signale (« Collection complète ! »).

---

### User Story 3 - Mesurer sa progression par rareté (Priority: P2)

En haut de la collection, le joueur lit combien il possède d'éléments au total et
dans chaque rareté.

**Why this priority**: utile pour savoir où il en est, mais l'écran est déjà
exploitable sans ce résumé.

**Independent Test**: les compteurs par rareté correspondent au nombre d'éléments
possédés de chaque rareté et leur somme au total « N / 20 » affiché en haut de la
collection, seul endroit où il apparaît (FR-013).

**Acceptance Scenarios**:

1. **Given** un joueur qui possède 4 Communs sur 6 et 1 Légendaire sur 3, **When** il ouvre la collection, **Then** il lit « 4 / 6 » pour Commun et « 1 / 3 » pour Légendaire, et le total.

---

### User Story 4 - Obtenir un manquant depuis la collection (Priority: P1)

Dans la collection, le joueur touche un élément manquant qu'il peut se payer en
éclats et l'obtient après confirmation, sans passer par un autre écran.

**Why this priority**: la fusion avec l'échange (clarification) fait de la collection
le seul endroit où dépenser ses éclats ; sans cette story, l'échange de 002 disparaît.

**Independent Test**: avec 150 éclats et un Légendaire manquant, collection → appui
sur l'élément → confirmer : il devient possédé, 0 éclat, en 3 appuis.

**Acceptance Scenarios**:

1. **Given** un manquant dont le coût est couvert par le solde d'éclats, **When** le joueur le touche puis confirme, **Then** il devient possédé et le solde baisse du coût (règles de 002 inchangées).
2. **Given** un manquant trop cher, **When** le joueur le touche, **Then** rien ne se passe et son coût apparaît comme inaccessible.
3. **Given** la confirmation d'échange, **When** le joueur annule, **Then** il revient à la collection sans rien dépenser.
4. **Given** un élément possédé, **When** le joueur le touche, **Then** aucun échange n'est proposé : sa fiche s'ouvre (User Story 5).

---

### User Story 5 - Revoir un élément possédé (Priority: P2)

*Révision du 2026-11-08.* Dans la collection, le joueur touche un élément qu'il
possède et le voit en grand : son illustration, son nom, son type, sa rareté, ses
exemplaires et sa phrase de présentation. « Retour » le ramène à la collection.

**Why this priority**: la case ne montre qu'un petit portrait ; le joueur veut revoir
ce qu'il a obtenu (retour de l'utilisateur en jeu). La collection reste utilisable
sans la fiche.

**Independent Test**: avec Gribouille ×3, Collection → Gribouille : sa fiche montre son
illustration, « Possédé ×3 » et sa phrase ; Retour → la collection, rien de modifié.

**Acceptance Scenarios**:

1. **Given** un élément possédé, **When** le joueur le touche dans la collection, **Then** sa fiche s'affiche : illustration en grand, nom, type, rareté, nombre d'exemplaires et phrase de présentation.
2. **Given** une fiche ouverte, **When** le joueur touche « Retour », **Then** il revient à la collection, dans le même état.
3. **Given** un élément manquant, **When** le joueur le touche, **Then** aucune fiche ne s'ouvre (l'échange, ou rien, comme en User Story 4).

---

### Edge Cases

- **Partie neuve** : tout est manquant ; l'écran reste lisible et n'apparaît pas « vide ».
- **Collection complète** : message de félicitation, aucun élément manquant.
- **Nombreux exemplaires** (×99 et plus) : le nombre tient dans la case.
- **Noms longs** (« Capitaine Tartine », « Cosmo l'Infini ») : aucun débordement.
- **Ouverture pendant une autre fenêtre** : impossible ; une seule fenêtre à la fois, comme les autres écrans.
- **Fiche d'un élément dont l'illustration manque** : pastille et initiale à sa place (007, FR-010), le reste de la fiche inchangé, sans interrompre le jeu.
- **Fiche d'un élément possédé en grand nombre** (×99 et plus) : le nombre tient dans la fiche.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: L'écran de tirage MUST offrir un accès à la collection, toujours disponible.
- **FR-002**: La collection MUST présenter les **20 éléments** du catalogue sur un seul écran, sans défilement, regroupés par rareté de la plus haute à la plus basse, puis dans l'ordre du catalogue.
- **FR-003**: Un élément possédé MUST afficher son nom, son type (personnage ou créature), sa rareté et son nombre d'exemplaires. La rareté est portée par la couleur de la pastille, dont le résumé (FR-006) donne la légende.
- **FR-004**: Un élément manquant MUST apparaître **grisé, nom visible**, avec son coût en éclats ; le coût est mis en évidence quand le solde le couvre, estompé sinon.
- **FR-005**: Possédé et manquant MUST se distinguer sans lire de texte (couleur, contraste ou forme).
- **FR-006**: La collection MUST afficher le total possédé et, pour chaque rareté, « possédés / total de la rareté ».
- **FR-007**: Une collection complète MUST afficher « Collection complète ! ».
- **FR-008**: La collection MUST **remplacer la liste d'échange d'éclats** de 002 : un appui sur un manquant abordable ouvre la confirmation d'échange (« Échanger X contre N éclats ? ») ; Annuler ramène à la collection ; confirmer applique l'échange de 002 puis montre la carte « Nouveau ! ». Le bouton « Échanger des éclats » de l'écran de tirage devient « Collection ».
- **FR-011**: Un appui sur un manquant trop cher MUST ne rien faire. *(Révision du 2026-11-08 : un appui sur un possédé ne fait plus rien, il ouvre sa fiche, FR-014.)*
- **FR-012**: La collection MUST afficher le solde d'éclats courant.
- **FR-009**: Ouvrir, parcourir ou fermer la collection ou une fiche MUST ne rien modifier de la progression ; seul un échange confirmé sauvegarde.
- **FR-010**: La collection MUST refléter l'état courant : un élément obtenu par tirage ou par échange y apparaît dès la réouverture.
- **FR-013**: Le nombre d'éléments différents possédés sur le total (« N / 20 ») MUST n'apparaître que dans la collection (FR-006) ; l'écran de tirage ne l'affiche plus.
- **FR-014**: Un appui sur un élément possédé MUST ouvrir sa **fiche** : illustration en grand (007), nom, type, rareté, nombre d'exemplaires et phrase de présentation ; « Retour » MUST ramener à la collection.

### Key Entities

- **Entrée de collection** : un élément du catalogue, possédé ou non, avec son nombre d'exemplaires (0 si manquant).
- **Résumé par rareté** : pour chaque rareté, possédés / total.
- **Fiche** : la vue en grand d'un élément possédé ; rien de sauvegardé.

Aucune donnée nouvelle à sauvegarder : tout dérive de la progression existante.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Depuis l'écran de tirage, le joueur ouvre sa collection en 1 appui.
- **SC-002**: Les 20 éléments sont visibles en même temps, sans défilement, sur l'écran de référence (portrait 360 × 640).
- **SC-003**: Pour 100 % des éléments, l'état affiché (possédé avec N exemplaires, ou manquant) correspond à la progression sauvegardée.
- **SC-004**: La somme des compteurs par rareté est égale au total « N / 20 » de la collection dans 100 % des cas.
- **SC-005**: Obtenir un manquant abordable depuis l'écran de tirage prend au plus 3 appuis (Collection → élément → Échanger), comme en 002.
- **SC-006**: Depuis la collection, voir un élément possédé en grand prend 1 appui, et revenir à la collection 1 appui.

## Assumptions

- Fiche détaillée : hors périmètre au départ, ajoutée par la révision du 2026-11-08 (FR-014). Elle ne fait que montrer : aucune action dessus, pas de passage d'une fiche à l'autre.
- Pas de tri ni de filtre au choix du joueur : l'ordre est fixe (rareté décroissante puis catalogue), celui de l'ancienne liste d'échange.
- Les règles de l'échange (coûts, refus, sans effet sur le pity ni les pièces) sont celles de 002 ; seul l'écran qui y donne accès change. L'exigence 002 FR-012 (« ouvrir la liste des éléments non possédés ») est désormais remplie par la collection.
- Pas de nouvelle donnée sauvegardée ; le format de sauvegarde v2 est inchangé.
- Les éléments restent représentés par une pastille colorée et leur initiale (DA provisoire).
