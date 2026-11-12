"""Generate the PWA icons in public/ (needs Pillow: pip install pillow).

    python3 scripts/generate-icons.py

Draws the FocusTogether mark: a soft teal tile with a progress ring.
"""
import math
from pathlib import Path

from PIL import Image, ImageDraw

BG = (63, 113, 105, 255)  # #3F7169
WHITE = (255, 255, 255, 255)
TRACK = (255, 255, 255, 72)
SS = 4  # supersampling factor for smooth edges

OUT = Path(__file__).resolve().parent.parent / "public"


def draw_icon(size: int, *, rounded: bool, ring_scale: float) -> Image.Image:
    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    if rounded:
        d.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * 0.22), fill=BG)
    else:
        d.rectangle([0, 0, s, s], fill=BG)

    cx = cy = s / 2
    radius = s * ring_scale
    width = max(2, int(s * 0.078))
    box = [cx - radius, cy - radius, cx + radius, cy + radius]

    # track (separate layer so its alpha blends over the tile)
    track = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(track).ellipse(box, outline=TRACK, width=width)
    img = Image.alpha_composite(img, track)
    d = ImageDraw.Draw(img)

    # progress arc: 75% of the circle, starting at 12 o'clock, round caps
    start, end = -90, 180
    d.arc(box, start=start, end=end, fill=WHITE, width=width)
    for angle in (start, end):
        a = math.radians(angle)
        r_mid = radius - width / 2
        x = cx + r_mid * math.cos(a)
        y = cy + r_mid * math.sin(a)
        d.ellipse([x - width / 2, y - width / 2, x + width / 2, y + width / 2], fill=WHITE)

    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    OUT.mkdir(exist_ok=True)
    draw_icon(192, rounded=True, ring_scale=0.28).save(OUT / "pwa-192x192.png")
    draw_icon(512, rounded=True, ring_scale=0.28).save(OUT / "pwa-512x512.png")
    # Maskable: full-bleed, ring kept inside the central safe zone.
    draw_icon(512, rounded=False, ring_scale=0.19).save(OUT / "pwa-maskable-512x512.png")
    # iOS rounds the corners itself, so no transparency.
    draw_icon(180, rounded=False, ring_scale=0.22).convert("RGB").save(OUT / "apple-touch-icon.png")
    print("Wrote icons to", OUT)


if __name__ == "__main__":
    main()
