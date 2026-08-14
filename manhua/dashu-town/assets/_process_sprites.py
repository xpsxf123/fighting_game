# -*- coding: utf-8 -*-
"""抠透明底（白底/棋盘格）+ 统一脚底锚点；生成行走帧。"""
from pathlib import Path
from collections import deque
from PIL import Image, ImageDraw
import math

ROOT = Path(r"D:\玖鱼-test\cursor\manhua\dashu-town\assets")


def is_bg_color(r, g, b, a=255):
    if a < 12:
        return True
    # 纯白 / 近白
    if r >= 248 and g >= 248 and b >= 248:
        return True
    # 棋盘格常见灰白
    if abs(r - g) <= 6 and abs(g - b) <= 6:
        if r >= 236:  # 浅白格
            return True
        if 175 <= r <= 220:  # 灰格
            return True
    return False


def flood_clear_bg(im):
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    q = deque()
    seen = [[False] * h for _ in range(w)]

    def push(x, y):
        if 0 <= x < w and 0 <= y < h and not seen[x][y]:
            q.append((x, y))
            seen[x][y] = True

    for x in range(w):
        push(x, 0)
        push(x, h - 1)
    for y in range(h):
        push(0, y)
        push(w - 1, y)

    while q:
        x, y = q.popleft()
        r, g, b, a = px[x, y]
        if not is_bg_color(r, g, b, a):
            continue
        px[x, y] = (0, 0, 0, 0)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not seen[nx][ny]:
                nr, ng, nb, na = px[nx, ny]
                if is_bg_color(nr, ng, nb, na):
                    push(nx, ny)

    # 二次：清理残留棋盘碎点（邻域多为透明且自身像底色）
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if not is_bg_color(r, g, b, a):
                continue
            trans = 0
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] < 12:
                    trans += 1
            if trans >= 2:
                px[x, y] = (0, 0, 0, 0)
    return im


def content_bbox(im):
    px = im.load()
    w, h = im.size
    minx, miny, maxx, maxy = w, h, -1, -1
    for y in range(h):
        for x in range(w):
            if px[x, y][3] > 16:
                if x < minx:
                    minx = x
                if y < miny:
                    miny = y
                if x > maxx:
                    maxx = x
                if y > maxy:
                    maxy = y
    if maxx < 0:
        return None
    return (minx, miny, maxx + 1, maxy + 1)


def place_foot_anchor(im, canvas_w, canvas_h, foot_pad=2):
    """裁切内容后贴到画布：水平居中，底边贴脚底。"""
    box = content_bbox(im)
    if not box:
        out = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
        return out
    cropped = im.crop(box)
    cw, ch = cropped.size
    scale = min((canvas_w - 4) / max(cw, 1), (canvas_h - foot_pad - 2) / max(ch, 1))
    nw = max(1, int(cw * scale))
    nh = max(1, int(ch * scale))
    cropped = cropped.resize((nw, nh), Image.Resampling.NEAREST)
    out = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    x = (canvas_w - nw) // 2
    y = canvas_h - nh - foot_pad
    out.paste(cropped, (x, y), cropped)
    return out


