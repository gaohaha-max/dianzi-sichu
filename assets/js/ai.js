/* ai.js —— 搭配/识别：优先 AI（预留密钥），失败降级内置规则引擎 */
(function (global) {
  'use strict';

  // 识别：无密钥时返回 null，由页面开放手动录入
  function recognize() {
    // TODO: 接入图像识别 API（设置 AI_KEY 后启用）。当前无密钥，直接降级。
    return Promise.resolve(null);
  }

  // 规则引擎：按风格关键词给菜谱打分，拼出均衡套餐
  function match(recipes, styleName) {
    var styles = Store.get('style_presets');
    var style = styles.filter(function (s) { return s.name === styleName; })[0];
    var kws = style ? (style.keywords || []) : [];

    function score(r) {
      var txt = [r.name, r.category, (r.scene || []).join(','), (r.tags || []).join(',')].join(' ');
      var s = 0;
      kws.forEach(function (k) { if (txt.indexOf(k) >= 0) s += 2; });
      // 轻度随机，保证同一风格多次结果有变化但不离谱
      s += Math.random() * 0.5;
      return s;
    }
    var ranked = recipes.map(function (r) { return { r: r, s: score(r) }; })
      .sort(function (a, b) { return b.s - a.s; });

    // 拼盘：主食/汤羹 + 主菜 + 配菜/小食，尽量取前 3
    var picks = [];
    var byCat = function (cat) { return ranked.filter(function (x) { return x.r.category === cat && picks.indexOf(x.r) < 0; }); };
    var staples = byCat('主食').concat(byCat('汤羹'));
    var mains = ranked.filter(function (x) { return x.r.category !== '主食' && x.r.category !== '汤羹' && picks.indexOf(x.r) < 0; });
    if (staples[0]) picks.push(staples[0].r);
    if (mains[0]) picks.push(mains[0].r);
    if (mains[1]) picks.push(mains[1].r);
    if (!picks.length && ranked[0]) picks.push(ranked[0].r);
    return picks.map(function (r) { return r._id; });
  }

  function recommendCombo(recipes, styleName) {
    // 无密钥：直接规则引擎
    return Promise.resolve({ ids: match(recipes, styleName), engine: 'rule' });
  }

  global.AI = { recognize: recognize, recommendCombo: recommendCombo, match: match };
})(window);
