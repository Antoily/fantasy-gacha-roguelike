# 0003 — Phaser 3 + TypeScript + Vite, local-only

- **Statut** : Remplacé par [0004](0004-phaser4-node24.md)
- **Date** : 2026-10-19
- **Spec liée** : —

## Contexte

Le jeu cible le mobile, en portrait. Le gacha demande des animations de révélation
soignées. Le prototype utilisait déjà Phaser + TypeScript + Vite, avec Vitest.

## Options envisagées

1. **Phaser 3 + TS + Vite** — *Pour :* déjà maîtrisé, canvas adapté aux effets,
   portage mobile via Capacitor possible. *Contre :* les UI de menus sont verbeuses.
2. **UI DOM (React/Svelte)** — *Pour :* menus et listes faciles. *Contre :* animations
   riches plus coûteuses, et à refaire si le gameplay devient un jeu en temps réel.
3. **Serveur dès la v1** (tirages calculés côté serveur) — *Pour :* anti-triche.
   *Contre :* coût d'infrastructure et de complexité sans joueurs à protéger.

## Décision

**Phaser 3 + TypeScript strict + Vite**, tests **Vitest**, lint **ESLint**. Le jeu est
**local-only** : la sauvegarde vit dans le navigateur, avec un numéro de version.
Les versions exactes se fixent au plan de la première feature.

## Conséquences

- Pas de backend, de compte ni de synchronisation tant qu'un ADR ne le décide pas.
- Un joueur peut tricher en modifiant sa sauvegarde : accepté tant qu'il n'y a ni
  argent réel ni classement.
- La logique de tirage reste du TypeScript pur, donc déplaçable côté serveur plus tard.
