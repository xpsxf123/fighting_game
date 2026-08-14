# -*- coding: utf-8 -*-
"""S3 建筑贴图：客栈、马厩、温泉、擂台。"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
CW, CH = 96, 96
FOOT_Y = CH - 2


def shade(c, n):
    return tuple(max(0, min(255, v + n)) for v in c)


def new_canvas():
    return Image.new("RGBA", (CW, CH), (0, 0, 0, 0))


def iso_base(d, cx, foot_y, w, h, top, left, right):
    hw, hh = w // 2, h // 2
    top_y = foot_y - h
    d.polygon([(cx - hw, foot_y - hh), (cx, foot_y), (cx, top_y + hh), (cx - hw, top_y)], fill=left)
    d.polygon([(cx + hw, foot_y - hh), (cx, foot_y), (cx, top_y + hh), (cx + hw, top_y)], fill=right)
    d.polygon([(cx, top_y), (cx + hw, top_y + hh), (cx, top_y + h), (cx - hw, top_y + hh)], fill=top)


def roof_thatch(d, cx, y, w, color):
    d.polygon([(cx - w, y + 8), (cx + w, y + 8), (cx, y - 6)], fill=color)


def draw_inn():
    im = new_canvas()
    d = ImageDraw.Draw(im)
    cx = CW // 2
    wall = (141, 110, 99)
    iso_base(d, cx, FOOT_Y, 36, 12, shade(wall, 20), wall, shade(wall, -16))
    iso_base(d, cx, FOOT_Y - 6, 32, 36, shade(wall, 30), shade(wall, 8), shade(wall, -12))
    roof_thatch(d, cx, FOOT_Y - 42, 24, (183, 28, 28))
    d.rectangle([cx - 10, FOOT_Y - 52, cx + 10, FOOT_Y - 44], fill=(255, 248, 225))
    d.rectangle([cx - 6, FOOT_Y - 20, cx + 6, FOOT_Y - 8], fill=(62, 39, 35))
    im.save(ROOT / "buildings" / "fac_inn.png", optimize=True)
    print("fac_inn.png")


def draw_stable():
    im = new_canvas()
    d = ImageDraw.Draw(im)
    cx = CW // 2
    wood = (121, 85, 72)
    iso_base(d, cx, FOOT_Y, 38, 10, shade(wood, 15), wood, shade(wood, -18))
    d.rectangle([cx - 20, FOOT_Y - 32, cx + 20, FOOT_Y - 10], fill=(161, 136, 127))
    d.polygon([(cx - 22, FOOT_Y - 32), (cx + 22, FOOT_Y - 32), (cx, FOOT_Y - 48)], fill=(93, 64, 55))
    d.ellipse([cx - 14, FOOT_Y - 22, cx - 4, FOOT_Y - 12], fill=(141, 110, 99))
    d.ellipse([cx + 4, FOOT_Y - 22, cx + 14, FOOT_Y - 12], fill=(141, 110, 99))
    im.save(ROOT / "buildings" / "fac_stable.png", optimize=True)
    print("fac_stable.png")


def draw_hot_spring():
    im = new_canvas()
    d = ImageDraw.Draw(im)
    cx = CW // 2
    stone = (120, 144, 156)
    iso_base(d, cx, FOOT_Y, 40, 14, shade(stone, 20), stone, shade(stone, -16))
    d.ellipse([cx - 18, FOOT_Y - 28, cx + 18, FOOT_Y - 6], fill=(77, 208, 225))
    d.ellipse([cx - 12, FOOT_Y - 24, cx + 12, FOOT_Y - 10], fill=(178, 235, 242))
    for i in range(-2, 3):
        d.ellipse([cx + i * 6 - 2, FOOT_Y - 34 - i * 2, cx + i * 6 + 2, FOOT_Y - 28 - i * 2], fill=(200, 230, 255, 180))
    im.save(ROOT / "buildings" / "fac_hot_spring.png", optimize=True)
    print("fac_hot_spring.png")


def draw_arena():
    im = new_canvas()
    d = ImageDraw.Draw(im)
    cx = CW // 2
    sand = (255, 204, 128)
    wood = (121, 85, 72)
    iso_base(d, cx, FOOT_Y, 42, 12, shade(sand, 10), sand, shade(sand, -12))
    d.rectangle([cx - 18, FOOT_Y - 28, cx + 18, FOOT_Y - 12], fill=(255, 224, 178))
    d.rectangle([cx - 20, FOOT_Y - 30, cx - 16, FOOT_Y - 10], fill=wood)
    d.rectangle([cx + 16, FOOT_Y - 30, cx + 20, FOOT_Y - 10], fill=wood)
    d.polygon([(cx - 22, FOOT_Y - 30), (cx + 22, FOOT_Y - 30), (cx, FOOT_Y - 44)], fill=(183, 28, 28))
    im.save(ROOT / "buildings" / "fac_arena.png", optimize=True)
    print("fac_arena.png")


def main():
    (ROOT / "buildings").mkdir(parents=True, exist_ok=True)
    draw_inn()
    draw_stable()
    draw_hot_spring()
    draw_arena()
    print("S3 buildings done — run _process_sprites.py")


if __name__ == "__main__":
    main()
