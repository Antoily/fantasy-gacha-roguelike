# Feature Specification: Bannières

**Feature Branch**: `feat/006-bannieres`

**Created**: 2026-10-26

**Status**: Draft

**Input**: User description: "Bannières (roadmap, « Plus tard ») : taux augmentés sur certains personnages. Choisie par l'utilisateur comme feature 006."

## Contexte

Aujourd'hui il n'existe qu'une façon de tirer : chaque élément d'une rareté a autant de
chances que les autres. Un joueur qui vise un Légendaire ou un Ultra rare précis ne
peut que l'attendre, ou l'échanger contre des éclats. Cette feature ajoute des
**bannières** : le joueur choisit sur quoi il tire, et une bannière **met en avant**
un élément de haute rareté, avec une chance accrue et un filet après un échec.

## Clarifications

### Session 2026-10-26

- Q: Comment se présentent les bannières ? → A: Au choix et permanentes : la bannière standard (le tirage actuel) plus une bannière par Légendaire et par Ultra rare (5), qui le met en avant. Le joueur choisit avant de tirer ; aucune limite de temps.
- Q: Sur sa bannière, quelle chance a la vedette quand sa rareté tombe ? → A: 50/50 avec garantie : une chance sur deux que ce soit la vedette ; après un échec, la prochaine fois que cette rareté tombe sur cette bannière, c'est la vedette.
- Q: Que deviennent les compteurs quand on change de bannière ? → A: Le compteur de garantie des 40 tirages est commun à toutes les bannières ; la garantie vedette gagnée après un 50/50 raté reste attachée à sa bannière.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Choisir sa bannière (Priority: P1)

Depuis l'écran de tirage, le joueur passe d'une bannière à l'autre, voit laquelle est
active et quel élément elle met en avant, puis tire sur celle-ci.

**Why this priority**: sans choix de bannière, il n'y a pas de feature ; c'est aussi
ce qui garde le tirage actuel accessible (bannière standard).

**Independent Test**: changer de bannière change ce qu'affiche l'écran, et un tirage
part bien sur la bannière affichée.

**Acceptance Scenarios**:

1. **Given** un premier lancement, **When** l'écran de tirage s'affiche, **Then** la bannière standard est active et le joueur voit qu'il peut en changer.
2. **Given** l'écran de tirage, **When** le joueur passe à la bannière suivante, **Then** l'écran affiche son nom et l'élément mis en avant (nom, rareté, s'il est déjà possédé).
3. **Given** la dernière bannière, **When** le joueur passe à la suivante, **Then** il revient à la première (les bannières tournent en boucle, dans les deux sens).
4. **Given** une bannière vedette active, **When** le joueur recharge le jeu, **Then** la même bannière est active.
5. **Given** une fenêtre ouverte (révélation, résultats, collection…), **When** le joueur appuie là où se trouvent les flèches, **Then** la bannière ne change pas.

---

### User Story 2 - Tirer sur une bannière vedette (Priority: P1)

Sur une bannière vedette, quand la rareté de la vedette tombe, le joueur a une chance
sur deux de l'obtenir, et l'obtient à coup sûr la fois suivante s'il l'a ratée.

**Why this priority**: c'est la règle même de la mise en avant.

**Independent Test**: avec un hasard choisi, un résultat de la rareté de la vedette
donne la vedette ou un autre élément selon le 50/50, et le résultat suivant de cette
rareté sur cette bannière donne forcément la vedette après un échec.

**Acceptance Scenarios**:

1. **Given** une bannière vedette sans garantie en cours, **When** un résultat de la rareté de la vedette tombe, **Then** c'est la vedette une fois sur deux, sinon un autre élément de cette rareté, chacun avec la même chance.
2. **Given** un 50/50 raté sur cette bannière, **When** la rareté de la vedette y retombe, **Then** c'est la vedette, et la carte l'annonce « Garanti ! ».
3. **Given** la vedette obtenue (au 50/50 ou par garantie), **When** la rareté retombe ensuite, **Then** on revient au 50/50.
4. **Given** une bannière dont la vedette est Légendaire, **When** un Ultra rare tombe, **Then** il est tiré comme sur la bannière standard (la mise en avant ne touche que la rareté de la vedette).
5. **Given** le compteur des 40 tirages qui force un Légendaire ou mieux sur une bannière vedette, **When** le résultat forcé est de la rareté de la vedette, **Then** le 50/50 (ou la garantie vedette) s'applique à lui aussi.

---

