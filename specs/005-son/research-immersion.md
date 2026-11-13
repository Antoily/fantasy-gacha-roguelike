# Critique son et game feel : gacha `gamingadd` (état `main` 4bad5d5, 2026-11-13)

Point de vue : sound design et « juice » de gacha mobile (Genshin, HSR, FGO, Blue Archive).
Périmètre fixé par l'utilisateur : **aucune feature nouvelle** (ni musique, ni son d'ambiance
continu, cf. 005 Assumptions, ni écran ou mécanisme) ; seulement des bruitages synthétisés (ou
CC0 tracés), du mixage, des enveloppes, de la synchro, du rythme et de petits effets.

## Méthode (reproductible)

Rien n'a été modifié dans le dépôt. Tout est dans
`/tmp/claude-0/-root/e64d6624-c5d8-5a90-9ac7-f0c018371509/scratchpad/critique-son/` :

- `render.mjs` : rend chaque recette de `src/data/sounds.ts` dans le **vrai moteur Web Audio de
  Chromium** (`OfflineAudioContext`, mêmes appels que `src/ui/sfx.ts` : oscillateurs à bande
  limitée, attaque 5 ms, relâche 60 ms, gain maître 0,25 ; rire décodé depuis le build). Il rend
  aussi les calendriers complets de `revealCues` / `flipCues` (direct ×5, montées, leurres, ×10).
  Mesures : crête dBFS, **LUFS momentané max** (pondération K, fenêtre 400 ms), centroïde
  spectral, enveloppe RMS par 20 ms. WAV écoutables dans `out/` (`cue-*.wav`, `tl-*.wav`),
  chiffres dans `out/metrics.json`. (Pas de ffmpeg sur ikka : FFT et WAV écrits en JS.)
- `play.mjs` : joue le build statique (copie dans `dist/` du scratchpad, `vite preview` port 4192,
  arrêté depuis) avec **horloge virtuelle** (rAF + `performance.now`), hasard scripté comme l'e2e,
  une capture à densité 2 par image de 1/30 s, et un `MutationObserver` qui date chaque entrée de
  `dataset.sounds`. Planches : `sheet-leg-suspense.png`, `sheet-leg-burst.png`, `sheet-sync.png`,
  `sheet-ten.png`, `sheet-transition.png`.

### Chiffres clés (LUFS momentané max, plus haut = plus fort)

| Bruitage | LUFS max | Crête dBFS | Durée audible | Remarque |
|---|---:|---:|---:|---|
| suspense (sirène) | −23,4 | −18,1 | 1 509 ms | niveau **plat** de 0 à 1 450 ms |
| crack | −34,6 | −21,7 | 129 ms | 11 LU sous la sirène qui le couvre |
| tier:common (60 % des tirages) | **−28,5** | −24,1 | 239 ms | 5 LU **sous** le suspense |
| tier:uncommon (27 %) | −23,4 | −16,6 | 349 ms | = suspense |
| tier:rare | −19,5 | −12,1 | 499 ms | |
| tier:legendary | −17,6 | −8,2 | 1 119 ms | visuel : 1 500 ms |
| tier:ultra | −15,8 | −8,2 | 1 440 ms | visuel : 2 000 ms |
| rise | −24,0 | −21,2 | 309 ms | gain plat, pas de crescendo |
| rire (fichier) | −19,4 | −8,4 | 1 862 ms | |
| card | −33,3 | −20,2 | 99 ms | |
| star (vedette ×10) | −21,0 | −12,2 | 479 ms | identique quelle que soit la rareté |
| tap / swish | −40,1 / −37,0 | | 103 / 149 ms | discrets, OK |
| coins | −34,9 | | 557 ms | |
| **shards** (interface) | **−27,5** | −21,0 | 498 ms | plus fort que card et tier:common |
| leurre ultra→rare (mix) | −15,1 | **−3,7** | | rire + accord du faux palier + Rare superposés |

## 1. Constat

### Ce qui marche

- **Synchro structurelle saine** : sons et image partagent les minuteries Phaser de la `Sequence`
  (`revealCues` / `flipCues` dérivés de `REVEAL_TIMING`) ; sur les captures, l'éclat et
  `tier:*` tombent sur la **même image** (×10 : image 91 = 3 033 ms, leurre : image 92). Passer
  annule bien ce qui restait à jouer.
- **Hiérarchie des paliers lisible** : 1, 2, 3, 4, puis 6 notes, puis nappe et cloches. Gradation
  propre de −28,5 à −15,8 LUFS. Aucune saturation (crête max −3,7 dBFS).
