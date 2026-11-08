# Polices — provenance

Polices sous **SIL Open Font License 1.1** uniquement (ADR 0008), licence jointe :
[OFL.txt](OFL.txt).

| Fichier | Police | Auteurs | Source | Licence | Transformations |
|---------|--------|---------|--------|---------|-----------------|
| `fredoka-semibold.woff2` | Fredoka 2.001 (`Fredoka[wdth,wght].ttf`, SHA-256 `2ba02e68…61a73fc8`) | Milena Brandão, Hafontia — Copyright 2016 The Fredoka Project Authors | <https://github.com/google/fonts/tree/main/ofl/fredoka> (récupérée le 2026-11-08) | OFL 1.1, sans nom réservé | instance fixe `wght=600 wdth=100` (fontTools 4.60.1, `varLib.instancer --update-name-table`) ; sous-ensemble U+0020–007E, U+00A0–017F, U+2000–206F, U+20AC, U+2122, U+2212 ; WOFF2 (`fontTools.subset --flavor=woff2`) |

Refaire le fichier :

```bash
fonttools varLib.instancer "Fredoka[wdth,wght].ttf" wght=600 wdth=100 --update-name-table -o fredoka-600.ttf
pyftsubset fredoka-600.ttf --unicodes="U+0020-007E,U+00A0-017F,U+2000-206F,U+20AC,U+2122,U+2212" \
  --flavor=woff2 --output-file=fredoka-semibold.woff2
```
