# S1 贴图素材包

> 生成日期：2026-08-11  
> 画风：开罗风可爱像素 / 蜀地市井（AI 初稿，需后期人工裁切脚底锚点）  
> 目录：`dashu-town/assets/`

游戏已接入绘制：`js/game-core.js` 通过 `assetBase` 加载本目录贴图；失败时回退色块。

## 贴图处理

- 脚本：`_process_sprites.py`（抠白底/棋盘格透明、脚底锚点统一）  
- 行走：`characters/job_*_walk.png`（4 帧肢体摆动）  
- UI 面板/按钮/Toast：**游戏内程序化绘制**，不再依赖带底的弹窗/按钮大图  


S1 地图为 **大江户式 2:1 等距菱形格**（`ISO_W=72, ISO_H=36`）：

- 邻格以**边**相接，不是正交方格的角碰角  
- **道路 autotile**：`roads/road_dirt_0..15.png`（接缝边无草；孤立有草边）  
- 建筑正面朝 **右下(SE)**；生成规范见项目 skill `.cursor/skills/kairosoft-pixel-assets/`  
- 核心重生成：`python assets/_gen_kairo_core.py`  

---

## 目录

| 文件夹 | 用途 |
|--------|------|
| `terrain/` | 地图底层方格（见下表） |
| `roads/` | 土路 |
| `buildings/` | 宅基、田、货栈、园圃、茅棚、施工、三店、拆除锤 |
| `characters/` | 农夫 / 匠人 / 商贾 / 甲士（idle、walk、劳作 sheet） |
| `ui/` | 面板、按钮、顶栏、对话框、幽灵格、资源图标 |
| `fx/` | 金币、研策、坊巷星、烟尘、年贡雨 |

### terrain/ 各格含义

| 文件 | 地形 ID | 游戏内作用 |
|------|---------|------------|
| `tile_grass.png` | `TERRAIN.GRASS = 0` | 默认陆地格，可铺路、建建筑 |
| `tile_dirt.png` | `TERRAIN.DIRT = 1` | 泥土岸/山地装饰，同样可建 |
| `tile_water.png` | `TERRAIN.WATER = 2` | 水面，不可建造、不可通行 |
| `tile_soil_farm.png` | （备用） | 耕地土参考；正式田地用 `buildings/env_field*.png` |

---

## 与 S1 建造对照

| 游戏 `BUILD` | 文件 |
|--------------|------|
| 地形草 | `terrain/tile_grass.png` |
| 地形泥 | `terrain/tile_dirt.png` |
| 地形水 | `terrain/tile_water.png` |
| 土路 | `roads/road_dirt.png` |
| 宅基 | `buildings/env_vacant_lot.png` |
| 田（阶段 0～3） | `env_field.png` / `env_field_grow1~3.png` |
| 货栈 | `buildings/env_wholesaler.png` |
| 园圃 | `buildings/env_park.png` |
| 茅棚 | `buildings/house_hut.png` |
| 施工中 | `buildings/house_build.png` |
| 面馆 | `buildings/shop_noodle.png` |
| 抄手摊 | `buildings/shop_wonton.png` |
| 火锅摊 | `buildings/shop_hotpot.png` |
| 拆除 | `buildings/env_remove_hammer.png` |
| 农夫/匠/商 | `characters/job_*.png` |

田阶段建议：`fieldStage 0→env_field`，`1→grow1`，`2→grow2`，`3→grow3`。

---

## 规格（已缩小）

| 类型 | 尺寸 |
|------|------|
| 地形 / 道路 | 64×64 |
| 建筑 | 96×96 |
| 角色 / 多数图标 | 64×64 |
| 顶栏 | 512×64 |
| 对话框 | 512×160 |
| 面板 | 256×256 |

说明：AI 原图多为整画布场景，**不是严格 32×32 无缝 tile**；接入前建议再抠透明底、统一脚底锚点。

---

## 本包未含（S1 不做 / 留 S2）

~~州城、井、瓦屋改建链、甲士~~ → **已见 `manifest-s2.json`**，生成脚本 `_gen_s2_assets.py`。

仍留后续：树林竹林、走动画扩展、青荷立绘、完整商店池。

### S2 素材（`manifest-s2.json`）

| 游戏 `BUILD` | 文件 |
|--------------|------|
| 州城 | `buildings/fac_castle.png` |
| 草屋 | `buildings/house_thatched.png` |
| 瓦屋 | `buildings/house_tile.png` |
| 水井 | `buildings/env_well.png` |
| 茶馆 | `buildings/shop_tea.png` |
| 米铺 | `buildings/shop_rice.png` |
| 甲士 | `characters/job_warrior.png` / `job_warrior_walk.png` |

生成：`python _gen_s2_assets.py` → `python _process_sprites.py`（抠透明底 + 脚底锚点）

---

## 清单文件

机器可读映射：`manifest-s1.json`（S1）、`manifest-s2.json`（S2 增量）。