- **Temps figé** : la sirène s'arrête à 1 450 ms, 90 ms de vrai silence avant l'éclat. Bon réflexe.
- **Rire du leurre** calé au début du dégonflement : le gag fonctionne.
- Sons d'interface courts, sans clic à l'attaque (enveloppe 5 ms), bornes FR-011 tenues.

### Ce qui sonne pauvre

- **Tout est oscillateur nu** (carré, triangle, scie, sinus), sans bruit, filtre, décroissance ni
  espace. Les enveloppes sont des « orgues » (attaque, **plateau plat**, relâche linéaire 60 ms) :
  aucun son percussif (craquement, carte, pièce) n'a l'attaque-décroissance qui fait « pop ». Le
  `swish` est un sinus glissé (un « bloop », pas un souffle) ; le `crack` n'a pas de bruit de verre.
- **Le commun (60 % des tirages) est le son le plus pauvre** : un seul carré C5 de 180 ms à
  −28,5 LUFS, plus faible que la montée qui le précède. Commun et Peu commun (87 % des tirages)
  retombent sous le niveau du suspense : l'effort d'anticipation n'est pas payé.
- **Pas d'impact à l'éclat** : l'image fait éclater l'orbe (éclats de verre, flash, secousse
  4 × 40 ms dès Légendaire), mais le son commence par une note carrée au **même niveau que la
  sirène** (−23 dB RMS) et n'atteint son maximum que 280 ms plus tard (`tl-direct-legendary`).
  Ni transitoire, ni grave, ni verre : l'image frappe, le son arrive en douceur.
- **Mono et sec** : pas de panoramique (les 10 cartes sur deux colonnes), pas de réverbération ;
  sur les gros paliers, le côté « chiptune sec » contraste avec la mise en scène nocturne.

### Ce qui est trop fort, ou mal mixé

- **`shards` (interface) à −27,5 LUFS** : plus fort que `card` (−33,3) et `tier:common` (−28,5).
  Le test « interface sous le tirage » compare des **gains de note**, pas l'énergie perçue :
  trois sinus de 220 ms vers 2–2,6 kHz (zone la plus sensible de l'oreille) passent devant un
  triangle de 40 ms à gain plus élevé.
- **Retour à l'écran après OK** : `tap` + `coins` + `shards` partent dans la même image (−26,7
  LUFS) ; pour un doublon commun, **le retour au menu sonne plus fort que le tirage**.
- **Leurre** : l'accord triomphal du faux palier tient jusqu'à +1 120 ms, donc il sonne encore
  sous le rire (+700 ms), puis le vrai `tier:rare` (+1 000 ms) arrive par-dessus le rire. Crête
  −3,7 dBFS, mélange confus au moment du gag. Même chevauchement à la montée Légendaire → Ultra :
  la nappe du faux Légendaire déborde sur `rise` et sur l'Ultra.
- **Clic à l'appui qui passe** : `stopAll()` fait `osc.stop()` à pleine amplitude (sirène jusqu'à
  0,125 de crête) et `laugh.stop()` coupe net. C'est un saut à −18 dBFS, audible à chaque passage.
  Même chose quand on coupe le son pendant que des pièces tintent.
- **Sens inversé des pièces** : `coins` (le si-mi « gain » des jeux vidéo, montant) joue au
  **débit** du tirage.

### Ce qui est mal synchronisé

- **Cartes ×10** : `card` part au **début** du retournement (`s.at + anticipation`), mais la face
  n'apparaît qu'à mi-tour (`turn/2` = 82 à 180 ms plus tard). Capture `sheet-ten.png` : son à
  l'image 137, carte vide (tranche) à 138, face à 139. Le tic de 40 ms est éteint quand l'éclat
  de la carte arrive.
- **Vedette** : même décalage (`star` au début du tour, face 180 ms plus tard). Les deux notes
  G5-C6 sont déjà jouées quand la carte se montre.
- **Battements de cœur muets** : six pulsations du halo pendant le suspense (480, 736, 960, 1 136,
  1 280, 1 392 ms), deux ou trois battements du dos de la vedette : l'image bat, le son non.
- **Fissures noyées** : 720, 1 040 et 1 312 ms. L'image donne un à-coup et projette du verre,
  l'enveloppe RMS ne bouge que de 1 dB.
- **Transition révélation → résultats** : coupe franche nuit → **une image du menu clair** →
  panneau crème (`sheet-transition.png`, images 135-137). Le fondu de 120 ms de `openModal`
  part de l'écran de tirage. Aucun son ne couvre ce passage.

### Ce qui manque de retour (temps morts)

- **Présentation plein écran (Légendaire / Ultra) totalement muette** : c'est le moment de
  récompense n° 1 d'un gacha (l'« entrée » du personnage), avec illustration qui surgit, 70 à
  100 particules, nom qui rebondit. Ici : silence.
