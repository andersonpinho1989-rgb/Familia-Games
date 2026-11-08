/* Tabuleiro 2D do Banco Imobiliário. Bi2D.create(container, view) -> { update(view), destroy() }.
   Fundo = mesmo desenho do 3D (canvas); por cima: fichas (deslizam casa a casa), casas/hotéis, marca do dono e véu de hipoteca. */
(function () {
  function create(container, v) {
    var BI = window.BI, BB = window.BIBoard, L = BB.L;
    container.innerHTML = '<div style="position:relative;width:100%;height:100%;border-radius:10px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.5)"><canvas style="width:100%;height:100%;display:block"></canvas><div class="bi2ov" style="position:absolute;left:0;top:0;right:0;bottom:0"></div></div>';
    BB.draw(container.querySelector('canvas'));
    var ov = container.querySelector('.bi2ov'), timers = [];
    var pct = function (x) { return ((x + L / 2) / L * 100) + '%'; }, sz = function (w) { return (w / L * 100) + '%'; };
    function box(css) { var d = document.createElement('div'); d.style.cssText = 'position:absolute;' + css; ov.appendChild(d); return d; }
    function center(el, x, z, w, h) { el.style.left = pct(x - w / 2); el.style.top = pct(z - h / 2); el.style.width = sz(w); el.style.height = sz(h); }

    var own = [], mort = [], hs = [], hotel = [], toks = {};
    BI.SQ.forEach(function (s, i) {
      if (!s.price) return;
      var g = BB.geom(i), os = BB.ownerSpot(i), w = os.alongX ? 0.8 : 0.16, h = os.alongX ? 0.16 : 0.8;
      own[i] = box('display:none;border-radius:3px;box-shadow:0 1px 3px rgba(0,0,0,.6)'); center(own[i], os.x, os.z, w, h);
      mort[i] = box('display:none;background:rgba(0,0,0,.55);color:#fff;font:700 1.1vw sans-serif;align-items:center;justify-content:center'); mort[i].textContent = 'HIPOTECADA'; center(mort[i], g.cx, g.cz, g.w * 0.96, g.d * 0.96);
      if (s.type === 'prop') { hs[i] = []; for (var k = 0; k < 4; k++) { var h2 = box('display:none;background:#2e9e4f;border:1px solid #145c2c;border-radius:2px'); hs[i].push(h2); } hotel[i] = box('display:none;background:#d62839;border:1px solid #7a0f1a;border-radius:2px'); }
    });

    function tokenEl(p) {
      var T = BI.TOKENS[p.idx], d = box('display:flex;align-items:center;justify-content:center;border-radius:50%;background:' + T.c + ';border:3px solid #fff;box-shadow:0 3px 6px rgba(0,0,0,.6);font-size:min(1.9vw,3vh);transition:left .2s linear,top .2s linear;z-index:5');
      d.textContent = T.e; return d;
    }
    function setTok(t, spot) { center(t.el, spot.x, spot.z, 0.62, 0.62); }
    function update(view) {
      view.owner.forEach(function (o, i) {
        if (!own[i]) return;
        var pl = o === null ? null : view.players.filter(function (p) { return p.id === o; })[0];
        own[i].style.display = pl ? 'block' : 'none'; if (pl) own[i].style.background = BI.TOKENS[pl.idx].c;
        mort[i].style.display = view.mort[i] ? 'flex' : 'none';
        if (hs[i]) {
          var lv = view.level[i], sp = BB.houseSpots(i, lv);
          hs[i].forEach(function (h, k) { var s = lv < 5 && sp[k]; h.style.display = s ? 'block' : 'none'; if (s) center(h, s.x, s.z, 0.18, 0.18); });
          hotel[i].style.display = lv === 5 ? 'block' : 'none'; if (lv === 5) { var g = BB.geom(i), vert = g.side === 1 || g.side === 3; center(hotel[i], sp[0].x, sp[0].z, vert ? 0.2 : 0.5, vert ? 0.5 : 0.2); }
        }
      });
      var groups = {}; view.players.forEach(function (p) { if (!p.bankrupt) { var k = p.pos + (p.inJail ? 'j' : ''); (groups[k] = groups[k] || []).push(p); } });
      view.players.forEach(function (p) {
        var t = toks[p.id] || (toks[p.id] = { el: tokenEl(p), pos: -1 });
        t.el.style.display = p.bankrupt ? 'none' : 'flex'; if (p.bankrupt) return;
        var grp = groups[p.pos + (p.inJail ? 'j' : '')], spot = BB.tokenSpot(p.pos, grp.indexOf(p), grp.length, p.inJail), lm = view.lastMove;
        t.el.style.outline = view.turn === p.id && view.phase !== 'over' ? '4px solid #FCA311' : 'none';
        if (t.pos === -1) setTok(t, spot);
        else if (t.pos !== p.pos) {
          var pts = lm && lm.id === p.id && lm.kind === 'step' && !p.inJail ? BB.path(t.pos, p.pos).map(function (sq) { return BB.tokenSpot(sq, 0, 1, false); }) : [spot];
          pts[pts.length - 1] = spot;
          pts.forEach(function (s, k) { timers.push(setTimeout(function () { setTok(t, s); }, k * 210)); });
        } else setTok(t, spot);
        t.pos = p.pos;
      });
    }
    update(v);
    return { update: update, destroy: function () { timers.forEach(clearTimeout); container.innerHTML = ''; } };
  }
  window.Bi2D = { create: create };
})();
