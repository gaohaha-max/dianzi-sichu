/* image.js —— 图片压缩与白底标准化（Canvas），无第三方依赖 */
(function (global) {
  'use strict';

  // 压缩：读取文件，等比缩放到 max 边长，返回 dataURL
  function compress(file, max) {
    max = max || 1024;
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) {
        var img = new Image();
        img.onload = function () {
          var w = img.width, h = img.height, scale = Math.min(1, max / Math.max(w, h));
          var cw = Math.round(w * scale), ch = Math.round(h * scale);
          var canvas = document.createElement('canvas');
          canvas.width = cw; canvas.height = ch;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, cw, ch);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // 白底标准化：在白底画布上居中绘制，统一为 size×size，去除溢出
  function toWhiteBg(srcDataUrl, size) {
    size = size || 600;
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        var canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        var scale = Math.min(size / img.width, size / img.height) * 0.92;
        var dw = img.width * scale, dh = img.height * scale;
        ctx.drawImage(img, (size - dw) / 2, (size - dh) / 2, dw, dh);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = srcDataUrl;
    });
  }

  // 裁切到指定源像素区域，输出等比缩放到 max 边长的 dataURL
  function cropToSize(srcDataUrl, sx, sy, sw, sh, max) {
    max = max || 1024;
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        sx = Math.max(0, Math.min(sx, img.width - 1));
        sy = Math.max(0, Math.min(sy, img.height - 1));
        sw = Math.max(1, Math.min(sw, img.width - sx));
        sh = Math.max(1, Math.min(sh, img.height - sy));
        var scale = Math.min(1, max / Math.max(sw, sh));
        var cw = Math.max(1, Math.round(sw * scale));
        var ch = Math.max(1, Math.round(sh * scale));
        var canvas = document.createElement('canvas');
        canvas.width = cw; canvas.height = ch;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = srcDataUrl;
    });
  }

  // 交互式裁切弹层：返回 Promise<croppedDataUrl|null>（取消为 null）。支持鼠标/触屏。
  function crop(srcDataUrl) {
    return new Promise(function (resolve) {
      var mask = document.createElement('div');
      mask.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#fff;display:flex;flex-direction:column;font-family:inherit';
      mask.innerHTML =
        '<style>' +
        '.crop-ratio{padding:8px 14px;border:0;border-radius:20px;background:#eee;font-size:14px;color:#444}' +
        '.crop-ratio.active{background:#e2617f;color:#fff}' +
        '#cropBox{position:absolute;border:2px solid #fff;box-shadow:0 0 0 9999px rgba(0,0,0,.45);box-sizing:border-box;cursor:move;touch-action:none}' +
        '</style>' +
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #eee">' +
          '<button id="cropCancel" style="border:0;background:none;font-size:16px;color:#e2617f">取消</button>' +
          '<div style="font-weight:800">裁剪图片</div>' +
          '<button id="cropDone" style="border:0;background:none;font-size:16px;color:#e2617f;font-weight:700">完成</button>' +
        '</div>' +
        '<div id="cropStage" style="position:relative;flex:1;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#fafafa">' +
          '<img id="cropImg" src="' + srcDataUrl + '" style="max-width:96%;max-height:96%;display:block">' +
          '<div id="cropBox">' +
            '<span id="cropHandle" style="position:absolute;right:-11px;bottom:-11px;width:22px;height:22px;background:#e2617f;border:3px solid #fff;border-radius:50%;cursor:nwse-resize;touch-action:none"></span>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;align-items:center;justify-content:center;padding:12px;border-top:1px solid #eee">' +
          '<button class="crop-ratio active" data-r="0">自由</button>' +
          '<button class="crop-ratio" data-r="1">1:1</button>' +
          '<button class="crop-ratio" data-r="0.75">3:4</button>' +
          '<button class="crop-ratio" data-r="1.3333">4:3</button>' +
          '<span id="cropSize" style="margin-left:6px;font-size:13px;color:#888"></span>' +
        '</div>';
      document.body.appendChild(mask);

      var img = mask.querySelector('#cropImg');
      var stage = mask.querySelector('#cropStage');
      var box = mask.querySelector('#cropBox');
      var handle = mask.querySelector('#cropHandle');
      var sizeLabel = mask.querySelector('#cropSize');
      var ratio = 0; // 0 = 自由
      var imgRect = null;

      function setBox(x, y, w, h) {
        box.style.left = x + 'px'; box.style.top = y + 'px';
        box.style.width = w + 'px'; box.style.height = h + 'px';
      }
      function getBox() {
        return { x: parseFloat(box.style.left), y: parseFloat(box.style.top), w: parseFloat(box.style.width), h: parseFloat(box.style.height) };
      }
      function clamp(b) {
        var sRect = stage.getBoundingClientRect();
        var ix = imgRect.left - sRect.left, iy = imgRect.top - sRect.top;
        var iw = imgRect.width, ih = imgRect.height;
        b.w = Math.max(30, Math.min(b.w, iw));
        b.h = Math.max(30, Math.min(b.h, ih));
        b.x = Math.max(ix, Math.min(b.x, ix + iw - b.w));
        b.y = Math.max(iy, Math.min(b.y, iy + ih - b.h));
        return b;
      }
      function applyBox(b) { var c = clamp(b); setBox(c.x, c.y, c.w, c.h); updateSize(); }
      function updateSize() {
        if (!imgRect || !img.naturalWidth) return;
        var b = getBox();
        var sx = (b.x - (imgRect.left - stage.getBoundingClientRect().left)) / imgRect.width * img.naturalWidth;
        var sw = b.w / imgRect.width * img.naturalWidth;
        var sh = b.h / imgRect.height * img.naturalHeight;
        sizeLabel.textContent = '≈ ' + Math.round(Math.min(sw, 1024)) + '×' + Math.round(Math.min(sh, 1024)) + 'px';
      }
      function layout() {
        imgRect = img.getBoundingClientRect();
        if (!box.dataset.init) {
          var w = imgRect.width * 0.82, h = imgRect.height * 0.82;
          var sRect = stage.getBoundingClientRect();
          var x = (imgRect.left - sRect.left) + (imgRect.width - w) / 2;
          var y = (imgRect.top - sRect.top) + (imgRect.height - h) / 2;
          setBox(x, y, w, h); box.dataset.init = '1'; updateSize();
        }
      }
      img.onload = layout;
      if (img.complete && img.naturalWidth) layout();

      var drag = null;
      function onDown(e, mode) { e.preventDefault(); drag = { mode: mode, sx: e.clientX, sy: e.clientY, b: getBox() }; }
      function onMove(e) {
        if (!drag) return;
        var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy, b = drag.b;
        if (drag.mode === 'move') {
          applyBox({ x: b.x + dx, y: b.y + dy, w: b.w, h: b.h });
        } else {
          var nw = Math.max(30, b.w + dx);
          var nh = ratio ? nw / ratio : Math.max(30, b.h + dy);
          applyBox({ x: b.x, y: b.y, w: nw, h: nh });
        }
      }
      function onUp() { drag = null; }

      box.addEventListener('pointerdown', function (e) { if (e.target === handle) return; onDown(e, 'move'); });
      handle.addEventListener('pointerdown', function (e) { onDown(e, 'resize'); });
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);

      mask.querySelectorAll('.crop-ratio').forEach(function (btn) {
        btn.addEventListener('click', function () {
          ratio = parseFloat(btn.dataset.r);
          mask.querySelectorAll('.crop-ratio').forEach(function (b2) { b2.classList.toggle('active', b2 === btn); });
          if (ratio) { var b = getBox(); applyBox({ x: b.x, y: b.y, w: b.w, h: b.w / ratio }); }
        });
      });

      function cleanup() {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        mask.remove();
      }
      mask.querySelector('#cropCancel').addEventListener('click', function () { cleanup(); resolve(null); });
      mask.querySelector('#cropDone').addEventListener('click', function () {
        var b = getBox(), sRect = stage.getBoundingClientRect();
        var sx = (b.x - (imgRect.left - sRect.left)) / imgRect.width * img.naturalWidth;
        var sy = (b.y - (imgRect.top - sRect.top)) / imgRect.height * img.naturalHeight;
        var sw = b.w / imgRect.width * img.naturalWidth;
        var sh = b.h / imgRect.height * img.naturalHeight;
        cropToSize(srcDataUrl, sx, sy, sw, sh).then(function (d) { cleanup(); resolve(d); });
      });
    });
  }

  global.Img = { compress: compress, toWhiteBg: toWhiteBg, crop: crop, cropToSize: cropToSize };
})(window);
