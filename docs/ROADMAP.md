# Roadmap

Un mécanisme à la fois (constitution, principe I). Une ligne passe dans « En cours »
quand on lance `/speckit-specify`, et dans « Fait » quand la PR d'implémentation est
mergée et jouable.

## En cours

- **Écran vivant** (révisions de 007 et 005, 2026-11-09) : ambiance animée de l'écran de
  tirage (orbe qui lévite, lueurs, halo des tirages payables, montants qui défilent,
  bandeau qui glisse, fenêtres en fondu) et sons d'interface. Aucune règle ne change.

## Ensuite — le gacha

Ordre prévu. Chaque ligne = une spec, un mécanisme.

| # | Feature | Le joueur peut… | Hors périmètre |
|---|---------|-----------------|----------------|
| 001 | **Tirage** | dépenser une monnaie pour un tirage ×1 ou ×10 (×10 moins cher, un Rare garanti), voir les taux par rareté, voir ce qu'il a obtenu. Sa monnaie et ses personnages/créatures sont sauvegardés. | pity, valeur des doublons, animation, collection |
| 002 | **Pity & doublons** | savoir combien de tirages le séparent de la garantie, et recevoir quelque chose d'utile pour un doublon. | ce que vaut un personnage en jeu |
| 003 | **Collection** | parcourir les personnages obtenus et voir ceux qui lui manquent. | tri avancé, fiche détaillée |
| 004 | **Révélation** | vivre le tirage : suspense, puis mise en scène qui dépend de la **meilleure rareté obtenue** (au ×10, le meilleur des 10). | son |
| 005 | **Son** | entendre la révélation (suspense, un son par palier, montée, rire diabolique du leurre, cartes) et couper le son. | musique, volume, vibration |

Idée de l'utilisateur pour 004 (2026-10-20), à reprendre en `/speckit-clarify` : comme
dans les gachas du genre, **une animation par palier**, choisie d'après le meilleur
résultat du tirage ; le joueur devine ce qu'il a eu avant de voir les cartes.

## Plus tard — non spécifié, ne pas coder

- Gameplay qui fait gagner la monnaie (et donne une utilité aux personnages).
  **Idée de l'utilisateur (2026-11-10), à garder comme idée tant que le gacha n'est pas
  fini** : faire évoluer le gacha en **roguelike de score**, pas d'aventure (ni PV ni
  dégâts). Une partie enchaîne des étapes ; à chacune, il faut atteindre un **nombre de
  points** pour continuer, et avancer rapporte des tirages. Le score tient surtout à la
  **chance**, et des **augmentations** trouvées en cours de partie en donnent davantage
  (principe proche de Balatro : seuils de score, modificateurs qui s'empilent). Questions
  pour `/speckit-clarify` le moment venu : d'où viennent les points (les personnages
  tirés ? un tirage en partie ?), rôle de la collection dans le score, forme des
  augmentations, ce qui reste d'une partie à l'autre, lien avec la monnaie actuelle.
  Remplacera l'ancien prototype roguelike-combat (`legacy-v1`), écarté par l'ADR 0002.
- Univers et DA définitive, visuels réels des personnages, nom du jeu.
- Événements / bannières limitées dans le temps (mécanique de pression : ADR requis).
- Progression d'un personnage (niveaux, étoiles, éveil).
- Musique de fond (après l'univers définitif).
- Mise en ligne jouable sur téléphone (sous-domaine `decli.de` en IaC, bloc Caddy, déploiement au merge).
- Application mobile (Capacitor).
- Serveur : compte, synchronisation, tirages côté serveur (ADR requis).
- Monnaie premium, achats réels (ADR requis).

## Fait

- 2026-11-08 — **Police embarquée** (ADR 0008) : Fredoka SemiBold remplace Comic Sans MS,
  jugée « trop cheap » par l'utilisateur ; même rendu sur tout appareil, CI comprise.
- 2026-11-08 — **Révision de 003** (retours de l'utilisateur en jeu) : un appui sur un
  élément possédé ouvre sa fiche (illustration en grand, exemplaires, phrase) ; le total
  « N / 20 » n'est plus que dans la collection ; le texte du bandeau de bannière tient
  dans son cadre quelle que soit la police de l'appareil (« non obtenu »).
- 2026-11-08 — **007 Illustrations** et **révision 2 de 004** : une illustration cartoon
  détaillée par élément (SVG faits main sous une charte, ADR 0007), cartes illustrées,
  collection en portraits et silhouettes, portrait de la vedette, présentation plein écran
  des Légendaires et Ultra rares, écran habillé (ciel de rêve, orbe, icônes, emblèmes, dos
  de carte), rendu net à toute densité ; révélation de nuit, cercle magique, orbe qui se
  fissure trois fois puis éclate, temps figé, deux fois plus de particules.
- 2026-10-26 — **Révision de 004** : particules faites main (aspiration pendant le
  suspense, explosion par palier, pluie dès Légendaire), cartes du ×10 une à une avec
  anticipation selon la rareté, vedette qui bat pendant que les autres s'assombrissent,
  éclat de la carte du ×1 (FR-013 à FR-015). Validée par l'utilisateur en jeu.
- 2026-10-26 — **006 Bannières** : bannière standard + une par Légendaire / Ultra rare,
  permanentes, au choix (◀ ▶) ; 50/50 sur la vedette, garantie après un échec, propre à
  chaque bannière ; pity des 40 commun ; taux de la vedette affichés ; sauvegarde v3.
- 2026-10-20 — **005 Son** : bruitages synthétisés de la révélation (suspense, un son
  par palier, montée, cartes), rire diabolique CC0 sur le leurre, bouton son mémorisé
  (`gacha.settings`, ADR 0006).
- 2026-10-20 — **004 Révélation** : animation avant les cartes, 5 paliers (un par
  rareté) selon la meilleure rareté du tirage ; montée surprise (1/4, Rare ou mieux) et
  leurre (1/10 sur un Rare) ; cartes du ×10 retournées une à une, la meilleure en
  dernier ; un appui passe tout.
- 2026-10-20 — **003 Collection** : les 20 éléments sur un écran (possédés ×N,
  manquants grisés avec leur coût), résumé par rareté ; l'échange d'éclats s'y fait
  directement (fusion avec la liste d'échange de 002).
- 2026-10-19 — **002 Pity & doublons** : Légendaire ou mieux au plus tard au 40ᵉ
  tirage (compteur visible), éclats sur chaque doublon, échange contre un élément
  manquant, sauvegarde v2.
- 2026-10-19 — **001 Tirage** : ×1 / ×10 (Rare garanti), taux affichés, sauvegarde
  versionnée, recommencer. 20 personnages et créatures provisoires.
- 2026-10-19 — Remise à zéro, Spec Kit, constitution 1.0.0, ADR 0001–0003.
  Ancien prototype : tag `legacy-v1`.
