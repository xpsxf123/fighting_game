# -*- coding: utf-8 -*-
"""
开罗系核心贴图：土路 autotile(0..15) + 茅棚 + 四职业 idle/walk
依据：.cursor/skills/kairosoft-pixel-assets/SKILL.md
"""
from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw
import random

ROOT = Path(__file__).resolve().parent
TW, TH = 64, 32  # 2:1 diamond
BW, BH = 96, 96
CW, CH = 48, 56
FOOT_Y = BH - 2


def shade(c, n):
    return tuple(max(0, min(255, int(v + n))) for v in c)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def in_diamond(px, py, w=TW, h=TH):
    cx, cy = (w - 1) / 2.0, (h - 1) / 2.0
    dx = abs(px - cx) / (w / 2.0)
    dy = abs(py - cy) / (h / 2.0)
    return dx + dy <= 1.02


def diamond_edge_side(px, py, w=TW, h=TH):
    """Nearest diamond rim side: N/E/S/W (grid neighbors y-1 / x+1 / y+1 / x-1)."""
    cx, cy = (w - 1) / 2.0, (h - 1) / 2.0
    dx = (px - cx) / (w / 2.0)
    dy = (py - cy) / (h / 2.0)
    if abs(dx) + abs(dy) < 0.72:
        return None
    # residual to four edge lines of |dx|+|dy|=1
    r_ne = abs(dx - dy - 1)  # T→R → neighbor N (y-1)
    r_se = abs(dx + dy - 1)  # R→B → neighbor E (x+1)
    r_sw = abs(-dx + dy - 1)  # B→L → neighbor S (y+1)
    r_nw = abs(-dx - dy - 1)  # L→T → neighbor W (x-1)
    best = min(r_ne, r_se, r_sw, r_nw)
    if best > 0.55:
        return None
    if best == r_ne:
        return "N"
    if best == r_se:
        return "E"
    if best == r_sw:
        return "S"
    return "W"


# bit set = connected (no grass on that edge)
SIDE_BIT = {"N": 1, "E": 2, "S": 4, "W": 8}


