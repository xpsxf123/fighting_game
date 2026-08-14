/* 快速回归：住民能否走出家门并进入 walk */
var fs = require('fs');
var path = require('path');
var code = fs.readFileSync(path.join(__dirname, '../js/game-core.js'), 'utf8');
var root = {};
var fn = new Function('root', code.replace(/^\(function \(root\) \{/, '').replace(/\}\)\(\s*typeof[\s\S]*$/, ''));
// game-core is IIFE - just eval with mock
var g = { document: null };
try {
  eval(code);
} catch (e) {
  console.error('eval fail', e.message);
  process.exit(1);
}
var Dashu = root.DashuS1 || global.DashuS1 || globalThis.DashuS1;
if (!Dashu) {
  // attach via this
  var box = {};
  (function (root) {
    eval(code.slice(code.indexOf("'use strict'"), code.lastIndexOf('})(')));
  })(box);
}
console.log('keys', Object.keys(globalThis).filter(function (k) { return k.indexOf('Dashu') >= 0; }));
