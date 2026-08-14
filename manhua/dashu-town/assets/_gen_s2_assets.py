# -*- coding: utf-8 -*-
"""生成 S2 建筑/角色程序化贴图（开罗风像素等距），供 _process_sprites.py 抠底统一锚点。"""
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
    """菱形底座 + 立体三面体块。"""
    hw, hh = w // 2, h // 2
    top_y = foot_y - h
    # 左面
    d.polygon([(cx - hw, foot_y - hh), (cx, foot_y), (cx, top_y + hh), (cx - hw, top_y)], fill=left)
    # 右面
    d.polygon([(cx + hw, foot_y - hh), (cx, foot_y), (cx, top_y + hh), (cx + hw, top_y)], fill=right)
    # 顶面
    d.polygon([(cx, top_y), (cx + hw, top_y + hh), (cx, top_y + h), (cx - hw, top_y + hh)], fill=top)


def roof_thatch(d, cx, y, w, color):
    d.polygon([(cx - w, y + 8), (cx + w, y + 8), (cx, y - 6)], fill=color)
    for i in range(-w + 4, w - 2, 6):
        d.line([(cx + i, y + 7), (cx + i - 3, y - 2)], fill=shade(color, -25), width=1)


def roof_tile(d, cx, y, w, base, edge):
    d.polygon([(cx - w, y + 10), (cx + w, y + 10), (cx, y - 4)], fill=base)
    for row in range(3):
        ry = y - 2 + row * 5
        for col in range(-w + 6, w - 4, 8):
            d.rectangle([cx + col, ry, cx + col + 6, ry + 4], fill=edge)


def draw_house(name, wall, roof_c, accent=None, tall=False):
    im = new_canvas()
    d = ImageDraw.Draw(im)
    cx = CW // 2
    h = 34 if not tall else 42
    iso_base(d, cx, FOOT_Y, 34, 14, shade(wall, 30), wall, shade(wall, -18))
    iso_base(d, cx, FOOT_Y - 8, 28, h, shade(wall, 40), shade(wall, 8), shade(wall, -12))
    roof_thatch(d, cx, FOOT_Y - 8 - h + 4, 24, roof_c)
    if accent:
        # 门
        d.rectangle([cx - 5, FOOT_Y - 18, cx + 5, FOOT_Y - 6], fill=accent)
    im.save(ROOT / "buildings" / name, optimize=True)
    print("building", name)


def draw_tile_house():
    im = new_canvas()
    d = ImageDraw.Draw(im)
    cx = CW // 2
    wall = (120, 144, 156)
    iso_base(d, cx, FOOT_Y, 36, 14, shade(wall, 28), wall, shade(wall, -16))
    iso_base(d, cx, FOOT_Y - 8, 30, 38, shade(wall, 36), shade(wall, 10), shade(wall, -14))
    roof_tile(d, cx, FOOT_Y - 46, 26, (96, 125, 139), (69, 90, 100))
    d.rectangle([cx - 6, FOOT_Y - 20, cx + 6, FOOT_Y - 7], fill=(62, 39, 35))
    d.rectangle([cx - 4, FOOT_Y - 24, cx - 1, FOOT_Y - 20], fill=(255, 236, 179))
    im.save(ROOT / "buildings" / "house_tile.png", optimize=True)
    print("building house_tile.png")


def draw_castle():
    im = new_canvas()
    d = ImageDraw.Draw(im)
    cx = CW // 2
    stone = (96, 125, 139)
    dark = (69, 90, 100)
    # 台基
    iso_base(d, cx, FOOT_Y, 44, 16, shade(stone, 20), stone, shade(stone, -20))
    # 主楼
    iso_base(d, cx, FOOT_Y - 10, 34, 46, shade(stone, 35), shade(stone, 10), dark)
    # 左右耳楼
    iso_base(d, cx - 22, FOOT_Y - 6, 16, 28, shade(stone, 28), stone, shade(stone, -15))
    iso_base(d, cx + 22, FOOT_Y - 6, 16, 28, shade(stone, 28), stone, shade(stone, -15))
    roof_tile(d, cx, FOOT_Y - 56, 24, (55, 71, 79), (38, 50, 56))
    roof_tile(d, cx - 22, FOOT_Y - 34, 12, (55, 71, 79), (38, 50, 56))
    roof_tile(d, cx + 22, FOOT_Y - 34, 12, (55, 71, 79), (38, 50, 56))
    # 衙门匾
    d.rectangle([cx - 14, FOOT_Y - 44, cx + 14, FOOT_Y - 36], fill=(139, 69, 19))
    d.rectangle([cx - 12, FOOT_Y - 42, cx + 12, FOOT_Y - 38], fill=(255, 215, 0))
    # 朱门
    d.rectangle([cx - 8, FOOT_Y - 22, cx + 8, FOOT_Y - 8], fill=(183, 28, 28))
    d.ellipse([cx - 2, FOOT_Y - 16, cx + 2, FOOT_Y - 12], fill=(255, 215, 0))
    im.save(ROOT / "buildings" / "fac_castle.png", optimize=True)
    print("building fac_castle.png")


