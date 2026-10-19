# 0001 — Piloter le projet par specs (Spec Kit) et par ADR

- **Statut** : Accepté
- **Date** : 2026-10-19
- **Spec liée** : —

## Contexte

Le prototype précédent a ajouté run, combat, reliques, talents, backend et gacha
presque en même temps. Aucun mécanisme n'a été vraiment fini, et plusieurs ont été
retirés après coup (reliques, talents, client API). Les décisions n'étaient tracées
que dans `CLAUDE.md` et dans les messages de commit.

## Options envisagées

1. **Continuer sans cadre** — *Pour :* rapide. *Contre :* reproduit l'empilement.
2. **ADR seuls** — *Pour :* léger. *Contre :* trace les décisions, pas le périmètre
   d'une feature ni son découpage en tâches.
3. **Spec Kit (GitHub) + ADR** — *Pour :* une spec par feature, validée avant le
   code, plan et tâches dérivés, constitution vérifiée par `/speckit-analyze`.
   *Contre :* plus de documents par feature.

## Décision

On adopte **Spec Kit v1.2.1** (intégration Claude, skills `/speckit-*`) et on garde
des **ADR** dans `docs/adr/` pour les décisions transverses. Les règles de travail
vivent dans `.specify/memory/constitution.md`.

## Conséquences

- Chaque feature a son dossier `specs/NNN-nom/` (spec, plan, tâches).
- Pas de code sans spec validée : le démarrage d'une feature est plus lent, mais son
  périmètre est fixé avant d'écrire du code.
- Mettre Spec Kit à jour (`specify self upgrade`, puis `specify init --here --force`)
  peut réécrire les gabarits : relire le diff de `.specify/` et `.claude/skills/`.
