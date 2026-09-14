/* app.js —— 电子私厨网页版 主程序（路由/页面/日历饮食记录/分享） */
(function () {
  'use strict';
  var root = document.getElementById('app');
  var toastTimer;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function toast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 1600);
  }
  function avatarFor(tab) {
    var map = { home: 'niangao-chef.png', library: 'niangao-scholar.png', add: 'niangao-chef.png', calendar: 'niangao-foodie.png', mine: 'niangao-greeter.png' };
    var f = map[tab] || 'niangao-greeter.png';
    return '<img class="avatar-bg" src="assets/img/' + f + '" alt="">';
  }
  function heroAvatar() {
    return '<img class="avatar-hero" src="assets/img/niangao-chef.png" alt="年糕大厨">';
  }

  /* ---------- 天气（实时 + 唤起系统天气APP） ---------- */
  function weatherText(code) {
    code = +code;
    if (code === 0) return { icon: '☀️', text: '晴' };
    if (code === 1) return { icon: '🌤️', text: '晴间多云' };
    if (code === 2) return { icon: '⛅', text: '多云' };
    if (code === 3) return { icon: '☁️', text: '阴' };
    if (code === 45 || code === 48) return { icon: '🌫️', text: '雾' };
    if (code >= 51 && code <= 57) return { icon: '🌦️', text: '毛毛雨' };
    if (code >= 61 && code <= 67) return { icon: '🌧️', text: '雨' };
    if (code >= 71 && code <= 77) return { icon: '🌨️', text: '雪' };
    if (code >= 80 && code <= 82) return { icon: '🌧️', text: '阵雨' };
    if (code >= 85 && code <= 86) return { icon: '🌨️', text: '阵雪' };
    if (code >= 95) return { icon: '⛈️', text: '雷阵雨' };
    return { icon: '🌡️', text: '实时' };
  }
  function openWeatherApp() {
    try {
      // 尝试唤起系统天气应用（iOS 支持 weather://；Android 无通用 scheme，降级到天气网站）
      window.location.href = 'weather://';
      setTimeout(function () {
        if (!document.hidden) window.open('https://openweathermap.org/', '_blank');
      }, 1200);
    } catch (e) { window.open('https://openweathermap.org/', '_blank'); }
  }
  function updateWeather() {
    var el = document.getElementById('weatherCard');
    if (!el) return;
    var term = Solar.getTerm(new Date());
    // 动态背景：符合节气色调的马卡龙渐变（每节气专属季节色）
    var grad = 'linear-gradient(135deg,' + term.grad[0] + ',' + term.grad[1] + ')';
    el.style.background = grad;

    function tipBlock() {
      var rec = Solar.getRecommend(term.key);
      var good = (rec.good || []).slice(0, 4).map(function (x) { return x.n; }).join('、');
      var bad = (rec.bad || []).slice(0, 4).map(function (x) { return x.n; }).join('、');
      return '<div class="term-tip" data-action="solar-detail">' +
        '<div class="term-tip-h">🌿 ' + esc(term.name) + ' · 时令饮食</div>' +
        '<div class="term-tip-row"><span class="tag good">宜</span><span>' + esc(good) + '</span></div>' +
        '<div class="term-tip-row"><span class="tag bad">忌</span><span>' + esc(bad) + '</span></div>' +
        '<div class="term-tip-more">点击查看中医详解 ›</div></div>';
    }
    function fill(d) {
      el.innerHTML = '<div class="wc-inner"><div class="between"><div><div class="big" style="font-size:20px">' + d.icon + ' ' + d.temp + '°</div>' +
        '<div class="muted">' + d.text + (d.city ? ' · 📍' + esc(d.city) : '') + '</div></div>' +
        '<div style="text-align:right"><div class="muted">湿度 ' + d.hum + '%</div><div class="muted">风 ' + d.wind + ' km/h</div>' +
        '<button class="btn ghost" id="openWeather" style="margin-top:6px;padding:5px 10px;font-size:12px">📱 打开天气</button></div></div>' +
        tipBlock() + '</div>';
      var b = document.getElementById('openWeather');
      if (b) b.addEventListener('click', openWeatherApp);
    }
    fill({ icon: '🌤️', temp: '…', text: '正在获取实时天气', city: '', hum: '—', wind: '—' });
    if (!navigator.geolocation) { fill({ icon: '⛅', temp: '—', text: '已用默认城市', city: '北京', hum: '—', wind: '—' }); return; }
    navigator.geolocation.getCurrentPosition(function (pos) {
      var lat = pos.coords.latitude, lon = pos.coords.longitude;
      var wUrl = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto';
      var gUrl = 'https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=' + lat + '&longitude=' + lon + '&localityLanguage=zh';
      var wP = fetch(wUrl).then(function (r) { return r.json(); }).then(function (j) {
        var c = j.current || {}; var wt = weatherText(c.weather_code);
        return { icon: wt.icon, temp: Math.round(c.temperature_2m), text: wt.text, hum: c.relative_humidity_2m, wind: Math.round(c.wind_speed_10m) };
      }).catch(function () { return null; });
      var gP = fetch(gUrl).then(function (r) { return r.json(); }).then(function (g) {
        var adm = (g.localityInfo && g.localityInfo.administrative) || [];
        function pick(desc) { var a = adm.filter(function (x) { return x.description === desc; })[0]; return a ? a.name : null; }
        return pick('County') || pick('City') || g.city || g.locality || g.principalSubdivision || '定位';
      }).catch(function () { return '定位'; });
      Promise.all([wP, gP]).then(function (res) {
        var w = res[0], city = res[1];
        if (!w) { fallback(city); return; }
        fill({ icon: w.icon, temp: w.temp, text: w.text, city: city, hum: w.hum, wind: w.wind });
      });
    }, function () { fallback('北京'); }, { timeout: 8000 });
    function fallback(city) { fill({ icon: '⛅', temp: '—', text: '实时获取失败·用默认城市', city: city || '北京', hum: '—', wind: '—' }); }
  }

  /* ---------- 时令饮食大界面（中医详解） ---------- */
  function renderSolarDetail() {
    var term = Solar.getTerm(new Date());
    var rec = Solar.getRecommend(term.key);
    var grad = 'linear-gradient(135deg,' + term.grad[0] + ',' + term.grad[1] + ')';
    var bg = grad;
    function items(list, cls) {
      return (list || []).map(function (x) {
        return '<div class="solar-item"><div class="solar-item-h"><span class="tag ' + cls + '">' + (cls === 'good' ? '宜' : '忌') + '</span> ' + esc(x.n) + '</div>' +
          '<div class="solar-item-w">' + esc(x.w) + '</div></div>';
      }).join('');
    }
    root.innerHTML =
      '<div class="solar-detail" style="background-image:' + bg + ';background-size:cover;background-position:center">' +
      '<div class="solar-overlay">' +
      '<div class="solar-head"><button class="icon-btn" data-action="nav:home">←</button>' +
      '<div><div class="big">🌿 ' + esc(term.name) + '</div><div class="muted">' + esc(term.season) + '季 · 时令饮食（中医视角）</div></div></div>' +
      '<div class="solar-panel">' +
      '<div class="solar-sec"><div class="solar-sec-t good-t">✅ 宜吃 · 顺应时令</div>' + items(rec.good, 'good') + '</div>' +
      '<div class="solar-sec"><div class="solar-sec-t bad-t">⛔ 忌吃 · 少碰为妙</div>' + items(rec.bad, 'bad') + '</div>' +
      '</div></div></div>' + tabbar('home');
  }

  /* ---------- 路由 ---------- */
  function currentRoute() {
    var h = location.hash.replace(/^#\/?/, '');
    if (h.indexOf('share/') === 0) return { name: 'share', data: h.slice(6) };
    var parts = h.split('/');
    return { name: parts[0] || 'home', id: parts[1] };
  }
  function navigate(h) { location.hash = h; }

  /* ---------- 顶部栏 / 底部栏 ---------- */
  function topbar(title, sub, editable) {
    var titleHtml = '<h1' + (editable ? ' id="appTitle" data-action="edit-title" title="点击修改名称"' : '') + '>' + esc(title) +
      (editable ? ' <span class="pen">✎</span>' : '') + '</h1>';
    return '<div class="topbar"><div class="topbar-titles">' + titleHtml +
      (sub ? '<div class="sub">' + esc(sub) + '</div>' : '') + '</div>' +
      '<button class="icon-btn" data-action="toggle-theme">🌗</button></div>';
  }
  function editTitle() {
    var h1 = document.getElementById('appTitle');
    if (!h1) return;
    h1.removeAttribute('data-action');
    var cur = Store.getSetting('appTitle', '电子私厨');
    h1.innerHTML = '<input id="titleInput" class="title-input" maxlength="20" value="' + esc(cur) + '">';
    var inp = document.getElementById('titleInput');
    inp.focus(); inp.select();
    var done = false;
    function commit() {
      if (done) return; done = true;
      var v = (inp.value || '').trim();
      if (v) Store.setSetting('appTitle', v);
      renderHome();
    }
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); commit(); } });
    inp.addEventListener('blur', commit);
  }
  function tabbar(active) {
    var t = function (key, ic, label, mid) {
      return '<div class="tab' + (mid ? ' mid' : '') + (active === key ? ' on' : '') + '" data-action="nav:' + key + '">' +
        '<span class="ic">' + ic + '</span>' + (mid ? '' : '<span>' + label + '</span>') + '</div>';
    };
    return '<div class="tabbar">' +
      t('home', '🏠', '首页') + t('library', '📚', '菜谱库') + t('add', '➕', '', true) +
      t('calendar', '📅', '日历') + t('mine', '👤', '我的') + '</div>';
  }

  /* ---------- 首页 ---------- */
  function renderHome() {
    var recipes = Store.get('recipes');
    var eatLogs = Store.get('eat_logs').slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); }).slice(0, 5);
    var recCard = '';
    if (recipes.length) {
      var pick = recipes[Math.floor(Math.random() * recipes.length)];
      recCard = '<div class="card hero"><div class="hero-row"><div style="flex:1">' +
        '<div class="muted">AI 今日推荐</div><div class="big">' + esc(pick.name) + '</div>' +
        '<div class="sub" style="margin-top:4px">' + esc((pick.category || '') + ' · ' + (pick.timeMin || '?') + '分钟 · ' + (pick.calories || '?') + 'kcal') + '</div></div>' +
        heroAvatar() + '</div>' +
        '<button class="btn primary block" style="margin-top:10px" data-action="open-recipe:' + pick._id + '">查看做法</button></div>';
    } else {
      recCard = '<div class="card hero"><div class="hero-row"><div style="flex:1">' +
        '<div class="big">今天吃啥？🍳</div><div class="sub" style="margin-top:4px">还没有菜谱，先去添加一道吧～</div></div>' +
        heroAvatar() + '</div>' +
        '<button class="btn primary block" style="margin-top:10px" data-action="nav:add">＋ 添加菜谱</button></div>';
    }
    var recentHtml = eatLogs.length ? eatLogs.map(function (l) {
      var names = (l.items || []).map(function (it) { return it.name; }).join('、');
      var sum = (l.items || []).reduce(function (s, it) { return s + (it.calories || 0); }, 0);
      return '<div class="list-item"><div style="flex:1"><div style="font-weight:700">' + esc(l.date) + '</div><div class="muted">' + esc(names || '未记录食物') + '</div></div><span class="pill">' + sum + ' kcal</span></div>';
    }).join('') : '<div class="muted center" style="padding:10px">还没有饮食记录</div>';

    var eatAll = Store.get('eat_logs');
    var totalKcal = eatAll.reduce(function (s, l) { return s + (l.totalCalories || 0); }, 0);
    var stats = '<div class="stat-grid"><div class="stat"><div class="muted">菜谱总数</div><div class="v">' + recipes.length + '</div></div>' +
      '<div class="stat"><div class="muted">饮食记录</div><div class="v">' + eatAll.length + '<span style="font-size:12px">天</span></div></div>' +
      '<div class="stat"><div class="muted">累计摄入</div><div class="v">' + totalKcal + '<span style="font-size:12px">kcal</span></div></div>' +
      '<div class="stat"><div class="muted">我的标签</div><div class="v">' + Store.get('tags').length + '</div></div></div>';

    var appTitle = Store.getSetting('appTitle', '电子私厨');
    document.title = appTitle + ' · 我的私房菜工作台';
    root.innerHTML = topbar(appTitle, '我的私房菜工作台', true) +
      '<div class="section">' +
      '<div class="card weather-card" id="weatherCard"><div class="weather-loading">🌤️ 正在获取实时天气…</div></div>' +
      recCard +
      '<div class="card"><div class="between" style="margin-bottom:8px"><b>🕑 最近吃了</b><span class="muted" data-action="nav:calendar">更多</span></div>' + recentHtml + '</div>' +
      '<div class="card"><div class="between" style="margin-bottom:8px"><b>📊 数据总览</b></div>' + stats + '</div>' +
      '</div>' + tabbar('home');
    updateWeather();
  }

  /* ---------- 菜谱库 ---------- */
  var libFilter = { q: '', meal: '', dishType: '', season: '', difficulty: '' };
  var libView = 'grid';
  function renderLibrary() {
    var recipes = Store.get('recipes');
    function match(r) {
      if (libFilter.q && (r.name + (r.tags || []).join(',')).toLowerCase().indexOf(libFilter.q.toLowerCase()) < 0) return false;
      if (libFilter.meal && (r.meal || '') !== libFilter.meal) return false;
      if (libFilter.dishType && (r.dishType || r.category || '') !== libFilter.dishType) return false;
      if (libFilter.season) { var ss = Array.isArray(r.season) ? r.season : [r.season]; if (ss.indexOf(libFilter.season) < 0) return false; }
      if (libFilter.difficulty && String(r.difficulty) !== libFilter.difficulty) return false;
      return true;
    }
    var list = recipes.filter(match);
    var mealChips = '<div class="pill ' + (!libFilter.meal ? 'on' : '') + '" data-action="filter:meal:">不限</div>' +
      Store.MEAL_TYPES.map(function (s) { return '<div class="pill ' + (libFilter.meal === s ? 'on' : '') + '" data-action="filter:meal:' + s + '">' + s + '</div>'; }).join('');
    var dishChips = '<div class="pill ' + (!libFilter.dishType ? 'on' : '') + '" data-action="filter:dishType:">全部类型</div>' +
      Store.DISH_TYPES.map(function (s) { return '<div class="pill ' + (libFilter.dishType === s ? 'on' : '') + '" data-action="filter:dishType:' + s + '">' + s + '</div>'; }).join('');
    var seasonChips = '<div class="pill ' + (!libFilter.season ? 'on' : '') + '" data-action="filter:season:">全季</div>' +
      Store.SEASONS.map(function (s) { return '<div class="pill ' + (libFilter.season === s ? 'on' : '') + '" data-action="filter:season:' + s + '">' + s + '</div>'; }).join('');
    var diffChips = [['1', '简单'], ['2', '适中'], ['3', '复杂']].map(function (d) { return '<div class="pill ' + (libFilter.difficulty === d[0] ? 'on' : '') + '" data-action="filter:difficulty:' + d[0] + '">' + d[1] + '</div>'; }).join('');

    function catLabel(r) { return esc(r.dishType || r.category || '') + (r.meal ? ' · ' + r.meal : ''); }

    var body = list.length ? (libView === 'grid'
      ? '<div class="grid">' + list.map(function (r) {
        return '<div class="recipe-card" data-action="open-recipe:' + r._id + '">' +
          (r.thumbFileId ? '<img class="ph" src="' + r.thumbFileId + '">' : '<div class="ph"></div>') +
          '<div class="info"><div class="nm">' + esc(r.name) + '</div><div class="muted">' + catLabel(r) + ' · ' + (r.timeMin || '?') + '分</div></div></div>';
      }).join('') + '</div>'
      : list.map(function (r) {
        return '<div class="list-item" data-action="open-recipe:' + r._id + '">' +
          (r.thumbFileId ? '<img src="' + r.thumbFileId + '">' : '<div style="width:64px;height:64px;border-radius:10px;background:var(--surface-2)"></div>') +
          '<div style="flex:1"><div style="font-weight:700">' + esc(r.name) + '</div><div class="muted">' + catLabel(r) + ' · ' + (r.timeMin || '?') + '分 · ' + (r.calories || '?') + 'kcal</div>' +
          '<div>' + (r.tags || []).slice(0, 3).map(function (t) { return '<span class="pill">' + esc(t) + '</span>'; }).join('') + '</div></div></div>';
      }).join('')) : '<div class="empty"><div class="em">🍽️</div>还没有匹配的菜谱<br>去添加或调整筛选</div>';

    root.innerHTML = topbar('菜谱库', '我的私房菜单') +
      '<div class="section">' +
      '<input class="search" placeholder="🔍 搜索菜名 / 标签" id="libSearch" value="' + esc(libFilter.q) + '">' +
      '<div class="chips" style="margin-top:10px"><span class="chips-label">餐次</span>' + mealChips + '</div>' +
      '<div class="chips"><span class="chips-label">类型</span>' + dishChips + '</div>' +
      '<div class="chips"><span class="chips-label">季节</span>' + seasonChips + diffChips + '</div>' +
      '<div class="between" style="margin:10px 0 6px"><b>共 ' + list.length + ' 道</b>' +
      '<button class="icon-btn" data-action="toggle-view" style="width:34px;height:34px;font-size:16px">' + (libView === 'grid' ? '☰' : '▦') + '</button></div>' +
      body + '</div>' + tabbar('library');

    var s = document.getElementById('libSearch');
    if (s) s.addEventListener('input', function () { libFilter.q = s.value; renderLibrary(); });
  }

  /* ---------- 添加菜谱（热量系统自动计算） ---------- */
  function renderAdd() {
    root.innerHTML = topbar('添加菜谱', '拍照 / 相册上传 · 智能识别') +
      '<div class="section">' + avatarFor('add') +
      '<div class="card"><div class="row" style="gap:10px">' +
      '<div class="upload-zone" id="upCamera" style="flex:1">📷 拍照<br><span class="muted">调用相机识别</span></div>' +
      '<div class="upload-zone" id="upAlbum" style="flex:1">🖼️ 相册<br><span class="muted">从相册选择</span></div></div>' +
      '<input type="file" id="fileCam" accept="image/*" multiple capture="environment" style="display:none">' +
      '<input type="file" id="fileAlb" accept="image/*" multiple style="display:none">' +
      '<div class="thumbs" id="thumbs"></div></div>' +
      '<div class="card"><div class="between"><b>✨ AI 智能识别</b><button class="btn ghost" id="aiBtn" style="padding:6px 12px">识别</button></div>' +
      '<div class="muted" id="aiTip">点击识别品类/季节/场景（无密钥时开放手动录入）</div></div>' +
      '<div class="card"><div class="field"><label>菜名 *（可同时填多种，自动加总）</label><input id="f_name" placeholder="如：宫保鸡丁、番茄炒蛋"></div>' +
      '<div class="row"><div class="field" style="flex:1"><label>餐次</label><select id="f_meal">' + Store.MEAL_TYPES.map(function (o) { return '<option>' + o + '</option>'; }).join('') + '</select></div>' +
      '<div class="field" style="flex:1"><label>类型</label><select id="f_dish">' + Store.DISH_TYPES.map(function (o) { return '<option>' + o + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="field"><label>季节</label><select id="f_season"><option value="">不限</option>' + Store.SEASONS.map(function (o) { return '<option>' + o + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label>食材（每行一个，系统自动算热量）</label><textarea id="f_ing" placeholder="鸡蛋 2个\n番茄 1个\n米饭 1碗"></textarea></div>' +
      '<div class="row"><div class="field" style="flex:1"><label>热量(kcal) · 自动</label><input id="f_cal" type="number" placeholder="系统计算" readonly></div>' +
      '<div class="field" style="flex:1"><label>耗时(分钟)</label><input id="f_time" type="number" placeholder="10"></div></div>' +
      '<div class="muted" id="calHint" style="margin-top:6px">填写食材或菜名，系统自动估算热量</div>' +
      '<div class="field"><label>步骤（每行一步）</label><textarea id="f_steps" placeholder="1. 打蛋\n2. 炒番茄"></textarea></div>' +
      '<div class="row"><div class="field" style="flex:1"><label>成本(¥)</label><input id="f_cost" type="number" placeholder="8"></div>' +
      '<div class="field" style="flex:1"><label>难度</label><select id="f_diff"><option value="1">简单</option><option value="2">适中</option><option value="3">复杂</option></select></div></div>' +
      '<div class="field"><label>标签（逗号分隔）</label><input id="f_tags" placeholder="下饭,家常"></div>' +
      '<div class="field"><label>备注</label><input id="f_note" placeholder="可选"></div>' +
      '<button class="btn primary block" id="saveBtn">保存菜谱</button></div>' +
      '</div>' + tabbar('add');

    var files = [];
    var fileCam = document.getElementById('fileCam');
    var fileAlb = document.getElementById('fileAlb');
    document.getElementById('upCamera').addEventListener('click', function () { fileCam.click(); });
    document.getElementById('upAlbum').addEventListener('click', function () { fileAlb.click(); });
    function handleFiles(input, doCrop) {
      Array.prototype.forEach.call(input.files, function (f) {
        Img.compress(f, 1024).then(function (d) {
          var next = doCrop ? Img.crop(d) : Promise.resolve(d);
          next.then(function (cd) { if (cd) { files.push(cd); renderThumbs(); } });
        });
      });
    }
    fileCam.addEventListener('change', function () { handleFiles(fileCam, false); });
    fileAlb.addEventListener('change', function () { handleFiles(fileAlb, true); });
    function renderThumbs() {
      document.getElementById('thumbs').innerHTML = files.map(function (d, i) {
        return '<img src="' + d + '" data-i="' + i + '">';
      }).join('');
    }
    function recomputeCal() {
      var name = document.getElementById('f_name').value.trim();
      var ing = document.getElementById('f_ing').value;
      var r = Cal.calcFormula(name, ing);
      document.getElementById('f_cal').value = r.total;
      var hint = document.getElementById('calHint');
      if (r.source === 'ingredient') {
        hint.textContent = '🥬 食材明细估算：' + r.expression;
      } else if (r.source === 'dish') {
        var unk = r.items.filter(function (i) { return i.unknown; }).length;
        hint.textContent = '🍜 菜系菜谱估算：' + r.expression + (unk ? ('（' + unk + ' 项未匹配，可补充或手填）') : '');
      } else {
        hint.textContent = '未匹配到菜系菜谱，可补充食材或手动填写热量';
      }
    }
    document.getElementById('f_ing').addEventListener('input', recomputeCal);
    document.getElementById('f_name').addEventListener('input', recomputeCal);
    recomputeCal();
    document.getElementById('aiBtn').addEventListener('click', function () {
      var tip = document.getElementById('aiTip');
      tip.textContent = '识别中…';
      AI.recognize().then(function (res) {
        if (!res) { tip.innerHTML = '未检测到 AI 密钥，已为你开放手动录入 ✅<br>可手动填写菜名与标签'; toast('已切换手动录入'); }
      });
    });
    document.getElementById('saveBtn').addEventListener('click', function () {
      var name = document.getElementById('f_name').value.trim();
      if (!name) { toast('请填写菜名'); return; }
      recomputeCal();
      var cal = +document.getElementById('f_cal').value || 0;
      var main = files[0] ? files[0] : '';
      var white = main ? Img.toWhiteBg(main, 600) : Promise.resolve('');
      var dish = document.getElementById('f_dish').value;
      white.then(function (wb) {
        Store.add('recipes', {
          name: name, category: dish, meal: document.getElementById('f_meal').value,
          dishType: dish, season: document.getElementById('f_season').value,
          color: '', scene: [], difficulty: +document.getElementById('f_diff').value,
          timeMin: +document.getElementById('f_time').value || 0,
          calories: cal,
          cost: +document.getElementById('f_cost').value || 0,
          ingredients: document.getElementById('f_ing').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean),
          steps: document.getElementById('f_steps').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean),
          imageFileId: main, thumbFileId: wb || main,
          tags: document.getElementById('f_tags').value.split(',').map(function (s) { return s.trim(); }).filter(Boolean),
          note: document.getElementById('f_note').value, cookCount: 0, lastCooked: ''
        });
        toast('已保存：' + name + '（热量 ' + cal + 'kcal）'); navigate('library');
      });
    });
  }

  /* ---------- 我的 ---------- */
  function renderMine() {
    var recipes = Store.get('recipes');
    var eatLogs = Store.get('eat_logs');
    var freq = {}; eatLogs.forEach(function (l) { (l.items || []).forEach(function (it) { freq[it.name] = (freq[it.name] || 0) + 1; }); });
    var fav = Object.keys(freq).sort(function (a, b) { return freq[b] - freq[a]; })[0] || '—';
    var idle = recipes.filter(function (r) { return !(r.cookCount > 0); });
    var totalKcal = eatLogs.reduce(function (s, l) { return s + (l.totalCalories || 0); }, 0);

    var user = Store.getUser();
    var tags = Store.get('tags');

    var nick = (user && user.nick) ? user.nick : '';
    var avatarHtml = (user && user.avatar)
      ? '<img class="mine-avatar-img" src="' + user.avatar + '" alt="">'
      : '<span class="mine-avatar-emoji">🍳</span>';
    root.innerHTML =
      '<div class="mine-header">' +
        '<div class="mine-avatar" data-action="edit-avatar">' + avatarHtml +
          '<span class="mine-avatar-badge">📷</span></div>' +
        '<div class="mine-nick" data-action="edit-nick">厨神：<span id="nickText">' + esc(nick || '点击设置昵称') + '</span> <span class="pen">✎</span></div>' +
        '<div class="mine-hint muted">点击头像更换形象 · 点击名称修改昵称</div>' +
      '</div>' +
      '<div class="section">' +

      '<div class="card"><div class="between"><b>📊 我的统计</b><span class="muted" data-action="nav:calendar">饮食日历</span></div>' +
      '<div class="stat-grid" style="margin-top:8px">' +
      '<div class="stat"><div class="muted">最爱菜</div><div class="v" style="font-size:16px">' + esc(fav) + '</div></div>' +
      '<div class="stat"><div class="muted">饮食记录</div><div class="v">' + eatLogs.length + '<span style="font-size:12px">天</span></div></div>' +
      '<div class="stat"><div class="muted">累计摄入</div><div class="v">' + totalKcal + '<span style="font-size:12px">kcal</span></div></div>' +
      '<div class="stat"><div class="muted">闲置提醒</div><div class="v">' + idle.length + '</div><div class="muted">道菜还没做过</div></div>' +
      '</div>' +
      (idle.length ? '<div class="muted" style="margin-top:8px">💡 ' + idle.slice(0, 3).map(function (r) { return esc(r.name); }).join('、') + ' 等还没下过锅，安排一下？</div>' : '') +
      '</div>' +

      '<div class="card"><div class="between"><b>🏷 我的标签</b><span class="muted" data-action="open-tags">管理</span></div>' +
      '<div style="margin-top:8px">' + (tags.length ? tags.map(function (t) { return '<span class="pill">' + esc(t.name) + '</span>'; }).join('') : '<span class="muted">暂无标签</span>') + '</div></div>' +

      '<div class="card"><div class="field"><label>📤 数据导出 / 导入（隐私隔离，仅本机）</label>' +
      '<div class="row"><button class="btn block" id="exportBtn">导出 JSON</button><button class="btn block ghost" id="importBtn">导入</button></div>' +
      '<input type="file" id="importFile" accept="application/json" style="display:none"></div>' +
      '<div class="field"><label>🔗 分享链接</label><button class="btn primary block" id="shareApp">复制我的私厨链接</button><div class="muted">生成一个可公开访问的链接，分享给朋友</div></div>' +
      '<div class="field"><label>⚙️ 设置</label>' +
      '<div class="row between" style="margin-bottom:8px"><span>深浅模式</span><button class="btn ghost" id="themeBtn">切换</button></div>' +
      '<div class="row between" style="margin-bottom:8px"><span>隐私协议</span><button class="btn ghost" id="privacyBtn">查看</button></div>' +
      '<button class="btn ghost block" id="clearBtn" style="color:var(--primary-d)">清空全部数据</button></div></div>' +
      '</div>' + tabbar('mine');

    document.getElementById('exportBtn').addEventListener('click', function () {
      var data = Store.exportAll();
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = '电子私厨数据.json'; a.click();
      toast('已导出');
    });
    var imp = document.getElementById('importFile');
    document.getElementById('importBtn').addEventListener('click', function () { imp.click(); });
    imp.addEventListener('change', function () {
      var f = imp.files[0]; if (!f) return;
      var rd = new FileReader(); rd.onload = function () { try { Store.importAll(JSON.parse(rd.result)); toast('导入成功'); renderMine(); } catch (e) { toast('文件格式错误'); } };
      rd.readAsText(f);
    });
    document.getElementById('shareApp').addEventListener('click', function () {
      var url = location.origin + location.pathname;
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { toast('链接已复制'); }, function () { toast(url); });
      else toast(url);
    });
    document.getElementById('themeBtn').addEventListener('click', toggleTheme);
    document.getElementById('privacyBtn').addEventListener('click', showPrivacy);
    document.getElementById('clearBtn').addEventListener('click', function () {
      if (confirm('确定清空全部数据？此操作不可恢复。')) { Store.clearAll(); toast('已清空'); renderMine(); }
    });
  }
  function showPrivacy() {
    openSheet('<h3>隐私协议</h3><p class="muted">本应用所有菜谱、饮食记录仅存储在你的当前设备本地（localStorage），不会上传到任何服务器。我们不使用第三方追踪。你可以随时导出或清空全部数据。分享链接仅包含你主动导出的内容。</p><button class="btn primary block" data-close>我已知晓</button>');
  }

  /* ---------- 菜谱详情 / 编辑 ---------- */
  function renderDetail(id) {
    var r = Store.find('recipes', id);
    if (!r) { navigate('library'); return; }
    root.innerHTML = topbar('菜谱详情', r.dishType || r.category) +
      '<div class="section">' +
      (r.thumbFileId ? '<img src="' + r.thumbFileId + '" style="width:100%;border-radius:16px;background:#fff">' : '') +
      '<div class="card"><div class="between"><h3 style="margin:0">' + esc(r.name) + '</h3><span class="pill">' + esc(r.dishType || r.category || '') + '</span></div>' +
      '<div class="row wrap" style="margin-top:6px">' +
      (r.meal ? '<span class="pill">' + esc(r.meal) + '</span>' : '') +
      (r.season ? '<span class="pill">' + esc(r.season) + '季</span>' : '') +
      (r.tags || []).map(function (t) { return '<span class="pill">' + esc(t) + '</span>'; }).join('') + '</div>' +
      '<div class="row wrap" style="margin-top:8px">' + (r.tags || []).map(function (t) { return '<span class="pill">' + esc(t) + '</span>'; }).join('') + '</div>' +
      '<div class="stat-grid" style="margin-top:10px"><div class="stat"><div class="muted">耗时</div><div class="v">' + (r.timeMin || '?') + '</div></div>' +
      '<div class="stat"><div class="muted">热量</div><div class="v">' + (r.calories || '?') + '</div></div>' +
      '<div class="stat"><div class="muted">成本</div><div class="v">¥' + (r.cost || 0) + '</div></div>' +
      '<div class="stat"><div class="muted">做过</div><div class="v">' + (r.cookCount || 0) + '次</div></div></div>' +
      (r.note ? '<div class="muted" style="margin-top:8px">📝 ' + esc(r.note) + '</div>' : '') + '</div>' +
      (r.ingredients && r.ingredients.length ? '<div class="card"><b>🥬 食材</b><div style="margin-top:6px">' + r.ingredients.map(function (i) { return '<span class="pill">' + esc(i) + '</span>'; }).join('') + '</div></div>' : '') +
      (r.steps && r.steps.length ? '<div class="card"><b>👩‍🍳 步骤</b><ol style="margin:6px 0 0;padding-left:18px">' + r.steps.map(function (s) { return '<li style="margin-bottom:6px">' + esc(s) + '</li>'; }).join('') + '</ol></div>' : '') +
      '<div class="row" style="gap:10px;margin-top:6px"><button class="btn block primary" data-action="eat:' + r._id + '">✓ 记录今天吃了</button>' +
      '<button class="btn block" data-action="share-item:' + r._id + '">🔗 分享这道菜</button></div>' +
      '<div class="row" style="gap:10px;margin-top:10px"><button class="btn block" data-action="edit:' + r._id + '">编辑</button>' +
      '<button class="btn block ghost" data-action="del:' + r._id + '" style="color:var(--primary-d)">删除</button></div>' +
      '</div>' + tabbar('library');
  }
  function renderEdit(id) {
    var r = Store.find('recipes', id); if (!r) { navigate('library'); return; }
    var mealSel = Store.MEAL_TYPES.map(function (o) { return '<option ' + (o === r.meal ? 'selected' : '') + '>' + o + '</option>'; }).join('');
    var dishSel = Store.DISH_TYPES.map(function (o) { return '<option ' + ((o === r.dishType || o === r.category) ? 'selected' : '') + '>' + o + '</option>'; }).join('');
    var seasonSel = '<option value="">不限</option>' + Store.SEASONS.map(function (o) { return '<option ' + (o === r.season ? 'selected' : '') + '>' + o + '</option>'; }).join('');
    root.innerHTML = topbar('编辑菜谱', '') +
      '<div class="section"><div class="card">' +
      '<div class="field"><label>菜名（可同时填多种，自动加总）</label><input id="e_name" value="' + esc(r.name) + '" placeholder="如：宫保鸡丁、番茄炒蛋"></div>' +
      '<div class="row"><div class="field" style="flex:1"><label>餐次</label><select id="e_meal">' + mealSel + '</select></div>' +
      '<div class="field" style="flex:1"><label>类型</label><select id="e_dish">' + dishSel + '</select></div></div>' +
      '<div class="field"><label>季节</label><select id="e_season">' + seasonSel + '</select></div>' +
      '<div class="field"><label>食材（每行一个，系统自动算热量）</label><textarea id="e_ing">' + esc((r.ingredients || []).join('\n')) + '</textarea></div>' +
      '<div class="row"><div class="field" style="flex:1"><label>热量(kcal) · 自动</label><input id="e_cal" type="number" value="' + (r.calories || 0) + '" readonly></div>' +
      '<div class="field" style="flex:1"><label>耗时</label><input id="e_time" type="number" value="' + (r.timeMin || 0) + '"></div></div>' +
      '<div class="muted" id="calHint2" style="margin-top:6px"></div>' +
      '<div class="field"><label>步骤</label><textarea id="e_steps">' + esc((r.steps || []).join('\n')) + '</textarea></div>' +
      '<div class="field"><label>标签</label><input id="e_tags" value="' + esc((r.tags || []).join(',')) + '"></div>' +
      '<div class="field"><label>备注</label><input id="e_note" value="' + esc(r.note || '') + '"></div>' +
      '<button class="btn primary block" id="e_save">保存修改</button></div></div>' + tabbar('library');
    function recomputeEditCal() {
      var res = Cal.calcFormula(document.getElementById('e_name').value.trim(), document.getElementById('e_ing').value);
      document.getElementById('e_cal').value = res.total;
      var hint = document.getElementById('calHint2');
      if (!hint) return;
      if (res.source === 'ingredient') hint.textContent = '🥬 食材明细估算：' + res.expression;
      else if (res.source === 'dish') {
        var unk = res.items.filter(function (i) { return i.unknown; }).length;
        hint.textContent = '🍜 菜系菜谱估算：' + res.expression + (unk ? ('（' + unk + ' 项未匹配）') : '');
      } else hint.textContent = '未匹配，可补充食材或手动填写';
    }
    document.getElementById('e_ing').addEventListener('input', recomputeEditCal);
    document.getElementById('e_name').addEventListener('input', recomputeEditCal);
    recomputeEditCal();
    document.getElementById('e_save').addEventListener('click', function () {
      var res = Cal.calcFormula(document.getElementById('e_name').value.trim(), document.getElementById('e_ing').value);
      var eDish = document.getElementById('e_dish').value;
      Store.update('recipes', id, {
        name: document.getElementById('e_name').value.trim(), category: eDish,
        meal: document.getElementById('e_meal').value, dishType: eDish, season: document.getElementById('e_season').value,
        ingredients: document.getElementById('e_ing').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean),
        steps: document.getElementById('e_steps').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean),
        timeMin: +document.getElementById('e_time').value || 0, calories: res.total,
        tags: document.getElementById('e_tags').value.split(',').map(function (s) { return s.trim(); }).filter(Boolean),
        note: document.getElementById('e_note').value
      });
      toast('已保存'); navigate('recipe/' + id);
    });
  }

  /* ---------- 饮食日历（原搭配界面改造） ---------- */
  var calMonth = new Date();
  function dayLog(date) { return Store.get('eat_logs').filter(function (l) { return l.date === date; })[0] || null; }
  function saveDay(date, items, note) {
    var sum = items.reduce(function (s, it) { return s + (it.calories || 0); }, 0);
    var exist = dayLog(date);
    if (exist) Store.update('eat_logs', exist._id, { items: items, totalCalories: sum, note: note });
    else Store.add('eat_logs', { date: date, items: items, totalCalories: sum, note: note });
  }
  function renderCalendar() {
    var y = calMonth.getFullYear(), m = calMonth.getMonth();
    var first = new Date(y, m, 1).getDay(); var days = new Date(y, m + 1, 0).getDate();
    var logs = Store.get('eat_logs');
    var logMap = {}; logs.forEach(function (l) { logMap[l.date] = l; });
    var cells = '';
    for (var i = 0; i < first; i++) cells += '<div></div>';
    var todayStr = new Date().toISOString().slice(0, 10);
    for (var d = 1; d <= days; d++) {
      var ds = y + '-' + ('0' + (m + 1)).slice(-2) + '-' + ('0' + d).slice(-2);
      var has = logMap[ds];
      cells += '<div class="cal-day ' + (ds === todayStr ? 'today' : '') + (has ? ' has' : '') + '" data-date="' + ds + '">' + d + (has ? '<span class="dot"></span>' : '') + '</div>';
    }
    root.innerHTML = topbar('饮食日历', '点任意日期 · 记录/查看当天或过往吃了什么') +
      '<div class="section"><div class="card"><div class="cal-head"><button class="btn ghost" id="prevM">‹</button>' +
      '<b>' + y + ' 年 ' + (m + 1) + ' 月</b><button class="btn ghost" id="nextM">›</button></div>' +
      '<div class="calendar" style="margin-bottom:6px">' + ['日', '一', '二', '三', '四', '五', '六'].map(function (w) { return '<div class="muted center" style="font-size:11px">' + w + '</div>'; }).join('') + '</div>' +
      '<div class="calendar">' + cells + '</div></div>' +
      '<div class="card" id="dayPanel"><div class="muted center">点击某一天，记录 / 查看当天吃了什么</div></div></div>' + tabbar('calendar');
    document.getElementById('prevM').addEventListener('click', function () { calMonth.setMonth(calMonth.getMonth() - 1); renderCalendar(); });
    document.getElementById('nextM').addEventListener('click', function () { calMonth.setMonth(calMonth.getMonth() + 1); renderCalendar(); });
    root.querySelectorAll('.cal-day[data-date]').forEach(function (el) {
      el.addEventListener('click', function () { openDay(el.dataset.date); });
    });
  }
  var dayState = { date: '', items: [], pendingPhoto: '' };
  function openDay(date) {
    var panel = document.getElementById('dayPanel');
    if (!panel) return;
    dayState = { date: date, items: (dayLog(date) ? (dayLog(date).items || []) : []), pendingPhoto: '' };
    renderDayList();

    function renderDayList() {
      var sum = dayState.items.reduce(function (s, it) { return s + (it.calories || 0); }, 0);
      panel.innerHTML = '<div class="between"><b>' + date + '</b>' + (dayState.items.length ? '<span class="pill">' + sum + ' kcal</span>' : '') + '</div>' +
        (dayState.items.length ? '<div class="eat-list">' + dayState.items.map(function (it, idx) {
          return '<div class="eat-item">' + (it.photo ? '<img src="' + it.photo + '" alt="">' : '<div style="width:44px;height:44px;border-radius:10px;background:var(--surface-2);display:flex;align-items:center;justify-content:center;font-size:22px">🍴</div>') + '<div style="flex:1;min-width:0"><div style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(it.name) + '</div><div class="muted">' + esc(it.portion || '') + ' · ' + it.calories + ' kcal</div></div><button class="icon-btn del-it" data-idx="' + idx + '" style="width:30px;height:30px">✕</button></div>';
        }).join('') + '</div>' : '') +
        '<div class="card" style="margin-top:8px"><div class="muted" style="margin-bottom:6px">📷 记录这道菜（拍照 / 相册）</div>' +
        '<div class="row" style="gap:10px">' +
        '<div class="upload-zone" id="dayCam" style="flex:1;padding:14px">📷 拍照</div>' +
        '<div class="upload-zone" id="dayAlb" style="flex:1;padding:14px">🖼️ 相册</div></div>' +
        '<input type="file" id="dayCamF" accept="image/*" capture="environment" style="display:none">' +
        '<input type="file" id="dayAlbF" accept="image/*" style="display:none">' +
        '<div style="margin-top:8px"><button class="btn block ghost" id="dayPick">🍽️ 直接选菜（不拍照）</button></div></div>' +
        (dayState.items.length ? '<button class="btn primary block" id="daySave" style="margin-top:8px">保存 ' + date + ' 的饮食记录</button>' : '') +
        '<div class="field" style="margin-top:8px"><label>备注</label><input id="dayNote" placeholder="如：和朋友聚餐" value="' + (dayLog(date) ? esc(dayLog(date).note || '') : '') + '"></div>';

      var dayCam = document.getElementById('dayCam');
      var dayAlb = document.getElementById('dayAlb');
      if (dayCam) dayCam.addEventListener('click', function () { document.getElementById('dayCamF').click(); });
      if (dayAlb) dayAlb.addEventListener('click', function () { document.getElementById('dayAlbF').click(); });
      function bindDayFile(input, doCrop) {
        if (!input) return;
        input.addEventListener('change', function () {
          var f = input.files[0]; if (!f) return;
          Img.compress(f, 1024).then(function (d) {
            var next = doCrop ? Img.crop(d) : Promise.resolve(d);
            next.then(function (cd) { if (cd) { dayState.pendingPhoto = cd; renderPicker(); } });
          });
        });
      }
      bindDayFile(document.getElementById('dayCamF'), false);
      bindDayFile(document.getElementById('dayAlbF'), true);
      var dayPick = document.getElementById('dayPick');
      if (dayPick) dayPick.addEventListener('click', function () { dayState.pendingPhoto = ''; renderPicker(); });
      panel.querySelectorAll('.del-it').forEach(function (b) {
        b.addEventListener('click', function () { dayState.items.splice(+b.dataset.idx, 1); renderDayList(); });
      });
      var sv = document.getElementById('daySave');
      if (sv) sv.addEventListener('click', function () {
        saveDay(date, dayState.items, document.getElementById('dayNote').value);
        toast('已保存 ' + date + ' 的饮食'); renderCalendar();
      });
    }

    function renderPicker() {
      panel.innerHTML = '<div class="between"><b>选择这道菜</b><span class="muted" id="pickerBack">完成</span></div>' +
        '<div class="card" style="padding:10px">' +
        (dayState.pendingPhoto ? '<img src="' + dayState.pendingPhoto + '" style="width:100%;border-radius:12px;margin-bottom:8px">' : '<div class="muted" style="margin-bottom:8px">未附照片，将以图标展示</div>') +
        '<input class="search" id="foodSearch" placeholder="🔍 输入菜名/食材，如 番茄炒蛋 / 米饭 / 苹果"></div>' +
        '<div id="foodRes" class="food-res"></div>';
      document.getElementById('pickerBack').addEventListener('click', renderDayList);
      var search = document.getElementById('foodSearch');
      search.addEventListener('input', function () { renderRes(search.value); });
      renderRes('');
    }
    function renderRes(q) {
      var res = Cal.searchItems(q);
      var box = document.getElementById('foodRes');
      if (!res.length) { box.innerHTML = '<div class="muted center" style="padding:12px">未找到，试试更简单的词</div>'; return; }
      box.innerHTML = res.map(function (r, i) {
        var cal = r.type === 'dish' ? r.cal : Math.round(r.cal / 100 * (r.gram || 100));
        return '<div class="food-res-item" data-i="' + i + '"><div style="flex:1"><div style="font-weight:700">' + esc(r.name) + '</div><div class="muted">' + (r.cuisine ? r.cuisine + ' · ' : '') + (r.type === 'dish' ? '成品菜' : '食材') + ' · 约 ' + cal + ' kcal/' + (r.type === 'dish' ? '份' : (r.unit || '份')) + '</div></div><span class="pill">＋ 加入</span></div>';
      }).join('');
      box.querySelectorAll('.food-res-item').forEach(function (el) {
        el.addEventListener('click', function () {
          var r = res[+el.dataset.i];
          var built = Cal.buildEatenItem(r);
          dayState.items.push({ name: built.name, calories: built.calories, portion: built.portion, photo: dayState.pendingPhoto });
          dayState.pendingPhoto = '';
          renderDayList();
        });
      });
    }
  }

  /* ---------- 分享查看（只读） ---------- */
  function renderShare(data) {
    try {
      var obj = JSON.parse(decodeURIComponent(escape(atob(data))));
      var r = obj.recipe || obj;
      root.innerHTML = topbar('来自朋友的私厨', '分享菜谱') +
        '<div class="section"><div class="card">' + avatarFor('home') +
        (r.thumbFileId ? '<img src="' + r.thumbFileId + '" style="width:100%;border-radius:16px">' : '') +
        '<h3 style="margin:10px 0 4px">' + esc(r.name) + '</h3><span class="pill">' + esc(r.category || '') + '</span>' +
        '<div class="stat-grid" style="margin-top:10px"><div class="stat"><div class="muted">耗时</div><div class="v">' + (r.timeMin || '?') + '</div></div><div class="stat"><div class="muted">热量</div><div class="v">' + (r.calories || '?') + '</div></div></div>' +
        (r.ingredients ? '<div class="card"><b>食材</b><div style="margin-top:6px">' + r.ingredients.map(function (i) { return '<span class="pill">' + esc(i) + '</span>'; }).join('') + '</div></div>' : '') +
        (r.steps ? '<div class="card"><b>步骤</b><ol style="padding-left:18px">' + r.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol></div>' : '') +
        '<button class="btn primary block" data-action="nav:home">打开电子私厨</button></div></div>' + tabbar('home');
    } catch (e) { root.innerHTML = '<div class="empty"><div class="em">🔗</div>分享链接已失效</div>'; }
  }

  /* ---------- 标签管理 ---------- */
  function openTags() {
    var tags = Store.get('tags');
    openSheet('<h3>自定义标签</h3><div id="tagList">' + (tags.length ? tags.map(function (t) { return '<div class="tag-input" style="margin-bottom:6px"><span class="t">' + esc(t.name) + ' <b data-del="' + t._id + '">✕</b></span></div>'; }).join('') : '<div class="muted">暂无标签</div>') + '</div>' +
      '<div class="row" style="margin-top:10px"><input class="search" id="newTag" placeholder="输入标签名"><button class="btn primary" id="addTag">添加</button></div><button class="btn block ghost" data-close style="margin-top:10px">完成</button>');
    document.getElementById('addTag').addEventListener('click', function () {
      var v = document.getElementById('newTag').value.trim(); if (!v) return;
      Store.add('tags', { name: v, color: '' }); openTags();
    });
    document.querySelectorAll('#tagList [data-del]').forEach(function (b) {
      b.addEventListener('click', function () { Store.remove('tags', b.dataset.del); openTags(); });
    });
  }

  /* ---------- 通用：底部分享弹层 ---------- */
  function openSheet(html) {
    var mask = document.getElementById('sheetMask');
    mask.querySelector('.sheet').innerHTML = html;
    mask.classList.add('show');
    var close = mask.querySelector('[data-close]');
    if (close) close.addEventListener('click', function () { mask.classList.remove('show'); });
  }

  /* ---------- 昵称编辑（厨神：xx） ---------- */
  function editNick() {
    var span = document.getElementById('nickText');
    if (!span) return;
    var parent = span.parentNode;
    var cur = (Store.getUser() && Store.getUser().nick) || '';
    parent.innerHTML = '厨神：<input id="nickInput" class="title-input" style="width:58%;font-size:16px" maxlength="16" value="' + esc(cur) + '">';
    var inp = document.getElementById('nickInput');
    inp.focus(); inp.select();
    var done = false;
    function commit() {
      if (done) return; done = true;
      var v = (inp.value || '').trim();
      Store.setUser({ nick: v });
      renderMine();
    }
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); commit(); } });
    inp.addEventListener('blur', commit);
  }

  /* ---------- 头像更换 ---------- */
  function openAvatarSheet() {
    openSheet(
      '<h3>更换头像</h3>' +
      '<button class="btn primary block" id="avCamera" style="margin-bottom:10px">📷 拍照</button>' +
      '<button class="btn block" id="avAlbum" style="margin-bottom:10px">🖼️ 从相册选择</button>' +
      '<button class="btn block" id="avWechat" style="margin-bottom:10px">💬 链接微信一键照搬</button>' +
      '<button class="btn block ghost" data-close>取消</button>'
    );
    document.getElementById('avCamera').addEventListener('click', function () {
      document.getElementById('sheetMask').classList.remove('show');
      pickImage(true).then(onAvatarFile);
    });
    document.getElementById('avAlbum').addEventListener('click', function () {
      document.getElementById('sheetMask').classList.remove('show');
      pickImage(false).then(onAvatarFile);
    });
    document.getElementById('avWechat').addEventListener('click', onWeChatAvatar);
  }
  function pickImage(useCamera) {
    return new Promise(function (resolve) {
      var inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*';
      if (useCamera) inp.setAttribute('capture', 'user');
      inp.onchange = function () { var f = inp.files && inp.files[0]; resolve(f || null); };
      inp.click();
    });
  }
  function onAvatarFile(file) {
    if (!file) return;
    toast('处理图片中…');
    Img.compress(file, 1024).then(function (d) {
      return Img.crop(d);
    }).then(function (cropped) {
      if (cropped) setAvatar(cropped);
      else renderMine();
    }).catch(function () { toast('图片处理失败'); });
  }
  function onWeChatAvatar() {
    var inWeChat = navigator.userAgent.toLowerCase().indexOf('micromessenger') >= 0;
    var tip = inWeChat
      ? '当前在微信内打开：可长按你的微信头像「保存到相册」，再返回用「从相册选择」导入；或直接粘贴头像链接：'
      : '本页为纯静态站点，无后端无法直连微信授权。请粘贴你的微信头像链接（在微信里长按头像「复制链接」）：';
    openSheet('<h3>链接微信头像</h3><p class="muted">' + tip + '</p>' +
      '<div class="field"><input id="wxUrl" class="search" placeholder="https://thirdwx.qlogo.cn/..."></div>' +
      '<button class="btn primary block" id="wxOk">确定</button>' +
      '<button class="btn block ghost" data-close style="margin-top:8px">取消</button>');
    document.getElementById('wxOk').addEventListener('click', function () {
      var url = (document.getElementById('wxUrl').value || '').trim();
      if (!url) { toast('请输入链接'); return; }
      document.getElementById('sheetMask').classList.remove('show');
      toast('加载中…');
      loadImageFromUrl(url).then(function (d) { setAvatar(d); }).catch(function () { setAvatar(url); });
    });
  }
  function loadImageFromUrl(url) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () {
        try {
          var c = document.createElement('canvas');
          c.width = img.naturalWidth; c.height = img.naturalHeight;
          c.getContext('2d').drawImage(img, 0, 0);
          resolve(c.toDataURL('image/png'));
        } catch (e) { resolve(url); }
      };
      img.onerror = function () { reject(); };
      img.src = url;
    });
  }
  function setAvatar(dataUrl) {
    Store.setUser({ avatar: dataUrl });
    var el = document.querySelector('.mine-avatar');
    if (el) el.innerHTML = '<img class="mine-avatar-img" src="' + dataUrl + '" alt=""><span class="mine-avatar-badge">📷</span>';
    document.getElementById('sheetMask').classList.remove('show');
    toast('头像已更新');
  }

  /* ---------- 主题 ---------- */
  function toggleTheme() {
    var u = Store.getUser() || {}; var t = (u.theme === 'dark') ? 'light' : 'dark';
    Store.setUser({ theme: t }); applyTheme(t); toast(t === 'dark' ? '已切深色' : '已切浅色');
    var r = currentRoute(); render(r);
  }
  function applyTheme(t) { document.documentElement.setAttribute('data-theme', t || 'light'); }

  /* ---------- 渲染分发 ---------- */
  function render(route) {
    var map = {
      home: renderHome, library: renderLibrary, add: renderAdd, mine: renderMine,
      recipe: function () { renderDetail(route.id); }, edit: function () { renderEdit(route.id); },
      calendar: renderCalendar, tags: function () { renderMine(); openTags(); },
      solar: renderSolarDetail
    };
    if (route.name === 'share') { renderShare(route.data); return; }
    (map[route.name] || renderHome)();
  }

  /* ---------- 事件委托 ---------- */
  root.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]'); if (!el) return;
    var a = el.dataset.action; var p = a.split(':');
    if (p[0] === 'nav') { navigate(p[1]); }
    else if (p[0] === 'solar-detail') { navigate('solar'); }
    else if (p[0] === 'edit-title') { editTitle(); }
    else if (p[0] === 'edit-nick') { editNick(); }
    else if (p[0] === 'edit-avatar') { openAvatarSheet(); }
    else if (p[0] === 'toggle-theme') { toggleTheme(); }
    else if (p[0] === 'toggle-view') { libView = (libView === 'grid') ? 'list' : 'grid'; renderLibrary(); }
    else if (p[0] === 'filter') { var key = p[1], val = p[2] || ''; libFilter[key] = (libFilter[key] === val) ? '' : val; renderLibrary(); }
    else if (p[0] === 'open-recipe') { navigate('recipe/' + p[1]); }
    else if (p[0] === 'open-tags') { openTags(); }
    else if (p[0] === 'eat') {
      var rr = Store.find('recipes', p[1]);
      if (!rr) return;
      var exist = dayLog(new Date().toISOString().slice(0, 10));
      var items = exist ? (exist.items || []) : [];
      items.push({ name: rr.name, calories: rr.calories || 0, portion: '1份', photo: rr.thumbFileId || '' });
      saveDay(new Date().toISOString().slice(0, 10), items, exist ? exist.note : '');
      Store.update('recipes', p[1], { cookCount: (rr.cookCount || 0) + 1, lastCooked: new Date().toISOString().slice(0, 10) });
      toast('已记录今天吃了：' + rr.name); renderDetail(p[1]);
    }
    else if (p[0] === 'share-item') { shareItem(p[1]); }
    else if (p[0] === 'edit') { navigate('edit/' + p[1]); }
    else if (p[0] === 'del') { if (confirm('确定删除这道菜？')) { Store.remove('recipes', p[1]); toast('已删除'); navigate('library'); } }
  });
  document.getElementById('sheetMask').addEventListener('click', function (e) { if (e.target.id === 'sheetMask') this.classList.remove('show'); });

  function shareItem(id) {
    var r = Store.find('recipes', id);
    var payload = btoa(unescape(encodeURIComponent(JSON.stringify({ recipe: r }))));
    var url = location.origin + location.pathname + '#/share/' + payload;
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { toast('分享链接已复制'); }, function () { toast(url); });
    else toast(url);
  }

  /* ---------- 启动 ---------- */
  function boot() {
    Store.init();
    var u = Store.getUser();
    if (u && u.nick === '私厨主人') { Store.setUser({ nick: '大厨' }); u = Store.getUser(); }
    applyTheme(u && u.theme);
    if (!u.privacyAccepted) { showPrivacy(); Store.setUser({ privacyAccepted: true }); }
    window.addEventListener('hashchange', function () { render(currentRoute()); });
    render(currentRoute());
  }
  boot();
})();
