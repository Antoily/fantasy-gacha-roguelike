# 0005 — Sauvegarde locale versionnée, écrite d'un bloc

- **Statut** : Accepté
- **Date** : 2026-10-19
- **Spec liée** : `specs/001-tirage/`

## Contexte

Le jeu est local-only (ADR 0004). La spec 001 exige que le solde et les possessions
survivent à la fermeture (FR-018), que débit et gains soient indissociables (FR-011),
qu'une sauvegarde d'une version antérieure soit reprise sans perte, et qu'une
sauvegarde corrompue ne bloque pas le jeu.

## Options envisagées

1. **`localStorage`, un seul document JSON versionné** — *Pour :* synchrone, une
   écriture = un état complet. *Contre :* quelques Mo maximum (largement suffisant).
2. **IndexedDB** — *Pour :* gros volumes, transactions. *Contre :* asynchrone, verbeux,
   sans utilité pour quelques centaines d'octets.
3. **Plusieurs clés** (solde, possessions séparés) — *Contre :* une fermeture entre
   deux écritures casse FR-011.

## Décision

- Une clé unique **`gacha.save`**, contenant `{ "version": N, … }` : tout l'état.
- L'état est calculé en entier par la logique pure, puis **écrit d'un seul
  `setItem`**, avant d'afficher les résultats.
- Toute évolution du format incrémente `version` et ajoute une migration `N-1 → N` ;
  on ne modifie jamais le sens d'un champ existant sans migration.
- Lecture défensive : toute anomalie ⇒ partie neuve et avertissement au joueur ;
  identifiants inconnus du catalogue ignorés.

## Conséquences

- Un joueur peut modifier sa sauvegarde : accepté (pas d'argent réel ni de classement).
- Ajouter un champ (pity en 002, par exemple) = version 2 + migration + test.