- **Fin des paliers hauts** : le son s'éteint à 1 120 ms (Légendaire) ou 1 440 ms (Ultra), mais
  l'image tient 1 500 ou 2 000 ms, avec une pluie d'étoiles. Les 380 à 560 ms de fin sont
  muettes et presque immobiles (`sheet-leg-burst.png`, images 120 à 138).
- **Pause et cœur de la vedette** : de la dernière carte ordinaire au retournement de la vedette,
  **1,1 s de silence complet** (×10, de 1 640 à 2 720 ms), au moment de plus forte tension.
- **Anticipation des cartes rares** (tremblement et lueur pendant 130 à 520 ms) : muette.
- **Carte du ×1** (« Tu as obtenu… », éclat de particules) : muette.
- **Entrée dans la nuit** (fondu de 300 ms à l'appui sur « Tirer ») : seule la sirène démarre,
  à 220 Hz. Sur un haut-parleur de téléphone (coupure vers 300-500 Hz), le triangle à 220 Hz est
  quasi inaudible les premières 400 ms.

## 2. Retouches proposées (15, en 3 lots)

Le **lot A** est le socle (moteur et mixage, sans changement du journal) et passe en premier.
Les **lots B et C** sont indépendants entre eux (deux worktrees, `E2E_PORT` différents).
Niveaux cibles mesurés avec `render.mjs` (LUFS momentané max) : suspense −22 en fin de montée ;
commun −21, peu commun −20, rare −18, légendaire −16, ultra −14 ; vedette = palier −2 ;
carte −27 ; interface ≤ −34 ; crête ≤ −1 dBFS.

### Lot A : moteur et mixage (`sfx.ts`, type `Tone` de `sounds.ts`) ; journal inchangé

**A1. Bruit, filtres et décroissance dans les recettes** (M, **P1**)
- *Moment* : tous (prérequis de B et C).
- *Effet* : `Tone` gagne `wave: 'noise'` (un `AudioBuffer` de bruit blanc de 1 s, généré **une
  fois** avec `mulberry32(0x5eed)` de `src/logic/rng.ts`, lu en boucle avec un départ décalé),
  `filter?: { type: 'lowpass'|'highpass'|'bandpass'; freq; to?; q? }` (un `BiquadFilterNode`
  avec rampe exponentielle comme pour `freq`), `decay?: ms` (après l'attaque :
  `setTargetAtTime(peak*sustain, start+attack, decay/1000/3)`, sustain 0 par défaut pour les
  percussifs), `gainTo?` (crescendo linéaire sur `dur`), `release?` (sinon 60 ms) et
  `detune?` (cents). La relâche passe de linéaire à `setTargetAtTime` (τ = release/4), plus
  naturelle.
- *Pourquoi* : sans bruit, pas de verre, de souffle ni de transitoire ; sans décroissance, pas de
  « pop ». C'est ce qui sépare un bip de bruitage d'un son de jeu.
- *Fichiers* : `src/data/sounds.ts` (types), `src/ui/sfx.ts`, `src/logic/soundCues.test.ts`
  (invariants : `decay > 0` pour les percussifs, aucune fréquence de filtre > 18 kHz).

**A2. Bus maître : limiteur, nouveaux niveaux, rire dans le bus, écho** (M, **P1** ; écho P2)
- *Effet* : toutes les voix → `bus` (Gain) → `DynamicsCompressor` (seuil −12 dB, knee 6,
  ratio 6, attaque 2 ms, relâche 150 ms) → `destination`. `SOUND_MASTER_GAIN` 0,25 → 0,32, le
  limiteur tenant les crêtes. Le **rire est joué par le lecteur** (`AudioBufferSourceNode` sur
  `scene.cache.audio.get('rire')`, qui est un `AudioBuffer` en Web Audio) et non plus par
  `scene.sound` : il passe par le même bus, `stopAll` le tient, et on peut le baisser (B5).
  Recalage : `shards` 0,14 → 0,06 (notes 220 → 120 ms, `decay` 90 ms) ; `coins` 0,08 → 0,07.
- *Pourquoi* : remettre l'interface sous le tirage **en énergie perçue** (aujourd'hui `shards`
  passe devant `card` et `tier:common`) et gagner environ 3 LU sur les paliers sans risque de
  saturation (le leurre est déjà à −3,7 dBFS).
