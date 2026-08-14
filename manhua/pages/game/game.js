var DashuS1 = require('../../dashu-town/js/game-core.js');

Page({
  data: {},
  game: null,
  canvas: null,
  _raf: null,

  onReady: function () {
    var that = this;
    var query = wx.createSelectorQuery();
    query
      .select('#game')
      .fields({ node: true, size: true })
      .exec(function (res) {
        if (!res || !res[0] || !res[0].node) {
          wx.showToast({ title: 'Canvas 初始化失败', icon: 'none' });
          return;
        }
        var canvas = res[0].node;
        var width = res[0].width;
        var height = res[0].height;
        var sys = wx.getSystemInfoSync();
        var dpr = Math.min(sys.pixelRatio || 2, 2);

        canvas.width = width * dpr;
        canvas.height = height * dpr;

        that.canvas = canvas;
        that.game = DashuS1.createGame({
          canvas: canvas,
          width: width,
          height: height,
          dpr: dpr,
          assetBase: '/dashu-town/assets/',
          createImage: function () {
            return canvas.createImage();
          },
          requestFrame: function (cb) {
            that._raf = canvas.requestAnimationFrame(cb);
          }
        });
        that.game.start();
      });
  },

  onUnload: function () {
    if (this.canvas && this._raf && this.canvas.cancelAnimationFrame) {
      this.canvas.cancelAnimationFrame(this._raf);
    }
    this.game = null;
  },

  _pos: function (e) {
    var t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
    if (!t) return null;
    // x/y 相对页面；canvas 全屏时可用 clientX/Y 或 x/y
    return {
      x: typeof t.x === 'number' ? t.x : t.clientX,
      y: typeof t.y === 'number' ? t.y : t.clientY
    };
  },

  onTouchStart: function (e) {
    if (!this.game) return;
    var p = this._pos(e);
    if (p) this.game.pointerDown(p.x, p.y);
  },

  onTouchMove: function (e) {
    if (!this.game) return;
    var p = this._pos(e);
    if (p) this.game.pointerMove(p.x, p.y);
  },

  onTouchEnd: function (e) {
    if (!this.game) return;
    var p = this._pos(e);
    if (p) this.game.pointerUp(p.x, p.y);
  }
});
