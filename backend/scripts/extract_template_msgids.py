"""Scan templates for {% trans %} and {% blocktrans %}; print unique msgids (stdout)."""
from __future__ import annotations

import re
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
TEMPLATES = BASE / "templates"

TRANS_DOUBLE = re.compile(r"\{%\s*trans\s+\"([^\"]+)\"\s*%\}")
TRANS_SINGLE = re.compile(r"\{%\s*trans\s+'([^']+)'\s*%\}")
BLOCK_START = re.compile(r"\{%\s*blocktrans(?:\s+[^%]*)?%\}")


def _blocktrans_bodies(content: str) -> list[str]:
    bodies: list[str] = []
    pos = 0
    while True:
        m = BLOCK_START.search(content, pos)
        if not m:
            break
        start = m.end()
        end = content.find("{% endblocktrans %}", start)
        if end == -1:
            break
        body = content[start:end].strip()
        if body:
            bodies.append(" ".join(body.split()))
        pos = end + len("{% endblocktrans %}")
    return bodies


def main() -> None:
    found: set[str] = set()
    for path in sorted(TEMPLATES.rglob("*.html")):
        text = path.read_text(encoding="utf-8")
        for rx in (TRANS_DOUBLE, TRANS_SINGLE):
            found.update(rx.findall(text))
        found.update(_blocktrans_bodies(text))
    for s in sorted(found, key=lambda x: (x.lower(), x)):
        print(s.encode("utf-8", errors="replace").decode("utf-8"))


if __name__ == "__main__":
    import sys

    sys.stdout.reconfigure(encoding="utf-8")
    main()