- *Écho (P2, peut suivre à part)* : départ auxiliaire pour `tier:*`, `star`, `rise`, le rire et
  `splash` (C3) : `DelayNode` 110 ms, réinjection 0,28 à travers un passe-bas à 3,5 kHz, retour
  à −14 dB (`send?: boolean` par recette). Ni `ConvolverNode` ni réponse impulsionnelle (pas
  de fichier, pas de hasard). Interface et cartes restent sèches, donc proches. La nuit et le
  cercle magique appellent un espace ; un écho sombre donne de la profondeur aux arpèges
  carrés sans changer leur identité rétro.
- *Fichiers* : `sfx.ts`, `sounds.ts`, `soundCues.test.ts` (voir Pièges : le test des gains).

**A3. Coupures propres et « étouffement » des queues** (S, **P1**)
- *Moment* : passer l'animation, couper le son, montée, leurre.
- *Effet* : `stopAll()` ne coupe plus net : rampe du gain à 0 en 25 ms
  (`cancelScheduledValues` puis `setTargetAtTime(0, now, 0.006)`), puis `stop(now + 0.03)`. Le
  compteur `live` est remis à 0 **tout de suite**. Groupes d'étouffement : chaque voix garde le
  nom de son bruitage ; `rise` et `laugh` atténuent en 60 ms les voix encore actives de
  `tier:*` (le faux palier).
