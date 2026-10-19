# Roadmap

Un mécanisme à la fois (constitution, principe I). Une ligne passe dans « En cours »
quand on lance `/speckit-specify`, et dans « Fait » quand la PR d'implémentation est
mergée et jouable.

## En cours

_Rien : prochaine étape, spécifier 002 Pity & doublons._

## Ensuite — le gacha

Ordre prévu. Chaque ligne = une spec, un mécanisme.

| # | Feature | Le joueur peut… | Hors périmètre |
|---|---------|-----------------|----------------|
| 001 | **Tirage** | dépenser une monnaie pour un tirage ×1 ou ×10 (×10 moins cher, un Rare garanti), voir les taux par rareté, voir ce qu'il a obtenu. Sa monnaie et ses personnages/créatures sont sauvegardés. | pity, valeur des doublons, animation, collection |
| 002 | **Pity & doublons** | savoir combien de tirages le séparent de la garantie, et recevoir quelque chose d'utile pour un doublon. | ce que vaut un personnage en jeu |
| 003 | **Collection** | parcourir les personnages obtenus et voir ceux qui lui manquent. | tri avancé, fiche détaillée |
| 004 | **Révélation** | vivre le tirage : suspense, puis mise en scène qui dépend de la rareté. | son |

## Plus tard — non spécifié, ne pas coder

- Gameplay qui fait gagner la monnaie (et donne une utilité aux personnages).
- Univers et DA définitive, visuels réels des personnages, nom du jeu.
- Bannières / événements (taux augmentés sur certains personnages).
- Progression d'un personnage (niveaux, étoiles, éveil).
- Son et musique.
- Mise en ligne jouable sur téléphone (sous-domaine `decli.de` en IaC, bloc Caddy, déploiement au merge).
- Application mobile (Capacitor).
- Serveur : compte, synchronisation, tirages côté serveur (ADR requis).
- Monnaie premium, achats réels (ADR requis).

## Fait

- 2026-10-19 — **001 Tirage** : ×1 / ×10 (Rare garanti), taux affichés, sauvegarde
  versionnée, recommencer. 20 personnages et créatures provisoires.
- 2026-10-19 — Remise à zéro, Spec Kit, constitution 1.0.0, ADR 0001–0003.
  Ancien prototype : tag `legacy-v1`.
