/* Tabuleiro 3D do Banco Imobiliário (Three.js r128), câmera fixa. Bi3D.create(container, view) -> { update(view), destroy() } ou null sem WebGL. */
(function () {
  var SURF = 0.22; // altura da superfície do tabuleiro

  function emojiTex(e) {
    var cv = document.createElement('canvas'); cv.width = cv.height = 96; var c = cv.getContext('2d');
    c.fillStyle = 'rgba(255,255,255,.92)'; c.beginPath(); c.arc(48, 48, 44, 0, 7); c.fill();
    c.font = '60px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(e, 48, 52);
    return new THREE.CanvasTexture(cv);
  }

  // uma ficha diferente para cada jogador (carro, cartola, cachorro, navio, bota, foguete)
  function token(idx, color, emoji) {
    var g = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.35, metalness: 0.2 }), dark = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 });
    function add(geo, m, x, y, z) { var o = new THREE.Mesh(geo, m); o.position.set(x || 0, y || 0, z || 0); o.castShadow = true; g.add(o); return o; }
    var B = THREE.BoxGeometry, Cy = THREE.CylinderGeometry, Sp = THREE.SphereGeometry, Co = THREE.ConeGeometry;
    if (idx === 0) { add(new B(0.5, 0.16, 0.26), mat, 0, 0.16, 0); add(new B(0.26, 0.14, 0.22), mat, -0.03, 0.31, 0); [[-0.16, 0.14], [0.16, 0.14], [-0.16, -0.14], [0.16, -0.14]].forEach(function (w) { var wh = add(new Cy(0.07, 0.07, 0.05, 14), dark, w[0], 0.07, w[1]); wh.rotation.x = Math.PI / 2; }); }
    else if (idx === 1) { add(new Cy(0.3, 0.3, 0.04, 24), mat, 0, 0.04, 0); add(new Cy(0.18, 0.18, 0.34, 24), mat, 0, 0.22, 0); add(new Cy(0.185, 0.185, 0.06, 24), dark, 0, 0.12, 0); }
    else if (idx === 2) { var b = add(new Sp(0.2, 16, 12), mat, 0, 0.24, 0); b.scale.set(1.4, 1, 0.9); add(new Sp(0.13, 14, 10), mat, 0.28, 0.36, 0); add(new Co(0.04, 0.12, 8), dark, 0.3, 0.5, 0.06); add(new Co(0.04, 0.12, 8), dark, 0.3, 0.5, -0.06); [[-0.15, 0.1], [0.15, 0.1], [-0.15, -0.1], [0.15, -0.1]].forEach(function (l) { add(new Cy(0.04, 0.04, 0.14, 8), mat, l[0], 0.07, l[1]); }); }
    else if (idx === 3) { add(new B(0.56, 0.14, 0.22), mat, 0, 0.12, 0); add(new B(0.22, 0.14, 0.18), mat, -0.06, 0.26, 0); add(new Cy(0.02, 0.02, 0.4, 8), dark, 0.08, 0.4, 0); add(new B(0.02, 0.26, 0.22), new THREE.MeshStandardMaterial({ color: 0xffffff }), 0.1, 0.42, 0); }
    else if (idx === 4) { add(new B(0.2, 0.36, 0.2), mat, -0.1, 0.22, 0); add(new B(0.38, 0.12, 0.2), mat, 0.04, 0.06, 0); }
    else { add(new Cy(0.11, 0.11, 0.4, 16), mat, 0, 0.3, 0); add(new Co(0.11, 0.18, 16), dark, 0, 0.59, 0); [0, 2.1, 4.2].forEach(function (a) { add(new B(0.04, 0.16, 0.12), mat, Math.cos(a) * 0.14, 0.14, Math.sin(a) * 0.14).rotation.y = -a; }); }
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTex(emoji), depthTest: false })); sp.scale.set(0.5, 0.5, 1); sp.position.y = 0.95; sp.renderOrder = 10; g.add(sp);
    var ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 8, 28), new THREE.MeshBasicMaterial({ color: 0xFCA311 })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.02; ring.visible = false; g.add(ring);
    g.scale.set(1.1, 1.1, 1.1);
    return { g: g, ring: ring };
  }

  function create(container, v) {
    if (!window.THREE || !window.BIBoard || !window.BI) return null;
    var BI = window.BI, BB = window.BIBoard, renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return null; }
    if (!renderer || !renderer.getContext || !renderer.getContext()) return null;
    var W = container.clientWidth || 900, HT = container.clientHeight || 800;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(W, HT, false);
    renderer.setClearColor(0x000000, 0); renderer.shadowMap.enabled = true; renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block'; container.appendChild(renderer.domElement);

    var scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(40, W / HT, 0.1, 120);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x3b4a78, 0.95));
    var sun = new THREE.DirectionalLight(0xffffff, 0.8); sun.position.set(6, 18, 9); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    var sc = sun.shadow.camera; sc.left = -10; sc.right = 10; sc.top = 10; sc.bottom = -10; sc.near = 1; sc.far = 50; scene.add(sun);

    var base = new THREE.Mesh(new THREE.BoxGeometry(BB.L + 0.7, 0.5, BB.L + 0.7), new THREE.MeshStandardMaterial({ color: 0x5b3a22, roughness: 0.7 }));
    base.position.y = -0.06; base.receiveShadow = true; scene.add(base);
    var cv = document.createElement('canvas'); BB.draw(cv);
    var tex = new THREE.CanvasTexture(cv); tex.anisotropy = 8; tex.encoding = THREE.sRGBEncoding;
    var top = new THREE.Mesh(new THREE.PlaneGeometry(BB.L, BB.L), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
    top.rotation.x = -Math.PI / 2; top.position.y = SURF; top.receiveShadow = true; scene.add(top);

    // marcas por casa: dono (barra colorida), hipoteca (véu escuro), casas e hotel
    var ownM = [], mortM = [], houseM = [], hotelM = [];
    var green = new THREE.MeshStandardMaterial({ color: 0x2e9e4f, roughness: 0.5 }), red = new THREE.MeshStandardMaterial({ color: 0xd62839, roughness: 0.5 });
    BI.SQ.forEach(function (s, i) {
      if (!s.price) return;
      var g = BB.geom(i), os = BB.ownerSpot(i);
      var o = new THREE.Mesh(new THREE.BoxGeometry(os.alongX ? 0.8 : 0.16, 0.06, os.alongX ? 0.16 : 0.8), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }));
      o.position.set(os.x, SURF + 0.03, os.z); o.visible = false; o.castShadow = true; scene.add(o); ownM[i] = o;
      var m = new THREE.Mesh(new THREE.PlaneGeometry(g.w * 0.96, g.d * 0.96), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55 }));
      m.rotation.x = -Math.PI / 2; m.position.set(g.cx, SURF + 0.01, g.cz); m.visible = false; scene.add(m); mortM[i] = m;
      if (s.type === 'prop') {
        houseM[i] = []; for (var k = 0; k < 4; k++) { var h = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.17, 0.17), green); h.visible = false; h.castShadow = true; scene.add(h); houseM[i].push(h); }
        var ho = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.2), red); ho.visible = false; ho.castShadow = true; scene.add(ho); hotelM[i] = ho;
      }
    });

    // fichas
    var toks = {};
    function ensureTokens(view) {
      view.players.forEach(function (p) {
        if (toks[p.id]) return;
        var T = BI.TOKENS[p.idx], t = token(p.idx, T.c, T.e); scene.add(t.g);
        toks[p.id] = { g: t.g, ring: t.ring, x: 0, z: 0, hop: 0, pos: -1, queue: [], seg: null, jail: false };
      });
    }

    function update(view) {
      ensureTokens(view);
      // casas, dono, hipoteca
      view.owner.forEach(function (o, i) {
        if (!ownM[i]) return;
        var pl = o === null ? null : view.players.filter(function (p) { return p.id === o; })[0];
        ownM[i].visible = !!pl; if (pl) ownM[i].material.color.set(BI.TOKENS[pl.idx].c);
        mortM[i].visible = !!view.mort[i];
        if (houseM[i]) {
          var lv = view.level[i], sp = BB.houseSpots(i, lv);
          houseM[i].forEach(function (h, k) { var s = lv < 5 && sp[k]; h.visible = !!s; if (s) h.position.set(s.x, SURF + 0.11, s.z); });
          hotelM[i].visible = lv === 5; if (lv === 5) { hotelM[i].position.set(sp[0].x, SURF + 0.12, sp[0].z); var al = BB.geom(i).side; hotelM[i].rotation.y = al === 1 || al === 3 ? Math.PI / 2 : 0; }
        }
      });
      // fichas agrupadas por casa para não sobrepor
      var groups = {}; view.players.forEach(function (p) { if (p.bankrupt) return; var k = p.pos + (p.inJail ? 'j' : ''); (groups[k] = groups[k] || []).push(p); });
      view.players.forEach(function (p) {
        var t = toks[p.id]; t.g.visible = !p.bankrupt; if (p.bankrupt) return;
        var grp = groups[p.pos + (p.inJail ? 'j' : '')], spot = BB.tokenSpot(p.pos, grp.indexOf(p), grp.length, p.inJail);
        if (t.pos === -1) { t.x = spot.x; t.z = spot.z; t.queue = []; }
        else if (t.pos !== p.pos) {
          var pts = [], lm = view.lastMove;
          if (lm && lm.id === p.id && lm.kind === 'step' && !p.inJail) BB.path(t.pos, p.pos).forEach(function (sq) { var s = BB.tokenSpot(sq, 0, 1, false); pts.push({ x: s.x, z: s.z, hop: 0.3 }); });
          else pts.push({ x: spot.x, z: spot.z, hop: 1.2 });
          pts[pts.length - 1].x = spot.x; pts[pts.length - 1].z = spot.z;
          t.dur = Math.max(0.03, Math.min(0.24, 2.0 / pts.length)); t.queue = pts; t.seg = null;
        } else if (!t.queue.length && !t.seg && (Math.abs(t.x - spot.x) > 0.01 || Math.abs(t.z - spot.z) > 0.01)) { t.queue = [{ x: spot.x, z: spot.z, hop: 0 }]; t.dur = 0.2; }
        t.pos = p.pos; t.jail = p.inJail; t.turn = view.turn === p.id && view.phase !== 'over'; t.ring.visible = t.turn;
      });
      dirty = 3;
    }

    var D = 20, E = 1.0, TARGET = new THREE.Vector3(0, 0, 0.6), corners = [], dirty = 3;
    function place(dist) { cam.position.set(TARGET.x, TARGET.y + Math.sin(E) * dist, TARGET.z + Math.cos(E) * dist); cam.lookAt(TARGET); cam.updateMatrixWorld(true); }
    var hh = BB.L / 2 + 0.35;
    [-hh, hh].forEach(function (x) { [-hh, hh].forEach(function (z) { corners.push(new THREE.Vector3(x, 0, z), new THREE.Vector3(x, 1.0, z)); }); });
    function fit() {
      var dist = D;
      for (var k = 0; k < 50; k++) {
        place(dist); cam.updateProjectionMatrix();
        var m = 0; corners.forEach(function (c) { var p = c.clone().project(cam); m = Math.max(m, Math.abs(p.x), Math.abs(p.y)); });
        if (m > 0.95) dist *= 1.04; else if (m < 0.86) dist *= 0.97; else break;
      }
      D = dist; place(D); dirty = 3;
    }
    update(v); fit();
    function onResize() { var w = container.clientWidth, h = container.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); fit(); }
    window.addEventListener('resize', onResize);

    function step(dt, now) {
      var busy = false;
      Object.keys(toks).forEach(function (id) {
        var t = toks[id];
        if (!t.seg && t.queue.length) { var n = t.queue.shift(); t.seg = { fx: t.x, fz: t.z, tx: n.x, tz: n.z, t: 0, hop: n.hop }; }
        if (t.seg) { busy = true; var s = t.seg; s.t += dt / (t.dur || 0.2); var u = Math.min(1, s.t); t.x = s.fx + (s.tx - s.fx) * u; t.z = s.fz + (s.tz - s.fz) * u; t.hop = Math.sin(Math.PI * u) * s.hop; if (u >= 1) { t.seg = null; t.hop = 0; } }
        var bob = t.turn && !t.seg ? Math.abs(Math.sin(now * 0.004)) * 0.12 : 0; if (t.turn) busy = true;
        t.g.position.set(t.x, SURF + t.hop + bob, t.z);
      });
      return busy;
    }
    var raf = 0, alive = true, last = (window.performance || Date).now();
    function loop(now) {
      if (!alive) return; raf = requestAnimationFrame(loop);
      var tt = now || Date.now(), dt = Math.min(0.05, Math.max(0, (tt - last) / 1000)); last = tt;
      if (step(dt, tt) || dirty-- > 0) renderer.render(scene, cam);
    }
    raf = requestAnimationFrame(loop);

    return {
      update: update,
      destroy: function () { alive = false; cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); try { renderer.dispose(); } catch (e) {} if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement); },
      _tok: function () { return Object.keys(toks).map(function (id) { var t = toks[id]; return { id: id, x: t.x, z: t.z, busy: !!t.seg || t.queue.length > 0, visible: t.g.visible }; }); },
      _vis: function () { return { owners: ownM.filter(function (m) { return m && m.visible; }).length, mort: mortM.filter(function (m) { return m && m.visible; }).length, houses: houseM.reduce(function (a, hs) { return a + (hs ? hs.filter(function (h) { return h.visible; }).length : 0); }, 0), hotels: hotelM.filter(function (h) { return h && h.visible; }).length }; },
      _cam: function () { return [cam.position.x, cam.position.y, cam.position.z]; }
    };
  }
  window.Bi3D = { create: create };
})();
