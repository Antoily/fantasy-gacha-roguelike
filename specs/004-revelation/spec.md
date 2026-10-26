# Feature Specification: Révélation

**Feature Branch**: `feat/004-revelation`

**Created**: 2026-10-20

**Status**: Draft

**Input**: User description: "Révélation (feature 004, roadmap) : vivre le tirage — suspense, puis mise en scène qui dépend de la meilleure rareté obtenue (au ×10, le meilleur des 10). Idée de l'utilisateur : comme dans les gachas du genre, une animation par palier, choisie d'après le meilleur résultat du tirage. Hors périmètre : son."

## Contexte

Depuis 001, un appui sur « Tirer » affiche aussitôt les cartes de résultat : le
joueur apprend tout d'un coup, un Ultra rare arrive comme un Commun. Cette feature
intercale une **mise en scène** entre l'appui et les cartes : un moment de suspense,
puis une animation dont l'intensité finit par annoncer **la meilleure rareté du tirage**,
parfois après une fausse piste (montée surprise ou faux espoir). Le
joueur devine ce qu'il a eu avant de voir les cartes, et un tirage rare devient un
événement.

## Clarifications

### Session 2026-10-20

- Q: Combien de paliers d'animation ? → A: 5, un par rareté (Commun, Peu commun, Rare, Légendaire, Ultra rare), chacun dans sa couleur.
- Q: L'animation peut-elle faire une « fausse piste » (commencer plus bas, puis monter au vrai palier) ? → A: Oui, parfois.
- Q: Au ×10, comment apparaissent les 10 cartes ? → A: Une par une, rapidement ; la meilleure se retourne en dernier, avec un temps fort ; un appui les retourne toutes.
- Q: À quelle fréquence la fausse piste ? → A: 1 fois sur 4, pour les tirages Rare ou mieux ; elle démarre un palier en dessous, puis monte au vrai palier.
- Q: (proposé par l'utilisateur) Une fausse piste dans l'autre sens ? → A: Oui, en plus de la montée : 1 fois sur 10, un tirage dont le meilleur résultat est Rare fait croire à un Légendaire ou un Ultra rare, puis retombe sur Rare. Les deux fausses pistes coexistent.
- Q: Le leurre fait croire à quel palier ? → A: Sans réponse de l'utilisateur, défaut retenu : Légendaire 4 fois sur 5, Ultra rare 1 fois sur 5 (même une animation Ultra garde un petit doute).

### Session 2026-10-26 (révision)

- Demande de l'utilisateur : « les animations sont sommaires ; plus de particules, une révélation un à un des résultats, avec une légère animation par résultat selon la rareté ; quelque chose qui incarne le suspense, sans que ce soit trop long. Fais des propositions, on corrigera le tir. »
- Q: Comment incarner le suspense sans allonger ? → A (proposition de Claude, en attente du retour de l'utilisateur) : le temps se mérite. Un Commun passe vite ; plus un résultat est rare, plus sa carte tremble et s'allume avant de se retourner. Pendant le suspense, l'orbe aspire des particules et un halo bat de plus en plus vite.
- Q: Quelles particules ? → A (proposition) : explosion à chaque palier, plus nombreuse et plus variée avec le rang (points, puis étoiles dès Rare, confettis dès Légendaire, arc-en-ciel pour l'Ultra rare) ; pluie d'étoiles plein écran pour Légendaire et Ultra rare ; au leurre, l'énergie s'éteint et retombe.
- Q: Et la carte vedette du ×10 ? → A (proposition) : les cartes déjà vues s'assombrissent, son dos bat comme un cœur (plus longtemps si elle est plus rare), puis elle éclate.



### User Story 1 - Deviner son meilleur résultat avant les cartes (Priority: P1)

Après un appui sur « Tirer », le joueur voit une animation dont le palier (couleur,
ampleur) correspond à la meilleure rareté obtenue, puis les cartes de résultat.

**Why this priority**: c'est le mécanisme de la feature ; sans lui, rien ne change
pour le joueur.

**Independent Test**: un tirage ×1 dont le résultat est Légendaire joue l'animation
du palier Légendaire ; un tirage ×1 Commun joue celle du palier Commun ; dans les
deux cas les cartes apparaissent ensuite, identiques à celles de 001–002.

**Acceptance Scenarios**:

1. **Given** un tirage ×1 dont le résultat est Rare, **When** l'animation se joue, **Then** elle est celle du palier Rare.
2. **Given** un tirage ×10 dont le meilleur résultat est Légendaire, **When** l'animation se joue, **Then** elle est celle du palier Légendaire, quels que soient les 9 autres résultats.
3. **Given** l'animation terminée, **When** les cartes apparaissent, **Then** elles montrent les mêmes résultats, badges et éclats qu'avant cette feature.
4. **Given** deux tirages de même meilleure rareté, **When** on compare la fin de leurs animations, **Then** c'est le même palier final (fausses pistes mises à part, US3–US4) ; deux paliers différents se distinguent sans lire de texte.

---

### User Story 2 - Passer l'animation (Priority: P1)

Le joueur qui enchaîne les tirages peut écourter la mise en scène d'un appui et voir
directement les cartes.

**Why this priority**: une animation imposée à chaque tirage lasse vite ; c'est la
condition pour que la feature reste agréable au centième tirage.

**Independent Test**: pendant l'animation, un appui n'importe où affiche
immédiatement les cartes, sans rien changer aux résultats.

**Acceptance Scenarios**:

1. **Given** une animation en cours, **When** le joueur touche l'écran, **Then** les cartes de résultat s'affichent aussitôt.
2. **Given** une animation passée, **When** les cartes s'affichent, **Then** elles sont identiques à celles d'une animation regardée jusqu'au bout.
3. **Given** une animation en cours, **When** le joueur touche l'emplacement d'un bouton de l'écran de tirage, **Then** aucun tirage ni aucune fenêtre ne part.

---

### User Story 3 - Être surpris par une montée de palier (Priority: P2)

De temps en temps, l'animation d'un tirage Rare ou mieux démarre un palier en
dessous, puis monte au vrai palier : un départ modeste peut encore réserver une
surprise.

**Why this priority**: donne du relief au suspense, mais l'animation de palier (US1)
fonctionne déjà sans.

**Independent Test**: sur un grand nombre de tirages Rare ou mieux, environ 1 sur 4
démarre un palier en dessous puis monte au vrai palier ; aucun tirage Commun ou Peu
commun n'en fait, et tous finissent sur leur vrai palier.

**Acceptance Scenarios**:

1. **Given** un tirage dont le meilleur résultat est Légendaire et une fausse piste tirée, **When** l'animation se joue, **Then** la révélation commence au palier Rare puis monte au palier Légendaire.
2. **Given** un tirage dont le meilleur résultat est Peu commun, **When** l'animation se joue, **Then** elle ne fait jamais de fausse piste.
3. **Given** une fausse piste, **When** l'animation se termine, **Then** le dernier palier montré est le vrai.

---

### User Story 4 - Être déçu par un faux espoir (Priority: P2)

De temps en temps, un tirage dont le meilleur résultat n'est que Rare fait d'abord
croire à un Légendaire, voire à un Ultra rare, puis retombe sur Rare.

**Why this priority**: c'est ce qui rend une animation Légendaire ou Ultra
palpitante jusqu'au bout ; l'animation de palier (US1) fonctionne déjà sans.

**Independent Test**: sur un grand nombre de tirages au meilleur résultat Rare,
environ 1 sur 10 monte au palier Légendaire ou Ultra puis retombe sur Rare ; aucun
tirage d'une autre rareté ne fait ce leurre.

**Acceptance Scenarios**:

1. **Given** un tirage au meilleur résultat Rare et un leurre tiré, **When** l'animation se joue, **Then** la révélation montre le palier Légendaire (ou Ultra rare) puis retombe visiblement sur le palier Rare.
2. **Given** un tirage au meilleur résultat Légendaire, Ultra rare, Commun ou Peu commun, **When** l'animation se joue, **Then** elle ne fait jamais de leurre.
3. **Given** un leurre, **When** l'animation se termine, **Then** le dernier palier montré est Rare et les cartes sont celles du vrai tirage.

---

### User Story 5 - Découvrir les cartes du ×10 une par une (Priority: P2)

Au ×10, les cartes se retournent rapidement l'une après l'autre ; la meilleure se
retourne en dernier, avec un temps fort.

**Why this priority**: prolonge le suspense sur le tirage le plus cher, mais le ×10
est déjà exploitable avec la seule animation de palier (US1).

**Independent Test**: après l'animation d'un ×10, les cartes se retournent une à
une, la meilleure en dernier ; les 10 finissent visibles, à la même place qu'en 001.

**Acceptance Scenarios**:

1. **Given** l'animation d'un ×10 terminée, **When** les cartes apparaissent, **Then** elles arrivent face cachée, à leur place habituelle, et se retournent une à une dans l'ordre du tirage, la meilleure étant gardée pour la fin.
2. **Given** la dernière carte retournée, **When** l'écran se fige, **Then** les 10 sont visibles avec le bouton OK, comme en 001.
3. **Given** des cartes encore face cachée, **When** le joueur touche l'écran, **Then** toutes se retournent immédiatement.
4. **Given** plusieurs résultats de la meilleure rareté, **When** les cartes se retournent, **Then** une seule est gardée pour la fin (la dernière tirée de cette rareté).

---

### Edge Cases

- **Résultat forcé par le pity ou par la garantie du ×10** : l'animation est celle de la rareté réellement obtenue ; elle ne révèle pas *pourquoi* (le badge « Garanti ! » de la carte le fait).
- **×10 sans rien au-dessus du Rare garanti** : palier Rare, jamais en dessous (la garantie de 001 l'assure).
- **Fermeture du jeu pendant l'animation** : les résultats sont déjà sauvegardés (001, FR-011) ; à la réouverture, ils figurent dans la progression, sans rejouer l'animation.
- **Appuis répétés sur « Tirer »** : un seul tirage part ; pendant l'animation, l'écran de tirage ne répond pas.
- **Plusieurs paliers dans un ×10** (un Légendaire et un Ultra rare) : seul compte le meilleur (Ultra rare).
- **Fausse piste d'un ×10 au palier Rare** : elle démarre au palier Peu commun, alors qu'un ×10 finit toujours au moins Rare ; le joueur attentif sait donc qu'elle va monter. Accepté : la règle reste la même au ×1 et au ×10.
- **Leurre au ×10** : le meilleur résultat d'un ×10 est Rare la plupart du temps ; c'est donc surtout au ×10 que le joueur verra des leurres. Accepté.
- **Appui pendant un leurre ou une montée** : comme toute animation, elle est passée et les cartes s'affichent (FR-006).
- **Appui pendant le retournement des cartes du ×10** : toutes se retournent ; un second appui ne ferme pas la fenêtre (seul OK la ferme, comme en 001).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Tout tirage réussi (×1 ou ×10) MUST jouer une animation avant les cartes de résultat ; un tirage refusé (pièces insuffisantes) n'en joue aucune.
- **FR-002**: L'animation MUST comporter une phase de **suspense**, identique pour tous les paliers, puis une phase de **révélation** propre au palier.
- **FR-003**: Il y a **5 paliers**, un par rareté. Le palier MUST être celui de la **meilleure rareté** du tirage : celle du résultat au ×1, la plus haute des 10 au ×10.
- **FR-004**: Deux paliers différents MUST se distinguer sans lire de texte (couleur de la rareté, ampleur de l'effet) ; plus le palier est haut, plus la révélation est marquée.
- **FR-005**: L'animation MUST **finir sur le vrai palier** ; seuls les déroulés de FR-011 et FR-012 montrent un autre palier avant lui. Les taux, les cartes et les règles restent exacts (constitution IV) : les fausses pistes sont de la mise en scène et ne changent rien au tirage.
- **FR-006**: Un appui pendant l'animation MUST la passer et afficher directement toutes les cartes, déjà retournées (×10 compris) ; les résultats affichés sont les mêmes que sans appui.
- **FR-007**: Pendant l'animation et le retournement des cartes, les éléments de l'écran de tirage MUST NOT réagir (tirage, collection, taux, recommencer).
- **FR-008**: Au ×10, les cartes MUST arriver face cachée à leur place habituelle et se retourner une à une, dans l'ordre du tirage, sauf la meilleure, retournée en dernier avec un temps fort (si plusieurs résultats ont la meilleure rareté, la dernière tirée). Une carte ne bouge qu'une fois la précédente retournée. Un appui MUST les retourner toutes aussitôt. Au ×1, la carte apparaît directement après l'animation, avec l'éclat de sa rareté (FR-014).
- **FR-009**: L'animation MUST ne rien changer aux règles : résultats, débit, pity, éclats et sauvegarde sont ceux de 001–003, décidés et sauvegardés **avant** qu'elle commence.
- **FR-010**: L'animation complète (suspense + révélation, fausses pistes comprises) MUST durer au plus 3 s pour le palier le plus bas et au plus 5 s pour le plus haut ; le retournement des 10 cartes MUST durer au plus 4 s.
- **FR-011**: Pour un palier Rare ou plus, la révélation MUST faire une **fausse piste** avec une probabilité de 1/4 : elle démarre au palier juste en dessous, puis monte au vrai palier. Les paliers Commun et Peu commun n'en font jamais. La fausse piste ne change rien aux résultats.
- **FR-012**: Pour le palier Rare, la révélation MUST faire un **leurre** avec une probabilité de 1/10 : elle montre le palier Légendaire (4 fois sur 5) ou Ultra rare (1 fois sur 5), puis retombe sur le palier Rare. Les autres paliers n'en font jamais. Pour un palier Rare, montée (FR-011) et leurre s'excluent : 1/10 de leurre, 1/4 de montée, le reste direct.

- **FR-013** *(révision 2026-10-26)*: L'animation MUST comporter des particules : aspirées par l'orbe pendant le suspense (sans couleur de palier), en explosion à chaque palier montré (plus nombreuses et plus variées avec le rang ; une fausse piste explose comme un vrai palier), en pluie plein écran pour Légendaire et Ultra rare. Au leurre, les particules du faux palier s'éteignent avant le vrai.
- **FR-014** *(révision 2026-10-26)*: Chaque carte retournée MUST avoir un éclat propre à sa rareté (particules, rebond, onde dès Rare). À partir de Rare, son dos tremble et prend la couleur de la rareté avant de se retourner, d'autant plus longtemps que la rareté est haute ; un Commun ou un Peu commun se retourne sans attendre. Avant la vedette, les autres cartes s'assombrissent et son dos bat, plus longtemps si elle est plus rare. Sur l'écran final, les cartes Légendaire et Ultra rare scintillent.
- **FR-015** *(révision 2026-10-26)*: Un ×10 sans rien au-dessus du Rare MUST se retourner en 3,5 s au plus ; si les créneaux des cartes rares dépassent la borne de FR-010 (4 s), les cartes ordinaires accélèrent et la vedette garde son temps fort.

### Key Entities

- **Palier de révélation** : niveau de mise en scène, déduit de la meilleure rareté d'un tirage ; porte une couleur (celle de la rareté) et une intensité.
- **Déroulé de révélation** : le palier de départ (vrai palier, ou celui du dessous en cas de fausse piste), le vrai palier et, au ×10, l'ordre de retournement des cartes.

Aucune donnée nouvelle à sauvegarder : le palier se déduit des résultats.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Dans 100 % des tirages, le dernier palier joué correspond à la meilleure rareté obtenue.
- **SC-002**: Un joueur qui passe l'animation voit ses cartes moins d'une demi-seconde après son appui.
- **SC-003**: Un tirage regardé jusqu'au bout ne dépasse jamais 5 s avant l'apparition des cartes (FR-010).
- **SC-004**: Les résultats, le solde, le pity et les éclats après un tirage sont identiques avec ou sans animation passée.
- **SC-005**: Sur l'écran de référence (portrait 360 × 640), chaque palier est reconnaissable à sa couleur et à son ampleur, sans texte.
- **SC-006**: Sur 10 000 tirages Rare ou mieux, la part de montées (FR-011) est de 25 % (à la marge statistique près) ; elle est nulle pour Commun et Peu commun.
- **SC-007**: Sur 10 000 tirages au meilleur résultat Rare, la part de leurres (FR-012) est de 10 %, dont un cinquième en Ultra rare (à la marge statistique près) ; elle est nulle pour les autres paliers.

## Assumptions

- Pas de son ni de vibration : le son est hors périmètre de la roadmap.
- Pas de réglage pour désactiver l'animation : l'appui pour passer (FR-006) en tient lieu.
- L'animation part de l'orbe de l'écran de tirage et utilise les couleurs de rareté existantes ; la DA reste provisoire.
- Le leurre ne concerne que le palier Rare (« tu penses avoir un Légendaire, tu n'as qu'un Rare ») ; pas de leurre pour Commun et Peu commun.
- Le badge « Nouveau ! » et les éclats restent sur les cartes ; l'animation n'annonce ni la nouveauté ni le doublon.
- Les cartes de résultat et leur contenu sont ceux de 001–003 ; seule leur apparition change.
- Un échange d'éclats (003) n'est pas un tirage : sa carte « Nouveau ! » s'affiche sans animation, comme aujourd'hui.
