# Feature Specification: Pity & doublons

**Feature Branch**: `feat/002-pity-doublons`

**Created**: 2026-10-19

**Status**: Draft

**Input**: User description: "Pity et doublons (feature 002, roadmap). Le joueur sait combien de tirages le séparent de la garantie (pity) et reçoit quelque chose d'utile pour un doublon. Hors périmètre : ce que vaut un personnage en jeu, collection, animation. S'appuie sur la feature 001 (tirage ×1/×10, 5 raretés aux taux 60/27/10/2,5/0,5 %, ×1 = 100, ×10 = 900 avec un Rare garanti, stock fixe 9 000, sauvegarde versionnée)."

## Contexte

La feature 001 a livré le tirage : avec le stock de départ, un joueur fait environ
100 tirages, et la malchance n'a aucune limite (une partie sur deux ne voit aucun
Ultra rare). Un doublon ne fait qu'augmenter un compteur d'exemplaires. Cette
feature borne la malchance par une **garantie à seuil** (pity), visible en
permanence, et donne une **contrepartie utile** à chaque doublon.

## Clarifications

### Session 2026-10-19

- Q: Que garantit le pity, et après combien de tirages ? → A: Légendaire ou mieux, au plus tard au 40ᵉ tirage.
- Q: Que rapporte un doublon ? → A: Des éclats, échangeables contre un élément manquant au choix.
- Q: Combien d'éclats rapporte un doublon, et combien coûte l'échange d'un élément manquant ? → A: Gain 1 / 2 / 5 / 15 / 30 et coût 10 / 20 / 50 / 150 / 300 (Commun → Ultra rare), soit ~150 éclats par partie de 100 tirages.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Être protégé de la malchance (Priority: P1)

Le joueur enchaîne les tirages sans obtenir de résultat de haute rareté. Au plus
tard au tirage de seuil, un résultat de haute rareté lui est garanti.

**Why this priority**: c'est la promesse centrale d'un pity ; sans elle, le
compteur n'aurait rien à annoncer.

**Independent Test**: en partant d'un compteur juste sous le seuil, le tirage
suivant donne forcément un résultat de la rareté garantie, quel que soit le hasard.

**Acceptance Scenarios**:

1. **Given** un joueur qui n'a obtenu aucun résultat de la rareté garantie depuis (seuil − 1) tirages, **When** il fait un tirage ×1, **Then** ce résultat est de la rareté garantie.
2. **Given** un joueur à 3 tirages du seuil, **When** il fait un tirage ×10, **Then** le 3ᵉ résultat de la salve est de la rareté garantie (si aucun des deux premiers ne l'est déjà).
3. **Given** un joueur qui obtient naturellement un résultat de la rareté garantie avant le seuil, **When** ce résultat tombe, **Then** le compteur repart de zéro.
4. **Given** un tirage forcé par la garantie, **When** le résultat s'affiche, **Then** il est signalé comme obtenu grâce à la garantie.

---

### User Story 2 - Voir où en est la garantie (Priority: P1)

Sur l'écran de tirage, le joueur lit en permanence combien de tirages le séparent de
la garantie.

**Why this priority**: c'est le texte même de la roadmap (« savoir combien de tirages
le séparent de la garantie ») ; une garantie invisible ne rassure personne.

**Independent Test**: le compteur affiché diminue de 1 par tirage ×1, de 10 par
tirage ×10, et revient au seuil après un résultat de la rareté garantie.

**Acceptance Scenarios**:

1. **Given** un premier lancement, **When** l'écran de tirage s'affiche, **Then** il indique que la garantie tombe dans « seuil » tirages au plus.
2. **Given** un compteur à 25, **When** le joueur fait un ×1 sans obtenir la rareté garantie, **Then** le compteur affiche 24.
3. **Given** une partie en cours, **When** le joueur recharge le jeu, **Then** le compteur est identique.
4. **Given** la fenêtre des taux, **When** le joueur l'ouvre, **Then** elle explique la règle de garantie (rareté, seuil, remise à zéro).

---

### User Story 3 - Tirer profit d'un doublon (Priority: P1)

Quand un tirage donne un élément déjà possédé, le joueur reçoit une contrepartie
utile, visible sur la carte du résultat.

