#!/usr/bin/env python3
"""
optimiziraj-slike.py — pripomoček za Plezalni klub Rogaška Slatina

Pripravi fotografije za hitro nalaganje na spletni strani:
  1) "izbrane"    -> iz mape z izvirnimi fotografijami naredi majhne sličice
                      (za pregled) in nekoliko večje "polne" različice (za
                      povečan prikaz), obe v formatu WebP, in jih doda v
                      assets/data/featured-photos.json (galerija.html +
                      vrtiljak na Domov strani ju bosta prikazala samodejno).
  2) "naslovnica" -> iz ene fotografije naredi majhno naslovnico za en
                      album v assets/data/albums.json (album mora v tej
                      datoteki že obstajati po imenu).

Uporaba (iz korenske mape spletne strani):

    python3 tools/optimiziraj-slike.py izbrane /pot/do/mape/z/izbranimi/fotografijami
    python3 tools/optimiziraj-slike.py naslovnica "Boč 2010" /pot/do/naslovnica.jpg

Zahteva knjižnico Pillow:  pip install pillow --break-system-packages
(ali:  pip install pillow   -- odvisno od vašega sistema)
"""

import json
import sys
import re
import unicodedata
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit(
        "Manjka knjižnica Pillow. Namestite jo z ukazom:\n"
        "    pip install pillow --break-system-packages\n"
        "in nato ponovno poženite ta skript."
    )

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "assets" / "data"
FEATURED_JSON = DATA_DIR / "featured-photos.json"
ALBUMS_JSON = DATA_DIR / "albums.json"
FEATURED_THUMB_DIR = ROOT / "assets" / "img" / "galerija" / "featured" / "thumb"
FEATURED_FULL_DIR = ROOT / "assets" / "img" / "galerija" / "featured" / "full"
ALBUM_COVER_DIR = ROOT / "assets" / "img" / "galerija" / "albums"

THUMB_WIDTH = 500
FULL_MAX_DIM = 1600
THUMB_QUALITY = 72
FULL_QUALITY = 80
COVER_WIDTH = 600
COVER_QUALITY = 72

IMG_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".tif", ".tiff"}


def slugify(name: str) -> str:
    name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode("ascii")
    name = re.sub(r"[^a-zA-Z0-9]+", "-", name).strip("-").lower()
    return name or "slika"


def load_json(path: Path, default):
    if not path.exists():
        return default
    with open(path, "r", encoding="utf-8") as f:
        content = f.read().strip()
        return json.loads(content) if content else default


def save_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def resized_copy(im: Image.Image, target_width: int = None, max_dim: int = None) -> Image.Image:
    im = ImageOps.exif_transpose(im)  # spoštuj orientacijo s telefona
    if im.mode not in ("RGB",):
        im = im.convert("RGB")
    w, h = im.size
    if target_width and w > target_width:
        new_h = round(h * (target_width / w))
        im = im.resize((target_width, new_h), Image.LANCZOS)
    elif max_dim and max(w, h) > max_dim:
        scale = max_dim / max(w, h)
        im = im.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
    return im


def cmd_izbrane(source_dir: str):
    src = Path(source_dir).expanduser()
    if not src.is_dir():
        sys.exit(f"Mapa ne obstaja: {src}")

    FEATURED_THUMB_DIR.mkdir(parents=True, exist_ok=True)
    FEATURED_FULL_DIR.mkdir(parents=True, exist_ok=True)

    featured = load_json(FEATURED_JSON, [])
    existing_ids = {p.get("id") for p in featured}

    files = sorted(
        [p for p in src.iterdir() if p.suffix.lower() in IMG_EXTS],
        key=lambda p: p.name.lower(),
    )
    if not files:
        sys.exit(f"V mapi {src} ni najdenih slik (jpg/png/webp/heic).")

    added = 0
    for p in files:
        base_id = slugify(p.stem)
        photo_id = base_id
        n = 2
        while photo_id in existing_ids:
            photo_id = f"{base_id}-{n}"
            n += 1

        try:
            im = Image.open(p)
        except Exception as e:
            print(f"  Preskočeno ({p.name}): {e}")
            continue

        thumb = resized_copy(im, target_width=THUMB_WIDTH)
        thumb_name = f"{photo_id}.webp"
        thumb.save(FEATURED_THUMB_DIR / thumb_name, "WEBP", quality=THUMB_QUALITY)

        full = resized_copy(im, max_dim=FULL_MAX_DIM)
        full_name = f"{photo_id}.webp"
        full.save(FEATURED_FULL_DIR / full_name, "WEBP", quality=FULL_QUALITY)

        featured.append({
            "id": photo_id,
            "thumb": f"assets/img/galerija/featured/thumb/{thumb_name}",
            "full": f"assets/img/galerija/featured/full/{full_name}",
            "alt": p.stem.replace("_", " ").replace("-", " ")
        })
        existing_ids.add(photo_id)
        added += 1
        print(f"  + {p.name} -> {thumb_name}")

    save_json(FEATURED_JSON, featured)
    print(f"\nDodanih {added} fotografij. Skupaj v featured-photos.json: {len(featured)}.")
    print("Uredite lahko polje \"alt\" za vsako fotografijo v assets/data/featured-photos.json"
          " (kratek opis, npr. imena otrok NISO priporočena iz zasebnostnih razlogov).")


def cmd_naslovnica(album_name: str, image_path: str):
    ALBUM_COVER_DIR.mkdir(parents=True, exist_ok=True)
    albums = load_json(ALBUMS_JSON, [])
    match = next((a for a in albums if a.get("name") == album_name), None)
    if match is None:
        names = ", ".join(a.get("name", "") for a in albums)
        sys.exit(f"Album '{album_name}' ni najden v albums.json.\nObstoječi albumi: {names}")

    p = Path(image_path).expanduser()
    if not p.is_file():
        sys.exit(f"Datoteka ne obstaja: {p}")

    im = Image.open(p)
    cover = resized_copy(im, target_width=COVER_WIDTH)
    cover_name = f"{slugify(album_name)}.webp"
    cover.save(ALBUM_COVER_DIR / cover_name, "WEBP", quality=COVER_QUALITY)

    match["cover"] = f"assets/img/galerija/albums/{cover_name}"
    save_json(ALBUMS_JSON, albums)
    print(f"Naslovnica za album '{album_name}' nastavljena: {match['cover']}")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == "izbrane" and len(sys.argv) == 3:
        cmd_izbrane(sys.argv[2])
    elif cmd == "naslovnica" and len(sys.argv) == 4:
        cmd_naslovnica(sys.argv[2], sys.argv[3])
    else:
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
