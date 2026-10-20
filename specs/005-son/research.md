# Research — 005 Son

## R1 — Où et comment jouer les sons

- **Décision** : Web Audio sur le contexte du gestionnaire de son de Phaser
  (`scene.sound`, `WebAudioSoundManager.context`) ; ADR 0006. Phaser déverrouille le
  contexte au premier appui, ce qui couvre la politique d'autoplay des navigateurs.
- Si le gestionnaire n'est pas Web Audio (repli HTML5 ou aucun son) : bruitages
  synthétisés muets, rire joué si possible ; aucune erreur (FR-008).

## R2 — Le rire diabolique

- **Décision** : « Evil Laugh 2 » d'AntumDeluge, OpenGameArt
  (<https://opengameart.org/node/129475>), **CC0**, 1,86 s, Ogg Vorbis 44,1 kHz.
  Écarté : « evil laugh » du même auteur (2,54 s, au-delà des 2 s de FR-010).
- Livré en Ogg (original) et MP3 (converti avec ffmpeg, pour Safari) ; le chargeur de
  Phaser choisit le format lisible. Provenance dans `public/sounds/CREDITS.md`.

## R3 — Calendrier des sons (pur)

- **Décision** : `revealCues(plan)` rend `{ at, cue }[]` à partir de `REVEAL_TIMING`
  (004) : `suspense` à 0 ; pour chaque palier montré, `tier:<rareté>` à son instant ;
  montée → `rise` au début de la transition ; leurre → `laugh` au début de la
  transition (l'effet qui se dégonfle). `flipCues(order)` : `card` pour chaque carte
  ordinaire, `star` pour la vedette, aux instants du retournement.
- **Pourquoi** : les règles « le rire seulement sur un leurre », « un son par palier »,
  « calé sur l'image » deviennent des tests Vitest, sans audio.
- La scène programme ces sons sur la `Sequence` de l'animation : passer l'animation
  (`seq.stop()`) annule les sons à venir ; `sfx.stopAll()` coupe ceux en cours.

## R4 — Bruitages synthétisés

- Recettes en données (`src/data/sounds.ts`) : suite de notes `{ freq, at, dur, wave,
  gain }` et glissandos `{ from, to }`.
  - `suspense` : glissando triangle 220 → 660 Hz sur 900 ms, montée de volume.
  - `tier:*` : arpèges en do majeur, plus longs et plus aigus avec le rang : Commun 1
    note, Peu commun 2, Rare 3, Légendaire 4 + accord tenu, Ultra rare 6 + scintillement.
  - `rise` : glissando carré 300 → 1 200 Hz, 250 ms.
  - `card` : bip triangle 880 Hz, 40 ms. `star` : carillon sol5 → do6, 300 ms.
- Enveloppe attaque 5 ms / relâche 60 ms pour éviter les clics. Volume global 0,25.

## R5 — Bouton son et réglage

- Bouton carré 44 × 40 en haut à droite, sous l'en-tête (`GACHA.mute`) : haut-parleur
  avec ondes (actif) ou barré (coupé), dessiné avec les couleurs du thème.
- Réglage dans `gacha.settings` (ADR 0006), lu au démarrage par `BootScene`, écrit à
  chaque appui. Pendant une fenêtre, le bouton est sous le voile (FR-007 de 004).

## R6 — Vérification e2e

- Le casque de la CI n'entend rien : `Sfx` tient un **journal** des sons émis
  (`document.body.dataset.sounds`, séparés par des espaces, remis à zéro à chaque
  tirage), comme `dataset.modal`. Son coupé, rien n'est émis ni journalisé.
- Chromium est lancé avec `--autoplay-policy=no-user-gesture-required` pour que le
  contexte audio tourne en headless.
