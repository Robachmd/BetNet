"""Compile backend/locale/*/LC_MESSAGES/django.po to .mo without GNU gettext (uses polib)."""
from __future__ import annotations

from pathlib import Path

import polib

BASE = Path(__file__).resolve().parent.parent
LOCALE = BASE / "locale"


def main() -> None:
    for po_path in LOCALE.glob("*/LC_MESSAGES/django.po"):
        po = polib.pofile(str(po_path))
        mo_path = po_path.with_suffix(".mo")
        po.save_as_mofile(str(mo_path))
        print(f"Wrote {mo_path.relative_to(BASE)}")


if __name__ == "__main__":
    main()
