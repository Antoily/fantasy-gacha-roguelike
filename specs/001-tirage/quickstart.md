# Quickstart — 001 Tirage

Guide de validation : comment prouver que la feature marche.

## Prérequis

```bash
source ~/.nvm/nvm.sh && nvm use        # Node 24 (.nvmrc)
npm ci
npx playwright install chromium        # une fois
```

## Contrôles automatiques (ceux de la CI)

```bash
npm run lint && npm run typecheck      # zéro erreur
npm test                               # logique pure, dont tests statistiques
npm run build                          # build statique dans dist/
npm run e2e                            # Playwright sur le build (vite preview)
```

Attendu :
- `npm test` couvre chaque ligne du tableau « Garanties » de
  [contracts/logic-api.md](contracts/logic-api.md) ; chaque test a été vu échouer
  par mutation (constitution V).
- `npm run e2e` déroule le scénario ci-dessous et dépose ses captures dans
  `test-results/` (jointes à la CI).

## Scénario de bout en bout (automatisé par `npm run e2e`)

1. Premier lancement : solde « 9 000 », compteur « 0 / 20 ».
2. Tirer ×1 → une carte s'affiche ; sauvegarde : `currency` = 8 900, un élément possédé.
3. OK, puis Tirer ×10 → dix cartes ; sauvegarde : `currency` = 8 000, au moins un
   élément de rang ≥ Rare parmi les dix.
4. Recharger la page → mêmes solde et compteur (SC-004).
5. Ouvrir les taux → 60 %, 27 %, 10 %, 2,5 %, 0,5 % et la mention de garantie.
6. Recommencer → Annuler : rien ne change ; Recommencer → Effacer : « 9 000 », « 0 / 20 ».
7. Écrire une sauvegarde invalide puis recharger → avertissement, partie neuve.
8. Ramener le solde à 50 (sauvegarde forgée) → les deux boutons de tirage sont
   désactivés et le message de manque s'affiche.

## Vérification manuelle (facultative)

```bash
npm run build && npx vite preview --port 4173
```

Ouvrir http://localhost:4173/ (fenêtre étroite ou mode mobile du navigateur).
