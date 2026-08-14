---
name: kairosoft-pixel-assets
description: >-
  Generates and integrates Kairosoft / Daiedo-style isometric pixel assets for
  《大蜀国物语》(dashu-town). MUST read before any asset work in this repo.
  Use GenerateImage + _process_ai_kairo.py; covers 开罗贴图、大江户画风、道路拼接、
  建筑朝向、行走帧、省额度作图.
---

# 开罗系像素贴图生成（项目内 · 必读）

> **路径**：`.cursor/skills/kairosoft-pixel-assets/SKILL.md`  
> **项目规则**：`.cursor/rules/kairosoft-pixel-assets.mdc`（编辑 `dashu-town/assets/**` 时自动提醒）  
> 适用于 `dashu-town/`。《大江户物语》骨架：2:1 等距菱形、暖亮饱满、建筑面朝**右下**。

---

## 0. 强制流程（已验证满意的那批）

**禁止**跳过本 skill 直接用 Pillow 程序化像素当终稿。

```
① 读本 skill + reference.md
② 按「省额度批次表」规划 GenerateImage 次数（先少后多）
③ GenerateImage 出母图（提示词见 §8）
④ 母图归档 → dashu-town/assets/_ai_src/gen_*.png
⑤ python dashu-town/assets/_process_ai_kairo.py   # 不耗图额度
⑥ 必要时改 game-core.js / ASSET_FILES
⑦ 浏览器 Ctrl+F5 验收
⑧ 满意则保留 _ai_src，勿重复 GenerateImage
```

### 工具分工

| 步骤 | 工具 | 是否耗 Cursor 额度 |
|------|------|-------------------|
| AI 母图 | **Cursor `GenerateImage`** | **是**（见 §9） |
| 抠底/缩放/道路 16 向/行走 sheet | `_process_ai_kairo.py` | **否** |
| 简单地形占位 | `_gen_iso_tiles.py` | **否** |

### 已验证满意的制作参数（2026-08-12）

- **道路**：2 张母图（`gen_road_isolated` 带草边 + `gen_road_full` 纯土路）→ 脚本合成 mask 0..15；输出 **128×64** 高清再缩到格内
- **茅屋**：1 张 `gen_house_hut` → 脚底锚点 96×96
- **人物**：每职业 **idle 1 张 + walk 1～2 张** → 脚本拼 4 帧 sheet；绘制时略放大 + 平滑
- **朝向**：提示词写死 `facing bottom-RIGHT` / `door on SE face`

---

## 1. 省额度策略（质量不降）

原则：**少调用 GenerateImage，多在后处理里衍生。**

### 批次表（推荐）

| 资产类型 | GenerateImage 次数 | 脚本衍生 |
|----------|-------------------|----------|
| 土路 autotile | **2**（有草边 / 无草边） | → 16 张 `road_dirt_0..15` |
| 单格建筑 | **1** / 种 | 缩放、锚点 |
| 角色 | **1 idle + 1～2 walk** / 职业 | → 4 帧 walk sheet（idle/bob 合成） |
| 草地/水面 | **0**（程序 `_gen_iso_tiles.py`） | — |

### 操作纪律

1. **先验收 1 个建筑 + 1 个角色**，满意再批量，避免一次生成十几张全废
2. **母图永存 `_ai_src/`**，调尺寸/拼接只跑 `_process_ai_kairo.py`
3. **只有不满意的那一类**才重新 GenerateImage，不要整包重出
4. **提示词模板固定**（§8），减少返工
5. **Agent 对话也会耗额度**；作图任务用短指令 + 本 skill，少让模型反复解释
6. 选用**支持 GenerateImage 的聊天模型**（如 Composer 系列）；部分模型不支持图像工具会白跑对话额度

### 上次道路+茅屋+四职业实际约 **12～14 次** GenerateImage

按 §9 粗算，Pro 月池子大约可做 **数十～上百张**（与当月聊天用量共享），以 Dashboard 为准。

---

## 2. 硬性规范（对齐大江户）

### 投影与格子

