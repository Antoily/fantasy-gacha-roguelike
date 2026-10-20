# Research — 004 Révélation

Pas de nouvelle dépendance, pas de nouvelle donnée sauvegardée.

## R1 — Séparer le déroulé (pur) de son dessin (Phaser)

- **Décision** : `planReveal(results, rng)` rend un `RevealPlan` : les paliers montrés
  dans l'ordre (`steps`, le dernier = le vrai palier), le type de déroulé et, au ×10,
  l'ordre de retournement. `revealDuration(plan)` en déduit la durée. La scène joue
  le plan sans rien décider.
- **Pourquoi** : constitution V. Toutes les règles de la spec (palier, fausses pistes,
  « finit sur le vrai palier », ordre des cartes, bornes de FR-010) deviennent des
  tests Vitest, mutables ; l'e2e n'a plus qu'à vérifier l'enchaînement.
- **Écarté** : décider des fausses pistes dans la scène (`Math.random()` en direct) :
  intestable et contraire à la constitution IV (hasard injecté).

## R2 — Hasard du déroulé

- **Décision** : même générateur que le tirage (`Math.random` en jeu), consommé
  **après** le tirage. Ordre contractuel : 1 valeur `u` toujours (même quand aucune
  fausse piste n'est possible), puis 1 valeur `v` seulement pour un leurre.
  - Palier Rare : `u < 0,10` → leurre ; `0,10 ≤ u < 0,35` → montée ; sinon direct.
  - Palier Légendaire ou Ultra rare : `u < 0,25` → montée ; sinon direct.
  - Commun, Peu commun : direct.
  - Leurre : `v < 0,2` → Ultra rare, sinon Légendaire.
- **Pourquoi** : une consommation fixe rend le hasard scriptable dans l'e2e (R6) et
  les tests à `scriptedRng` lisibles. Le tirage ne change pas : il consomme avant.
- Probabilités dans `src/data/revealConfig.ts` (constitution VI), testées
  statistiquement sur 100 000 déroulés (SC-006, SC-007).

## R3 — Durées (FR-010)

- **Décision** (ms) : suspense 900 ; révélation finale Commun 600, Peu commun 800,
  Rare 1 100, Légendaire 1 500, Ultra rare 2 000 ; palier de fausse piste montré
  700 + transition 300. Retournement ×10 : 200 par carte ordinaire, pause 400, puis
  700 pour la meilleure.
- Bornes obtenues : Commun 1 500 (≤ 3 000) ; pire cas Ultra en montée 3 900
  (≤ 5 000) ; leurre vers Ultra 3 000 ; retournement 9 × 200 + 400 + 700 = 2 900
  (≤ 4 000). Un test parcourt **tous** les plans possibles et vérifie les bornes.

## R4 — Mise en scène d'un palier

- **Décision** : tout part de l'orbe de l'écran de tirage (`GACHA.orb`), sous un voile.
  - Suspense (commun à tous) : l'orbe tremble et grossit, couleur neutre (encre).
  - Révélation d'un palier : l'orbe prend la couleur de la rareté, éclate en rayons ;
    l'ampleur croît avec le rang (nombre de rayons 6 → 16, rayon de l'onde, échelle,
    éclair plein écran à partir de Légendaire, double onde pour Ultra rare) (FR-004).
  - Montée : le palier du dessous joue son début, l'orbe se fend, puis le vrai palier.
  - Leurre : le faux palier joue son début, puis l'effet se dégonfle et l'orbe
    retombe à la couleur Rare, qui joue sa révélation.
- Aucun hasard visuel (angles des rayons calculés) : `Phaser.Math.Between` lit
  `Math.random` et décalerait le hasard scripté de l'e2e.
- Couleurs : `COLORS.rarity` ; tokens d'effet ajoutés à `theme.ts`.

## R5 — Passage et verrous

- **Décision** : la fenêtre `reveal` a une zone plein écran (au-dessus du voile) qui
  passe l'animation sur `pointerup` ; elle n'est armée qu'après 200 ms, pour qu'un
  double appui sur « Tirer » ne passe pas l'animation à l'insu du joueur. Passer =
  arrêter les tweens, fermer `reveal`, ouvrir `results` **cartes retournées** (FR-006).
- Pendant le retournement du ×10 (état `flip`), même zone : un appui retourne tout et
  fait apparaître OK ; OK n'existe qu'une fois tout retourné, donc un appui ne peut
  pas fermer la fenêtre par accident (cas limite de la spec).
- `modalOpen` reste vrai de l'appui sur « Tirer » à OK (FR-007, leçon 001).
- L'échange d'éclats appelle `showResults` sans animation (hypothèse de la spec).

## R6 — Vérification e2e avec un hasard scripté

- **Décision** : un `addInitScript` (tests seulement) remplace `Math.random` par une
  fonction qui sert d'abord une file `window.__rng` puis retombe sur le vrai hasard.
  L'e2e calcule les valeurs comme les tests Vitest (rareté, élément, puis `u`, `v`) et
  obtient le tirage et le déroulé voulus : chaque palier, une montée, un leurre.
- `document.body.dataset.reveal` = paliers montrés (`rare>legendary`), posé pendant
  la fenêtre `reveal`, pour que l'e2e compare au tirage réel.
- **Écarté** : un paramètre d'URL pour forcer un palier — du code de test en
  production.
- Captures prises pendant chaque palier (attente calée sur les durées de R3) et
  relues avant merge : l'e2e ne peut pas juger « reconnaissable sans texte » (SC-005).
