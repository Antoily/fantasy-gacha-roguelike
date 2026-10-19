#!/usr/bin/env bash
# Validation par mutation (constitution V) : applique une mutation à un fichier,
# vérifie que les tests ÉCHOUENT, puis restaure le fichier quoi qu'il arrive.
#
#   scripts/mutate.sh <fichier> '<ancien texte>' '<nouveau texte>' [filtre vitest]
#
# Sortie 0 = mutation détectée (bon), 1 = mutation survivante (test trop faible),
# 2 = texte introuvable (mutation non appliquée).
set -uo pipefail
file=$1 old=$2 new=$3 filter=${4:-}
backup=$(mktemp)
cp "$file" "$backup"
trap 'cp "$backup" "$file"; rm -f "$backup"' EXIT

python3 - "$file" "$old" "$new" <<'PY' || exit 2
import sys
path, old, new = sys.argv[1:]
text = open(path).read()
if old not in text:
    sys.exit(f"texte introuvable dans {path} : {old!r}")
open(path, "w").write(text.replace(old, new, 1))
PY

# Délai maximal : une mutation peut créer une boucle infinie synchrone que vitest ne
# sait pas interrompre. Un blocage compte comme une détection.
if timeout 180 npx vitest run $filter >/dev/null 2>&1; then
  echo "✗ SURVIVANTE : $file : « $old » → « $new »"
  exit 1
fi
echo "✓ détectée   : $file : « $old » → « $new »"