def draw_well():
    im = new_canvas()
    d = ImageDraw.Draw(im)
    cx = CW // 2
    stone = (158, 158, 158)
    iso_base(d, cx, FOOT_Y, 30, 10, shade(stone, 18), stone, shade(stone, -16))
    d.ellipse([cx - 14, FOOT_Y - 26, cx + 14, FOOT_Y - 4], fill=shade(stone, -8), outline=(97, 97, 97))
    d.ellipse([cx - 10, FOOT_Y - 22, cx + 10, FOOT_Y - 8], fill=(66, 165, 245))
    d.rectangle([cx - 16, FOOT_Y - 30, cx - 12, FOOT_Y - 22], fill=(121, 85, 72))
    d.rectangle([cx + 12, FOOT_Y - 30, cx + 16, FOOT_Y - 22], fill=(121, 85, 72))
    d.line([(cx - 14, FOOT_Y - 30), (cx + 14, FOOT_Y - 30)], fill=(121, 85, 72), width=3)
    d.ellipse([cx - 4, FOOT_Y - 18, cx + 4, FOOT_Y - 12], fill=(141, 110, 99))
    im.save(ROOT / "buildings" / "env_well.png", optimize=True)
    print("building env_well.png")


def draw_shop(name, sign, body, roof):
    im = new_canvas()
    d = ImageDraw.Draw(im)
    cx = CW // 2
    iso_base(d, cx, FOOT_Y, 34, 12, shade(body, 24), body, shade(body, -16))
    iso_base(d, cx, FOOT_Y - 6, 30, 32, shade(body, 32), shade(body, 8), shade(body, -12))
    roof_thatch(d, cx, FOOT_Y - 38, 22, roof)
    # 招牌
    d.rectangle([cx - 12, FOOT_Y - 50, cx + 12, FOOT_Y - 40], fill=(139, 69, 19))
    d.rectangle([cx - 10, FOOT_Y - 48, cx + 10, FOOT_Y - 42], fill=(255, 248, 225))
    # 简字（像素点阵）
    d.rectangle([cx - 3, FOOT_Y - 47, cx + 3, FOOT_Y - 43], fill=(62, 39, 35))
    if sign == "茶":
        d.point([(cx, FOOT_Y - 46), (cx - 2, FOOT_Y - 44), (cx + 2, FOOT_Y - 44)], fill=(62, 39, 35))
    elif sign == "米":
        d.rectangle([cx - 1, FOOT_Y - 46, cx + 1, FOOT_Y - 43], fill=(62, 39, 35))
    d.rectangle([cx - 5, FOOT_Y - 18, cx + 5, FOOT_Y - 8], fill=(62, 39, 35))
    im.save(ROOT / "buildings" / name, optimize=True)
    print("building", name)


def draw_chibi_warrior(size, phase):
    """与 _process_sprites.draw_chibi_frame 同规格，甲士配色。"""
    w, h = size
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx = w // 2
    foot_y = h - 3
    body_c = (84, 110, 122)
    pants_c = (55, 71, 79)
    skin_c = (255, 204, 153)
    hat_c = (183, 28, 28)
    swing = [-3, 4, -3, 4][phase % 4]
    bob = [0, -1, 0, -1][phase % 4]
    leg_l, leg_r = swing, -swing
    d.line([(cx - 3, foot_y - 12 + bob), (cx - 3 + leg_l, foot_y)], fill=pants_c, width=3)
    d.line([(cx + 3, foot_y - 12 + bob), (cx + 3 + leg_r, foot_y)], fill=pants_c, width=3)
    d.ellipse([cx - 5 + leg_l, foot_y - 2, cx - 1 + leg_l, foot_y + 1], fill=(60, 40, 30))
    d.ellipse([cx + 1 + leg_r, foot_y - 2, cx + 5 + leg_r, foot_y + 1], fill=(60, 40, 30))
    by = foot_y - 22 + bob
    d.rounded_rectangle([cx - 7, by, cx + 7, by + 14], radius=3, fill=body_c)
    hy = by - 10
    d.ellipse([cx - 7, hy, cx + 7, hy + 12], fill=skin_c)
    d.ellipse([cx - 2, hy + 4, cx, hy + 6], fill=(30, 30, 30))
    d.ellipse([cx + 2, hy + 4, cx + 4, hy + 6], fill=(30, 30, 30))
    d.polygon([(cx - 10, hy + 3), (cx + 10, hy + 3), (cx, hy - 6)], fill=hat_c)
    arm = -swing
    d.line([(cx - 7, by + 3), (cx - 10 + arm, by + 10)], fill=skin_c, width=2)
    d.line([(cx + 7, by + 3), (cx + 14, by + 2)], fill=(189, 189, 189), width=2)
    d.rectangle([cx + 12, by - 4, cx + 16, by + 8], fill=(176, 190, 197))
    return im


def make_warrior_chars():
    out = ROOT / "characters"
    out.mkdir(parents=True, exist_ok=True)
    frames = [draw_chibi_warrior((48, 56), p) for p in range(4)]
    sheet = Image.new("RGBA", (48 * 4, 56), (0, 0, 0, 0))
    for i, fr in enumerate(frames):
        sheet.paste(fr, (i * 48, 0), fr)
    sheet.save(out / "job_warrior_walk.png", optimize=True)
    frames[0].save(out / "job_warrior.png", optimize=True)
    print("character job_warrior")


def main():
    (ROOT / "buildings").mkdir(parents=True, exist_ok=True)
    draw_house("house_thatched.png", (161, 136, 127), (139, 195, 74), (101, 67, 33))
    draw_tile_house()
    draw_castle()
    draw_well()
    draw_shop("shop_tea.png", "茶", (141, 110, 99), (121, 85, 72))
    draw_shop("shop_rice.png", "米", (255, 204, 128), (255, 183, 77))
    make_warrior_chars()
    print("S2 assets generated — run _process_sprites.py next")


if __name__ == "__main__":
    main()