def make_road(mask: int) -> Image.Image:
    random.seed(1000 + mask)
    im = Image.new("RGBA", (TW, TH), (0, 0, 0, 0))
    px = im.load()
    dirt = (158, 118, 86)
    dirt2 = (140, 100, 70)
    dirt_edge = (110, 78, 52)
    grass = (110, 168, 62)
    grass2 = (92, 148, 52)
    outline = (72, 48, 32)

    for y in range(TH):
        for x in range(TW):
            if not in_diamond(x, y):
                continue
            cx, cy = (TW - 1) / 2.0, (TH - 1) / 2.0
            dx = abs(x - cx) / (TW / 2.0)
            dy = abs(y - cy) / (TH / 2.0)
            rim = dx + dy
            n = random.randint(-10, 10)
            side = diamond_edge_side(x, y)
            need_grass = False
            if side and rim > 0.78:
                bit = SIDE_BIT[side]
                if (mask & bit) == 0:
                    need_grass = True

            if need_grass:
                col = shade(grass if random.random() > 0.35 else grass2, n // 2)
                # tiny blade speck
                if rim > 0.9 and random.random() < 0.25:
                    col = shade(col, 18)
            else:
                # packed earth with center lighter path + pebbles
                t = 1.0 - min(1.0, rim * 0.85)
                base = lerp(dirt_edge, dirt, 0.35 + t * 0.65)
                if abs((x - cx) * 0.25 + (y - cy) * 0.9) < 4 and rim < 0.85:
                    base = lerp(base, dirt2, 0.35)
                col = shade(base, n)
                if rim < 0.7 and random.random() < 0.06:
                    col = shade((130, 120, 105), random.randint(-8, 8))
                if rim > 0.92:
                    col = shade(outline, 8)

            px[x, y] = (col[0], col[1], col[2], 255)

    # soft outline on diamond rim
    d = ImageDraw.Draw(im)
    pts = [
        (TW // 2, 0),
        (TW - 1, TH // 2),
        (TW // 2, TH - 1),
        (0, TH // 2),
    ]
    d.line(pts + [pts[0]], fill=(62, 39, 35, 90), width=1)
    return im


def iso_box(d, cx, foot_y, w, body_h, top, left, right, outline=(62, 39, 35)):
    """Kairo box: left=SW dark, right=SE mid (front / door side)."""
    hw = w // 2
    hh = max(6, w // 4)  # diamond half-height of top face (~2:1)
    top_y = foot_y - body_h
    # left SW (darker)
    d.polygon(
        [(cx - hw, foot_y - hh), (cx, foot_y), (cx, top_y + hh), (cx - hw, top_y)],
        fill=left,
        outline=outline,
    )
    # right SE (front)
    d.polygon(
        [(cx + hw, foot_y - hh), (cx, foot_y), (cx, top_y + hh), (cx + hw, top_y)],
        fill=right,
        outline=outline,
    )
    # top
    d.polygon(
        [(cx, top_y), (cx + hw, top_y + hh), (cx, top_y + body_h), (cx - hw, top_y + hh)],
        fill=top,
        outline=outline,
    )
    return top_y, hw, hh


def draw_hut():
    """茅棚 — 门在 SE 右面，屋脊倾向右下。"""
    im = Image.new("RGBA", (BW, BH), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx = BW // 2
    wall = (208, 176, 138)
    wall_l = shade(wall, -32)
    wall_r = shade(wall, -6)
    wall_t = shade(wall, 24)
    roof = (168, 132, 64)
    roof_d = shade(roof, -28)
    outline = (62, 39, 35)

    iso_box(d, cx, FOOT_Y, 42, 14, shade((150, 120, 88), 8), (118, 88, 58), (132, 100, 68))
    top_y, hw, hh = iso_box(d, cx, FOOT_Y - 6, 38, 38, wall_t, wall_l, wall_r)

    # door on SE right face (parallelogram along right wall)
    door = (96, 60, 42)
    d.polygon(
        [
            (cx + 4, FOOT_Y - 24),
            (cx + 15, FOOT_Y - 18),
            (cx + 15, FOOT_Y - 7),
            (cx + 4, FOOT_Y - 13),
        ],
        fill=door,
        outline=outline,
    )
    d.ellipse([cx + 11, FOOT_Y - 16, cx + 13, FOOT_Y - 14], fill=(220, 190, 90))
    d.polygon(
        [
            (cx + 8, FOOT_Y - 32),
            (cx + 14, FOOT_Y - 29),
            (cx + 14, FOOT_Y - 24),
            (cx + 8, FOOT_Y - 27),
        ],
        fill=(255, 236, 179),
        outline=outline,
    )

    # thatched roof: peak shifts SE
    ry = top_y + 4
    d.polygon(
        [
            (cx - 24, ry + 16),
            (cx + 6, ry - 12),
            (cx + 26, ry + 12),
            (cx + 0, ry + 24),
        ],
        fill=roof,
        outline=outline,
    )
    for i in range(-18, 20, 4):
        d.line([(cx + i, ry + 14), (cx + i + 8, ry)], fill=roof_d, width=1)
    d.line([(cx - 22, ry + 16), (cx + 24, ry + 14)], fill=shade(roof, -42), width=2)
    # bamboo post SW side
    d.line([(cx - 17, FOOT_Y - 8), (cx - 17, FOOT_Y - 36)], fill=(110, 150, 70), width=2)

    path = ROOT / "buildings" / "house_hut.png"
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, optimize=True)
    print("hut", path)
    return im


def draw_chibi(size, colors, phase, facing=1, pose="walk"):
    """开罗风 Q 版：3/4 朝右下(SE)，大头短身。"""
    w, h = size
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx = w // 2 + 1
    foot_y = h - 2
    body_c = colors["body"]
    pants_c = colors["pants"]
    skin_c = colors["skin"]
    hat_c = colors["hat"]
    accent = colors.get("accent", (90, 90, 90))
    outline = (55, 32, 28)

    swing = [-4, 6, -4, 6][phase % 4]
    bob = [0, -2, 0, -2][phase % 4]
    if pose == "idle":
        swing, bob = 0, 0
    leg_l, leg_r = swing, -swing

    d.ellipse([cx - 9, foot_y - 3, cx + 7, foot_y + 1], fill=(0, 0, 0, 50))

    ly = foot_y - 14 + bob
    d.line([(cx - 4, ly), (cx - 5 + leg_l, foot_y - 1)], fill=outline, width=4)
    d.line([(cx - 4, ly), (cx - 5 + leg_l, foot_y - 1)], fill=pants_c, width=3)
    d.line([(cx + 2, ly), (cx + 4 + leg_r, foot_y - 1)], fill=outline, width=4)
    d.line([(cx + 2, ly), (cx + 4 + leg_r, foot_y - 1)], fill=shade(pants_c, 15), width=3)
    d.ellipse([cx - 8 + leg_l, foot_y - 4, cx - 2 + leg_l, foot_y], fill=(65, 40, 28), outline=outline)
    d.ellipse([cx + 1 + leg_r, foot_y - 4, cx + 7 + leg_r, foot_y], fill=(75, 48, 32), outline=outline)

    by = foot_y - 26 + bob
    d.polygon(
        [(cx - 9, by + 2), (cx + 7, by), (cx + 9, by + 14), (cx - 8, by + 15)],
        fill=body_c, outline=outline,
    )
    d.line([(cx + 6, by + 2), (cx + 8, by + 13)], fill=shade(body_c, 28), width=2)

    hy = by - 12
    d.ellipse([cx - 9, hy, cx + 8, hy + 14], fill=skin_c, outline=outline)
    d.ellipse([cx - 1, hy + 5, cx + 1, hy + 7], fill=(25, 20, 18))
    d.ellipse([cx + 3, hy + 5, cx + 5, hy + 7], fill=(25, 20, 18))
    d.point((cx + 1, hy + 5), fill=(255, 255, 255))
    d.point((cx + 5, hy + 5), fill=(255, 255, 255))
    d.ellipse([cx + 4, hy + 8, cx + 6, hy + 10], fill=(240, 140, 120))

    d.polygon([(cx - 12, hy + 5), (cx + 11, hy + 4), (cx + 1, hy - 6)], fill=hat_c, outline=outline)
    d.ellipse([cx - 5, hy + 2, cx + 5, hy + 6], fill=shade(hat_c, -25), outline=outline)

    arm = -swing if pose == "walk" else 1
    d.line([(cx - 8, by + 4), (cx - 12 + arm, by + 12)], fill=outline, width=3)
    d.line([(cx - 8, by + 4), (cx - 12 + arm, by + 12)], fill=skin_c, width=2)
    d.line([(cx + 7, by + 3), (cx + 12 - arm // 2, by + 11)], fill=outline, width=3)
    d.line([(cx + 7, by + 3), (cx + 12 - arm // 2, by + 11)], fill=skin_c, width=2)

    tool = colors.get("tool")
    if tool == "hoe":
        d.line([(cx + 11, hy + 1), (cx + 15, by + 11)], fill=(100, 75, 45), width=2)
        d.polygon([(cx + 13, by + 9), (cx + 18, by + 11), (cx + 14, by + 13)], fill=(90, 90, 95), outline=outline)
    elif tool == "hammer":
        d.line([(cx + 10, by - 1), (cx + 10, by + 9)], fill=(120, 90, 50), width=2)
        d.rectangle([cx + 6, by - 4, cx + 15, by], fill=accent, outline=outline)
    elif tool == "bag":
        d.ellipse([cx + 8, by + 5, cx + 16, by + 14], fill=accent, outline=outline)
    elif tool == "sword":
        d.line([(cx + 9, hy - 1), (cx + 16, by + 5)], fill=(200, 210, 215), width=2)

    if facing < 0:
        im = im.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    return im


JOBS = {
    "farmer": {
        "body": (150, 118, 96),
        "pants": (96, 68, 52),
        "skin": (255, 210, 168),
        "hat": (218, 186, 96),
        "accent": (90, 90, 90),
        "tool": "hoe",
    },
    "artisan": {
        "body": (126, 87, 194),
        "pants": (74, 40, 140),
        "skin": (255, 210, 168),
        "hat": (160, 120, 80),
        "accent": (140, 140, 150),
        "tool": "hammer",
    },
    "merchant": {
        "body": (36, 128, 210),
        "pants": (20, 80, 160),
        "skin": (255, 210, 168),
        "hat": (190, 150, 90),
        "accent": (255, 193, 7),
        "tool": "bag",
    },
    "warrior": {
        "body": (90, 118, 128),
        "pants": (55, 70, 78),
        "skin": (255, 210, 168),
        "hat": (183, 40, 40),
        "accent": (190, 200, 205),
        "tool": "sword",
    },
}


def make_characters():
    out = ROOT / "characters"
    out.mkdir(parents=True, exist_ok=True)
    for job, cols in JOBS.items():
        idle = draw_chibi((CW, CH), cols, 0, pose="idle")
        idle.save(out / ("job_%s.png" % job), optimize=True)
        frames = [draw_chibi((CW, CH), cols, p, pose="walk") for p in range(4)]
        sheet = Image.new("RGBA", (CW * 4, CH), (0, 0, 0, 0))
        for i, fr in enumerate(frames):
            sheet.paste(fr, (i * CW, 0), fr)
        sheet.save(out / ("job_%s_walk.png" % job), optimize=True)
        print("char", job)


def make_roads():
    out = ROOT / "roads"
    out.mkdir(parents=True, exist_ok=True)
    for mask in range(16):
        im = make_road(mask)
        im.save(out / ("road_dirt_%d.png" % mask), optimize=True)
    # default / menu alias
    make_road(0).save(out / "road_dirt.png", optimize=True)
    print("roads 0..15 + road_dirt.png")


def main():
    make_roads()
    draw_hut()
    make_characters()
    print("DONE kairo core assets")


if __name__ == "__main__":
    main()
