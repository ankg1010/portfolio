(function () {
  /* ---- Tunable settings: edit these to taste ---- */
  var CONFIG = {
    coreColor:   [244, 84, 30],   // vermilion center
    edgeColor:   [27, 69, 208],   // cobalt blue outer ring
    size:        520,             // glow diameter in px
    blur:        10,              // edge softness (lower = sharper)
    opacity:     0.60,            // glow strength
    ease:        0.04,            // follow lag (lower = heavier/slower)
    stretch:     0.15,            // liquid stretch in direction of motion (0 = none)
    irregularity:0.05,            // organic blob wobble (0 = perfect circle)
    glowGrain:   0.10,            // grain density inside the glow circle (0 = none)
    showDot:     true,            // small cursor dot
    dotColor:    [10, 42, 102],   // deep navy dot
    zIndex:      0                // sits BEHIND content (keep page content above 0)
  };
  /* ------------------------------------------------ */

  if (window.__glowBg) return;
  window.__glowBg = true;

  var c = CONFIG.coreColor, e = CONFIG.edgeColor, o = CONFIG.opacity;

  var layer = document.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  layer.id = '__glow_bg_layer';
  var ls = layer.style;
  ls.setProperty('position', 'fixed', 'important');
  ls.setProperty('inset', '0', 'important');
  ls.setProperty('width', '100vw', 'important');
  ls.setProperty('height', '100vh', 'important');
  ls.setProperty('overflow', 'hidden', 'important');
  ls.setProperty('pointer-events', 'none', 'important');
  ls.setProperty('z-index', String(CONFIG.zIndex), 'important');

  var wrap = document.createElement('div');
  var ws = wrap.style;
  ws.position = 'absolute';
  ws.top = '0';
  ws.left = '0';
  ws.width = CONFIG.size + 'px';
  ws.height = CONFIG.size + 'px';
  ws.pointerEvents = 'none';
  ws.willChange = 'transform';

  var orb = document.createElement('div');
  var os = orb.style;
  os.width = '100%';
  os.height = '100%';
  os.borderRadius = '50%';
  os.pointerEvents = 'none';
  os.willChange = 'transform, border-radius';
  os.filter = 'blur(' + CONFIG.blur + 'px)';
  os.background = 'radial-gradient(circle, ' +
    'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + o + ') 0%, ' +
    'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + o + ') 30%, ' +
    'rgba(' + e[0] + ',' + e[1] + ',' + e[2] + ',' + o + ') 70%, ' +
    'rgba(' + e[0] + ',' + e[1] + ',' + e[2] + ',' + o + ') 88%, ' +
    'rgba(' + e[0] + ',' + e[1] + ',' + e[2] + ',0) 100%)';
  wrap.appendChild(orb);

  var grainCv = null, gctx = null;
  if (CONFIG.glowGrain > 0) {
    grainCv = document.createElement('canvas');
    grainCv.width = 256; grainCv.height = 256;
    var grs = grainCv.style;
    grs.position = 'absolute';
    grs.inset = '0';
    grs.width = '100%';
    grs.height = '100%';
    grs.pointerEvents = 'none';
    grs.willChange = 'transform';
    grs.mixBlendMode = 'multiply';
    grs.filter = 'blur(1px)';
    var maskImg = 'radial-gradient(circle, #000 0%, #000 40%, transparent 66%)';
    grs.setProperty('-webkit-mask-image', maskImg);
    grs.setProperty('mask-image', maskImg);
    wrap.appendChild(grainCv);
    gctx = grainCv.getContext('2d');
  }

  layer.appendChild(wrap);

  var dot = null;
  if (CONFIG.showDot) {
    dot = document.createElement('div');
    var ds = dot.style;
    ds.position = 'absolute';
    ds.top = '0';
    ds.left = '0';
    ds.width = '9px';
    ds.height = '9px';
    ds.borderRadius = '50%';
    ds.background = 'rgb(' + CONFIG.dotColor[0] + ',' + CONFIG.dotColor[1] + ',' + CONFIG.dotColor[2] + ')';
    ds.pointerEvents = 'none';
    ds.willChange = 'transform';
    layer.appendChild(dot);
  }

  var W = 0, H = 0, size = CONFIG.size, ease = CONFIG.ease;
  var stretch = CONFIG.stretch, irreg = CONFIG.irregularity;
  var tx, ty, ox, oy, pox, poy, dxp, dyp, t0 = performance.now(), lastGrain = 0;
  var F = [1.1, 1.7, 1.31, 1.93, 0.87, 1.49, 1.21, 1.63];
  var PH = [0, 1.3, 2.1, 3.4, 0.7, 4.2, 5.1, 2.7];
  function clamp(v) { return v < 24 ? 24 : (v > 76 ? 76 : v); }

  function measure() { W = window.innerWidth; H = window.innerHeight; }
  function center() { tx = W / 2; ty = H / 2; ox = tx; oy = ty; pox = ox; poy = oy; dxp = tx; dyp = ty; }

  function move(ev) {
    var p = ev.touches ? ev.touches[0] : ev;
    tx = p.clientX; ty = p.clientY;
  }

  function loop(now) {
    requestAnimationFrame(loop);
    var t = (now - t0) / 1000;
    pox = ox; poy = oy;
    ox += (tx - ox) * ease; oy += (ty - oy) * ease;
    var vx = ox - pox, vy = oy - poy;
    var speed = Math.sqrt(vx * vx + vy * vy), ang = Math.atan2(vy, vx);

    // position (wrapper)
    wrap.style.transform = 'translate3d(' + (ox - size / 2) + 'px,' + (oy - size / 2) + 'px,0)';

    // irregular blob wobble via 8-value border-radius
    var amp = irreg * 12 + Math.min(speed * irreg * 0.7, 14);
    var r = [];
    for (var i = 0; i < 8; i++) { r.push(clamp(50 + Math.sin(t * F[i] + PH[i]) * amp)); }
    orb.style.borderRadius = r[0] + '% ' + r[1] + '% ' + r[2] + '% ' + r[3] + '% / ' + r[4] + '% ' + r[5] + '% ' + r[6] + '% ' + r[7] + '%';

    // directional liquid stretch
    var amt = Math.min(speed * stretch * 0.05, stretch * 0.85);
    var sx = 1 + amt, sy = 1 - amt * 0.6;
    var tf = 'rotate(' + ang + 'rad) scale(' + sx.toFixed(3) + ',' + sy.toFixed(3) + ') rotate(' + (-ang) + 'rad)';
    orb.style.transform = tf;

    // grain confined to the glow circle, riding along with it
    if (grainCv) {
      grainCv.style.transform = tf;
      if (now - lastGrain > 33) {
        lastGrain = now;
        var img = gctx.createImageData(256, 256), gd = img.data, ga = CONFIG.glowGrain;
        for (var gi = 0; gi < gd.length; gi += 4) { gd[gi] = 12; gd[gi + 1] = 40; gd[gi + 2] = 100; gd[gi + 3] = Math.random() * 255 * ga; }
        gctx.putImageData(img, 0, 0);
      }
    }

    if (dot) {
      dxp += (tx - dxp) * Math.min(ease * 3, 0.4);
      dyp += (ty - dyp) * Math.min(ease * 3, 0.4);
      dot.style.transform = 'translate3d(' + (dxp - 4.5) + 'px,' + (dyp - 4.5) + 'px,0)';
    }
  }

  function init() {
    document.body.appendChild(layer);
    measure(); center();
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('resize', measure);
    requestAnimationFrame(loop);
  }
  if (document.body) init(); else window.addEventListener('DOMContentLoaded', init);
})();
