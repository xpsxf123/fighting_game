/**
 * 微信小游戏入口
 * 用微信开发者工具打开本目录（dashu-town）
 */
var canvas = wx.createCanvas();
var sys = wx.getSystemInfoSync();
var dpr = Math.min(sys.pixelRatio || 2, 2);
var W = sys.windowWidth;
var H = sys.windowHeight;

require('./js/game-core.js');

var Dashu = (typeof GameGlobal !== 'undefined' && GameGlobal.DashuS1) ? GameGlobal.DashuS1 : DashuS1;

var game = Dashu.createGame({
  canvas: canvas,
  width: W,
  height: H,
  dpr: dpr,
  assetBase: 'assets/',
  createImage: function () {
    return canvas.createImage ? canvas.createImage() : new Image();
  },
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
