/* Tabuleiro 3D (xadrez e dama) com Three.js r128, câmera FIXA do lado das brancas.
   Board3D.create(container, view, kind) -> { update(view), destroy() } ou null se não houver WebGL (a TV usa o 2D). */
(function () {
  var TOP = 0.14; // altura da superfície das casas
  var PROF = {
    P: [[0, 0], [0.34, 0], [0.36, 0.06], [0.26, 0.14], [0.16, 0.3], [0.2, 0.34], [0.12, 0.4], [0, 0.42]],
    R: [[0, 0], [0.36, 0], [0.38, 0.08], [0.28, 0.16], [0.25, 0.52], [0.33, 0.56], [0.33, 0.7], [0, 0.7]],
    B: [[0, 0], [0.34, 0], [0.36, 0.06], [0.24, 0.14], [0.14, 0.4], [0.2, 0.46], [0.1, 0.7], [0, 0.72]],
    Q: [[0, 0], [0.36, 0], [0.38, 0.06], [0.26, 0.14], [0.15, 0.5], [0.28, 0.62], [0.3, 0.7], [0.12, 0.76], [0, 0.78]],
    K: [[0, 0], [0.36, 0], [0.38, 0.06], [0.26, 0.14], [0.15, 0.55], [0.28, 0.68], [0.3, 0.78], [0.12, 0.84], [0, 0.86]],
    N: [[0, 0], [0.34, 0], [0.36, 0.06], [0.26, 0.14], [0.2, 0.26], [0, 0.28]]
  };
  var HORSE = [[-0.2, 0], [0.22, 0], [0.2, 0.3], [0.28, 0.5], [0.1, 0.62], [-0.02, 0.7], [-0.1, 0.55], [-0.28, 0.42], [-0.3, 0.3], [-0.12, 0.28]];

  function label(txt) {
    var cv = document.createElement('canvas'); cv.width = cv.height = 64;
    var c = cv.getContext('2d'); c.fillStyle = '#F8F5EE'; c.font = 'bold 44px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, 32, 34);
    var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true })); s.scale.set(0.5, 0.5, 1); return s;
  }

  function create(container, v, kind) {
    if (!window.THREE) return null;
    var renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return null; }
    if (!renderer || !renderer.getContext || !renderer.getContext()) return null;
    var W = container.clientWidth || 800, H = container.clientHeight || 800;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(W, H, false);
    renderer.setClearColor(0x000000, 0); renderer.shadowMap.enabled = true; renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block';
    container.appendChild(renderer.domElement);

    var scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(40, W / H, 0.1, 100);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x3b4a78, 0.9));
    var sun = new THREE.DirectionalLight(0xffffff, 0.85); sun.position.set(5, 14, 8); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    var sc = sun.shadow.camera; sc.left = -8; sc.right = 8; sc.top = 8; sc.bottom = -8; sc.near = 1; sc.far = 40; scene.add(sun);

    // tabuleiro
    var frame = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.5, 9.6), new THREE.MeshStandardMaterial({ color: 0x4a2e1a, roughness: 0.7 }));
    frame.position.y = -0.12; frame.receiveShadow = true; scene.add(frame);
    var mLight = new THREE.MeshStandardMaterial({ color: 0xEAD9B5, roughness: 0.6 }), mDark = new THREE.MeshStandardMaterial({ color: 0xA9794A, roughness: 0.6 });
    for (var i = 0; i < 64; i++) {
      var x = i & 7, y = i >> 3, sq = new THREE.Mesh(new THREE.BoxGeometry(1, 0.14, 1), (x + y) % 2 ? mDark : mLight);
      sq.position.set(x - 3.5, 0.07, y - 3.5); sq.receiveShadow = true; scene.add(sq);
    }
    for (i = 0; i < 8; i++) {
      var f = label('abcdefgh'[i]); f.position.set(i - 3.5, 0.2, 4.45); scene.add(f);
      var r = label(String(8 - i)); r.position.set(-4.45, 0.2, i - 3.5); scene.add(r);
    }
    var hlMat = [0xFFD60A, 0xFFD60A, 0xE5484D].map(function (c, k) { return new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: k === 2 ? 0.7 : 0.45 }); });
    var hls = hlMat.map(function (m) { var p = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m); p.rotation.x = -Math.PI / 2; p.position.y = TOP + 0.004; p.visible = false; scene.add(p); return p; });

    // peças
    var mats = { w: new THREE.MeshStandardMaterial({ color: 0xF3EAD2, roughness: 0.38, metalness: 0.08 }), b: new THREE.MeshStandardMaterial({ color: 0x34261f, roughness: 0.38, metalness: 0.08 }) };
    var gold = new THREE.MeshStandardMaterial({ color: 0xE9C46A, metalness: 0.7, roughness: 0.25 });
    function mesh(geo, mat, x, y, z) { var m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; return m; }
    function lathe(key, mat) { return mesh(new THREE.LatheGeometry(PROF[key].map(function (p) { return new THREE.Vector2(p[0], p[1]); }), 28), mat); }
    function build(t, c) {
      var g = new THREE.Group(), mat = mats[c];
      if (kind === 'dama') {
        g.add(mesh(new THREE.CylinderGeometry(0.38, 0.4, 0.16, 32), mat, 0, 0.08, 0));
        g.add(mesh(new THREE.TorusGeometry(0.28, 0.025, 8, 32), mats[c === 'w' ? 'b' : 'w'], 0, 0.165, 0)).rotation.x = Math.PI / 2;
        if (t === 'K') { g.add(mesh(new THREE.CylinderGeometry(0.38, 0.4, 0.16, 32), mat, 0, 0.24, 0)); var cr = mesh(new THREE.TorusGeometry(0.2, 0.05, 8, 24), gold, 0, 0.34, 0); cr.rotation.x = Math.PI / 2; g.add(cr); }
        return g;
      }
      g.add(lathe(t, mat));
      if (t === 'P') g.add(mesh(new THREE.SphereGeometry(0.17, 20, 16), mat, 0, 0.52, 0));
      if (t === 'R') [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (d) { g.add(mesh(new THREE.BoxGeometry(0.13, 0.1, 0.13), mat, d[0] * 0.2, 0.75, d[1] * 0.2)); });
      if (t === 'B') g.add(mesh(new THREE.SphereGeometry(0.09, 16, 12), mat, 0, 0.8, 0));
      if (t === 'Q') { g.add(mesh(new THREE.SphereGeometry(0.1, 16, 12), mat, 0, 0.9, 0)); }
      if (t === 'K') { g.add(mesh(new THREE.BoxGeometry(0.08, 0.26, 0.08), mat, 0, 1.0, 0)); g.add(mesh(new THREE.BoxGeometry(0.22, 0.08, 0.08), mat, 0, 1.03, 0)); }
      if (t === 'N') {
        var sh = new THREE.Shape(); HORSE.forEach(function (p, k) { if (k === 0) sh.moveTo(p[0], p[1]); else sh.lineTo(p[0], p[1]); }); sh.closePath();
        var geo = new THREE.ExtrudeGeometry(sh, { depth: 0.24, bevelEnabled: false }); geo.translate(0, 0, -0.12);
        var h = mesh(geo, mat, 0, 0.26, 0); h.rotation.y = c === 'w' ? Math.PI / 2 : -Math.PI / 2; g.add(h); // cavalo olha para o adversário
      }
      return g;
    }

    var pcs = {}, dying = [], dirty = 3, first = true;
    function put(pc) { pc.g.position.set(pc.x - 3.5, TOP + (pc.hop || 0), pc.y - 3.5); }
    function update(view) {
      var seen = {};
      view.pieces.forEach(function (p) {
        seen[p.id] = true;
        var pc = pcs[p.id];
        if (!pc) { pc = pcs[p.id] = { g: build(p.t, p.c), x: p.x, y: p.y, t: p.t, c: p.c, tw: null, hop: 0 }; scene.add(pc.g); put(pc); }
        else {
          if (pc.t !== p.t) { scene.remove(pc.g); pc.g = build(p.t, p.c); pc.t = p.t; scene.add(pc.g); put(pc); } // promoção
          if (pc.x !== p.x || pc.y !== p.y) pc.tw = { fx: pc.x, fy: pc.y, tx: p.x, ty: p.y, t: 0, hop: p.t === 'N' ? 0.9 : view.kind === 'dama' ? 0.3 : 0.18 };
        }
      });
      Object.keys(pcs).forEach(function (id) { if (!seen[id]) { dying.push({ pc: pcs[id], delay: 0.4, t: 0 }); delete pcs[id]; } });
      var cells = [view.last && view.last.from, view.last && view.last.to, view.check];
      hls.forEach(function (m, k) { var s = cells[k]; if (s === undefined || s === null || s < 0) { m.visible = false; return; } m.visible = true; m.position.x = (s & 7) - 3.5; m.position.z = (s >> 3) - 3.5; });
      dirty = 3; first = false;
    }

    var D = 14, E = 0.95, TARGET = new THREE.Vector3(0, 0.3, 0.3), corners = [];
    function place(dist) { cam.position.set(TARGET.x, TARGET.y + Math.sin(E) * dist, TARGET.z + Math.cos(E) * dist); cam.lookAt(TARGET); cam.updateMatrixWorld(true); }
    [-4.9, 4.9].forEach(function (x) { [-4.9, 4.9].forEach(function (z) { corners.push(new THREE.Vector3(x, 0, z), new THREE.Vector3(x, 1.3, z)); }); });
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

    function step(dt) {
      var busy = false;
      Object.keys(pcs).forEach(function (id) {
        var pc = pcs[id];
        if (pc.tw) {
          busy = true; var s = pc.tw; s.t += dt / 0.5; var u = Math.min(1, s.t), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
          pc.x = s.fx + (s.tx - s.fx) * e; pc.y = s.fy + (s.ty - s.fy) * e; pc.hop = Math.sin(Math.PI * u) * s.hop;
          if (u >= 1) { pc.tw = null; pc.hop = 0; pc.x = s.tx; pc.y = s.ty; }
          put(pc);
        }
      });
      for (var i = dying.length - 1; i >= 0; i--) { // capturada: espera o capturador chegar, encolhe e some
        var d = dying[i]; busy = true;
        if ((d.delay -= dt) > 0) continue;
        d.t += dt / 0.25; var k = Math.max(0.001, 1 - d.t); d.pc.g.scale.set(k, k, k);
        if (d.t >= 1) { scene.remove(d.pc.g); dying.splice(i, 1); }
      }
      return busy;
    }
    var raf = 0, alive = true, last = (window.performance || Date).now();
    function loop(now) {
      if (!alive) return; raf = requestAnimationFrame(loop);
      var t = now || Date.now(), dt = Math.min(0.05, Math.max(0, (t - last) / 1000)); last = t;
      if (step(dt) || dirty-- > 0) renderer.render(scene, cam); // só desenha quando algo muda
    }
    raf = requestAnimationFrame(loop);

    return {
      update: update,
      destroy: function () {
        alive = false; cancelAnimationFrame(raf); window.removeEventListener('resize', onResize);
        try { renderer.dispose(); } catch (e) {}
        if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      },
      _pos: function () { return Object.keys(pcs).map(function (id) { return [+id, pcs[id].x, pcs[id].y, !!pcs[id].tw]; }); },
      _dying: function () { return dying.length; },
      _cam: function () { return [cam.position.x, cam.position.y, cam.position.z]; }
    };
  }
  window.Board3D = { create: create };
})();
