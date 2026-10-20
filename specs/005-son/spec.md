# Feature Specification: Son

**Feature Branch**: `feat/005-son`

**Created**: 2026-10-20

**Status**: Draft

**Input**: User description: "Pour la fausse piste à l'envers, il faudrait rajouter un petit rire diabolique. Et de base je pense que c'est important le son dans un jeu."

## Contexte

Le jeu est muet : le tirage, la révélation (004) et ses fausses pistes ne passent que
par l'image. Cette feature ajoute des **bruitages** qui accompagnent le tirage et sa
révélation, dont un **petit rire diabolique** quand un leurre retombe sur Rare, et
donne au joueur le moyen de couper le son.

## Clarifications

### Session 2026-10-20

- Q: D'où viennent les sons ? → A: Mélange : les bruitages (suspense, paliers, montée, cartes) sont fabriqués par le jeu, style cartoon/rétro, sans fichier ; le rire diabolique est un enregistrement libre de droits (CC0).
- Q: La musique de fond fait-elle partie de cette feature ? → A: Non, plus tard (feature à part, liée à l'univers du jeu).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Entendre la révélation (Priority: P1)

Pendant la révélation d'un tirage, le joueur entend un son de suspense puis un son
propre au palier révélé, de plus en plus marquant avec la rareté.

**Why this priority**: c'est le cœur de la demande : le son renforce le moment fort
du jeu, déjà mis en scène par 004.

**Independent Test**: un tirage ×1 Commun et un tirage ×1 Ultra rare font entendre le
même suspense puis deux sons de palier différents.

**Acceptance Scenarios**:

1. **Given** un tirage lancé, **When** la révélation commence, **Then** le son de suspense se fait entendre.
2. **Given** la révélation d'un palier, **When** il apparaît, **Then** le son de ce palier se fait entendre ; deux paliers différents ont deux sons différents.
3. **Given** une montée (004, FR-011), **When** l'orbe se fend, **Then** un son de montée précède le son du vrai palier.

---

### User Story 2 - Le rire du leurre (Priority: P1)

Quand un leurre (004, FR-012) retombe sur Rare, le joueur entend un petit rire
diabolique.

**Why this priority**: demande explicite de l'utilisateur ; il donne son caractère au
faux espoir.

**Independent Test**: un leurre fait entendre le son du faux palier, puis le rire au
moment de la retombée, puis le son du palier Rare.

**Acceptance Scenarios**:

1. **Given** un leurre, **When** l'effet se dégonfle, **Then** le rire diabolique se fait entendre.
2. **Given** un tirage sans leurre, **When** il se déroule, **Then** le rire ne se fait jamais entendre.

---

### User Story 3 - Couper le son (Priority: P1)

Le joueur coupe ou rétablit le son d'un appui, et le jeu s'en souvient.

**Why this priority**: un jeu qui fait du bruit sans pouvoir se taire est vite
désinstallé (transports, bureau, nuit).

**Independent Test**: son coupé, un tirage complet est silencieux ; après
rechargement, le son est toujours coupé.

**Acceptance Scenarios**:

1. **Given** le son actif, **When** le joueur touche le bouton son, **Then** plus aucun son ne se fait entendre et le bouton l'indique.
2. **Given** le son coupé, **When** le joueur recharge le jeu, **Then** le son reste coupé.
3. **Given** le son coupé, **When** il touche de nouveau le bouton, **Then** les sons reviennent.

---

### User Story 4 - Entendre les cartes (Priority: P2)

Au ×10, chaque carte qui se retourne fait un petit bruit, et la vedette un son plus
marqué.

**Why this priority**: prolonge l'ambiance sonore, mais la révélation sonne déjà sans.

**Independent Test**: un ×10 regardé jusqu'au bout fait entendre 9 petits bruits puis
celui de la vedette.

**Acceptance Scenarios**:

1. **Given** le retournement d'un ×10, **When** une carte ordinaire se retourne, **Then** un petit bruit se fait entendre.
2. **Given** la vedette, **When** elle se retourne, **Then** un son plus marqué se fait entendre.

---

### Edge Cases

- **Passer l'animation** : les sons en cours s'arrêtent aussitôt ; aucun son de la suite (palier, rire, cartes) ne se fait entendre après l'appui.
- **Premier son avant toute interaction** : les navigateurs bloquent le son tant que le joueur n'a pas touché l'écran ; le premier son possible est celui du premier tirage, qui suit un appui.
- **Son impossible** (navigateur sans audio, fichier introuvable) : le jeu continue, muet, sans erreur visible.
- **Son coupé pendant une animation** : impossible, le bouton son n'est pas accessible pendant une fenêtre (004, FR-007).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La révélation MUST faire entendre un son de **suspense**, identique pour tous les paliers, puis un son par **palier révélé** (5 sons distincts, plus marquants avec la rareté).
- **FR-002**: Une montée MUST faire entendre un son de montée entre le faux palier et le vrai.
- **FR-003**: Un leurre MUST faire entendre un **rire diabolique** court au moment où l'effet se dégonfle, et seulement là.
- **FR-004**: Au ×10, chaque carte ordinaire qui se retourne MUST faire un petit bruit et la vedette un son plus marqué.
- **FR-005**: Passer l'animation MUST couper les sons en cours et annuler ceux qui restaient à jouer.
- **FR-006**: L'écran de tirage MUST offrir un bouton qui coupe ou rétablit tous les sons, et qui montre l'état courant.
- **FR-007**: Le choix son coupé / actif MUST être mémorisé d'une session à l'autre. Une partie neuve démarre son actif ; « Recommencer » ne change pas ce choix.
- **FR-008**: Une impossibilité de jouer un son MUST NOT bloquer ni perturber le jeu.
- **FR-009**: Les bruitages (suspense, paliers, montée, cartes) MUST être **fabriqués par le jeu** (synthèse, style cartoon/rétro), sans fichier sonore.
- **FR-010**: Le rire diabolique MUST être un **enregistrement libre de droits (CC0)**, court (2 s au plus), dont la provenance (auteur, lien, licence) est tracée dans le dépôt.

### Key Entities

- **Réglage du son** : actif ou coupé, mémorisé sur l'appareil du joueur, indépendant de la partie.
- **Bruitage** : un son associé à un moment du jeu (suspense, palier, montée, rire, carte, vedette).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Chaque moment listé en FR-001 à FR-004 fait entendre son bruitage dans 100 % des cas, son actif.
- **SC-002**: Son coupé, aucun son ne se fait entendre, y compris après rechargement.
- **SC-003**: Aucun son ne commence plus de 0,1 s après l'appui qui passe l'animation.
- **SC-004**: Le rire diabolique se fait entendre dans 100 % des leurres et dans 0 % des autres tirages.
- **SC-005**: Le jeu se charge et reste jouable quand le son est indisponible.

## Assumptions

- Pas de musique de fond : feature à part, plus tard (clarification).
- Pas de vibration : hors périmètre.
- Pas de réglage de volume fin : un seul bouton coupé / actif.
- Pas de son sur les boutons, la collection ni les taux : seul le tirage est sonorisé.
- Le réglage du son n'appartient pas à la partie : « Recommencer » ne l'efface pas.
- Les sons sont provisoires, comme la DA : remplaçables sans toucher aux règles.
