# -*- coding: utf-8 -*-
"""生成大江户式 2:1 等距菱形地块（边对边无缝）。"""
from pathlib import Path
from PIL import Image, ImageDraw
import random

OUT = Path(__file__).resolve().parent
W, H = 72, 36  # 对齐游戏 ISO_W × ISO_H


def in_diamond(px, py, w=W, h=H):
    # diamond centered in w×h: |dx|/(w/2) + |dy|/(h/2) <= 1
    cx, cy = (w - 1) / 2.0, (h - 1) / 2.0
    dx = abs(px - cx) / (w / 2.0)
    dy = abs(py - cy) / (h / 2.0)
    return dx + dy <= 1.02


def shade(base, n):
    return tuple(max(0, min(255, c + n)) for c in base)


def make_tile(name, base, variance=12, edge_dark=-18, speck=None):
    random.seed(hash(name) & 0xFFFFFFFF)
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    px = im.load()
    for y in range(H):
        for x in range(W):
            if not in_diamond(x, y):
                continue
            n = random.randint(-variance, variance)
            # 略压暗菱形边，方便看出接缝是否对齐
            cx, cy = (W - 1) / 2.0, (H - 1) / 2.0
            dx = abs(x - cx) / (W / 2.0)
            dy = abs(y - cy) / (H / 2.0)
            edge = dx + dy
            if edge > 0.88:
                n += edge_dark
            col = shade(base, n)
            if speck and random.random() < speck[0]:
                col = shade(speck[1], random.randint(-6, 6))
            px[x, y] = (col[0], col[1], col[2], 255)
    return im


def make_road():
    """土路：菱形内偏中心的深色路径纹理。"""
    random.seed(42)
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    px = im.load()
    base = (141, 110, 99)
    path = (121, 85, 72)
    for y in range(H):
        for x in range(W):
            if not in_diamond(x, y):
                continue
            cx, cy = (W - 1) / 2.0, (H - 1) / 2.0
            # 沿菱形长轴的路径带
            t = abs((x - cx) * 0.35 + (y - cy) * 0.9)
            n = random.randint(-10, 10)
            col = path if t < 7 else base
            if t < 5:
                col = shade(path, -8)
            col = shade(col, n)
            px[x, y] = (col[0], col[1], col[2], 255)
    return im


def save(im, rel):
    path = OUT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, optimize=True)
    print("wrote", path, im.size)


def main():
    save(make_tile("grass", (124, 179, 66), 14, -16, (0.08, (156, 204, 101))), "terrain/tile_grass.png")
    save(make_tile("dirt", (161, 136, 127), 12, -14, (0.05, (141, 110, 99))), "terrain/tile_dirt.png")
    save(make_tile("water", (66, 165, 245), 10, -20, (0.12, (100, 181, 246))), "terrain/tile_water.png")
    save(make_tile("soil", (121, 85, 72), 10, -12, (0.1, (93, 64, 55))), "terrain/tile_soil_farm.png")
    save(make_road(), "roads/road_dirt.png")
    print("DONE")


if __name__ == "__main__":
    main()
