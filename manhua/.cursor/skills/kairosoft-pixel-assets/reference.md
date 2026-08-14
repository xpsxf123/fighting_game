# 开罗贴图参考细节

## Autotile mask 示意

```
        bit1 (N: y-1)
             ╱ ╲
 bit8 (W)  ╱     ╲  bit2 (E: x+1)
           ╲     ╱
             ╲ ╱
        bit4 (S: y+1)
```

| mask | 含义（有路的邻边） | 草边出现在 |
|------|-------------------|------------|
| 0 | 孤立 | 四边 |
| 2 | 仅东 | 北南西 |
| 5 | 北+南（竖） | 东西 |
| 10 | 西+东（横） | 南北 |
| 15 | 四通 | 无草边 |

## 建筑 SE 门绘制要点

```
顶面菱形 (亮)
    / \
左暗 | | 右亮 ← 门画在这里
    \ /
   脚底
```

门矩形大致：`cx+2`～`cx+10` 水平偏右，竖直贴右墙中部。

## 接入伪代码

```js
function roadMask(state, x, y) {
  var m = 0;
  if (isRoad(state, x, y - 1)) m |= 1;
  if (isRoad(state, x + 1, y)) m |= 2;
  if (isRoad(state, x, y + 1)) m |= 4;
  if (isRoad(state, x - 1, y)) m |= 8;
  return m;
}
// draw: atlas.get('road_' + mask) || atlas.get('build_1')
```

## 人物帧

- phase 0/2：腿收，身略高
- phase 1/3：腿迈，对侧手臂前
- 道具（锄/锤/袋）绑在右侧，翻转时自然到左侧
