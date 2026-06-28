(function () {
  /* ---- Tunable settings: edit these to taste ---- */
  var CONFIG = {
    grainColor:      [27, 69, 208],   // cobalt blue fine grain
    cloudColor:      [12, 40, 100],   // deep navy soft drifts
    grainOpacity:    0.07,            // clean even film grain (marvinx style); 0.04 subtle, 0.10 grainier
    grainScale:      0.6,             // <1 = finer grain particles
    cloudOpacity:    0.0,             // clouds OFF for a uniform grain
    halftoneOpacity: 0.0,             // dots OFF for a uniform grain
    blendMode:       'multiply',      // 'multiply' or 'soft-light'
    zIndex:          2147483000,      // above everything in the app
    grainFPS:        60,              // grain refresh (lower to 30 if it strains)
    jitter:          false            // off for a clean, even film grain
  };
  /* ------------------------------------------------ */

  if (window.__printTexture) return;
  window.__printTexture = true;

  var gc = CONFIG.grainColor, cc = CONFIG.cloudColor;

  var overlay = document.createElement('div');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.id = '__print_texture_overlay';
  var ov = overlay.style;
  ov.setProperty('position', 'fixed', 'important');
  ov.setProperty('top', '0', 'important');
  ov.setProperty('left', '0', 'important');
  ov.setProperty('width', '100vw', 'important');
  ov.setProperty('height', '100vh', 'important');
  ov.setProperty('pointer-events', 'none', 'important');
  ov.setProperty('display', 'block', 'important');
  ov.setProperty('opacity', '1', 'important');
  ov.setProperty('visibility', 'visible', 'important');
  ov.setProperty('z-index', String(CONFIG.zIndex), 'important');
  ov.setProperty('mix-blend-mode', CONFIG.blendMode, 'important');
  ov.setProperty('will-change', 'transform', 'important');
  var cv = document.createElement('canvas');
  var cs = cv.style;
  cs.setProperty('width', '100%', 'important');
  cs.setProperty('height', '100%', 'important');
  cs.setProperty('display', 'block', 'important');
  cs.setProperty('opacity', '1', 'important');
  cs.setProperty('visibility', 'visible', 'important');
  overlay.appendChild(cv);

  var ctx = cv.getContext('2d');
  var W = 0, H = 0, frame = 0, last = 0, t0 = performance.now();

  var tile = document.createElement('canvas');
  var tres = Math.max(64, Math.round(256 * (CONFIG.grainScale || 1)));
  tile.width = tres; tile.height = tres;
  var tctx = tile.getContext('2d');
  var cloud = document.createElement('canvas'); var cctx = cloud.getContext('2d');
  var ht = document.createElement('canvas'); var hctx = ht.getContext('2d');

  function hash(i, j) { var n = (i * 374761393 + j * 668265263) | 0; n = (n ^ (n >> 13)) * 1274126177; return ((n ^ (n >> 16)) >>> 0) / 4294967295; }
  function vn(x, y) { var x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0; var sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy); var a = hash(x0, y0), b = hash(x0 + 1, y0), c = hash(x0, y0 + 1), d = hash(x0 + 1, y0 + 1); return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy; }
  function fbm(x, y) { return 0.6 * vn(x, y) + 0.3 * vn(x * 2 + 5.2, y * 2 + 1.3) + 0.1 * vn(x * 4 + 9.1, y * 4 + 7.7); }

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W; cv.height = H;
    cloud.width = Math.max(2, Math.ceil(W / 8));
    cloud.height = Math.max(2, Math.ceil(H / 8));
    ht.width = W; ht.height = H;
    genHt(0);
  }

  function genTile() {
    var img = tctx.createImageData(tres, tres), d = img.data;
    for (var i = 0; i < d.length; i += 4) { d[i] = gc[0]; d[i + 1] = gc[1]; d[i + 2] = gc[2]; d[i + 3] = Math.random() * 255; }
    tctx.putImageData(img, 0, 0);
  }
  function genCloud(t) {
    var cw = cloud.width, ch = cloud.height, img = cctx.createImageData(cw, ch), d = img.data;
    var dx = t * 0.02, dy = t * 0.012, k = 0;
    for (var y = 0; y < ch; y++) { for (var x = 0; x < cw; x++) {
      var v = fbm(x * 0.12 + dx, y * 0.12 + dy), a = (v - 0.46) * 2.4; if (a < 0) a = 0; if (a > 1) a = 1;
      d[k] = cc[0]; d[k + 1] = cc[1]; d[k + 2] = cc[2]; d[k + 3] = a * 255; k += 4;
    } }
    cctx.putImageData(img, 0, 0);
  }
  function genHt(t) {
    hctx.clearRect(0, 0, ht.width, ht.height);
    if (CONFIG.halftoneOpacity <= 0) return;
    var sp = 8, maxR = sp * 0.46, dx = t * 0.02, dy = t * 0.012, ox = (t * 0.25) % sp, oy = (t * 0.18) % sp;
    for (var py = -sp; py < H + sp; py += sp) { for (var px = -sp; px < W + sp; px += sp) {
      var sx = px + ox, sy = py + oy, v = fbm((sx / 8) * 0.12 + dx, (sy / 8) * 0.12 + dy), r = (0.22 + 0.78 * v) * maxR;
      hctx.fillStyle = 'rgba(' + gc[0] + ',' + gc[1] + ',' + gc[2] + ',0.5)'; hctx.beginPath(); hctx.arc(sx, sy, r, 0, 6.283); hctx.fill();
      hctx.fillStyle = 'rgba(244,84,30,0.26)'; hctx.beginPath(); hctx.arc(sx + 1.4, sy - 1, r, 0, 6.283); hctx.fill();
    } }
  }

  var minDelta = 1000 / CONFIG.grainFPS;
  function loop(now) {
    requestAnimationFrame(loop);
    if (now - last < minDelta) return; last = now;
    var t = (now - t0) / 1000;
    genTile();
    if (frame % 5 === 0) genCloud(t);
    if (frame % 10 === 0) genHt(t);
    frame++;
    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    ctx.globalAlpha = CONFIG.cloudOpacity;
    ctx.drawImage(cloud, 0, 0, cloud.width, cloud.height, 0, 0, W, H);
    if (CONFIG.halftoneOpacity > 0) { ctx.globalAlpha = CONFIG.halftoneOpacity; ctx.drawImage(ht, 0, 0); }
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = CONFIG.grainOpacity;
    ctx.fillStyle = ctx.createPattern(tile, 'repeat');
    ctx.save();
    ctx.translate(-(Math.random() * tres | 0), -(Math.random() * tres | 0));
    ctx.fillRect(0, 0, W + tres, H + tres);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function jitter() {
    if (CONFIG.jitter) {
      var x = (Math.random() * 2 - 1).toFixed(2), y = (Math.random() * 2 - 1).toFixed(2);
      overlay.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
      setTimeout(function () { overlay.style.transform = 'translate3d(0,0,0)'; }, 120);
    }
    setTimeout(jitter, 4000 + Math.random() * 4000);
  }

  function init() {
    document.body.appendChild(overlay);
    resize();
    window.addEventListener('resize', resize);
    console.log('[print-texture] live. canvas size:', W + 'x' + H, '| if this is 0x0 the overlay has no size');
    requestAnimationFrame(loop);
    setTimeout(jitter, 5000);
  }
  if (document.body) init(); else window.addEventListener('DOMContentLoaded', init);
})();
