/**
 * 《大蜀国物语》S1～S5 — 游戏核心（浏览器 / 微信小游戏共用）
 * 等距菱形格 · 开罗式菜单 · S5：教程/报纸/SFX/顶栏变速
 */
(function (root) {
  'use strict';

  // ---------- 常量 ----------
  var COLS = 30;
  var ROWS = 30;
  // 大江户式 2:1 等距菱形格：邻格以「边」相接（略大于旧 64×32，便于贴合）
  var ISO_W = 72;
  var ISO_H = 36;
  var START_RESIDENTS = 2;
  var ZOOM_MIN = 0.55;
  var ZOOM_MAX = 2.2;
  var TILE = ISO_W; // 兼容旧引用：逻辑步长仍用格，绘制用 ISO_*

  var TERRAIN = { GRASS: 0, DIRT: 1, WATER: 2 };
  var BUILD = {
    NONE: 0,
    ROAD: 1,
    VACANT: 2,
    HUT: 3,
    FIELD: 4,
    NOODLE: 5,
    WONTON: 6,
    HOTPOT: 7,
    PARK: 8,
    WHOLESALER: 9,
    CASTLE: 10,      // 州城（衙署）
    THATCHED: 11,    // 草屋
    TILE_HOUSE: 12,  // 瓦屋
    WELL: 13,
    TEA: 14,
    RICE: 15,
    INN: 16,
    STABLE: 17,
    HOT_SPRING: 18,
    ARENA: 19,
    SCHOOL: 20,      // 学塾（寺子屋）
    BATH: 21,        // 澡堂
    FIREHOUSE: 22,   // 消防所
    TREE: 23,        // 绿树
    CHERRY: 24,      // 海棠
    POND: 25,        // 方塘
    BUDDHA: 26,      // 石佛
    CLOTH: 27        // 布庄
  };

  // 特征卡：分类 cat + 造价/维护/俸禄/物价；对齐大江户七大类
  var BUILD_META = {
    1: { id: 'road', name: '田间小路', cat: 'road', cost: 15, maint: 0, yield: 0, priceMin: 0, priceMax: 0, color: '#8B7355' },
    2: { id: 'vacant', name: '宅基', cat: 'house', cost: 45, maint: 0, yield: 50, priceMin: 0, priceMax: 0, color: '#C4A574' },
    3: { id: 'hut', name: '茅棚', cat: 'house', cost: 0, maint: 0, yield: 30, priceMin: 0, priceMax: 0, color: '#BCAAA4' },
    4: { id: 'field', name: '田', cat: 'work', cost: 85, maint: 1, yield: 70, priceMin: 0, priceMax: 0, color: '#6B8E23', visitExp: 8 },
    5: { id: 'noodle', name: '面馆', cat: 'shop', cost: 80, maint: 2, yield: 40, priceMin: 6, priceMax: 8, color: '#E67E22', stat: 'apl', statDelta: 1, cityAttr: 'food' },
    6: { id: 'wonton', name: '抄手摊', cat: 'shop', cost: 80, maint: 2, yield: 38, priceMin: 7, priceMax: 9, color: '#E74C3C', stat: 'apl', statDelta: 1, cityAttr: 'food' },
    7: { id: 'hotpot', name: '火锅摊', cat: 'shop', cost: 110, maint: 2, yield: 58, priceMin: 12, priceMax: 16, color: '#C0392B', stat: 'loy', statDelta: -1, cityAttr: 'food' },
    8: { id: 'park', name: '园圃', cat: 'env', cost: 70, maint: 1, yield: 55, priceMin: 0, priceMax: 0, color: '#27AE60', stat: 'apl', statDelta: 1 }, // 对应大江户「庭院」：双人碰面产研策
    9: { id: 'wholesaler', name: '货栈', cat: 'work', cost: 280, maint: 2, yield: 90, priceMin: 0, priceMax: 0, color: '#5D4037', stat: 'skl', statDelta: 1, visitExp: 8, cityAttr: 'tech' },
    10: { id: 'castle', name: '州城', cat: 'castle', cost: 750, maint: 3, yield: 220, priceMin: 0, priceMax: 0, color: '#455A64', visitExp: 12, unlock: 'castle' },
    11: { id: 'thatched', name: '草屋', cat: 'house', cost: 0, maint: 0, yield: 40, priceMin: 0, priceMax: 0, color: '#A1887F' },
    12: { id: 'tile_house', name: '瓦屋', cat: 'house', cost: 0, maint: 1, yield: 70, priceMin: 0, priceMax: 0, color: '#78909C' },
    13: { id: 'well', name: '水井', cat: 'fac', cost: 55, maint: 0, yield: 35, priceMin: 0, priceMax: 0, color: '#90A4AE', unlock: 'well', stat: 'loy', statDelta: 1 },
    14: { id: 'tea', name: '茶馆', cat: 'shop', cost: 100, maint: 1, yield: 60, priceMin: 7, priceMax: 11, color: '#8D6E63', unlock: 'tea', stat: 'int', statDelta: 1, cityAttr: 'edu' },
    15: { id: 'rice', name: '米铺', cat: 'shop', cost: 95, maint: 1, yield: 55, priceMin: 8, priceMax: 12, color: '#FFCC80', unlock: 'rice', stat: 'loy', statDelta: 1, cityAttr: 'food' },
    16: { id: 'inn', name: '客栈', cat: 'fac', cost: 170, maint: 2, yield: 75, priceMin: 0, priceMax: 0, color: '#8D6E63', unlock: 'inn', stat: 'apl', statDelta: 1 },
    17: { id: 'stable', name: '马厩', cat: 'fac', cost: 140, maint: 1, yield: 45, priceMin: 0, priceMax: 0, color: '#A1887F', unlock: 'stable' },
    18: { id: 'hot_spring', name: '温泉院', cat: 'fac', cost: 0, maint: 2, yield: 130, priceMin: 0, priceMax: 0, color: '#4DD0E1', rankUnlock: 'rank60', stat: 'apl', statDelta: 1 },
    19: { id: 'arena', name: '擂台', cat: 'fac', cost: 0, maint: 2, yield: 100, priceMin: 0, priceMax: 0, color: '#E57373', rankUnlock: 'rank40', stat: 'loy', statDelta: 1, cityAttr: 'war' },
    20: { id: 'school', name: '学塾', cat: 'fac', cost: 160, maint: 1, yield: 50, priceMin: 0, priceMax: 0, color: '#FFF8E1', unlock: 'school', stat: 'int', statDelta: 2, cityAttr: 'edu' },
    21: { id: 'bath', name: '澡堂', cat: 'fac', cost: 130, maint: 1, yield: 48, priceMin: 0, priceMax: 0, color: '#B3E5FC', unlock: 'bath', stat: 'apl', statDelta: 1 },
    22: { id: 'firehouse', name: '消防所', cat: 'fac', cost: 120, maint: 1, yield: 40, priceMin: 0, priceMax: 0, color: '#FFAB91', unlock: 'firehouse', stat: 'loy', statDelta: 1, cityAttr: 'war' },
    23: { id: 'tree', name: '绿树', cat: 'env', cost: 35, maint: 0, yield: 28, priceMin: 0, priceMax: 0, color: '#66BB6A', unlock: 'tree', stat: 'apl', statDelta: 1 },
    24: { id: 'cherry', name: '海棠', cat: 'env', cost: 55, maint: 0, yield: 42, priceMin: 0, priceMax: 0, color: '#F48FB1', unlock: 'cherry', stat: 'apl', statDelta: 1 },
    25: { id: 'pond', name: '方塘', cat: 'env', cost: 60, maint: 0, yield: 38, priceMin: 0, priceMax: 0, color: '#4FC3F7', unlock: 'pond', stat: 'loy', statDelta: 1 },
    26: { id: 'buddha', name: '石佛', cat: 'env', cost: 0, maint: 0, yield: 150, priceMin: 0, priceMax: 0, color: '#B0BEC5', rankUnlock: 'rank20', stat: 'int', statDelta: 1, cityAttr: 'edu' },
    27: { id: 'cloth', name: '布庄', cat: 'shop', cost: 105, maint: 1, yield: 52, priceMin: 9, priceMax: 13, color: '#CE93D8', unlock: 'cloth', stat: 'apl', statDelta: 1, cityAttr: 'tech' }
  };

  var DONKEY_COST = 120;
  var DONKEY_RANGE = 10;
  var VEHICLE_DONKEY = 'donkey';
  var VEHICLE_HORSE = 'whitehorse';
  var VEHICLE_CAR = 'car'; // 幕臣专属：步行近乎无上限
  var HORSE_RANGE = 20;
  var WALLET_BROKE = 8;      // 钱包耗尽：强制工作
  var WALLET_COMFORT = 22;   // 农夫有余额后极少工作
  var JOB_CHANGE_COST_BASE = 100;
  // 升到下一级所需经验（1→2 … 4→5）；满级 5 封顶
  var JOB_EXP_NEED = [0, 24, 50, 90, 140];

  // 坊巷：同一 4×4 区块内三组件即可（文档五）；倍率为乘法叠加
  var COMBO_DEFS = [
    { id: 'yexiao', name: '宵夜巷', types: [BUILD.NOODLE, BUILD.WONTON, BUILD.HOTPOT], yield: 0.15, price: 0.10 },
    { id: 'chami', name: '茶米巷', types: [BUILD.TEA, BUILD.RICE, BUILD.PARK], yield: 0.12, price: 0.08 },
    { id: 'shijing', name: '市井巷', types: [BUILD.NOODLE, BUILD.RICE, BUILD.WELL], yield: 0.10, price: 0.06 },
    { id: 'shanglu', name: '商路巷', types: [BUILD.WHOLESALER, BUILD.NOODLE, BUILD.WONTON], yield: 0.11, price: 0.07 },
    { id: 'qingshui', name: '清水巷', types: [BUILD.WELL, BUILD.PARK, BUILD.FIELD], yield: 0.10, price: 0.05 },
    { id: 'tangquan', name: '汤泉巷', types: [BUILD.HOT_SPRING, BUILD.INN, BUILD.PARK], yield: 0.14, price: 0.10 },
    { id: 'leitai', name: '擂台巷', types: [BUILD.ARENA, BUILD.CASTLE, BUILD.WELL], yield: 0.13, price: 0.08 },
    { id: 'minsheng', name: '民生巷', types: [BUILD.NOODLE, BUILD.WELL, BUILD.PARK], yield: 0.09, price: 0.06 },
    { id: 'chaguan', name: '茶馆巷', types: [BUILD.TEA, BUILD.WONTON, BUILD.PARK], yield: 0.11, price: 0.07 },
    { id: 'huoji', name: '货集巷', types: [BUILD.WHOLESALER, BUILD.RICE, BUILD.FIELD], yield: 0.10, price: 0.06 },
    { id: 'zhoufu', name: '州府巷', types: [BUILD.CASTLE, BUILD.TEA, BUILD.RICE], yield: 0.12, price: 0.09 },
    { id: 'yizhan', name: '驿站巷', types: [BUILD.INN, BUILD.STABLE, BUILD.WHOLESALER], yield: 0.11, price: 0.08 },
    { id: 'xiucai', name: '秀才巷', types: [BUILD.SCHOOL, BUILD.TEA, BUILD.PARK], yield: 0.12, price: 0.06 },
    { id: 'yutang', name: '浴堂巷', types: [BUILD.BATH, BUILD.WELL, BUILD.INN], yield: 0.11, price: 0.07 },
    { id: 'xiaofang', name: '消防巷', types: [BUILD.WELL, BUILD.FIREHOUSE, BUILD.TREE], yield: 0.08, price: 0.0, fireReduce: true },
    { id: 'huajing', name: '花径巷', types: [BUILD.CHERRY, BUILD.TREE, BUILD.POND], yield: 0.10, price: 0.04 },
    { id: 'fofa', name: '礼佛巷', types: [BUILD.BUDDHA, BUILD.PARK, BUILD.WELL], yield: 0.13, price: 0.05 },
    { id: 'buzhuang', name: '布市巷', types: [BUILD.CLOTH, BUILD.TEA, BUILD.WHOLESALER], yield: 0.11, price: 0.09 }
  ];

  // 工巧（货栈 5×5 环境决定可发现池）
  var CRAFT_DEFS = [
    { id: 'glass_bell', name: '玻璃风铃', requires: [], cost: { food: 3, war: 0, tech: 2, edu: 0 }, effect: 'prestige', val: 25 },
    { id: 'abacus', name: '银算盘', requires: [BUILD.FIELD], cost: { food: 2, war: 0, tech: 0, edu: 5 }, effect: 'gold', val: 80 },
    { id: 'pine_pot', name: '松盆栽', requires: [BUILD.PARK], cost: { food: 4, war: 0, tech: 0, edu: 2 }, effect: 'stat', stat: 'apl', val: 2 },
    { id: 'tea_set', name: '茶具套', requires: [BUILD.TEA], cost: { food: 6, war: 0, tech: 2, edu: 2 }, effect: 'yield', val: 0.08 },
    { id: 'silk_bag', name: '蜀锦香囊', requires: [BUILD.RICE, BUILD.TEA], cost: { food: 4, war: 0, tech: 4, edu: 4 }, effect: 'prestige', val: 40 },
    { id: 'war_drum', name: '川鼓', requires: [BUILD.HOTPOT], cost: { food: 3, war: 5, tech: 0, edu: 0 }, effect: 'combo', val: 0.05 },
    { id: 'water_model', name: '水利沙盘', requires: [BUILD.WELL, BUILD.FIELD], cost: { food: 4, war: 0, tech: 8, edu: 2 }, effect: 'field', val: 1 },
    { id: 'luck_fu', name: '福字帖', requires: [BUILD.CASTLE], cost: { food: 6, war: 2, tech: 0, edu: 4 }, effect: 'tax', val: 0.12 },
    { id: 'coin_str', name: '铜钱串', requires: [BUILD.WHOLESALER], cost: { food: 3, war: 0, tech: 2, edu: 0 }, effect: 'gold', val: 50 },
    { id: 'war_token', name: '甲士令', requires: [BUILD.CASTLE], cost: { food: 2, war: 8, tech: 2, edu: 0 }, effect: 'walk', val: 3 },
    { id: 'bamboo_lantern', name: '竹灯', requires: [BUILD.PARK], cost: { food: 3, war: 0, tech: 3, edu: 1 }, effect: 'walk', val: 2 },
    { id: 'ink_brush', name: '毛笔', requires: [BUILD.TEA, BUILD.INN], cost: { food: 2, war: 0, tech: 2, edu: 6 }, effect: 'stat', stat: 'int', val: 2 },
    { id: 'iron_pot', name: '铁釜', requires: [BUILD.HOTPOT, BUILD.WELL], cost: { food: 5, war: 4, tech: 3, edu: 0 }, effect: 'yield', val: 0.06 }
  ];

  // 客旅团
  var TRAVELER_DEFS = [
    { id: 'school', name: '蒙学春游', need: [BUILD.PARK, BUILD.WELL], reward: { edu: 6, gold: 30 } },
    { id: 'tour', name: '锦城观光团', need: [BUILD.NOODLE, BUILD.TEA, BUILD.RICE], reward: { gold: 120, prestige: 20 } },
    { id: 'tea_horse', name: '茶马商队', need: [BUILD.WHOLESALER, BUILD.TEA], reward: { gold: 80, food: 8, war: 4 } },
    { id: 'poet', name: '巡游诗社', need: [BUILD.TEA, BUILD.PARK], reward: { edu: 5, apl: 2 } },
    { id: 'inspect', name: '朝廷巡察', need: [BUILD.CASTLE, BUILD.INN], reward: { prestige: 50, gold: 100 } },
    { id: 'scholar', name: '书院游学', need: [BUILD.TEA, BUILD.INN, BUILD.CASTLE], reward: { edu: 10, prestige: 15 } },
    { id: 'festival', name: '庙会团', need: [BUILD.NOODLE, BUILD.HOTPOT, BUILD.PARK], reward: { gold: 90, food: 6 } },
    { id: 'salt', name: '盐商队', need: [BUILD.WHOLESALER, BUILD.STABLE], reward: { gold: 100, war: 5 } }
  ];

  // 排名奖（首次达标解锁建造）
  var RANK_REWARDS = [
    { id: 'rank60', name: '温泉院', maxRank: 60, build: BUILD.HOT_SPRING },
    { id: 'rank40', name: '擂台', maxRank: 40, build: BUILD.ARENA },
    { id: 'rank20', name: '大石佛', maxRank: 20, build: BUILD.BUDDHA, bonusGold: 200 }
  ];

  var COMBO_YIELD_BONUS = 0.15;
  var COMBO_PRICE_BONUS = 0.10;
  var LAND_PRICE_BASE = 120;
  var CASTLE_RAD = 3;
  var CASTLE_YIELD_MUL = 1.12;
  var CASTLE_MUTUAL_PER = 0.18; // 每多一座州城，全局州城俸禄互相加成
  var CASTLE_TAX_BONUS = 0.20;
  var MAX_CASTLE = 3;
  var COMBO_BLOCK = 4; // 坊巷判定区块边长
  var JOB_CHANGE_COST = JOB_CHANGE_COST_BASE;
  var META_KEY = 'dashu_meta_v1';

  var MAP_DEFS = {
    pingyuan: {
      id: 'pingyuan', name: '平畴乡', gold: 1500, prestige: 100,
      desc: '沃野平原，均衡开局', maintMul: 1.0, incomeMul: 1.0
    },
    jianmen: {
      id: 'jianmen', name: '剑门谷', gold: 1350, prestige: 90,
      desc: '山地多泥，维护略高', maintMul: 1.15, incomeMul: 1.0
    },
    jinjiang: {
      id: 'jinjiang', name: '锦江浦', gold: 1680, prestige: 115,
      desc: '临江富庶，收入加成', maintMul: 1.0, incomeMul: 1.08
    }
  };

  // 年贡：单套租金 ≈ 城市总俸禄 × 比例（文档 7.2，蜀化茅棚/草屋/瓦屋）
  var HOUSE_RENT = {};
  HOUSE_RENT[BUILD.HUT] = 0.48;
  HOUSE_RENT[BUILD.THATCHED] = 0.49;
  HOUSE_RENT[BUILD.TILE_HOUSE] = 0.50;

  // 住宅外观链（自动升级用）；金币为升到下一级消耗
  var HOUSE_UPGRADE = {};
  HOUSE_UPGRADE[BUILD.HUT] = { next: BUILD.THATCHED, gold: 120, name: '草屋' };
  HOUSE_UPGRADE[BUILD.THATCHED] = { next: BUILD.TILE_HOUSE, gold: 220, name: '瓦屋' };

  // 周结算自动升级：升到 2/3/4/5 级所需累计有效访问、金币（文档：全满足）
  var BUILD_VISIT_NEED = [0, 8, 18, 32, 50];
  var BUILD_UP_GOLD = [0, 45, 90, 160, 280];
  var HOUSE_VISIT_NEED = [0, 0, 0, 0, 0]; // 住宅不靠访问
  var HOUSE_UP_GOLD = [0, 120, 220, 320, 450];
  var HOUSE_JOB_NEED = [0, 3, 8, 12, 16]; // 升到下一级：单职≥3 / 总职等级阈值

  // 简单模式：人口迁入（4 周一判、魅力≥10、软上限 40）
  var MIG_CHARM_MIN = 10;
  var MIG_POP_CAP_MAX = 40;
  var MIG_INTERVAL_WEEKS = 4;
  var MIG_RETAINER_PRESTIGE = 500;

  // 职业收益表（简单模式 Lv1–5）
  var JOB_FIELD_PAY = [0, 10, 13, 16, 20, 25];
  var JOB_WHOLESALE_PAY = [0, 12, 16, 21, 27, 35];
  var JOB_CASTLE_WARRIOR_PAY = [0, 22, 28, 36, 45, 58];
  var JOB_CASTLE_RETAINER_PAY = [0, 40, 52, 66, 82, 100];
  var JOB_SHOP_SPEND = [0, 8, 11, 15, 20, 26];
  var JOB_FIELD_EXP = [0, 3, 4, 5, 6, 7];
  var JOB_WHOLESALE_EXP = [0, 4, 5, 6, 7, 8];
  var JOB_CASTLE_EXP_W = [0, 6, 7, 8, 9, 10];
  var JOB_CASTLE_EXP_R = [0, 10, 11, 12, 13, 15];

  // 道路等级名（田间小路→木板→砂石→砖瓦→磐石），对齐大江户道路体系
  var ROAD_LEVEL_NAMES = ['', '田间小路', '木板路', '砂石路', '砖瓦路', '磐石路'];
  var ROAD_LEVEL_COST = [0, 15, 35, 60, 100, 160];
  // 全城最高道路等级对步行范围的全局加成
  var ROAD_WALK_BONUS = [0, 0, 2, 4, 7, 11];
  // 州城建造石高门槛（首座靠研究解锁+石高；第2/3座再抬门槛，无年份锁）
  var CASTLE_PRESTIGE_NEED = [0, 280, 700, 1600];

  // 研策解锁（大江户式）：无年份门槛
  // 一类：纯研策；二类：研策+城市四属性；三·排名奖另表；道路/州城另附石高门槛
  var RESEARCH_UNLOCKS = [
    { id: 'well', name: '水井', cost: { food: 6, war: 0, tech: 0, edu: 0 }, build: BUILD.WELL },
    { id: 'tree', name: '绿树', cost: { food: 3, war: 0, tech: 0, edu: 2 }, build: BUILD.TREE },
    { id: 'pond', name: '方塘', cost: { food: 5, war: 0, tech: 3, edu: 2 }, build: BUILD.POND },
    { id: 'tea', name: '茶馆', cost: { food: 10, war: 0, tech: 0, edu: 5 }, build: BUILD.TEA },
    { id: 'rice', name: '米铺', cost: { food: 9, war: 0, tech: 5, edu: 0 }, build: BUILD.RICE },
    { id: 'cloth', name: '布庄', cost: { food: 7, war: 0, tech: 7, edu: 2 }, build: BUILD.CLOTH },
    { id: 'bath', name: '澡堂', cost: { food: 8, war: 0, tech: 3, edu: 4 }, needAttr: { food: 8 }, build: BUILD.BATH },
    { id: 'inn', name: '客栈', cost: { food: 9, war: 0, tech: 0, edu: 7 }, needAttr: { edu: 6 }, build: BUILD.INN },
    { id: 'cherry', name: '海棠', cost: { food: 5, war: 0, tech: 0, edu: 7 }, needAttr: { edu: 8 }, build: BUILD.CHERRY },
    { id: 'school', name: '学塾', cost: { food: 5, war: 0, tech: 0, edu: 12 }, needAttr: { edu: 14 }, build: BUILD.SCHOOL },
    { id: 'firehouse', name: '消防所', cost: { food: 5, war: 9, tech: 3, edu: 0 }, needAttr: { war: 10 }, build: BUILD.FIREHOUSE },
    { id: 'stable', name: '马厩', cost: { food: 6, war: 5, tech: 6, edu: 0 }, needAttr: { war: 8, tech: 8 }, build: BUILD.STABLE },
    { id: 'road_wood', name: '木板路', cost: { food: 4, war: 0, tech: 6, edu: 0 }, needAttr: { tech: 5 }, roadLevel: 2 },
    { id: 'road_gravel', name: '砂石路', cost: { food: 6, war: 0, tech: 10, edu: 2 }, needAttr: { tech: 12 }, needPrestige: 180, roadLevel: 3 },
    { id: 'road_brick', name: '砖瓦路', cost: { food: 8, war: 2, tech: 14, edu: 4 }, needAttr: { tech: 20 }, needPrestige: 450, roadLevel: 4 },
    { id: 'road_stone', name: '磐石路', cost: { food: 10, war: 8, tech: 18, edu: 6 }, needAttr: { tech: 28, war: 12 }, needPrestige: 1000, roadLevel: 5 },
    { id: 'castle', name: '州城', cost: { food: 16, war: 16, tech: 8, edu: 8 }, needAttr: { war: 12 }, needPrestige: 280, build: BUILD.CASTLE }
  ];

  var TERRAIN_COLOR = { 0: '#7CB342', 1: '#A1887F', 2: '#42A5F5' };
  var DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  // 贴图相对 assetBase 的路径（与 assets/manifest-s1.json 对齐）
  var ASSET_FILES = {
    terrain_0: 'terrain/tile_grass.png',
    terrain_1: 'terrain/tile_dirt.png',
    terrain_2: 'terrain/tile_water.png',
    build_1: 'roads/road_dirt.png',
    road_0: 'roads/road_dirt_0.png',
    road_1: 'roads/road_dirt_1.png',
    road_2: 'roads/road_dirt_2.png',
    road_3: 'roads/road_dirt_3.png',
    road_4: 'roads/road_dirt_4.png',
    road_5: 'roads/road_dirt_5.png',
    road_6: 'roads/road_dirt_6.png',
    road_7: 'roads/road_dirt_7.png',
    road_8: 'roads/road_dirt_8.png',
    road_9: 'roads/road_dirt_9.png',
    road_10: 'roads/road_dirt_10.png',
    road_11: 'roads/road_dirt_11.png',
    road_12: 'roads/road_dirt_12.png',
    road_13: 'roads/road_dirt_13.png',
    road_14: 'roads/road_dirt_14.png',
    road_15: 'roads/road_dirt_15.png',
    build_2: 'buildings/env_vacant_lot.png',
    build_3: 'buildings/house_hut.png',
    build_4: 'buildings/env_field.png',
    field_0: 'buildings/env_field.png',
    field_1: 'buildings/env_field_grow1.png',
    field_2: 'buildings/env_field_grow2.png',
    field_3: 'buildings/env_field_grow3.png',
    build_5: 'buildings/shop_noodle.png',
    build_6: 'buildings/shop_wonton.png',
    build_7: 'buildings/shop_hotpot.png',
    build_8: 'buildings/env_park.png',
    build_9: 'buildings/env_wholesaler.png',
    build_10: 'buildings/fac_castle.png',
    build_11: 'buildings/house_thatched.png',
    build_12: 'buildings/house_tile.png',
    build_13: 'buildings/env_well.png',
    build_14: 'buildings/shop_tea.png',
    build_15: 'buildings/shop_rice.png',
    build_16: 'buildings/fac_inn.png',
    build_17: 'buildings/fac_stable.png',
    build_18: 'buildings/fac_hot_spring.png',
    build_19: 'buildings/fac_arena.png',
    // 新建筑暂复用相近贴图（逻辑已独立；专用贴图可后补）
    build_20: 'buildings/shop_tea.png',
    build_21: 'buildings/fac_hot_spring.png',
    build_22: 'buildings/env_well.png',
    build_23: 'buildings/env_park.png',
    build_24: 'buildings/env_park.png',
    build_25: 'buildings/env_well.png',
    build_26: 'buildings/fac_arena.png',
    build_27: 'buildings/shop_rice.png',
    constructing: 'buildings/house_build.png',
    demolish: 'buildings/env_remove_hammer.png',
    job_farmer: 'characters/job_farmer.png',
    job_artisan: 'characters/job_artisan.png',
    job_merchant: 'characters/job_merchant.png',
    job_warrior: 'characters/job_warrior.png',
    job_farmer_walk: 'characters/job_farmer_walk.png',
    job_artisan_walk: 'characters/job_artisan_walk.png',
    job_merchant_walk: 'characters/job_merchant_walk.png',
    job_warrior_walk: 'characters/job_warrior_walk.png',
    job_farmer_plow: 'characters/job_farmer_plow.png',
    job_farmer_water: 'characters/job_farmer_water.png',
    job_farmer_harvest: 'characters/job_farmer_harvest.png',
    job_artisan_carry: 'characters/job_artisan_carry.png',
    job_merchant_carry: 'characters/job_merchant_carry.png',
    job_warrior_carry: 'characters/job_warrior_carry.png',
    job_farmer_celebrate: 'characters/job_farmer_celebrate.png',
    job_artisan_celebrate: 'characters/job_artisan_celebrate.png',
    job_merchant_celebrate: 'characters/job_merchant_celebrate.png',
    job_warrior_celebrate: 'characters/job_warrior_celebrate.png',
    job_artisan_work: 'characters/job_artisan_work.png',
    job_merchant_trade: 'characters/job_merchant_trade.png',
    job_warrior_train: 'characters/job_warrior_train.png',
    job_farmer_carry: 'characters/job_farmer_carry.png',
    pose_plow: 'characters/job_farmer_plow.png',
    pose_water: 'characters/job_farmer_water.png',
    pose_harvest: 'characters/job_farmer_harvest.png',
    pose_carry: 'characters/job_merchant_carry.png',
    ui_panel: 'ui/ui_panel.png',
    ui_topbar: 'ui/ui_topbar.png',
    ui_dialog: 'ui/ui_dialog.png',
    ui_btn: 'ui/ui_btn_normal.png',
    ui_btn_pressed: 'ui/ui_btn_pressed.png',
    ui_icon_build: 'ui/ui_btn_icon_build.png',
    ui_icon_menu: 'ui/ui_btn_icon_menu.png',
    ui_icon_people: 'ui/ui_btn_icon_people.png',
    ui_icon_combo: 'ui/ui_btn_icon_combo.png',
    ui_money: 'ui/icon_money.png',
    ui_yield: 'ui/icon_yield.png',
    ui_tax: 'ui/icon_tax.png',
    ui_research: 'ui/icon_research.png',
    ui_speed1: 'ui/icon_speed1.png',
    ui_speed2: 'ui/icon_speed2.png',
    ui_speed3: 'ui/icon_speed3.png',
    ui_pause: 'ui/icon_pause.png',
    ui_ghost_ok: 'ui/ui_ghost_ok.png',
    ui_ghost_bad: 'ui/ui_ghost_bad.png',
    ui_combo_badge: 'ui/ui_combo_badge.png',
    fx_coin: 'fx/fx_coin_pop.png',
    fx_rp: 'fx/fx_rp_pop.png',
    fx_combo: 'fx/fx_combo_stars.png',
    fx_dust: 'fx/fx_build_dust.png',
    fx_tax: 'fx/fx_tax_rain.png'
  };

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function key(x, y) { return x + ',' + y; }
  function dist(a, b) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }

  /** 格子坐标 → 世界坐标（连续格坐标，0.5=格心） */
  function gridToWorld(gx, gy) {
    return {
      x: (gx - gy) * (ISO_W / 2),
      y: (gx + gy) * (ISO_H / 2)
    };
  }

  /** 整数格子 (ix,iy) 的菱形中心世界坐标 */
  function gridCellCenter(ix, iy) {
    return gridToWorld(ix + 0.5, iy + 0.5);
  }

  /** 世界坐标 → 连续格子坐标 */
  function worldToGrid(wx, wy) {
    var a = wx / (ISO_W / 2);
    var b = wy / (ISO_H / 2);
    return {
      x: (a + b) / 2,
      y: (b - a) / 2
    };
  }

  /** 屏幕点 → 最近菱形格（宽松命中，整块可点） */
  function pickCellAtWorld(wx, wy) {
    var g = worldToGrid(wx, wy);
    var baseX = Math.floor(g.x);
    var baseY = Math.floor(g.y);
    var bestX = baseX;
    var bestY = baseY;
    var bestD = 999;
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        var cx = baseX + dx;
        var cy = baseY + dy;
        if (!inBounds(cx, cy)) continue;
        var c = gridCellCenter(cx, cy);
        // 菱形距离：<=1 在格内，略放宽到 1.25 方便点选
        var d = Math.abs(wx - c.x) / (ISO_W / 2) + Math.abs(wy - c.y) / (ISO_H / 2);
        if (d < bestD) {
          bestD = d;
          bestX = cx;
          bestY = cy;
        }
      }
    }
    if (bestD > 1.28) return null;
    return { x: bestX, y: bestY };
  }

  function mapWorldBounds() {
    // 四角格子中心构成的轴对齐包围盒（等距菱形外接矩形）
    var pts = [
      gridCellCenter(0, 0),
      gridCellCenter(COLS - 1, 0),
      gridCellCenter(0, ROWS - 1),
      gridCellCenter(COLS - 1, ROWS - 1)
    ];
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var i = 0; i < pts.length; i++) {
      minX = Math.min(minX, pts[i].x);
      minY = Math.min(minY, pts[i].y);
      maxX = Math.max(maxX, pts[i].x);
      maxY = Math.max(maxY, pts[i].y);
    }
    // 对称留白：建筑高度 + 半个菱形
    var padX = ISO_W;
    var padY = ISO_H * 3;
    return {
      minX: minX - padX,
      minY: minY - padY,
      maxX: maxX + padX,
      maxY: maxY + padY
    };
  }

  function mapCenterWorld() {
    var b = mapWorldBounds();
    return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
  }

  function isImgReady(img) {
    return !!(img && (img.complete || img.width > 0) && (img.naturalWidth > 0 || img.width > 0));
  }

  /** 加载 S1 贴图包；失败则绘制回退色块 */
  function createSpriteAtlas(options, canvas) {
    var base = options.assetBase != null ? options.assetBase : 'assets/';
    if (base && base.charAt(base.length - 1) !== '/') base += '/';
    var createImage = options.createImage;
    if (!createImage && canvas && typeof canvas.createImage === 'function') {
      createImage = function () { return canvas.createImage(); };
    }
    if (!createImage && typeof Image !== 'undefined') {
      createImage = function () { return new Image(); };
    }

    var sprites = {};
    var pending = 0;
    var loaded = 0;
    var failed = 0;

    function loadOne(id, rel) {
      if (!createImage || !rel) return;
      pending++;
      var img = createImage();
      sprites[id] = img;
      img.onload = function () { loaded++; };
      img.onerror = function () { failed++; sprites[id] = null; };
      img.src = base + rel;
    }

    var ids = Object.keys(ASSET_FILES);
    for (var i = 0; i < ids.length; i++) loadOne(ids[i], ASSET_FILES[ids[i]]);

    return {
      sprites: sprites,
      get: function (id) {
        var img = sprites[id];
        return isImgReady(img) ? img : null;
      },
      buildingSprite: function (b, fieldStage) {
        if (b === BUILD.FIELD) {
          var st = clamp(fieldStage || 0, 0, 3);
          return this.get('field_' + st) || this.get('build_4');
        }
        return this.get('build_' + b);
      },
      roadSprite: function (mask) {
        var m = mask & 15;
        return this.get('road_' + m) || this.get('build_1');
      },
      stats: function () { return { pending: pending, loaded: loaded, failed: failed }; }
    };
  }

  function isHouse(type) {
    return type === BUILD.HUT || type === BUILD.THATCHED || type === BUILD.TILE_HOUSE;
  }

  function isLandscape(type) {
    return type === BUILD.PARK || type === BUILD.TREE || type === BUILD.CHERRY ||
      type === BUILD.POND || type === BUILD.BUDDHA;
  }

  function isFacilityVisit(type) {
    return type === BUILD.SCHOOL || type === BUILD.BATH || type === BUILD.FIREHOUSE ||
      type === BUILD.HOT_SPRING || type === BUILD.ARENA || type === BUILD.WELL ||
      type === BUILD.INN || type === BUILD.STABLE;
  }

  /** 进屋工作的建筑（货栈/州城/住房等） */
  function isIndoorWorkBuilding(b) {
    return isHouse(b) || b === BUILD.WHOLESALER || b === BUILD.CASTLE || b === BUILD.SCHOOL || b === BUILD.BATH;
  }

  /** 开放式建筑：格内可见交互（园圃/田地/景观/井/温泉/演武场） */
  function isOpenInteractBuilding(b) {
    return b === BUILD.PARK || b === BUILD.FIELD || isLandscape(b) ||
      b === BUILD.WELL || b === BUILD.HOT_SPRING || b === BUILD.ARENA;
  }

  /** 封闭式访问：进建筑内并隐藏精灵 */
  function isIndoorVisitBuilding(b) {
    return isIndoorWorkBuilding(b) || isShopType(b) || b === BUILD.INN ||
      b === BUILD.STABLE || b === BUILD.FIREHOUSE;
  }

  var PARK_WAIT_SEC = 6;       // 单人到园圃等候配对
  var PARK_CHAT_LINGER = 2.8;  // 交谈后停留
  var VISIT_INSIDE_SEC = 1.85; // 进屋消费/设施停留
  var VISIT_ONTILE_SEC = 1.55; // 开放格内停留

  /** 室外站立/落点：仅道路（禁止在草地上游荡） */
  function isStandableCell(state, x, y) {
    if (!inBounds(x, y)) return false;
    return state.building[y][x] === BUILD.ROAD;
  }

  /** 从屋内走到建筑旁道路格 */
  function exitIndoorToAdjacent(state, r, gx, gy) {
    r.inside = false;
    r.indoorCell = null;
    var exit = findAdjacentStand(state, gx, gy, r.x, r.y);
    r.x = exit.x;
    r.y = exit.y;
  }

  /** 非「在家休息」的屋内 idle（客栈等）：先出屋再派工 */
  function exitIndoorIdle(state, r) {
    if (!r.inside || r._homeResting) return;
    var gx = r.indoorCell ? r.indoorCell.x : Math.floor(r.x);
    var gy = r.indoorCell ? r.indoorCell.y : Math.floor(r.y);
    exitIndoorToAdjacent(state, r, gx, gy);
    r.interactMode = 'adjacent';
    r.workPose = null;
    r._workPending = null;
    ensureOffBuilding(state, r);
    // 从自家初次出门：开启本趟 3 次行动
    if (!r._outingActive) beginOuting(r);
  }

  /** 在家休息结束：强制弹到邻路；新开一趟外出（重置 3 次行动） */
  function wakeFromHomeRest(state, r) {
    r.inside = false;
    r.indoorCell = null;
    r._homeResting = false;
    r._homeRestAcc = 0;
    r._justLeftHome = true;
    r._homeCooldown = 2.2; // 仅挡瞬间回头，勿拖太久
    r.interactMode = 'adjacent';
    r.targetKind = null;
    r.target = null;
    r.standPoint = null;
    r.path = [];
    r.pathIdx = 0;
    r.workPose = null;
    r._workPending = null;
    clearResidentParkCommit(state, r);
    beginOuting(r);
    var hx = r.homeX, hy = r.homeY;
    var road = nearestRoadTo(state, hx, hy);
    if (road) {
      r.x = road.x + 0.5;
      r.y = road.y + 0.5;
    } else {
      exitIndoorToAdjacent(state, r, hx, hy);
    }
    var cx = Math.floor(r.x), cy = Math.floor(r.y);
    if (inBounds(cx, cy) && state.building[cy][cx] !== BUILD.ROAD) {
      road = nearestRoadTo(state, hx, hy) || nearestRoadTo(state, cx, cy);
      if (road) { r.x = road.x + 0.5; r.y = road.y + 0.5; }
    }
    ensureOffBuilding(state, r);
  }

  /** 找建筑旁最佳站立点（必须道路；绝不落在目标建筑格心上） */
  function findAdjacentStand(state, gx, gy, fromX, fromY) {
    var best = null, bestScore = 999;
    for (var d = 0; d < 4; d++) {
      var nx = gx + DIRS[d][0], ny = gy + DIRS[d][1];
      if (!isStandableCell(state, nx, ny)) continue;
      var sx = nx + 0.5, sy = ny + 0.5;
      var score = Math.abs(sx - fromX) + Math.abs(sy - fromY);
      if (score < bestScore) { bestScore = score; best = { x: sx, y: sy }; }
    }
    if (best) return best;
    var road = nearestRoadTo(state, gx, gy);
    if (road) return { x: road.x + 0.5, y: road.y + 0.5 };
    return { x: fromX, y: fromY };
  }

  /** 同格站位偏移：避免多人叠成「一个人」 */
  var TILE_SLOT_OFFSETS = [
    { x: -0.20, y: -0.14 },
    { x:  0.20, y:  0.14 },
    { x: -0.16, y:  0.18 },
    { x:  0.16, y: -0.18 }
  ];
  var CROWD_MIN_DIST = 0.32; // 逻辑坐标最小间距

  function residentStableSlot(r) {
    var id = r && r.id;
    if (typeof id === 'number') return Math.abs(id) % TILE_SLOT_OFFSETS.length;
    if (typeof id === 'string') {
      var h = 0;
      for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
      return Math.abs(h) % TILE_SLOT_OFFSETS.length;
    }
    return 0;
  }

  /** 占用同格中尚未被占用的站位下标 */
  function claimTileSlot(state, r, gx, gy) {
    var used = {};
    for (var i = 0; i < state.residents.length; i++) {
      var o = state.residents[i];
      if (!o || o.id === r.id || o._tileSlot == null) continue;
      var ox = Math.floor(o.x), oy = Math.floor(o.y);
      var sameCell = (ox === gx && oy === gy);
      var samePark = o._parkWaitCell && o._parkWaitCell.x === gx && o._parkWaitCell.y === gy;
      var sameTarget = o.target && o.target.x === gx && o.target.y === gy &&
        (o.interactMode === 'on_tile' || o._parkWaiting);
      if (sameCell || samePark || sameTarget) used[o._tileSlot] = true;
    }
    for (var s = 0; s < TILE_SLOT_OFFSETS.length; s++) {
      if (!used[s]) {
        r._tileSlot = s;
        return s;
      }
    }
    r._tileSlot = residentStableSlot(r);
    return r._tileSlot;
  }

  function tileStandPos(gx, gy, slot) {
    var off = TILE_SLOT_OFFSETS[(slot != null ? slot : 0) % TILE_SLOT_OFFSETS.length];
    return { x: gx + 0.5 + off.x, y: gy + 0.5 + off.y };
  }

  /** 统计某点附近其他居民数量（用于出门选路避让） */
  function crowdNear(state, x, y, ignoreId, radius) {
    var rad = radius != null ? radius : 0.45;
    var n = 0;
    for (var i = 0; i < state.residents.length; i++) {
      var o = state.residents[i];
      if (!o || o.id === ignoreId || o.inside) continue;
      var dx = o.x - x, dy = o.y - y;
      if (dx * dx + dy * dy < rad * rad) n++;
    }
    return n;
  }

  /** 离开建筑时选较空的邻路，并带站位偏移 */
  function findAdjacentStandForResident(state, r, gx, gy, fromX, fromY) {
    var cands = [];
    for (var d = 0; d < 4; d++) {
      var nx = gx + DIRS[d][0], ny = gy + DIRS[d][1];
      if (!isStandableCell(state, nx, ny)) continue;
      cands.push({ x: nx, y: ny });
    }
    if (!cands.length) {
      var road = nearestRoadTo(state, gx, gy);
      if (road) cands.push(road);
    }
    if (!cands.length) return { x: fromX, y: fromY };

    var slot = r._tileSlot != null ? r._tileSlot : claimTileSlot(state, r, gx, gy);
    var best = null, bestScore = 1e9;
    for (var i = 0; i < cands.length; i++) {
      var c = cands[i];
      var pos = tileStandPos(c.x, c.y, slot);
      var dist = Math.abs(pos.x - fromX) + Math.abs(pos.y - fromY);
      var crowd = crowdNear(state, pos.x, pos.y, r.id, 0.5);
      // 优先空旷；其次近；不同 slot 倾向不同方向，减少同路叠走
      var dirBias = (slot % cands.length === i) ? -0.35 : 0;
      var score = crowd * 3.5 + dist + dirBias;
      if (score < bestScore) {
        bestScore = score;
        best = pos;
      }
    }
    return best || tileStandPos(cands[0].x, cands[0].y, slot);
  }

  /** 过近时轻推开，避免视觉叠成一人（不改变寻路目标） */
  function separateCrowdedResidents(state, dt) {
    var list = state.residents;
    if (!list || list.length < 2) return;
    var pushMul = Math.min(1, dt * 6);
    for (var i = 0; i < list.length; i++) {
      var a = list[i];
      if (!a || a.inside || a._homeResting) continue;
      for (var j = i + 1; j < list.length; j++) {
        var b = list[j];
        if (!b || b.inside || b._homeResting) continue;
        var dx = a.x - b.x;
        var dy = a.y - b.y;
        var dist2 = dx * dx + dy * dy;
        var minD = CROWD_MIN_DIST;
        if (dist2 >= minD * minD || dist2 < 1e-8) {
          // 完全重合时按 slot / id 掰开
          if (dist2 < 1e-8) {
            var sa = a._tileSlot != null ? a._tileSlot : residentStableSlot(a);
            var sb = b._tileSlot != null ? b._tileSlot : residentStableSlot(b);
            if (sa === sb) sb = (sa + 1) % TILE_SLOT_OFFSETS.length;
            var pa = TILE_SLOT_OFFSETS[sa];
            var pb = TILE_SLOT_OFFSETS[sb];
            a.x += pa.x * 0.5 * pushMul;
            a.y += pa.y * 0.5 * pushMul;
            b.x += pb.x * 0.5 * pushMul;
            b.y += pb.y * 0.5 * pushMul;
          }
          continue;
        }
        var dist = Math.sqrt(dist2);
        var need = (minD - dist) * 0.55 * pushMul;
        var nx = dx / dist;
        var ny = dy / dist;
        a.x += nx * need;
        a.y += ny * need;
        b.x -= nx * need;
        b.y -= ny * need;
      }
    }
  }

  /** 交互结束后若站在非道路室外格，弹回邻路（格内交互 / 田活 / 园圃等候除外） */
  function ensureOffBuilding(state, r) {
    if (r.inside) return;
    if (r._parkWaiting) return;
    if (r.interactMode === 'on_tile' && (r.state === 'work' || (r.state === 'idle' && (r.wait || 0) > 0))) return;
    if (r.state === 'work' && r._workPending && r._workPending.b === BUILD.FIELD) return;
    var cx = Math.floor(r.x), cy = Math.floor(r.y);
    if (!inBounds(cx, cy)) return;
    var b = state.building[cy][cx];
    if (b === BUILD.ROAD) return;
    // 田里劳作中可见；劳作结束/空闲时必须离开田格，否则下一段寻路会错乱
    if (b === BUILD.FIELD && r.state === 'work' && r.workPose) return;
    if (b === BUILD.FIELD || (b !== BUILD.NONE && b !== BUILD.ROAD)) {
      var stand = findAdjacentStand(state, cx, cy, r.x, r.y);
      r.x = stand.x;
      r.y = stand.y;
      return;
    }
    // 草地/水面：强制回道路
    if (b === BUILD.NONE || state.terrain[cy][cx] === TERRAIN.WATER) {
      var road = nearestRoadTo(state, cx, cy) || nearestRoadTo(state, r.homeX, r.homeY);
      if (road) { r.x = road.x + 0.5; r.y = road.y + 0.5; }
    }
  }

  /** 从开放格心退到邻路，结束格内停留 */
  function leaveOnTileStay(state, r) {
    var gx = r.target ? r.target.x : Math.floor(r.x);
    var gy = r.target ? r.target.y : Math.floor(r.y);
    if (r._parkWaitCell) {
      gx = r._parkWaitCell.x;
      gy = r._parkWaitCell.y;
    }
    r.inside = false;
    r.indoorCell = null;
    r.interactMode = 'adjacent';
    var exit = findAdjacentStandForResident(state, r, gx, gy, r.x, r.y);
    r.x = exit.x;
    r.y = exit.y;
    ensureOffBuilding(state, r);
  }

  /** 进屋访问：隐藏精灵并停留一段时间 */
  function settleInsideVisit(r, gx, gy, waitSec) {
    r.state = 'idle';
    r.wait = waitSec != null ? waitSec : VISIT_INSIDE_SEC;
    r.workPose = null;
    r.inside = true;
    r.interactMode = 'inside';
    r.indoorCell = { x: gx, y: gy };
    r.x = gx + 0.5;
    r.y = gy + 0.5;
    r._stuckT = 0;
    r.standPoint = null;
  }

  /** 开放格内访问：人物停在格内偏移站位（多人同格不重叠） */
  function settleOnTileVisit(state, r, gx, gy, waitSec) {
    r.state = 'idle';
    r.wait = waitSec != null ? waitSec : VISIT_ONTILE_SEC;
    r.workPose = null;
    r.inside = false;
    r.interactMode = 'on_tile';
    r.indoorCell = null;
    var slot = claimTileSlot(state, r, gx, gy);
    var pos = tileStandPos(gx, gy, slot);
    r.x = pos.x;
    r.y = pos.y;
    r.target = { x: gx, y: gy };
    r._stuckT = 0;
    r.standPoint = null;
  }

  /** 下田/进屋：从邻路走到目标格心（禁止斜穿草地乱跳） */
  function approachStandPoint(state, r, dt) {
    if (!r.standPoint) {
      finishVisit(state, r);
      return;
    }
    var tx = r.standPoint.x, ty = r.standPoint.y;
    var gx = Math.floor(tx), gy = Math.floor(ty);
    var cx = Math.floor(r.x), cy = Math.floor(r.y);
    var manh = Math.abs(gx - cx) + Math.abs(gy - cy);

    // 已在目标格：吸到格心并结算
    if (cx === gx && cy === gy) {
      r.x = tx;
      r.y = ty;
      r.standPoint = null;
      finishVisit(state, r);
      return;
    }

    // 过远：先落到目标旁道路，再走完最后一格（田/屋）
    if (manh > 1) {
      var near = findAdjacentStand(state, gx, gy, r.x, r.y);
      r.x = near.x;
      r.y = near.y;
      cx = Math.floor(r.x);
      cy = Math.floor(r.y);
      manh = Math.abs(gx - cx) + Math.abs(gy - cy);
      if (manh > 1) {
        // 无邻路：瞬移到目标（仍可见，不设 inside）
        r.x = tx;
        r.y = ty;
        r.standPoint = null;
        finishVisit(state, r);
        return;
      }
    }

    var sp = 2.4 * (state.speed || 1);
    var dx = tx - r.x, dy = ty - r.y;
    var len = Math.sqrt(dx * dx + dy * dy);
    var step = sp * dt;
    var wdx = (dx - dy);
    if (Math.abs(wdx) > 0.02) r.facing = wdx >= 0 ? 1 : -1;
    r.animT = (r.animT || 0) + dt * 7 * (state.speed || 1);
    if (len < 0.06 || step >= len) {
      r.x = tx;
      r.y = ty;
      r.standPoint = null;
      finishVisit(state, r);
    } else {
      r.x += (dx / len) * step;
      r.y += (dy / len) * step;
    }
  }

  function nearestCell(list, gx, gy) {
    var best = list[0], bestD = 999;
    for (var i = 0; i < list.length; i++) {
      var d = Math.abs(list[i].x - gx) + Math.abs(list[i].y - gy);
      if (d < bestD) { bestD = d; best = list[i]; }
    }
    return best;
  }

  function fieldsNeedingWater(state, fields) {
    var out = [];
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      var st = state.fieldStage[f.y][f.x] || 0;
      if (st === 1 || st === 2) out.push(f);
    }
    return out;
  }

  /** 农夫可直接在田里干的活（耕地/收割）；需浇水则改去水井 */
  function farmerFieldWorkList(state, r, workList) {
    var wells = filterReachable(state, r, findBuildings(state, BUILD.WELL));
    if (!wells.length) return workList;
    return workList.filter(function (f) {
      var st = state.fieldStage[f.y][f.x] || 0;
      return st !== 1 && st !== 2;
    });
  }

  function pickFarmerWaterTarget(state, r, workList) {
    // 本趟未访农田中需浇水的；水井也须本趟未访
    var waterFields = fieldsNeedingWater(state, workList).filter(function (f) {
      return !isOutingVisited(r, f.x, f.y);
    });
    if (!waterFields.length) return null;
    var wells = filterUnvisitedOuting(r, filterReachable(state, r, findBuildings(state, BUILD.WELL)));
    if (!wells.length) return null;
    var wf = waterFields[(Math.random() * waterFields.length) | 0];
    return { cell: nearestCell(wells, wf.x, wf.y), kind: 'water', workField: wf };
  }

  /** 大江户式交互落点：屋内隐藏 / 开放格内可见（不再站邻格旁） */
  function prepareInteraction(state, r, pick) {
    var gx = pick.cell.x, gy = pick.cell.y;
    var b = state.building[gy][gx];
    var kind = pick.kind;
    r._workField = pick.workField || null;
    r.workPoseHint = null;

    function openTileStand() {
      var slot = claimTileSlot(state, r, gx, gy);
      return tileStandPos(gx, gy, slot);
    }

    if (kind === 'home') {
      // 路上保持 adjacent，进屋后 finishVisit 再标 inside（避免挑担回家途中被隐藏）
      r.interactMode = 'adjacent';
      r.target = { x: r.homeX, y: r.homeY };
      r.standPoint = { x: r.homeX + 0.5, y: r.homeY + 0.5 };
      return;
    }

    if (kind === 'water') {
      r.interactMode = 'on_tile';
      r.workPoseHint = 'water';
      r.target = { x: gx, y: gy };
      r.standPoint = openTileStand();
      return;
    }

    if (kind === 'work' || kind === 'merchant_work') {
      r.target = { x: gx, y: gy };
      if (b === BUILD.FIELD) {
        var st = state.fieldStage[gy][gx] || 0;
        r.workPoseHint = st === 0 ? 'plow' : (st === 3 ? 'harvest' : 'water');
        r.interactMode = 'on_tile';
        r.standPoint = openTileStand();
      } else if (isIndoorVisitBuilding(b) || isIndoorWorkBuilding(b) || isShopType(b)) {
        if (r.job === 'artisan') r.workPoseHint = 'work';
        else if (r.job === 'merchant') r.workPoseHint = 'trade';
        else if (r.job === 'warrior' || r.job === 'retainer') r.workPoseHint = 'train';
        else r.workPoseHint = 'carry';
        r.interactMode = 'inside';
        r.standPoint = { x: gx + 0.5, y: gy + 0.5 };
      } else if (isOpenInteractBuilding(b)) {
        r.workPoseHint = 'carry';
        r.interactMode = 'on_tile';
        r.standPoint = openTileStand();
      } else {
        r.workPoseHint = 'carry';
        r.interactMode = 'inside';
        r.standPoint = { x: gx + 0.5, y: gy + 0.5 };
      }
      return;
    }

    if (kind === 'inn' || kind === 'stable' || kind === 'shop') {
      r.interactMode = 'inside';
      r.target = { x: gx, y: gy };
      r.standPoint = { x: gx + 0.5, y: gy + 0.5 };
      return;
    }

    if (kind === 'leisure') {
      r.target = { x: gx, y: gy };
      if (isOpenInteractBuilding(b)) {
        r.interactMode = 'on_tile';
        r.standPoint = openTileStand();
      } else {
        r.interactMode = 'inside';
        r.standPoint = { x: gx + 0.5, y: gy + 0.5 };
      }
      return;
    }

    if (kind === 'park') {
      r.target = { x: gx, y: gy };
      r.interactMode = 'on_tile';
      r.standPoint = openTileStand();
      return;
    }

    // 默认：封闭建筑进屋，开放建筑格内
    r.target = { x: gx, y: gy };
    if (isOpenInteractBuilding(b)) {
      r.interactMode = 'on_tile';
      r.standPoint = openTileStand();
    } else {
      r.interactMode = 'inside';
      r.standPoint = { x: gx + 0.5, y: gy + 0.5 };
    }
  }

  function isShopType(type) {
    return type === BUILD.NOODLE || type === BUILD.WONTON || type === BUILD.HOTPOT ||
      type === BUILD.TEA || type === BUILD.RICE || type === BUILD.CLOTH;
  }

  function castleCells(state) {
    return findBuildings(state, BUILD.CASTLE);
  }

  function distToCastle(state, x, y) {
    var cs = castleCells(state);
    if (!cs.length) return 999;
    var best = 999;
    for (var i = 0; i < cs.length; i++) {
      var d = Math.abs(cs[i].x - x) + Math.abs(cs[i].y - y);
      if (d < best) best = d;
    }
    return best;
  }

  function nearCastle(state, x, y) {
    return distToCastle(state, x, y) <= CASTLE_RAD;
  }

  function hasCastle(state) {
    return castleCells(state).length > 0;
  }

  function castleCount(state) {
    return castleCells(state).length;
  }

  function castleBuildHint(state) {
    var n = castleCount(state);
    if (n >= MAX_CASTLE) return '州城已达上限（' + MAX_CASTLE + '座）';
    if (!state.unlocked || !state.unlocked.castle) return '需先研究解锁「州城」';
    var need = CASTLE_PRESTIGE_NEED[n + 1] || 9999;
    if (n === 2) {
      if ((state.prestige || 0) >= need || (state.nationalRank || 99) <= 40) return null;
      return '第三座州城需石高≥' + need + ' 或 全国排名≤40';
    }
    if ((state.prestige || 0) < need) {
      return '第' + (n + 1) + '座州城需石高≥' + need + '（现' + Math.floor(state.prestige || 0) + '）';
    }
    return null;
  }

  function canBuildCastle(state) {
    return !castleBuildHint(state);
  }

  function mapDefFor(state) {
    return MAP_DEFS[state.mapId] || MAP_DEFS.pingyuan;
  }

  function houseRentRate(type) {
    return HOUSE_RENT[type] != null ? HOUSE_RENT[type] : 0.30;
  }

  function addRp(state, color, n) {
    if (!state.rp) state.rp = { food: 0, war: 0, tech: 0, edu: 0 };
    if (!state.cityAttr) state.cityAttr = { food: 0, war: 0, tech: 0, edu: 0 };
    state.rp[color] = (state.rp[color] || 0) + n;
    // 城市四属性：累计获得量（只增不减），作研究门槛；研策池可花费
    if (n > 0) state.cityAttr[color] = (state.cityAttr[color] || 0) + n;
    state.research = (state.rp.food || 0) + (state.rp.war || 0) + (state.rp.tech || 0) + (state.rp.edu || 0);
  }

  function getCityAttr(state) {
    if (!state.cityAttr) state.cityAttr = { food: 0, war: 0, tech: 0, edu: 0 };
    return state.cityAttr;
  }

  function getRoadLevel(state, x, y) {
    if (!inBounds(x, y) || !isRoad(state, x, y)) return 0;
    if (!state.roadLevel || !state.roadLevel[y]) return 1;
    return Math.max(1, Math.min(5, state.roadLevel[y][x] || 1));
  }

  function setRoadLevel(state, x, y, lv) {
    if (!inBounds(x, y)) return;
    if (!state.roadLevel) state.roadLevel = [];
    if (!state.roadLevel[y]) state.roadLevel[y] = [];
    state.roadLevel[y][x] = Math.max(1, Math.min(5, lv | 0));
  }

  function maxRoadLevelOnMap(state) {
    var best = 1;
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        if (!isRoad(state, x, y)) continue;
        var lv = getRoadLevel(state, x, y);
        if (lv > best) best = lv;
      }
    }
    return best;
  }

  function adjacentMaxRoadLevel(state, x, y) {
    var best = 0;
    for (var d = 0; d < 4; d++) {
      var nx = x + DIRS[d][0], ny = y + DIRS[d][1];
      if (!isRoad(state, nx, ny)) continue;
      var lv = getRoadLevel(state, nx, ny);
      if (lv > best) best = lv;
    }
    return best;
  }

  function canUseRoadLevel(state, lv) {
    if (lv <= 1) return true;
    var id = lv === 2 ? 'road_wood' : (lv === 3 ? 'road_gravel' : (lv === 4 ? 'road_brick' : 'road_stone'));
    return !!(state.unlocked && state.unlocked[id]);
  }

  function researchUnlockOf(id) {
    for (var i = 0; i < RESEARCH_UNLOCKS.length; i++) {
      if (RESEARCH_UNLOCKS[i].id === id) return RESEARCH_UNLOCKS[i];
    }
    return null;
  }

  function researchGateHint(state, u) {
    if (!u) return '未知项目';
    if (state.unlocked[u.id]) return null;
    if (u.needPrestige && (state.prestige || 0) < u.needPrestige) {
      return '需石高≥' + u.needPrestige + '（现' + Math.floor(state.prestige || 0) + '）';
    }
    if (u.needAttr) {
      var ca = getCityAttr(state);
      var keys = ['food', 'war', 'tech', 'edu'];
      var labels = { food: '食', war: '武', tech: '技', edu: '学' };
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if ((u.needAttr[k] || 0) > 0 && (ca[k] || 0) < u.needAttr[k]) {
          return '需城市' + labels[k] + '属性≥' + u.needAttr[k] + '（现' + (ca[k] || 0) + '）';
        }
      }
    }
    if (u.needCombo) {
      if (!state.comboEver || !state.comboEver[u.needCombo]) {
        return '需先激活坊巷「' + u.needCombo + '」';
      }
    }
    return null;
  }

  var RESIDENT_NAMES = [
    '阿禾', '青荷', '石三', '柳七', '周福', '陈婆', '小满', '大壮',
    '春米', '秋实', '金贵', '银花', '铁柱', '翠莲', '狗剩', '猫儿',
    '二牛', '三娃', '秀秀', '腊月'
  ];

  var LEAVE_SAT_THRESHOLD = 50;
  var LEAVE_WEEKS_NEED = 6; // 连续低满意周数（开局设施不足时不宜过短）
  var LEAVE_GRACE_WEEKS = 12; // 开局保护：前 12 周不因满意度迁出

  function bumpStat(r, key, amount) {
    ensureResidentFields(r);
    r.stats[key] = clamp((r.stats[key] || 0) + amount, 0, 100);
  }

  /** 对齐大江户：确保住民含职业等级/经验/满意度/步行基值；四维 0–100 */
  function ensureResidentFields(r) {
    if (!r.stats) r.stats = { int: 15, loy: 40, apl: 15, skl: 15 };
    // 旧档小刻度 → 0–100
    if (!r._stats100) {
      var mx = Math.max(r.stats.int || 0, r.stats.loy || 0, r.stats.apl || 0, r.stats.skl || 0);
      if (mx > 0 && mx <= 20) {
        r.stats.int = clamp(Math.round((r.stats.int || 1) * 5), 0, 100);
        r.stats.loy = clamp(Math.round((r.stats.loy || 1) * 5), 0, 100);
        r.stats.apl = clamp(Math.round((r.stats.apl || 1) * 5), 0, 100);
        r.stats.skl = clamp(Math.round((r.stats.skl || 1) * 5), 0, 100);
      }
      r._stats100 = true;
    }
    if (!r.jobLevels) {
      r.jobLevels = { farmer: 1, artisan: 1, merchant: 1, warrior: 0, retainer: 0 };
      if (r.job === 'warrior') r.jobLevels.warrior = 1;
      if (r.job === 'retainer') { r.jobLevels.warrior = 5; r.jobLevels.retainer = 1; }
      if (r.job === 'farmer') r.jobLevels.farmer = Math.max(1, r.jobLevels.farmer);
      if (r.job === 'artisan') r.jobLevels.artisan = Math.max(1, r.jobLevels.artisan);
      if (r.job === 'merchant') r.jobLevels.merchant = Math.max(1, r.jobLevels.merchant);
    }
    if (!r.jobExp) r.jobExp = { farmer: 0, artisan: 0, merchant: 0, warrior: 0, retainer: 0 };
    if (r.satisfaction == null) r.satisfaction = 60;
    if (r.baseWalk == null) r.baseWalk = r.walkRange || (9 + ((Math.random() * 6) | 0));
    if (r.ageYears == null) r.ageYears = 0;
    if (!r.name) {
      var ni = (r.id != null ? r.id : 0) % RESIDENT_NAMES.length;
      r.name = RESIDENT_NAMES[ni] + (((r.id != null ? r.id : 0) >= RESIDENT_NAMES.length) ? String((r.id | 0) + 1) : '');
    }
    refreshWalkRange(r);
  }

  function jobLevelOf(r, job) {
    ensureResidentFields(r);
    return r.jobLevels[job] || 0;
  }

  function refreshWalkRange(r) {
    // 勿再调 ensureResidentFields，避免与 ensure 互相递归
    var w = r.baseWalk != null ? r.baseWalk : (r.walkRange || 11);
    if (r.vehicle === VEHICLE_CAR) r.walkRange = 999;
    else if (r.vehicle === VEHICLE_HORSE) r.walkRange = Math.min(40, w + HORSE_RANGE);
    else if (r.vehicle === VEHICLE_DONKEY) r.walkRange = Math.min(28, w + DONKEY_RANGE);
    else r.walkRange = w;
  }

  /** 道路等级抬升全城步行（大江户：道路品质决定活动半径） */
  function applyRoadWalkBonus(state, r) {
    refreshWalkRange(r);
    if (r.vehicle === VEHICLE_CAR) return;
    var bonus = ROAD_WALK_BONUS[maxRoadLevelOnMap(state)] || 0;
    if (bonus > 0) r.walkRange = Math.min(40, (r.walkRange || 11) + bonus);
  }

  function basicJobSum(r) {
    return jobLevelOf(r, 'farmer') + jobLevelOf(r, 'artisan') + jobLevelOf(r, 'merchant');
  }

  function canUnlockWarrior(r) {
    return basicJobSum(r) >= 12;
  }

  function canUnlockRetainer(state, r) {
    return canUnlockRetainerJobs(r);
  }

  function canUnlockRetainerJobs(r) {
    return jobLevelOf(r, 'farmer') >= 5 && jobLevelOf(r, 'artisan') >= 5 &&
      jobLevelOf(r, 'merchant') >= 5 && jobLevelOf(r, 'warrior') >= 5;
  }

  function gainJobExp(state, r, job, baseAmt, pathLen) {
    ensureResidentFields(r);
    var lv = jobLevelOf(r, job);
    if (lv <= 0 || lv >= 5) return;
    var intV = (r.stats.int || 0) / 25;
    var distMul = 1;
    if (pathLen != null) {
      if (pathLen > r.walkRange) distMul = 0.05;
      else if (pathLen > r.walkRange * 0.7) distMul = 0.45;
      else if (pathLen > r.walkRange * 0.4) distMul = 0.75;
    }
    // 知惠决定升级速度（0–100）
    var amt = baseAmt * (0.55 + intV * 0.09) * distMul;
    // 春夏略快、秋冬略慢（月 1–6 春夏）
    if (state.month >= 9 || state.month <= 2) amt *= 0.88;
    else if (state.month >= 3 && state.month <= 8) amt *= 1.08;
    r.jobExp[job] = (r.jobExp[job] || 0) + amt;
    var need = JOB_EXP_NEED[lv] || 999;
    if (r.jobExp[job] >= need) {
      r.jobExp[job] -= need;
      r.jobLevels[job] = lv + 1;
      addFloat(state, Math.floor(r.x), Math.floor(r.y), jobLabel(job) + '升至' + (lv + 1) + '级', '#CE93D8');
      if (job === 'warrior' && r.jobLevels.warrior >= 4) tryGrantWhiteHorse(state, r);
    }
  }

  function tryGrantWhiteHorse(state, r) {
    if (r.vehicle === VEHICLE_HORSE || r.vehicle === VEHICLE_CAR) return;
    if (r.job !== 'warrior' && r.job !== 'retainer') return;
    var wlv = jobLevelOf(r, 'warrior');
    if (wlv < 4 && jobLevelOf(r, 'retainer') < 1) return;
    if (!findBuildings(state, BUILD.STABLE).length) return;
    var chance = wlv >= 5 ? 0.85 : 0.35;
    if (Math.random() > chance) return;
    r.vehicle = VEHICLE_HORSE;
    refreshWalkRange(r);
    showToast(state, jobLabel(r.job) + ' #' + (r.id + 1) + ' 获白马 · 步行大增', 1.4);
    addFloat(state, Math.floor(r.x), Math.floor(r.y), '白马', '#FFF59D');
  }

  /** 幕臣专属汽车：全图可达（简单模式 Lv4 概率 / Lv5 稳定） */
  function tryGrantCar(state, r) {
    if (r.job !== 'retainer') return;
    if (r.vehicle === VEHICLE_CAR) return;
    var rlv = jobLevelOf(r, 'retainer');
    if (rlv < 4) return;
    var chance = rlv >= 5 ? 0.9 : 0.4;
    if (Math.random() > chance) return;
    r.vehicle = VEHICLE_CAR;
    refreshWalkRange(r);
    showToast(state, '幕僚 #' + (r.id + 1) + ' 获轿车 · 全图通行', 1.4);
    addFloat(state, Math.floor(r.x), Math.floor(r.y), '轿车', '#B3E5FC');
  }

  /** 下一项可转职业（需州城；农/匠/商自由；甲士/幕僚门槛） */
  function nextJobCandidate(state, r) {
    ensureResidentFields(r);
    if (!hasCastle(state)) return null;
    var order = ['farmer', 'artisan', 'merchant', 'warrior', 'retainer'];
    var i0 = order.indexOf(r.job);
    if (i0 < 0) i0 = 0;
    for (var step = 1; step <= order.length; step++) {
      var j = order[(i0 + step) % order.length];
      if (j === r.job) continue;
      if (j === 'warrior' && !r.bornWarrior && !canUnlockWarrior(r)) continue;
      if (j === 'retainer' && !canUnlockRetainerJobs(r)) continue;
      return j;
    }
    return null;
  }

  function vehicleLabel(v) {
    if (v === VEHICLE_CAR) return '轿车';
    if (v === VEHICLE_HORSE) return '白马';
    if (v === VEHICLE_DONKEY) return '驴马';
    return '步行';
  }

  function changeJob(state, r, newJob) {
    ensureResidentFields(r);
    if (r.job === newJob) {
      showToast(state, '已是' + jobLabel(newJob));
      return false;
    }
    if (!hasCastle(state)) {
      showToast(state, '需先建造州城才能转职');
      return false;
    }
    if (newJob === 'warrior') {
      if (!r.bornWarrior && !canUnlockWarrior(r)) {
        showToast(state, '需农+匠+商等级合计≥12（现' + basicJobSum(r) + '）');
        return false;
      }
    }
    if (newJob === 'retainer') {
      if (!canUnlockRetainerJobs(r)) {
        showToast(state, '需农/匠/商/甲士皆满5级');
        return false;
      }
    }
    if (state.gold < JOB_CHANGE_COST) {
      showToast(state, '转职需' + JOB_CHANGE_COST + '金');
      return false;
    }
    state.gold -= JOB_CHANGE_COST;
    r.job = newJob;
    if (newJob === 'warrior' && jobLevelOf(r, 'warrior') < 1) r.jobLevels.warrior = 1;
    if (newJob === 'retainer' && jobLevelOf(r, 'retainer') < 1) r.jobLevels.retainer = 1;
    r.color = jobColor(newJob);
    if (newJob === 'retainer') tryGrantCar(state, r);
    showToast(state, '转职成功：' + jobLabel(newJob) + '（-' + JOB_CHANGE_COST + '金）');
    return true;
  }

  function workBuildingsForJob(state, r) {
    if (r.job === 'farmer') return findBuildings(state, BUILD.FIELD);
    if (r.job === 'artisan') {
      return findBuildings(state, BUILD.WHOLESALER).concat(findBuildings(state, BUILD.CASTLE));
    }
    if (r.job === 'merchant') {
      return findBuildings(state, BUILD.CASTLE)
        .concat(findBuildings(state, BUILD.NOODLE))
        .concat(findBuildings(state, BUILD.WONTON))
        .concat(findBuildings(state, BUILD.HOTPOT))
        .concat(findBuildings(state, BUILD.TEA))
        .concat(findBuildings(state, BUILD.RICE))
        .concat(findBuildings(state, BUILD.WHOLESALER));
    }
    // 甲士/幕臣：州城
    return findBuildings(state, BUILD.CASTLE);
  }

  function leisureChanceByJob(r) {
    // 农夫闲逛最高；职人最低；商人移动消费最高
    if (r.job === 'farmer') return 0.78;
    if (r.job === 'artisan') return 0.28;
    if (r.job === 'merchant') return 0.62;
    if (r.job === 'warrior' || r.job === 'retainer') return 0.35;
    return 0.5;
  }

  function consumeChanceByJob(r) {
    if (r.job === 'merchant') return 0.82;
    if (r.job === 'warrior' || r.job === 'retainer') return 0.55;
    if (r.job === 'farmer') return 0.28;
    if (r.job === 'artisan') return 0.22;
    return 0.4;
  }

  function homeHasGreen(state, r) {
    for (var dy = -2; dy <= 2; dy++) {
      for (var dx = -2; dx <= 2; dx++) {
        var nx = r.homeX + dx, ny = r.homeY + dy;
        if (!inBounds(nx, ny)) continue;
        var b = state.building[ny][nx];
        if (isLandscape(b) || b === BUILD.FIELD || b === BUILD.PARK) return true;
      }
    }
    return false;
  }

  function homeNearAmenity(state, r, type) {
    for (var dy = -3; dy <= 3; dy++) {
      for (var dx = -3; dx <= 3; dx++) {
        var nx = r.homeX + dx, ny = r.homeY + dy;
        if (!inBounds(nx, ny)) continue;
        if (state.building[ny][nx] === type) return true;
      }
    }
    return false;
  }

  function homeNearNegative(state, r) {
    // 火锅等负属性店靠近住宅压满意度
    for (var dy = -2; dy <= 2; dy++) {
      for (var dx = -2; dx <= 2; dx++) {
        var nx = r.homeX + dx, ny = r.homeY + dy;
        if (!inBounds(nx, ny)) continue;
        if (state.building[ny][nx] === BUILD.HOTPOT) return true;
      }
    }
    return false;
  }

  /** 通勤压力：工作过远掏空钱包，进一步压满意度 */
  function applyWeeklyCommuteStress(state, r) {
    ensureResidentFields(r);
    r._commuteHard = false;
    var works = workBuildingsForJob(state, r);
    if (!works.length) {
      r._commuteHard = true;
      return;
    }
    var best = 999;
    for (var i = 0; i < works.length; i++) {
      var plen = pathLenFromHome(state, r, works[i].x, works[i].y);
      if (plen < best) best = plen;
    }
    if (best > r.walkRange) {
      r.wallet = Math.max(0, r.wallet - 4);
      r._commuteHard = true;
    } else if (best > r.walkRange * 0.7) {
      r.wallet = Math.max(0, r.wallet - 2);
      r._commuteHard = true;
    }
  }

  function cityHasBuildingType(state, type) {
    return findBuildings(state, type).length > 0;
  }

  function cityHasAnyBath(state) {
    return cityHasBuildingType(state, BUILD.BATH) || cityHasBuildingType(state, BUILD.HOT_SPRING);
  }

  function cityHasAnyGreen(state) {
    return findBuildings(state, BUILD.PARK).length > 0 ||
      findBuildings(state, BUILD.TREE).length > 0 ||
      findBuildings(state, BUILD.CHERRY).length > 0 ||
      findBuildings(state, BUILD.POND).length > 0 ||
      findBuildings(state, BUILD.BUDDHA).length > 0;
  }

  function weeksElapsed(state) {
    return ((state.year || 1) - 1) * 48 + ((state.month || 1) - 1) * 4 + ((state.week || 1) - 1);
  }

  function updateSatisfactionWeekly(state, r) {
    ensureResidentFields(r);
    applyWeeklyCommuteStress(state, r);
    var s0 = r.satisfaction;
    var loy = r.stats.loy || 40;
    // 忠诚低放大负面、削弱正面
    var negMul = loy < 35 ? 1.45 : (loy < 50 ? 1.2 : 1);
    var posMul = loy > 70 ? 1.15 : 1;

    // 缺设施惩罚：仅当城里已有该类设施却住得远时才扣（开局无澡堂/园林不倒扣）
    if (homeHasGreen(state, r)) s0 += 1.5 * posMul;
    else if (cityHasAnyGreen(state)) s0 -= 0.6 * negMul;

    if (homeNearAmenity(state, r, BUILD.BATH)) s0 += 2.2 * posMul;
    else if (homeNearAmenity(state, r, BUILD.HOT_SPRING)) s0 += 1.4 * posMul;
    else if (cityHasAnyBath(state)) s0 -= 0.8 * negMul;

    if (homeNearAmenity(state, r, BUILD.PARK) || homeNearAmenity(state, r, BUILD.TREE)) s0 += 0.8 * posMul;
    if (homeNearAmenity(state, r, BUILD.SCHOOL)) s0 += 0.4 * posMul;
    if (homeNearNegative(state, r)) s0 -= 1.5 * negMul;

    if (r.wallet < WALLET_BROKE) s0 -= 1.2 * negMul;
    else if (r._shoppedThisWeek) s0 += 1.2 * posMul;
    if (r._commuteHard) s0 -= 1.2 * negMul;
    if (r._workedThisWeek) s0 += 1.2 * posMul;
    if (r._tooFarThisWeek) s0 -= 1.0 * negMul;

    r.satisfaction = clamp(s0, 0, 100);
    // 个人满意度长期 <50 → 累计迁出周数（开局保护期内不计）
    if (weeksElapsed(state) < LEAVE_GRACE_WEEKS) {
      r._lowSatWeeks = 0;
    } else if (r.satisfaction < LEAVE_SAT_THRESHOLD) {
      r._lowSatWeeks = (r._lowSatWeeks || 0) + 1;
    } else {
      r._lowSatWeeks = 0;
    }
    r._workedThisWeek = false;
    r._shoppedThisWeek = false;
    r._tooFarThisWeek = false;
  }

  /**
   * 迁出（跑路）：暂时屏蔽，便于调行走/回家等表现。
   * 恢复时：满意度连续若干周 <50 则删除；开局保护期内不迁出。
   */
  function tryResidentLeave(state, r) {
    return false;
  }

  function residentAtHomeCell(state, x, y) {
    for (var i = 0; i < state.residents.length; i++) {
      var r = state.residents[i];
      if (r.homeX === x && r.homeY === y) return r;
    }
    return null;
  }

  /** 有住民绑定的格子：仅空地/宅基可恢复为茅棚；绝不覆盖田/店/设施 */
  function ensureResidentHomeBuilding(state, r) {
    if (!r || !inBounds(r.homeX, r.homeY)) return;
    var b = state.building[r.homeY][r.homeX];
    if (isHouse(b)) {
      if (state.vacantTimers) delete state.vacantTimers[key(r.homeX, r.homeY)];
      return;
    }
    if (b === BUILD.NONE || b === BUILD.VACANT) {
      state.building[r.homeY][r.homeX] = BUILD.HUT;
      if (state.vacantTimers) delete state.vacantTimers[key(r.homeX, r.homeY)];
      return;
    }
    rehomeResident(state, r);
  }

  function rehomeResident(state, r) {
    if (!r) return;
    var homes = listHomes(state);
    for (var i = 0; i < homes.length; i++) {
      var h = homes[i];
      var occ = residentAtHomeCell(state, h.x, h.y);
      if (occ && occ.id !== r.id) continue;
      r.homeX = h.x;
      r.homeY = h.y;
      if (state.vacantTimers) delete state.vacantTimers[key(h.x, h.y)];
      return;
    }
  }

  function syncAllResidentHomes(state) {
    for (var i = 0; i < state.residents.length; i++) {
      ensureResidentHomeBuilding(state, state.residents[i]);
    }
  }

  function migrationFee(state) {
    // 文档：安家费 = 总俸禄×4；短局声望量级下直接套用
    return Math.max(80, Math.floor((state.prestige || 40) * 4));
  }


  function researchRpCostTotal(u) {
    var c = (u && u.cost) || {};
    return (c.food || 0) + (c.war || 0) + (c.tech || 0) + (c.edu || 0);
  }

  /** 大江户式研究时长：研策总消耗越高越久；学属性加速 */
  function researchDurationSec(state, u) {
    var total = researchRpCostTotal(u);
    var base = 4.5 + total * 0.65; // 约数秒～二十秒（1x）
    var edu = (getCityAttr(state).edu || 0);
    var schoolN = findBuildings(state, BUILD.SCHOOL).length;
    var speedMul = 1 / (1 + edu * 0.012 + schoolN * 0.08);
    return Math.max(3.2, base * speedMul);
  }

  function canAffordResearch(state, u) {
    var c = (u && u.cost) || { food: 0, war: 0, tech: 0, edu: 0 };
    return (state.rp.food || 0) >= c.food && (state.rp.war || 0) >= c.war &&
      (state.rp.tech || 0) >= c.tech && (state.rp.edu || 0) >= c.edu;
  }

  /** 不可研究原因（已解锁/门槛/研策不足/正在研究其它） */
  function researchBlockReason(state, u) {
    if (!u) return '未知项目';
    if (state.unlocked[u.id]) return '已解锁';
    if (state.researching && state.researching.id && state.researching.id !== u.id) {
      return '正在研究其它项目';
    }
    if (state.researching && state.researching.id === u.id) return null; // 进行中可点查看
    var gate = researchGateHint(state, u);
    if (gate) return gate;
    if (!canAffordResearch(state, u)) {
      var c = u.cost || {};
      return '研策不足：食' + c.food + ' 武' + c.war + ' 技' + c.tech + ' 学' + c.edu;
    }
    return null;
  }

  function tryUnlock(state, unlockId) {
    var u = researchUnlockOf(unlockId);
    if (!u) return false;
    if (state.unlocked[unlockId]) {
      showToast(state, '已解锁：' + u.name);
      return false;
    }
    if (state.researching && state.researching.id) {
      if (state.researching.id === unlockId) {
        var pct = Math.floor((state.researching.t / state.researching.dur) * 100);
        showToast(state, '研究中「' + u.name + '」' + pct + '%');
        return false;
      }
      showToast(state, '已有研究进行中，请等待完成');
      return false;
    }
    var block = researchBlockReason(state, u);
    if (block) {
      showToast(state, block);
      return false;
    }
    var c = u.cost || { food: 0, war: 0, tech: 0, edu: 0 };
    state.rp.food -= c.food;
    state.rp.war -= c.war;
    state.rp.tech -= c.tech;
    state.rp.edu -= c.edu;
    addRp(state, 'food', 0);
    var dur = researchDurationSec(state, u);
    state.researching = { id: unlockId, name: u.name, t: 0, dur: dur };
    showToast(state, '开始研究「' + u.name + '」…', 1.2);
    return true;
  }

  function tickResearch(state, dt) {
    var job = state.researching;
    if (!job || !job.id) return;
    if (state.unlocked[job.id]) {
      state.researching = null;
      return;
    }
    job.t = (job.t || 0) + dt;
    if (job.t >= job.dur) {
      state.unlocked[job.id] = true;
      var name = job.name || job.id;
      state.researching = null;
      showToast(state, '研究完成！解锁「' + name + '」', 1.4);
      playSfx('click');
    }
  }

  function canBuildUnlocked(state, type, opts) {
    opts = opts || {};
    if (type === BUILD.ROAD) {
      var lv = opts.roadLevel || 1;
      return canUseRoadLevel(state, lv);
    }
    var meta = BUILD_META[type];
    if (!meta) return true;
    if (meta.rankUnlock) return !!(state.rankUnlocked && state.rankUnlocked[meta.rankUnlock]);
    if (!meta.unlock) return true;
    return !!state.unlocked[meta.unlock];
  }

  function hasInn(state) {
    return findBuildings(state, BUILD.INN).length > 0;
  }

  function calcNationalRank(state) {
    return clamp(99 - Math.floor(state.prestige / (60 + state.year * 30)), 1, 99);
  }

  function comboBonusForType(state, type, kind) {
    // 兼容旧调用：无坐标时取全局已激活坊巷中含该类型者
    var bonus = 0;
    if (!state.activeCombos) return 0;
    for (var i = 0; i < COMBO_DEFS.length; i++) {
      var c = COMBO_DEFS[i];
      if (!state.activeCombos[c.id]) continue;
      for (var t = 0; t < c.types.length; t++) {
        if (c.types[t] === type) {
          bonus += kind === 'yield' ? c.yield : c.price;
          break;
        }
      }
    }
    if (state.craftBuffs && state.craftBuffs.combo && kind === 'yield') bonus += state.craftBuffs.combo;
    return bonus;
  }

  /** 文档五：4×4 区块内所有建筑享受该区坊巷乘法叠加；物价仅商铺 */
  function comboBonusAt(state, x, y, kind) {
    if (x == null || y == null) return 0;
    if (!state.blockCombos) return comboBonusForType(state, state.building[y][x], kind);
    var bk = ((x / COMBO_BLOCK) | 0) + ',' + ((y / COMBO_BLOCK) | 0);
    var map = state.blockCombos[bk];
    if (!map) return 0;
    var mul = 1;
    for (var i = 0; i < COMBO_DEFS.length; i++) {
      var c = COMBO_DEFS[i];
      if (!map[c.id]) continue;
      if (kind === 'price') {
        if (!isShopType(state.building[y][x])) continue;
        mul *= (1 + (c.price || 0));
      } else {
        mul *= (1 + (c.yield || 0));
      }
    }
    if (kind === 'yield' && state.craftBuffs && state.craftBuffs.combo) mul *= (1 + state.craftBuffs.combo);
    return mul - 1;
  }

  function getBuildLevel(state, x, y) {
    if (!inBounds(x, y)) return 1;
    var b = state.building[y][x];
    if (isHouse(b)) {
      var base = b === BUILD.HUT ? 1 : (b === BUILD.THATCHED ? 2 : 3);
      var sl = (state.shopLevel[y] && state.shopLevel[y][x]) || 1;
      return Math.max(base, Math.min(5, sl));
    }
    return (state.shopLevel[y] && state.shopLevel[y][x]) || 1;
  }

  function getVisitCount(state, x, y) {
    if (!state.visitCount || !state.visitCount[y]) return 0;
    return state.visitCount[y][x] || 0;
  }

  function addVisitCount(state, x, y, amt) {
    if (!inBounds(x, y) || !(amt > 0)) return;
    if (!state.visitCount) state.visitCount = [];
    if (!state.visitCount[y]) state.visitCount[y] = [];
    state.visitCount[y][x] = (state.visitCount[y][x] || 0) + amt;
  }

  /** 文档：适配职业访问才计有效次数 */
  function visitWeightFor(buildingType, job) {
    if (buildingType === BUILD.STABLE || buildingType === BUILD.ROAD ||
        buildingType === BUILD.NONE || buildingType === BUILD.VACANT) return 0;
    if (isHouse(buildingType)) return 0;
    if (buildingType === BUILD.FIELD) return job === 'farmer' ? 1 : 0;
    if (buildingType === BUILD.WHOLESALER) return job === 'artisan' ? 1 : 0;
    if (isShopType(buildingType)) {
      if (job === 'merchant') return 1;
      if (job === 'warrior' || job === 'retainer') return 0.5;
      return 0.05;
    }
    if (buildingType === BUILD.CASTLE) {
      if (job === 'warrior' || job === 'retainer') return 1;
      return 0.1;
    }
    // 学塾/澡堂/客栈/景观/庭院等：全职可计；商贾/幕僚略高
    if (job === 'merchant' || job === 'retainer') return 1.25;
    return 1;
  }

  function recordBuildingVisit(state, x, y, r) {
    if (!r || !inBounds(x, y)) return;
    var b = state.building[y][x];
    var w = visitWeightFor(b, r.job);
    if (w <= 0) return;
    addVisitCount(state, x, y, w);
  }

  function canAutoUpgradeType(b) {
    if (!b || b === BUILD.NONE || b === BUILD.ROAD || b === BUILD.VACANT) return false;
    if (b === BUILD.STABLE) return false; // 文档：马厩无升级
    return !!BUILD_META[b] || isHouse(b);
  }

  function residentJobPower(r) {
    ensureResidentFields(r);
    var jl = r.jobLevels || {};
    return (jl.farmer || 0) + (jl.artisan || 0) + (jl.merchant || 0) +
      (jl.warrior || 0) + (jl.retainer || 0);
  }

  function residentMaxJobLevel(r) {
    ensureResidentFields(r);
    var jl = r.jobLevels || {};
    return Math.max(jl.farmer || 0, jl.artisan || 0, jl.merchant || 0, jl.warrior || 0, jl.retainer || 0);
  }

  /** 住房自动升级（不靠访问；看住客职业等级+金币+通路） */
  function tryUpgradeHouseCell(state, x, y) {
    var b = state.building[y][x];
    if (!isHouse(b)) return false;
    if (!adjacentToRoad(state, x, y)) return false;
    if (state.constructing && state.constructing[key(x, y)]) return false;
    var res = residentAtHomeCell(state, x, y);
    if (!res) return false;
    var lv = getBuildLevel(state, x, y);
    if (lv >= 5) return false;
    var cost = HOUSE_UP_GOLD[lv] || 200;
    if (state.gold < cost) return false;
    if (lv === 1 && residentMaxJobLevel(res) < 3) return false;
    if (lv >= 2 && residentJobPower(res) < (HOUSE_JOB_NEED[lv] || 8)) return false;
    if (lv >= 3 && state.prestige < 180) return false;
    if (lv >= 4 && state.prestige < 320) return false;
    // 高阶住宅：邻接道路等级门槛（文档 2.1 / 7.3）
    var adjRoad = adjacentMaxRoadLevel(state, x, y);
    if (lv >= 3 && adjRoad < 3) return false; // →4级需砂石路+
    if (lv >= 4 && adjRoad < 5) return false; // →5级需磐石路

    var nextLv = lv + 1;
    var nextType = b;
    if (nextLv >= 2 && b === BUILD.HUT) nextType = BUILD.THATCHED;
    if (nextLv >= 3) nextType = BUILD.TILE_HOUSE;
    state.gold -= cost;
    // 改建施工过程（脚手架），完工后才换外观与等级
    state.constructing[key(x, y)] = {
      type: nextType,
      t: 1.55,
      houseUpgrade: { nextLv: nextLv }
    };
    showToast(state, '住房改建施工中…（-' + cost + '金）', 1.1);
    addFloat(state, x, y, '改建', '#FFE082');
    return true;
  }

  function tryUpgradeBuildingCell(state, x, y) {
    var b = state.building[y][x];
    if (!canAutoUpgradeType(b) || isHouse(b)) return false;
    if (state.constructing && state.constructing[key(x, y)]) return false;
    if (!adjacentToRoad(state, x, y)) return false;
    var lv = getBuildLevel(state, x, y);
    if (lv >= 5) return false;
    var need = BUILD_VISIT_NEED[lv] || 999;
    if (getVisitCount(state, x, y) < need) return false;
    var cost = BUILD_UP_GOLD[lv] || 100;
    if (state.gold < cost) return false;
    if (b === BUILD.CASTLE && state.prestige < 100 + lv * 70) return false;

    state.gold -= cost;
    if (!state.shopLevel[y]) state.shopLevel[y] = [];
    state.shopLevel[y][x] = lv + 1;
    var name = (BUILD_META[b] && BUILD_META[b].name) || '建筑';
    showToast(state, name + ' 自动升至' + (lv + 1) + '级（-' + cost + '金）', 1.1);
    addFloat(state, x, y, '升至' + (lv + 1) + '级', '#90CAF9');
    return true;
  }

  /** 每周末尾：全图自动升级判定（文档 1.1） */
  function processWeeklyBuildingUpgrades(state) {
    var upgraded = 0;
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        var b = state.building[y][x];
        if (isHouse(b)) {
          if (tryUpgradeHouseCell(state, x, y)) upgraded++;
        } else if (tryUpgradeBuildingCell(state, x, y)) {
          upgraded++;
        }
      }
    }
    if (upgraded > 0) recalcPrestige(state);
  }

  // 兼容旧调用名：改为只记账访问，升级改周结算
  function bumpBuildLevel(state, x, y, chance) {
    // chance 参数废弃；若无居民上下文则忽略
  }

  function castleMutualMul(state) {
    var n = castleCount(state);
    if (n <= 1) return 1;
    return 1 + (n - 1) * CASTLE_MUTUAL_PER;
  }

  function wholesaleNeighborSet(state, wx, wy) {
    var set = {};
    for (var dy = -2; dy <= 2; dy++) {
      for (var dx = -2; dx <= 2; dx++) {
        var nx = wx + dx, ny = wy + dy;
        if (!inBounds(nx, ny)) continue;
        var b = state.building[ny][nx];
        if (b !== BUILD.NONE) set[b] = true;
      }
    }
    return set;
  }

  function craftCanDiscover(state, craft, near) {
    if (state.craftDiscovered.indexOf(craft.id) >= 0) return false;
    for (var i = 0; i < craft.requires.length; i++) {
      if (!near[craft.requires[i]]) return false;
    }
    return true;
  }

  function maxBuildingLevelOf(state, type) {
    var list = findBuildings(state, type);
    var mx = 0;
    for (var i = 0; i < list.length; i++) {
      mx = Math.max(mx, getBuildLevel(state, list[i].x, list[i].y));
    }
    return mx;
  }

  function tryDiscoverCraft(state, r, wx, wy) {
    if (r.job !== 'artisan' && r.job !== 'warrior') return;
    // 文档 2.2.2：货栈 1–2 级无工艺研发；≥3 级才可发现
    if (getBuildLevel(state, wx, wy) < 3) return;
    var near = wholesaleNeighborSet(state, wx, wy);
    var pool = [];
    for (var i = 0; i < CRAFT_DEFS.length; i++) {
      if (craftCanDiscover(state, CRAFT_DEFS[i], near)) pool.push(CRAFT_DEFS[i]);
    }
    if (!pool.length) return;
    var skl = r.stats ? (r.stats.skl || 0) : 0;
    var wlv = getBuildLevel(state, wx, wy);
    var baseRate = wlv >= 5 ? 0.42 : (wlv >= 4 ? 0.30 : (wlv >= 3 ? 0.22 : 0.12));
    if (Math.random() > baseRate + skl * 0.002) return;
    var pick = pool[(Math.random() * pool.length) | 0];
    state.craftDiscovered.push(pick.id);
    showToast(state, '发现工巧：' + pick.name + '！', 1.4);
  }

  function craftDefById(id) {
    for (var i = 0; i < CRAFT_DEFS.length; i++) if (CRAFT_DEFS[i].id === id) return CRAFT_DEFS[i];
    return null;
  }

  function tryMakeCraft(state, craftId) {
    var c = craftDefById(craftId);
    if (!c) return false;
    if (state.craftDiscovered.indexOf(craftId) < 0) {
      showToast(state, '尚未发现该工巧');
      return false;
    }
    // 文档 2.2.2：需有 ≥3 级货栈才可制作工巧
    if (maxBuildingLevelOf(state, BUILD.WHOLESALER) < 3) {
      showToast(state, '需货栈升至3级才能制作工巧');
      return false;
    }
    var artisans = state.residents.filter(function (r) { return r.job === 'artisan'; });
    if (!artisans.length) {
      showToast(state, '需有在职匠人才能制作');
      return false;
    }
    var cost = c.cost;
    if ((state.rp.food || 0) < cost.food || (state.rp.war || 0) < cost.war ||
        (state.rp.tech || 0) < cost.tech || (state.rp.edu || 0) < cost.edu) {
      showToast(state, '研策不足');
      return false;
    }
    state.rp.food -= cost.food;
    state.rp.war -= cost.war;
    state.rp.tech -= cost.tech;
    state.rp.edu -= cost.edu;
    state.research = (state.rp.food || 0) + (state.rp.war || 0) + (state.rp.tech || 0) + (state.rp.edu || 0);
    var skl = artisans[0].stats ? (artisans[0].stats.skl || 0) : 0;
    // 才能决定成功率（0–100）
    if (Math.random() > 0.50 + skl * 0.004) {
      // 失败返还投入的 1/5
      state.rp.food += Math.floor(cost.food / 5);
      state.rp.war += Math.floor(cost.war / 5);
      state.rp.tech += Math.floor(cost.tech / 5);
      state.rp.edu += Math.floor(cost.edu / 5);
      state.research = (state.rp.food || 0) + (state.rp.war || 0) + (state.rp.tech || 0) + (state.rp.edu || 0);
      showToast(state, '制作失败（返还1/5研策）', 1.1);
      return false;
    }
    if (!state.craftStock) state.craftStock = [];
    state.craftStock.push({ id: craftId, lv: 1, charges: 1 });
    bumpStat(artisans[0], 'skl', Math.random() < 0.4 ? 1 : 0);
    showToast(state, '制成：' + c.name, 1.1);
    return true;
  }

  function useCraftItem(state, idx) {
    if (!state.craftStock || idx < 0 || idx >= state.craftStock.length) return;
    var item = state.craftStock[idx];
    var c = craftDefById(item.id);
    if (!c) return;
    state.craftStock.splice(idx, 1);
    if (c.effect === 'prestige') {
      state.prestige += c.val;
      showToast(state, c.name + '：声望+' + c.val);
    } else if (c.effect === 'gold') {
      state.gold += c.val;
      showToast(state, c.name + '：+' + c.val + '金');
    } else if (c.effect === 'stat') {
      for (var i = 0; i < state.residents.length; i++) bumpStat(state.residents[i], c.stat, Math.max(3, c.val * 3));
      showToast(state, c.name + '：全员属性提升');
    } else if (c.effect === 'yield') {
      state.pendingCraftEquip = { id: item.id, name: c.name, yieldBonus: Math.max(8, Math.floor((c.val || 0.08) * 100)) };
      showToast(state, '请点击地图建筑挂载「' + c.name + '」', 1.6);
    } else if (c.effect === 'combo') {
      if (!state.craftBuffs) state.craftBuffs = {};
      state.craftBuffs.combo = (state.craftBuffs.combo || 0) + c.val;
      showToast(state, c.name + '：坊巷加成提升');
    } else if (c.effect === 'tax') {
      if (!state.craftBuffs) state.craftBuffs = {};
      state.craftBuffs.tax = (state.craftBuffs.tax || 0) + c.val;
      showToast(state, c.name + '：下次年贡提升');
    } else if (c.effect === 'walk') {
      for (var j = 0; j < state.residents.length; j++) {
        var rw = state.residents[j];
        rw.baseWalk = Math.min(28, (rw.baseWalk || rw.walkRange || 11) + c.val);
        refreshWalkRange(rw);
      }
      showToast(state, c.name + '：步行范围+' + c.val);
    } else if (c.effect === 'field') {
      for (var y = 0; y < ROWS; y++) {
        for (var x = 0; x < COLS; x++) {
          if (state.building[y][x] === BUILD.FIELD) {
            state.fieldStage[y][x] = Math.min(3, (state.fieldStage[y][x] || 0) + 1);
          }
        }
      }
      showToast(state, c.name + '：田地成长');
    }
    recalcPrestige(state);
  }

  /** 对单个住民使用工艺品：永久提升四维（抢救高阶住民） */
  function useCraftOnResident(state, craftIdx, r) {
    if (!r || !state.craftStock || craftIdx < 0 || craftIdx >= state.craftStock.length) {
      showToast(state, '没有可用工艺品');
      return false;
    }
    var item = state.craftStock[craftIdx];
    var c = craftDefById(item.id);
    if (!c) return false;
    state.craftStock.splice(craftIdx, 1);
    ensureResidentFields(r);
    bumpStat(r, 'int', 4 + ((Math.random() * 4) | 0));
    bumpStat(r, 'loy', 4 + ((Math.random() * 4) | 0));
    bumpStat(r, 'apl', 4 + ((Math.random() * 4) | 0));
    bumpStat(r, 'skl', 4 + ((Math.random() * 4) | 0));
    r.satisfaction = Math.min(100, (r.satisfaction || 60) + 8);
    r._lowSatWeeks = 0;
    showToast(state, (r.name || '住民') + ' 使用「' + c.name + '」·四维提升', 1.3);
    addFloat(state, Math.floor(r.x), Math.floor(r.y), '工艺+', '#CE93D8');
    return true;
  }

  function spawnTraveler(state) {
    if (!hasInn(state) || state.traveler) return;
    var pool = TRAVELER_DEFS.filter(function (t) {
      if (t.id === 'inspect' && !hasCastle(state)) return false;
      return true;
    });
    if (!pool.length) return;
    var pick = pool[(Math.random() * pool.length) | 0];
    state.traveler = {
      id: pick.id,
      name: pick.name,
      need: pick.need.slice(),
      progress: 0,
      max: pick.need.length,
      weeksLeft: 6,
      reward: pick.reward
    };
    showToast(state, '客旅到访：' + pick.name, 1.5);
  }

  function onTravelerVisitBuilding(state, b) {
    if (!state.traveler) return;
    var idx = state.traveler.need.indexOf(b);
    if (idx < 0) return;
    state.traveler.need.splice(idx, 1);
    state.traveler.progress++;
    addFloat(state, 0, 0, '客旅+1', '#FFE082');
    if (state.traveler.need.length === 0) finishTraveler(state, true);
  }

  function finishTraveler(state, ok) {
    var t = state.traveler;
    if (!t) return;
    if (ok && t.reward) {
      if (t.reward.gold) state.gold += t.reward.gold;
      if (t.reward.prestige) state.prestige += t.reward.prestige;
      if (t.reward.food) addRp(state, 'food', t.reward.food);
      if (t.reward.war) addRp(state, 'war', t.reward.war);
      if (t.reward.edu) addRp(state, 'edu', t.reward.edu);
      if (t.reward.apl) {
        for (var i = 0; i < state.residents.length; i++) bumpStat(state.residents[i], 'apl', t.reward.apl);
      }
      showToast(state, t.name + '满意离店！', 1.4);
      recalcPrestige(state);
    } else {
      showToast(state, t.name + '未满意便离去', 1.0);
    }
    state.traveler = null;
  }

  function tickTravelerWeek(state) {
    if (!state.traveler) {
      // 文档 2.4.3：客栈等级越高，旅客到访频率越高
      var innLv = Math.max(1, maxBuildingLevelOf(state, BUILD.INN));
      var rate = 0.10 + innLv * 0.05;
      if (hasInn(state) && Math.random() < rate) spawnTraveler(state);
      return;
    }
    state.traveler.weeksLeft--;
    if (state.traveler.weeksLeft <= 0) finishTraveler(state, false);
  }

  function tryBuyDonkey(state, r) {
    if (r.vehicle === VEHICLE_DONKEY || r.vehicle === VEHICLE_HORSE || r.vehicle === VEHICLE_CAR) return;
    if (r.wallet < DONKEY_COST) {
      addFloat(state, Math.floor(r.x), Math.floor(r.y), '买不起驴', '#EF9A9A');
      return;
    }
    r.wallet -= DONKEY_COST;
    r.vehicle = VEHICLE_DONKEY;
    r.baseWalk = r.baseWalk || r.walkRange;
    refreshWalkRange(r);
    addFloat(state, Math.floor(r.x), Math.floor(r.y), '购得驴马', '#AED581');
    showToast(state, jobLabel(r.job) + ' 购驴马 · 步行+' + DONKEY_RANGE, 1.1);
  }

  function checkRankRewards(state) {
    var rank = calcNationalRank(state);
    state.nationalRank = rank;
    if (!state.rankUnlocked) state.rankUnlocked = {};
    for (var i = 0; i < RANK_REWARDS.length; i++) {
      var rw = RANK_REWARDS[i];
      if (rank > rw.maxRank) continue;
      if (state.rankUnlocked[rw.id]) continue;
      state.rankUnlocked[rw.id] = true;
      if (rw.build) state.rankUnlocked['build_' + rw.build] = true;
      var msg = '全国排名第' + rank + '！解锁「' + rw.name + '」';
      if (rw.bonusGold) {
        state.gold += rw.bonusGold;
        msg += ' +' + rw.bonusGold + '金';
      }
      showToast(state, msg, 2.0);
    }
  }

  function upgradeHouseAt(state, x, y) {
    // 文档：住房为周结算自动升级，禁止手动改建
    showToast(state, '住房会按住客等级自动升级，无需手动改建');
    return false;
  }

  function changeJobToWarrior(state, r) {
    return changeJob(state, r, 'warrior');
  }

  function applyMapLayout(terrain, building, mapId) {
    mapId = mapId || 'pingyuan';
    var cx, cy, i, j;
    // 30×30 地图：开局簇放在中心附近

    if (mapId === 'jianmen') {
      for (j = ROWS - 5; j < ROWS; j++) {
        for (i = COLS - 5; i < COLS; i++) terrain[j][i] = TERRAIN.WATER;
      }
      for (j = 8; j < 24; j++) {
        for (i = 0; i < 10; i++) terrain[j][i] = TERRAIN.DIRT;
      }
      cx = 15; cy = 15;
      for (i = cx - 3; i <= cx + 3; i++) setBuild(building, i, cy, BUILD.ROAD);
      for (j = cy - 3; j <= cy + 3; j++) setBuild(building, cx, j, BUILD.ROAD);
      setBuild(building, cx + 2, cy - 1, BUILD.HUT);
      setBuild(building, cx + 2, cy + 1, BUILD.HUT);
      setBuild(building, cx - 2, cy + 1, BUILD.FIELD);
      setBuild(building, cx + 3, cy + 1, BUILD.WHOLESALER);
      setBuild(building, cx + 3, cy - 1, BUILD.PARK); // 园圃=庭院（不占道路）
      return;
    }

    if (mapId === 'jinjiang') {
      for (j = 2; j < ROWS - 2; j++) {
        terrain[j][14] = TERRAIN.WATER;
        terrain[j][15] = TERRAIN.WATER;
      }
      for (j = 10; j < 18; j++) {
        terrain[j][8] = TERRAIN.DIRT;
        terrain[j][20] = TERRAIN.DIRT;
      }
      cx = 12; cy = 15;
      for (i = 8; i <= 18; i++) {
        if (i !== 14 && i !== 15) setBuild(building, i, cy, BUILD.ROAD);
      }
      for (j = cy - 3; j <= cy + 3; j++) {
        setBuild(building, 12, j, BUILD.ROAD);
        setBuild(building, 17, j, BUILD.ROAD);
      }
      setBuild(building, 11, cy - 1, BUILD.HUT);
      setBuild(building, 11, cy + 1, BUILD.HUT);
      setBuild(building, 18, cy - 1, BUILD.FIELD);
      setBuild(building, 18, cy + 1, BUILD.WHOLESALER);
      setBuild(building, 10, cy, BUILD.PARK); // 园圃紧挨两屋，不占干道
      return;
    }

    // 平畴乡（默认）
    for (j = 0; j < ROWS; j++) {
      terrain[j][COLS - 1] = TERRAIN.WATER;
      if (j % 3 === 0) terrain[j][COLS - 2] = TERRAIN.WATER;
    }
    for (j = 12; j < 18; j++) {
      for (i = 6; i < 12; i++) terrain[j][i] = TERRAIN.DIRT;
    }
    cx = 14; cy = 14;
    for (i = cx - 3; i <= cx + 3; i++) setBuild(building, i, cy, BUILD.ROAD);
    for (j = cy - 3; j <= cy + 3; j++) setBuild(building, cx, j, BUILD.ROAD);
    setBuild(building, cx - 1, cy - 1, BUILD.ROAD);
    setBuild(building, cx + 1, cy - 1, BUILD.ROAD);
    setBuild(building, cx - 1, cy + 1, BUILD.ROAD);
    setBuild(building, cx + 1, cy + 1, BUILD.ROAD);
    setBuild(building, cx - 2, cy - 1, BUILD.HUT);
    setBuild(building, cx - 2, cy + 1, BUILD.HUT);
    setBuild(building, cx + 2, cy - 1, BUILD.FIELD);
    setBuild(building, cx + 2, cy + 1, BUILD.WHOLESALER);
    setBuild(building, cx - 4, cy, BUILD.PARK); // 园圃在干道西侧邻格，两屋可到
  }

  // ---------- 状态 ----------
  function createInitialState(mapId) {
    mapId = mapId || 'pingyuan';
    if (!MAP_DEFS[mapId]) mapId = 'pingyuan';
    var mapDef = MAP_DEFS[mapId];
    var terrain = [];
    var building = [];
    var fieldStage = [];
    var i, j;
    for (j = 0; j < ROWS; j++) {
      terrain[j] = [];
      building[j] = [];
      fieldStage[j] = [];
      for (i = 0; i < COLS; i++) {
        terrain[j][i] = TERRAIN.GRASS;
        building[j][i] = BUILD.NONE;
        fieldStage[j][i] = 0;
      }
    }

    applyMapLayout(terrain, building, mapId);

    var shopLevel = [];
    var visitCount = [];
    var roadLevel = [];
    for (j = 0; j < ROWS; j++) {
      shopLevel[j] = [];
      visitCount[j] = [];
      roadLevel[j] = [];
      for (i = 0; i < COLS; i++) {
        shopLevel[j][i] = 1;
        visitCount[j][i] = 0;
        roadLevel[j][i] = building[j][i] === BUILD.ROAD ? 1 : 0;
      }
    }

    return {
      mapId: mapId,
      terrain: terrain,
      building: building,
      fieldStage: fieldStage,
      shopLevel: shopLevel,
      visitCount: visitCount,
      roadLevel: roadLevel,
      constructing: {}, // "x,y" -> { type, t }
      gold: mapDef.gold,
      prestige: mapDef.prestige,
      research: 4,
      rp: { food: 10, war: 0, tech: 2, edu: 2 },
      cityAttr: { food: 10, war: 0, tech: 2, edu: 2 },
      researching: null,
      unlocked: {
        well: false, tea: false, rice: false, inn: false, stable: false,
        school: false, bath: false, firehouse: false, tree: false, cherry: false, pond: false, cloth: false,
        castle: false, road_wood: false, road_gravel: false, road_brick: false, road_stone: false
      },
      year: 1,
      month: 1,
      week: 1,
      speed: 1,
      paused: false,
      selectedBuild: null,
      cameraX: 0,
      cameraY: 0,
      cameraZoom: 1,
      residents: [],
      toast: null,
      toastTimer: 0,
      comboActive: false,
      comboAnnounced: false,
      activeCombos: {},
      blockCombos: {},
      comboEver: {},
      craftDiscovered: [],
      craftStock: [],
      craftBuffs: {},
      buildingCraft: {},
      pendingCraftEquip: null,
      traveler: null,
      nationalRank: 50,
      rankUnlocked: {},
      rankPaidYear: 0,
      taxPaidYear: 0,
      vacantTimers: {},
      weekAcc: 0,
      floatTexts: [],
      maintAcc: 0,
      autoSaveAcc: 0
    };
  }

  function setBuild(grid, x, y, v) {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return;
    grid[y][x] = v;
  }

  function inBounds(x, y) {
    return x >= 0 && y >= 0 && x < COLS && y < ROWS;
  }

  function isRoad(state, x, y) {
    return inBounds(x, y) && state.building[y][x] === BUILD.ROAD;
  }

  /** 道路 4 邻接 mask：N=1 E=2 S=4 W=8（接缝边无草） */
  function roadMask(state, x, y) {
    var m = 0;
    if (isRoad(state, x, y - 1)) m |= 1;
    if (isRoad(state, x + 1, y)) m |= 2;
    if (isRoad(state, x, y + 1)) m |= 4;
    if (isRoad(state, x - 1, y)) m |= 8;
    return m;
  }

  function adjacentToRoad(state, x, y) {
    for (var d = 0; d < 4; d++) {
      var nx = x + DIRS[d][0], ny = y + DIRS[d][1];
      if (isRoad(state, nx, ny)) return true;
    }
    return false;
  }

  function canPlace(state, type, x, y, opts) {
    opts = opts || {};
    if (!inBounds(x, y)) return false;
    if (state.terrain[y][x] === TERRAIN.WATER) return false;
    if (state.constructing && state.constructing[key(x, y)]) return false;
    if (type === BUILD.ROAD) {
      var wantLv = opts.roadLevel || 1;
      if (!canUseRoadLevel(state, wantLv)) return false;
      var cur = state.building[y][x];
      if (cur === BUILD.NONE) return true;
      if (cur === BUILD.ROAD) return getRoadLevel(state, x, y) < wantLv;
      return false;
    }
    if (state.building[y][x] !== BUILD.NONE) return false;
    if (!canBuildUnlocked(state, type, opts)) return false;
    if (type === BUILD.CASTLE && !canBuildCastle(state)) return false;
    return adjacentToRoad(state, x, y);
  }

  /** 放置/拆除模式下该格是否可确认执行 */
  function canConfirmPlaceAction(state, placeMode, x, y) {
    if (!inBounds(x, y)) return false;
    if (placeMode === 'demolish') {
      if (state.constructing && state.constructing[key(x, y)]) return true;
      var b = state.building[y][x];
      return b !== BUILD.NONE && b !== BUILD.CASTLE;
    }
    if (placeMode && typeof placeMode === 'object' && placeMode.type === BUILD.ROAD) {
      return canPlace(state, BUILD.ROAD, x, y, { roadLevel: placeMode.roadLevel || 1 });
    }
    if (typeof placeMode === 'number') return canPlace(state, placeMode, x, y);
    return false;
  }

  function isComboShop(type) {
    return isShopType(type);
  }

  function shopPrice(state, type, x, y) {
    var meta = BUILD_META[type];
    if (!meta || meta.priceMax <= 0) return 0;
    var p = meta.priceMin + Math.random() * (meta.priceMax - meta.priceMin + 0.99);
    p = Math.floor(p);
    var lv = 1;
    if (x != null && y != null && state.shopLevel[y]) lv = state.shopLevel[y][x] || 1;
    p = Math.floor(p * (1 + (lv - 1) * 0.08));
    var cb = (x != null && y != null) ? comboBonusAt(state, x, y, 'price') : comboBonusForType(state, type, 'price');
    if (cb > 0) p = Math.floor(p * (1 + cb));
    return Math.max(1, p);
  }

  function buildingYield(state, type, x, y) {
    var meta = BUILD_META[type];
    if (!meta) return 0;
    var yld = meta.yield || 0;
    if (x != null && y != null) {
      var lv = (state.shopLevel[y] && state.shopLevel[y][x]) || 1;
      yld = Math.floor(yld * (1 + (lv - 1) * 0.12));
      var cb = comboBonusAt(state, x, y, 'yield');
      if (cb > 0) yld = Math.floor(yld * (1 + cb));
      if (state.buildingCraft && state.buildingCraft[key(x, y)]) {
        yld += state.buildingCraft[key(x, y)].yieldBonus || 0;
      }
    } else {
      var cb0 = comboBonusForType(state, type, 'yield');
      if (cb0 > 0) yld = Math.floor(yld * (1 + cb0));
    }
    if (state.craftBuffs && state.craftBuffs.yield) yld = Math.floor(yld * (1 + state.craftBuffs.yield));
    if (type === BUILD.CASTLE) {
      yld = Math.floor(yld * castleMutualMul(state));
    } else if (x != null && y != null && nearCastle(state, x, y)) {
      yld = Math.floor(yld * CASTLE_YIELD_MUL);
    }
    return yld;
  }

  function recalcPrestige(state) {
    var total = 40;
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        var b = state.building[y][x];
        if (b === BUILD.NONE || b === BUILD.ROAD) continue;
        if (isHouse(b)) {
          total += b === BUILD.HUT ? 25 : (b === BUILD.THATCHED ? 40 : 60);
          if (nearCastle(state, x, y)) total += 8;
          continue;
        }
        var yld = buildingYield(state, b, x, y);
        var lv = (state.shopLevel[y] && state.shopLevel[y][x]) || 1;
        if (isShopType(b) || b === BUILD.FIELD || b === BUILD.WHOLESALER || b === BUILD.CASTLE ||
            isLandscape(b) || isFacilityVisit(b)) {
          total += Math.floor(yld * (0.85 + lv * 0.15));
        } else {
          total += yld;
        }
      }
    }
    // 住民声望贡献（职业/四维，对齐原作「人抬石高」）
    for (var ri = 0; ri < (state.residents || []).length; ri++) {
      var rr = state.residents[ri];
      var st = rr.stats || { int: 1, loy: 1, apl: 1, skl: 1 };
      var jobW = rr.job === 'warrior' ? 18 : (rr.job === 'merchant' ? 12 : (rr.job === 'artisan' ? 11 : 9));
      total += jobW + Math.floor((st.int + st.loy + st.apl + st.skl) * 0.08);
    }
    state.prestige = total;
  }

  function placeBuilding(state, type, x, y, opts) {
    opts = opts || {};
    var meta = BUILD_META[type];
    if (!meta) return false;
    var roadLv = opts.roadLevel || 1;
    if (type === BUILD.ROAD) {
      if (!canUseRoadLevel(state, roadLv)) {
        showToast(state, '尚未研究解锁：' + (ROAD_LEVEL_NAMES[roadLv] || '高级道路'));
        return false;
      }
      var cost = ROAD_LEVEL_COST[roadLv] || meta.cost;
      if (state.gold < cost) {
        showToast(state, '金币不足');
        return false;
      }
      if (!canPlace(state, type, x, y, { roadLevel: roadLv })) {
        showToast(state, roadLv > 1 ? '仅可升级已有道路或空地铺路' : '不可铺路');
        return false;
      }
      state.gold -= cost;
      addFloat(state, x, y, '-' + cost + '金', '#FFEB3B');
      state.building[y][x] = BUILD.ROAD;
      setRoadLevel(state, x, y, roadLv);
      showToast(state, '已铺' + (ROAD_LEVEL_NAMES[roadLv] || '路'), 0.7);
      playSfx('place');
      return true;
    }
    if (!canBuildUnlocked(state, type)) {
      if (meta.rankUnlock) showToast(state, '需全国排名达标后解锁');
      else showToast(state, '尚未研究解锁：' + meta.name);
      return false;
    }
    if (type === BUILD.CASTLE) {
      var hint = castleBuildHint(state);
      if (hint) {
        showToast(state, hint);
        return false;
      }
    }
    if (state.gold < meta.cost) {
      showToast(state, '金币不足');
      return false;
    }
    if (!canPlace(state, type, x, y)) {
      showToast(state, '需邻接道路（路可任意铺在陆地）');
      return false;
    }
    state.gold -= meta.cost;
    addFloat(state, x, y, '-' + meta.cost + '金', '#FFEB3B');
    state.constructing[key(x, y)] = { type: type, t: type === BUILD.CASTLE ? 1.6 : 0.85 };
    showToast(state, '施工中…', 0.7);
    playSfx('place');
    return true;
  }

  function finishConstruct(state, x, y, type, meta) {
    meta = meta || {};
    state.building[y][x] = type;
    if (meta.houseUpgrade && meta.houseUpgrade.nextLv) {
      if (!state.shopLevel[y]) state.shopLevel[y] = [];
      state.shopLevel[y][x] = meta.houseUpgrade.nextLv;
      var resUp = residentAtHomeCell(state, x, y);
      if (resUp) resUp.satisfaction = Math.min(100, (resUp.satisfaction || 60) + 4);
      showToast(state, buildingName(type) + ' 改建完成 · Lv' + meta.houseUpgrade.nextLv, 1.2);
      addFloat(state, x, y, '宅升' + meta.houseUpgrade.nextLv, '#FFE082');
      checkCombo(state);
      recalcPrestige(state);
      return;
    }
    if (type === BUILD.VACANT) {
      showToast(state, '宅基落成！满魅力后每4周可迁入', 1.0);
    }
    if (type === BUILD.FIELD) state.fieldStage[y][x] = 0;
    if (isHouse(type) || isShopType(type) || type === BUILD.WHOLESALER || type === BUILD.FIELD ||
        type === BUILD.PARK || type === BUILD.WELL || type === BUILD.CASTLE ||
        isLandscape(type) || isFacilityVisit(type)) {
      if (!meta.houseUpgrade) {
        if (!state.shopLevel[y]) state.shopLevel[y] = [];
        if (state.shopLevel[y][x] == null || state.shopLevel[y][x] < 1) state.shopLevel[y][x] = 1;
        if (!state.visitCount) state.visitCount = [];
        if (!state.visitCount[y]) state.visitCount[y] = [];
        if (state.visitCount[y][x] == null) state.visitCount[y][x] = 0;
      }
    }
    if (meta.immigrantJob) {
      var spawned = createImmigrantAt(state, { x: x, y: y, kind: 'house' }, meta.immigrantJob);
      if (spawned) {
        var fee = meta.fee != null ? meta.fee : migrationFee(state);
        state.gold += fee;
        showToast(state, '新居落成！' + jobLabel(meta.immigrantJob) + '迁入（安家费+' + fee + '）', 1.3);
        addFloat(state, x, y, '+' + jobLabel(meta.immigrantJob), '#AED581');
      }
    }
    if (type === BUILD.CASTLE) {
      var cc = castleCount(state);
      showToast(state, '★ 州城落成（' + cc + '/' + MAX_CASTLE + '）！辐射加成 · 可转职');
    } else if (type === BUILD.INN) {
      showToast(state, '客栈开张！客旅将来访', 1.2);
    } else if (type === BUILD.STABLE) {
      showToast(state, '马厩落成！住民可购驴马扩步行', 1.2);
    }
    checkCombo(state);
    recalcPrestige(state);
    if (!meta.immigrantJob && !meta.houseUpgrade &&
        type !== BUILD.CASTLE && type !== BUILD.INN && type !== BUILD.STABLE && type !== BUILD.VACANT) {
      showToast(state, '落成：' + ((BUILD_META[type] && BUILD_META[type].name) || buildingName(type)), 0.9);
    }
  }

  function tickConstructing(state, dt) {
    var keys = Object.keys(state.constructing);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var c = state.constructing[k];
      c.t -= dt;
      if (c.t <= 0) {
        var parts = k.split(',');
        finishConstruct(state, +parts[0], +parts[1], c.type, c);
        delete state.constructing[k];
      }
    }
  }

  function demolishAt(state, x, y) {
    if (!inBounds(x, y)) return false;
    if (state.constructing[key(x, y)]) {
      delete state.constructing[key(x, y)];
      showToast(state, '已取消施工');
      return true;
    }
    var b = state.building[y][x];
    if (b === BUILD.NONE) {
      showToast(state, '这里没有可拆建筑');
      return false;
    }
    if (b === BUILD.CASTLE) {
      showToast(state, '州城不可拆除');
      return false;
    }
    if (isHouse(b)) {
      // 拆除住房：清住民，勿动其他格子的田/建筑
      state.residents = state.residents.filter(function (r) {
        return !(r.homeX === x && r.homeY === y);
      });
    }
    var hadCraft = !!(state.buildingCraft && state.buildingCraft[key(x, y)]);
    var refund = BUILD_META[b] ? Math.floor(BUILD_META[b].cost * 0.3) : 5;
    if (isHouse(b)) refund = b === BUILD.TILE_HOUSE ? 40 : (b === BUILD.THATCHED ? 25 : 15);
    state.building[y][x] = BUILD.NONE;
    // 仅清理本格附属数据；田地的 fieldStage 只在拆田时清零，绝不影响邻格
    if (b === BUILD.FIELD && state.fieldStage[y]) state.fieldStage[y][x] = 0;
    if (state.shopLevel[y]) state.shopLevel[y][x] = 1;
    if (state.visitCount && state.visitCount[y]) state.visitCount[y][x] = 0;
    if (state.roadLevel && state.roadLevel[y]) state.roadLevel[y][x] = 0;
    if (state.buildingCraft) delete state.buildingCraft[key(x, y)];
    delete state.vacantTimers[key(x, y)];
    state.gold += refund;
    syncAllResidentHomes(state);
    checkCombo(state);
    recalcPrestige(state);
    showToast(state, '已拆除（退回 ' + refund + ' 金币）' + (hadCraft ? ' · 挂载工巧已毁' : ''));
    playSfx('demolish');
    return true;
  }

  function buildingName(b) {
    if (b === BUILD.HUT) return '茅棚';
    if (b === BUILD.THATCHED) return '草屋';
    if (b === BUILD.TILE_HOUSE) return '瓦屋';
    if (b === BUILD.ROAD) return '土路';
    if (b === BUILD.CASTLE) return '州城';
    return (BUILD_META[b] && BUILD_META[b].name) || '建筑';
  }

  function showToast(state, msg, duration) {
    state.toast = msg;
    state.toastTimer = duration != null ? duration : 1.1;
  }

  // ---------- S5 音频桩（WebAudio 蜂鸣；无文件也可响） ----------
  var audioMuted = false;
  var audioCtx = null;
  function ensureAudioCtx() {
    if (audioCtx) return audioCtx;
    try {
      var AC = typeof AudioContext !== 'undefined' ? AudioContext
        : (typeof webkitAudioContext !== 'undefined' ? webkitAudioContext : null);
      if (!AC) return null;
      audioCtx = new AC();
    } catch (e) { audioCtx = null; }
    return audioCtx;
  }
  function setAudioMuted(m) { audioMuted = !!m; }
  function isAudioMuted() { return audioMuted; }
  function playSfx(name) {
    if (audioMuted) return;
    var ctx = ensureAudioCtx();
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
      var now = ctx.currentTime;
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      var freq = 440, dur = 0.08, type = 'square';
      if (name === 'click') { freq = 520; dur = 0.05; }
      else if (name === 'place') { freq = 360; dur = 0.1; type = 'triangle'; }
      else if (name === 'demolish') { freq = 180; dur = 0.12; type = 'sawtooth'; }
      else if (name === 'combo') { freq = 660; dur = 0.18; type = 'triangle'; }
      else if (name === 'tax') { freq = 480; dur = 0.22; type = 'sine'; }
      else if (name === 'rank') { freq = 300; dur = 0.25; type = 'triangle'; }
      else if (name === 'error') { freq = 140; dur = 0.14; type = 'sawtooth'; }
      o.type = type;
      o.frequency.setValueAtTime(freq, now);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      o.start(now);
      o.stop(now + dur + 0.02);
    } catch (e2) {}
  }

  function queueReport(state, report) {
    state.pendingReport = report;
  }

  function addFloat(state, gx, gy, text, color) {
    var w = gridCellCenter(gx, gy);
    state.floatTexts.push({
      x: w.x,
      y: w.y - ISO_H * 0.5,
      text: text,
      color: color || '#FFF',
      life: 1.0
    });
  }

  // ---------- 坊巷 ----------
  function findBuildings(state, type) {
    var list = [];
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        if (state.building[y][x] === type) list.push({ x: x, y: y });
      }
    }
    return list;
  }

  function checkCombo(state) {
    if (!state.activeCombos) state.activeCombos = {};
    if (!state.comboEver) state.comboEver = {};
    var anyWas = state.comboActive;
    var anyNow = false;
    var nextActive = {};
    var blockCombos = {};
    var bxMax = Math.ceil(COLS / COMBO_BLOCK);
    var byMax = Math.ceil(ROWS / COMBO_BLOCK);
    for (var by = 0; by < byMax; by++) {
      for (var bx = 0; bx < bxMax; bx++) {
        var present = {};
        for (var y = by * COMBO_BLOCK; y < by * COMBO_BLOCK + COMBO_BLOCK && y < ROWS; y++) {
          for (var x = bx * COMBO_BLOCK; x < bx * COMBO_BLOCK + COMBO_BLOCK && x < COLS; x++) {
            var bb = state.building[y][x];
            if (bb && bb !== BUILD.NONE && bb !== BUILD.ROAD) present[bb] = true;
          }
        }
        var bk = bx + ',' + by;
        for (var ci = 0; ci < COMBO_DEFS.length; ci++) {
          var def = COMBO_DEFS[ci];
          var ok = true;
          for (var ti = 0; ti < def.types.length; ti++) {
            if (!present[def.types[ti]]) { ok = false; break; }
          }
          if (!ok) continue;
          nextActive[def.id] = true;
          anyNow = true;
          if (!blockCombos[bk]) blockCombos[bk] = {};
          blockCombos[bk][def.id] = true;
        }
      }
    }
    for (var cj = 0; cj < COMBO_DEFS.length; cj++) {
      var d2 = COMBO_DEFS[cj];
      var was = !!state.activeCombos[d2.id];
      var now = !!nextActive[d2.id];
      state.activeCombos[d2.id] = now;
      if (now && !was) {
        showToast(state, '★ 坊巷成立：' + d2.name + '！区块俸禄×' + Math.floor((1 + d2.yield) * 100) / 100, 1.4);
        for (var ri = 0; ri < state.residents.length; ri++) state.residents[ri].celebrateT = 2.2;
        playSfx('combo');
        if (!state.comboEver[d2.id]) {
          state.comboEver[d2.id] = true;
          addRp(state, 'edu', 3);
          addRp(state, 'food', 2);
          showToast(state, d2.name + '首次成立 · 研策奖励', 1.0);
        }
      } else if (!now && was) {
        showToast(state, d2.name + '解散', 0.9);
      }
    }
    state.blockCombos = blockCombos;
    state.comboActive = anyNow;
    if (anyNow && !anyWas) state.comboAnnounced = true;
    recalcPrestige(state);
  }

  // ---------- 住民（一人一屋 · 步行上限 / 职业工作点 / 钱包） ----------
  function gameWeekIndex(state) {
    return (state.year - 1) * 48 + (state.month - 1) * 4 + (state.week - 1);
  }

  function averageSatisfaction(state) {
    if (!state.residents.length) return 65;
    var sum = 0;
    for (var i = 0; i < state.residents.length; i++) {
      ensureResidentFields(state.residents[i]);
      sum += state.residents[i].satisfaction;
    }
    return sum / state.residents.length;
  }

  /** 城市魅力：景观/澡堂/学塾等（简单模式迁入需 ≥10） */
  function getCityCharm(state) {
    var charm = 2;
    charm += findBuildings(state, BUILD.BATH).length * 10;
    charm += findBuildings(state, BUILD.HOT_SPRING).length * 14;
    charm += findBuildings(state, BUILD.PARK).length * 6;
    charm += findBuildings(state, BUILD.SCHOOL).length * 5;
    charm += findBuildings(state, BUILD.TREE).length * 3;
    charm += findBuildings(state, BUILD.CHERRY).length * 4;
    charm += findBuildings(state, BUILD.POND).length * 4;
    charm += findBuildings(state, BUILD.WELL).length * 2;
    charm += findBuildings(state, BUILD.BUDDHA).length * 5;
    if (state.comboActive) charm += 6;
    return charm;
  }

  function countShopBuildings(state) {
    var n = 0;
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        if (isShopType(state.building[y][x])) n++;
      }
    }
    return n;
  }

  function listHomes(state) {
    return findBuildings(state, BUILD.HUT)
      .concat(findBuildings(state, BUILD.THATCHED))
      .concat(findBuildings(state, BUILD.TILE_HOUSE));
  }

  /** 可迁入空位：空住房 + 连通道路的宅基（文档 2.1 / 2.2） */
  function listVacantHousingSlots(state) {
    var slots = [];
    var taken = {};
    for (var i = 0; i < state.residents.length; i++) {
      var r = state.residents[i];
      taken[key(r.homeX, r.homeY)] = true;
    }
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        if (taken[key(x, y)]) continue;
        if (state.constructing && state.constructing[key(x, y)]) continue;
        var b = state.building[y][x];
        if (!isHouse(b) && b !== BUILD.VACANT) continue;
        if (!adjacentToRoad(state, x, y)) continue;
        slots.push({ x: x, y: y, kind: isHouse(b) ? 'house' : 'vacant' });
      }
    }
    return slots;
  }

  function getPopulationSoftCap(state) {
    return MIG_POP_CAP_MAX;
  }

  function canImmigrate(state) {
    var idx = gameWeekIndex(state);
    // 简单模式：每 4 周判定一次；第 4/8/12… 周末
    if (idx <= 0 || idx % MIG_INTERVAL_WEEKS !== 0) return false;
    if (!listVacantHousingSlots(state).length) return false;
    if (getCityCharm(state) < MIG_CHARM_MIN) return false;
    if (state.residents.length >= getPopulationSoftCap(state)) return false;
    return true;
  }

  function pickImmigrantJob(state) {
    var prest = state.prestige || 0;
    var fields = findBuildings(state, BUILD.FIELD).length;
    var whole = findBuildings(state, BUILD.WHOLESALER).length;
    var shops = countShopBuildings(state);
    var castles = castleCount(state);
    var w;

    // 简单模式石高门槛：0–300 农；300–800+匠；800–2000+商；2000–5000+武；5000+幕
    if (prest < 300) {
      w = { farmer: 90, artisan: 10, merchant: 0, warrior: 0, retainer: 0 };
    } else if (prest < 800) {
      w = { farmer: 50, artisan: 30, merchant: 20, warrior: 0, retainer: 0 };
    } else if (prest < 2000) {
      w = { farmer: 20, artisan: 25, merchant: 25, warrior: 25, retainer: 0 };
    } else if (prest < 5000) {
      w = { farmer: 20, artisan: 25, merchant: 25, warrior: 25, retainer: 5 };
    } else {
      w = { farmer: 15, artisan: 22, merchant: 23, warrior: 25, retainer: 15 };
    }

    // 建筑自适应加权
    if (fields > 0) w.farmer += fields * 4;
    else w.farmer = Math.max(0, w.farmer - 20);
    if (whole > 0) w.artisan += whole * 6;
    if (shops > 0) w.merchant += shops * 4;
    else w.merchant = Math.floor(w.merchant * 0.4);
    if (castles > 0) {
      w.warrior += castles * 5;
      if (prest >= 5000) w.retainer += castles * 3;
    } else {
      w.warrior = 0;
      w.retainer = 0;
    }
    if (!hasCastle(state)) { w.warrior = 0; w.retainer = 0; }
    if (prest < 2000) w.warrior = 0;
    if (prest < 5000) w.retainer = 0;

    var total = w.farmer + w.artisan + w.merchant + w.warrior + w.retainer;
    if (total <= 0) return 'farmer';
    var roll = Math.random() * total;
    var acc = 0;
    var jobs = ['farmer', 'artisan', 'merchant', 'warrior', 'retainer'];
    for (var ji = 0; ji < jobs.length; ji++) {
      acc += w[jobs[ji]];
      if (roll < acc) return jobs[ji];
    }
    return 'farmer';
  }

  function jobColor(job) {
    if (job === 'farmer') return '#5D4037';
    if (job === 'artisan') return '#6A1B9A';
    if (job === 'merchant') return '#1565C0';
    if (job === 'warrior') return '#C62828';
    if (job === 'retainer') return '#455A64';
    return '#5D4037';
  }

  /** 随机四维：0–100 */
  function rollImmigrantStats(prest) {
    var boost = Math.min(15, Math.floor((prest || 0) / 80));
    return {
      int: clamp(10 + ((Math.random() * 16) | 0) + boost, 0, 100),
      loy: clamp(30 + ((Math.random() * 21) | 0) + Math.floor(boost / 2), 0, 100),
      apl: clamp(10 + ((Math.random() * 16) | 0) + boost, 0, 100),
      skl: clamp(10 + ((Math.random() * 16) | 0) + boost, 0, 100)
    };
  }

  /** 该住民每周对城市俸禄贡献（面板展示） */
  function residentWeeklyYield(state, r) {
    ensureResidentFields(r);
    var jl = Math.max(1, jobLevelOf(r, r.job) || 1);
    var base = r.job === 'retainer' ? 18 : (r.job === 'warrior' ? 14 : (r.job === 'merchant' ? 11 : (r.job === 'artisan' ? 10 : 8)));
    var loyMul = 0.7 + (r.stats.loy || 40) / 200;
    return Math.max(1, Math.floor(base * jl * loyMul));
  }

  function createImmigrantAt(state, slot, job) {
    if (!slot || !inBounds(slot.x, slot.y)) return null;
    if (residentAtHomeCell(state, slot.x, slot.y)) return null;
    var b = state.building[slot.y][slot.x];
    if (!isHouse(b)) return null;

    var prest = state.prestige || 40;
    var walk0 = 9 + ((Math.random() * 6) | 0);
    var idx = 0;
    for (var i = 0; i < state.residents.length; i++) {
      if ((state.residents[i].id | 0) >= idx) idx = (state.residents[i].id | 0) + 1;
    }
    var jl = { farmer: 0, artisan: 0, merchant: 0, warrior: 0, retainer: 0 };
    jl[job] = 1;
    var road = nearestRoadTo(state, slot.x, slot.y);
    var r = {
      id: idx,
      x: slot.x + 0.5,
      y: slot.y + 0.5,
      homeX: slot.x,
      homeY: slot.y,
      job: job,
      wallet: 0,
      walkRange: walk0,
      baseWalk: walk0,
      vehicle: null,
      satisfaction: 60,
      _unhappyWeeks: 0,
      _forceFarmWeeks: job === 'farmer' ? 1 : 0,
      jobLevels: jl,
      jobExp: { farmer: 0, artisan: 0, merchant: 0, warrior: 0, retainer: 0 },
      ageYears: 0,
      stats: rollImmigrantStats(prest),
      target: null,
      path: [],
      pathIdx: 0,
      state: 'idle',
      wait: 1.2,
      inside: true,
      indoorCell: { x: slot.x, y: slot.y },
      workPose: null,
      animT: 0,
      facing: 1,
      color: jobColor(job)
    };
    ensureResidentFields(r);
    // 出生点在屋内；出门后由 exitIndoor 落到邻路，避免在草地上生成
    if (road) { /* keep inside until idle exits */ }
    state.residents.push(r);
    return r;
  }

  /** 迁入：先施工建房/安家，完工后再生成住民 */
  function queueImmigrantHousing(state, slot, job) {
    if (!slot || !inBounds(slot.x, slot.y)) return false;
    var k = key(slot.x, slot.y);
    if (state.constructing && state.constructing[k]) return false;
    if (residentAtHomeCell(state, slot.x, slot.y)) return false;
    var b = state.building[slot.y][slot.x];
    if (!isHouse(b) && b !== BUILD.VACANT) return false;
    var fee = migrationFee(state);
    state.constructing[k] = {
      type: isHouse(b) ? b : BUILD.HUT,
      t: 1.6,
      immigrantJob: job,
      fee: fee
    };
    addFloat(state, slot.x, slot.y, '建房', '#FFE082');
    return true;
  }

  /** 开局：固定 2 名 Lv1 农民 */
  function fillInitialResidents(state) {
    syncAllResidentHomes(state);
    var homes = listHomes(state);
    var need = 2;
    for (var si = 0; si < homes.length && state.residents.length < need; si++) {
      var h = homes[si];
      if (residentAtHomeCell(state, h.x, h.y)) continue;
      var r = createImmigrantAt(state, { x: h.x, y: h.y, kind: 'house' }, 'farmer');
      if (r) {
        r.wallet = 0;
        r.satisfaction = 60;
        r._forceFarmWeeks = 1;
        r._stats100 = true;
        r.stats = rollImmigrantStats(state.prestige || 100);
      }
    }
  }

  /** 简单模式：每 4 周末尾迁入判定（固定周期，非随机） */
  function processWeeklyImmigration(state) {
    if (!canImmigrate(state)) return 0;
    var slots = listVacantHousingSlots(state);
    if (!slots.length) return 0;

    var prest = state.prestige || 0;
    var capLeft = getPopulationSoftCap(state) - state.residents.length;
    if (capLeft <= 0) return 0;

    var maxAdd = 1;
    if (prest >= 800 && prest <= 2000) maxAdd = 1 + ((Math.random() < 0.5) ? 1 : 0);
    if (prest > 2000) maxAdd = 2;
    maxAdd = Math.min(maxAdd, slots.length, capLeft);

    for (var si = slots.length - 1; si > 0; si--) {
      var sj = (Math.random() * (si + 1)) | 0;
      var tmp = slots[si];
      slots[si] = slots[sj];
      slots[sj] = tmp;
    }

    var added = 0;
    for (var i = 0; i < maxAdd; i++) {
      var slot = slots[i];
      if (!slot) continue;
      var job = pickImmigrantJob(state);
      if (queueImmigrantHousing(state, slot, job)) added++;
    }
    if (added > 0) {
      showToast(state, '新住民安家施工×' + added + '（完工后入住）', 1.2);
      recalcPrestige(state);
    }
    return added;
  }

  function spawnResidents(state) {
    fillInitialResidents(state);
  }

  function neighborsRoad(state, x, y) {
    var out = [];
    for (var d = 0; d < 4; d++) {
      var nx = x + DIRS[d][0], ny = y + DIRS[d][1];
      if (isRoad(state, nx, ny)) out.push({ x: nx, y: ny });
    }
    return out;
  }

  function bfsPath(state, sx, sy, gx, gy) {
    if (!isRoad(state, sx, sy) || !isRoad(state, gx, gy)) return [];
    var q = [{ x: sx, y: sy }];
    var prev = {};
    prev[key(sx, sy)] = null;
    var qi = 0;
    while (qi < q.length) {
      var cur = q[qi++];
      if (cur.x === gx && cur.y === gy) break;
      var nbs = neighborsRoad(state, cur.x, cur.y);
      for (var i = 0; i < nbs.length; i++) {
        var n = nbs[i];
        var k = key(n.x, n.y);
        if (prev[k] === undefined) {
          prev[k] = cur;
          q.push(n);
        }
      }
    }
    if (prev[key(gx, gy)] === undefined && !(sx === gx && sy === gy)) return [];
    var path = [];
    var c = { x: gx, y: gy };
    while (c) {
      path.push(c);
      c = prev[key(c.x, c.y)];
    }
    path.reverse();
    return path;
  }

  function nearestRoadTo(state, x, y) {
    if (isRoad(state, x, y)) return { x: x, y: y };
    for (var d = 0; d < 4; d++) {
      var nx = x + DIRS[d][0], ny = y + DIRS[d][1];
      if (isRoad(state, nx, ny)) return { x: nx, y: ny };
    }
    var best = null, bestD = 999;
    for (var j = 0; j < ROWS; j++) {
      for (var i = 0; i < COLS; i++) {
        if (!isRoad(state, i, j)) continue;
        var dd = Math.abs(i - x) + Math.abs(j - y);
        if (dd < bestD) { bestD = dd; best = { x: i, y: j }; }
      }
    }
    return best;
  }

  /** 从家出发沿路到目标的格数；不可达返回 999 */
  function pathLenFromHome(state, r, gx, gy) {
    var start = nearestRoadTo(state, r.homeX, r.homeY);
    var end = nearestRoadTo(state, gx, gy);
    if (!start || !end) return 999;
    var path = bfsPath(state, start.x, start.y, end.x, end.y);
    if (!path.length) return 999;
    return Math.max(0, path.length - 1);
  }

  function canReachFromHome(state, r, gx, gy) {
    return pathLenFromHome(state, r, gx, gy) <= r.walkRange;
  }

  function filterReachable(state, r, list) {
    var out = [];
    for (var i = 0; i < list.length; i++) {
      if (canReachFromHome(state, r, list[i].x, list[i].y)) out.push(list[i]);
    }
    return out;
  }

  function jobLabel(job) {
    if (job === 'farmer') return '农夫';
    if (job === 'artisan') return '匠人';
    if (job === 'merchant') return '商贾';
    if (job === 'warrior') return '甲士';
    if (job === 'retainer') return '幕僚';
    return job;
  }

  var OUTING_ACTIONS_MAX = 3; // 每次出门最多访问 3 座建筑（铁律）

  function beginOuting(r) {
    ensureResidentFields(r);
    r._outingActive = true;
    r._outingActionsLeft = OUTING_ACTIONS_MAX;
    r._outingVisited = {};
    r._outingActionKeyed = {};
    r.goHomeNext = false;
    r._parkCommitKey = null;
  }

  function endOuting(r) {
    r._outingActive = false;
    r._outingActionsLeft = 0;
    r._outingVisited = {};
    r._outingActionKeyed = {};
    r.goHomeNext = false;
    r._parkCommitKey = null;
  }

  function outingActionsLeft(r) {
    if (!r || r._outingActionsLeft == null) return OUTING_ACTIONS_MAX;
    return r._outingActionsLeft;
  }

  function isOutingVisited(r, x, y) {
    if (!r || x == null || y == null) return false;
    return !!(r._outingVisited && r._outingVisited[key(x, y)]);
  }

  /** 本趟外出已交互过该建筑格（同格不可再访，直到下次出门） */
  function markOutingVisited(r, x, y) {
    if (!r || x == null || y == null) return false;
    if (!r._outingVisited) r._outingVisited = {};
    var k = key(x, y);
    if (r._outingVisited[k]) return false;
    r._outingVisited[k] = true;
    return true;
  }

  function filterUnvisitedOuting(r, list) {
    var out = [];
    for (var i = 0; i < list.length; i++) {
      if (!isOutingVisited(r, list[i].x, list[i].y)) out.push(list[i]);
    }
    return out;
  }

  /** 本次外出还可访问的可达建筑（同建筑不重复） */
  function listOutingCandidates(state, r) {
    ensureResidentFields(r);
    applyRoadWalkBonus(state, r);
    var all = []
      .concat(workBuildingsForJob(state, r))
      .concat(findBuildings(state, BUILD.NOODLE))
      .concat(findBuildings(state, BUILD.WONTON))
      .concat(findBuildings(state, BUILD.HOTPOT))
      .concat(findBuildings(state, BUILD.TEA))
      .concat(findBuildings(state, BUILD.RICE))
      .concat(findBuildings(state, BUILD.CLOTH))
      .concat(findBuildings(state, BUILD.PARK))
      .concat(findBuildings(state, BUILD.TREE))
      .concat(findBuildings(state, BUILD.CHERRY))
      .concat(findBuildings(state, BUILD.POND))
      .concat(findBuildings(state, BUILD.BUDDHA))
      .concat(findBuildings(state, BUILD.INN))
      .concat(findBuildings(state, BUILD.STABLE))
      .concat(findBuildings(state, BUILD.HOT_SPRING))
      .concat(findBuildings(state, BUILD.BATH))
      .concat(findBuildings(state, BUILD.SCHOOL))
      .concat(findBuildings(state, BUILD.ARENA))
      .concat(findBuildings(state, BUILD.FIREHOUSE))
      .concat(findBuildings(state, BUILD.WELL));
    // 去重
    var seen = {};
    var uniq = [];
    for (var i = 0; i < all.length; i++) {
      var c = all[i];
      var k = key(c.x, c.y);
      if (seen[k]) continue;
      seen[k] = true;
      uniq.push(c);
    }
    return filterUnvisitedOuting(r, filterReachable(state, r, uniq));
  }

  function hasOutingCandidates(state, r) {
    return listOutingCandidates(state, r).length > 0;
  }

  /** 完成一次建筑访问后结算行动次数；用尽或无可达未访目标则标记回家 */
  function afterOutingAction(state, r, x, y) {
    markOutingVisited(r, x, y);
    if (!r._outingActionKeyed) r._outingActionKeyed = {};
    var ak = key(x, y);
    // 同一建筑本趟只扣 1 次行动（到达时可能已 mark，此处保证只扣一次）
    if (!r._outingActionKeyed[ak]) {
      r._outingActionKeyed[ak] = true;
      r._outingActionsLeft = Math.max(0, outingActionsLeft(r) - 1);
    }
    if (outingActionsLeft(r) <= 0 || !hasOutingCandidates(state, r)) {
      r.goHomeNext = true;
    } else {
      r.goHomeNext = false;
    }
  }

  function residentById(state, id) {
    for (var i = 0; i < state.residents.length; i++) {
      if (state.residents[i].id === id) return state.residents[i];
    }
    return null;
  }

  function ensureParkSlots(state) {
    if (!state.parkSlots) state.parkSlots = {};
  }

  /** 取消居民对庭院的「本回合选定」（改去别处 / 回家时） */
  function clearResidentParkCommit(state, r) {
    if (!r || !state.parkSlots) return;
    var rid = r.id;
    r._parkCommitKey = null;
    Object.keys(state.parkSlots).forEach(function (k) {
      var slot = state.parkSlots[k];
      if (!slot) return;
      slot.selectors = (slot.selectors || []).filter(function (id) { return id !== rid; });
      if (slot.arrived) delete slot.arrived[rid];
      if (slot.pair && !slot.chatDone && (slot.pair[0] === rid || slot.pair[1] === rid)) {
        slot.pair = null; // 配对未完成聊天即解散 → 剩余人按单人到访
      }
    });
  }

  /**
   * 选定访问庭院（园圃）：登记意向；真正配对在双方都到场等候时完成。
   */
  function commitParkSelect(state, r, gx, gy) {
    if (!inBounds(gx, gy) || state.building[gy][gx] !== BUILD.PARK) return;
    ensureParkSlots(state);
    clearResidentParkCommit(state, r);
    var k = key(gx, gy);
    var slot = state.parkSlots[k];
    // 上一波已聊完 → 开新回合槽（每庭院每回合最多 1 次聊天）
    if (!slot || slot.chatDone) {
      slot = { selectors: [], arrived: {}, pair: null, chatDone: false };
      state.parkSlots[k] = slot;
    }
    if (slot.selectors.indexOf(r.id) < 0) slot.selectors.push(r.id);
    r._parkCommitKey = k;
  }

  function residentsWaitingAtPark(state, gx, gy) {
    var out = [];
    for (var i = 0; i < state.residents.length; i++) {
      var o = state.residents[i];
      if (!o || !o._parkWaiting || !o._parkWaitCell) continue;
      if (o._parkWaitCell.x === gx && o._parkWaitCell.y === gy) out.push(o);
    }
    return out;
  }

  function markParkArrived(state, r, gx, gy) {
    ensureParkSlots(state);
    var k = key(gx, gy);
    var slot = state.parkSlots[k];
    if (!slot || slot.chatDone) {
      slot = { selectors: [], arrived: {}, pair: null, chatDone: false };
      state.parkSlots[k] = slot;
    }
    if (slot.selectors.indexOf(r.id) < 0) slot.selectors.push(r.id);
    if (!slot.arrived) slot.arrived = {};
    slot.arrived[r.id] = true;
  }

  /** 两人同时在园圃等候 → 结对并尝试聊天 */
  function tryPairParkWaiters(state, gx, gy) {
    ensureParkSlots(state);
    var slot = state.parkSlots[key(gx, gy)];
    if (!slot || slot.chatDone) return;
    var waiters = residentsWaitingAtPark(state, gx, gy);
    if (waiters.length < 2) return;
    if (!slot.pair) {
      slot.pair = [waiters[0].id, waiters[1].id];
    }
    tryResolveParkChat(state, gx, gy);
  }

  /** 庭院聊天：科技点（全局 0～3）+ 两人各自独立属性判定；交谈后双方再停留一会 */
  function rollParkChatResidentStat(state, r, gx, gy) {
    ensureResidentFields(r);
    if (Math.random() < 0.40) return; // 完全不变
    var keys = ['int', 'loy', 'apl', 'skl'];
    var names = { int: '知惠', loy: '忠诚', apl: '魅力', skl: '才能' };
    var sk = keys[(Math.random() * 4) | 0];
    var delta = Math.random() < 0.72 ? 1 : -1;
    bumpStat(r, sk, delta);
    addFloat(state, gx, gy, (r.name || '') + names[sk] + (delta > 0 ? '+' : '') + delta,
      delta > 0 ? '#A5D6A7' : '#EF9A9A');
  }

  function applyParkChatRewards(state, a, b, gx, gy) {
    addFloat(state, gx, gy, '交谈', '#FFE082');
    // 四项科技随机 1 项；+0/+1/+2/+3（多数 +1，可能 0）
    var rpRoll = Math.random();
    var amt = 0;
    if (rpRoll < 0.12) amt = 0;
    else if (rpRoll < 0.72) amt = 1;
    else if (rpRoll < 0.93) amt = 2;
    else amt = 3;
    if (amt > 0) {
      var cats = ['food', 'war', 'tech', 'edu'];
      var cat = cats[(Math.random() * 4) | 0];
      addRp(state, cat, amt);
      var labels = { food: '食品', war: '武力', tech: '技术', edu: '学问' };
      addFloat(state, gx, gy - 14, labels[cat] + '+' + amt, '#90CAF9');
    } else {
      addFloat(state, gx, gy - 14, '闲谈无获', '#B0BEC5');
    }
    rollParkChatResidentStat(state, a, gx, gy);
    rollParkChatResidentStat(state, b, gx, gy - 12);
    a.celebrateT = Math.max(a.celebrateT || 0, PARK_CHAT_LINGER);
    b.celebrateT = Math.max(b.celebrateT || 0, PARK_CHAT_LINGER);
    // 交谈过程：双方在格内分站位停留，不要立刻离开、也不要叠成一人
    claimTileSlot(state, a, gx, gy);
    claimTileSlot(state, b, gx, gy);
    if (a._tileSlot === b._tileSlot) {
      b._tileSlot = (a._tileSlot + 1) % TILE_SLOT_OFFSETS.length;
    }
    [a, b].forEach(function (p) {
      p._parkWaiting = true;
      p._parkChatting = true;
      p._parkWaitCell = { x: gx, y: gy };
      p.interactMode = 'on_tile';
      p.inside = false;
      p.state = 'idle';
      p.wait = PARK_CHAT_LINGER;
      var pos = tileStandPos(gx, gy, p._tileSlot);
      p.x = pos.x;
      p.y = pos.y;
    });
  }

  function tryResolveParkChat(state, gx, gy) {
    var slot = state.parkSlots && state.parkSlots[key(gx, gy)];
    if (!slot || slot.chatDone) return;
    if (!slot.pair || slot.pair.length < 2) return;
    var a = residentById(state, slot.pair[0]);
    var b = residentById(state, slot.pair[1]);
    if (!a || !b) return;
    if (!slot.arrived[a.id] || !slot.arrived[b.id]) return;
    // 双方须仍在园圃等候中
    if (!a._parkWaiting || !b._parkWaiting) return;
    applyParkChatRewards(state, a, b, gx, gy);
    slot.chatDone = true;
  }

  /** 结束园圃停留：退到邻路；未聊成则清理等候登记 */
  function endParkStay(state, r) {
    var cell = r._parkWaitCell;
    var wasChatting = !!r._parkChatting;
    r._parkWaiting = false;
    r._parkChatting = false;
    r._parkCommitKey = null;
    if (cell) {
      var k = key(cell.x, cell.y);
      var slot = state.parkSlots && state.parkSlots[k];
      if (slot && !wasChatting) {
        if (slot.arrived) delete slot.arrived[r.id];
        slot.selectors = (slot.selectors || []).filter(function (id) { return id !== r.id; });
        if (slot.pair && !slot.chatDone && (slot.pair[0] === r.id || slot.pair[1] === r.id)) {
          slot.pair = null;
        }
        addFloat(state, cell.x, cell.y, '园圃一览', '#A5D6A7');
      }
      r.target = { x: cell.x, y: cell.y };
    }
    r._parkWaitCell = null;
    leaveOnTileStay(state, r);
    r.target = null;
    r.targetKind = null;
  }

  /** 优先去「已有人在园圃等候」的园圃，提高碰面率 */
  function preferParkForMeetup(state, r, parks) {
    if (!parks || !parks.length) return null;
    var scored = [];
    for (var i = 0; i < parks.length; i++) {
      var p = parks[i];
      if (state.building[p.y][p.x] !== BUILD.PARK) continue;
      var score = Math.random() * 0.2;
      var slot = state.parkSlots && state.parkSlots[key(p.x, p.y)];
      var waiters = residentsWaitingAtPark(state, p.x, p.y);
      if (waiters.length === 1) score += 6; // 有人在等，去配对
      else if (waiters.length >= 2 || (slot && slot.chatDone)) score -= 3;
      if (slot && !slot.chatDone) {
        if (slot.selectors && slot.selectors.length === 1) score += 2;
      }
      for (var j = 0; j < state.residents.length; j++) {
        var o = state.residents[j];
        if (!o || o.id === r.id) continue;
        if (o._parkCommitKey === key(p.x, p.y)) score += 3.5;
        if (o.targetKind === 'park' && o.target && o.target.x === p.x && o.target.y === p.y) score += 2;
      }
      scored.push({ p: p, score: score });
    }
    if (!scored.length) return parks[0];
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored[0].p;
  }

  function pickHomeTarget(r) {
    return { cell: { x: r.homeX, y: r.homeY }, kind: 'home' };
  }

  function atHome(r) {
    return Math.abs(r.x - (r.homeX + 0.5)) < 0.55 && Math.abs(r.y - (r.homeY + 0.5)) < 0.55;
  }

  function canGoHome(state, r) {
    return pathLenFromHome(state, r, r.homeX, r.homeY) <= r.walkRange;
  }

  function pickTargetFor(state, r) {
    ensureResidentFields(r);
    applyRoadWalkBonus(state, r);
    if (!r._outingActive && !r.inside && !r._homeResting) beginOuting(r);

    var workList = filterUnvisitedOuting(r, filterReachable(state, r, workBuildingsForJob(state, r)));
    var shops = filterUnvisitedOuting(r, filterReachable(state, r, []
      .concat(findBuildings(state, BUILD.NOODLE))
      .concat(findBuildings(state, BUILD.WONTON))
      .concat(findBuildings(state, BUILD.HOTPOT))
      .concat(findBuildings(state, BUILD.TEA))
      .concat(findBuildings(state, BUILD.RICE))
      .concat(findBuildings(state, BUILD.CLOTH))));
    var parks = filterUnvisitedOuting(r, filterReachable(state, r, findBuildings(state, BUILD.PARK)));
    var landscapes = filterUnvisitedOuting(r, filterReachable(state, r, []
      .concat(findBuildings(state, BUILD.TREE))
      .concat(findBuildings(state, BUILD.CHERRY))
      .concat(findBuildings(state, BUILD.POND))
      .concat(findBuildings(state, BUILD.BUDDHA))));
    var inns = filterUnvisitedOuting(r, filterReachable(state, r, findBuildings(state, BUILD.INN)));
    var stables = filterUnvisitedOuting(r, filterReachable(state, r, findBuildings(state, BUILD.STABLE)));
    var springs = filterUnvisitedOuting(r, filterReachable(state, r, findBuildings(state, BUILD.HOT_SPRING)));
    var baths = filterUnvisitedOuting(r, filterReachable(state, r, findBuildings(state, BUILD.BATH)));
    var schools = filterUnvisitedOuting(r, filterReachable(state, r, findBuildings(state, BUILD.SCHOOL)));
    var arenas = filterUnvisitedOuting(r, filterReachable(state, r, findBuildings(state, BUILD.ARENA)));
    var fires = filterUnvisitedOuting(r, filterReachable(state, r, findBuildings(state, BUILD.FIREHOUSE)));

    var broke = r.wallet < WALLET_BROKE;
    var comfortable = r.wallet >= WALLET_COMFORT;
    var roll = Math.random();
    var taxPrep = state.month === 3 || (state.month === 4 && state.week <= 2);

    // —— 外出铁律：行动用尽 / 强制回家 / 无可达未访建筑 → 回家 ——
    if (r.goHomeNext && !r.inside && !r._homeResting) {
      if (atHome(r) || ((r._homeCooldown || 0) <= 0 && canGoHome(state, r))) {
        return pickHomeTarget(r);
      }
      if ((r._homeCooldown || 0) > 0) return null;
      r.goHomeNext = false;
    }
    if (outingActionsLeft(r) <= 0 && !r.inside && !r._homeResting) {
      r.goHomeNext = true;
      return pickHomeTarget(r);
    }
    if (!hasOutingCandidates(state, r) && !r.inside && !r._homeResting) {
      r.goHomeNext = true;
      return pickHomeTarget(r);
    }

    // 买驴（无白马/轿车时）
    if (r.vehicle !== VEHICLE_DONKEY && r.vehicle !== VEHICLE_HORSE && r.vehicle !== VEHICLE_CAR &&
        stables.length && r.wallet >= DONKEY_COST && roll < 0.2) {
      return { cell: stables[(Math.random() * stables.length) | 0], kind: 'stable' };
    }
    if (state.traveler && inns.length && roll < 0.18) {
      return { cell: inns[(Math.random() * inns.length) | 0], kind: 'inn' };
    }

    var forceWork = broke || taxPrep || (r._forceFarmWeeks > 0);
    if (r.job === 'farmer' && r.wallet > 0 && !(r._forceFarmWeeks > 0) && !taxPrep) {
      forceWork = false;
    } else if (comfortable && !taxPrep && r.job !== 'farmer' && !(r._forceFarmWeeks > 0)) {
      forceWork = false;
    }
    if (r.job === 'farmer' && r.wallet > 0 && !(r._forceFarmWeeks > 0) && !broke) {
      forceWork = false;
    }

    if (forceWork || broke) {
      if (workList.length) {
        if (r.job === 'farmer') {
          var waterPick = pickFarmerWaterTarget(state, r, workList);
          if (waterPick) return waterPick;
          var fieldJobs = farmerFieldWorkList(state, r, workList);
          if (fieldJobs.length) return { cell: fieldJobs[(Math.random() * fieldJobs.length) | 0], kind: 'work' };
          return { cell: workList[(Math.random() * workList.length) | 0], kind: 'work' };
        }
        var wcell = workList[(Math.random() * workList.length) | 0];
        var wb = state.building[wcell.y][wcell.x];
        if (r.job === 'merchant' && isShopType(wb)) {
          return { cell: wcell, kind: 'merchant_work' };
        }
        return { cell: wcell, kind: 'work' };
      }
      if (parks.length) {
        return { cell: preferParkForMeetup(state, r, parks) || parks[0], kind: 'park' };
      }
      if (landscapes.length) {
        return { cell: landscapes[(Math.random() * landscapes.length) | 0], kind: 'park' };
      }
      r.goHomeNext = true;
      return pickHomeTarget(r);
    }

    // 有钱：闲逛优先；园圃（庭院）提高同回合配对权重
    var leisure = leisureChanceByJob(r);
    if (parks.length && Math.random() < 0.55 * leisure) {
      return { cell: preferParkForMeetup(state, r, parks) || parks[(Math.random() * parks.length) | 0], kind: 'park' };
    }
    if (baths.length && Math.random() < 0.22 * leisure) {
      return { cell: baths[(Math.random() * baths.length) | 0], kind: 'leisure' };
    }
    if (schools.length && Math.random() < 0.18 * leisure) {
      return { cell: schools[(Math.random() * schools.length) | 0], kind: 'leisure' };
    }
    if (springs.length && roll < 0.12) {
      return { cell: springs[(Math.random() * springs.length) | 0], kind: 'leisure' };
    }
    if (arenas.length && Math.random() < 0.1) {
      return { cell: arenas[(Math.random() * arenas.length) | 0], kind: 'leisure' };
    }
    if (fires.length && Math.random() < 0.08) {
      return { cell: fires[(Math.random() * fires.length) | 0], kind: 'leisure' };
    }
    if (shops.length && Math.random() < consumeChanceByJob(r) * leisure) {
      return { cell: shops[(Math.random() * shops.length) | 0], kind: 'shop' };
    }
    if (r.job === 'artisan' && workList.length && Math.random() < 0.55) {
      return { cell: workList[(Math.random() * workList.length) | 0], kind: 'work' };
    }
    if (workList.length && Math.random() < (1 - leisure) * 0.5) {
      return { cell: workList[(Math.random() * workList.length) | 0], kind: 'work' };
    }
    if (shops.length) return { cell: shops[(Math.random() * shops.length) | 0], kind: 'shop' };
    if (parks.length) {
      return { cell: preferParkForMeetup(state, r, parks) || parks[0], kind: 'park' };
    }
    if (landscapes.length) {
      return { cell: landscapes[(Math.random() * landscapes.length) | 0], kind: 'park' };
    }
    if (workList.length) return { cell: workList[(Math.random() * workList.length) | 0], kind: 'work' };
    r.goHomeNext = true;
    return pickHomeTarget(r);
  }

  function assignTarget(state, r) {
    ensureResidentHomeBuilding(state, r);
    if (r._homeResting) return;
    if (r.inside) exitIndoorIdle(state, r);
    var pick = pickTargetFor(state, r);
    // 冷却中绝不进家；保留 goHomeNext，等冷却结束再回家
    if (pick && pick.kind === 'home' && (r._homeCooldown || 0) > 0) {
      pick = null;
    }
    // 本趟已交互过的建筑绝不二次派工（除非回家）
    if (pick && pick.kind !== 'home' && pick.cell && isOutingVisited(r, pick.cell.x, pick.cell.y)) {
      markOutingVisited(r, pick.cell.x, pick.cell.y); // 确保在册
      if (!hasOutingCandidates(state, r)) {
        r.goHomeNext = true;
        pick = pickHomeTarget(r);
        if ((r._homeCooldown || 0) > 0) pick = null;
      } else {
        pick = null; // 短等后重选未访建筑
      }
    }
    if (!pick) {
      r.state = 'idle';
      // 有回家义务时短等冷却；否则正常等待下一拍
      r.wait = (r.goHomeNext ? 0.35 : 1.2) + Math.random() * 0.4;
      r.inside = false;
      r.standPoint = null;
      ensureOffBuilding(state, r);
      // 真的没活干才记「工作太远」（不是在等回家）
      if (!r.goHomeNext && r.wallet < 12) {
        r._tooFarThisWeek = true;
        if (Math.random() < 0.35) addFloat(state, r.homeX, r.homeY, '工作太远…', '#EF9A9A');
      }
      return;
    }
    var goal = pick.cell;
    // 出门后必须站在道路上再寻路，禁止从草地斜穿
    var start = nearestRoadTo(state, Math.floor(r.x), Math.floor(r.y));
    if (!start) start = nearestRoadTo(state, r.homeX, r.homeY);
    var end = nearestRoadTo(state, goal.x, goal.y);
    if (!start || !end) {
      r.state = 'idle';
      r.wait = 1;
      r.inside = false;
      r.standPoint = null;
      ensureOffBuilding(state, r);
      return;
    }
    if (Math.abs(r.x - (start.x + 0.5)) > 0.35 || Math.abs(r.y - (start.y + 0.5)) > 0.35) {
      r.x = start.x + 0.5;
      r.y = start.y + 0.5;
    }
    var path = bfsPath(state, start.x, start.y, end.x, end.y);
    if (path.length < 1) {
      r.state = 'idle';
      r.wait = 1;
      r.inside = false;
      r.standPoint = null;
      ensureOffBuilding(state, r);
      return;
    }
    // 已站在路径首格时跳过，避免「原地迈第一步」卡死
    if (path.length > 1) {
      var p0 = path[0];
      if (Math.abs(r.x - (p0.x + 0.5)) < 0.2 && Math.abs(r.y - (p0.y + 0.5)) < 0.2) {
        path = path.slice(1);
      }
    }
    r.path = path;
    r.pathIdx = 0;
    // 庭院选定 / 取消：同回合双人配对看「选定」而非抵达时刻
    clearResidentParkCommit(state, r);
    if (pick.kind === 'park' && state.building[goal.y] && state.building[goal.y][goal.x] === BUILD.PARK) {
      commitParkSelect(state, r, goal.x, goal.y);
    }
    prepareInteraction(state, r, pick);
    r.targetKind = pick.kind;
    r.state = 'walk';
    r.inside = false;
    if (pick.kind !== 'home') r._homeMsgShown = false;
  }

  function finishWork(state, r) {
    var pend = r._workPending;
    var wasHarvest = r.workPose === 'harvest';
    var wasField = !!(pend && pend.b === BUILD.FIELD);
    r._workPending = null;
    r.workPose = null;
    var wasInside = r.interactMode === 'inside';
    r.state = 'idle';
    r.wait = 0.45 + Math.random() * 0.4;
    r.inside = false; // 田地劳作也绝不可保持隐藏
    if (wasInside) {
      r.indoorCell = null;
      if (pend && pend.g) {
        var exit = findAdjacentStandForResident(state, r, pend.g.x, pend.g.y, r.x, r.y);
        r.x = exit.x;
        r.y = exit.y;
      }
    } else if (wasField && pend && pend.g) {
      // 干完田活：离开田格到邻路，避免下一段寻路从田格出发错乱
      var exitF = findAdjacentStandForResident(state, r, pend.g.x, pend.g.y, r.x, r.y);
      r.x = exitF.x;
      r.y = exitF.y;
    }
    ensureOffBuilding(state, r);
    if (!pend) return;
    var b = pend.b;
    var g = pend.g;
    ensureResidentFields(r);
    var jobKey = r.job === 'retainer' ? 'retainer' : (r.job === 'warrior' ? 'warrior' :
      (r.job === 'artisan' ? 'artisan' : (r.job === 'merchant' ? 'merchant' : 'farmer')));
    var jlv = Math.max(1, jobLevelOf(r, jobKey) || 1);
    var pay = 8;
    var expAmt = 3;
    if (b === BUILD.FIELD) {
      pay = JOB_FIELD_PAY[jlv] || 10;
      expAmt = JOB_FIELD_EXP[jlv] || 3;
      // 非农夫在田收益衰减 70%
      if (r.job !== 'farmer') pay = Math.max(1, Math.floor(pay * 0.3));
    } else if (b === BUILD.WHOLESALER) {
      pay = JOB_WHOLESALE_PAY[jlv] || 12;
      expAmt = JOB_WHOLESALE_EXP[jlv] || 4;
    } else if (b === BUILD.CASTLE) {
      if (r.job === 'retainer') {
        pay = JOB_CASTLE_RETAINER_PAY[jlv] || 40;
        expAmt = JOB_CASTLE_EXP_R[jlv] || 10;
      } else {
        pay = JOB_CASTLE_WARRIOR_PAY[jlv] || 22;
        expAmt = JOB_CASTLE_EXP_W[jlv] || 6;
      }
    } else {
      pay = Math.floor(10 + jlv * 2);
      expAmt = 3 + jlv;
    }
    var loyMul = 0.7 + Math.min(100, r.stats.loy || 40) / 200;
    pay = Math.max(1, Math.floor(pay * loyMul));
    // 小巷/工艺加成不直接加居民单次工资（文档 3.3）
    var townShare = Math.max(1, Math.floor(pay * 0.12));
    r.wallet += pay;
    state.gold += townShare;
    r._workedThisWeek = true;
    recordBuildingVisit(state, g.x, g.y, r);
    var plen = pathLenFromHome(state, r, g.x, g.y);
    gainJobExp(state, r, jobKey, expAmt, plen);
    if (b === BUILD.FIELD) {
      state.fieldStage[g.y][g.x] = (state.fieldStage[g.y][g.x] + 1) % 4;
      if (pend.waterAtWell) addFloat(state, g.x, g.y, '浇水', '#81D4FA');
    }
    if (b === BUILD.CASTLE) bumpStat(r, 'loy', Math.random() < 0.4 ? 1 : 0);
    if (b === BUILD.WHOLESALER) {
      bumpStat(r, 'skl', Math.random() < 0.35 ? 1 : 0);
      tryDiscoverCraft(state, r, g.x, g.y);
    }
    addFloat(state, g.x, g.y, '钱包+' + pay, '#AED581');
    if (townShare > 0) addFloat(state, g.x, g.y - 14, '镇库+' + townShare, '#FFE082');
    if (pend && pend.b === BUILD.FIELD && wasHarvest) r.carryHarvest = true;
    // 完成本次建筑访问：计入 1 次行动（同格不重复扣）
    afterOutingAction(state, r, g.x, g.y);
    // 挑水时水井也已在到达时登记；此处再确保田地与水井都在已访表中
    if (pend.waterAtWell && pend.well) {
      markOutingVisited(r, pend.well.x, pend.well.y);
    }
  }

  function updateResident(state, r, dt) {
    ensureResidentHomeBuilding(state, r);
    if ((r.celebrateT || 0) > 0) r.celebrateT -= dt;
    if ((r._homeCooldown || 0) > 0) r._homeCooldown = Math.max(0, r._homeCooldown - dt);

    // 行走时绝不可 inside（挑担回家途中须可见）
    if (r.state === 'walk') {
      if (r.inside) r.inside = false;
      if (r._homeResting) r._homeResting = false;
    }

    // 在家休息：仅看 _homeResting，超时必出门
    if (r._homeResting) {
      if (!r.inside) r.inside = true;
      r.x = r.homeX + 0.5;
      r.y = r.homeY + 0.5;
      r.state = 'idle';
      r._homeRestAcc = (r._homeRestAcc || 0) + dt;
      r.wait = (r.wait || 0) - dt;
      if (r.wait <= 0 || r._homeRestAcc > 3.0) {
        wakeFromHomeRest(state, r);
        assignTarget(state, r);
      }
      return;
    }

    // 园圃格内等候 / 交谈停留（按站位偏移钉住，避免多人叠中心）
    if (r.state === 'idle' && r._parkWaiting) {
      if (r._parkWaitCell) {
        if (r._tileSlot == null) claimTileSlot(state, r, r._parkWaitCell.x, r._parkWaitCell.y);
        var ppos = tileStandPos(r._parkWaitCell.x, r._parkWaitCell.y, r._tileSlot);
        r.x = ppos.x;
        r.y = ppos.y;
      }
      r.inside = false;
      r.interactMode = 'on_tile';
      r.animT = (r.animT || 0) + dt * 2;
      r.wait = (r.wait || 0) - dt;
      if (r.wait <= 0) {
        endParkStay(state, r);
        assignTarget(state, r);
      }
      return;
    }

    // 客栈等屋内 idle：等待后出屋（劳作中 inside 由 work 分支处理）
    if (r.inside && r.state === 'idle') {
      r.wait = (r.wait || 0) - dt;
      if (r.wait <= 0) {
        exitIndoorIdle(state, r);
        assignTarget(state, r);
      }
      return;
    }

    // 开放建筑格内停留（景观 / 井 / 温泉等）
    if (r.state === 'idle' && r.interactMode === 'on_tile') {
      if (r.target) {
        if (r._tileSlot == null) claimTileSlot(state, r, r.target.x, r.target.y);
        var tpos = tileStandPos(r.target.x, r.target.y, r._tileSlot);
        r.x = tpos.x;
        r.y = tpos.y;
      }
      r.inside = false;
      r.animT = (r.animT || 0) + dt * 2;
      r.wait = (r.wait || 0) - dt;
      if (r.wait <= 0) {
        leaveOnTileStay(state, r);
        r.target = null;
        r.targetKind = null;
        assignTarget(state, r);
      }
      return;
    }

    if (r.state === 'idle') {
      r.wait -= dt;
      r.animT = 0;
      r._stuckT = 0;
      if (r.wait <= 0) {
        if (atHome(r) && state.building[r.homeY] && isHouse(state.building[r.homeY][r.homeX])) {
          // 坐标在宅却未 inside：弹到路上再选目标
          var roadOut = nearestRoadTo(state, r.homeX, r.homeY);
          if (roadOut) { r.x = roadOut.x + 0.5; r.y = roadOut.y + 0.5; }
        }
        r.wait = 0;
        assignTarget(state, r);
      }
      return;
    }
    if (r.state === 'work') {
      r.wait -= dt;
      r.animT = (r.animT || 0) + dt * 8 * (state.speed || 1);
      r._stuckT = 0;
      if (r.wait <= 0) finishWork(state, r);
      return;
    }
    if (r.state === 'walk') {
      r._stuckT = (r._stuckT || 0) + dt;
      // 超时保护：寻路/贴近异常时强制重派，避免原地卡死
      if (r._stuckT > 14) {
        r.path = [];
        r.standPoint = null;
        r.target = null;
        r.targetKind = null;
        r._stuckT = 0;
        r.state = 'idle';
        r.wait = 0.25;
        r.inside = false;
        if (r._parkWaiting) endParkStay(state, r);
        else ensureOffBuilding(state, r);
        assignTarget(state, r);
        return;
      }
      if (r.path && r.pathIdx < r.path.length) {
        var node = r.path[r.pathIdx];
        var tx = node.x + 0.5, ty = node.y + 0.5;
        var sp = 2.2 * (state.speed || 1);
        var dx = tx - r.x, dy = ty - r.y;
        var len = Math.sqrt(dx * dx + dy * dy);
        var step = sp * dt;
        var wdx = (dx - dy);
        if (Math.abs(wdx) > 0.02) r.facing = wdx >= 0 ? 1 : -1;
        r.animT = (r.animT || 0) + dt * 10 * (state.speed || 1);
        // 路径含起点格心：已在点上时 len=0，旧写法 ||1 会导致永远迈不出第一格
        if (len < 0.04 || step >= len) {
          r.x = tx; r.y = ty;
          r.pathIdx++;
        } else {
          r.x += (dx / len) * step;
          r.y += (dy / len) * step;
        }
        return;
      }
      if (r.standPoint) {
        approachStandPoint(state, r, dt);
        return;
      }
      finishVisit(state, r);
      return;
    }
    // 未知状态兜底
    r.state = 'idle';
    r.wait = 0.5;
    r.inside = false;
  }

  function finishVisit(state, r) {
    var g = r.target;
    var kind = r.targetKind || 'shop';
    r.path = [];
    r.pathIdx = 0;

    // 落点到交互格心/邻格
    if (r.standPoint) {
      r.x = r.standPoint.x;
      r.y = r.standPoint.y;
      r.standPoint = null;
    }

    function settleIdle(waitSec) {
      r.state = 'idle';
      r.wait = waitSec != null ? waitSec : (0.55 + Math.random() * 0.4);
      r.workPose = null;
      r.inside = false;
      r.interactMode = 'adjacent';
      r._stuckT = 0;
      ensureOffBuilding(state, r);
    }

    if (!g || g.x == null || g.y == null || !inBounds(g.x, g.y)) {
      settleIdle(0.8);
      return;
    }
    var b = state.building[g.y][g.x];

    function settleVisitStay(waitSec) {
      var dur = waitSec != null ? waitSec : (VISIT_INSIDE_SEC + Math.random() * 0.35);
      if (isOpenInteractBuilding(b) || r.interactMode === 'on_tile') {
        settleOnTileVisit(state, r, g.x, g.y, dur);
      } else {
        settleInsideVisit(r, g.x, g.y, dur);
      }
    }

    if (kind === 'home') {
      ensureResidentHomeBuilding(state, r);
      clearResidentParkCommit(state, r);
      endOuting(r);
      r._homeResting = true;
      r._homeRestAcc = 0;
      r._homeCooldown = 0; // 到家后清冷却，休息完可正常出门
      r.carryHarvest = false;
      r.inside = true;
      r.interactMode = 'inside';
      r.indoorCell = { x: r.homeX, y: r.homeY };
      r.x = r.homeX + 0.5;
      r.y = r.homeY + 0.5;
      r.wait = 2.4;
      r.state = 'idle';
      r.workPose = null;
      r.standPoint = null;
      r.path = [];
      r.pathIdx = 0;
      r._stuckT = 0;
      if (!r._homeMsgShown) {
        addFloat(state, r.homeX, r.homeY, '回家', '#FFE082');
        r._homeMsgShown = true;
      }
      return;
    }

    // —— 铁律：本趟外出同一建筑只交互一次 ——
    // 若误派到已访建筑：不重复结算，直接离开改派
    if (isOutingVisited(r, g.x, g.y)) {
      r.inside = false;
      r.interactMode = 'adjacent';
      r.workPose = null;
      r._workPending = null;
      var exitSkip = findAdjacentStandForResident(state, r, g.x, g.y, r.x, r.y);
      r.x = exitSkip.x;
      r.y = exitSkip.y;
      r.target = null;
      r.targetKind = null;
      r.state = 'idle';
      r.wait = 0.15;
      if (!hasOutingCandidates(state, r) || outingActionsLeft(r) <= 0) {
        r.goHomeNext = true;
      }
      return;
    }
    // 到达即登记，防止劳作/停留期间再次选中同一格
    markOutingVisited(r, g.x, g.y);

    if (kind === 'water') {
      var wf = r._workField;
      r._workField = null;
      if (wf && inBounds(wf.x, wf.y) && state.building[wf.y][wf.x] === BUILD.FIELD) {
        // 挑水：水井与目标农田本趟均记为已交互
        markOutingVisited(r, wf.x, wf.y);
        r.state = 'work';
        r.wait = 1.6;
        r.inside = false;
        r.interactMode = 'on_tile';
        r.x = g.x + 0.5;
        r.y = g.y + 0.5;
        r.workPose = 'water';
        r._workPending = { b: BUILD.FIELD, g: wf, waterAtWell: true, well: { x: g.x, y: g.y } };
        addFloat(state, g.x, g.y, '挑水', '#81D4FA');
        return;
      }
      // 无田地目标时退化为饮水
      afterOutingAction(state, r, g.x, g.y);
      bumpStat(r, 'loy', 1);
      onTravelerVisitBuilding(state, BUILD.WELL);
      addFloat(state, g.x, g.y, '饮水', '#81D4FA');
      settleOnTileVisit(state, r, g.x, g.y, VISIT_ONTILE_SEC + Math.random() * 0.3);
      return;
    }

    if (kind === 'work' || b === BUILD.FIELD || b === BUILD.WHOLESALER || b === BUILD.CASTLE) {
      if (b === BUILD.NONE) {
        settleIdle(0.6);
        return;
      }
      r.state = 'work';
      r.wait = 1.6;
      r.workPose = r.workPoseHint || 'carry';
      // 田地：格内劳作，必须可见；封闭工作建筑：进屋隐藏
      if (b === BUILD.FIELD || r.interactMode === 'on_tile') {
        r.interactMode = 'on_tile';
        r.inside = false;
        r.indoorCell = null;
        r.x = g.x + 0.5;
        r.y = g.y + 0.5;
      } else {
        r.interactMode = 'inside';
        r.inside = true;
        r.indoorCell = { x: g.x, y: g.y };
        r.x = g.x + 0.5;
        r.y = g.y + 0.5;
      }
      r._workPending = { b: b, g: g };
      if (r.interactMode === 'on_tile') {
        addFloat(state, g.x, g.y, r.workPose === 'plow' ? '耕地' : (r.workPose === 'harvest' ? '收割' : '浇水'), '#AED581');
      } else {
        addFloat(state, g.x, g.y, '上工', '#FFE082');
      }
      return;
    }

    if (b === BUILD.INN) {
      onTravelerVisitBuilding(state, BUILD.INN);
      bumpStat(r, 'apl', 1);
      addFloat(state, g.x, g.y, '住店', '#FFCC80');
      afterOutingAction(state, r, g.x, g.y);
      settleInsideVisit(r, g.x, g.y, VISIT_INSIDE_SEC + 0.4 + Math.random() * 0.4);
      return;
    }

    if (b === BUILD.STABLE) {
      tryBuyDonkey(state, r);
      afterOutingAction(state, r, g.x, g.y);
      settleInsideVisit(r, g.x, g.y, VISIT_INSIDE_SEC + Math.random() * 0.3);
      return;
    }

    if (b === BUILD.HOT_SPRING || b === BUILD.ARENA || b === BUILD.SCHOOL ||
        b === BUILD.BATH || b === BUILD.FIREHOUSE || kind === 'leisure') {
      ensureResidentFields(r);
      var metaF = BUILD_META[b];
      if (metaF && metaF.stat) {
        bumpStat(r, metaF.stat, metaF.statDelta != null ? metaF.statDelta : 1);
      } else {
        bumpStat(r, 'loy', 1);
      }
      if (b === BUILD.SCHOOL) {
        bumpStat(r, 'int', 1);
        addRp(state, 'edu', 1 + ((Math.random() * 2) | 0));
        addFloat(state, g.x, g.y, '求学', '#FFF59D');
      } else if (b === BUILD.BATH) {
        r.satisfaction = Math.min(100, (r.satisfaction || 60) + 10);
        addFloat(state, g.x, g.y, '沐浴', '#81D4FA');
      } else if (b === BUILD.FIREHOUSE) {
        bumpStat(r, 'loy', 1);
        addRp(state, 'war', 1);
        addFloat(state, g.x, g.y, '巡防', '#FFAB91');
      } else if (b === BUILD.HOT_SPRING || b === BUILD.ARENA) {
        r.satisfaction = Math.min(100, (r.satisfaction || 60) + 8);
        bumpStat(r, 'apl', Math.random() < 0.5 ? 1 : 0);
        addFloat(state, g.x, g.y, '舒畅', '#81D4FA');
      } else {
        addRp(state, Math.random() < 0.5 ? 'war' : 'edu', 1);
        addFloat(state, g.x, g.y, '游览', '#81C784');
      }
      if (metaF && metaF.cityAttr && Math.random() < 0.45) addRp(state, metaF.cityAttr, 1);
      recordBuildingVisit(state, g.x, g.y, r);
      onTravelerVisitBuilding(state, b);
      afterOutingAction(state, r, g.x, g.y);
      settleVisitStay(VISIT_INSIDE_SEC + 0.25 + Math.random() * 0.4);
      return;
    }

    if (kind === 'merchant_work' && isShopType(b)) {
      // 商贾在商铺「工作」：进钱包，激活店级，不视为消费
      ensureResidentFields(r);
      var mpay = 8 + jobLevelOf(r, 'merchant') * 3 + ((Math.random() * 5) | 0);
      r.wallet += mpay;
      r._workedThisWeek = true;
      recordBuildingVisit(state, g.x, g.y, r);
      gainJobExp(state, r, 'merchant', 7, pathLenFromHome(state, r, g.x, g.y));
      onTravelerVisitBuilding(state, b);
      addFloat(state, g.x, g.y, '商作+' + mpay, '#AED581');
      afterOutingAction(state, r, g.x, g.y);
      settleInsideVisit(r, g.x, g.y, VISIT_INSIDE_SEC + Math.random() * 0.35);
      return;
    }

    if (isShopType(b) || kind === 'shop') {
      // 消费：扣钱包；商人按职业等级定额，其它沿用店物价
      ensureResidentFields(r);
      var mlv = Math.max(1, jobLevelOf(r, 'merchant') || 1);
      var price = r.job === 'merchant'
        ? (JOB_SHOP_SPEND[mlv] || 8)
        : shopPrice(state, b, g.x, g.y);
      if (r.job === 'farmer') price = Math.max(1, Math.floor(price * 0.45));
      if (r.job === 'artisan') price = Math.max(1, Math.floor(price * 0.5));
      if (r.wallet >= price) {
        r.wallet -= price;
        r._shoppedThisWeek = true;
        recordBuildingVisit(state, g.x, g.y, r);
        var meta = BUILD_META[b];
        if (meta && meta.stat) {
          var dlt = meta.statDelta != null ? meta.statDelta : 1;
          bumpStat(r, meta.stat, dlt);
          if (dlt < 0) addFloat(state, g.x, g.y, meta.stat + dlt, '#EF9A9A');
        }
        if (meta && meta.cityAttr && Math.random() < 0.4) addRp(state, meta.cityAttr, 1);
        onTravelerVisitBuilding(state, b);
        var expJob = r.job === 'merchant' ? 'merchant' : (r.job === 'artisan' ? 'artisan' : 'farmer');
        gainJobExp(state, r, expJob, r.job === 'merchant' ? 4 : 2, pathLenFromHome(state, r, g.x, g.y));
        if (Math.random() < 0.55) {
          var colors = ['food', 'food', 'tech', 'edu', 'war'];
          var col = colors[(Math.random() * colors.length) | 0];
          addRp(state, col, 1);
          addFloat(state, g.x, g.y, '+研策', '#90CAF9');
        }
        addFloat(state, g.x, g.y, '-' + price + '消费', '#FFCC80');
      } else {
        addFloat(state, g.x, g.y, '钱不够', '#EF9A9A');
      }
      afterOutingAction(state, r, g.x, g.y);
      settleInsideVisit(r, g.x, g.y, VISIT_INSIDE_SEC + Math.random() * 0.35);
      return;
    }

    if (b === BUILD.PARK || isLandscape(b) || kind === 'park') {
      // 庭院（园圃）：格内等候最多 6 秒；两人同时在场则交谈并再停留一会
      afterOutingAction(state, r, g.x, g.y);
      recordBuildingVisit(state, g.x, g.y, r);
      if (b === BUILD.PARK) {
        var slotP = state.parkSlots && state.parkSlots[key(g.x, g.y)];
        // 本回合已聊过：第三人只短驻格内
        if (slotP && slotP.chatDone) {
          addFloat(state, g.x, g.y, '园圃一览', '#A5D6A7');
          r._parkCommitKey = null;
          settleOnTileVisit(state, r, g.x, g.y, VISIT_ONTILE_SEC + Math.random() * 0.25);
          return;
        }
        r._parkWaiting = true;
        r._parkChatting = false;
        r._parkWaitCell = { x: g.x, y: g.y };
        r._parkCommitKey = null;
        settleOnTileVisit(state, r, g.x, g.y, PARK_WAIT_SEC);
        markParkArrived(state, r, g.x, g.y);
        tryPairParkWaiters(state, g.x, g.y);
        slotP = state.parkSlots && state.parkSlots[key(g.x, g.y)];
        if (slotP && slotP.chatDone) {
          // 交谈已触发：停留时间由 applyParkChatRewards 设为 PARK_CHAT_LINGER
          addFloat(state, g.x, g.y, '园圃', '#C5E1A5');
        } else {
          addFloat(state, g.x, g.y, '园圃等候', '#C5E1A5');
        }
      } else {
        addFloat(state, g.x, g.y, b === BUILD.BUDDHA ? '礼佛' : '散步', '#A5D6A7');
        settleOnTileVisit(state, r, g.x, g.y, VISIT_ONTILE_SEC + 0.2 + Math.random() * 0.35);
      }
      return;
    }

    if (b === BUILD.WELL) {
      bumpStat(r, 'loy', 1);
      onTravelerVisitBuilding(state, BUILD.WELL);
      addFloat(state, g.x, g.y, '饮水', '#81D4FA');
      afterOutingAction(state, r, g.x, g.y);
      settleOnTileVisit(state, r, g.x, g.y, VISIT_ONTILE_SEC + Math.random() * 0.3);
      return;
    }

    settleVisitStay(VISIT_INSIDE_SEC);
  }

  // ---------- 时间 / 周结算 ----------
  function advanceWeek(state) {
    state.week++;
    if (state.week > 4) {
      state.week = 1;
      state.month++;
      if (state.month > 12) {
        state.month = 1;
        state.year++;
      }
    }

    // 维护费：每月第 1 周结算（原每周扣费导致金币持续流失）
    if (state.week === 1) {
      var maint = 0;
      for (var yy = 0; yy < ROWS; yy++) {
        for (var xx = 0; xx < COLS; xx++) {
          var bb = state.building[yy][xx];
          if (BUILD_META[bb] && BUILD_META[bb].maint) maint += BUILD_META[bb].maint;
        }
      }
      if (maint > 0) {
        var md = mapDefFor(state);
        if (md.maintMul && md.maintMul !== 1) maint = Math.ceil(maint * md.maintMul);
        state.gold = Math.max(0, state.gold - maint);
        state.maintAcc = (state.maintAcc || 0) + maint;
      }
    }

    // 年贡：每年 4 月第 4 周
    if (state.month === 4 && state.week === 4 && state.taxPaidYear < state.year) {
      payTax(state);
    }

    // 全国排名：每年 11 月第 4 周
    if (state.month === 11 && state.week === 4 && state.rankPaidYear < state.year) {
      state.rankPaidYear = state.year;
      state.nationalRank = calcNationalRank(state);
      checkRankRewards(state);
      queueReport(state, {
        kind: 'rank',
        title: '朝廷粮赋公报',
        lines: [
          '第' + state.year + '年冬，朝廷粮赋排位公示。',
          '本城全国排名：第 ' + state.nationalRank + ' 名。',
          '达标可解锁温泉院、擂台、石佛等（见 Toast）。',
          '声望越高，名次越好。'
        ]
      });
      playSfx('rank');
    }

    tickTravelerWeek(state);

    var weekRev = collectWeeklyRevenue(state);
    if (weekRev > 0) {
      addFloat(state, 0, 0, '周税+' + weekRev, '#FFE082');
      if (state.week === 4) showToast(state, '本月商税入库约 +' + weekRev + ' 金/周', 0.9);
    }

    if (state.craftBuffs && state.craftBuffs.yield) {
      state.craftBuffs.yield = Math.max(0, state.craftBuffs.yield - 0.01);
      if (state.craftBuffs.yield < 0.01) delete state.craftBuffs.yield;
    }

    recalcPrestige(state);

    // 周末：满意度 → 静默迁出 → 白马 → 建筑升级 → 迁入
    syncAllResidentHomes(state);
    for (var ri = state.residents.length - 1; ri >= 0; ri--) {
      var rr = state.residents[ri];
      ensureResidentFields(rr);
      if ((rr._forceFarmWeeks || 0) > 0) rr._forceFarmWeeks--;
      updateSatisfactionWeekly(state, rr);
      tryGrantWhiteHorse(state, rr);
      tryGrantCar(state, rr);
      if (tryResidentLeave(state, rr)) {
        var leaveName = rr.name || '居民';
        state.residents.splice(ri, 1);
        // 轻提示：避免误以为「人物 bug 消失」；住宅保留为空床
        showToast(state, leaveName + '因不满意搬走了', 1.4);
      }
    }
    syncAllResidentHomes(state);
    recalcPrestige(state);

    // 文档 1.1：建筑升级后 → 人口迁入判定
    processWeeklyBuildingUpgrades(state);
    processWeeklyImmigration(state);

    // 单槽静默自动存（不弹 Toast）
    try { saveGame(state, null, true); } catch (e) {}
  }

  function collectWeeklyRevenue(state) {
    var rev = 0;
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        var b = state.building[y][x];
        if (b === BUILD.NONE || b === BUILD.ROAD || isHouse(b) || b === BUILD.VACANT) continue;
        var yld = buildingYield(state, b, x, y);
        if (yld <= 0) continue;
        var lv = (state.shopLevel[y] && state.shopLevel[y][x]) || 1;
        // 周税：商店高、田/栈中等，保证日常金库有进账
        var rate = 0.08;
        if (isShopType(b)) rate = 0.06;
        else if (b === BUILD.WHOLESALER || b === BUILD.INN || b === BUILD.STABLE) rate = 0.08;
        else if (b === BUILD.FIELD) rate = 0.07;
        else if (b === BUILD.CASTLE) rate = 0.04;
        else if (b === BUILD.PARK || b === BUILD.WELL) rate = 0.03;
        rev += Math.max(1, Math.floor(yld * rate * (0.75 + lv * 0.12)));
      }
    }
    if (rev <= 0) return 0;
    var md = mapDefFor(state);
    if (md.incomeMul && md.incomeMul !== 1) rev = Math.floor(rev * md.incomeMul);
    state.gold += rev;
    return rev;
  }

  function payTax(state) {
    state.taxPaidYear = state.year;
    var houses = []
      .concat(findBuildings(state, BUILD.HUT))
      .concat(findBuildings(state, BUILD.THATCHED))
      .concat(findBuildings(state, BUILD.TILE_HOUSE));
    var amount = 0;
    // 文档：单套租金 = 城市总俸禄 × 比例（快照）
    var prest = state.prestige || 40;
    for (var i = 0; i < houses.length; i++) {
      var h = houses[i];
      var hb = state.building[h.y][h.x];
      var rate = houseRentRate(hb);
      var rent = Math.floor(prest * rate);
      if (nearCastle(state, h.x, h.y)) rent = Math.floor(rent * (1 + CASTLE_TAX_BONUS));
      amount += rent;
    }
    if (state.comboActive) amount = Math.floor(amount * 1.05);
    if (state.craftBuffs && state.craftBuffs.tax) amount = Math.floor(amount * (1 + state.craftBuffs.tax));
    amount = Math.max(40, amount);
    var md2 = mapDefFor(state);
    if (md2.incomeMul && md2.incomeMul !== 1) amount = Math.floor(amount * md2.incomeMul);
    state.gold += amount;
    queueReport(state, {
      kind: 'tax',
      title: '蜀报 · 四月年贡',
      amount: amount,
      lines: [
        '第' + state.year + '年四月，朝廷征收年贡。',
        '按总俸禄×住房比例结算（茅棚48%/草屋49%/瓦屋50%）。',
        '本次入库 +' + amount + ' 金币。',
        '请善用金库扩建道路与市井。'
      ]
    });
    playSfx('tax');
    showToast(state, '四月年贡入库！+' + amount + ' 金币', 1.2);
  }

  // ---------- 存档 ----------
  var SAVE_KEY = 'dashu_s4_save_v5';
  var SAVE_KEY_LEGACY = 'dashu_s3_save_v4';

  function readStorage(key, storage) {
    try {
      if (storage && storage.getItem) return storage.getItem(key);
      if (typeof wx !== 'undefined' && wx.getStorageSync) return wx.getStorageSync(key);
      if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
    } catch (e) {}
    return null;
  }

  function writeStorage(key, val, storage) {
    if (storage && storage.setItem) storage.setItem(key, val);
    else if (typeof wx !== 'undefined' && wx.setStorageSync) wx.setStorageSync(key, val);
    else if (typeof localStorage !== 'undefined') localStorage.setItem(key, val);
  }

  function loadMeta(storage) {
    try {
      var json = readStorage(META_KEY, storage);
      if (!json) return { v: 1, unlocked: {}, craftDiscovered: [], totalRuns: 0 };
      return typeof json === 'string' ? JSON.parse(json) : json;
    } catch (e) {
      return { v: 1, unlocked: {}, craftDiscovered: [], totalRuns: 0 };
    }
  }

  function mergeMetaFromState(meta, state) {
    meta = meta || { v: 1, unlocked: {}, craftDiscovered: [], totalRuns: 0 };
    if (!meta.unlocked) meta.unlocked = {};
    if (!meta.craftDiscovered) meta.craftDiscovered = [];
    if (state.unlocked) {
      Object.keys(state.unlocked).forEach(function (k) {
        if (state.unlocked[k]) meta.unlocked[k] = true;
      });
    }
    (state.craftDiscovered || []).forEach(function (id) {
      if (meta.craftDiscovered.indexOf(id) < 0) meta.craftDiscovered.push(id);
    });
    return meta;
  }

  function saveMeta(meta, storage) {
    try {
      writeStorage(META_KEY, JSON.stringify(meta), storage);
      return true;
    } catch (e) {
      return false;
    }
  }

  function applyMetaToState(state, meta) {
    if (!meta) return;
    if (meta.unlocked) {
      Object.keys(meta.unlocked).forEach(function (k) {
        if (meta.unlocked[k]) state.unlocked[k] = true;
      });
    }
    if (meta.craftDiscovered) {
      if (!state.craftDiscovered) state.craftDiscovered = [];
      meta.craftDiscovered.forEach(function (id) {
        if (state.craftDiscovered.indexOf(id) < 0) state.craftDiscovered.push(id);
      });
    }
  }

  function serialize(state) {
    return {
      v: 6,
      mapId: state.mapId || 'pingyuan',
      terrain: state.terrain,
      building: state.building,
      fieldStage: state.fieldStage,
      shopLevel: state.shopLevel,
      visitCount: state.visitCount || [],
      roadLevel: state.roadLevel || [],
      gold: state.gold,
      prestige: state.prestige,
      research: state.research,
      rp: state.rp,
      cityAttr: state.cityAttr || { food: 0, war: 0, tech: 0, edu: 0 },
      researching: state.researching || null,
      unlocked: state.unlocked,
      year: state.year,
      month: state.month,
      week: state.week,
      comboActive: state.comboActive,
      comboAnnounced: state.comboAnnounced,
      activeCombos: state.activeCombos || {},
      comboEver: state.comboEver || {},
      craftDiscovered: state.craftDiscovered || [],
      craftStock: state.craftStock || [],
      craftBuffs: state.craftBuffs || {},
      buildingCraft: state.buildingCraft || {},
      traveler: state.traveler,
      nationalRank: state.nationalRank,
      rankUnlocked: state.rankUnlocked || {},
      rankPaidYear: state.rankPaidYear || 0,
      taxPaidYear: state.taxPaidYear,
      vacantTimers: state.vacantTimers,
      residents: state.residents.map(function (r) {
        return {
          id: r.id, name: r.name, x: r.x, y: r.y, homeX: r.homeX, homeY: r.homeY,
          color: r.color, job: r.job, wallet: r.wallet, walkRange: r.walkRange,
          baseWalk: r.baseWalk, vehicle: r.vehicle,
          stats: r.stats, _stats100: true,
          jobLevels: r.jobLevels, jobExp: r.jobExp,
          satisfaction: r.satisfaction, ageYears: r.ageYears,
          bornWarrior: !!r.bornWarrior
        };
      })
    };
  }

  function applySave(state, data) {
    if (!data || (data.v !== 6 && data.v !== 5 && data.v !== 4 && data.v !== 3 && data.v !== 2 && data.v !== 1)) return false;
    if (!data.terrain || !data.terrain.length || data.terrain.length !== ROWS ||
        !data.terrain[0] || data.terrain[0].length !== COLS) {
      // 地图已改为 30×30，旧档尺寸不兼容
      return false;
    }
    state.mapId = data.mapId || 'pingyuan';
    state.terrain = data.terrain;
    state.building = data.building;
    state.fieldStage = data.fieldStage;
    state.shopLevel = data.shopLevel || state.shopLevel;
    if (data.visitCount) {
      state.visitCount = data.visitCount;
    } else {
      state.visitCount = [];
      for (var vy = 0; vy < ROWS; vy++) {
        state.visitCount[vy] = [];
        for (var vx = 0; vx < COLS; vx++) state.visitCount[vy][vx] = 0;
      }
    }
    if (data.roadLevel && data.roadLevel.length === ROWS) {
      state.roadLevel = data.roadLevel;
    } else {
      state.roadLevel = [];
      for (var ry = 0; ry < ROWS; ry++) {
        state.roadLevel[ry] = [];
        for (var rx = 0; rx < COLS; rx++) {
          state.roadLevel[ry][rx] = (state.building[ry] && state.building[ry][rx] === BUILD.ROAD) ? 1 : 0;
        }
      }
    }
    state.gold = data.gold;
    state.prestige = data.prestige;
    state.rp = data.rp || { food: data.research || 0, war: 0, tech: 0, edu: 0 };
    state.cityAttr = data.cityAttr || {
      food: state.rp.food || 0, war: state.rp.war || 0,
      tech: state.rp.tech || 0, edu: state.rp.edu || 0
    };
    state.researching = data.researching || null;
    state.unlocked = data.unlocked || {};
    ['well', 'tea', 'rice', 'inn', 'stable', 'school', 'bath', 'firehouse', 'tree', 'cherry', 'pond', 'cloth',
      'castle', 'road_wood', 'road_gravel', 'road_brick', 'road_stone'].forEach(function (k) {
      if (state.unlocked[k] == null) state.unlocked[k] = false;
    });
    state.research = (state.rp.food || 0) + (state.rp.war || 0) + (state.rp.tech || 0) + (state.rp.edu || 0);
    state.year = data.year;
    state.month = data.month;
    state.week = data.week;
    state.comboActive = !!data.comboActive;
    state.comboAnnounced = !!data.comboAnnounced;
    state.activeCombos = data.activeCombos || {};
    state.comboEver = data.comboEver || {};
    state.blockCombos = {};
    state.craftDiscovered = data.craftDiscovered || [];
    state.craftStock = data.craftStock || [];
    state.craftBuffs = data.craftBuffs || {};
    state.buildingCraft = data.buildingCraft || {};
    state.pendingCraftEquip = null;
    state.traveler = data.traveler || null;
    state.nationalRank = data.nationalRank != null ? data.nationalRank : calcNationalRank(state);
    state.rankUnlocked = data.rankUnlocked || {};
    state.rankPaidYear = data.rankPaidYear || 0;
    state.taxPaidYear = data.taxPaidYear || 0;
    state.vacantTimers = data.vacantTimers || {};
    state.constructing = {};
    state.residents = (data.residents || []).map(function (r, idx) {
      return {
        id: r.id, name: r.name, x: r.x, y: r.y, homeX: r.homeX, homeY: r.homeY,
        color: r.color,
        job: r.job || (idx === 0 ? 'farmer' : 'artisan'),
        wallet: r.wallet != null ? r.wallet : 20,
        walkRange: r.walkRange || 11,
        baseWalk: r.baseWalk != null ? r.baseWalk : (r.walkRange || 11),
        vehicle: r.vehicle || null,
        stats: r.stats || { int: 15, loy: 40, apl: 15, skl: 15 },
        _stats100: !!r._stats100,
        jobLevels: r.jobLevels || null,
        jobExp: r.jobExp || null,
        satisfaction: r.satisfaction != null ? r.satisfaction : null,
        ageYears: r.ageYears != null ? r.ageYears : 0,
        bornWarrior: !!r.bornWarrior,
        target: null, path: [], pathIdx: 0, state: 'idle', wait: 0.5, targetKind: null,
        animT: 0, facing: 1, inside: false, workPose: null
      };
    });
    for (var riSave = 0; riSave < state.residents.length; riSave++) {
      ensureResidentFields(state.residents[riSave]);
    }
    syncAllResidentHomes(state);
    if (state.residents.length < 2) spawnResidents(state);
    state.nationalRank = calcNationalRank(state);
    checkCombo(state);
    recalcPrestige(state);
    return true;
  }

  function saveGame(state, storage, silent) {
    var json = JSON.stringify(serialize(state));
    try {
      writeStorage(SAVE_KEY, json, storage);
      saveMeta(mergeMetaFromState(loadMeta(storage), state), storage);
      if (!silent) showToast(state, '已保存');
      return true;
    } catch (e) {
      if (!silent) showToast(state, '保存失败');
      return false;
    }
  }

  function loadGame(state, storage) {
    try {
      var json = readStorage(SAVE_KEY, storage);
      if (!json) json = readStorage(SAVE_KEY_LEGACY, storage);
      if (!json) { showToast(state, '没有存档'); return false; }
      var data = typeof json === 'string' ? JSON.parse(json) : json;
      if (applySave(state, data)) {
        showToast(state, '读档成功');
        return true;
      }
      showToast(state, '存档不兼容（需30×30新档）');
      return false;
    } catch (e) {}
    showToast(state, '读档失败');
    return false;
  }

  // ---------- 主循环（开罗式菜单操作） ----------
  function createGame(options) {
    options = options || {};
    var canvas = options.canvas;
    var ctx = canvas.getContext('2d');
    var state = createInitialState(options.mapId || 'pingyuan');
    spawnResidents(state);
    var atlas = createSpriteAtlas(options, canvas);

    // UI 状态（S5：教程/报纸；菜单点选；右上菜单/右下返回/左下说明）
    state.ui = {
      menuOpen: false,
      page: 'main',
      placeMode: null,
      hoverCell: null,
      markCell: null,
      menuSelect: null,
      buildTab: 'env', // 建设弹窗：env | shop | fac
      researchScroll: 0,
      _researchPending: null,
      info: null,
      detailOpen: false,
      buildConfirm: null,
      pauseForPopup: false,
      report: null,
      reportOpen: false,
      tutorial: null
    };

    var TUTORIAL_STEPS = [
      { title: '青荷引路', body: '城主好，我是青荷。这座蜀地小城要靠您铺路、招民、开店。点「下一步」开始。' },
      { title: '建设', body: '右上「菜单」→「建设」。点一次选中建筑，再点一次进入放置；地图上先点格标记，再点蓝格确认。' },
      { title: '时间', body: '顶栏可点暂停或切换倍速。系统有静音与重看教程。左下「说明」查看选中项；右下「返回/关闭」退出菜单。' },
      { title: '年贡与排名', body: '每年四月第4周收年贡（报纸结算）；十一月第4周看全国粮赋排名。' },
      { title: '祝顺利', body: '先铺路、放宅基与小店。菜单可随时保存。准备好了就出发吧！' }
    ];

    var dpr = options.dpr || 1;
    var cssW = options.width || 375;
    var cssH = options.height || 667;
    var mapTop = 52;
    var mapBottom = 72;
    var mapH = cssH - mapTop - mapBottom;
    var mapW = cssW;
    var hudBtnH = 44;
    var hudBtnGap = 8;

    function hudMenuRect() {
      // 游戏画面（地图区）内右上角，不进顶栏
      return { x: cssW - 72, y: mapTop + 8, w: 64, h: 38 };
    }
    function hudPauseRect() {
      return { x: cssW - 196, y: 8, w: 52, h: 34 };
    }
    function hudSpeedRect() {
      return { x: cssW - 138, y: 8, w: 58, h: 34 };
    }
    function hudNavRect() {
      return { x: cssW - 78, y: cssH - mapBottom - hudBtnH - hudBtnGap, w: 68, h: hudBtnH };
    }
    function hudExplainRect() {
      return { x: 10, y: cssH - mapBottom - hudBtnH - hudBtnGap, w: 68, h: hudBtnH };
    }

    function navAction() {
      if (state.ui.buildConfirm != null) return { label: '关闭', act: 'close_confirm' };
      if (state.ui.reportOpen) return { label: '关闭', act: 'close_report' };
      if (state.ui.detailOpen) return { label: '关闭', act: 'close_detail' };
      if (state.ui.menuOpen) {
        if (state.ui.page === 'main') return { label: '关闭', act: 'close_menu' };
        return { label: '返回', act: 'back' };
      }
      return null;
    }

    function clearMenuSelect() { state.ui.menuSelect = null; }
    function setMenuSelect(sel) { state.ui.menuSelect = sel; }
    function sameMenuSelect(sel) {
      var cur = state.ui.menuSelect;
      return !!(cur && sel && cur.kind === sel.kind && String(cur.key) === String(sel.key));
    }

    function briefForBuild(type) {
      if (type === 'demolish') {
        return {
          title: '拆除',
          brief: '点选建筑拆除，返还部分造价。州城不可拆。',
          detail: ['进入拆除模式后，在地图上点选要拆的建筑。', '拆除返还约三成造价；施工中的可取消施工。', '州城不可拆除。']
        };
      }
      var meta = BUILD_META[type];
      if (!meta) return { title: '建筑', brief: '', detail: [] };
      var brief = '造价' + meta.cost + '金 · 维护' + meta.maint + '/月 · 声望' + (meta.yield || 0);
      if (meta.priceMax > 0) brief += ' · 消费' + meta.priceMin + '~' + meta.priceMax;
      if (meta.stat && meta.statDelta != null && meta.statDelta < 0) brief += ' · ' + meta.stat + meta.statDelta;
      return {
        title: meta.name,
        brief: brief,
        detail: [
          meta.name + '：造价 ' + meta.cost + ' 金，每月维护 ' + meta.maint + ' 金。',
          '提供声望约 ' + (meta.yield || 0) + '。',
          meta.priceMax > 0
            ? ('住民消费 ' + meta.priceMin + '~' + meta.priceMax + ' 金，收入归城镇金库。')
            : (type === BUILD.ROAD ? '铺路可扩展可建区域与通行。' : '可与周边建筑组成坊巷加成。')
        ]
      };
    }

    function briefForResearch(u) {
      var block = researchBlockReason(state, u);
      var job = state.researching;
      var brief = '耗食' + u.cost.food + '武' + u.cost.war + '技' + u.cost.tech + '学' + u.cost.edu;
      if (job && job.id === u.id) {
        brief = '研究中 ' + Math.min(99, Math.floor((job.t / job.dur) * 100)) + '% · ' + brief;
      } else if (block) {
        brief = block + ' · ' + brief;
      }
      if (state.unlocked[u.id]) brief = '已解锁 · ' + brief;
      var detail = [
        '研究「' + u.name + '」需消耗研策并等待进度完成（大江户式）。',
        '预计耗时约 ' + Math.ceil(researchDurationSec(state, u)) + ' 秒（1x，学塾/学问可加快）。'
      ];
      if (u.needAttr) {
        detail.push('属性门槛 食' + (u.needAttr.food || 0) + ' 武' + (u.needAttr.war || 0) +
          ' 技' + (u.needAttr.tech || 0) + ' 学' + (u.needAttr.edu || 0));
      }
      if (u.needPrestige) detail.push('石高门槛 ≥' + u.needPrestige);
      if (u.roadLevel) detail.push('解锁后可铺设「' + (ROAD_LEVEL_NAMES[u.roadLevel] || '高级道路') + '」。');
      if (u.build === BUILD.CASTLE) detail.push('州城建造另受石高/座数限制。');
      detail.push(state.unlocked[u.id] ? '当前已解锁。' : (block ? ('当前不可研究：' + block) : '再次点击以开始研究。'));
      return { title: u.name, brief: brief, detail: detail };
    }

    function craftStockCount(id) {
      var n = 0, stock = state.craftStock || [];
      for (var i = 0; i < stock.length; i++) if (stock[i].id === id) n++;
      return n;
    }

    function briefForCraft(cd) {
      var c = cd.cost;
      return {
        title: cd.name,
        brief: '制作耗食' + c.food + '武' + c.war + '技' + c.tech + '学' + c.edu + ' · 库存' + craftStockCount(cd.id),
        detail: [
          '工巧「' + cd.name + '」：匠人在货栈工作可发现。',
          '制作消耗研策，成功率受手艺影响。',
          '效果：' + cd.effect + '（' + cd.val + '）。库存 ' + craftStockCount(cd.id) + '。',
          '再次点击以确认制作。'
        ]
      };
    }

    function briefForCraftUse(idx) {
      var stock = state.craftStock || [];
      var it = stock[idx];
      if (!it) return { title: '库存', brief: '', detail: [] };
      var def = craftDefById(it.id);
      var name = def ? def.name : '?';
      return {
        title: '使用 ' + name,
        brief: '库存第' + (idx + 1) + '件 · 再次点击确认使用',
        detail: [
          '使用工巧「' + name + '」将立即生效并消耗库存。',
          def ? ('效果：' + def.effect + ' · ' + def.val) : '未知效果。',
          '再次点击本项以确认使用。'
        ]
      };
    }

    function briefForPeople(r) {
      ensureResidentFields(r);
      var st = r.stats || { int: 15, loy: 40, apl: 15, skl: 15 };
      var jl = r.jobLevels || {};
      var yld = residentWeeklyYield(state, r);
      var nxt = nextJobCandidate(state, r);
      return {
        title: (r.name || ('住民' + (r.id + 1))) + ' · ' + jobLabel(r.job),
        brief: '钱包' + r.wallet + ' · 俸禄' + yld + ' · ' + vehicleLabel(r.vehicle) + '步' + r.walkRange,
        detail: [
          '住宅 (' + r.homeX + ',' + r.homeY + ') · 当前职业 ' + jobLabel(r.job),
          '职业等级 农' + (jl.farmer || 0) + ' 匠' + (jl.artisan || 0) + ' 商' + (jl.merchant || 0) +
            ' 甲' + (jl.warrior || 0) + ' 幕' + (jl.retainer || 0) + '（各上限5）',
          '知惠' + Math.floor(st.int) + ' 忠诚' + Math.floor(st.loy) +
            ' 魅力' + Math.floor(st.apl) + ' 才能' + Math.floor(st.skl) + '（0–100）',
          '周俸禄贡献约 ' + yld + ' · 转职需州城且耗' + JOB_CHANGE_COST + '金' +
            (nxt ? (' · 可转' + jobLabel(nxt)) : (hasCastle(state) ? '' : ' · 未建州城')),
          '详情可：转职 / 用工艺 / 追踪 / 跳转住宅。满意度不显示。'
        ]
      };
    }

    function findResidentById(id) {
      for (var i = 0; i < state.residents.length; i++) {
        if (state.residents[i].id === id) return state.residents[i];
      }
      return null;
    }

    function openPeopleDetail(resId) {
      state.ui.page = 'people_detail';
      state.ui.detailResId = resId;
      clearMenuSelect();
      state.ui.menuOpen = true;
    }

    function focusCameraOnWorld(wx, wy) {
      state.cameraX = wx - mapW / 2;
      state.cameraY = wy - mapH / 2;
      clampCam();
    }

    function followResident(r) {
      if (!r) return;
      var wp = gridToWorld(r.x, r.y);
      focusCameraOnWorld(wp.x, wp.y);
      state.ui.menuOpen = false;
      state.ui.page = 'main';
      showToast(state, '追踪：' + (r.name || jobLabel(r.job)), 0.9);
    }

    function jumpToResidentHome(r) {
      if (!r) return;
      var wp = gridToWorld(r.homeX + 0.5, r.homeY + 0.5);
      focusCameraOnWorld(wp.x, wp.y);
      state.ui.menuOpen = false;
      state.ui.page = 'main';
      showToast(state, '住宅 (' + r.homeX + ',' + r.homeY + ')', 0.9);
    }

    function drawSelectGlow(x, y, w, h) {
      var blink = 0.45 + 0.55 * Math.abs(Math.sin((state.uiAnimT || 0) * 6));
      ctx.save();
      ctx.strokeStyle = 'rgba(100,181,246,' + (0.55 + blink * 0.45) + ')';
      ctx.lineWidth = 3;
      roundRect(x, y, w, h, 8);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(187,222,251,' + (0.25 + blink * 0.35) + ')';
      ctx.lineWidth = 1.5;
      roundRect(x + 2, y + 2, w - 4, h - 4, 6);
      ctx.stroke();
      ctx.restore();
    }

    function drawMenuSelectBlurb(panel) {
      var sel = state.ui.menuSelect;
      if (!sel || !sel.brief) return;
      var by = panel.y + panel.h - 64;
      ctx.fillStyle = 'rgba(227,242,253,0.95)';
      roundRect(panel.x + 12, by, panel.w - 24, 52, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(33,150,243,0.45)';
      ctx.lineWidth = 1;
      roundRect(panel.x + 12, by, panel.w - 24, 52, 8);
      ctx.stroke();
      ctx.fillStyle = '#1565C0';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(sel.title || '选中', panel.x + 20, by + 8);
      ctx.fillStyle = '#37474F';
      ctx.font = '11px sans-serif';
      fillTextEllipsis(sel.brief, panel.x + 20, by + 28, panel.w - 44);
    }

    function placeModeHudRects() {
      // 提示条与「中止」分两行，避免重叠
      var panelW = 168;
      var panelH = 40;
      var cancelW = 64;
      var cancelH = 34;
      var px = cssW - panelW - 8;
      var py = mapTop + 6;
      return {
        panel: { x: px, y: py, w: panelW, h: panelH },
        icon: { x: px + 6, y: py + 4, w: 32, h: 32 },
        cancel: { x: cssW - cancelW - 8, y: py + panelH + 6, w: cancelW, h: cancelH }
      };
    }

    function infoPopupRect() {
      var w = Math.min(cssW - 28, 340);
      var h = Math.min(cssH - 100, 320);
      return { x: (cssW - w) / 2, y: (cssH - h) / 2, w: w, h: h };
    }

    function buildConfirmRect() {
      var w = Math.min(cssW - 28, 320);
      var h = Math.min(cssH - 90, 360);
      return { x: (cssW - w) / 2, y: (cssH - h) / 2, w: w, h: h };
    }

    function openInfoPopup(payload) {
      state.ui.info = payload;
      state.ui.detailOpen = true;
      state.ui.pauseBeforeInfo = !!state.paused;
      state.paused = true;
    }

    function closeInfoPopup() {
      if (!state.ui.detailOpen) return;
      state.ui.detailOpen = false;
      state.ui.info = null;
      state.paused = !!state.ui.pauseBeforeInfo;
      state.ui.pauseBeforeInfo = false;
    }

    function openBuildConfirm(type) {
      state.ui.buildConfirm = type;
    }

    function closeBuildConfirm() {
      state.ui.buildConfirm = null;
    }

    function reportPopupRect() {
      var w = Math.min(cssW - 28, 320);
      var h = Math.min(cssH - 110, 300);
      return { x: (cssW - w) / 2, y: (cssH - h) / 2, w: w, h: h };
    }

    function tutorialPopupRect() {
      var w = Math.min(cssW - 24, 330);
      var h = Math.min(cssH - 100, 280);
      return { x: (cssW - w) / 2, y: (cssH - h) / 2, w: w, h: h };
    }

    function openReport(report) {
      if (!report) return;
      state.ui.report = report;
      state.ui.reportOpen = true;
      state.ui.pauseBeforeReport = !!state.paused;
      state.paused = true;
    }

    function closeReport() {
      if (!state.ui.reportOpen) return;
      state.ui.reportOpen = false;
      state.ui.report = null;
      state.paused = !!state.ui.pauseBeforeReport;
      state.ui.pauseBeforeReport = false;
    }

    function flushPendingReport() {
      if (!state.pendingReport) return;
      var r = state.pendingReport;
      state.pendingReport = null;
      openReport(r);
    }

    function startTutorial(force) {
      var meta = loadMeta(options.storage);
      if (!force && meta.tutorialDone) return;
      state.ui.tutorial = { step: 0 };
      state.ui.pauseBeforeTutorial = !!state.paused;
      state.paused = true;
    }

    function finishTutorial() {
      state.ui.tutorial = null;
      state.paused = !!state.ui.pauseBeforeTutorial;
      state.ui.pauseBeforeTutorial = false;
      var meta = loadMeta(options.storage);
      meta.tutorialDone = true;
      saveMeta(meta, options.storage);
    }

    function advanceTutorial() {
      if (!state.ui.tutorial) return;
      var next = state.ui.tutorial.step + 1;
      if (next >= TUTORIAL_STEPS.length) finishTutorial();
      else state.ui.tutorial.step = next;
    }

    function bottomInfoRects() {
      var by = cssH - mapBottom;
      return {
        bar: { x: 0, y: by, w: cssW, h: mapBottom },
        detail: { x: cssW - 78, y: by + 10, w: 68, h: 36 },
        upgrade: { x: cssW - 156, y: by + 10, w: 68, h: 36 }
      };
    }

    function buildInfoPayload(g, b) {
      var meta = BUILD_META[b];
      var lines = [];
      var detail = [];
      var lv = getBuildLevel(state, g.x, g.y);
      var visits = getVisitCount(state, g.x, g.y);
      var craft = state.buildingCraft && state.buildingCraft[key(g.x, g.y)];
      var catName = { road: '道路', house: '住宅', shop: '商铺', work: '生产', fac: '设施', env: '景观', castle: '州城' };
      if (isHouse(b)) {
        var ratePct = Math.floor(houseRentRate(b) * 100);
        var nextCost = lv < 5 ? (HOUSE_UP_GOLD[lv] || 0) : 0;
        var res = residentAtHomeCell(state, g.x, g.y);
        var jobPow = res ? residentJobPower(res) : 0;
        var jobMax = res ? residentMaxJobLevel(res) : 0;
        lines = [
          '住房 Lv' + lv + '/5 · 年贡=总俸禄×' + ratePct + '%' + (nearCastle(state, g.x, g.y) ? ' ·近州城' : ''),
          lv >= 5 ? '已满级宅邸' : ('周结算自动升级 · 下一级需' + nextCost + '金')
        ];
        detail = [
          '住房按周结算自动升级（不靠访问量），无需手动改建。',
          '条件：通路 + 金币 + 住客职业等级（当前单职最高' + jobMax + ' / 总职' + jobPow + '）。',
          '四月年贡：城市总俸禄 × ' + ratePct + '%。'
        ];
        return { kind: 'house', x: g.x, y: g.y, title: buildingName(b), lines: lines, detail: detail, canUpgrade: false };
      }
      if (b === BUILD.CASTLE) {
        var cm = castleMutualMul(state);
        var needV = lv < 5 ? (BUILD_VISIT_NEED[lv] || 0) : 0;
        lines = [
          '州城 Lv' + lv + '/5 · ' + castleCount(state) + '/' + MAX_CASTLE + ' · 互相×' + (Math.round(cm * 100) / 100),
          '辐射' + CASTLE_RAD + '格 · 甲士/幕僚工作点'
        ];
        detail = [
          '多座州城互相倍率加成（文档 6.1），不受道路限制。',
          '辐射范围内建筑声望提升；可转职甲士/幕僚。',
          lv >= 5 ? '已满级。' : ('访问进度 ' + Math.floor(visits) + '/' + needV + ' · 周结算自动升级。'),
          '当前俸禄 ' + buildingYield(state, b, g.x, g.y) + '。'
        ];
      } else if (b === BUILD.ROAD) {
        lines = ['道路：扩展可建与通行', '点选蓝格 · 再点确认'];
        detail = ['土路连接宅基与商铺，住民沿路行走。', '道路旁方可建造多数建筑。', '道路不参与坊巷、无俸禄。'];
      } else if (b === BUILD.VACANT) {
        var roadOk = adjacentToRoad(state, g.x, g.y);
        lines = [
          '宅基 · 待住空地',
          roadOk ? '已通路 · 周结算可吸引迁入' : '未通路 · 无法吸引新住民'
        ];
        detail = [
          '宅基为人口容量，无维护费，提供俸禄加成。',
          '周结算自动判定迁入：每4周一次，需空位、魅力≥10、人口未满40。',
          '迁入先施工建房，完工后入住并收安家费（总俸禄×4）。',
          '当前魅力 ' + getCityCharm(state) + ' · 人口 ' + state.residents.length + '/' + getPopulationSoftCap(state) + '。'
        ];
      } else if (b === BUILD.STABLE) {
        lines = ['马厩 · 无等级成长', '造价' + meta.cost + ' 维护' + meta.maint + '/月'];
        detail = ['马厩为机制建筑，不参与 1–5 级升级。', '建成后解锁驴马/白马等坐骑判定。'];
      } else if (meta) {
        var cat = catName[meta.cat] || '建筑';
        var needVis = (canAutoUpgradeType(b) && lv < 5) ? (BUILD_VISIT_NEED[lv] || 0) : 0;
        var upCost = (canAutoUpgradeType(b) && lv < 5) ? (BUILD_UP_GOLD[lv] || 0) : 0;
        lines = [
          cat + ' Lv' + lv + '/5 · 俸禄' + buildingYield(state, b, g.x, g.y) + (craft ? ' ·挂载' : ''),
          '造价' + meta.cost + ' 维护' + meta.maint + '/月' +
            (meta.priceMax > 0 ? (' 物价' + meta.priceMin + '~' + meta.priceMax) : '')
        ];
        detail = [
          meta.name + '（' + cat + '）：适配职业访问累积，周结算自动升级，最高5级。',
          canAutoUpgradeType(b)
            ? (lv >= 5
              ? '已满级。'
              : ('有效访问 ' + Math.floor(visits) + '/' + needVis + ' · 下一级消耗' + upCost + '金。'))
            : '本建筑不升级。',
          '4×4 坊巷加成作用于本格；物价加成仅商铺。',
          meta.priceMax > 0
            ? '住民消费扣钱包，不进玩家金库；激活商业流水。'
            : (b === BUILD.WHOLESALER ? '匠人研发/工作核心；货栈≥3级解锁工巧。'
              : (b === BUILD.FIELD ? '农夫唯一工作点；仅农民访问计升级。'
                : (b === BUILD.SCHOOL ? '访问提升知识，加速职业升级。'
                  : (b === BUILD.BATH ? '提升满意度与留存（澡堂）。'
                    : (b === BUILD.FIREHOUSE ? '访问可提升忠诚；参与消防巷俸禄加成。'
                      : '与周边建筑可组成坊巷。')))))
        ];
        if (craft) detail.push('挂载工巧「' + craft.name + '」俸禄+' + craft.yieldBonus + '。');
        if (nearCastle(state, g.x, g.y) && b !== BUILD.CASTLE) lines[0] += ' ·城辐';
      } else {
        lines = ['格子 (' + g.x + ',' + g.y + ')'];
        detail = lines.slice();
      }
      return { kind: 'build', x: g.x, y: g.y, title: buildingName(b), lines: lines, detail: detail, canUpgrade: false };
    }

    function openDetailPanel() {
      if (!state.ui.info) {
        showToast(state, '无可查看说明');
        return;
      }
      if (!state.ui.detailOpen) {
        state.ui.pauseBeforeInfo = !!state.paused;
        state.paused = true;
      }
      state.ui.detailOpen = true;
    }

    var dragging = false;
    var lastX = 0, lastY = 0;
    var moved = false;
    var lastTap = { t: 0, gx: -999, gy: -999 };

    var MENU_MAIN = [
      { id: 'build', label: '建设' },
      { id: 'research', label: '研究' },
      { id: 'craft', label: '工巧' },
      { id: 'combo', label: '坊巷' },
      { id: 'people', label: '住民' },
      { id: 'system', label: '系统' },
      { id: 'save', label: '保存' },
      { id: 'load', label: '读档' }
    ];
    var BUILD_ENV = [
      { type: BUILD.ROAD, label: '田间小路', roadLevel: 1 },
      { type: BUILD.ROAD, label: '木板路', roadLevel: 2 },
      { type: BUILD.ROAD, label: '砂石路', roadLevel: 3 },
      { type: BUILD.ROAD, label: '砖瓦路', roadLevel: 4 },
      { type: BUILD.ROAD, label: '磐石路', roadLevel: 5 },
      { type: BUILD.VACANT, label: '宅基' },
      { type: BUILD.FIELD, label: '田' },
      { type: BUILD.WHOLESALER, label: '货栈' },
      { type: BUILD.PARK, label: '园圃' },
      { type: BUILD.WELL, label: '水井' },
      { type: BUILD.TREE, label: '绿树' },
      { type: BUILD.CHERRY, label: '海棠' },
      { type: BUILD.POND, label: '方塘' },
      { type: BUILD.BUDDHA, label: '石佛' },
      { type: 'demolish', label: '拆除' }
    ];
    var BUILD_SHOP = [
      { type: BUILD.NOODLE, label: '面馆' },
      { type: BUILD.WONTON, label: '抄手摊' },
      { type: BUILD.HOTPOT, label: '火锅摊' },
      { type: BUILD.TEA, label: '茶馆' },
      { type: BUILD.RICE, label: '米铺' },
      { type: BUILD.CLOTH, label: '布庄' }
    ];
    var BUILD_FAC = [
      { type: BUILD.CASTLE, label: '州城' },
      { type: BUILD.INN, label: '客栈' },
      { type: BUILD.STABLE, label: '马厩' },
      { type: BUILD.SCHOOL, label: '学塾' },
      { type: BUILD.BATH, label: '澡堂' },
      { type: BUILD.FIREHOUSE, label: '消防所' },
      { type: BUILD.HOT_SPRING, label: '温泉' },
      { type: BUILD.ARENA, label: '擂台' }
    ];

    function resize(w, h, ratio) {
      cssW = w; cssH = h; dpr = ratio || 1;
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      if (canvas.style) {
        canvas.style.width = cssW + 'px';
        canvas.style.height = cssH + 'px';
      }
      mapH = cssH - mapTop - mapBottom;
      mapW = cssW;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (typeof ctx.imageSmoothingEnabled === 'boolean') {
        ctx.imageSmoothingEnabled = false; // 像素贴图更利落
      }
    }
    resize(cssW, cssH, dpr);

    function getZoom() {
      return state.cameraZoom || 1;
    }

    function screenToWorld(sx, sy) {
      var z = getZoom();
      return {
        x: (sx - mapW / 2) / z + state.cameraX + mapW / 2,
        y: (sy - mapTop - mapH / 2) / z + state.cameraY + mapH / 2
      };
    }

    function worldToScreen(wx, wy) {
      var z = getZoom();
      return {
        x: (wx - state.cameraX - mapW / 2) * z + mapW / 2,
        y: (wy - state.cameraY - mapH / 2) * z + mapTop + mapH / 2
      };
    }

    function zoomAt(sx, sy, newZoom) {
      var w = screenToWorld(sx, sy);
      state.cameraZoom = clamp(newZoom, ZOOM_MIN, ZOOM_MAX);
      var z = getZoom();
      state.cameraX = w.x - (sx - mapW / 2) / z - mapW / 2;
      state.cameraY = w.y - (sy - mapTop - mapH / 2) / z - mapH / 2;
      clampCam();
    }

    function screenToGrid(sx, sy) {
      var w = screenToWorld(sx, sy);
      var cell = pickCellAtWorld(w.x, w.y);
      return cell || { x: -1, y: -1 };
    }

    function clampCam() {
      var b = mapWorldBounds();
      var z = getZoom();
      var viewW = mapW / z;
      var viewH = mapH / z;
      // camera 存的是「视口中心对应的世界坐标 − 半屏」，不是左上角
      var minCamX = b.minX - mapW / 2 + viewW / 2;
      var maxCamX = b.maxX - mapW / 2 - viewW / 2;
      var minCamY = b.minY - mapH / 2 + viewH / 2;
      var maxCamY = b.maxY - mapH / 2 - viewH / 2;
      if (maxCamX < minCamX) {
        state.cameraX = (b.minX + b.maxX) / 2 - mapW / 2;
      } else {
        state.cameraX = clamp(state.cameraX, minCamX, maxCamX);
      }
      if (maxCamY < minCamY) {
        state.cameraY = (b.minY + b.maxY) / 2 - mapH / 2;
      } else {
        state.cameraY = clamp(state.cameraY, minCamY, maxCamY);
      }
    }

    function computeFitZoom() {
      var b = mapWorldBounds();
      var worldW = b.maxX - b.minX;
      var worldH = b.maxY - b.minY;
      if (worldW < 1 || worldH < 1) return 1;
      return clamp(Math.min(mapW / worldW, mapH / worldH) * 0.92, ZOOM_MIN, ZOOM_MAX);
    }

    function centerCameraOnMap() {
      var c = mapCenterWorld();
      state.cameraX = c.x - mapW / 2;
      state.cameraY = c.y - mapH / 2;
      clampCam();
    }
    state.cameraZoom = computeFitZoom();
    centerCameraOnMap();

    function restartWithMap(mapId, inherit) {
      mapId = mapId || 'pingyuan';
      if (!MAP_DEFS[mapId]) mapId = 'pingyuan';
      saveMeta(mergeMetaFromState(loadMeta(options.storage), state), options.storage);
      var fresh = createInitialState(mapId);
      var keepUi = {
        menuOpen: state.ui.menuOpen,
        page: 'system',
        placeMode: null,
        menuSelect: null,
        info: null
      };
      Object.keys(fresh).forEach(function (k) { state[k] = fresh[k]; });
      state.ui = keepUi;
      state.selectedBuild = null;
      state.toast = null;
      state.toastTimer = 0;
      state.floatTexts = [];
      if (inherit) {
        applyMetaToState(state, loadMeta(options.storage));
        var meta = loadMeta(options.storage);
        meta.totalRuns = (meta.totalRuns || 0) + 1;
        saveMeta(meta, options.storage);
        showToast(state, '继承新局：保留研究/工巧', 1.4);
      }
      spawnResidents(state);
      recalcPrestige(state);
      checkCombo(state);
      state.cameraZoom = computeFitZoom();
      centerCameraOnMap();
      showToast(state, '新局：' + MAP_DEFS[mapId].name, 1.2);
    }

    function enterPlaceMode(type, opts) {
      opts = opts || {};
      closeBuildConfirm();
      if (type === BUILD.ROAD) {
        state.ui.placeMode = { type: BUILD.ROAD, roadLevel: opts.roadLevel || 1 };
      } else {
        state.ui.placeMode = type;
      }
      state.ui.hoverCell = null;
      state.ui.markCell = null;
      state.ui.menuOpen = false;
      state.ui.page = 'main';
      closeInfoPopup();
      if (type === 'demolish') showToast(state, '拆除：点选标记 · 再点确认 · 按住拖地图', 1.4);
      else if (type === BUILD.ROAD) {
        showToast(state, '放置「' + (ROAD_LEVEL_NAMES[opts.roadLevel || 1] || '路') + '」· 点选后再次点击确认', 1.4);
      } else {
        var meta = BUILD_META[type];
        showToast(state, '放置「' + meta.name + '」· 点选后再次点击确认', 1.4);
      }
    }

    function placeModeLabel(pm) {
      if (pm === 'demolish') return '拆除';
      if (pm && typeof pm === 'object' && pm.type === BUILD.ROAD) {
        return ROAD_LEVEL_NAMES[pm.roadLevel || 1] || '道路';
      }
      return BUILD_META[pm] ? BUILD_META[pm].name : '建造';
    }

    function placeModeCostTxt(pm) {
      if (pm === 'demolish') return '';
      if (pm && typeof pm === 'object' && pm.type === BUILD.ROAD) {
        return ' · ' + (ROAD_LEVEL_COST[pm.roadLevel || 1] || 15) + '金';
      }
      return BUILD_META[pm] ? (' · ' + BUILD_META[pm].cost + '金') : '';
    }

    function cancelPlace() {
      state.ui.placeMode = null;
      state.ui.hoverCell = null;
      state.ui.markCell = null;
      showToast(state, '已中止放置', 0.8);
    }

    function hitPlaceModeCancel(sx, sy) {
      if (!state.ui.placeMode) return false;
      var ph = placeModeHudRects();
      var c = ph.cancel;
      return sx >= c.x && sx <= c.x + c.w && sy >= c.y && sy <= c.y + c.h;
    }

    function hitPlaceModePanel(sx, sy) {
      if (!state.ui.placeMode) return false;
      var p = placeModeHudRects().panel;
      return sx >= p.x && sx <= p.x + p.w && sy >= p.y && sy <= p.y + p.h;
    }

    function menuPanelRect() {
      var w = Math.min(320, cssW - 24);
      var tall = state.ui.page === 'combo' || state.ui.page === 'system' || state.ui.page === 'build' ||
        state.ui.page === 'research';
      var h = tall ? Math.min(560, cssH - 40) : Math.min(420, cssH - 80);
      return { x: (cssW - w) / 2, y: (cssH - h) / 2, w: w, h: h };
    }

    function researchListMetrics(panel) {
      var rowH = 52;
      var headerH = (state.researching && state.researching.id) ? 88 : 78;
      var footerPad = 56;
      var viewTop = panel.y + headerH;
      var viewH = panel.h - headerH - footerPad;
      var contentH = RESEARCH_UNLOCKS.length * rowH;
      var maxScroll = Math.max(0, contentH - viewH);
      var scroll = clamp(state.ui.researchScroll || 0, 0, maxScroll);
      state.ui.researchScroll = scroll;
      return { rowH: rowH, viewTop: viewTop, viewH: viewH, contentH: contentH, maxScroll: maxScroll, scroll: scroll };
    }

    function hitMenu(sx, sy) {
      if (!state.ui.menuOpen) return null;
      var p = menuPanelRect();
      if (sx < p.x || sy < p.y || sx > p.x + p.w || sy > p.y + p.h) {
        return { kind: 'menu_backdrop' };
      }

      // 建设：顶栏三 Tab + 下方内容（兼容旧 page build_env/shop/fac）
      if (state.ui.page === 'build' || state.ui.page === 'build_env' || state.ui.page === 'build_shop' || state.ui.page === 'build_fac') {
        if (state.ui.page === 'build_env') state.ui.buildTab = 'env';
        if (state.ui.page === 'build_shop') state.ui.buildTab = 'shop';
        if (state.ui.page === 'build_fac') state.ui.buildTab = 'fac';
        state.ui.page = 'build';
        var tw = (p.w - 24) / 3;
        var tabY = p.y + 42;
        var tabs = ['env', 'shop', 'fac'];
        for (var t = 0; t < 3; t++) {
          var tx = p.x + 12 + t * tw;
          if (sx >= tx && sx <= tx + tw - 6 && sy >= tabY && sy <= tabY + 36) {
            return { kind: 'build_tab', id: tabs[t] };
          }
        }
        var itemsB = currentBuildItems();
        var colsB = 3;
        var cellWB = (p.w - 24) / colsB;
        var cellHB = 72;
        var startYB = p.y + 88;
        for (var ib = 0; ib < itemsB.length; ib++) {
          var cb = ib % colsB;
          var rb = (ib / colsB) | 0;
          var xb = p.x + 12 + cb * cellWB;
          var yb = startYB + rb * (cellHB + 8);
          if (yb + cellHB > p.y + p.h - 70) break;
          if (sx >= xb && sx <= xb + cellWB - 6 && sy >= yb && sy <= yb + cellHB) {
            return { kind: 'menu_item', item: itemsB[ib] };
          }
        }
        return { kind: 'menu_absorb' };
      }
      if (state.ui.page === 'people' || state.ui.page === 'people_detail' || state.ui.page === 'combo' || state.ui.page === 'research' || state.ui.page === 'craft') {
        if (state.ui.page === 'research') {
          var list = RESEARCH_UNLOCKS;
          var rm = researchListMetrics(p);
          if (sy < rm.viewTop || sy > rm.viewTop + rm.viewH) return { kind: 'menu_absorb' };
          for (var ui = 0; ui < list.length; ui++) {
            var ry = rm.viewTop + ui * rm.rowH - rm.scroll;
            if (ry + 44 < rm.viewTop || ry > rm.viewTop + rm.viewH) continue;
            if (sx >= p.x + 16 && sx <= p.x + p.w - 16 && sy >= ry && sy <= ry + 44) {
              return { kind: 'menu_item', item: { id: 'unlock', unlockId: list[ui].id } };
            }
          }
          return { kind: 'menu_absorb' };
        }
        if (state.ui.page === 'craft') {
          var craftY = p.y + 78;
          var shown = 0;
          for (var ci = 0; ci < CRAFT_DEFS.length; ci++) {
            if (state.craftDiscovered.indexOf(CRAFT_DEFS[ci].id) < 0) continue;
            var row = (shown / 2) | 0;
            var col = shown % 2;
            var cw = (p.w - 40) / 2;
            var cx2 = p.x + 16 + col * (cw + 8);
            var cy2 = craftY + row * 52;
            shown++;
            if (cy2 + 44 > p.y + p.h - 160) continue;
            if (sx >= cx2 && sx <= cx2 + cw && sy >= cy2 && sy <= cy2 + 44) {
              return { kind: 'menu_item', item: { id: 'make_craft', craftId: CRAFT_DEFS[ci].id } };
            }
          }
          for (var si = 0; si < (state.craftStock || []).length; si++) {
            var uy = p.y + p.h - 160 + si * 36;
            if (uy + 32 > p.y + p.h - 70) break;
            if (sx >= p.x + 16 && sx <= p.x + p.w - 16 && sy >= uy && sy <= uy + 32) {
              return { kind: 'menu_item', item: { id: 'use_craft', craftIdx: si } };
            }
          }
        }
        if (state.ui.page === 'people') {
          var peopleRowH = 72;
          for (var pi = 0; pi < state.residents.length; pi++) {
            var rowY = p.y + 48 + pi * peopleRowH;
            if (rowY + peopleRowH > p.y + p.h - 70) break;
            if (sx >= p.x + 12 && sx <= p.x + p.w - 12 && sy >= rowY + 4 && sy <= rowY + peopleRowH - 4) {
              return { kind: 'menu_item', item: { id: 'open_people_detail', resId: state.residents[pi].id } };
            }
          }
        }
        if (state.ui.page === 'people_detail') {
          var dr = findResidentById(state.ui.detailResId);
          if (dr) {
            var btnH = 40;
            var btnW = (p.w - 40) / 2;
            var by0 = p.y + p.h - 170;
            var btns = [
              { id: 'pd_job', x: p.x + 14, y: by0 },
              { id: 'pd_craft', x: p.x + 22 + btnW, y: by0 },
              { id: 'pd_follow', x: p.x + 14, y: by0 + 48 },
              { id: 'pd_home', x: p.x + 22 + btnW, y: by0 + 48 },
              { id: 'pd_back', x: p.x + 14, y: by0 + 96, w: p.w - 28 }
            ];
            for (var bi = 0; bi < btns.length; bi++) {
              var b = btns[bi];
              var bw = b.w || btnW;
              if (sx >= b.x && sx <= b.x + bw && sy >= b.y && sy <= b.y + btnH) {
                return { kind: 'menu_item', item: { id: b.id, resId: dr.id } };
              }
            }
          }
        }
        return { kind: 'menu_absorb' };
      }

      var items = currentMenuItems();
      var cols = 3;
      var cellW = (p.w - 24) / cols;
      var cellH = 56;
      if (state.ui.page === 'main') cellH = 64;
      if (state.ui.page === 'build_env' || state.ui.page === 'build_shop' || state.ui.page === 'build_fac') cellH = 72;
      var startY = p.y + 48;
      for (var i = 0; i < items.length; i++) {
        var c = i % cols;
        var r = (i / cols) | 0;
        var x = p.x + 12 + c * cellW;
        var y = startY + r * (cellH + 8);
        if (y + cellH > p.y + p.h - 70 && (state.ui.page === 'build_env' || state.ui.page === 'build_shop' || state.ui.page === 'build_fac')) {
          // leave blurb area
        }
        if (sx >= x && sx <= x + cellW - 6 && sy >= y && sy <= y + cellH) {
          return { kind: 'menu_item', item: items[i] };
        }
      }
      return { kind: 'menu_absorb' };
    }

    function currentBuildItems() {
      var tab = state.ui.buildTab || 'env';
      var list = tab === 'shop' ? BUILD_SHOP : (tab === 'fac' ? BUILD_FAC : BUILD_ENV);
      return list.filter(function (it) {
        if (typeof it.type !== 'number') return true;
        if (it.type === BUILD.ROAD) return canBuildUnlocked(state, BUILD.ROAD, { roadLevel: it.roadLevel || 1 });
        return canBuildUnlocked(state, it.type);
      });
    }

    function currentMenuItems() {
      if (state.ui.page === 'main') return MENU_MAIN;
      if (state.ui.page === 'build' || state.ui.page === 'build_env' || state.ui.page === 'build_shop' || state.ui.page === 'build_fac') {
        return currentBuildItems();
      }
      if (state.ui.page === 'system') {
        var curMap = (MAP_DEFS[state.mapId] || MAP_DEFS.pingyuan).name;
        return [
          { id: 'pause', label: state.paused ? '继续' : '暂停' },
          { id: 'speed', label: '速度 ' + state.speed + 'x' },
          { id: 'mute', label: isAudioMuted() ? '音效：关' : '音效：开' },
          { id: 'tutorial', label: '重看教程' },
          { id: 'map_info', label: '地图 ' + curMap, disabled: true },
          { id: 'new_pingyuan', label: '新局·平畴乡' },
          { id: 'new_jianmen', label: '新局·剑门谷' },
          { id: 'new_jinjiang', label: '新局·锦江浦' },
          { id: 'new_inherit', label: '继承新局(平畴)' }
        ];
      }
      return MENU_MAIN;
    }

    function doNavAction(act) {
      if (act === 'close_confirm') { closeBuildConfirm(); clearMenuSelect(); return; }
      if (act === 'close_report') { closeReport(); return; }
      if (act === 'close_detail') { closeInfoPopup(); return; }
      if (act === 'close_menu') {
        state.ui.menuOpen = false;
        state.ui.page = 'main';
        clearMenuSelect();
        return;
      }
      if (act === 'back') {
        clearMenuSelect();
        if (state.ui.page === 'people_detail') {
          state.ui.page = 'people';
          state.ui.detailResId = null;
          return;
        }
        state.ui.page = 'main';
      }
    }

    function handleMenuItem(item) {
      if (!item) return;
      if (item.id === 'close' || item.id === 'back_main' || item.id === 'back') {
        doNavAction(item.id === 'close' || item.id === 'back_main' ? 'close_menu' : 'back');
        return;
      }
      if (item.id === 'build') { clearMenuSelect(); state.ui.page = 'build'; state.ui.buildTab = 'env'; return; }
      if (item.id === 'research') {
        clearMenuSelect();
        state.ui.page = 'research';
        state.ui.researchScroll = 0;
        return;
      }
      if (item.id === 'craft') { clearMenuSelect(); state.ui.page = 'craft'; return; }
      if (item.id === 'combo') { clearMenuSelect(); state.ui.page = 'combo'; return; }
      if (item.id === 'people') { clearMenuSelect(); state.ui.page = 'people'; return; }
      if (item.id === 'system') { clearMenuSelect(); state.ui.page = 'system'; return; }
      if (item.id === 'save') { saveGame(state, options.storage); return; }
      if (item.id === 'load') { loadGame(state, options.storage); return; }
      if (item.id === 'pause') { state.paused = !state.paused; playSfx('click'); return; }
      if (item.id === 'speed') {
        state.speed = state.speed >= 3 ? 1 : state.speed + 1;
        playSfx('click');
        return;
      }
      if (item.id === 'mute') {
        setAudioMuted(!isAudioMuted());
        if (!isAudioMuted()) playSfx('click');
        return;
      }
      if (item.id === 'tutorial') {
        state.ui.menuOpen = false;
        state.ui.page = 'main';
        clearMenuSelect();
        startTutorial(true);
        return;
      }
      if (item.id === 'new_pingyuan') { restartWithMap('pingyuan', false); return; }
      if (item.id === 'new_jianmen') { restartWithMap('jianmen', false); return; }
      if (item.id === 'new_jinjiang') { restartWithMap('jinjiang', false); return; }
      if (item.id === 'new_inherit') { restartWithMap('pingyuan', true); return; }
      if (item.id === 'map_info') return;

      if (item.id === 'unlock') {
        var u = null;
        for (var ui2 = 0; ui2 < RESEARCH_UNLOCKS.length; ui2++) {
          if (RESEARCH_UNLOCKS[ui2].id === item.unlockId) u = RESEARCH_UNLOCKS[ui2];
        }
        if (!u) return;
        var selU = { kind: 'research', key: u.id, title: briefForResearch(u).title, brief: briefForResearch(u).brief, detail: briefForResearch(u).detail };
        if (sameMenuSelect(selU)) {
          tryUnlock(state, item.unlockId);
          clearMenuSelect();
          playSfx('click');
        } else {
          setMenuSelect(selU);
          playSfx('click');
        }
        return;
      }
      if (item.id === 'make_craft') {
        var cd = craftDefById(item.craftId);
        if (!cd) return;
        var bf = briefForCraft(cd);
        var selC = { kind: 'craft', key: cd.id, title: bf.title, brief: bf.brief, detail: bf.detail };
        if (sameMenuSelect(selC)) {
          tryMakeCraft(state, item.craftId);
          var bf2 = briefForCraft(cd);
          setMenuSelect({ kind: 'craft', key: cd.id, title: bf2.title, brief: bf2.brief, detail: bf2.detail });
          playSfx('click');
        } else {
          setMenuSelect(selC);
          playSfx('click');
        }
        return;
      }
      if (item.id === 'use_craft') {
        var bfU = briefForCraftUse(item.craftIdx);
        var selCU = { kind: 'craft_use', key: 'use_' + item.craftIdx, title: bfU.title, brief: bfU.brief, detail: bfU.detail, craftIdx: item.craftIdx };
        if (sameMenuSelect(selCU)) {
          useCraftItem(state, item.craftIdx);
          clearMenuSelect();
          playSfx('click');
        } else {
          setMenuSelect(selCU);
          playSfx('click');
        }
        return;
      }
      if (item.id === 'open_people_detail') {
        openPeopleDetail(item.resId);
        playSfx('click');
        return;
      }
      if (item.id === 'pd_job') {
        var rrJ = findResidentById(item.resId);
        if (!rrJ) return;
        var nxtJ = nextJobCandidate(state, rrJ);
        if (!nxtJ) {
          showToast(state, hasCastle(state) ? '暂无可转职业' : '需先建造州城');
          return;
        }
        changeJob(state, rrJ, nxtJ);
        playSfx('click');
        return;
      }
      if (item.id === 'pd_craft') {
        var rrC = findResidentById(item.resId);
        if (!rrC) return;
        if (!(state.craftStock && state.craftStock.length)) {
          showToast(state, '背包没有工艺品');
          return;
        }
        useCraftOnResident(state, 0, rrC);
        playSfx('click');
        return;
      }
      if (item.id === 'pd_follow') {
        followResident(findResidentById(item.resId));
        playSfx('click');
        return;
      }
      if (item.id === 'pd_home') {
        jumpToResidentHome(findResidentById(item.resId));
        playSfx('click');
        return;
      }
      if (item.id === 'pd_back') {
        doNavAction('back');
        playSfx('click');
        return;
      }
      if (item.id === 'select_people') {
        openPeopleDetail(item.resId);
        playSfx('click');
        return;
      }
      if (item.id === 'jobchange') {
        var rr = findResidentById(item.resId);
        if (!rr) return;
        var nxt = nextJobCandidate(state, rr);
        if (!nxt) {
          showToast(state, hasCastle(state) ? '暂无可转职业' : '需先建造州城');
          return;
        }
        changeJob(state, rr, nxt);
        playSfx('click');
        return;
      }
      if (item.type === 'back') {
        doNavAction('back');
        return;
      }
      if (item.type === 'demolish' || typeof item.type === 'number') {
        if (item.type === BUILD.ROAD) {
          var rlv = item.roadLevel || 1;
          if (!canBuildUnlocked(state, BUILD.ROAD, { roadLevel: rlv })) {
            showToast(state, '请先在「研究」解锁' + (ROAD_LEVEL_NAMES[rlv] || '道路'));
            return;
          }
          var roadKey = 'road_' + rlv;
          var selR = {
            kind: 'build', key: roadKey, title: ROAD_LEVEL_NAMES[rlv],
            brief: '道路 Lv' + rlv + ' · ' + (ROAD_LEVEL_COST[rlv] || 15) + '金',
            detail: ['高等级道路提升全城步行范围', '亦是高阶住宅/州城升级前置'],
            buildType: BUILD.ROAD, roadLevel: rlv
          };
          if (sameMenuSelect(selR)) {
            enterPlaceMode(BUILD.ROAD, { roadLevel: rlv });
            clearMenuSelect();
            playSfx('click');
          } else {
            setMenuSelect(selR);
            playSfx('click');
          }
          return;
        }
        if (typeof item.type === 'number' && !canBuildUnlocked(state, item.type)) {
          showToast(state, '请先在「研究」解锁');
          return;
        }
        if (item.type === BUILD.CASTLE) {
          var ch = castleBuildHint(state);
          if (ch) { showToast(state, ch); return; }
        }
        var bfB = briefForBuild(item.type);
        var selB = { kind: 'build', key: item.type, title: bfB.title, brief: bfB.brief, detail: bfB.detail, buildType: item.type };
        if (sameMenuSelect(selB)) {
          enterPlaceMode(item.type);
          clearMenuSelect();
          playSfx('click');
        } else {
          setMenuSelect(selB);
          playSfx('click');
        }
      }
    }

    function hitHudButtons(sx, sy) {
      var menu = hudMenuRect();
      if (!state.ui.placeMode && sx >= menu.x && sx <= menu.x + menu.w && sy >= menu.y && sy <= menu.y + menu.h) {
        return { kind: 'open_menu' };
      }

      var spd = hudSpeedRect();
      if (sx >= spd.x && sx <= spd.x + spd.w && sy >= spd.y && sy <= spd.y + spd.h) {
        return { kind: 'top_speed' };
      }
      var pau = hudPauseRect();
      if (sx >= pau.x && sx <= pau.x + pau.w && sy >= pau.y && sy <= pau.y + pau.h) {
        return { kind: 'top_pause' };
      }

      var nav = navAction();
      if (nav) {
        var nr = hudNavRect();
        if (sx >= nr.x && sx <= nr.x + nr.w && sy >= nr.y && sy <= nr.y + nr.h) {
          return { kind: 'nav', act: nav.act };
        }
      }

      if (state.ui.menuSelect && state.ui.menuSelect.detail && state.ui.menuSelect.detail.length) {
        var er = hudExplainRect();
        if (sx >= er.x && sx <= er.x + er.w && sy >= er.y && sy <= er.y + er.h) {
          return { kind: 'explain' };
        }
      }

      if (hitPlaceModeCancel(sx, sy)) return { kind: 'cancel_place' };
      return null;
    }

    function onPointerDown(sx, sy) {
      // 建设二次确认弹窗优先
      if (state.ui.buildConfirm != null) {
        var bc = buildConfirmRect();
        var btnY = bc.y + bc.h - 56;
        var btnW = (bc.w - 36) / 2;
        if (sx >= bc.x + 12 && sx <= bc.x + 12 + btnW && sy >= btnY && sy <= btnY + 40) {
          closeBuildConfirm();
          playSfx('click');
          return;
        }
        if (sx >= bc.x + 24 + btnW && sx <= bc.x + 24 + btnW * 2 && sy >= btnY && sy <= btnY + 40) {
          var t = state.ui.buildConfirm;
          closeBuildConfirm();
          enterPlaceMode(t);
          playSfx('click');
          return;
        }
        // 点遮罩不关闭，避免误触
        return;
      }

      // 报纸 / 年贡报告
      if (state.ui.reportOpen) {
        var rp = reportPopupRect();
        var rBtnY = rp.y + rp.h - 52;
        if (sx >= rp.x + 16 && sx <= rp.x + rp.w - 16 && sy >= rBtnY && sy <= rBtnY + 40) {
          closeReport();
          playSfx('click');
        }
        return;
      }

      // 青荷教程
      if (state.ui.tutorial) {
        var tp = tutorialPopupRect();
        var tBtnY = tp.y + tp.h - 56;
        var half = (tp.w - 40) / 2;
        if (sx >= tp.x + 12 && sx <= tp.x + 12 + half && sy >= tBtnY && sy <= tBtnY + 40) {
          finishTutorial();
          playSfx('click');
          return;
        }
        if (sx >= tp.x + 28 + half && sx <= tp.x + 28 + half * 2 && sy >= tBtnY && sy <= tBtnY + 40) {
          advanceTutorial();
          playSfx('click');
          return;
        }
        return;
      }

      if (state.ui.detailOpen) {
        closeInfoPopup();
        return;
      }
      // 角按钮优先于菜单面板（右下返回/左下说明/右上菜单/顶栏变速）
      var hud = hitHudButtons(sx, sy);
      if (hud) {
        if (hud.kind === 'open_menu') {
          state.ui.menuOpen = true;
          state.ui.page = 'main';
          clearMenuSelect();
          playSfx('click');
          return;
        }
        if (hud.kind === 'nav') {
          doNavAction(hud.act);
          playSfx('click');
          return;
        }
        if (hud.kind === 'explain') {
          var sel = state.ui.menuSelect;
          if (sel) {
            openInfoPopup({
              kind: 'explain',
              title: sel.title || '说明',
              lines: sel.detail || [],
              detail: sel.detail || [],
              canUpgrade: false
            });
            playSfx('click');
          }
          return;
        }
        if (hud.kind === 'cancel_place') {
          cancelPlace();
          return;
        }
        if (hud.kind === 'top_pause') {
          state.paused = !state.paused;
          playSfx('click');
          return;
        }
        if (hud.kind === 'top_speed') {
          if (state.paused) state.paused = false;
          state.speed = state.speed >= 3 ? 1 : state.speed + 1;
          playSfx('click');
          return;
        }
      }

      if (state.ui.menuOpen) {
        var mh = hitMenu(sx, sy);
        if (mh) {
          if (mh.kind === 'menu_backdrop') {
            // 不点空白关闭，请用右下「关闭/返回」
            return;
          }
          // 研究页：按下开始拖滚动，松手且未滑动再点选
          if (state.ui.page === 'research' && (mh.kind === 'menu_item' || mh.kind === 'menu_absorb')) {
            dragging = true;
            moved = false;
            lastX = sx; lastY = sy;
            state.ui._researchPending = mh.kind === 'menu_item' ? mh.item : null;
            return;
          }
          if (mh.kind === 'menu_item') {
            handleMenuItem(mh.item);
          } else if (mh.kind === 'build_tab') {
            clearMenuSelect();
            state.ui.page = 'build';
            state.ui.buildTab = mh.id;
          }
          return;
        }
      }

      if (hitPlaceModePanel(sx, sy)) {
        if (hitPlaceModeCancel(sx, sy)) cancelPlace();
        return;
      }

      dragging = true;
      moved = false;
      lastX = sx; lastY = sy;
    }

    function onPointerMove(sx, sy) {
      if (state.ui.placeMode && sy > mapTop && sy < cssH - mapBottom) {
        var hg = screenToGrid(sx, sy);
        if (inBounds(hg.x, hg.y)) state.ui.hoverCell = { x: hg.x, y: hg.y };
        else state.ui.hoverCell = null;
      } else if (!state.ui.placeMode) {
        state.ui.hoverCell = null;
      }
      if (!dragging) return;
      var dx = sx - lastX, dy = sy - lastY;
      if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
      // 研究列表内拖动滚动
      if (state.ui.menuOpen && state.ui.page === 'research') {
        var p = menuPanelRect();
        var rm = researchListMetrics(p);
        state.ui.researchScroll = clamp((state.ui.researchScroll || 0) - dy, 0, rm.maxScroll);
        lastX = sx; lastY = sy;
        return;
      }
      if (state.ui.menuOpen || state.ui.detailOpen || state.ui.buildConfirm != null ||
          state.ui.reportOpen || state.ui.tutorial) return;

      // 放置模式：按住拖动只平移地图，不落子
      state.cameraX -= dx / getZoom();
      state.cameraY -= dy / getZoom();
      clampCam();
      lastX = sx; lastY = sy;
    }

    function onPointerUp(sx, sy) {
      if (!dragging) return;
      dragging = false;
      if (state.ui.menuOpen && state.ui.page === 'research') {
        if (!moved && state.ui._researchPending) {
          handleMenuItem(state.ui._researchPending);
        }
        state.ui._researchPending = null;
        return;
      }
      if (state.ui.menuOpen || state.ui.detailOpen || state.ui.buildConfirm != null ||
          state.ui.reportOpen || state.ui.tutorial) return;
      if (!moved && hitPlaceModeCancel(sx, sy)) {
        cancelPlace();
        return;
      }
      // 放置模式：单击标记（可放淡蓝 / 不可放淡红）；再点已标记的可放格才真正放置
      if (state.ui.placeMode) {
        if (moved) return;
        if (sy <= mapTop || sy >= cssH - mapBottom) return;
        if (hitPlaceModePanel(sx, sy)) {
          if (hitPlaceModeCancel(sx, sy)) cancelPlace();
          return;
        }
        var pg = screenToGrid(sx, sy);
        if (!inBounds(pg.x, pg.y)) return;
        var pm = state.ui.placeMode;
        var okCell = canConfirmPlaceAction(state, pm, pg.x, pg.y);
        var mk = state.ui.markCell;
        if (mk && mk.x === pg.x && mk.y === pg.y) {
          if (mk.ok && okCell) {
            var placed = false;
            if (pm === 'demolish') placed = demolishAt(state, pg.x, pg.y);
            else if (pm && typeof pm === 'object' && pm.type === BUILD.ROAD) {
              placed = placeBuilding(state, BUILD.ROAD, pg.x, pg.y, { roadLevel: pm.roadLevel || 1 });
            } else if (typeof pm === 'number') placed = placeBuilding(state, pm, pg.x, pg.y);
            if (placed) state.ui.markCell = null;
            else state.ui.markCell = { x: pg.x, y: pg.y, ok: canConfirmPlaceAction(state, pm, pg.x, pg.y) };
          }
          // 淡红标记格再次点击：不放置，保持标记
          return;
        }
        state.ui.markCell = { x: pg.x, y: pg.y, ok: okCell };
        return;
      }
      if (moved) return;
      if (sy <= mapTop || sy >= cssH - mapBottom) return;

      if (hitPlaceModePanel(sx, sy)) {
        if (hitPlaceModeCancel(sx, sy)) cancelPlace();
        return;
      }

      var g = screenToGrid(sx, sy);
      if (!inBounds(g.x, g.y)) return;

      // 工巧挂载：使用产出类工巧后点建筑
      if (state.pendingCraftEquip) {
        var beq = state.building[g.y][g.x];
        if (beq === BUILD.NONE || beq === BUILD.ROAD || beq === BUILD.VACANT) {
          showToast(state, '请点选有建筑的格子挂载');
          return;
        }
        if (!state.buildingCraft) state.buildingCraft = {};
        state.buildingCraft[key(g.x, g.y)] = {
          id: state.pendingCraftEquip.id,
          name: state.pendingCraftEquip.name,
          yieldBonus: state.pendingCraftEquip.yieldBonus || 10
        };
        showToast(state, '已挂载「' + state.pendingCraftEquip.name + '」·俸禄+' + state.pendingCraftEquip.yieldBonus, 1.4);
        addFloat(state, g.x, g.y, '挂载', '#CE93D8');
        state.pendingCraftEquip = null;
        recalcPrestige(state);
        return;
      }

      var now = Date.now();
      lastTap = { t: now, gx: g.x, gy: g.y };

      var b = state.building[g.y][g.x];
      var hitR = null;
      for (var j = 0; j < state.residents.length; j++) {
        var rr = state.residents[j];
        var rp = gridToWorld(rr.x, rr.y);
        var sp = worldToScreen(rp.x, rp.y);
        if (Math.hypot(sp.x - sx, sp.y - sy) < 34) { hitR = rr; break; }
      }

      if (hitR) {
        ensureResidentFields(hitR);
        var st = hitR.stats || { int: 15, loy: 40, apl: 15, skl: 15 };
        var jlH = hitR.jobLevels || {};
        openInfoPopup({
          kind: 'resident',
          resId: hitR.id,
          title: (hitR.name || ('住民' + (hitR.id + 1))) + ' · ' + jobLabel(hitR.job),
          lines: [
            '钱包' + hitR.wallet + ' · 俸禄' + residentWeeklyYield(state, hitR),
            '宅(' + hitR.homeX + ',' + hitR.homeY + ') · 步' + hitR.walkRange
          ],
          detail: [
            '职业等级 农' + (jlH.farmer || 0) + ' 匠' + (jlH.artisan || 0) + ' 商' + (jlH.merchant || 0) +
              ' 甲' + (jlH.warrior || 0) + ' 幕' + (jlH.retainer || 0),
            '知惠' + Math.floor(st.int) + ' 忠诚' + Math.floor(st.loy) +
              ' 魅力' + Math.floor(st.apl) + ' 才能' + Math.floor(st.skl),
            '请到菜单「住民」打开详情：转职 / 用工艺 / 追踪 / 跳转住宅。'
          ],
          canUpgrade: false,
          job: hitR.job
        });
        return;
      }
      if (b !== BUILD.NONE) {
        openInfoPopup(buildInfoPayload(g, b));
        return;
      }
      closeInfoPopup();
    }

    function update(dt) {
      state.uiAnimT = (state.uiAnimT || 0) + dt;
      if (state.toastTimer > 0) {
        state.toastTimer -= dt;
        if (state.toastTimer <= 0) state.toast = null;
      }
      for (var i = state.floatTexts.length - 1; i >= 0; i--) {
        var f = state.floatTexts[i];
        f.life -= dt;
        f.y -= 24 * dt;
        if (f.life <= 0) state.floatTexts.splice(i, 1);
      }
      // 施工与研究进度：暂停时停；开菜单时仍推进
      if (!state.paused) {
        var tickDt = dt * (state.speed || 1);
        tickConstructing(state, tickDt);
        tickResearch(state, tickDt);
      }
      if (state.paused || state.ui.menuOpen || state.ui.buildConfirm != null || state.ui.detailOpen ||
          state.ui.reportOpen || state.ui.tutorial) return;

      var simDt = dt * state.speed;
      var weekLen = 2.5;
      state.weekAcc += simDt;
      while (state.weekAcc >= weekLen) {
        state.weekAcc -= weekLen;
        advanceWeek(state);
        flushPendingReport();
        if (state.ui.reportOpen) break;
      }
      for (var r = 0; r < state.residents.length; r++) {
        try {
          updateResident(state, state.residents[r], simDt);
        } catch (errRes) {
          var bad = state.residents[r];
          if (bad) {
            bad.state = 'idle';
            bad.wait = 0.8;
            bad.path = [];
            bad.standPoint = null;
            bad.inside = false;
            ensureResidentHomeBuilding(state, bad);
          }
        }
      }
      separateCrowdedResidents(state, simDt);
    }

    function roundRect(x, y, w, h, rad) {
      var r = rad || 8;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    function drawPlaceModeHud() {
      if (!state.ui.placeMode) return;
      var ph = placeModeHudRects();
      var pm = state.ui.placeMode;
      var blink = 0.5 + 0.5 * Math.abs(Math.sin((state.uiAnimT || 0) * 5.5));
      var label = placeModeLabel(pm);
      var costTxt = placeModeCostTxt(pm);

      ctx.fillStyle = 'rgba(62,39,35,0.9)';
      roundRect(ph.panel.x, ph.panel.y, ph.panel.w, ph.panel.h, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,236,179,' + (0.35 + blink * 0.45) + ')';
      ctx.lineWidth = 2;
      roundRect(ph.panel.x + 1, ph.panel.y + 1, ph.panel.w - 2, ph.panel.h - 2, 7);
      ctx.stroke();

      var thumb = null;
      if (pm === 'demolish') thumb = atlas.get('demolish');
      else if (pm && typeof pm === 'object' && pm.type === BUILD.ROAD) thumb = atlas.roadSprite(0);
      else if (pm === BUILD.ROAD) thumb = atlas.roadSprite(0);
      else if (typeof pm === 'number') thumb = atlas.buildingSprite(pm, 0);
      if (thumb) {
        ctx.save();
        ctx.globalAlpha = blink;
        ctx.drawImage(thumb, ph.icon.x, ph.icon.y, ph.icon.w, ph.icon.h);
        ctx.restore();
      } else {
        ctx.fillStyle = 'rgba(255,236,179,' + blink + ')';
        roundRect(ph.icon.x, ph.icon.y, ph.icon.w, ph.icon.h, 4);
        ctx.fill();
      }

      ctx.fillStyle = '#FFECB3';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      var tip = '点选：' + label + costTxt;
      var tipMax = ph.panel.w - 52;
      if (ctx.measureText(tip).width > tipMax) tip = label + costTxt;
      fillTextEllipsis(tip, ph.panel.x + 44, ph.panel.y + ph.panel.h / 2, tipMax);

      drawBtn(ph.cancel.x, ph.cancel.y, ph.cancel.w, ph.cancel.h, '中止', '#EF9A9A');
    }

    function drawBtn(x, y, w, h, text, bg, iconId) {
      // 程序化木纹按钮（不用带底的贴图，避免白底）
      var fill = bg || '#E8D5A3';
      ctx.fillStyle = 'rgba(62,39,35,0.35)';
      roundRect(x + 1, y + 2, w, h, 8);
      ctx.fill();
      ctx.fillStyle = fill;
      roundRect(x, y, w, h, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(62,39,35,0.55)';
      ctx.lineWidth = 1.5;
      roundRect(x, y, w, h, 8);
      ctx.stroke();
      // 内侧高光
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1;
      roundRect(x + 2, y + 2, w - 4, Math.max(4, h * 0.35), 6);
      ctx.stroke();

      var icon = iconId ? atlas.get(iconId) : null;
      if (icon) {
        var ih = Math.min(22, h - 10);
        ctx.drawImage(icon, x + 8, y + (h - ih) / 2, ih, ih);
        ctx.fillStyle = '#3E2723';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x + 12 + ih, y + h / 2);
      } else {
        ctx.fillStyle = '#3E2723';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x + w / 2, y + h / 2 + 0.5);
      }
    }

    function drawPanelFrame(x, y, w, h) {
      // 半透明木色面板 + 描边（不拉伸白底弹窗图）
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      roundRect(x + 3, y + 4, w, h, 14);
      ctx.fill();
      ctx.fillStyle = 'rgba(239,235,233,0.96)';
      roundRect(x, y, w, h, 14);
      ctx.fill();
      ctx.strokeStyle = '#5D4037';
      ctx.lineWidth = 3;
      roundRect(x + 1, y + 1, w - 2, h - 2, 12);
      ctx.stroke();
      ctx.strokeStyle = '#80CBC4';
      ctx.lineWidth = 2;
      roundRect(x + 6, y + 6, w - 12, h - 12, 10);
      ctx.stroke();
    }

    function drawToastBox(x, y, w, h) {
      ctx.fillStyle = 'rgba(33, 24, 20, 0.88)';
      roundRect(x, y, w, h, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 236, 179, 0.55)';
      ctx.lineWidth = 2;
      roundRect(x + 1, y + 1, w - 2, h - 2, 11);
      ctx.stroke();
    }

    function drawSpriteFit(img, x, y, w, h) {
      if (!img) return false;
      ctx.drawImage(img, x, y, w, h);
      return true;
    }

    /** 平铺菱形格（道路/地块贴图，可高于 64×32，缩放到格） */
    function drawIsoFlat(img, cx, cy, colorFallback) {
      if (img) {
        var prev = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = true;
        var bleed = 1;
        ctx.drawImage(
          img,
          cx - ISO_W / 2 - bleed,
          cy - ISO_H / 2 - bleed * 0.5,
          ISO_W + bleed * 2,
          ISO_H + bleed
        );
        ctx.imageSmoothingEnabled = prev;
        return true;
      }
      if (colorFallback) fillIsoDiamond(cx, cy, colorFallback, 1);
      return false;
    }

    /** 以菱形中心绘制等距格（贴图脚底菱形与邻格共边） */
    function drawIsoGround(img, cx, cy, colorFallback) {
      if (img) {
        var prev = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = true;
        // 略放大 1 格像素，消除菱形格缝露底
        var bleed = 1;
        ctx.drawImage(
          img,
          cx - ISO_W / 2 - bleed,
          cy - ISO_H / 2 - bleed * 0.5,
          ISO_W + bleed * 2,
          ISO_H + bleed
        );
        ctx.imageSmoothingEnabled = prev;
        return true;
      }
      ctx.beginPath();
      ctx.moveTo(cx, cy - ISO_H / 2);
      ctx.lineTo(cx + ISO_W / 2, cy);
      ctx.lineTo(cx, cy + ISO_H / 2);
      ctx.lineTo(cx - ISO_W / 2, cy);
      ctx.closePath();
      ctx.fillStyle = colorFallback || '#7CB342';
      ctx.fill();
      return false;
    }

    function drawIsoBuilding(img, cx, cy, colorFallback, label) {
      // 贴图脚底菱形满宽 = ISO_W，与地形格严丝合缝（画布正方形等比缩放到 ISO_W）
      var spriteSize = img && img.width ? img.width : 108;
      var scale = ISO_W / spriteSize;
      var dw = spriteSize * scale;
      var dh = spriteSize * scale;
      var footY = cy + ISO_H / 2;
      if (img) {
        var prev = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(img, cx - dw / 2, footY - dh, dw, dh);
        ctx.imageSmoothingEnabled = prev;
        return true;
      }
      var topY = footY - dh * 0.72;
      ctx.beginPath();
      ctx.moveTo(cx, topY);
      ctx.lineTo(cx + ISO_W * 0.36, footY - ISO_H * 0.35);
      ctx.lineTo(cx, footY - ISO_H * 0.05);
      ctx.lineTo(cx - ISO_W * 0.36, footY - ISO_H * 0.35);
      ctx.closePath();
      ctx.fillStyle = colorFallback || '#9E9E9E';
      ctx.fill();
      if (label) {
        ctx.fillStyle = '#FFF';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, cx, footY - ISO_H * 0.55);
      }
      return false;
    }

    function fillIsoDiamond(cx, cy, color, alpha) {
      ctx.save();
      ctx.globalAlpha = alpha != null ? alpha : 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy - ISO_H / 2);
      ctx.lineTo(cx + ISO_W / 2, cy);
      ctx.lineTo(cx, cy + ISO_H / 2);
      ctx.lineTo(cx - ISO_W / 2, cy);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
    }

    function drawMapBackdrop() {
      var b = mapWorldBounds();
      var padX = ISO_W * 5;
      var padY = ISO_H * 8;
      var gx = b.minX - padX;
      var gy = b.minY - padY;
      var gw = (b.maxX - b.minX) + padX * 2;
      var gh = (b.maxY - b.minY) + padY * 2;
      ctx.fillStyle = '#5A7248';
      ctx.fillRect(gx, gy, gw, gh);
      ctx.fillStyle = 'rgba(46, 58, 38, 0.35)';
      ctx.fillRect(gx, gy, gw, gh * 0.18);
      ctx.fillRect(gx, gy + gh * 0.82, gw, gh * 0.18);
      ctx.fillRect(gx, gy, gw * 0.12, gh);
      ctx.fillRect(gx + gw * 0.88, gy, gw * 0.12, gh);
      var grass = atlas.get('terrain_0');
      if (grass) {
        var stepX = ISO_W * 0.92;
        var stepY = ISO_H * 0.92;
        for (var ty = gy; ty < gy + gh; ty += stepY) {
          for (var tx = gx; tx < gx + gw; tx += stepX) {
            ctx.globalAlpha = 0.22;
            ctx.drawImage(grass, tx - ISO_W / 2, ty - ISO_H / 2, ISO_W, ISO_H);
          }
        }
        ctx.globalAlpha = 1;
      }
    }

    function drawResidentSprite(r, wx, wy) {
      // 行走必绘；田地/园圃等格内交互必绘；仅在家休息 / 进屋 idle 时隐藏
      if (r.state === 'walk') {
        // 挑担回家等全程可见
      } else if (r._parkWaiting || r.interactMode === 'on_tile') {
        // 园圃等候、开放格内停留可见
      } else if (r.state === 'work' && (r.interactMode === 'on_tile' || !r.inside)) {
        // 下田可见
      } else if (r._homeResting && r.inside) {
        return;
      } else if (r.inside) {
        return;
      }
      var fw = 40, fh = 46;
      var dw = 32, dh = 38;
      var sheet = atlas.get('job_' + r.job + '_walk');
      var idle = atlas.get('job_' + r.job);
      var workImg = null;
      var workFrames = 1;
      var workFrame = 0;
      if ((r.celebrateT || 0) > 0) {
        workImg = atlas.get('job_' + r.job + '_celebrate');
        workFrames = workImg && workImg.width > fw ? Math.max(1, Math.floor(workImg.width / fw)) : 4;
        workFrame = Math.floor((2.2 - r.celebrateT) * 5) % workFrames;
      } else if (r.carryHarvest && r.state === 'walk') {
        workImg = atlas.get('job_' + r.job + '_carry') || atlas.get('job_farmer_carry');
        workFrames = workImg && workImg.width > fw ? Math.max(1, Math.floor(workImg.width / fw)) : 4;
        workFrame = Math.floor(r.animT || 0) % workFrames;
      } else if (r.state === 'work' && r.workPose) {
        workImg = atlas.get('job_' + r.job + '_' + r.workPose) || atlas.get('pose_' + r.workPose);
        workFrames = workImg && workImg.width > fw ? Math.max(1, Math.floor(workImg.width / fw)) : 4;
        workFrame = Math.floor(r.animT || 0) % workFrames;
      }
      var face = r.facing == null ? 1 : r.facing;
      var frame = 0;
      // 行走帧加快切换，左右脚交替更明显
      if (r.state === 'walk') frame = Math.floor((r.animT || 0) * 1.35) % 4;

      ctx.save();
      ctx.translate(wx, wy);
      if (face < 0) ctx.scale(-1, 1);
      var prev = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = true;
      var ox = -dw / 2;
      var oy = -dh + 3;
      if (workImg) {
        var bob = (workFrame % 2) ? -1 : 0;
        ctx.drawImage(workImg, workFrame * fw, 0, fw, fh, ox, oy + bob, dw, dh);
      } else if (sheet && r.state === 'walk') {
        ctx.drawImage(sheet, frame * fw, 0, fw, fh, ox, oy, dw, dh);
      } else if (idle) {
        ctx.drawImage(idle, ox, oy, dw, dh);
      } else if (sheet) {
        ctx.drawImage(sheet, 0, 0, fw, fh, ox, oy, dw, dh);
      } else {
        ctx.fillStyle = r.color;
        ctx.beginPath();
        ctx.arc(0, -7, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.imageSmoothingEnabled = prev;
      ctx.restore();
    }

    function draw() {
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.fillStyle = '#3E2723';
      ctx.fillRect(0, 0, cssW, cssH);

      // 地图（等距：按 x+y 深度排序，菱形边相接）
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, mapTop, mapW, mapH);
      ctx.clip();
      var z = getZoom();
      ctx.translate(mapW / 2, mapTop + mapH / 2);
      ctx.scale(z, z);
      ctx.translate(-state.cameraX - mapW / 2, -state.cameraY - mapH / 2);

      drawMapBackdrop();

      var reachRes = null;
      if (state.ui.info && state.ui.info.kind === 'resident' && state.ui.info.resId != null) {
        for (var ri2 = 0; ri2 < state.residents.length; ri2++) {
          if (state.residents[ri2].id === state.ui.info.resId) reachRes = state.residents[ri2];
        }
      }

      var sum, x, y;
      var depthRes = {};
      for (var ri0 = 0; ri0 < state.residents.length; ri0++) {
        var rr0 = state.residents[ri0];
        var dkey = Math.floor(rr0.x + rr0.y);
        if (!depthRes[dkey]) depthRes[dkey] = [];
        depthRes[dkey].push(rr0);
      }

      for (sum = 0; sum <= COLS + ROWS - 2; sum++) {
        for (x = 0; x < COLS; x++) {
          y = sum - x;
          if (y < 0 || y >= ROWS) continue;
          var cen = gridCellCenter(x, y);
          var cx = cen.x;
          var cy = cen.y;

          var tImg = atlas.get('terrain_' + state.terrain[y][x]);
          var b = state.building[y][x];
          var ck = key(x, y);
          var isConstructing = !!state.constructing[ck];

          // 每格先铺地形（建筑盖在上面），保证邻格边线严丝合缝
          drawIsoGround(tImg, cx, cy, TERRAIN_COLOR[state.terrain[y][x]]);

          if (isConstructing) {
            var cImg = atlas.get('constructing');
            drawIsoBuilding(cImg, cx, cy, '#FFECB3', '工');
          } else if (b === BUILD.ROAD) {
            var rImg = atlas.roadSprite(roadMask(state, x, y));
            if (!drawIsoFlat(rImg, cx, cy, '#8D6E63')) {
              fillIsoDiamond(cx, cy, '#8D6E63', 0.95);
            }
          } else if (b !== BUILD.NONE) {
            var bImg = atlas.buildingSprite(b, state.fieldStage[y][x]);
            var col = (BUILD_META[b] && BUILD_META[b].color) || '#9E9E9E';
            if (b === BUILD.HUT) col = '#A1887F';
            var name = b === BUILD.HUT ? '茅' : (BUILD_META[b] ? BUILD_META[b].name[0] : '?');
            if (b === BUILD.FIELD) name = '田' + (state.fieldStage[y][x] || 0);
            if (b === BUILD.WHOLESALER) name = '栈';
            drawIsoBuilding(bImg, cx, cy, col, name);
          }

          if (reachRes && isRoad(state, x, y)) {
            var plen = pathLenFromHome(state, reachRes, x, y);
            if (plen <= reachRes.walkRange) fillIsoDiamond(cx, cy, 'rgba(33,150,243,0.28)', 1);
          }

          var pm = state.ui.placeMode;
          if (pm && typeof pm === 'object' && pm.type === BUILD.ROAD) {
            if (canPlace(state, BUILD.ROAD, x, y, { roadLevel: pm.roadLevel || 1 })) {
              fillIsoDiamond(cx, cy, 'rgba(76,175,80,0.28)', 1);
            } else if ((state.building[y][x] === BUILD.NONE || state.building[y][x] === BUILD.ROAD) &&
                state.terrain[y][x] !== TERRAIN.WATER) {
              fillIsoDiamond(cx, cy, 'rgba(244,67,54,0.16)', 1);
            }
          } else if (typeof pm === 'number') {
            if (canPlace(state, pm, x, y)) {
              fillIsoDiamond(cx, cy, 'rgba(76,175,80,0.28)', 1);
            } else if (state.building[y][x] === BUILD.NONE && state.terrain[y][x] !== TERRAIN.WATER) {
              fillIsoDiamond(cx, cy, 'rgba(244,67,54,0.16)', 1);
            }
          } else if (pm === 'demolish' && state.building[y][x] !== BUILD.NONE) {
            fillIsoDiamond(cx, cy, 'rgba(244,67,54,0.3)', 1);
            var ham = atlas.get('demolish');
            if (ham) ctx.drawImage(ham, cx - 12, cy - 20, 24, 24);
          }
        }
        // 同深度住民画在本层建筑之后 → 走到建筑后侧会被遮挡
        var layer = depthRes[sum];
        if (layer) {
          layer.sort(function (a, b) { return (a.x + a.y) - (b.x + b.y); });
          for (var ri = 0; ri < layer.length; ri++) {
            var r = layer[ri];
            var rp = gridToWorld(r.x, r.y);
            drawResidentSprite(r, rp.x, rp.y);
          }
        }
      }

      // 放置点选标记：可放淡蓝 / 不可放淡红（再点蓝格才确认）
      if (state.ui.placeMode && state.ui.markCell) {
        var mx = state.ui.markCell.x, my = state.ui.markCell.y;
        if (inBounds(mx, my)) {
          var mcen = gridCellCenter(mx, my);
          var markOk = !!state.ui.markCell.ok;
          fillIsoDiamond(mcen.x, mcen.y, markOk ? 'rgba(100,181,246,0.55)' : 'rgba(239,154,154,0.55)', 1);
          ctx.save();
          ctx.strokeStyle = markOk ? 'rgba(33,150,243,0.95)' : 'rgba(229,57,53,0.95)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(mcen.x, mcen.y - ISO_H / 2);
          ctx.lineTo(mcen.x + ISO_W / 2, mcen.y);
          ctx.lineTo(mcen.x, mcen.y + ISO_H / 2);
          ctx.lineTo(mcen.x - ISO_W / 2, mcen.y);
          ctx.closePath();
          ctx.stroke();
          ctx.restore();
        }
      }

      // 放置预览：光标格闪烁显示将要放置的建筑
      if (state.ui.placeMode && state.ui.hoverCell) {
        var hx = state.ui.hoverCell.x, hy = state.ui.hoverCell.y;
        if (inBounds(hx, hy)) {
          var hcen = gridCellCenter(hx, hy);
          var pm2 = state.ui.placeMode;
          var blink = 0.35 + 0.45 * Math.abs(Math.sin((state.uiAnimT || 0) * 6));
          ctx.save();
          ctx.globalAlpha = blink;
          if (pm2 === 'demolish') {
            var ham2 = atlas.get('demolish');
            if (ham2) ctx.drawImage(ham2, hcen.x - 16, hcen.y - 28, 32, 32);
            else fillIsoDiamond(hcen.x, hcen.y, 'rgba(244,67,54,0.7)', 1);
          } else if (pm2 && typeof pm2 === 'object' && pm2.type === BUILD.ROAD) {
            var okRoad = canPlace(state, BUILD.ROAD, hx, hy, { roadLevel: pm2.roadLevel || 1 });
            var rPrev2 = atlas.roadSprite(0);
            if (rPrev2) ctx.drawImage(rPrev2, hcen.x - ISO_W / 2, hcen.y - ISO_H / 2, ISO_W, ISO_H);
            else fillIsoDiamond(hcen.x, hcen.y, okRoad ? '#8D6E63' : '#E57373', 0.9);
            ctx.globalAlpha = Math.min(1, blink + 0.25);
            ctx.strokeStyle = okRoad ? 'rgba(129,199,132,0.95)' : 'rgba(239,154,154,0.95)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(hcen.x, hcen.y - ISO_H / 2);
            ctx.lineTo(hcen.x + ISO_W / 2, hcen.y);
            ctx.lineTo(hcen.x, hcen.y + ISO_H / 2);
            ctx.lineTo(hcen.x - ISO_W / 2, hcen.y);
            ctx.closePath();
            ctx.stroke();
          } else if (typeof pm2 === 'number') {
            var okPlace = canPlace(state, pm2, hx, hy);
            if (pm2 === BUILD.ROAD) {
              var rPrev = atlas.roadSprite(0);
              if (rPrev) ctx.drawImage(rPrev, hcen.x - ISO_W / 2, hcen.y - ISO_H / 2, ISO_W, ISO_H);
              else fillIsoDiamond(hcen.x, hcen.y, okPlace ? '#8D6E63' : '#E57373', 0.9);
            } else {
              var bPrev = atlas.buildingSprite(pm2, 0);
              var pcol = (BUILD_META[pm2] && BUILD_META[pm2].color) || '#9E9E9E';
              if (!okPlace) ctx.globalAlpha = blink * 0.55;
              drawIsoBuilding(bPrev, hcen.x, hcen.y, okPlace ? pcol : '#E57373', BUILD_META[pm2] ? BUILD_META[pm2].name[0] : '?');
            }
            // 可放/不可放描边提示
            ctx.globalAlpha = Math.min(1, blink + 0.25);
            ctx.strokeStyle = okPlace ? 'rgba(129,199,132,0.95)' : 'rgba(239,154,154,0.95)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(hcen.x, hcen.y - ISO_H / 2);
            ctx.lineTo(hcen.x + ISO_W / 2, hcen.y);
            ctx.lineTo(hcen.x, hcen.y + ISO_H / 2);
            ctx.lineTo(hcen.x - ISO_W / 2, hcen.y);
            ctx.closePath();
            ctx.stroke();
          }
          ctx.restore();
        }
      }

      for (var fi = 0; fi < state.floatTexts.length; fi++) {
        var ft = state.floatTexts[fi];
        ctx.globalAlpha = clamp(ft.life, 0, 1);
        var fxImg = null;
        if (ft.text.indexOf('钱包') >= 0 || ft.text.indexOf('金') >= 0 || ft.text.indexOf('消费') >= 0) fxImg = atlas.get('fx_coin');
        else if (ft.text.indexOf('研策') >= 0) fxImg = atlas.get('fx_rp');
        if (fxImg) ctx.drawImage(fxImg, ft.x - 10, ft.y - 22, 16, 16);
        ctx.fillStyle = ft.color;
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.globalAlpha = 1;
      }
      ctx.restore();

      // 顶栏（程序化半透明条，不用拉伸变形的顶栏图）
      ctx.fillStyle = 'rgba(62,39,35,0.92)';
      ctx.fillRect(0, 0, cssW, mapTop);
      ctx.fillStyle = 'rgba(128,203,196,0.35)';
      ctx.fillRect(0, mapTop - 2, cssW, 2);
      var iconY = 6;
      var ix = 8;
      function topIcon(id, label) {
        var im = atlas.get(id);
        if (im) {
          ctx.drawImage(im, ix, iconY, 18, 18);
          ix += 20;
        }
        ctx.fillStyle = '#FFECB3';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(label, ix, iconY + 2);
        ix += ctx.measureText(label).width + 12;
      }
      topIcon('ui_money', '' + state.gold);
      topIcon('ui_yield', '' + state.prestige);
      ctx.fillStyle = '#FFECB3';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('全国第' + (state.nationalRank || calcNationalRank(state)) + '名', cssW - 10, 18);
      var rp = state.rp || { food: 0, war: 0, tech: 0, edu: 0 };
      topIcon('ui_research', '食' + (rp.food || 0) + '武' + (rp.war || 0) + '技' + (rp.tech || 0) + '学' + (rp.edu || 0));
      ctx.fillStyle = '#FFECB3';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(state.year + '年' + state.month + '月·第' + state.week + '周 · ' + mapDefFor(state).name, 10, 32);
      var comboCnt = 0;
      if (state.activeCombos) {
        Object.keys(state.activeCombos).forEach(function (ck) {
          if (state.activeCombos[ck]) comboCnt++;
        });
      }
      var pauR = hudPauseRect();
      var spdR = hudSpeedRect();
      var pauImg = atlas.get('ui_pause');
      var spdImg = state.speed === 3 ? atlas.get('ui_speed3')
        : (state.speed === 2 ? atlas.get('ui_speed2') : atlas.get('ui_speed1'));
      ctx.fillStyle = state.paused ? 'rgba(239,154,154,0.35)' : 'rgba(255,236,179,0.12)';
      roundRect(pauR.x, pauR.y, pauR.w, pauR.h, 6);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,236,179,0.12)';
      roundRect(spdR.x, spdR.y, spdR.w, spdR.h, 6);
      ctx.fill();
      if (pauImg) ctx.drawImage(pauImg, pauR.x + 4, pauR.y + 8, 18, 18);
      ctx.fillStyle = '#FFECB3';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(state.paused ? '继续' : '暂停', pauR.x + (pauImg ? 24 : 6), pauR.y + 22);
      if (spdImg) ctx.drawImage(spdImg, spdR.x + 4, spdR.y + 8, 18, 18);
      ctx.fillText(state.speed + 'x' + (comboCnt ? ('·巷' + comboCnt) : ''), spdR.x + (spdImg ? 24 : 6), spdR.y + 22);
      if (comboCnt > 0) {
        var badge = atlas.get('ui_combo_badge');
        if (badge) ctx.drawImage(badge, cssW - 36, 4, 28, 28);
      }

      drawPlaceModeHud();

      // 底栏操作提示（详情改弹窗，不再占底栏）
      ctx.fillStyle = 'rgba(62,39,35,0.94)';
      ctx.fillRect(0, cssH - mapBottom, cssW, mapBottom);
      ctx.fillStyle = 'rgba(255,236,179,0.35)';
      ctx.fillRect(0, cssH - mapBottom, cssW, 2);
      ctx.fillStyle = '#FFECB3';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      var textLeft = 12;
      var textMaxW = cssW - 24;
      if (state.ui.placeMode) {
        fillTextEllipsis('点选标记 · 再点蓝格确认 · 按住拖地图 · 右上中止', textLeft, cssH - mapBottom + 34, textMaxW);
      } else {
        fillTextEllipsis('画面右上菜单 · 顶栏变速 · 左下说明 · 右下返回', textLeft, cssH - mapBottom + 34, textMaxW);
      }

      // 菜单层（角按钮在菜单之后再画，保证可点）
      if (state.ui.menuOpen) {
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(0, 0, cssW, cssH);
        var panel = menuPanelRect();
        drawPanelFrame(panel.x, panel.y, panel.w, panel.h);
        ctx.fillStyle = '#3E2723';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        var title = '菜单';
        if (state.ui.page === 'build' || state.ui.page === 'build_env' || state.ui.page === 'build_shop' || state.ui.page === 'build_fac') title = '建设';
        if (state.ui.page === 'system') title = '系统';
        if (state.ui.page === 'people') title = '住民';
        if (state.ui.page === 'people_detail') title = '人物详情';
        if (state.ui.page === 'craft') title = '工巧';
        if (state.ui.page === 'combo') title = '坊巷一览';
        if (state.ui.page === 'research') title = '研究';
        ctx.fillText(title, panel.x + panel.w / 2, panel.y + 28);

        if (state.ui.page === 'main') {
          var mainIcons = { build: 'ui_icon_build', people: 'ui_icon_people', combo: 'ui_icon_combo', research: 'ui_icon_build' };
          var itemsM = currentMenuItems();
          var colsM = 3;
          var cellWM = (panel.w - 24) / colsM;
          var cellHM = 64;
          var startYM = panel.y + 48;
          for (var mi = 0; mi < itemsM.length; mi++) {
            var cm = mi % colsM;
            var rowM = (mi / colsM) | 0;
            var mx = panel.x + 12 + cm * cellWM;
            var my = startYM + rowM * (cellHM + 8);
            drawBtn(mx, my, cellWM - 6, cellHM, itemsM[mi].label, '#FFECB3', mainIcons[itemsM[mi].id] || null);
          }
        } else if (state.ui.page === 'build' || state.ui.page === 'build_env' || state.ui.page === 'build_shop' || state.ui.page === 'build_fac') {
          if (state.ui.page !== 'build') {
            if (state.ui.page === 'build_env') state.ui.buildTab = 'env';
            if (state.ui.page === 'build_shop') state.ui.buildTab = 'shop';
            if (state.ui.page === 'build_fac') state.ui.buildTab = 'fac';
            state.ui.page = 'build';
          }
          var bTab = state.ui.buildTab || 'env';
          var twB = (panel.w - 24) / 3;
          var tyB = panel.y + 42;
          drawBtn(panel.x + 12, tyB, twB - 6, 36, '环境', bTab === 'env' ? '#A5D6A7' : '#EFEBE9');
          drawBtn(panel.x + 12 + twB, tyB, twB - 6, 36, '商店', bTab === 'shop' ? '#FFCC80' : '#EFEBE9');
          drawBtn(panel.x + 12 + twB * 2, tyB, twB - 6, 36, '设施', bTab === 'fac' ? '#B0BEC5' : '#EFEBE9');
          var itemsB = currentBuildItems();
          var colsB = 3;
          var cellWB = (panel.w - 24) / colsB;
          var cellHB = 72;
          var startYB = panel.y + 88;
          for (var iB = 0; iB < itemsB.length; iB++) {
            var cB = iB % colsB;
            var rB = (iB / colsB) | 0;
            var ixB = panel.x + 12 + cB * cellWB;
            var iyB = startYB + rB * (cellHB + 8);
            if (iyB + cellHB > panel.y + panel.h - 70) break;
            var itB = itemsB[iB];
            var costTagB = '';
            if (itB.type === BUILD.ROAD) costTagB = ' ' + (ROAD_LEVEL_COST[itB.roadLevel || 1] || 15);
            else if (typeof itB.type === 'number' && BUILD_META[itB.type]) costTagB = ' ' + BUILD_META[itB.type].cost;
            var thumbB = null;
            if (itB.type === 'demolish') thumbB = atlas.get('demolish');
            else if (typeof itB.type === 'number') thumbB = atlas.buildingSprite(itB.type, 0);
            ctx.fillStyle = 'rgba(62,39,35,0.2)';
            roundRect(ixB + 1, iyB + 2, cellWB - 6, cellHB, 8);
            ctx.fill();
            ctx.fillStyle = '#FFE0B2';
            roundRect(ixB, iyB, cellWB - 6, cellHB, 8);
            ctx.fill();
            ctx.strokeStyle = 'rgba(62,39,35,0.45)';
            ctx.lineWidth = 1.5;
            roundRect(ixB, iyB, cellWB - 6, cellHB, 8);
            ctx.stroke();
            var selKeyB = itB.type === BUILD.ROAD ? ('road_' + (itB.roadLevel || 1)) : String(itB.type);
            if (state.ui.menuSelect && state.ui.menuSelect.kind === 'build' && String(state.ui.menuSelect.key) === selKeyB) {
              drawSelectGlow(ixB, iyB, cellWB - 6, cellHB);
            }
            if (thumbB) {
              ctx.drawImage(thumbB, ixB + (cellWB - 6 - 36) / 2, iyB + 4, 36, 36);
              ctx.fillStyle = '#3E2723';
              ctx.font = 'bold 11px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(itB.label + costTagB, ixB + (cellWB - 6) / 2, iyB + cellHB - 14);
            } else {
              ctx.fillStyle = '#3E2723';
              ctx.font = 'bold 13px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(itB.label + costTagB, ixB + (cellWB - 6) / 2, iyB + cellHB / 2);
            }
          }
        } else if (state.ui.page === 'research') {
          ctx.font = '12px sans-serif';
          ctx.textAlign = 'left';
          var rrp = state.rp || { food: 0, war: 0, tech: 0, edu: 0 };
          var rca = getCityAttr(state);
          ctx.fillStyle = '#3E2723';
          ctx.fillText('研策 食' + rrp.food + ' 武' + rrp.war + ' 技' + rrp.tech + ' 学' + rrp.edu,
            panel.x + 20, panel.y + 48);
          ctx.font = '10px sans-serif';
          ctx.fillText('城市属性 食' + (rca.food | 0) + ' 武' + (rca.war | 0) + ' 技' + (rca.tech | 0) + ' 学' + (rca.edu | 0) +
            ' · 石高' + Math.floor(state.prestige || 0),
            panel.x + 20, panel.y + 64);
          if (state.researching && state.researching.id) {
            var rj = state.researching;
            var rpct = Math.min(100, Math.floor((rj.t / rj.dur) * 100));
            ctx.fillStyle = '#1565C0';
            ctx.font = 'bold 11px sans-serif';
            ctx.fillText('进行中：' + (rj.name || rj.id) + ' ' + rpct + '%', panel.x + 20, panel.y + 78);
          }
          var rmD = researchListMetrics(panel);
          ctx.save();
          ctx.beginPath();
          ctx.rect(panel.x + 10, rmD.viewTop, panel.w - 20, rmD.viewH);
          ctx.clip();
          for (var uix = 0; uix < RESEARCH_UNLOCKS.length; uix++) {
            var u = RESEARCH_UNLOCKS[uix];
            var unlocked = !!state.unlocked[u.id];
            var block = researchBlockReason(state, u);
            var canDo = !unlocked && !block;
            var isDoing = !!(state.researching && state.researching.id === u.id);
            var ry = rmD.viewTop + uix * rmD.rowH - rmD.scroll;
            if (ry + 44 < rmD.viewTop || ry > rmD.viewTop + rmD.viewH) continue;
            if (unlocked) ctx.fillStyle = '#C8E6C9';
            else if (isDoing) ctx.fillStyle = '#BBDEFB';
            else if (canDo) ctx.fillStyle = '#FFE0B2';
            else ctx.fillStyle = '#BDBDBD';
            roundRect(panel.x + 16, ry, panel.w - 32, 44, 8);
            ctx.fill();
            if (state.ui.menuSelect && state.ui.menuSelect.kind === 'research' && state.ui.menuSelect.key === u.id) {
              drawSelectGlow(panel.x + 16, ry, panel.w - 32, 44);
            }
            var uImg = u.build != null ? atlas.buildingSprite(u.build) : (u.roadLevel ? atlas.roadSprite(0) : null);
            if (uImg) {
              ctx.save();
              if (!canDo && !unlocked && !isDoing) ctx.globalAlpha = 0.4;
              ctx.drawImage(uImg, panel.x + panel.w - 56, ry + 6, 32, 32);
              ctx.restore();
            }
            ctx.fillStyle = (canDo || unlocked || isDoing) ? '#3E2723' : '#757575';
            ctx.font = 'bold 12px sans-serif';
            var titleU = (unlocked ? '✓ ' : (isDoing ? '… ' : '')) + u.name;
            if (unlocked) titleU += ' · 已解锁';
            else if (isDoing) {
              var pctR = Math.min(99, Math.floor((state.researching.t / state.researching.dur) * 100));
              titleU += ' · 研究中 ' + pctR + '%';
            } else if (block) titleU += ' · ' + block;
            fillTextEllipsis(titleU, panel.x + 28, ry + 14, panel.w - 90);
            ctx.font = '10px sans-serif';
            if (isDoing) {
              var bw = panel.w - 100;
              var bh = 8;
              var bx = panel.x + 28;
              var by = ry + 30;
              ctx.fillStyle = 'rgba(62,39,35,0.2)';
              roundRect(bx, by, bw, bh, 3);
              ctx.fill();
              var fillW = bw * Math.min(1, state.researching.t / state.researching.dur);
              ctx.fillStyle = '#42A5F5';
              roundRect(bx, by, Math.max(2, fillW), bh, 3);
              ctx.fill();
            } else {
              ctx.fillText('耗 食' + u.cost.food + ' 武' + u.cost.war + ' 技' + u.cost.tech + ' 学' + u.cost.edu,
                panel.x + 28, ry + 34);
            }
          }
          ctx.restore();
          if (rmD.maxScroll > 0) {
            ctx.fillStyle = 'rgba(62,39,35,0.45)';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('↕ 滑动/滚轮浏览（' + (Math.floor(rmD.scroll) + 1) + '/' + Math.ceil(rmD.maxScroll + rmD.viewH) + '）',
              panel.x + panel.w / 2, panel.y + panel.h - 28);
            var barH = Math.max(24, rmD.viewH * (rmD.viewH / rmD.contentH));
            var barY = rmD.viewTop + (rmD.viewH - barH) * (rmD.scroll / rmD.maxScroll);
            ctx.fillStyle = 'rgba(62,39,35,0.2)';
            roundRect(panel.x + panel.w - 10, rmD.viewTop, 4, rmD.viewH, 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(62,39,35,0.55)';
            roundRect(panel.x + panel.w - 10, barY, 4, barH, 2);
            ctx.fill();
          }
        } else if (state.ui.page === 'people') {
          var peopleRowH = 72;
          var iconBoxW = 40;
          var iconBoxH = 48;
          var textX = panel.x + 16 + iconBoxW + 10;
          var textMaxW = panel.w - (textX - panel.x) - 24;
          for (var pi = 0; pi < state.residents.length; pi++) {
            var pr = state.residents[pi];
            ensureResidentFields(pr);
            var st2 = pr.stats || { int: 15, loy: 40, apl: 15, skl: 15 };
            var jl2 = pr.jobLevels || {};
            var yldP = residentWeeklyYield(state, pr);
            var rowY = panel.y + 48 + pi * peopleRowH;
            ctx.fillStyle = pi % 2 ? 'rgba(188,170,164,0.18)' : 'rgba(255,255,255,0.35)';
            roundRect(panel.x + 12, rowY + 4, panel.w - 24, peopleRowH - 8, 6);
            ctx.fill();
            var iconX = panel.x + 16;
            var iconY = rowY + 8 + (peopleRowH - 8 - iconBoxH) / 2;
            ctx.fillStyle = 'rgba(62,39,35,0.08)';
            roundRect(iconX, iconY, iconBoxW, iconBoxH, 4);
            ctx.fill();
            var pj = atlas.get('job_' + pr.job) || atlas.get('job_' + pr.job + '_walk');
            if (pj) {
              var cfw = 40, cfh = 46;
              if (pj.width >= cfw * 2) {
                ctx.drawImage(pj, 0, 0, cfw, cfh, iconX + 4, iconY + 2, iconBoxW - 8, iconBoxH - 4);
              } else if (pj.width >= 180) {
                ctx.drawImage(pj, 0, 0, 48, 56, iconX + 4, iconY + 2, iconBoxW - 8, iconBoxH - 4);
              } else {
                ctx.drawImage(pj, iconX + 4, iconY + 2, iconBoxW - 8, iconBoxH - 4);
              }
            }
            ctx.fillStyle = '#3E2723';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.font = 'bold 12px sans-serif';
            fillTextEllipsis((pr.name || ('#' + (pr.id + 1))) + ' · ' + jobLabel(pr.job) +
              '  钱' + pr.wallet + '  俸' + yldP, textX, rowY + 10, textMaxW);
            ctx.font = '10px sans-serif';
            fillTextEllipsis('农' + (jl2.farmer || 0) + ' 匠' + (jl2.artisan || 0) + ' 商' + (jl2.merchant || 0) +
              ' 甲' + (jl2.warrior || 0) + ' 幕' + (jl2.retainer || 0) + ' · 宅(' + pr.homeX + ',' + pr.homeY + ')',
              textX, rowY + 28, textMaxW);
            fillTextEllipsis('知' + Math.floor(st2.int) + ' 忠' + Math.floor(st2.loy) +
              ' 魅' + Math.floor(st2.apl) + ' 才' + Math.floor(st2.skl) + ' · 点开详情',
              textX, rowY + 44, textMaxW);
          }
          if (!state.residents.length) {
            ctx.font = '12px sans-serif';
            ctx.fillText('尚无住民', panel.x + 24, panel.y + 70);
          }
          ctx.fillStyle = '#5D4037';
          ctx.font = '11px sans-serif';
          ctx.fillText('点选住民查看详情 · 转职需州城且耗' + JOB_CHANGE_COST + '金' +
            (hasCastle(state) ? '' : ' · 尚未建州城'),
            panel.x + 20, panel.y + panel.h - 78);
        } else if (state.ui.page === 'people_detail') {
          var pd = findResidentById(state.ui.detailResId);
          if (!pd) {
            ctx.fillStyle = '#5D4037';
            ctx.font = '13px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('该住民已迁出或不存在', panel.x + 20, panel.y + 60);
          } else {
            ensureResidentFields(pd);
            var pst = pd.stats || { int: 15, loy: 40, apl: 15, skl: 15 };
            var pjl = pd.jobLevels || {};
            var pyld = residentWeeklyYield(state, pd);
            var pjIcon = atlas.get('job_' + pd.job) || atlas.get('job_' + pd.job + '_walk');
            if (pjIcon) {
              ctx.drawImage(pjIcon, 0, 0, Math.min(48, pjIcon.width), Math.min(56, pjIcon.height),
                panel.x + 20, panel.y + 44, 48, 56);
            }
            ctx.fillStyle = '#3E2723';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.font = 'bold 15px sans-serif';
            ctx.fillText(pd.name || ('住民' + (pd.id + 1)), panel.x + 80, panel.y + 48);
            ctx.font = '12px sans-serif';
            ctx.fillStyle = '#5D4037';
            ctx.fillText(jobLabel(pd.job) + ' · 宅(' + pd.homeX + ',' + pd.homeY + ')', panel.x + 80, panel.y + 70);
            ctx.fillText('钱包 ' + pd.wallet + ' · 周俸禄 ' + pyld + ' · ' + vehicleLabel(pd.vehicle) + pd.walkRange,
              panel.x + 80, panel.y + 90);
            ctx.font = '11px sans-serif';
            ctx.fillText('职业等级 农' + (pjl.farmer || 0) + ' 匠' + (pjl.artisan || 0) + ' 商' + (pjl.merchant || 0) +
              ' 甲' + (pjl.warrior || 0) + ' 幕' + (pjl.retainer || 0), panel.x + 20, panel.y + 120);
            ctx.fillText('知惠 ' + Math.floor(pst.int) + '　忠诚 ' + Math.floor(pst.loy) +
              '　魅力 ' + Math.floor(pst.apl) + '　才能 ' + Math.floor(pst.skl), panel.x + 20, panel.y + 142);
            ctx.fillStyle = '#8D6E63';
            ctx.fillText('满意度不显示 · 无手动驱逐 · 属性会随访问浮动', panel.x + 20, panel.y + 166);
            var nxtPd = nextJobCandidate(state, pd);
            var btnW2 = (panel.w - 40) / 2;
            var by1 = panel.y + panel.h - 170;
            drawBtn(panel.x + 14, by1, btnW2, 40,
              nxtPd ? ('转' + jobLabel(nxtPd)) : '转职', hasCastle(state) && nxtPd ? '#EF9A9A' : '#B0BEC5');
            drawBtn(panel.x + 22 + btnW2, by1, btnW2, 40, '用工艺',
              (state.craftStock && state.craftStock.length) ? '#CE93D8' : '#B0BEC5');
            drawBtn(panel.x + 14, by1 + 48, btnW2, 40, '追踪', '#90CAF9');
            drawBtn(panel.x + 22 + btnW2, by1 + 48, btnW2, 40, '跳转住宅', '#A5D6A7');
            drawBtn(panel.x + 14, by1 + 96, panel.w - 28, 40, '返回列表', '#FFE0B2');
          }
        } else if (state.ui.page === 'craft') {
          ctx.font = '11px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillStyle = '#5D4037';
          ctx.fillText('匠人货栈工作可发现 · 消耗研策制作 · 点击下方使用', panel.x + 16, panel.y + 52);
          ctx.fillText('已发现 ' + (state.craftDiscovered || []).length + '/' + CRAFT_DEFS.length, panel.x + 16, panel.y + 68);
          var craftStart = panel.y + 78;
          var shown = 0;
          for (var cix = 0; cix < CRAFT_DEFS.length; cix++) {
            var cd = CRAFT_DEFS[cix];
            if (state.craftDiscovered.indexOf(cd.id) < 0) continue;
            var crow = (shown / 2) | 0;
            var ccol = shown % 2;
            var cw = (panel.w - 40) / 2;
            var cx3 = panel.x + 16 + ccol * (cw + 8);
            var cy3 = craftStart + crow * 52;
            drawBtn(cx3, cy3, cw, 40, cd.name + ' 制', '#FFE0B2');
            if (state.ui.menuSelect && state.ui.menuSelect.kind === 'craft' && state.ui.menuSelect.key === cd.id) {
              drawSelectGlow(cx3, cy3, cw, 40);
            }
            shown++;
          }
          if (!shown) ctx.fillText('尚无工巧，派匠人去货栈吧', panel.x + 20, craftStart + 20);
          ctx.fillStyle = '#3E2723';
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText('库存', panel.x + 16, panel.y + panel.h - 174);
          var stock = state.craftStock || [];
          for (var sti = 0; sti < stock.length && sti < 3; sti++) {
            var def = craftDefById(stock[sti].id);
            var cuy = panel.y + panel.h - 160 + sti * 36;
            drawBtn(panel.x + 16, cuy, panel.w - 32, 32,
              '用 ' + (def ? def.name : '?'), '#A5D6A7');
            if (state.ui.menuSelect && state.ui.menuSelect.kind === 'craft_use' && state.ui.menuSelect.key === ('use_' + sti)) {
              drawSelectGlow(panel.x + 16, cuy, panel.w - 32, 32);
            }
          }
          if (!stock.length) ctx.fillText('（空）', panel.x + 24, panel.y + panel.h - 140);
        } else if (state.ui.page === 'combo') {
          ctx.font = '13px sans-serif';
          ctx.textAlign = 'left';
          var cy0 = panel.y + 48;
          var comboRowH = 44;
          for (var cdi = 0; cdi < COMBO_DEFS.length; cdi++) {
            var cdef = COMBO_DEFS[cdi];
            var cActive = state.activeCombos && state.activeCombos[cdef.id];
            ctx.fillStyle = cActive ? '#C8E6C9' : '#FFE0B2';
            roundRect(panel.x + 12, cy0 + cdi * comboRowH, panel.w - 24, comboRowH - 6, 8);
            ctx.fill();
            ctx.fillStyle = '#3E2723';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText((cActive ? '★ ' : '') + cdef.name, panel.x + 20, cy0 + cdi * comboRowH + 16);
            ctx.font = '11px sans-serif';
            var cNames = cdef.types.map(function (t) { return BUILD_META[t] ? BUILD_META[t].name : '?'; }).join('·');
            ctx.fillText(cNames + ' ≤3格 · 声望+' + Math.floor(cdef.yield * 100) + '%', panel.x + 20, cy0 + cdi * comboRowH + 32);
          }
          if (state.traveler) {
            ctx.fillStyle = '#5D4037';
            ctx.font = '11px sans-serif';
            ctx.fillText('客旅「' + state.traveler.name + '」' + state.traveler.progress + '/' + state.traveler.max + ' · 剩' + state.traveler.weeksLeft + '周',
              panel.x + 16, panel.y + panel.h - 88);
          } else if (hasInn(state)) {
            ctx.fillText('客栈营业，客旅将随机来访', panel.x + 16, panel.y + panel.h - 88);
          }
        } else {
          var items = currentMenuItems();
          var cols = 3;
          var cellW = (panel.w - 24) / cols;
          var cellH = (state.ui.page === 'build_env' || state.ui.page === 'build_shop' || state.ui.page === 'build_fac') ? 72 : 56;
          var startY = panel.y + 48;
          for (var i = 0; i < items.length; i++) {
            var c = i % cols;
            var row = (i / cols) | 0;
            var ix2 = panel.x + 12 + c * cellW;
            var iy = startY + row * (cellH + 8);
            var it = items[i];
            var costTag = (typeof it.type === 'number' && BUILD_META[it.type]) ? (' ' + BUILD_META[it.type].cost) : '';
            var thumb = null;
            if (it.type === 'demolish') thumb = atlas.get('demolish');
            else if (typeof it.type === 'number') thumb = atlas.buildingSprite(it.type, 0);

            var btnBg = null;
            // 建造格：程序化底，避免白底按钮贴图
            ctx.fillStyle = 'rgba(62,39,35,0.2)';
            roundRect(ix2 + 1, iy + 2, cellW - 6, cellH, 8);
            ctx.fill();
            ctx.fillStyle = '#FFE0B2';
            roundRect(ix2, iy, cellW - 6, cellH, 8);
            ctx.fill();
            ctx.strokeStyle = 'rgba(62,39,35,0.45)';
            ctx.lineWidth = 1.5;
            roundRect(ix2, iy, cellW - 6, cellH, 8);
            ctx.stroke();
            if (state.ui.menuSelect && state.ui.menuSelect.kind === 'build' && String(state.ui.menuSelect.key) === String(it.type)) {
              drawSelectGlow(ix2, iy, cellW - 6, cellH);
            }
            if (thumb) {
              ctx.drawImage(thumb, ix2 + (cellW - 6 - 36) / 2, iy + 4, 36, 36);
              ctx.fillStyle = '#3E2723';
              ctx.font = 'bold 11px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(it.label + costTag, ix2 + (cellW - 6) / 2, iy + cellH - 14);
            } else {
              ctx.fillStyle = '#3E2723';
              ctx.font = 'bold 13px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(it.label + costTag, ix2 + (cellW - 6) / 2, iy + cellH / 2);
            }
          }
        }
      }

      // 建设二次确认弹窗
      if (state.ui.buildConfirm != null) {
        var bcType = state.ui.buildConfirm;
        var bc = buildConfirmRect();
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, cssW, cssH);
        drawPanelFrame(bc.x, bc.y, bc.w, bc.h);
        var bcName = bcType === 'demolish' ? '拆除' : (BUILD_META[bcType] ? BUILD_META[bcType].name : '建造');
        var bcMeta = bcType === 'demolish' ? null : BUILD_META[bcType];
        ctx.fillStyle = '#3E2723';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(bcName, bc.x + bc.w / 2, bc.y + 30);
        var bcThumb = null;
        if (bcType === 'demolish') bcThumb = atlas.get('demolish');
        else if (bcType === BUILD.ROAD) bcThumb = atlas.roadSprite(0);
        else if (typeof bcType === 'number') bcThumb = atlas.buildingSprite(bcType, 0);
        if (bcThumb) {
          ctx.drawImage(bcThumb, bc.x + (bc.w - 72) / 2, bc.y + 42, 72, 72);
        } else {
          ctx.fillStyle = '#FFE0B2';
          roundRect(bc.x + (bc.w - 72) / 2, bc.y + 42, 72, 72, 8);
          ctx.fill();
        }
        ctx.fillStyle = '#5D4037';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'left';
        var bcLines = [];
        if (bcType === 'demolish') {
          bcLines = ['进入拆除模式后，点击地图上的建筑拆除。', '拆除返还部分造价。'];
        } else if (bcMeta) {
          bcLines = [
            '造价 ' + bcMeta.cost + ' 金 · 维护 ' + bcMeta.maint + '/月',
            '声望贡献约 ' + (bcMeta.yield || 0),
            bcMeta.priceMax > 0
              ? ('住民消费 ' + bcMeta.priceMin + '~' + bcMeta.priceMax + ' 金，入城镇金库')
              : '确认后进入地图放置'
          ];
        }
        var bcTy = bc.y + 130;
        for (var bli = 0; bli < bcLines.length; bli++) {
          wrapText(bcLines[bli], bc.x + bc.w / 2, bcTy, bc.w - 40, 16);
          bcTy += 36;
        }
        var btnY = bc.y + bc.h - 56;
        var btnW = (bc.w - 36) / 2;
        drawBtn(bc.x + 12, btnY, btnW, 40, '取消', '#BCAAA4');
        drawBtn(bc.x + 24 + btnW, btnY, btnW, 40, '放置', '#A5D6A7');
      }

      // 点击物体详情弹窗（暂停中）
      if (state.ui.detailOpen && state.ui.info) {
        var ip = infoPopupRect();
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, cssW, cssH);
        drawPanelFrame(ip.x, ip.y, ip.w, ip.h);
        ctx.fillStyle = '#3E2723';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(state.ui.info.title || '说明', ip.x + ip.w / 2, ip.y + 28);
        var infoThumb = null;
        if (state.ui.info.kind === 'resident' && state.ui.info.job) {
          infoThumb = atlas.get('job_' + state.ui.info.job);
        } else if (state.ui.info.x != null && state.ui.info.y != null) {
          var ib = state.building[state.ui.info.y][state.ui.info.x];
          if (ib === BUILD.ROAD) infoThumb = atlas.roadSprite(roadMask(state, state.ui.info.x, state.ui.info.y));
          else if (ib !== BUILD.NONE) infoThumb = atlas.buildingSprite(ib, state.fieldStage[state.ui.info.y][state.ui.info.x] || 0);
        }
        if (infoThumb) {
          ctx.drawImage(infoThumb, ip.x + (ip.w - 56) / 2, ip.y + 40, 56, 56);
        }
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        var details = state.ui.info.detail || state.ui.info.lines || [];
        var dyText = ip.y + (infoThumb ? 110 : 58);
        for (var di = 0; di < details.length; di++) {
          wrapText(details[di], ip.x + ip.w / 2, dyText, ip.w - 36, 17);
          dyText += 40;
        }
        ctx.fillStyle = '#5D4037';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('点击任意处关闭 · 游戏已暂停', ip.x + ip.w / 2, ip.y + ip.h - 22);
      }

      // S5 报纸：年贡 / 排名
      if (state.ui.reportOpen && state.ui.report) {
        var rr = reportPopupRect();
        var rep = state.ui.report;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, 0, cssW, cssH);
        drawPanelFrame(rr.x, rr.y, rr.w, rr.h);
        ctx.fillStyle = '#3E2723';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(rep.title || '蜀报', rr.x + rr.w / 2, rr.y + 30);
        ctx.fillStyle = '#5D4037';
        ctx.font = '13px sans-serif';
        var rTy = rr.y + 58;
        var rLines = rep.lines || [];
        for (var rli = 0; rli < rLines.length; rli++) {
          wrapText(rLines[rli], rr.x + rr.w / 2, rTy, rr.w - 36, 16);
          rTy += 34;
        }
        if (rep.amount != null) {
          ctx.fillStyle = '#2E7D32';
          ctx.font = 'bold 15px sans-serif';
          ctx.fillText('+' + rep.amount + ' 金', rr.x + rr.w / 2, rTy + 4);
        }
        drawBtn(rr.x + 16, rr.y + rr.h - 52, rr.w - 32, 40, '阅毕', '#FFE082');
      }

      // S5 青荷教程
      if (state.ui.tutorial) {
        var tr = tutorialPopupRect();
        var step = TUTORIAL_STEPS[state.ui.tutorial.step] || TUTORIAL_STEPS[0];
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, 0, cssW, cssH);
        drawPanelFrame(tr.x, tr.y, tr.w, tr.h);
        ctx.fillStyle = '#3E2723';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(step.title, tr.x + tr.w / 2, tr.y + 28);
        ctx.fillStyle = '#6D4C41';
        ctx.font = '11px sans-serif';
        ctx.fillText('助手青荷 · ' + (state.ui.tutorial.step + 1) + '/' + TUTORIAL_STEPS.length, tr.x + tr.w / 2, tr.y + 46);
        ctx.fillStyle = '#5D4037';
        ctx.font = '13px sans-serif';
        wrapText(step.body, tr.x + tr.w / 2, tr.y + 100, tr.w - 40, 18);
        var tHalf = (tr.w - 40) / 2;
        var tBy = tr.y + tr.h - 56;
        drawBtn(tr.x + 12, tBy, tHalf, 40, '跳过', '#BCAAA4');
        var nextLabel = state.ui.tutorial.step >= TUTORIAL_STEPS.length - 1 ? '开始' : '下一步';
        drawBtn(tr.x + 28 + tHalf, tBy, tHalf, 40, nextLabel, '#A5D6A7');
      }

      // 菜单选中简要说明（弹窗底部）
      if (state.ui.menuOpen) {
        drawMenuSelectBlurb(menuPanelRect());
      }

      // 右上菜单 + 左下说明 + 右下返回/关闭（盖在菜单上）
      if (!state.ui.placeMode && !state.ui.tutorial) {
        var menuR = hudMenuRect();
        drawBtn(menuR.x, menuR.y, menuR.w, menuR.h, '菜单', '#FFE082', 'ui_icon_menu');
      }
      if (state.ui.menuSelect && state.ui.menuSelect.detail && state.ui.menuSelect.detail.length &&
          !state.ui.detailOpen && !state.ui.reportOpen && !state.ui.tutorial) {
        var er = hudExplainRect();
        drawBtn(er.x, er.y, er.w, er.h, '说明', '#81D4FA');
      }
      var na = navAction();
      if (na && !state.ui.tutorial) {
        var nr = hudNavRect();
        drawBtn(nr.x, nr.y, nr.w, nr.h, na.label, '#BCAAA4');
      }

      if (state.toast) {
        var tw = Math.min(cssW - 24, 320);
        var th = 44;
        var tx = (cssW - tw) / 2;
        var ty = mapTop + 4;
        drawToastBox(tx, ty, tw, th);
        ctx.fillStyle = '#FFF8E1';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        wrapText(state.toast, cssW / 2, ty + th / 2, tw - 16, 15);
      }
    }

    function wrapText(text, x, y, maxW, lineH) {
      var chars = text.split('');
      var line = '';
      var lines = [];
      for (var i = 0; i < chars.length; i++) {
        var test = line + chars[i];
        if (ctx.measureText(test).width > maxW && line) {
          lines.push(line);
          line = chars[i];
        } else line = test;
      }
      if (line) lines.push(line);
      var startY = y - (lines.length - 1) * lineH / 2;
      for (var j = 0; j < lines.length; j++) ctx.fillText(lines[j], x, startY + j * lineH);
    }

    function fillTextEllipsis(text, x, y, maxW) {
      if (!text) return;
      if (ctx.measureText(text).width <= maxW) {
        ctx.fillText(text, x, y);
        return;
      }
      var s = text;
      while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
      ctx.fillText(s + '…', x, y);
    }

    var last = Date.now();
    function frame() {
      var now = Date.now();
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      update(dt);
      draw();
      if (options.requestFrame) options.requestFrame(frame);
      else requestAnimationFrame(frame);
    }

    function onWheel(sx, sy, deltaY) {
      if (state.ui.menuOpen && state.ui.page === 'research') {
        var p = menuPanelRect();
        if (sx >= p.x && sx <= p.x + p.w && sy >= p.y && sy <= p.y + p.h) {
          var rm = researchListMetrics(p);
          state.ui.researchScroll = clamp((state.ui.researchScroll || 0) + (deltaY > 0 ? 40 : -40), 0, rm.maxScroll);
          return;
        }
      }
      if (sy < mapTop || sy > cssH - mapBottom) return;
      var factor = deltaY > 0 ? 0.9 : 1.1;
      zoomAt(sx, sy, getZoom() * factor);
    }

    showToast(state, 'S5：教程/报纸/顶栏变速/音效已开放', 1.6);
    startTutorial(false);

    state.nationalRank = calcNationalRank(state);
    recalcPrestige(state);

    return {
      resize: function (w, h, ratio) {
        resize(w, h, ratio);
        clampCam();
      },
      start: function () { last = Date.now(); frame(); },
      pointerDown: onPointerDown,
      pointerMove: onPointerMove,
      pointerUp: onPointerUp,
      wheel: onWheel,
      zoomAt: function (sx, sy, z) { zoomAt(sx, sy, z); },
      getZoom: getZoom,
      getState: function () { return state; },
      getAtlas: function () { return atlas; },
      save: function () { return saveGame(state, options.storage); },
      load: function () { return loadGame(state, options.storage); }
    };
  }

  root.DashuS1 = {
    createGame: createGame,
    COLS: COLS,
    ROWS: ROWS
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = root.DashuS1;
  }
})(
  typeof GameGlobal !== 'undefined' ? GameGlobal :
  (typeof globalThis !== 'undefined' ? globalThis : this)
);
