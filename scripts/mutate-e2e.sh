#!/usr/bin/env bash
# Validation par mutation d'une SCÈNE (constitution V) : la logique pure se mute avec
# scripts/mutate.sh (Vitest), l'affichage avec ce script, qui lance l'e2e visé.
#
#   scripts/mutate-e2e.sh <fichier> '<ancien texte>' '<nouveau texte>' [args playwright…]
#   ex. scripts/mutate-e2e.sh src/scenes/GachaScene.ts 'const SKIP_ARM_MS = 200;' 'const SKIP_ARM_MS = 0;' tests/e2e/revelation.spec.ts -g verrou
#
# Sortie 0 = mutation détectée, 1 = survivante, 2 = texte introuvable, 3 = la mutation
# ne compile pas (rien n'est prouvé : un build cassé ferait échouer n'importe quel test).
set -uo pipefail
file=$1 old=$2 new=$3
shift 3
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

# Le webServer de Playwright reconstruit le jeu : la mutation est bien dans le build,
# à condition qu'aucun `vite preview` ne tourne déjà (reuseExistingServer hors CI).
PORT="${E2E_PORT:-4173}"
if ss -ltn 2>/dev/null | grep -q ":$PORT "; then
  echo "un serveur écoute déjà sur $PORT : il servirait le build non muté (E2E_PORT=… pour un autre port)" >&2
  exit 2
fi
# 006 : une mutation qui ne passait pas tsc était comptée « détectée » à tort.
if ! npx tsc --noEmit >/dev/null 2>&1; then
  echo "? INVALIDE  : $file : « $old » → « $new » (ne compile pas)"
  exit 3
fi
if timeout 400 npx playwright test "$@" >/dev/null 2>&1; then
  echo "✗ SURVIVANTE : $file : « $old » → « $new »"
  exit 1
fi
echo "✓ détectée   : $file : « $old » → « $new »"