**Why this priority**: un doublon sec est la principale frustration d'un gacha ; la
roadmap demande « quelque chose d'utile ».

**Independent Test**: un doublon produit la contrepartie prévue pour sa rareté, et
cette contrepartie sert effectivement au joueur (voir FR-008).

**Acceptance Scenarios**:

1. **Given** un élément déjà possédé, **When** un tirage le redonne, **Then** sa carte indique la contrepartie reçue et le joueur la reçoit.
2. **Given** un élément obtenu pour la première fois, **When** le résultat s'affiche, **Then** aucune contrepartie de doublon n'est donnée.
3. **Given** un ×10 qui donne deux fois un élément jamais possédé, **When** les résultats s'affichent, **Then** seul le second compte comme doublon.

---

### User Story 4 - Utiliser ce que rapportent les doublons (Priority: P2)

Le joueur emploie ce qu'il a accumulé grâce aux doublons pour progresser dans sa
collection.

**Why this priority**: les éclats n'ont de valeur que s'ils se dépensent ; c'est ce
qui transforme la malchance des doublons en progrès choisi.

**Independent Test**: après avoir accumulé assez de contrepartie, le joueur
l'emploie et sa progression avance d'autant.

**Acceptance Scenarios**:

1. **Given** un joueur qui a accumulé assez de contrepartie, **When** il l'emploie, **Then** son solde de contrepartie baisse du coût prévu et il obtient ce qui était annoncé.
2. **Given** un joueur qui n'en a pas assez, **When** il regarde l'action correspondante, **Then** elle est indisponible et le manque est indiqué.

---

### Edge Cases

- **Seuil atteint au milieu d'un ×10** : la garantie s'applique au résultat exact qui atteint le seuil, pas à la fin de la salve.
- **Garantie du ×10 (Rare) et pity dans la même salve** : les deux s'appliquent indépendamment ; un résultat forcé par le pity compte aussi comme le Rare-ou-mieux de la salve.
- **Deux seuils atteints dans un même ×10** : impossible si le seuil dépasse 10 ; le seuil retenu doit être supérieur à 10.
- **Recommencer** : remet le compteur de garantie au seuil et efface ce qu'ont rapporté les doublons.
- **Sauvegarde de la version 001** : reprise sans perte ; compteur de garantie au seuil, rien d'accumulé par les doublons (les doublons passés ne sont pas rétribués rétroactivement).
- **Tous les éléments possédés** : chaque résultat est un doublon et rapporte ses éclats ; la liste d'échange est vide et le dit.
- **Échange du dernier élément manquant** : la collection est complète ; les éclats restants sont conservés sans usage.

## Requirements *(mandatory)*

### Functional Requirements

**Garantie (pity)**

- **FR-001**: La garantie MUST porter sur un résultat **Légendaire ou mieux** (Légendaire ou Ultra rare), au plus tard au **40ᵉ tirage** depuis le dernier résultat de cette rareté.
- **FR-002**: Le compteur de garantie MUST avancer de 1 par résultat, que le tirage soit ×1 ou ×10, et être commun aux deux types de tirage.
- **FR-003**: Le compteur MUST repartir de zéro dès qu'un résultat atteint la rareté garantie, qu'il soit naturel ou forcé.
- **FR-004**: Quand le résultat courant atteint le seuil sans que la rareté garantie soit tombée, il MUST être tiré parmi Légendaire et Ultra rare uniquement, en gardant entre elles les proportions de leurs taux (2,5 / 0,5, soit 5 chances sur 6 de Légendaire), même principe que la garantie du ×10.
- **FR-005**: Un résultat forcé par le pity MUST être signalé sur sa carte (« Garanti ! »).
- **FR-006**: L'écran de tirage MUST afficher en permanence le nombre maximal de tirages restant avant la garantie.
- **FR-007**: La fenêtre des taux MUST expliquer la règle : rareté garantie, seuil, remise à zéro du compteur.

**Doublons**

- **FR-008**: Un doublon MUST rapporter des **éclats**, une seconde monnaie distincte des pièces de tirage, qui servent uniquement à obtenir **un élément manquant choisi par le joueur** (US4).
- **FR-009**: Un doublon MUST rapporter, selon sa rareté : **Commun 1, Peu commun 2, Rare 5, Légendaire 15, Ultra rare 30** éclats.
- **FR-010**: La carte d'un doublon MUST afficher la contrepartie reçue ; une carte « Nouveau ! » n'en affiche pas.
- **FR-011**: La contrepartie MUST être créditée en même temps que le tirage est débité et sauvegardé (indissociables, comme en 001).

