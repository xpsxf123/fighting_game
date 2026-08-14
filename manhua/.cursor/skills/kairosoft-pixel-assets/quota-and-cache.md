# GenerateImage 额度与缓存说明

> 非官方账单明细，以 Cursor 控制台为准。最后更新：2026-08-12

## 1. GenerateImage 是什么？

- Cursor Agent 内置工具，对话中由 Agent 调用
- 后台为图像生成服务（社区称 internal tool / Nano Banana 等），**不在 Settings → Models 里单独选**
- 需使用**支持图像生成的聊天模型**（如 Composer 1.5/2.5）；部分纯文本模型无法调用

## 2. 走什么额度？

**没有独立的「每月 N 张图」套餐。**

与以下内容共享 Cursor 订阅的**月度用量池**：

| 消耗来源 | 说明 |
|----------|------|
| Agent 对话 | 输入/输出 token，按所选模型计价 |
| GenerateImage | 图像生成 API 成本，计入用量池 |
| 其他工具 | 一般不计图，但对话上下文仍计 token |

官方文档：[Models & Pricing](https://cursor.com/docs/account/pricing)

### 个人版参考（2026）

| 计划 | 月费 | Other Models 包含额度（约） |
|------|------|---------------------------|
| Pro | $20 | ~$20 API 等值 |
| Pro Plus | $60 | ~$70 |
| Ultra | $200 | ~$400 |

另有 **Cursor Models** 池（Composer / Grok 等），与第三方模型池分开。

### 图像按什么计费？

- **主要按 API 成本**，不是「一张图 = 1 次请求」
- 参考价（Gemini 类图像模型，官方价目表）：约 **$0.13～0.24 / 张**（1K/2K～4K 档），按图像输出 token 折算
- **分辨率、提示词长度、Agent 上下文**都会影响单次成本
- 同一张图：**文件越大 ≠ 线性加倍扣费**；生成时的**输出分辨率档位**更关键

### 你能做多少张？（粗算）

假设 Pro 月池 **$20** 且本月**全部用于** GenerateImage（实际还要扣聊天）：

- 按 ~$0.15/张 → 约 **130 张/月**
- 按 ~$0.25/张 → 约 **80 张/月**

上次本项目的道路+茅屋+四职业约 **12～14 次** GenerateImage，约占 Pro 月池 **一小部分**（另加作图对话 token）。

**准确数字请打开：** [https://cursor.com/dashboard/usage](https://cursor.com/dashboard/usage)

## 3. 如何更省额度（与 SKILL 一致）

1. 道路 2 母图 → 16 拼接
2. 角色 1 idle + 1～2 walk → 4 帧 sheet
3. 满意母图存 `_ai_src`，只跑 Python 后处理
4. 分批验收，失败只重出单类
5. 地形用程序生成，不用 AI

## 4. 缓存与磁盘文件

### 会占磁盘的位置

| 路径 | 内容 | 可否删 |
|------|------|--------|
| `dashu-town/assets/_ai_src/` | **项目母图（保留）** | 否 |
| `dashu-town/assets/roads|buildings|characters/` | 游戏用终稿 | 否 |
| `%USERPROFILE%\.cursor\projects\<项目>\assets\gen_*.png` | Cursor 写入的副本 | 可删（若已同步到 `_ai_src`） |
| `%USERPROFILE%\.cursor\projects\<项目>\agent-tools\*.txt` | 网页抓取临时文本 | 可删 |
| `%USERPROFILE%\.cursor\projects\<项目>\agent-transcripts\` | 对话记录 | 按需 |
| `%APPDATA%\Cursor\` | **登录、设置、扩展** | **勿乱删** |

### 不会因此掉登录的清理

使用项目脚本（只删工程目录内重复图与 agent-tools 临时文件）：

```bash
# 预览
python scripts/clean_cursor_image_cache.py

# 执行
python scripts/clean_cursor_image_cache.py --apply
```

**脚本故意不触碰：**

- `%APPDATA%\Cursor\User\globalStorage`
- `%APPDATA%\Cursor\Local Storage`
- Cookies / 登录令牌

### 不建议手动删除

- 整个 `%APPDATA%\Cursor` 或 `%LOCALAPPDATA%\Cursor` → 可能需重新登录、丢设置

## 5. Legacy 计划说明

若仍是旧版「500 requests」计划，GenerateImage 行为可能与信用池计划不同；以控制台与 [Cursor 论坛](https://forum.cursor.com) 为准。
