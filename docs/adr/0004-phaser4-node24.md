# 0004 — Phaser 4 + TypeScript + Vite sur Node 24, local-only

- **Statut** : Accepté
- **Date** : 2026-10-19
- **Spec liée** : `specs/001-tirage/`

## Contexte

L'ADR 0003 a retenu « Phaser 3 + TypeScript + Vite, local-only » et renvoyé les
versions au plan de la première feature. En les relevant (voir
`specs/001-tirage/research.md`) : Phaser 4 est stable depuis le 2026-04-10 (4.2.1
aujourd'hui) et toute la chaîne d'outils actuelle exige Node ≥ 20 ou 22, alors que le
`node` système de la machine de dev est en 18.

## Options envisagées

1. **Phaser 3.90 + outils épinglés compatibles Node 18** — *Pour :* API la plus connue.
   *Contre :* v3 figée depuis mai 2025, Node 18 en fin de vie, versions d'outils
   anciennes à maintenir (le piège Vitest 2 du prototype).
2. **Phaser 4.2 + Node 24 (nvm)** — *Pour :* versions maintenues, API de scènes
   identique à la v3. *Contre :* moins d'exemples en ligne pour la v4.

## Décision

Option 2. Phaser **4.2**, TypeScript **6.0** (typescript-eslint n'accepte pas encore
TS 7), Vite **8**, Vitest **5**, ESLint **10** (configuration *flat*), Playwright pour
les tests de bout en bout. Node **24**, fixé par `.nvmrc`, en local comme en CI.
Le reste de l'ADR 0003 est inchangé : **local-only**, pas de serveur sans ADR.

## Conséquences

- Avant toute commande npm : `source ~/.nvm/nvm.sh && nvm use` (le PATH non
  interactif pointe sur le Node 18 système).
- Passer à TypeScript 7 quand typescript-eslint le supportera.