| 项 | 值 |
|----|-----|
| 菱形 | `ISO_W=72` · `ISO_H=36`（严格 2:1，略大于旧 64×32） |
| 邻格 | **边接边**，建筑脚底菱形满宽 = 一格 |
| 深度 | 按 `x+y` 绘制；住民与建筑同深度排序实现遮挡 |
| 建筑正面 | **屏幕右下（SE）**，门在右侧面 |

### 道路 autotile

| bit | 邻居 |
|-----|------|
| 1 | `(x, y-1)` |
| 2 | `(x+1, y)` |
| 4 | `(x, y+1)` |
| 8 | `(x-1, y)` |

- 文件：`roads/road_dirt_{0..15}.png`
- 运行时：`atlas.roadSprite(roadMask(state,x,y))`

### 画布与锚点

| 类型 | 尺寸 | 备注 |
|------|------|------|
| 道路（高清源） | 144×72 | 绘制缩到 72×36 格 |
| 建筑 | 108×108 | 脚底满宽 2:1 菱形对齐格 |
| 角色 idle | 48×56 | 脚底贴底 |
| walk sheet | 192×56 | 4×48 帧（同装束不同动作） |

---

## 3. 文件与脚本

```
dashu-town/assets/
  _ai_src/              # GenerateImage 母图（勿删，可复用）
  _process_ai_kairo.py    # 后处理入口
  roads/road_dirt_*.png
  buildings/house_hut.png
  characters/job_*.png
scripts/
  clean_cursor_image_cache.py   # 安全清理缓存（§10）
```

```bash
# 后处理（改 _ai_src 后重跑，不耗图额度）
python dashu-town/assets/_process_ai_kairo.py
```

---

## 4. 验收清单

- [ ] 孤立土路四边有草；十字/直连接缝无草
- [ ] 茅棚门在右下侧面
- [ ] 角色饱满、朝右下，行走帧可读
- [ ] 强刷后游戏内显示正常

---

## 5. 反例（禁止）

- 跳过 GenerateImage 用程序化方块当终稿
- 道路单图铺满导致接缝长草
- 建筑门朝左下
- 每张 walk 帧都单独 GenerateImage（浪费）

---

## 6. 扩展阅读

- [reference.md](reference.md) — mask 图示、提示词片段
- [quota-and-cache.md](quota-and-cache.md) — 额度说明与缓存清理
- `docs/贴图资产清单-大蜀国物语.md`

---

## 7. GenerateImage 提示词模板（复制改写）

**全局后缀（每条都加）：**
```text
Kairosoft Oh Edo Town style, cozy plump pixel art, SOFT MUTED pastel earthy colors,
low saturation warm tones, isometric game sprite,
transparent or pure white background, single object only, no text, no UI
```

**道路 · 孤立（有草边）：**
```text
Single isometric diamond tile 2:1, dirt path center, fluffy green grass ONLY on
four outer edges, warm brown pebbles, cute vivid
```

**道路 · 连通（无草边）：**
```text
Single isometric diamond tile 2:1, continuous packed dirt ONLY, NO grass,
seamless for connecting roads
```

**茅屋：**
```text
Isometric thatched hut, door and front face toward bottom-RIGHT, golden straw roof,
cream bamboo walls, vivid cozy, foot at bottom center
```

**角色：**
```text
Cute chibi [farmer/artisan/merchant/warrior], 3/4 facing bottom-RIGHT, straw hat,
[tool], big head expressive blush, Oh Edo Town style, idle pose / mid-stride walk
```

---

## 8. 额度与缓存（摘要）

详见 [quota-and-cache.md](quota-and-cache.md)。

- GenerateImage **无单独「张数套餐」**；走 Cursor **月度用量池**（与 Agent 对话、所选模型共享）
- 图像侧多按 **API 成本**计费，分辨率越高通常越贵（非单纯按文件 MB）
- 查看：**Cursor → Settings → 用量 / [cursor.com/dashboard/usage](https://cursor.com/dashboard/usage)**
- 缓存：母图副本可能在 `%USERPROFILE%\.cursor\projects\<项目>\assets\`；用 `scripts/clean_cursor_image_cache.py` 安全清理，**不碰登录数据**
