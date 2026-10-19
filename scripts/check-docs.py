#!/usr/bin/env python3
"""Garde-fou des documents Spec Kit : ce qu'une PR de spec doit respecter pour être mergée.

Vérifie : constitution sans gabarit restant, ADR avec un statut valide, specs sans
clarification en suspens ni checklist qualité incomplète, liens relatifs valides.
Sortie non nulle à la première catégorie d'erreurs, avec la liste complète.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
errors: list[str] = []


def rel(p: Path) -> str:
    return str(p.relative_to(ROOT))


# Constitution : un jeton [EN_MAJUSCULES] est un reste du gabarit Spec Kit.
constitution = ROOT / ".specify/memory/constitution.md"
for m in re.finditer(r"\[[A-Z][A-Z0-9_]{2,}\]", constitution.read_text()):
    errors.append(f"{rel(constitution)} : jeton de gabarit non remplacé {m.group(0)}")

# ADR : statut obligatoire, parmi les valeurs autorisées par la constitution.
STATUS = re.compile(r"^- \*\*Statut\*\* : (Proposé|Accepté|Remplacé par \[\d{4}\]\(\d{4}-[\w-]+\.md\))$", re.M)
for adr in sorted((ROOT / "docs/adr").glob("[0-9][0-9][0-9][0-9]-*.md")):
    if adr.name.startswith("0000-"):
        continue
    if not STATUS.search(adr.read_text()):
        errors.append(f"{rel(adr)} : ligne « - **Statut** : … » absente ou invalide")

# Specs : rien en suspens, checklist qualité entièrement cochée, gabarit rempli.
for spec in sorted(ROOT.glob("specs/*/spec.md")):
    text = spec.read_text()
    if "[NEEDS CLARIFICATION" in text:
        errors.append(f"{rel(spec)} : clarification en suspens")
    for placeholder in ("[FEATURE NAME]", "[DATE]", "$ARGUMENTS", "ACTION REQUIRED"):
        if placeholder in text:
            errors.append(f"{rel(spec)} : reste du gabarit « {placeholder} »")
    checklist = spec.parent / "checklists/requirements.md"
    if not checklist.exists():
        errors.append(f"{rel(spec)} : checklist qualité absente ({rel(checklist)})")
    elif re.search(r"^\s*- \[ \]", checklist.read_text(), re.M):
        errors.append(f"{rel(checklist)} : élément non coché")

# Liens relatifs des documents du projet (hors gabarits et skills Spec Kit).
docs = [ROOT / "README.md", ROOT / "CLAUDE.md", constitution]
docs += sorted((ROOT / "docs").rglob("*.md")) + sorted((ROOT / "specs").rglob("*.md"))
# Le gabarit d'ADR contient des liens d'exemple (NNNN-titre.md) par construction.
docs = [d for d in docs if d.name != "0000-template.md"]
LINK = re.compile(r"\[[^\]]*\]\(([^)\s]+)\)")
for doc in docs:
    for target in LINK.findall(doc.read_text()):
        if re.match(r"^(https?:|mailto:|#)", target):
            continue
        path = target.split("#")[0]
        if path and not (doc.parent / path).exists():
            errors.append(f"{rel(doc)} : lien cassé vers {target}")

if errors:
    print("\n".join(f"✗ {e}" for e in errors))
    sys.exit(1)
print(f"✓ documents conformes ({len(docs)} fichiers vérifiés)")
