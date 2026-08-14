/**
 * 仓库根目录小游戏入口（解决打开 manhua 根目录时报缺少 app.json）
 * 真正逻辑在 dashu-town/js/game-core.js
 */
var canvas = wx.createCanvas();
var sys = wx.getSystemInfoSync();
var dpr = Math.min(sys.pixelRatio || 2, 2);
var W = sys.windowWidth;
var H = sys.windowHeight;

require('./dashu-town/js/game-core.js');

var Dashu = (typeof GameGlobal !== 'undefined' && GameGlobal.DashuS1)
  ? GameGlobal.DashuS1
  : (typeof DashuS1 !== 'undefined' ? DashuS1 : null);

if (!Dashu) {
  console.error('[大蜀国] DashuS1 未加载，请检查 dashu-town/js/game-core.js');
} else {
  var game = Dashu.createGame({
    canvas: canvas,
    width: W,
    height: H,
    dpr: dpr,
    requestFrame: function (cb) {
      if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(cb);
      else setTimeout(cb, 16);
    }
  });

  wx.onTouchStart(function (e) {
    var t = e.touches[0];
    game.pointerDown(t.clientX, t.clientY);
  });
  wx.onTouchMove(function (e) {
    var t = e.touches[0];
    game.pointerMove(t.clientX, t.clientY);
  });
  wx.onTouchEnd(function (e) {
    var t = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
    if (t) game.pointerUp(t.clientX, t.clientY);
  });

  game.start();
}
