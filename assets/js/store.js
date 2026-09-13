/* store.js —— 电子私厨本地数据层（localStorage，隐私隔离，仅本机可读写） */
(function (global) {
  'use strict';
  var NS = 'ec_';
  var COLLECTIONS = ['users', 'recipes', 'combos', 'cook_logs', 'eat_logs', 'categories', 'tags', 'wishlist', 'avatars', 'style_presets'];

  // 菜谱三大分类维度（用户要求拆分）
  var MEAL_TYPES = ['早餐', '午餐', '晚餐', '加餐'];          // 早中晚餐一类
  var DISH_TYPES = ['主食', '主菜', '汤羹', '甜点', '饮品'];   // 主食主菜汤羹甜点饮品一类
  var SEASONS = ['春', '夏', '秋', '冬'];                     // 春夏秋冬一类
  var DEFAULT_CATEGORIES = DISH_TYPES.map(function (n) { return { name: n, type: 'fixed', icon: '' }; });
  var DEFAULT_STYLES = [
    { name: '减脂', scene: '低卡轻负担', keywords: ['低卡', '蔬菜', '蒸', '少油'] },
    { name: '养生', scene: '温补调理', keywords: ['温补', '汤', '粥', '清淡'] },
    { name: '快手', scene: '10分钟上桌', keywords: ['快', '简单', '一锅'] },
    { name: '宴客', scene: '撑场硬菜', keywords: ['硬菜', '宴', '大菜'] },
    { name: '宝宝餐', scene: '儿童友好', keywords: ['少盐', '软', '可爱'] },
    { name: '健身', scene: '高蛋白', keywords: ['高蛋白', '鸡胸', '牛肉', '蛋'] },
    { name: '家常', scene: '日常下饭', keywords: ['下饭', '家常', '米饭'] },
    { name: '轻食', scene: '沙拉轻餐', keywords: ['沙拉', '轻', '生'] },
    { name: '下饭', scene: '重口开胃', keywords: ['辣', '酱', '开胃'] },
    { name: '宵夜', scene: '深夜小馋', keywords: ['宵夜', '小', '热'] },
    { name: '早餐', scene: '元气开启', keywords: ['早餐', '蛋', '奶'] },
    { name: '周末', scene: '慢享时光', keywords: ['炖', '烤', '慢'] },
    { name: '素食', scene: '全素清淡', keywords: ['素', '蔬菜', '豆腐'] },
    { name: '约会', scene: '精致浪漫', keywords: ['精致', '甜', '浪漫'] }
  ];

  function uid() {
    return 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
  function read(col) {
    try { return JSON.parse(localStorage.getItem(NS + col) || '[]'); } catch (e) { return []; }
  }
  function write(col, arr) {
    localStorage.setItem(NS + col, JSON.stringify(arr));
  }

  var Store = {
    collections: COLLECTIONS,
    MEAL_TYPES: MEAL_TYPES,
    DISH_TYPES: DISH_TYPES,
    SEASONS: SEASONS,
    uid: uid,
    init: function () {
      COLLECTIONS.forEach(function (c) { if (localStorage.getItem(NS + c) == null) write(c, []); });
      // seed categories
      var cats = read('categories');
      if (!cats.length) {
        cats = DEFAULT_CATEGORIES.map(function (c) { return Object.assign({ _id: uid() }, c); });
        write('categories', cats);
      }
      // seed style presets
      var styles = read('style_presets');
      if (!styles.length) {
        styles = DEFAULT_STYLES.map(function (s) { return Object.assign({ _id: uid(), enabled: true }, s); });
        write('style_presets', styles);
      }
      // seed local user
      var users = read('users');
      if (!users.length) {
        users = [{ _id: uid(), nick: '私厨主人', theme: 'light', privacyAccepted: false, createdAt: Date.now() }];
        write('users', users);
      }
      return this;
    },
    get: function (col, filter) {
      var arr = read(col);
      if (filter && typeof filter === 'function') return arr.filter(filter);
      return arr;
    },
    find: function (col, id) {
      return read(col).filter(function (x) { return x._id === id; })[0] || null;
    },
    add: function (col, item) {
      var arr = read(col);
      var rec = Object.assign({ _id: uid(), createdAt: Date.now() }, item);
      arr.unshift(rec);
      write(col, arr);
      return rec;
    },
    update: function (col, id, patch) {
      var arr = read(col);
      var i = arr.findIndex(function (x) { return x._id === id; });
      if (i < 0) return null;
      arr[i] = Object.assign({}, arr[i], patch);
      write(col, arr);
      return arr[i];
    },
    remove: function (col, id) {
      var arr = read(col).filter(function (x) { return x._id !== id; });
      write(col, arr);
      return true;
    },
    exportAll: function () {
      var out = {};
      COLLECTIONS.forEach(function (c) { out[c] = read(c); });
      return out;
    },
    importAll: function (obj) {
      COLLECTIONS.forEach(function (c) { if (obj[c]) write(c, obj[c]); });
      return true;
    },
    clearAll: function () {
      COLLECTIONS.forEach(function (c) { localStorage.removeItem(NS + c); });
      this.init();
      return true;
    },
    setUser: function (patch) {
      var users = read('users');
      if (!users.length) users = [{ _id: uid() }];
      users[0] = Object.assign({}, users[0], patch);
      write('users', users);
      return users[0];
    },
    getSetting: function (k, def) {
      try { var s = JSON.parse(localStorage.getItem(NS + 'settings') || '{}'); return (s && s[k] !== undefined) ? s[k] : def; }
      catch (e) { return def; }
    },
    setSetting: function (k, v) {
      var s; try { s = JSON.parse(localStorage.getItem(NS + 'settings') || '{}'); } catch (e) { s = {}; }
      s[k] = v; localStorage.setItem(NS + 'settings', JSON.stringify(s)); return v;
    },
    getUser: function () { return read('users')[0] || null; }
  };

  global.Store = Store;
})(window);
