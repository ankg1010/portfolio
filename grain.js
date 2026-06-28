/* ============================================================
   Interactive print-texture overlay — VISIBLE first pass.
   Mounted as a direct child of <body>, ABOVE all content
   (z-index 9999), pointer-events:none. Each effect has its own
   init() wrapped in try/catch and logs when it starts.
   Tune DOWN later: grain 0.15 -> 0.04–0.08, CA 2px -> 0.5–1px.
   ============================================================ */
(function () {
  if (window.__grainInit) return;
  window.__grainInit = true;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SVGNS = 'http://www.w3.org/2000/svg';

  // shared cursor state
  var MAX = 12, tx = 0, ty = 0, cx = 0, cy = 0, lastNx = 0, lastNy = 0, vel = 0;
  window.addEventListener('mousemove', function (e) {
    var nx = (e.clientX / window.innerWidth) * 2 - 1;
    var ny = (e.clientY / window.innerHeight) * 2 - 1;
    vel += Math.abs(nx - lastNx) + Math.abs(ny - lastNy);
    lastNx = nx; lastNy = ny;
    tx = -nx * MAX; ty = ny * MAX;
  }, { passive: true });

  var wrap, canvas, ctx, W, H, idata, buf32, turb;
  var frameCount = 0;

  // ---- SVG filters: displacement (paper) + channel isolation (CA) ----
  function initSVG() {
    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
    svg.innerHTML =
      '<defs>' +
      '<filter id="grainDisplace" x="-20%" y="-20%" width="140%" height="140%">' +
        '<feTurbulence type="fractalNoise" baseFrequency="0.012 0.018" numOctaves="2" seed="4" stitchTiles="stitch" result="t"/>' +
        '<feDisplacementMap in="SourceGraphic" in2="t" scale="8" xChannelSelector="R" yChannelSelector="G"/>' +
      '</filter>' +
      '<filter id="paperFiber"><feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>' +
      '<filter id="caR"><feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"/></filter>' +
      '<filter id="caB"><feColorMatrix type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"/></filter>' +
      '</defs>';
    document.body.appendChild(svg);
    turb = svg.querySelector('#grainDisplace feTurbulence');
    console.log('[grain] initSVG: filters mounted');
  }

  // ---- Film grain canvas ----
  function initGrain() {
    wrap = document.createElement('div');
    wrap.className = 'grain-wrap';
    canvas = document.createElement('canvas');
    canvas.className = 'grain-canvas';
    wrap.appendChild(canvas);
    document.body.appendChild(wrap);
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    document.documentElement.classList.add('canvas-grain');
    console.log('[grain] initGrain: canvas', canvas.width + 'x' + canvas.height);
  }
  function resize() {
    W = Math.max(2, Math.floor(window.innerWidth * 0.5));
    H = Math.max(2, Math.floor(window.innerHeight * 0.5));
    canvas.width = W; canvas.height = H;
    idata = ctx.createImageData(W, H);
    buf32 = new Uint32Array(idata.data.buffer);
  }
  var COBALT = (208 << 16) | (69 << 8) | 27; // ABGR base for #1B45D0
  function drawGrain() {
    for (var i = 0; i < buf32.length; i++) {
      var r = Math.random() * 255;
      var a = r > 150 ? ((r - 150) * 1.6) | 0 : 0; // denser/visible first pass
      buf32[i] = (a << 24) | COBALT;
    }
    ctx.putImageData(idata, 0, 0);
  }

  // ---- Chromatic aberration on IMAGERY ----
  function initImageAberration() {
    var imgs = document.querySelectorAll('.work-thumb img, .about-visual img, .hero-visual img, .box .shot img');
    var n = 0;
    imgs.forEach(function (img) {
      var host = img.parentElement;
      if (!host) return;
      if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
      host.classList.add('ca-host');
      ['ca-r', 'ca-b'].forEach(function (cls) {
        var c = img.cloneNode(true);
        c.removeAttribute('loading');
        c.className = 'ca-layer ' + cls;
        host.appendChild(c);
      });
      n++;
    });
    console.log('[grain] initImageAberration: ' + n + ' images wrapped');
  }

  // ---- Paper texture layer ----
  function initPaper() {
    var p = document.createElement('div');
    p.className = 'paper-layer';
    document.body.appendChild(p);
    console.log('[grain] initPaper: mounted');
  }

  // ---- main loop (parallax + jitter + grain regen + CA offset) ----
  var jx = 0, jy = 0, jitEnd = 0, nextJit = performance.now() + 4000 + Math.random() * 4000;
  var lastGrain = 0, seedT = 0;
  function frame(now) {
    try {
      if (now - lastGrain > 16) { drawGrain(); lastGrain = now; frameCount++; }
      seedT += 0.06;
      if (turb) turb.setAttribute('seed', (4 + (seedT | 0) % 90).toString());
      if (now > nextJit) { jx = (Math.random() * 2 - 1); jy = (Math.random() * 2 - 1); jitEnd = now + 70 + Math.random() * 70; nextJit = now + 4000 + Math.random() * 4000; }
      if (now > jitEnd) { jx *= 0.6; jy *= 0.6; }
      cx += (tx - cx) * 0.05; cy += (ty - cy) * 0.05;
      vel *= 0.9;
      if (wrap) wrap.style.transform = 'translate3d(' + (cx + jx).toFixed(2) + 'px,' + (cy + jy).toFixed(2) + 'px,0)';
      var ca = (2.0 + Math.min(vel * 8.0, 1.5)).toFixed(2); // VISIBLE 2px first pass
      document.documentElement.style.setProperty('--cax', ca + 'px');
      if (frameCount % 120 === 1) console.log('[grain] frames painted:', frameCount);
    } catch (e) { console.warn('[grain] loop error', e); }
    if (!reduced) requestAnimationFrame(frame);
  }

  function boot() {
    try { initSVG(); } catch (e) { console.warn('[grain] initSVG failed', e); }
    try { initGrain(); } catch (e) { console.warn('[grain] initGrain failed', e); }
    try { initPaper(); } catch (e) { console.warn('[grain] initPaper failed', e); }
    try { initImageAberration(); } catch (e) { console.warn('[grain] initImageAberration failed', e); }
    requestAnimationFrame(frame);
  }
  if (document.body) boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();