def process_file(path, kind):
    im = Image.open(path)
    im = flood_clear_bg(im)
    if kind == "building":
        im = place_foot_anchor(im, 96, 96, 2)
    elif kind == "character":
        im = place_foot_anchor(im, 48, 56, 1)
    elif kind == "ui_icon":
        im = place_foot_anchor(im, 64, 64, 4)
    elif kind == "fx":
        im = place_foot_anchor(im, 64, 64, 4)
    elif kind == "ui_panel":
        # 仅抠底，保持比例；外面透明
        box = content_bbox(im)
        if box:
            im = im.crop(box)
            # 统一到 256 画布居中
            canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
            cw, ch = im.size
            s = min(250 / cw, 250 / ch)
            nw, nh = int(cw * s), int(ch * s)
            im = im.resize((nw, nh), Image.Resampling.LANCZOS)
            canvas.paste(im, ((256 - nw) // 2, (256 - nh) // 2), im)
            im = canvas
    elif kind == "ui_btn":
        box = content_bbox(im)
        if box:
            im = im.crop(box)
            canvas = Image.new("RGBA", (96, 40), (0, 0, 0, 0))
            cw, ch = im.size
            s = min(94 / cw, 38 / ch)
            nw, nh = max(1, int(cw * s)), max(1, int(ch * s))
            im = im.resize((nw, nh), Image.Resampling.LANCZOS)
            canvas.paste(im, ((96 - nw) // 2, (40 - nh) // 2), im)
            im = canvas
    elif kind == "ui_bar":
        box = content_bbox(im)
        if box:
            im = im.crop(box)
    im.save(path, optimize=True)
    print("ok", path.relative_to(ROOT), im.size)


def draw_chibi_frame(size, colors, phase, facing=1):
    """phase 0..3 行走；简单肢体开合。"""
    w, h = size
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx = w // 2
    foot_y = h - 3
    body_c = colors["body"]
    pants_c = colors["pants"]
    skin_c = colors["skin"]
    hat_c = colors["hat"]
    accent = colors.get("accent", (90, 90, 90))

    # 腿摆
    swing = [-3, 4, -3, 4][phase % 4]
    if phase % 2 == 0:
        swing = abs(swing) if phase == 0 else -abs(swing)
    leg_l = swing * facing
    leg_r = -swing * facing
    bob = [0, -1, 0, -1][phase % 4]

    # 腿
    d.line([(cx - 3, foot_y - 12 + bob), (cx - 3 + leg_l, foot_y)], fill=pants_c, width=3)
    d.line([(cx + 3, foot_y - 12 + bob), (cx + 3 + leg_r, foot_y)], fill=pants_c, width=3)
    # 脚
    d.ellipse([cx - 5 + leg_l, foot_y - 2, cx - 1 + leg_l, foot_y + 1], fill=(60, 40, 30))
    d.ellipse([cx + 1 + leg_r, foot_y - 2, cx + 5 + leg_r, foot_y + 1], fill=(60, 40, 30))

    # 身体
    by = foot_y - 22 + bob
    d.rounded_rectangle([cx - 7, by, cx + 7, by + 14], radius=3, fill=body_c)
    # 头
    hy = by - 10
    d.ellipse([cx - 7, hy, cx + 7, hy + 12], fill=skin_c)
    d.ellipse([cx - 2, hy + 4, cx, hy + 6], fill=(30, 30, 30))  # 眼
    d.ellipse([cx + 2, hy + 4, cx + 4, hy + 6], fill=(30, 30, 30))
    # 斗笠/帽
    d.polygon([(cx - 10, hy + 3), (cx + 10, hy + 3), (cx, hy - 4)], fill=hat_c)
    # 手臂摆
    arm = -swing
    d.line([(cx - 7, by + 3), (cx - 10 + arm, by + 10)], fill=skin_c, width=2)
    d.line([(cx + 7, by + 3), (cx + 10 - arm, by + 10)], fill=skin_c, width=2)
    # 道具
    if colors.get("tool") == "hoe":
        d.line([(cx + 6, hy), (cx + 12, by + 8)], fill=accent, width=2)
    elif colors.get("tool") == "hammer":
        d.rectangle([cx + 8, by + 2, cx + 14, by + 6], fill=accent)
    elif colors.get("tool") == "bag":
        d.ellipse([cx + 6, by + 6, cx + 13, by + 13], fill=accent)
    elif colors.get("tool") == "sword":
        d.line([(cx + 8, hy), (cx + 14, by + 6)], fill=accent, width=2)
        d.rectangle([cx + 12, by + 4, cx + 16, by + 8], fill=(189, 189, 189))
    return im


def make_walk_sheets():
    jobs = {
        "farmer": {
            "body": (141, 110, 99),
            "pants": (93, 64, 55),
            "skin": (255, 204, 153),
            "hat": (215, 180, 90),
            "accent": (90, 90, 90),
            "tool": "hoe",
        },
        "artisan": {
            "body": (123, 31, 162),
            "pants": (74, 20, 140),
            "skin": (255, 204, 153),
            "hat": (160, 120, 80),
            "accent": (120, 120, 120),
            "tool": "hammer",
        },
        "merchant": {
            "body": (25, 118, 210),
            "pants": (13, 71, 161),
            "skin": (255, 204, 153),
            "hat": (180, 140, 90),
            "accent": (255, 193, 7),
            "tool": "bag",
        },
        "warrior": {
            "body": (84, 110, 122),
            "pants": (55, 71, 79),
            "skin": (255, 204, 153),
            "hat": (183, 28, 28),
            "accent": (176, 190, 197),
            "tool": "sword",
        },
    }
    out_dir = ROOT / "characters"
    out_dir.mkdir(parents=True, exist_ok=True)
    for job, cols in jobs.items():
        frames = [draw_chibi_frame((48, 56), cols, p) for p in range(4)]
        sheet = Image.new("RGBA", (48 * 4, 56), (0, 0, 0, 0))
        for i, fr in enumerate(frames):
            sheet.paste(fr, (i * 48, 0), fr)
        path = out_dir / ("job_%s_walk.png" % job)
        sheet.save(path, optimize=True)
        # 静止帧覆盖原图（用第 0 帧）
        idle = frames[0]
        idle.save(out_dir / ("job_%s.png" % job), optimize=True)
        print("walk", path.name)


def main():
    mapping = []
    for p in (ROOT / "buildings").glob("*.png"):
        mapping.append((p, "building"))
    for p in (ROOT / "characters").glob("job_*.png"):
        if "_walk" in p.name:
            continue
        mapping.append((p, "character"))
    for p in (ROOT / "ui").glob("*.png"):
        name = p.name
        if name in ("ui_panel.png", "ui_dialog.png"):
            mapping.append((p, "ui_panel"))
        elif name.startswith("ui_btn_normal") or name.startswith("ui_btn_pressed"):
            mapping.append((p, "ui_btn"))
        elif name.startswith("ui_topbar"):
            mapping.append((p, "ui_bar"))
        else:
            mapping.append((p, "ui_icon"))
    for p in (ROOT / "fx").glob("*.png"):
        mapping.append((p, "fx"))

    for path, kind in mapping:
        try:
            process_file(path, kind)
        except Exception as e:
            print("FAIL", path, e)

    make_walk_sheets()
    print("DONE")


if __name__ == "__main__":
    main()
