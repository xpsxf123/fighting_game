# -*- coding: utf-8 -*-
"""
安全清理 Cursor 作图缓存（不碰登录态）。

仅删除：
  - 本项目 Cursor 工程目录下的 gen_*.png 副本（已同步到 dashu-town/assets/_ai_src 的）
  - agent-tools 临时导出 txt

不删除：
  - AppData 下 Cursor 用户数据 / globalStorage / 登录相关
  - dashu-town/assets/_ai_src 与已接入游戏的 png
  - agent-transcripts（对话记录）

用法：
  python scripts/clean_cursor_image_cache.py          # 预览
  python scripts/clean_cursor_image_cache.py --apply  # 执行删除
"""
from __future__ import annotations

import argparse
import shutil
from pathlib import Path

# 项目根（manhua）
ROOT = Path(__file__).resolve().parents[1]
AI_SRC = ROOT / "dashu-town" / "assets" / "_ai_src"

# Cursor 为本工程缓存的目录（Windows）
CURSOR_PROJECT = Path(r"C:\Users\JY\.cursor\projects\d-test-cursor-manhua")
CURSOR_ASSETS = CURSOR_PROJECT / "assets"
AGENT_TOOLS = CURSOR_PROJECT / "agent-tools"


def safe_unlink(p: Path) -> bool:
    try:
        if p.is_file():
            p.unlink()
            return True
    except OSError as e:
        print("SKIP", p, e)
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="实际删除（默认仅预览）")
    args = ap.parse_args()
    mode = "APPLY" if args.apply else "DRY-RUN"

    to_delete: list[Path] = []

    # gen_*.png 在 Cursor project assets（与 _ai_src 重复）
    if CURSOR_ASSETS.exists():
        for p in CURSOR_ASSETS.glob("gen_*.png"):
            name = p.name
            if (AI_SRC / name).exists():
                to_delete.append(p)
            else:
                print(f"[{mode}] keep (no _ai_src copy): {p}")

    # agent-tools 网页抓取临时 txt
    if AGENT_TOOLS.exists():
        for p in AGENT_TOOLS.glob("*.txt"):
            to_delete.append(p)

    total = sum(p.stat().st_size for p in to_delete if p.exists())
    print(f"[{mode}] files={len(to_delete)} size={total/1024/1024:.2f} MB")
    for p in to_delete:
        rel = p
        if args.apply:
            if safe_unlink(p):
                print("deleted", rel)
        else:
            print("would delete", rel)

    if not args.apply and to_delete:
        print("\n执行删除请加: --apply")


if __name__ == "__main__":
    main()
