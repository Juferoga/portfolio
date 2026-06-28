#!/usr/bin/env python3
"""Genera la imagen Open Graph (1200x630) con estética terminal hacker."""
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
BG = (10, 14, 10)
BG2 = (5, 8, 5)
GREEN = (51, 255, 102)
BRIGHT = (170, 255, 187)
ACCENT = (0, 255, 170)
DIM = (31, 153, 67)
DOTR, DOTY, DOTG = (255, 95, 86), (255, 189, 46), (39, 201, 63)

img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)

# Fondo con leve viñeta + scanlines
for y in range(0, H, 4):
    d.line([(0, y), (W, y)], fill=(0, 0, 0), width=1)

def font(path_list, size):
    for p in path_list:
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            continue
    return ImageFont.load_default()

MONO = ["/System/Library/Fonts/Menlo.ttc",
        "/System/Library/Fonts/Monaco.ttf",
        "/Library/Fonts/Courier New.ttf"]
f_big = font(MONO, 64)
f_mid = font(MONO, 34)
f_small = font(MONO, 28)
f_tiny = font(MONO, 24)

# Marco de ventana terminal
m = 50
d.rounded_rectangle([m, m, W - m, H - m], radius=18, fill=BG2, outline=DIM, width=2)
# Title bar
tb = m + 56
d.line([(m, tb), (W - m, tb)], fill=DIM, width=2)
cx = m + 34
for col in (DOTR, DOTY, DOTG):
    d.ellipse([cx, m + 20, cx + 18, m + 38], fill=col)
    cx += 28
d.text((W / 2, m + 28), "juferoga@portfolio: ~", font=f_tiny, fill=DIM, anchor="mm")

# Contenido
x = m + 50
y = tb + 45
d.text((x, y), "juferoga@portfolio:~$ whoami", font=f_small, fill=DIM)
y += 70
d.text((x, y), "Juan Felipe Rodríguez", font=f_big, fill=BRIGHT)
y += 78
d.text((x, y), "Galindo", font=f_big, fill=BRIGHT)
y += 90
d.text((x, y), "Cloud Developer · Ingeniero de Sistemas", font=f_mid, fill=ACCENT)
y += 64
# quote
d.line([(x, y + 6), (x, y + 44)], fill=ACCENT, width=4)
d.text((x + 18, y), '"Cambiando el mundo una línea a la vez"', font=f_small, fill=GREEN)

# Foto avatar (esquina inferior derecha) con borde
try:
    av = Image.open("public/assets/photos/avatar.jpg").convert("RGB")
    side = 210
    aw, ah = av.size
    s = side / min(aw, ah)
    av = av.resize((int(aw * s), int(ah * s)))
    aw, ah = av.size
    av = av.crop(((aw - side) // 2, (ah - side) // 2, (aw - side) // 2 + side, (ah - side) // 2 + side))
    px, py = W - m - side - 30, H - m - side - 30
    d.rounded_rectangle([px - 4, py - 4, px + side + 4, py + side + 4], radius=14, outline=ACCENT, width=3)
    mask = Image.new("L", (side, side), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, side, side], radius=12, fill=255)
    img.paste(av, (px, py), mask)
except Exception as e:
    print("avatar skip:", e)

# Footer
d.text((x, H - m - 50), "▸ juferoga.pro", font=f_small, fill=GREEN)

img.save("public/og.png", "PNG")
print("OK -> public/og.png", img.size)
