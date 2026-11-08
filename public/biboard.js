/* Geometria e desenho do tabuleiro do Banco Imobiliário (usado pelo 3D e pelo 2D). Unidade = 1 casa. Tabuleiro L×L, centro em (0,0).
   Casas 0..39 no sentido horário a partir do Início (canto inferior direito). */
(function () {
  var L = 12, C = 1.5, W = 1, D = 1.5, S = 200, H = L / 2;
  var IN = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // direção do centro do tabuleiro, por lado (0 baixo, 1 esquerda, 2 cima, 3 direita)
  var ANG = [0, Math.PI / 2, Math.PI, -Math.PI / 2];

  function geom(i) {
    var g = { i: i, corner: false, side: -1, cx: 0, cz: 0, w: C, d: C }, k;
    if (i === 0) { g.corner = true; g.cx = H - C / 2; g.cz = H - C / 2; return g; }
    if (i === 10) { g.corner = true; g.cx = -H + C / 2; g.cz = H - C / 2; return g; }
    if (i === 20) { g.corner = true; g.cx = -H + C / 2; g.cz = -H + C / 2; return g; }
    if (i === 30) { g.corner = true; g.cx = H - C / 2; g.cz = -H + C / 2; return g; }
    if (i < 10) { g.side = 0; g.cx = H - C - (i - 0.5) * W; g.cz = H - D / 2; g.w = W; g.d = D; }
    else if (i < 20) { k = i - 10; g.side = 1; g.cx = -H + D / 2; g.cz = H - C - (k - 0.5) * W; g.w = D; g.d = W; }
    else if (i < 30) { k = i - 20; g.side = 2; g.cx = -H + C + (k - 0.5) * W; g.cz = -H + D / 2; g.w = W; g.d = D; }
    else { k = i - 30; g.side = 3; g.cx = H - D / 2; g.cz = -H + C + (k - 0.5) * W; g.w = D; g.d = W; }
    return g;
  }
  function along(side) { return side === 0 || side === 2 ? [1, 0] : [0, 1]; }

  // casas e hotel ficam na faixa colorida (lado de dentro); a marca do dono, na borda de fora
  function houseSpots(i, level) {
    var g = geom(i); if (g.corner || level < 1) return [];
    var inn = IN[g.side], al = along(g.side), bx = g.cx + inn[0] * (D / 2 - 0.2), bz = g.cz + inn[1] * (D / 2 - 0.2);
    if (level === 5) return [{ x: bx, z: bz, hotel: true }];
    var off = [-0.3, -0.1, 0.1, 0.3], out = [];
    for (var k = 0; k < level; k++) out.push({ x: bx + al[0] * off[k], z: bz + al[1] * off[k], hotel: false });
    return out;
  }
  function ownerSpot(i) { var g = geom(i), inn = IN[g.side], al = along(g.side); return { x: g.cx - inn[0] * (D / 2 - 0.1), z: g.cz - inn[1] * (D / 2 - 0.1), alongX: al[0] === 1 }; }
  // posição das fichas: várias na mesma casa se espalham em círculo; prisão tem "dentro" e "só visitando"
  function tokenSpot(i, k, n, inJail) {
    var g = geom(i), x = g.cx, z = g.cz;
    if (i === 10) { if (inJail) { x += 0.32; z -= 0.32; } else { x -= 0.4; z += 0.4; } }
    else if (!g.corner) { var inn = IN[g.side]; x += inn[0] * -0.08; z += inn[1] * -0.08; }
    if (n > 1) { var a = k * 2 * Math.PI / n; x += Math.cos(a) * 0.25; z += Math.sin(a) * 0.25; }
    return { x: x, z: z };
  }
  function path(from, to) { var out = [], p = from; while (p !== to && out.length < 41) { p = (p + 1) % 40; out.push(p); } return out; }

  function wrap(c, text, maxW) {
    var words = String(text).split(' '), lines = [], line = '';
    words.forEach(function (w) { var t = line ? line + ' ' + w : w; if (c.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; });
    if (line) lines.push(line); return lines;
  }
  var ICON = { 5: '🚉', 15: '🚌', 25: '✈️', 35: '⚓', 12: '💡', 28: '🚰', 4: '💸', 38: '💎' };
  function draw(cv) {
    var BI = window.BI; cv.width = cv.height = L * S;
    var c = cv.getContext('2d'), i;
    c.fillStyle = '#CBE3C7'; c.fillRect(0, 0, L * S, L * S);
    c.save(); c.translate(L * S / 2, L * S / 2); c.rotate(-Math.PI / 4);
    c.fillStyle = '#B5262E'; c.fillRect(-640, -150, 1280, 300); c.fillStyle = '#fff'; c.font = 'bold 150px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('BANCO', 0, -55);
    c.font = 'bold 110px sans-serif'; c.fillText('IMOBILIÁRIO', 0, 70); c.restore();
    c.textAlign = 'center'; c.textBaseline = 'middle';
    for (i = 0; i < 40; i++) {
      var sq = BI.SQ[i], g = geom(i), w = g.w * S, h = g.d * S;
      c.save(); c.translate((g.cx + H) * S, (g.cz + H) * S); if (!g.corner) c.rotate(ANG[g.side]);
      c.fillStyle = '#F8F3E4'; c.fillRect(-w / 2, -h / 2, w, h); c.strokeStyle = '#2b2b2b'; c.lineWidth = 4; c.strokeRect(-w / 2, -h / 2, w, h);
      c.fillStyle = '#222';
      if (g.corner) {
        var big = { start: ['🏁', 'INÍCIO', 'receba o salário'], jail: ['🔒', 'PRISÃO', 'apenas visitando'], parking: ['🅿️', 'PARADA', 'LIVRE'], gotojail: ['👮', 'VÁ PARA', 'A PRISÃO'] }[sq.type];
        c.font = '110px sans-serif'; c.fillText(big[0], 0, -35); c.font = 'bold 36px sans-serif'; c.fillText(big[1], 0, 62); c.font = '26px sans-serif'; c.fillText(big[2], 0, 100);
      } else {
        var top = -h / 2;
        if (sq.type === 'prop') { c.fillStyle = BI.GROUP[sq.group].c; c.fillRect(-w / 2 + 2, top + 2, w - 4, h * 0.22); c.strokeRect(-w / 2 + 2, top + 2, w - 4, h * 0.22); c.fillStyle = '#222'; top += h * 0.22; }
        c.font = 'bold 25px sans-serif';
        var lines = wrap(c, sq.name, w - 22), y = top + 38;
        if (sq.type === 'card') { c.font = '78px sans-serif'; c.fillText(i % 2 ? '🍀' : '❓', 0, -8); c.font = 'bold 25px sans-serif'; lines.forEach(function (t, k) { c.fillText(t, 0, 62 + k * 28); }); }
        else if (sq.type === 'tax' || sq.type === 'station' || sq.type === 'util') { c.font = '72px sans-serif'; c.fillText(ICON[i], 0, -2); c.font = 'bold 25px sans-serif'; lines.forEach(function (t, k) { c.fillText(t, 0, 58 + k * 28); }); }
        else lines.forEach(function (t, k) { c.fillText(t, 0, y + k * 30); });
        if (sq.price || sq.amt) { c.font = 'bold 28px sans-serif'; c.fillText(BI.fmt(sq.price || sq.amt), 0, h / 2 - 28); }
      }
      c.restore();
    }
  }
  window.BIBoard = { L: L, C: C, W: W, D: D, S: S, geom: geom, houseSpots: houseSpots, ownerSpot: ownerSpot, tokenSpot: tokenSpot, path: path, draw: draw };
})();
