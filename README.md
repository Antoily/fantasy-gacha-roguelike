# Gacha (nom de travail)

Jeu de collection à tirages, DA cartoon. On le construit **un mécanisme à la fois**,
en commençant par le gacha seul.

Le projet est piloté par specs avec [Spec Kit](https://github.com/github/spec-kit) :

- [Constitution](.specify/memory/constitution.md) : les principes du projet
- [Roadmap](docs/ROADMAP.md) : en cours, ensuite, plus tard
- [ADR](docs/adr/) : les décisions structurantes
- `specs/NNN-nom/` : spec, plan et tâches de chaque feature

## Jouer

```bash
nvm use            # Node 24
npm ci
npm run dev        # puis ouvrir l'URL affichée
```

Tests : `npm test` (logique) et `npm run e2e` (parcours complet dans Chromium).

## Historique

L'ancien prototype « Fantasy Roguelike Gacha » (roguelike + combat + backend) est
conservé sous le tag `legacy-v1`.