### User Story 3 - Changer de bannière sans rien perdre (Priority: P1)

Le joueur alterne entre les bannières : le compteur des 40 tirages le suit, et une
garantie vedette gagnée sur une bannière l'y attend.

**Why this priority**: le choix du joueur ne doit jamais le pénaliser en cachette.

**Independent Test**: après des tirages sur une bannière, le compteur des 40 affiché
sur une autre est le même ; une garantie vedette gagnée sur la bannière A n'agit pas
sur B et est toujours là au retour sur A.

**Acceptance Scenarios**:

1. **Given** un compteur de garantie à 25 sur la bannière standard, **When** le joueur passe sur une bannière vedette, **Then** le compteur affiché est 25.
2. **Given** une garantie vedette en cours sur la bannière A, **When** le joueur tire sur la bannière B et y obtient la rareté de la vedette de A, **Then** la garantie de A n'est ni utilisée ni perdue.
3. **Given** une garantie vedette en cours sur une bannière, **When** le joueur l'affiche, **Then** l'écran indique que la prochaine vedette de cette rareté est garantie.
4. **Given** des garanties vedettes en cours, **When** le joueur recharge le jeu, **Then** elles sont toutes conservées.

---

### User Story 4 - Connaître les taux de la bannière (Priority: P2)

La fenêtre des taux décrit la bannière active : les taux par rareté, la chance de la
vedette et la règle du 50/50.

**Why this priority**: la transparence est un principe (constitution IV), mais la
fenêtre des taux existe déjà ; il s'agit de la compléter.

**Independent Test**: sur une bannière vedette, la fenêtre des taux affiche la chance
d'obtenir la vedette à chaque tirage et explique le 50/50 ; sur la bannière standard,
elle est inchangée.

**Acceptance Scenarios**:

1. **Given** une bannière vedette active, **When** le joueur ouvre les taux, **Then** il lit les taux par rareté (identiques à la bannière standard), la chance de la vedette par tirage hors garanties, et la règle du 50/50 et de sa garantie.
2. **Given** la bannière standard active, **When** le joueur ouvre les taux, **Then** la fenêtre est celle d'avant cette feature.

---

### Edge Cases

- **Vedette déjà possédée** : la bannière reste disponible ; obtenir la vedette en double rapporte ses éclats comme tout doublon.
- **Collection complète** : rien ne change, les bannières vedettes restent jouables.
- **Deux résultats de la rareté de la vedette dans un même ×10** : le 50/50 et la garantie vedette s'appliquent dans l'ordre des résultats (un échec au 3ᵉ rend le 7ᵉ garanti, s'il est de cette rareté).
- **Garantie du ×10 (Rare ou mieux)** : inchangée, sur toutes les bannières ; un Rare forcé n'est jamais concerné par une vedette Légendaire ou Ultra rare.
- **Échange d'éclats** : ne dépend pas de la bannière et ne touche à aucune garantie vedette.
- **Recommencer** : remet la bannière standard, efface les garanties vedettes (et, comme avant, le compteur des 40, la monnaie, les possessions, les éclats).
- **Sauvegarde d'avant cette feature** : reprise sans perte, bannière standard active, aucune garantie vedette.

## Requirements *(mandatory)*

### Functional Requirements

**Bannières**

- **FR-001**: Le jeu MUST proposer une **bannière standard**, dont le tirage est exactement celui d'avant cette feature, et **une bannière vedette par élément Légendaire ou Ultra rare** du catalogue (5 aujourd'hui), qui met cet élément en avant.
- **FR-002**: Les bannières MUST être permanentes : aucune n'apparaît, ne disparaît ni ne change selon l'heure, la date ou le nombre de tirages.
- **FR-003**: L'écran de tirage MUST afficher la bannière active : son nom et, pour une bannière vedette, l'élément mis en avant (nom, rareté, possédé ou non).
- **FR-004**: Le joueur MUST pouvoir passer à la bannière précédente ou suivante depuis l'écran de tirage, en boucle, en un appui par bannière.
- **FR-005**: Les tirages ×1 et ×10 MUST partir sur la bannière active, aux mêmes coûts sur toutes les bannières.
- **FR-006**: La bannière active MUST être conservée entre deux sessions.

**Mise en avant (50/50)**

