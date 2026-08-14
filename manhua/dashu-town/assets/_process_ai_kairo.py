# -*- coding: utf-8 -*-
"""
将 GenerateImage 产出的开罗风图后处理为游戏可用贴图。
源图：dashu-town/assets/_ai_src（从 Cursor assets 同步）
"""
from __future__ import annotations

from pathlib import Path
from collections import deque
from PIL import Image, ImageEnhance, ImageDraw
import shutil

ROOT = Path(__file__).resolve().parent
AI_SRC = ROOT / "_ai_src"
CURSOR_ASSETS = Path(r"C:\Users\JY\.cursor\projects\d-test-cursor-manhua\assets")

TW, TH = 144, 72  # 高清菱形 = 2× 游戏格 ISO 72×36
BW, BH = 108, 108  # 建筑画布；脚底菱形满宽 = BW → 缩放到 ISO_W
CW, CH = 40, 46
IW = 32  # UI/FX 小图标
ISO_W_GAME = 72
ISO_H_GAME = 36
SIDE_BIT = {"N": 1, "E": 2, "S": 4, "W": 8}

# 柔和色调（对齐满意的 house_hut）
COLOR_BUILDING = 0.90
CONTRAST_BUILDING = 1.04
COLOR_TERRAIN = 0.88
CONTRAST_TERRAIN = 1.04
COLOR_ROAD = 0.90
CONTRAST_ROAD = 1.05
SHARPNESS_ROAD = 1.12
COLOR_CHAR = 0.90
COLOR_ICON = 0.90


def tone(im: Image.Image, color=1.0, contrast=1.0, sharpness=1.0) -> Image.Image:
    if color != 1.0:
        im = ImageEnhance.Color(im).enhance(color)
    if contrast != 1.0:
        im = ImageEnhance.Contrast(im).enhance(contrast)
    if sharpness != 1.0:
        im = ImageEnhance.Sharpness(im).enhance(sharpness)
    return im


def collect_sources():
    AI_SRC.mkdir(parents=True, exist_ok=True)
    if CURSOR_ASSETS.exists():
        for p in CURSOR_ASSETS.glob("gen_*.png"):
            shutil.copy2(p, AI_SRC / p.name)
            print("copy", p.name)


def is_bg(r, g, b, a=255):
    if a < 20:
        return True
    if r >= 245 and g >= 245 and b >= 245:
        return True
    if abs(r - g) < 8 and abs(g - b) < 8 and r >= 230:
        return True
    return False


