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

### Révision du 2026-11-09 (écran vivant, avec la révision de 007)

- Q: Sonoriser aussi l'interface ? → A (demande de l'utilisateur : du son pour « rendre un peu de vie », sans nouvelle feature, choix laissé à Claude) : oui, de petits bruitages discrets sur les appuis, le changement de bannière et les montants qui défilent (User Story 5, FR-011 à FR-013). La musique de fond reste pour plus tard (roadmap : après l'univers définitif).

### Révision du 2026-11-13 (immersion sonore)

- Q: Que faut-il améliorer ? → A (demande de l'utilisateur : une expérience gacha « la plus parfaite et la plus immersive possible », sans nouvelle feature, choix laissé à Claude d'après une critique de sound design) : des bruitages plus riches (souffle, verre, impact, décroissance), un mixage qui récompense chaque palier au-dessus du suspense, des coupures sans clic, un son qui suit l'image (battements, fissures, éclat, face des cartes) et plus aucun temps mort aux moments forts (User Story 6, FR-014 à FR-024).
- Q: La présentation plein écran (007) doit-elle sonner ? → A: Oui : une fanfare d'entrée, c'est le plus gros moment de récompense du jeu (FR-021).
- Q: Les pièces tintent-elles pareil quand on dépense et quand on gagne ? → A: Non : un motif descendant quand le solde baisse, montant quand il monte (FR-022).

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

### User Story 5 - Entendre l'interface (Priority: P3)

*Révision du 2026-11-09.* Chaque appui sur un bouton fait un petit bruit, le
changement de bannière un glissement, et un montant qui défile (007, FR-015) fait
tinter des pièces ou des éclats. Ces sons sont courts et plus discrets que ceux du
tirage.

**Why this priority**: donne de la vie à l'écran (demande de l'utilisateur) ; le jeu
reste complet sans eux.

**Independent Test**: son actif, ouvrir « Taux » fait entendre un bruit d'appui, ▶ un
glissement, un tirage le tintement des pièces ; son coupé, aucun des trois.

**Acceptance Scenarios**:

1. **Given** le son actif, **When** le joueur touche un bouton (écran ou fenêtre), **Then** un bruit d'appui court se fait entendre, une fois.
2. **Given** le son actif, **When** il touche ◀ ou ▶, **Then** il entend un glissement au lieu du bruit d'appui.
3. **Given** le son actif, **When** le solde ou les éclats défilent, **Then** des pièces (solde) ou des éclats (éclats) tintent, pas plus longtemps que le défilement.
4. **Given** le son coupé, **When** le joueur fait l'une de ces actions, **Then** il n'entend rien ; quand il rétablit le son, le bouton son fait entendre le bruit d'appui.

---

### User Story 6 - Une révélation qui se vit à l'oreille (Priority: P2)

*Révision du 2026-11-13.* Le suspense grossit et bat comme un cœur, chaque fissure claque,
l'éclatement frappe au moment du flash, et le palier qui suit récompense, même un Commun.
Une montée change de ton, un leurre se dégonfle avant le rire. Au ×10, chaque carte sonne
quand sa face apparaît, de plus en plus haut jusqu'à la vedette, qui bat puis frappe. La
présentation d'un Légendaire ou d'un Ultra rare a sa fanfare. Passer coupe tout en douceur.

**Why this priority**: le son actuel est juste mais pauvre et parfois muet aux moments forts
(critique du 2026-11-13) ; le jeu reste complet sans ces retouches.

**Independent Test**: rendre chaque bruitage hors navigateur et mesurer : niveau de chaque
palier au-dessus du suspense, croissant avec la rareté ; aucune coupure brutale ; le son d'une
carte tombe à l'instant de sa face ; un Légendaire tiré au ×1 fait entendre `splash`.

**Acceptance Scenarios**:

