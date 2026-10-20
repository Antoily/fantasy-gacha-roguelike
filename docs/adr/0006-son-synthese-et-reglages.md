# 0006 — Bruitages synthétisés, enregistrements CC0 tracés, réglages hors sauvegarde

- **Statut** : Accepté
- **Date** : 2026-10-20
- **Spec liée** : `specs/005-son/`

## Contexte

La 005 ajoute du son. La clarification impose des bruitages fabriqués par le jeu et un
rire diabolique enregistré, libre de droits. Le joueur doit pouvoir couper le son, et
ce choix doit survivre au rechargement **et** à « Recommencer », qui efface la partie
(ADR 0005 : une clé unique `gacha.save` pour tout l'état de la partie).

## Options envisagées

1. **Web Audio via le gestionnaire de son de Phaser** (synthèse par oscillateurs sur
   son `AudioContext`, fichiers par le chargeur de Phaser) — *Pour :* aucune
   dépendance, un seul contexte audio, déverrouillage au premier appui géré par Phaser.
   *Contre :* la synthèse est à écrire.
2. **Bibliothèque de synthèse** (Tone.js, jsfxr) — *Pour :* sons plus riches.
   *Contre :* une dépendance de plus pour une dizaine de bips.
3. **Réglage du son dans `gacha.save`** — *Contre :* « Recommencer » l'effacerait, et
   une préférence d'appareil n'est pas de l'état de partie : version + migration pour rien.

## Décision

- Bruitages : **synthèse Web Audio** sur le contexte de Phaser ; leurs « recettes »
  (notes, formes d'onde, durées) sont des données (`src/data/sounds.ts`).
- Enregistrements : fichiers dans `public/sounds/`, **CC0 uniquement**, chacun listé
  dans `public/sounds/CREDITS.md` (auteur, lien, licence, retouches). Ogg + MP3.
- Réglages joueur : clé **`gacha.settings`** distincte de `gacha.save`, JSON
  `{ "muted": boolean }`, lu défensivement (illisible ⇒ valeurs par défaut).
  « Recommencer » ne la touche pas.
- Aucun son ne doit pouvoir bloquer le jeu : contexte absent, fichier introuvable ⇒ muet.

## Conséquences

- Pas de dépendance nouvelle ; changer un bruitage = changer une donnée.
- Un son sous une autre licence que CC0 demande un nouvel ADR.
- La musique (feature future) réutilisera `gacha.settings` (un champ de plus, défaut
  si absent) et le même contexte audio.