def flood_transparent(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    seen = [[False] * h for _ in range(w)]
    q = deque()

    def push(x, y):
        if 0 <= x < w and 0 <= y < h and not seen[x][y]:
            seen[x][y] = True
            q.append((x, y))

    for x in range(w):
        push(x, 0)
        push(x, h - 1)
    for y in range(h):
        push(0, y)
        push(w - 1, y)

    while q:
        x, y = q.popleft()
        r, g, b, a = px[x, y]
        if not is_bg(r, g, b, a):
            continue
        px[x, y] = (0, 0, 0, 0)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not seen[nx][ny]:
                nr, ng, nb, na = px[nx, ny]
                if is_bg(nr, ng, nb, na):
                    push(nx, ny)
    return im


def content_bbox(im):
    px = im.load()
    w, h = im.size
    minx, miny, maxx, maxy = w, h, -1, -1
    for y in range(h):
        for x in range(w):
            if px[x, y][3] > 20:
                minx = min(minx, x)
                miny = min(miny, y)
                maxx = max(maxx, x)
                maxy = max(maxy, y)
    if maxx < 0:
        return None
    return (minx, miny, maxx + 1, maxy + 1)


def place_foot(im, cw, ch, pad=2):
    box = content_bbox(im)
    if not box:
        return Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    crop = im.crop(box)
    ww, hh = crop.size
    scale = min((cw - 4) / max(ww, 1), (ch - pad - 2) / max(hh, 1))
    nw, nh = max(1, int(ww * scale)), max(1, int(hh * scale))
    crop = crop.resize((nw, nh), Image.Resampling.LANCZOS)
    out = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    out.paste(crop, ((cw - nw) // 2, ch - nh - pad), crop)
    return out


def in_diamond(x, y, w=TW, h=TH):
    cx, cy = (w - 1) / 2.0, (h - 1) / 2.0
    # 略放宽边缘，避免格缝露底
    return abs(x - cx) / (w / 2.0) + abs(y - cy) / (h / 2.0) <= 1.04


def fit_iso_cover(src: Image.Image, tw=TW, th=TH, color=1.0, contrast=1.0, sharpness=1.0) -> Image.Image:
    """均匀缩放（cover）后套菱形遮罩，避免拉扁扭曲。"""
    im = flood_transparent(src.convert("RGBA"))
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 0 and r > 240 and g > 240 and b > 240:
                px[x, y] = (0, 0, 0, 0)
    box = content_bbox(im)
    if not box:
        return Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    crop = im.crop(box)
    ww, hh = crop.size
    scale = max(tw / max(ww, 1), th / max(hh, 1))
    nw, nh = max(1, int(ww * scale)), max(1, int(hh * scale))
    mid = crop.resize((nw, nh), Image.Resampling.LANCZOS)
    mid = tone(mid, color, contrast, sharpness)
    canvas = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    # 脚底对齐：菱形下顶点贴底，与游戏格一致
    ox = (tw - nw) // 2
    oy = th - nh
    canvas.paste(mid, (ox, oy), mid)
    out = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    sp, op = canvas.load(), out.load()
    for y in range(th):
        for x in range(tw):
            if not in_diamond(x, y, tw, th):
                continue
            r, g, b, a = sp[x, y]
            if a < 30:
                continue
            op[x, y] = (r, g, b, 255)
    return out


def make_iso_diamond_mask(w, h):
    """严格 2:1 菱形 alpha 遮罩（像素级，便于严丝合缝）。"""
    mask = Image.new("L", (w, h), 0)
    px = mask.load()
    cx, cy = (w - 1) / 2.0, (h - 1) / 2.0
    for y in range(h):
        for x in range(w):
            if abs(x - cx) / (w / 2.0) + abs(y - cy) / (h / 2.0) <= 1.001:
                px[x, y] = 255
    return mask


def draw_crisp_foot_diamond(cw=BW, ch=BH, pad=1, fill=(122, 104, 78, 255)):
    """建筑脚底：与游戏格同形的满宽 2:1 菱形。"""
    base = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    d = ImageDraw.Draw(base)
    cx = cw // 2
    foot = ch - pad
    hw = cw // 2
    vh = cw // 4
    pts = [(cx, foot - vh * 2), (cx + hw, foot - vh), (cx, foot), (cx - hw, foot - vh)]
    d.polygon(pts, fill=fill)
    # 轻微顶面高光，贴近 hut 质感
    d.polygon(
        [(cx, foot - vh * 2 + 1), (cx + hw - 2, foot - vh), (cx, foot - 2), (cx - hw + 2, foot - vh)],
        fill=(fill[0] + 18, fill[1] + 14, fill[2] + 10, 90),
    )
    return base


def place_building_on_foot(im: Image.Image, cw=BW, ch=BH) -> Image.Image:
    """建筑等比放大至脚底菱形满宽 = 画布宽，与地形格同形同大。"""
    box = content_bbox(im)
    out = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    if not box:
        return out
    crop = im.crop(box)
    ww, hh = crop.size
    # 以宽度铺满一格（满宽），高度可超出画布向上裁
    scale = (cw - 2) / max(ww, 1)
    nw = max(1, int(ww * scale))
    nh = max(1, int(hh * scale))
    crop = crop.resize((nw, nh), Image.Resampling.LANCZOS)
    ox = (cw - nw) // 2
    oy = ch - nh - 1
    if oy < 0:
        # 过高：保留脚底，裁顶部
        crop = crop.crop((0, -oy, nw, nh))
        nh = crop.size[1]
        oy = 0
    out.paste(crop, (ox, oy), crop)

    # 脚底菱形内若有空洞，补草色，避免露白；菱形外底部清掉，保证边线直
    vh = cw // 4
    foot = ch - 1
    cx = cw // 2
    px = out.load()
    fill = (126, 148, 90, 255)  # 贴近草地
    for y in range(foot - vh * 2, foot + 1):
        for x in range(cw):
            inside = abs(x - cx) / (cw / 2.0) + abs(y - (foot - vh)) / float(vh) <= 1.001
            if not inside:
                if y >= foot - vh * 2:
                    # 菱形外、靠近脚底的像素清掉，避免斜边不齐
                    if px[x, y][3] > 0 and y > foot - 3:
                        pass
                continue
            r, g, b, a = px[x, y]
            if a < 40:
                px[x, y] = fill
    return out


def add_iso_foot_pad(im: Image.Image, cw=BW, ch=BH, pad=2) -> Image.Image:
    """兼容旧调用：改为标准脚底合成。"""
    return place_building_on_foot(im, cw, ch)


def diamond_edge_side(px, py, w=TW, h=TH):
    cx, cy = (w - 1) / 2.0, (h - 1) / 2.0
    dx = (px - cx) / (w / 2.0)
    dy = (py - cy) / (h / 2.0)
    if abs(dx) + abs(dy) < 0.70:
        return None
    r_ne = abs(dx - dy - 1)
    r_se = abs(dx + dy - 1)
    r_sw = abs(-dx + dy - 1)
    r_nw = abs(-dx - dy - 1)
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


def is_greenish(r, g, b):
    return g > r + 12 and g > b + 8 and g > 70


def prep_road_tile(src: Image.Image) -> Image.Image:
    """抠底 → 均匀铺满高清菱形 128×64。"""
    return fit_iso_cover(src, TW, TH, COLOR_ROAD, CONTRAST_ROAD, SHARPNESS_ROAD)


def make_road_masks(isolated: Image.Image, full: Image.Image):
    iso = prep_road_tile(isolated)
    ful = prep_road_tile(full)
    out_dir = ROOT / "roads"
    out_dir.mkdir(parents=True, exist_ok=True)
    ip, fp = iso.load(), ful.load()

    for mask in range(16):
        out = Image.new("RGBA", (TW, TH), (0, 0, 0, 0))
        op = out.load()
        for y in range(TH):
            for x in range(TW):
                if not in_diamond(x, y, TW, TH):
                    continue
                fr, fg, fb, fa = fp[x, y]
                ir, ig, ib, ia = ip[x, y]
                side = diamond_edge_side(x, y, TW, TH)
                use_grass = False
                if side is not None and (mask & SIDE_BIT[side]) == 0:
                    if ia > 20 and is_greenish(ir, ig, ib):
                        use_grass = True
                if use_grass:
                    op[x, y] = (ir, ig, ib, 255)
                elif fa > 20:
                    op[x, y] = (fr, fg, fb, 255)
                elif ia > 20 and not is_greenish(ir, ig, ib):
                    op[x, y] = (ir, ig, ib, 255)
        out.save(out_dir / ("road_dirt_%d.png" % mask), optimize=True)

    iso.save(out_dir / "road_dirt.png", optimize=True)
    iso.save(out_dir / "road_dirt_0.png", optimize=True)
    print("roads autotile done")


def process_building(src_name: str, out_name: str):
    src = AI_SRC / src_name
    if not src.exists():
        print("missing", src_name)
        return None
    im = flood_transparent(Image.open(src))
    im = tone(im, COLOR_BUILDING, CONTRAST_BUILDING)
    out = place_building_on_foot(im, BW, BH)
    path = ROOT / "buildings" / out_name
    path.parent.mkdir(parents=True, exist_ok=True)
    out.save(path, optimize=True)
    print("building", path)
    return out


def process_terrain(src_name: str, out_name: str):
    src = AI_SRC / src_name
    if not src.exists():
        print("missing", src_name)
        return None
    tile = fit_iso_cover(Image.open(src), TW, TH, COLOR_TERRAIN, CONTRAST_TERRAIN)
    path = ROOT / "terrain" / out_name
    path.parent.mkdir(parents=True, exist_ok=True)
    tile.save(path, optimize=True)
    print("terrain", path)
    return tile


def blend_field_stage(a: Image.Image, b: Image.Image, t: float) -> Image.Image:
    """两帧田地按 t 混合（0=a, 1=b）。"""
    out = Image.new("RGBA", a.size, (0, 0, 0, 0))
    pa, pb = a.load(), b.load()
    po = out.load()
    w, h = a.size
    for y in range(h):
        for x in range(w):
            ra, ga, ba, aa = pa[x, y]
            rb, gb, bb, ab = pb[x, y]
            if aa < 8 and ab < 8:
                continue
            alpha = aa * (1 - t) + ab * t
            if alpha < 1:
                continue
            r = int((ra * aa * (1 - t) + rb * ab * t) / alpha)
            g = int((ga * aa * (1 - t) + gb * ab * t) / alpha)
            bl = int((ba * aa * (1 - t) + bb * ab * t) / alpha)
            po[x, y] = (r, g, bl, int(alpha))
    return out


def process_fields():
    """2 张母图 → 4 阶段田地（省额度）。"""
    s0 = process_building("gen_field_plow.png", "env_field.png")
    s3 = process_building("gen_field_harvest.png", "env_field_grow3.png")
    if not s0 or not s3:
        print("WARN field stages incomplete")
        return
    s1 = blend_field_stage(s0, s3, 0.28)
    s1 = tone(s1, 0.92)
    s2 = blend_field_stage(s0, s3, 0.58)
    s2 = tone(s2, 0.90)
    out_dir = ROOT / "buildings"
    s1.save(out_dir / "env_field_grow1.png", optimize=True)
    s2.save(out_dir / "env_field_grow2.png", optimize=True)
    print("field grow1/2 derived")


def process_icon(src_name: str, out_rel: str, size: int = IW):
    src = AI_SRC / src_name
    if not src.exists():
        print("missing", src_name)
        return None
    im = flood_transparent(Image.open(src))
    im = tone(im, COLOR_ICON, 1.02)
    out = place_foot(im, size, size, 1)
    path = ROOT / out_rel
    path.parent.mkdir(parents=True, exist_ok=True)
    out.save(path, optimize=True)
    print("icon", path)
    return out


BUILDINGS = [
    ("gen_fac_castle.png", "fac_castle.png"),
    ("gen_house_thatched.png", "house_thatched.png"),
    ("gen_house_tile.png", "house_tile.png"),
    ("gen_env_well.png", "env_well.png"),
    ("gen_shop_tea.png", "shop_tea.png"),
    ("gen_shop_rice.png", "shop_rice.png"),
    ("gen_fac_inn.png", "fac_inn.png"),
    ("gen_fac_stable.png", "fac_stable.png"),
    ("gen_fac_hotspring.png", "fac_hot_spring.png"),
    ("gen_fac_arena.png", "fac_arena.png"),
    ("gen_vacant_lot.png", "env_vacant_lot.png"),
    ("gen_park.png", "env_park.png"),
    ("gen_shop_noodle.png", "shop_noodle.png"),
    ("gen_shop_wonton.png", "shop_wonton.png"),
    ("gen_shop_hotpot.png", "shop_hotpot.png"),
    ("gen_house_build.png", "house_build.png"),
    ("gen_remove_hammer.png", "env_remove_hammer.png"),
]

ICONS = [
    ("gen_icon_money.png", "ui/icon_money.png"),
    ("gen_icon_yield.png", "ui/icon_yield.png"),
    ("gen_icon_research.png", "ui/icon_research.png"),
    ("gen_icon_pause.png", "ui/icon_pause.png"),
    ("gen_icon_speed1.png", "ui/icon_speed1.png"),
    ("gen_icon_speed2.png", "ui/icon_speed2.png"),
    ("gen_icon_speed3.png", "ui/icon_speed3.png"),
    ("gen_icon_build.png", "ui/ui_btn_icon_build.png"),
    ("gen_icon_menu.png", "ui/ui_btn_icon_menu.png"),
    ("gen_icon_people.png", "ui/ui_btn_icon_people.png"),
    ("gen_icon_combo.png", "ui/ui_btn_icon_combo.png"),
    ("gen_icon_combo_badge.png", "ui/ui_combo_badge.png"),
    ("gen_icon_ghost_ok.png", "ui/ui_ghost_ok.png"),
    ("gen_icon_ghost_bad.png", "ui/ui_ghost_bad.png"),
]

FX_ICONS = [
    ("gen_fx_coin.png", "fx/fx_coin_pop.png"),
    ("gen_fx_rp.png", "fx/fx_rp_pop.png"),
    ("gen_fx_combo.png", "fx/fx_combo_stars.png"),
    ("gen_fx_dust.png", "fx/fx_build_dust.png"),
    ("gen_fx_tax.png", "fx/fx_tax_rain.png"),
]


def process_hut():
    process_building("gen_house_hut.png", "house_hut.png")


def process_all_buildings():
    for src, dst in BUILDINGS:
        if (AI_SRC / src).exists():
            process_building(src, dst)


def process_all_icons():
    for src, dst in ICONS:
        if (AI_SRC / src).exists():
            process_icon(src, dst)
    for src, dst in FX_ICONS:
        if (AI_SRC / src).exists():
            process_icon(src, dst, 40)


def shift_region(im: Image.Image, y0: int, y1: int, dx: int, dy: int = 0) -> Image.Image:
    """只平移某一水平带（用于腿/脚交替）。"""
    out = im.copy()
    band = im.crop((0, y0, im.size[0], y1))
    # 先清空该带
    clear = Image.new("RGBA", (im.size[0], y1 - y0), (0, 0, 0, 0))
    out.paste(clear, (0, y0))
    out.paste(band, (dx, y0 + dy), band)
    return out


def make_stride_frame(base: Image.Image, foot: str) -> Image.Image:
    """
    从同一装束底图合成明显迈步帧。
    foot='L' 左脚前（画面偏左），'R' 右脚前，'C' 并脚过渡。
    """
    w, h = base.size
    leg0 = int(h * 0.55)
    mid = int(h * 0.72)
    # 躯干微倾 + 腿部分离，形成可读的左右脚交替
    if foot == "L":
        fr = shift_region(base, 0, leg0, -1, -1)          # 上身略左抬
        fr = shift_region(fr, leg0, mid, -3, 0)            # 左腿前
        fr = shift_region(fr, mid, h, 3, 1)                # 右腿后
    elif foot == "R":
        fr = shift_region(base, 0, leg0, 1, -1)
        fr = shift_region(fr, leg0, mid, 3, 0)
        fr = shift_region(fr, mid, h, -3, 1)
    else:
        fr = shift_region(base, 0, leg0, 0, -2)
        fr = shift_region(fr, leg0, h, 0, 0)
    return fr


def alpha_blend(a: Image.Image, b: Image.Image, t: float) -> Image.Image:
    """两帧半透明混合，得到中间动作。"""
    a = a.convert("RGBA")
    b = b.convert("RGBA")
    if a.size != b.size:
        b = b.resize(a.size, Image.Resampling.NEAREST)
    out = Image.new("RGBA", a.size, (0, 0, 0, 0))
    pa, pb, po = a.load(), b.load(), out.load()
    w, h = a.size
    for y in range(h):
        for x in range(w):
            ra, ga, ba, aa = pa[x, y]
            rb, gb, bb, ab = pb[x, y]
            if aa < 8 and ab < 8:
                continue
            alpha = aa * (1 - t) + ab * t
            if alpha < 1:
                continue
            r = int((ra * aa * (1 - t) + rb * ab * t) / alpha)
            g = int((ga * aa * (1 - t) + gb * ab * t) / alpha)
            bl = int((ba * aa * (1 - t) + bb * ab * t) / alpha)
            po[x, y] = (r, g, bl, int(alpha))
    return out


def make_dual_key_sheet(key1: Image.Image, key2: Image.Image):
    """两张关键帧 → 4 帧：K1 → 过渡 → K2 → 过渡（动作互不相同）。"""
    a = place_foot(flood_transparent(key1), CW, CH, 1)
    b = place_foot(flood_transparent(key2), CW, CH, 1)
    mid_ab = alpha_blend(a, b, 0.38)
    mid_ba = alpha_blend(a, b, 0.72)
    mid_ab = shift_region(mid_ab, 0, int(CH * 0.45), 0, -1)
    mid_ba = shift_region(mid_ba, 0, int(CH * 0.45), 0, -2)
    frames = [a, mid_ab, b, mid_ba]
    sheet = Image.new("RGBA", (CW * 4, CH), (0, 0, 0, 0))
    for i, fr in enumerate(frames):
        sheet.paste(fr, (i * CW, 0), fr)
    return sheet


def make_walk_sheet(idle: Image.Image, walk_frames: list):
    """行走 4 帧：优先左脚/右脚两张真实迈步母图。"""
    idle_out = place_foot(idle, CW, CH, 1)
    if len(walk_frames) >= 2:
        return make_dual_key_sheet(walk_frames[0], walk_frames[1]), idle_out
    if len(walk_frames) == 1:
        body = place_foot(flood_transparent(walk_frames[0]), CW, CH, 1)
    else:
        body = idle_out.copy()
    frames = [
        make_stride_frame(body, "L"),
        make_stride_frame(body, "C"),
        make_stride_frame(body, "R"),
        make_stride_frame(body, "C"),
    ]
    sheet = Image.new("RGBA", (CW * 4, CH), (0, 0, 0, 0))
    for i, fr in enumerate(frames):
        sheet.paste(fr, (i * CW, 0), fr)
    return sheet, idle_out


def make_work_anim_sheet(im: Image.Image, im2=None):
    """劳作 sheet：双关键帧优先；否则单图摆动兜底。"""
    if im2 is not None:
        return make_dual_key_sheet(im, im2)
    base = place_foot(flood_transparent(im), CW, CH, 1)
    h = base.size[1]
    arm0 = int(h * 0.28)
    arm1 = int(h * 0.62)

    def swing(sign, lift):
        fr = shift_region(base, 0, arm0, sign, -lift)
        fr = shift_region(fr, arm0, arm1, sign * 2, -lift)
        fr = shift_region(fr, arm1, h, -sign, lift // 2)
        return fr

    frames = [swing(-1, 1), swing(0, 3), swing(1, 1), swing(0, 2)]
    sheet = Image.new("RGBA", (CW * 4, CH), (0, 0, 0, 0))
    for i, fr in enumerate(frames):
        sheet.paste(fr, (i * CW, 0), fr)
    return sheet


def process_characters():
    """每职业母图 base + walk_L/R + 各动作_1/_2 → idle/walk/work sheets。"""
    out = ROOT / "characters"
    out.mkdir(parents=True, exist_ok=True)
    for job in ("farmer", "artisan", "merchant", "warrior"):
        base_path = AI_SRC / ("gen_%s_base.png" % job)
        if not base_path.exists():
            base_path = AI_SRC / ("gen_%s_idle.png" % job)
        if not base_path.exists():
            print("missing base", job)
            continue
        idle = tone(flood_transparent(Image.open(base_path)), COLOR_CHAR, 1.02)
        walks = []
        for tag in ("walk_L", "walk_R", "walk1", "walk2"):
            wp = AI_SRC / ("gen_%s_%s.png" % (job, tag))
            if wp.exists():
                walks.append(Image.open(wp))
            if len(walks) >= 2:
                break
        sheet, idle_out = make_walk_sheet(idle, walks)
        idle_out.save(out / ("job_%s.png" % job), optimize=True)
        sheet.save(out / ("job_%s_walk.png" % job), optimize=True)
        print("char", job, "walk_keys", len(walks))
    process_work_poses()


WORK_POSES = [
    ("gen_farmer_plow_1.png", "gen_farmer_plow_2.png", "job_farmer_plow.png"),
    ("gen_farmer_water_1.png", "gen_farmer_water_2.png", "job_farmer_water.png"),
    ("gen_farmer_harvest_1.png", "gen_farmer_harvest_2.png", "job_farmer_harvest.png"),
    ("gen_farmer_carry_1.png", "gen_farmer_carry_2.png", "job_farmer_carry.png"),
    ("gen_farmer_celebrate_1.png", "gen_farmer_celebrate_2.png", "job_farmer_celebrate.png"),
    ("gen_artisan_work_1.png", "gen_artisan_work_2.png", "job_artisan_work.png"),
    ("gen_artisan_carry_1.png", "gen_artisan_carry_2.png", "job_artisan_carry.png"),
    ("gen_artisan_celebrate_1.png", "gen_artisan_celebrate_2.png", "job_artisan_celebrate.png"),
    ("gen_merchant_trade_1.png", "gen_merchant_trade_2.png", "job_merchant_trade.png"),
    ("gen_merchant_carry_1.png", "gen_merchant_carry_2.png", "job_merchant_carry.png"),
    ("gen_merchant_celebrate_1.png", "gen_merchant_celebrate_2.png", "job_merchant_celebrate.png"),
    ("gen_warrior_train_1.png", "gen_warrior_train_2.png", "job_warrior_train.png"),
    ("gen_warrior_carry_1.png", "gen_warrior_carry_2.png", "job_warrior_carry.png"),
    ("gen_warrior_celebrate_1.png", "gen_warrior_celebrate_2.png", "job_warrior_celebrate.png"),
]


def process_work_poses():
    out = ROOT / "characters"
    out.mkdir(parents=True, exist_ok=True)
    for src1, src2, dst_name in WORK_POSES:
        p1 = AI_SRC / src1
        if not p1.exists() and src1.endswith("_1.png"):
            legacy = AI_SRC / src1.replace("_1.png", ".png")
            if legacy.exists():
                p1 = legacy
                src2 = None
        if not p1.exists():
            print("missing pose", src1)
            continue
        im1 = tone(flood_transparent(Image.open(p1)), COLOR_CHAR, 1.02)
        im2 = None
        if src2:
            p2 = AI_SRC / src2
            if p2.exists():
                im2 = tone(flood_transparent(Image.open(p2)), COLOR_CHAR, 1.02)
        sheet = make_work_anim_sheet(im1, im2)
        sheet.save(out / dst_name, optimize=True)
        print("pose", dst_name, "dual" if im2 is not None else "single")


def main():
    collect_sources()
    iso = AI_SRC / "gen_road_isolated2.png"
    ful = AI_SRC / "gen_road_full2.png"
    if not iso.exists():
        iso = AI_SRC / "gen_road_isolated.png"
    if not ful.exists():
        ful = AI_SRC / "gen_road_full.png"
    if iso.exists() and ful.exists():
        make_road_masks(Image.open(iso), Image.open(ful))
    else:
        print("WARN missing road sources")
    if (AI_SRC / "gen_house_hut.png").exists():
        process_hut()
    if (AI_SRC / "gen_wholesaler.png").exists():
        process_building("gen_wholesaler.png", "env_wholesaler.png")
    if (AI_SRC / "gen_field_plow.png").exists() and (AI_SRC / "gen_field_harvest.png").exists():
        process_fields()
    elif (AI_SRC / "gen_field_plow.png").exists():
        process_building("gen_field_plow.png", "env_field.png")
    terrains = [
        ("gen_terrain_grass.png", "tile_grass.png"),
        ("gen_terrain_dirt.png", "tile_dirt.png"),
        ("gen_terrain_water.png", "tile_water.png"),
    ]
    for src, dst in terrains:
        if (AI_SRC / src).exists():
            process_terrain(src, dst)
    process_all_buildings()
    process_characters()
    process_all_icons()
    print("DONE AI postprocess")


if __name__ == "__main__":
    main()