1. **Given** une révélation, **When** le suspense monte, **Then** il gagne en volume et fait entendre un battement à chaque pulsation du halo, et chaque fissure s'entend nettement par-dessus.
2. **Given** l'orbe qui éclate, **When** le flash apparaît, **Then** un impact sonne dans le même instant, plus fort pour une rareté plus haute, et le palier qui suit est plus fort que le suspense, Commun compris.
3. **Given** un leurre, **When** l'effet se dégonfle, **Then** la fanfare du faux palier ralentit et s'éteint avant le rire, et le vrai palier reste audible sous le rire.
4. **Given** un ×10 regardé jusqu'au bout, **When** les cartes se retournent, **Then** chacune sonne à l'apparition de sa face, sur une note plus haute que la précédente, et la vedette fait entendre des battements puis un impact.
5. **Given** un Légendaire ou un Ultra rare obtenu, **When** sa présentation plein écran s'ouvre, **Then** une fanfare d'entrée se fait entendre.
6. **Given** un son en cours, **When** le joueur passe l'animation ou coupe le son, **Then** le son s'éteint en quelques millisecondes, sans claquement.

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
- **FR-011**: *(Révision du 2026-11-09.)* Un appui sur un bouton MUST faire entendre un bruit d'appui court (0,1 s au plus), plus discret que les sons du tirage ; les flèches de bannière MUST faire entendre un glissement à la place.
- **FR-012**: Le défilement d'un montant (007, FR-015) MUST faire tinter des pièces (solde) ou des éclats (éclats), sans durer plus que le défilement.
- **FR-013**: Ces sons MUST suivre le réglage du son (FR-006, FR-007) et MUST être fabriqués par le jeu, comme les autres bruitages (FR-009).
- **FR-014**: *(Révision du 2026-11-13.)* Les bruitages MUST pouvoir mêler notes, souffle (bruit filtré) et décroissance naturelle ; tout reste fabriqué par le jeu (FR-009), et le bruit MUST NOT consommer le hasard du tirage.
- **FR-015**: Le niveau perçu de chaque palier MUST dépasser celui du suspense et croître avec la rareté ; les sons d'interface MUST rester sous ceux du tirage en énergie perçue ; aucune crête ne MUST saturer.
- **FR-016**: Passer l'animation ou couper le son MUST éteindre les sons en cours en 30 ms au plus, sans claquement ; aucun son ne commence après l'appui (SC-003 inchangé).
- **FR-017**: Le suspense MUST grossir en volume et faire entendre un battement à chaque pulsation visible du halo ; chaque fissure MUST s'entendre au-dessus de la sirène.
- **FR-018**: L'éclatement de l'orbe MUST faire entendre un impact dans le même instant que le flash, d'autant plus fort que le palier est haut ; dès Légendaire, un grondement accompagne la secousse.
- **FR-019**: Une montée MUST faire entendre une aspiration jusqu'à l'éclat suivant, et le vrai palier un ton plus haut ; un leurre MUST faire ralentir et s'éteindre le faux palier avant le rire.
- **FR-020**: Au ×10, le son d'une carte MUST tomber à l'apparition de sa face, sur une échelle montante dans l'ordre de retournement ; la vedette MUST faire entendre ses battements puis un impact de son palier, et les paliers Légendaire et Ultra MUST garder un scintillement sonore tant que tombe la pluie d'étoiles.
- **FR-021**: La présentation plein écran (007, FR-003) MUST faire entendre une fanfare d'entrée (bruitage `splash`), éteinte quand le joueur la ferme.
- **FR-022**: Le tintement des pièces MUST descendre quand le solde baisse et monter quand il monte ; quand solde et éclats défilent ensemble, leurs tintements MUST se suivre sans se couvrir ; le glissement de bannière MUST être un souffle.
- **FR-023**: Le passage de la révélation aux cartes MUST se faire sans laisser voir l'écran de tirage, avec un éclair et un souffle bref.
- **FR-024**: Si l'appareil annonce une latence de sortie audio notable (casque sans fil), les sons MUST être avancés d'autant (150 ms au plus) pour rester synchrones avec l'image.

### Key Entities

- **Réglage du son** : actif ou coupé, mémorisé sur l'appareil du joueur, indépendant de la partie.
- **Bruitage** : un son associé à un moment du jeu (suspense, palier, montée, rire, carte, vedette ; depuis la révision du 2026-11-09 : appui, glissement, pièces, éclats).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Chaque moment listé en FR-001 à FR-004 fait entendre son bruitage dans 100 % des cas, son actif.
- **SC-002**: Son coupé, aucun son ne se fait entendre, y compris après rechargement.
- **SC-003**: Aucun son ne commence plus de 0,1 s après l'appui qui passe l'animation.
- **SC-004**: Le rire diabolique se fait entendre dans 100 % des leurres et dans 0 % des autres tirages.
- **SC-005**: Le jeu se charge et reste jouable quand le son est indisponible.
- **SC-006**: *(Révision du 2026-11-09.)* Son actif, chaque appui sur un bouton fait entendre exactement un bruit d'appui ou de glissement ; son coupé, aucun.
- **SC-007**: *(Révision du 2026-11-13.)* Mesurés hors navigateur, les paliers Commun à Ultra rare dépassent le suspense et montent dans l'ordre des raretés ; la crête de toute révélation reste sous 0 dBFS.
- **SC-008**: Après un appui qui passe l'animation, plus aucune note ne sonne 30 ms plus tard (compteur de notes à zéro) et aucune n'a commencé après l'appui.
- **SC-009**: Pour un ×10 regardé jusqu'au bout, chaque son de carte tombe à moins de 20 ms de l'apparition de sa face.

## Assumptions

- Pas de musique de fond : feature à part, plus tard (clarification).
- Pas de vibration : hors périmètre.
- Pas de réglage de volume fin : un seul bouton coupé / actif.
- Sons d'interface : absents au départ, ajoutés par la révision du 2026-11-09 (FR-011 à FR-013) ; toujours ni musique ni son d'ambiance continu.
- Révision du 2026-11-13 : timbres, mixage et synchronisation seulement, plus la fanfare de la présentation ; toujours ni musique ni ambiance continue, et aucun fichier sonore nouveau hors CC0 tracé (ADR 0006).
- Le réglage du son n'appartient pas à la partie : « Recommencer » ne l'efface pas.
- Les sons sont provisoires, comme la DA : remplaçables sans toucher aux règles.