- *Pourquoi* : supprime le clic à −18 dBFS de chaque passage (SC-003 tenu : rien ne
  *commence* après l'appui) et désembourbe montée et leurre (la nappe du faux Légendaire ne
  traîne plus sous l'Ultra).
- *Fichiers* : `sfx.ts`.

### Lot B : révélation ×1 et ×10 (`sounds.ts`, `revealConfig.ts`, `reveal.ts`) ; journal inchangé

**B1. Suspense : souffle d'entrée, crescendo, cœur qui bat** (M, **P1**)
- *Moment* : 0 à 1 450 ms (les voix ajoutées restent dans la recette `suspense` : **aucune
  entrée ajoutée au journal**).
- *Effet* :
  1. **Nuit qui tombe** à 0 : bruit, passe-bas 3 000 → 300 Hz, 320 ms (le fondu dure 300 ms),
     gain 0,25, `decay` 200 ms.
  2. **Sirène** : `gain` 0,3 → `gainTo` 0,6 (crescendo réel, + 6 dB) ; couche scie à l'octave
     440 → 1 320 Hz, passe-bas 1,2 → 4 kHz, gain 0,05 → 0,15 (mordant audible sur
     haut-parleur de téléphone) ; `release` 20 ms (le temps figé devient 130 ms de vrai
     silence).
  3. **Battements** calés sur les pulsations du halo : sinus 150 → 60 Hz, 90 ms, `decay` 40 ms,
     plus un triangle à 1,2 kHz de 8 ms (le « toc » qu'un téléphone restitue), gains 0,35 → 0,6
     du 1ᵉʳ au 6ᵉ battement. Pour partager l'instant, déplacer
     `[0.3, 0.46, 0.6, 0.71, 0.8, 0.87]` de `reveal.ts` vers `REVEAL_TIMING.beats`, comme
     `cracks`, et passer 0,46 → 0,45 : le 2ᵉ battement (736 ms) tombe alors **sur** la 1ʳᵉ
     fissure (720 ms) au lieu de faire un *flam* de 16 ms.
- *Pourquoi* : aujourd'hui la montée est plate en niveau ; une montée doit grossir. Le cœur qui
  bat est le ressort d'anticipation le plus efficace, et l'image le montre déjà.
- *Fichiers* : `sounds.ts`, `revealConfig.ts`, `reveal.ts`, `soundCues.test.ts`.

**B2. Fissures qui claquent, de plus en plus fort** (S, **P1**)
- *Moment* : 720, 1 040, 1 312 ms.
- *Effet* : `crack` = transitoire de bruit passe-haut à 3 kHz (15 ms, `decay` 20 ms) + deux ou
  trois tintements de verre (sinus 4,2 / 5,1 / 6,3 kHz, 20 ms, `decay` 50 ms) + « toc » triangle
  180 Hz de 30 ms. Gain ×0,7 / ×0,85 / ×1 selon le rang de la fissure (paramètre de variante,
  cf. C1 ; ou trois recettes appelées `crack` dans le journal). La sirène s'efface de −4 dB
  pendant 80 ms à chaque fissure.
- *Pourquoi* : chaque fissure est un battement visuel (à-coup, éclats) ; à −34,6 LUFS sous une
  sirène à −23, elle ne s'entend pas. Objectif : crack ≥ sirène −3 LU.
- *Fichiers* : `sounds.ts`, `sfx.ts` (effacement), `soundCues.ts` (variante).

**B3. Impact à l'éclat, et un Commun qui récompense** (M, **P1**)
- *Moment* : chaque `tier:*`, à l'image où l'orbe éclate.
- *Effet* : une couche d'impact devant l'arpège, mise à l'échelle par le rang k (0 à 4) :
  - transitoire : bruit passe-haut 2 kHz, 0-20 ms, gain 0,4 + 0,1k, `decay` 15 ms ;
  - verre : bruit passe-bande 5 kHz (Q 2), 0 à (150 + 60k) ms, `decay` 80 ms, gain 0,15 + 0,04k ;
  - corps : sinus 140 → 48 Hz plus triangle 280 → 96 Hz (l'octave audible sur téléphone),
    160 + 40k ms, `decay` 60 ms, gain 0,4 + 0,1k ;
  - dès Légendaire : grondement, bruit passe-bas 180 Hz, 320 ms, **calé sur la secousse**
    (4 × 40 ms aller-retour = 320 ms), gain 0,3.
  Puis l'arpège avec `decay` (sustain 0,45) au lieu du plateau. **Commun revoicé** : impact k = 0,
  pincement triangle C6 (180 ms, `decay` 120 ms, 0,35) au-dessus du carré C5 adouci (passe-bas
  2,5 kHz, 0,2) : petit mais rond, cible −21 LUFS (+7,5 LU).
- *Pourquoi* : le pic sonore doit tomber dans les 30 premières ms, avec le flash, pas 280 ms
  après. 87 % des tirages (Commun et Peu commun) doivent « atterrir », pas retomber sous le
  suspense.
- *Fichiers* : `sounds.ts` (une fonction `impact(k)` qui produit des `Tone[]`).

**B4. Montée : un souffle qui aspire, puis le palier « monte d'un ton »** (S, P2)
- *Moment* : transition de 300 ms (`fakeStep` → vrai palier).
- *Effet* : `rise` = carré 300 → 1 200 Hz, gain 0,2 → 0,45, durée **290 ms** (finit pile sur
  l'éclat suivant) + bruit passe-haut 800 → 8 000 Hz, 0,05 → 0,3, 290 ms ; étouffement du faux
  palier (A3). Le vrai palier d'une montée est joué **transposé de +2 demi-tons** (×1,1225) :
  variante `transpose` portée par `revealCues` (champ facultatif du `SoundCue`).
- *Pourquoi* : la montée doit aspirer vers l'éclat (crescendo), et la modulation d'un ton est le
  signal universel du « encore mieux » ; aujourd'hui faux et vrai paliers sont dans la même
  tonalité et se fondent.
- *Fichiers* : `sounds.ts`, `soundCues.ts`, `sfx.ts`, `soundCues.test.ts`.

**B5. Leurre : la fanfare se dégonfle, puis le rire** (S, **P1**)
- *Moment* : `laugh` (début de la retombée, 300 ms).
- *Effet* : sur les voix encore actives du faux palier, effet « bande qui ralentit » :
  `frequency` → ×0,5 en 300 ms (rampe exponentielle) et gain → 0 en 300 ms, synchrone avec
  `fx` qui rétrécit (0,2) et les points qui tombent. Plus un pétillement : bruit passe-bas
  2 kHz → 200 Hz, 300 ms, 0,15. Rire : gain 0,8 → 0,65, et −6 dB en 80 ms à l'arrivée de
  `tier:rare` (+300 ms), pour que le Rare se lise sous la moquerie.
- *Pourquoi* : l'image se dégonfle, le son reste triomphal ; le « wah-wah » rend le gag lisible
  avant même le rire. Crête du leurre ramenée de −3,7 à environ −6 dBFS.
- *Fichiers* : `sfx.ts` (la logique d'étouffement d'A3, variante « tape stop » pour `laugh`).

**B6. Queues pailletées des paliers Légendaire et Ultra** (S, P2)
- *Moment* : de +400 ms à `final − 200` ms (pluie d'étoiles visible).
- *Effet* : tintements sinus sur la pentatonique de do aiguë (C7 2 093, D7 2 349, E7 2 637,
  G7 3 136, A7 3 520 Hz), 25 ms, `decay` 60 ms, gain 0,05 à 0,09, environ 10 par seconde
  (Légendaire) ou 16 (Ultra), envoyés dans l'écho (A2). Instants et hauteurs tirés **une fois au
  chargement du module** par `mulberry32` à graine fixe : ce sont des données, pas du hasard.
- *Pourquoi* : comble les 380 à 560 ms finales muettes et presque fixes ; la pluie d'étoiles
  s'entend enfin.
- *Fichiers* : `sounds.ts`.

### Lot C : cartes, présentation, interface

**C1. Cartes ×10 : son sur la face, en échelle montante, avec anticipation** (M, **P1**)
- *Moment* : chaque carte ordinaire.
- *Effet* : le jeton `card` reste dans le journal, mais `flipCues` le date au **début de
  l'anticipation** (`s.at`) et lui passe une variante `{ anticipation, turn, rank, index }`.
  La recette, calculée par une fonction pure `cardRecipe(v)` de `sounds.ts`, contient :
  - à 0, dès Rare : une **charge**, sinus 500 → 1 000 Hz, gain 0 → 0,15 sur `anticipation` ms ;
  - à `anticipation` : un **froissement** (bruit passe-bande 3 kHz, Q 1,5, 20 ms, 0,12) ;
  - à `anticipation + turn/2` (**la face**) : un pincement triangle sur une **échelle montante**
    (pentatonique G5 A5 C6 D6 E6 G6 A6 C7 D7 selon l'ordre de retournement), 60 ms,
    `decay` 50 ms, 0,35 ; Peu commun ajoute la quinte, Rare la tierce et un verre à 5 kHz de
    120 ms (avec l'onde visuelle) ;
  - panoramique −0,35 ou +0,35 selon la colonne (`StereoPannerNode`).
- *Pourquoi* : remet le son sur l'éclat de la carte (82 à 180 ms plus tard qu'aujourd'hui) ;
  l'échelle montante transforme un métronome de neuf tics identiques en élan vers la vedette ;
  l'anticipation des Rares cesse d'être muette.
- *Fichiers* : `soundCues.ts`, `sounds.ts`, `sfx.ts` (`play(cue, variant?)`, journal inchangé),
  `soundCues.test.ts` (l'attente `s.at + s.anticipation` devient `s.at`).

**C2. Vedette : le cœur bat, puis le palier frappe** (M, **P1**)
- *Moment* : `starPause` puis `starBeat` (200 à 860 ms) puis `starTurn` (360 ms).
- *Effet* : `star` part au début du battement (`s.at`), avec la variante
  `{ beat, beats: k ≥ 3 ? 3 : 2, turn, rank }`, et contient :
  - les battements de B1 à chaque `b × beat/beats` (mêmes instants que `heartbeat()`) ;
  - une tension (sinus 220 → 330 Hz, 0,1 → 0,3) ;
  - à `beat + turn/2` (la face) : `impact(k)` de B3, puis l'arpège du palier de la vedette,
    raccourci (paliers 1 à 3 notes de plus que la carte ordinaire), et dès Légendaire les
    paillettes de B6 pendant 1 200 ms (la pluie de `turn()`).
  Au début du battement, les autres cartes s'assombrissent (250 ms) : passe-bas sur l'écho, ou
  souffle descendant de 250 ms à 0,08.
- *Pourquoi* : supprime 1,1 s de silence au sommet de la tension ; aujourd'hui une vedette Ultra
  sonne exactement comme une vedette Rare (−21 LUFS), plus faible que le `tier:` du ×1.
- *Fichiers* : `soundCues.ts`, `sounds.ts`, `soundCues.test.ts`.

**C3. Présentation plein écran : la fanfare d'entrée** (M, P2 ; ajoute un jeton au journal)
- *Moment* : `playSplash` (Légendaire, Ultra).
- *Effet* : nouveau bruitage `splash` à l'ouverture : `impact(k)` ; accord « chœur » Cmaj9
  (C5 E5 G5 B5 D6) en paires de triangles désaccordés de ±6 cents, attaque 60 ms, sustain 0,5,
  `decay` 1 200 ms, release 400 ms, gain 0,12 par voix, dans l'écho ; à +260 ms (le nom qui
  rebondit) un pincement G6 → C7 ; Ultra ajoute les cloches C7 E7 G7 C8 (pas de 90 ms).
  Total ≤ 1,6 s. L'appui qui ferme la présentation (armé à 400 ms) l'éteint en 150 ms.
- *Pourquoi* : c'est le moment de récompense le plus fort du jeu, et il est muet.
- *Fichiers* : `sounds.ts`, `soundCues.ts` (`Cue`), `splash.ts`, `GachaScene.ts` (`onCue`),
  `tests/e2e/son.spec.ts`, **`specs/005-son/spec.md`** (nouvelle révision : un bruitage
  s'ajoute à la liste des Key Entities, constitution II).

**C4. Pièces et éclats qui disent le sens, glissement en souffle** (S, P2)
- *Moment* : retour à l'écran (`rollTo`), flèches de bannière.
- *Effet* : `coins` en variante `{ dir }` : **débit** = E6 → B5 descendant, deux fois, 50 ms,
  `decay` 40 ms ; **crédit** (Recommencer, échange) = le si-mi montant actuel. `shards` part
  **120 ms après** `coins` quand les deux défilent (ordre du journal inchangé :
  `coins shards`). `swish` = bruit passe-bande 800 → 3 000 Hz (Q 1,2), 90 ms, gain 0,12,
  plus un tic triangle 1,5 kHz à 85 ms (le bandeau qui se pose).
- *Pourquoi* : un son de gain au moment où l'on dépense brouille la boucle de récompense ;
  décaler les deux tintements évite leur masquage ; un glissement doit souffler.
- *Fichiers* : `sounds.ts`, `GachaScene.ts` (`rollTo` : sens connu par `to < from`), `sfx.ts`.

**C5. Passage révélation → cartes sans flash du menu** (S, P3)
- *Moment* : fin de la révélation, ouverture de `flip` ou `results`.
- *Effet* : pas de fondu `openModal` quand la fenêtre suit la révélation (comme pour
  `reveal`) ; à la place, un éclair blanc de 80 ms (alpha 0,6) et un souffle bref (bruit
  passe-bas 2 kHz → 400 Hz, 180 ms, 0,1), inclus en fin de recette du dernier palier, à
  `final[rarity] − 40` ms (journal inchangé). Le son ne sort qu'à la fin naturelle : un passage
  coupe tout (A3).
- *Pourquoi* : aujourd'hui, nuit, une image du menu clair, puis panneau crème : un sursaut
  visuel muet (capture, image 136).
- *Fichiers* : `GachaScene.ts` (`openModal`), `sounds.ts`.

**C6. Latence de sortie, casques Bluetooth** (M, P3)
- *Effet* : lire `ctx.outputLatency` (Chrome Android) ; s'il dépasse 40 ms, déclencher chaque
  minuterie de son `min(outputLatency, 150 ms)` plus tôt et la programmer à l'instant exact
  (`start = now + avance`). Les sons déjà programmés restent annulables (`stop` avant
  `start` = jamais joué).
- *Pourquoi* : en Bluetooth (150 à 250 ms), tous les sons arrivent après l'image ; c'est le
  premier défaut ressenti sur mobile, et le seul qu'aucune recette ne corrige.
- *Fichiers* : `reveal.ts` (`seq.at(c.at - avance)`), `sfx.ts`.

### Récapitulatif

| # | Retouche | Effort | Priorité | Journal `dataset.sounds` |
|---|---|:-:|:-:|---|
| A1 | Bruit, filtres, décroissance | M | P1 | inchangé |
| A2 | Bus maître, niveaux, rire dans le bus, écho | M | P1 | inchangé |
| A3 | Coupures sans clic, étouffement | S | P1 | inchangé |
| B1 | Suspense : souffle, crescendo, cœur | M | P1 | inchangé |
| B2 | Fissures | S | P1 | inchangé |
| B3 | Impact, Commun revoicé | M | P1 | inchangé |
| B4 | Montée aspirée, +2 demi-tons | S | P2 | inchangé |
| B5 | Dégonflement du leurre | S | P1 | inchangé |
| B6 | Queues pailletées | S | P2 | inchangé |
| C1 | Cartes : face, échelle, anticipation | M | P1 | inchangé (instants changés) |
| C2 | Vedette : cœur et impact | M | P1 | inchangé (instants changés) |
| C3 | Fanfare de la présentation | M | P2 | **+ `splash`** |
| C4 | Pièces, éclats, glissement | S | P2 | inchangé |
| C5 | Passage vers les cartes | S | P3 | inchangé |
| C6 | Latence Bluetooth | M | P3 | inchangé (horodatage avancé) |

B5 réutilise le mécanisme d'étouffement d'A3 : les livrer dans la même PR.

Ordre conseillé : A1 → A2 → A3 + B5 → B3 → B1 → C1 → C2 → B2, puis les P2.

## 3. Pièges

1. **Journal `dataset.sounds` = contrat de l'e2e** (`tests/e2e/son.spec.ts`, lignes 36, 39,
   44, 49, 53, 63, 73, 102, 128, 148, 150, 157, 164, 168). Toute nouvelle entrée ou tout
   changement d'ordre d'un tirage oblige à mettre à jour ces chaînes **dans la même PR**. Les
   retouches ci-dessus sont conçues pour ne rien ajouter au journal (couches intégrées aux
   recettes existantes, variantes passées en paramètre de `play(cue, variant?)` sans être
   écrites dans le journal), sauf **C3** : `… tier:ultra splash` au ×1 Légendaire / Ultra
   (lignes 36 et 128 ; `waitModal` passe la présentation, donc le jeton est bien écrit) et
   `… card×9 star splash` au ×10 avec vedette Légendaire (ligne 63). Le `tap` de « Tirer » est
   effacé par `resetLog()` : ne pas déplacer l'appel du son de bouton **après** l'action.
2. **Aucun `Math.random`** dans le son : l'e2e remplace `Math.random` par une file
   (`installRng`). Un bruit blanc ou des paillettes tirés avec `Math.random` (ou
   `Phaser.Math.*`) **consommeraient les valeurs scriptées** et décaleraient tirage et
   déroulé de tous les tests. Bruit et paillettes : `mulberry32` à graine fixe, calculés une
   fois (buffer et tableau d'instants).
3. **Bornes de `soundCues.test.ts`** :
   - `SOUND_RECIPES.suspense.at(-1)!.dur === T.suspense - T.freeze` : la sirène doit **rester
     la dernière voix** du tableau `suspense` (souffle et battements de B1 placés avant), et
     aucune voix ajoutée ne doit déborder dans le temps figé (fin ≤ 1 450 ms, relâche
     comprise ; à ajouter au test).
   - « interface plus discrète que le tirage » compare le **gain de chaque note** de
     l'interface au plus petit gain de `tier:common`, `card` et `star`. Ajouter une couche
     discrète (froissement à 0,12, paillette à 0,05) à ces recettes fait échouer le test, ou
     oblige à baisser l'interface sans raison. Remplacer cette comparaison par une **énergie**
     (Σ gain² × durée, ou mieux le LUFS de `render.mjs`, qui montre que `shards` viole déjà
     la règle) avant d'enrichir les recettes. Le valider par mutation (`scripts/mutate.sh`).
   - `UI_SOUND_LIMITS` mesure `at + dur` **sans la relâche** : avec `release` et `decay` par
     note, borner la vraie fin audible (≤ 100 ms pour `tap` et `swish`, FR-011).
   - `flipCues` : l'attente `s.at + s.anticipation` change avec C1 et C2 ; garder un test qui
     vérifie que la face (`anticipation + turn/2`) tombe dans la recette, et que la vedette
     reste après `starPause`.
   - « rien ne sonne après la fin de l'animation » porte sur les **instants** des cues, pas sur
     la queue des recettes : C5 et B6 doivent finir avant `final[rarity]` (à tester sur
     `at + dur + release`).
4. **`soundsLive` et les nouvelles sources** : `live` ne compte que des `OscillatorNode`. Les
   `AudioBufferSourceNode` (bruit, rire joué par le lecteur) doivent entrer dans le même
   ensemble, sinon un bruit qui survit au passage reste invisible à l'e2e (ligne 75 : `'0'`).
   Avec le fondu de 25 ms d'A3, vider l'ensemble **immédiatement**, pas dans `onended`.
5. **Passer pendant la fenêtre d'avance** (C6) : une cue déclenchée 150 ms plus tôt est écrite
   au journal avant de sonner ; si l'appui tombe dans cette fenêtre, le journal contient un son
   coupé avant son début. Le test « passer » (appui à l'armement, 200 ms, première fissure à
   720 ms) n'y est pas exposé, mais un futur test le serait : écrire au journal à l'instant
   prévu, pas à l'instant de programmation.
6. **Constitution II** : un bruitage nouveau (C3) ou un changement de règle sonore (C4 : sens
   des pièces) se décrit **d'abord** dans `specs/005-son/spec.md` (nouvelle section de
   révision, FR et Key Entities), puis plan et tâches. Les retouches de timbre, de niveau et de
   synchro (lots A et B) restent dans FR-001 à FR-013 et l'ADR 0006 (synthèse) : pas de
   nouvelle spec. Pas d'ambiance continue ni de musique : exclues par 005 (Assumptions) et par
   l'utilisateur.
7. **Haut-parleur de téléphone** : tout ce qui vit sous 250 Hz (corps des impacts, battements)
   y disparaît ; chaque grave a sa couche à l'octave ou son « toc » de 1 à 2 kHz (déjà prévus
   en B1 et B3). Juger aussi le rendu d'un téléphone en filtrant `render.mjs` par un passe-haut
   à 400 Hz.
8. **`killTweensOf` et étouffement** : ne pas réutiliser les tweens Phaser pour les
   automations audio. Tout passe par les `AudioParam` (`cancelScheduledValues` avant toute
   nouvelle rampe, sinon une rampe exponentielle programmée écrase la coupure, même piège que
   les tweens concurrents de la 004).
9. **Mesurer avant et après** : relancer `render.mjs` (après rebuild du bundle `rolldown`) et
   comparer aux cibles de la section 2 ; écouter les WAV `out/tl-*.wav` ; reprendre `play.mjs`
   (horloge virtuelle, densité 2) pour vérifier que la face d'une carte et son pincement tombent
   sur la même image.