- **FR-007**: Sur une bannière vedette, la **rareté** de chaque résultat MUST être tirée exactement comme sur la bannière standard (mêmes taux, même garantie du ×10, même compteur des 40).
- **FR-008**: Quand un résultat est de la rareté de la vedette et qu'aucune garantie vedette n'est en cours sur cette bannière, il MUST être la vedette avec une chance sur deux ; sinon, un des autres éléments de cette rareté, chacun avec la même chance.
- **FR-009**: Un résultat de la rareté de la vedette qui n'est pas la vedette MUST ouvrir une **garantie vedette** sur cette bannière.
- **FR-010**: Quand une garantie vedette est en cours, le prochain résultat de la rareté de la vedette sur cette bannière MUST être la vedette ; la carte l'annonce « Garanti ! » et la garantie se referme.
- **FR-011**: Obtenir la vedette au 50/50 MUST laisser la bannière sans garantie vedette.
- **FR-012**: Les résultats d'une autre rareté que celle de la vedette MUST être tirés comme sur la bannière standard et ne MUST pas toucher à la garantie vedette.

**Compteurs partagés**

- **FR-013**: Le compteur de garantie des 40 tirages (002) MUST être unique et commun à toutes les bannières.
- **FR-014**: Chaque bannière vedette MUST avoir sa propre garantie vedette, que les tirages sur une autre bannière n'utilisent ni n'effacent.
- **FR-015**: L'écran de tirage MUST indiquer, sur une bannière vedette, si sa garantie vedette est en cours.

**Taux affichés**

- **FR-016**: Sur une bannière vedette, la fenêtre des taux MUST afficher, en plus des taux par rareté, la chance d'obtenir la vedette à chaque tirage hors garanties (taux de sa rareté × 1/2), et expliquer le 50/50 et sa garantie.
- **FR-017**: Ces chiffres MUST venir des mêmes données que le tirage (constitution IV).

**Persistance et remise à zéro**

- **FR-018**: Les garanties vedettes et la bannière active MUST être conservées entre deux sessions.
- **FR-019**: Une sauvegarde d'avant cette feature MUST être reprise sans perte, sur la bannière standard, sans garantie vedette.
- **FR-020**: « Recommencer » MUST remettre la bannière standard et effacer toutes les garanties vedettes.

### Key Entities

- **Bannière** : nom ; standard, ou vedette avec l'élément mis en avant (Légendaire ou Ultra rare). Dérivée du catalogue : un élément de ces raretés ajouté au catalogue a sa bannière.
- **Garantie vedette** : par bannière vedette, ouverte ou non ; s'ouvre sur un 50/50 raté, se referme quand la vedette tombe.
- **Résultat** (étendu) : signalé « Garanti ! » quand il vient de la garantie vedette, comme quand il vient du compteur des 40.
- **Progression du joueur** (étendue) : en plus de 002, la bannière active et les garanties vedettes ouvertes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Sur 1 000 000 de tirages simulés sur une bannière vedette, la fréquence de chaque rareté reste celle de la bannière standard (écart relatif < 5 %).
- **SC-002**: Sur ces tirages, hors garanties vedettes, la vedette représente la moitié des résultats de sa rareté (écart relatif < 5 %).
- **SC-003**: Sur 100 000 séquences simulées, il n'y a jamais deux résultats consécutifs de la rareté de la vedette, sur sa bannière, sans que l'un des deux soit la vedette.
- **SC-004**: Depuis l'écran de tirage, le joueur atteint n'importe quelle bannière en au plus 3 appuis (6 bannières en boucle, dans les deux sens).
- **SC-005**: Après rechargement, bannière active et garanties vedettes sont identiques.
- **SC-006**: Sur la bannière standard, un même hasard donne exactement les mêmes tirages qu'avant cette feature.

## Assumptions

- Chaque élément d'une rareté a aujourd'hui la même chance que les autres de cette rareté ; la règle « un des autres, chacun avec la même chance » (FR-008) le prolonge.
- Pour un Ultra rare (2 au catalogue), le 50/50 ne change rien à la chance d'un résultat isolé (déjà une sur deux) : la mise en avant tient dans la garantie après un échec. Accepté en clarification.
- Les bannières n'ont pas de visuel propre : nom de la bannière et nom de la vedette, dans la DA provisoire (les visuels réels viendront avec l'univers, roadmap).
- Les coûts (×1 = 100, ×10 = 900), le stock de départ, le compteur des 40 et les éclats sont inchangés.
- La révélation (004) et le son (005) ne changent pas : le palier dépend toujours de la meilleure rareté, pas de la vedette.
- Le nom d'une bannière vedette se déduit de sa vedette (ex. « Bannière Orbulle »), sans texte à écrire par bannière.
