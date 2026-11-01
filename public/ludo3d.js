/* Tabuleiro 3D do Ludo (Three.js r128).
   Ludo3D.create(container, view, helpers) -> { update(view), destroy() } ou null se THREE/WebGL não existir
   (nesse caso a TV usa o tabuleiro 2D). helpers = { cellOf, LC, RING, OFF, STARS, COL } vindos do index.html. */
(function () {
  var SURF = 0.52; // altura da superfície do tabuleiro

  function rr(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function star(c, cx, cy, R, r) {
    c.beginPath();
    for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, d = i % 2 ? r : R; c.lineTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d); }
    c.closePath();
  }

  // desenha o tabuleiro inteiro num canvas 1500x1500 e usa como textura do tampo
  function boardTexture(H, used) {
    var S = 100, cv = document.createElement('canvas'); cv.width = cv.height = S * 15;
    var c = cv.getContext('2d'), k, i, j;
    c.fillStyle = H.LT.bg; c.fillRect(0, 0, S * 15, S * 15);
    for (k = 0; k < 4; k++) {
      var ox = [0, 9, 9, 0][k] * S, oy = [0, 0, 9, 9][k] * S, on = used[k];
      c.globalAlpha = on ? 1 : 0.28; c.fillStyle = H.LC[k]; rr(c, ox + 8, oy + 8, 6 * S - 16, 6 * S - 16, 46); c.fill();
      c.fillStyle = H.LT.paper; rr(c, ox + 70, oy + 70, 6 * S - 140, 6 * S - 140, 36); c.fill();
      if (on) { c.globalAlpha = 0.9; c.font = '170px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#000'; c.fillText(H.LT.seats[k].e, ox + 3 * S, oy + 3 * S + 6); }
      c.globalAlpha = on ? 0.4 : 0.12; c.fillStyle = H.LC[k];
      for (i = 0; i < 4; i++) { var p = H.cellOf(k, -1, i); c.beginPath(); c.arc(p[0] * S, p[1] * S, 46, 0, 7); c.fill(); }
      c.globalAlpha = 1;
      for (j = 0; j < 5; j++) { var q = H.COL(k, j); c.fillStyle = H.LC[k]; rr(c, q[0] * S + 6, q[1] * S + 6, S - 12, S - 12, 14); c.fill(); }
    }
    H.RING.forEach(function (cell, idx) {
      var st = H.OFF.indexOf(idx), x = cell[0] * S, y = cell[1] * S;
      c.fillStyle = st >= 0 ? H.LC[st] : H.LT.paper; rr(c, x + 6, y + 6, S - 12, S - 12, 14); c.fill();
      if (H.STARS.indexOf(idx) >= 0) { c.fillStyle = '#C9A227'; star(c, x + S / 2, y + S / 2 + 2, 34, 15); c.fill(); }
      if (st >= 0) { c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.arc(x + S / 2, y + S / 2, 16, 0, 7); c.fill(); }
    });
    var T = [[6, 6, 6, 9], [6, 6, 9, 6], [9, 6, 9, 9], [6, 9, 9, 9]];
    for (k = 0; k < 4; k++) {
      c.fillStyle = H.LC[k]; c.beginPath(); c.moveTo(T[k][0] * S, T[k][1] * S); c.lineTo(T[k][2] * S, T[k][3] * S);
      c.lineTo(7.5 * S, 7.5 * S); c.closePath(); c.fill();
    }
    var t = new THREE.CanvasTexture(cv); t.anisotropy = 8; t.encoding = THREE.sRGBEncoding;
    return t;
  }

  function labelTexture(n) {
    var cv = document.createElement('canvas'); cv.width = cv.height = 64;
    var c = cv.getContext('2d');
    c.fillStyle = 'rgba(255,255,255,.96)'; c.beginPath(); c.arc(32, 32, 29, 0, 7); c.fill();
    c.fillStyle = '#14213D'; c.font = 'bold 40px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(n), 32, 35);
    return new THREE.CanvasTexture(cv);
  }

  // peão do tema: classic (torneado), robot (robô genérico de caixas), round (barrigudo)
  function pawn(color, num, shape) {
    var g = new THREE.Group(), top;
    var mat = new THREE.MeshStandardMaterial({ color: color, roughness: shape === 'robot' ? 0.3 : 0.4, metalness: shape === 'robot' ? 0.65 : 0.12, emissive: 0x000000 });
    function box(w, h, d, x, y, z, m) { var b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m || mat); b.position.set(x, y, z); b.castShadow = true; g.add(b); return b; }
    if (shape === 'robot') {
      box(0.5, 0.5, 0.36, 0, 0.3, 0);                       // tronco
      box(0.14, 0.34, 0.16, -0.34, 0.32, 0); box(0.14, 0.34, 0.16, 0.34, 0.32, 0); // braços
      box(0.34, 0.24, 0.3, 0, 0.7, 0);                      // cabeça
      box(0.28, 0.07, 0.05, 0, 0.72, 0.16, new THREE.MeshStandardMaterial({ color: 0x66e6ff, emissive: 0x2aa6c8, roughness: 0.2 })); // visor
      box(0.05, 0.14, 0.05, 0, 0.9, 0);                     // antena
      top = 1.25;
    } else {
      var prof = (shape === 'round'
        ? [[0, 0], [0.3, 0], [0.4, 0.1], [0.4, 0.26], [0.3, 0.4], [0.14, 0.48], [0, 0.5]]
        : [[0, 0], [0.3, 0], [0.31, 0.05], [0.24, 0.12], [0.16, 0.3], [0.21, 0.36], [0.12, 0.42], [0, 0.45]])
        .map(function (p) { return new THREE.Vector2(p[0], p[1]); });
      var body = new THREE.Mesh(new THREE.LatheGeometry(prof, 24), mat); body.castShadow = true; g.add(body);
      var head = new THREE.Mesh(new THREE.SphereGeometry(shape === 'round' ? 0.22 : 0.17, 20, 16), mat);
      head.position.y = shape === 'round' ? 0.66 : 0.56; head.castShadow = true; g.add(head);
      top = shape === 'round' ? 1.2 : 1.08;
    }
    var ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 8, 32), new THREE.MeshBasicMaterial({ color: 0xFCA311 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.04; ring.visible = false; g.add(ring);
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(num), depthTest: false }));
    sp.scale.set(0.42, 0.42, 1); sp.position.y = top; sp.renderOrder = 10; g.add(sp);
    g.scale.set(1.15, 1.15, 1.15);
    return { g: g, mat: mat, ring: ring };
  }

  function create(container, v, H) {
    if (!window.THREE) return null;
    var renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return null; }
    if (!renderer || !renderer.getContext || !renderer.getContext()) return null;
    var W = container.clientWidth || 900, HT = container.clientHeight || 780;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, HT, false);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block';
    container.appendChild(renderer.domElement);

    var scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(42, W / HT, 0.1, 100);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x3b4a78, 0.9));
    var sun = new THREE.DirectionalLight(0xffffff, 0.85);
    sun.position.set(6, 16, 9); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    var sc = sun.shadow.camera; sc.left = -11; sc.right = 11; sc.top = 11; sc.bottom = -11; sc.near = 1; sc.far = 45;
    scene.add(sun);

    var used = [false, false, false, false];
    v.order.forEach(function (id) { used[v.seats[id]] = true; });
    var wood = new THREE.Mesh(new THREE.BoxGeometry(16.2, 0.9, 16.2), new THREE.MeshStandardMaterial({ color: H.LT.wood, roughness: 0.7 }));
    wood.position.y = -0.1; wood.receiveShadow = true; scene.add(wood);
    var slab = new THREE.Mesh(new THREE.BoxGeometry(15.4, 0.16, 15.4), new THREE.MeshStandardMaterial({ color: H.LT.slab, roughness: 0.5 }));
    slab.position.y = 0.43; slab.receiveShadow = true; scene.add(slab);
    var top = new THREE.Mesh(new THREE.PlaneGeometry(15, 15), new THREE.MeshStandardMaterial({ map: boardTexture(H, used), roughness: 0.55 }));
    top.rotation.x = -Math.PI / 2; top.position.y = SURF - 0.005; top.receiveShadow = true; scene.add(top);
    var orb = new THREE.Mesh(new THREE.SphereGeometry(0.38, 24, 16), new THREE.MeshStandardMaterial({ color: 0xE9C46A, metalness: 0.7, roughness: 0.25 }));
    orb.position.set(0, SURF + 0.3, 0); orb.castShadow = true; scene.add(orb);

    // peças: 4 por jogador
    var pieces = [];
    v.order.forEach(function (id, n) {
      for (var i = 0; i < 4; i++) {
        var pw = pawn(H.LC[v.seats[id]], i + 1, H.LT.pawn); scene.add(pw.g);
        pieces.push({ id: id, i: i, seat: v.seats[id], g: pw.g, mat: pw.mat, ring: pw.ring, x: 7.5, y: 7.5, hop: 0, queue: [], seg: null, p: undefined, tx: 0, ty: 0, hl: false });
      }
    });

    // câmera: enquadra o tabuleiro automaticamente em qualquer proporção de tela
    var TARGET = new THREE.Vector3(0, 0.3, 0.4), E = 1.0, D = 24;
    function place(dist, ang) {
      var bz = Math.cos(E) * dist, by = Math.sin(E) * dist;
      cam.position.set(TARGET.x + bz * Math.sin(ang), TARGET.y + by, TARGET.z + bz * Math.cos(ang));
      cam.lookAt(TARGET); cam.updateMatrixWorld(true);
    }
    var corners = [];
    [-8, 8].forEach(function (x) { [-8, 8].forEach(function (z) { corners.push(new THREE.Vector3(x, 0.5, z), new THREE.Vector3(x, 1.4, z)); }); });
    function fit() {
      var dist = D;
      for (var k = 0; k < 50; k++) {
        place(dist, 0); cam.updateProjectionMatrix();
        var m = 0; corners.forEach(function (c) { var p = c.clone().project(cam); m = Math.max(m, Math.abs(p.x), Math.abs(p.y)); });
        if (m > 0.93) dist *= 1.04; else if (m < 0.84) dist *= 0.97; else break;
      }
      D = dist; place(D, 0);
    }
    fit(); // câmera fixa: o tabuleiro não se mexe (só os peões)
    function onResize() {
      var w = container.clientWidth, h = container.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); fit();
    }
    window.addEventListener('resize', onResize);

    // ---------- estado -> animação ----------
    function update(view) {
      var items = [], groups = {};
      view.order.forEach(function (id, n) {
        view.pos[id].forEach(function (p, i) {
          var c = H.cellOf(view.seats[id], p, i), it = { pc: pieces[n * 4 + i], p: p, x: c[0], y: c[1], id: id, i: i };
          items.push(it); var k = c[0] + ',' + c[1]; (groups[k] = groups[k] || []).push(it);
        });
      });
      Object.keys(groups).forEach(function (k) {
        var g = groups[k]; if (g.length < 2) return;
        g.forEach(function (it, j) { var a = j * 2 * Math.PI / g.length; it.x += Math.cos(a) * 0.26; it.y += Math.sin(a) * 0.26; });
      });
      items.forEach(function (it) {
        var pc = it.pc, old = pc.p;
        if (old === undefined) { pc.x = it.x; pc.y = it.y; pc.queue = []; pc.seg = null; }
        else if (it.p !== old) {
          var pts = [], q;
          if (it.p > old && old >= 0) for (q = old + 1; q <= it.p; q++) { var c = H.cellOf(pc.seat, q, it.i); pts.push({ x: c[0], y: c[1], hop: 0.35 }); }
          else pts.push({ x: it.x, y: it.y, hop: 1.4 }); // saiu da base ou foi capturado: voa em arco
          pts[pts.length - 1].x = it.x; pts[pts.length - 1].y = it.y;
          pc.dur = Math.max(0.03, Math.min(0.24, 1.8 / pts.length)); pc.queue = pts; pc.seg = null;
        } else if (it.x !== pc.tx || it.y !== pc.ty) { pc.queue = [{ x: it.x, y: it.y, hop: 0 }]; pc.dur = 0.2; pc.seg = null; }
        pc.p = it.p; pc.tx = it.x; pc.ty = it.y;
        var hl = view.turn === it.id && view.movable.indexOf(it.i) >= 0;
        pc.hl = hl; pc.ring.visible = hl; pc.mat.emissive.setHex(hl ? 0x4a3000 : 0x000000);
      });
    }
    update(v);

    function step(dt, now) {
      pieces.forEach(function (pc) {
        if (!pc.seg && pc.queue.length) {
          var nx = pc.queue.shift();
          pc.seg = { fx: pc.x, fy: pc.y, tx: nx.x, ty: nx.y, t: 0, hop: nx.hop };
        }
        if (pc.seg) {
          var s = pc.seg; s.t += dt / (pc.dur || 0.2);
          var u = Math.min(1, s.t);
          pc.x = s.fx + (s.tx - s.fx) * u; pc.y = s.fy + (s.ty - s.fy) * u; pc.hop = Math.sin(Math.PI * u) * s.hop;
          if (u >= 1) { pc.seg = null; pc.hop = 0; }
        }
        var bob = pc.hl ? Math.abs(Math.sin(now * 0.006)) * 0.2 : 0;
        pc.g.position.set(pc.x - 7.5, SURF + pc.hop + bob, pc.y - 7.5);
        pc.ring.rotation.z = now * 0.003;
      });
    }

    var raf = 0, alive = true, last = (window.performance || Date).now();
    function loop(now) {
      if (!alive) return;
      raf = requestAnimationFrame(loop);
      var t = now || Date.now(), dt = Math.min(0.05, Math.max(0, (t - last) / 1000)); last = t;
      step(dt, t);
      renderer.render(scene, cam);
    }
    raf = requestAnimationFrame(loop);

    return {
      update: update,
      destroy: function () {
        alive = false; cancelAnimationFrame(raf); window.removeEventListener('resize', onResize);
        try { renderer.dispose(); } catch (e) {}
        if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      },
      _cam: function () { return [cam.position.x, cam.position.y, cam.position.z]; },
      _pos: function () { return pieces.map(function (p) { return [p.x, p.y, p.queue.length, !!p.seg]; }); }
    };
  }
  window.Ludo3D = { create: create };
})();
