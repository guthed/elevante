#!/usr/bin/env python3
"""Beskär bort webbläsarram (verktygsfält, bokmärkesfält, fönsterram) från
skärmdumpar av Elevante-appen, så bara appinnehållet blir kvar.

Strategi (robust för skärmdumpar tagna från samma fönster):
  1. Fönsterrektangel per bild = bounding box av icke-svarta pixlar
     (skrivbord + fönsterskugga runt om är ~svart) → left/right/bottom.
  2. Topp-chrome (verktygsfält + bokmärkesfält) har konstant höjd inom samma
     fönster. Vi mäter chrome-höjden via appens ivory-canvas på de bilder där
     toppen är ivory, tar MEDIAN per fönsterstorlek, och applicerar samma
     topp-trim på alla bilder (så scrollade/kort-tunga sidor får rätt trim ändå).

Användning:
    python3 scripts/crop-app-shots.py [in_dir] [out_dir]

Default: in=screenshots-raw  out=screenshots-cropped
"""
import sys
import os
import glob
import statistics
from PIL import Image

IVORY = (249, 247, 242)
TOL = 4          # snäv: webbläsarens varmvita chrome (255,253,248) får ej matcha
INSET = 2        # px extra trim för rundade hörn
DW = 800         # detekteringsbredd (nedskalad NEAREST)


def is_ivory(p):
    return abs(p[0] - IVORY[0]) <= TOL and abs(p[1] - IVORY[1]) <= TOL and abs(p[2] - IVORY[2]) <= TOL


def not_black(p):
    return max(p) > 60


def analyze(path):
    im = Image.open(path).convert("RGB")
    W, H = im.size
    scale = W / DW
    DH = max(1, round(H / scale))
    sp = im.resize((DW, DH), Image.NEAREST).load()

    def row_win(y):
        return sum(not_black(sp[x, y]) for x in range(0, DW, 2)) / (DW / 2) > 0.5

    def col_win(x):
        return sum(not_black(sp[x, y]) for y in range(0, DH, 2)) / (DH / 2) > 0.3

    win_top = next((y for y in range(DH) if row_win(y)), 0)
    win_bottom = next((y for y in range(DH - 1, -1, -1) if row_win(y)), DH - 1)
    win_left = next((x for x in range(DW) if col_win(x)), 0)
    win_right = next((x for x in range(DW - 1, -1, -1) if col_win(x)), DW - 1)

    # Hitta start på sammanhängande ivory-block (appens body).
    need = max(6, round(DH * 0.04))
    span = max(1, win_right - win_left)

    def row_ivory(y):
        return sum(is_ivory(sp[x, y]) for x in range(win_left, win_right + 1)) / span > 0.85

    app_top = None
    run = 0
    for y in range(win_top, win_bottom + 1):
        run = run + 1 if row_ivory(y) else 0
        if run >= need:
            app_top = y - need + 1
            break

    # Chrome-offset (small-px) bara om vi hittade ett rimligt block nära toppen.
    offset = None
    if app_top is not None and 0 < (app_top - win_top) < DH * 0.25:
        offset = app_top - win_top

    return {
        "path": path, "W": W, "H": H, "scale": scale,
        "win_top": win_top, "win_bottom": win_bottom,
        "win_left": win_left, "win_right": win_right, "offset": offset,
    }


def main():
    in_dir = sys.argv[1] if len(sys.argv) > 1 else "screenshots-raw"
    out_dir = sys.argv[2] if len(sys.argv) > 2 else "screenshots-cropped"
    os.makedirs(out_dir, exist_ok=True)

    files = sorted(
        glob.glob(os.path.join(in_dir, "*.png")) + glob.glob(os.path.join(in_dir, "*.PNG"))
        + glob.glob(os.path.join(in_dir, "*.jpg")) + glob.glob(os.path.join(in_dir, "*.jpeg"))
    )
    if not files:
        print(f"Inga bilder i {in_dir}/. Lägg dina skärmdumpar där och kör igen.")
        return

    print(f"Analyserar {len(files)} bild(er)…")
    metas = [analyze(f) for f in files]

    # Median chrome-offset per fönsterstorlek.
    groups = {}
    for m in metas:
        groups.setdefault((m["W"], m["H"]), []).append(m)
    med_offset = {}
    for key, ms in groups.items():
        offs = [m["offset"] for m in ms if m["offset"] is not None]
        med_offset[key] = statistics.median(offs) if offs else 0
        print(f"  fönster {key[0]}×{key[1]}: chrome-offset (median) {round(med_offset[key])} small-px "
              f"({len(offs)}/{len(ms)} mätningar)")

    print(f"Beskär → {out_dir}/")
    ok = 0
    for m in metas:
        off = med_offset[(m["W"], m["H"])]
        app_top = m["win_top"] + off
        s = m["scale"]
        top = round(app_top * s) + INSET
        bottom = round(m["win_bottom"] * s) - INSET
        left = round(m["win_left"] * s) + INSET
        right = round(m["win_right"] * s) - INSET
        name = os.path.basename(m["path"])
        if right <= left or bottom <= top:
            print(f"  ! kunde inte beskära {name} — hoppar")
            continue
        out = os.path.join(out_dir, os.path.splitext(name)[0] + ".png")
        Image.open(m["path"]).convert("RGB").crop((left, top, right + 1, bottom + 1)).save(out)
        print(f"  ✓ {name}  →  {right-left}×{bottom-top}px")
        ok += 1
    print(f"Klart: {ok}/{len(files)} beskurna i {out_dir}/")


if __name__ == "__main__":
    main()