**Échange d'éclats**

- **FR-012**: Le joueur MUST pouvoir ouvrir, depuis l'écran de tirage, la liste des éléments qu'il ne possède pas encore, chacun avec son coût en éclats.
- **FR-013**: Le coût d'échange d'un élément MUST être, selon sa rareté : **Commun 10, Peu commun 20, Rare 50, Légendaire 150, Ultra rare 300** éclats.
- **FR-014**: Échanger MUST débiter le coût en éclats et ajouter l'élément choisi à ses possessions, après confirmation ; l'élément devient possédé comme s'il avait été tiré.
- **FR-015**: Un élément MUST être indisponible à l'échange quand le solde d'éclats est insuffisant ; le manque est indiqué.
- **FR-016**: Un échange n'est pas un tirage : il MUST ne pas faire avancer le compteur de garantie ni coûter de pièces.
- **FR-017**: Seuls les éléments non possédés MUST être échangeables (on ne peut pas acheter un doublon).
- **FR-018**: Le solde d'éclats MUST être affiché en permanence sur l'écran de tirage.

**Persistance et remise à zéro**

- **FR-019**: Le compteur de garantie et ce qu'ont rapporté les doublons MUST être conservés entre deux sessions.
- **FR-020**: Une sauvegarde de la version 001 MUST être reprise sans perte, avec un compteur au seuil et rien d'accumulé.
- **FR-021**: « Recommencer » MUST remettre le compteur au seuil et effacer ce qu'ont rapporté les doublons.

### Key Entities

- **Garantie** : rareté minimale garantie (Légendaire), seuil (40 tirages), compteur courant de tirages depuis le dernier résultat Légendaire ou mieux.
- **Éclats** : seconde monnaie ; gain par doublon selon la rareté, coût d'échange d'un élément manquant selon sa rareté.
- **Résultat** (étendu) : en plus de 001, s'il a été forcé par le pity et la contrepartie qu'il a rapportée.
- **Progression du joueur** (étendue) : en plus de 001, le compteur de garantie et le solde d'éclats.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Sur 100 000 séquences de tirages simulées, aucun écart entre deux résultats de la rareté garantie ne dépasse le seuil.
- **SC-002**: Hors tirages forcés, la fréquence de chaque rareté reste celle de la feature 001 (écart relatif < 5 % sur 1 000 000 de tirages).
- **SC-003**: Depuis l'écran de tirage, le joueur lit le nombre de tirages restant avant la garantie sans aucun appui.
- **SC-004**: 100 % des doublons affichent et créditent leurs éclats ; 0 % des premiers exemplaires en reçoivent.
- **SC-006**: Depuis l'écran de tirage, le joueur échange des éclats contre un élément manquant en au plus 3 appuis.
- **SC-005**: Après rechargement, compteur de garantie et contrepartie accumulée sont identiques à l'unité près.

## Assumptions

- Le seuil retenu est strictement supérieur à 10, ce qui exclut deux déclenchements dans un même ×10.
- Le compteur affiché est « dans N tirages au plus » : il compte les tirages restants jusqu'au seuil inclus.
- La garantie du ×10 (au moins un Rare) reste inchangée et coexiste avec le pity.
- Les doublons obtenus avant cette feature (sauvegarde 001) ne sont pas rétribués.
- Les éléments n'ont toujours aucune utilité en jeu : les doublons ne renforcent pas un personnage (pas de niveaux ni d'étoiles, hors périmètre).
- Ordre de grandeur attendu (simulation de 20 000 parties de 100 tirages avec les règles de 001) : ~52 doublons Communs, ~21 Peu communs, ~8 Rares, ~1 Légendaire, soit ~150 éclats ; il manque en moyenne 2,8 éléments en fin de partie, presque tous Légendaires ou Ultra rares. Les éclats permettent donc d'en combler un en général, pas tous.
- Pas d'écran de collection (feature 003) ni d'animation (feature 004) : la mention « Garanti ! » et la contrepartie s'affichent sur la carte de résultat existante.
