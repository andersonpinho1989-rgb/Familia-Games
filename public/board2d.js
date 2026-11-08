/* Tabuleiro 8x8 em 2D (xadrez e dama) para a TV. Board2D.create(container, view, kind) -> { update(view), destroy() }.
   Peças são elementos persistentes (por id) que deslizam com transição CSS. view.pieces = [{id,t,c,x,y}]. */
(function () {
  var GLYPH = { K: '\u265A', Q: '\u265B', R: '\u265C', B: '\u265D', N: '\u265E', P: '\u265F' }; // \uFE0E evita virar emoji no iOS/TV
  function create(container, v, kind) {
    var html = '<div class="bd2" style="position:relative;width:100%;height:100%;border-radius:10px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.5);font-family:sans-serif">';
    for (var i = 0; i < 64; i++) {
      var x = i & 7, y = i >> 3, dark = (x + y) % 2 === 1;
      html += '<div data-s="' + i + '" style="position:absolute;left:' + x * 12.5 + '%;top:' + y * 12.5 + '%;width:12.5%;height:12.5%;background:' + (dark ? '#A9794A' : '#EAD9B5') + '">' +
        (x === 0 ? '<span style="position:absolute;left:3%;top:2%;font-size:1.1vw;font-weight:700;color:' + (dark ? '#EAD9B5' : '#A9794A') + '">' + (8 - y) + '</span>' : '') +
        (y === 7 ? '<span style="position:absolute;right:4%;bottom:2%;font-size:1.1vw;font-weight:700;color:' + (dark ? '#EAD9B5' : '#A9794A') + '">' + 'abcdefgh'[x] + '</span>' : '') + '</div>';
    }
    html += '<div id="bd2hl"></div><div id="bd2pcs"></div></div>';
    container.innerHTML = html;
    var hl = container.querySelector('#bd2hl'), layer = container.querySelector('#bd2pcs'), els = {};

    function pieceHTML(p) {
      if (kind === 'chess') {
        var white = p.c === 'w';
        return '<span style="font-size:min(6.2vw,9vh);line-height:1;color:' + (white ? '#fff' : '#1b1b1b') + ';-webkit-text-stroke:' + (white ? '1.5px #333' : '1px #ddd') +
          ';text-shadow:0 3px 4px rgba(0,0,0,.45)">' + GLYPH[p.t] + '\uFE0E</span>';
      }
      var w = p.c === 'w';
      return '<span style="width:78%;height:78%;border-radius:50%;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 35% 30%,' +
        (w ? '#fffdf5,#d9d0b8' : '#5a5a5a,#1d1d1d') + ');border:3px solid ' + (w ? '#b8ad8c' : '#000') + ';box-shadow:0 4px 6px rgba(0,0,0,.5),inset 0 -3px 5px rgba(0,0,0,.25);font-size:min(3.6vw,5.4vh);color:#E9C46A">' +
        (p.t === 'K' ? '\u265B\uFE0E' : '') + '</span>';
    }
    function place(el, p) { el.style.transform = 'translate(' + p.x * 100 + '%,' + p.y * 100 + '%)'; }
    function update(view) {
      var seen = {};
      view.pieces.forEach(function (p) {
        seen[p.id] = true;
        var el = els[p.id];
        if (!el) {
          el = els[p.id] = document.createElement('div');
          el.style.cssText = 'position:absolute;left:0;top:0;width:12.5%;height:12.5%;display:flex;align-items:center;justify-content:center;transition:transform .45s ease-in-out,opacity .35s,scale .35s';
          place(el, p); layer.appendChild(el); el._sig = '';
        }
        var sig = p.t + p.c; if (el._sig !== sig) { el.innerHTML = pieceHTML(p); el._sig = sig; } // promoção troca o desenho
        place(el, p);
      });
      Object.keys(els).forEach(function (id) { // capturada: some depois do capturador chegar
        if (seen[id]) return;
        var el = els[id]; delete els[id];
        setTimeout(function () { el.style.opacity = '0'; el.style.scale = '.3'; }, 380);
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 800);
      });
      var h = '', sq = function (i, color) { return '<div style="position:absolute;left:' + (i & 7) * 12.5 + '%;top:' + (i >> 3) * 12.5 + '%;width:12.5%;height:12.5%;background:' + color + '"></div>'; };
      if (view.last) h += sq(view.last.from, 'rgba(255,214,10,.38)') + sq(view.last.to, 'rgba(255,214,10,.55)');
      if (view.check >= 0) h += sq(view.check, 'rgba(229,72,77,.75)');
      hl.innerHTML = h;
    }
    update(v);
    return { update: update, destroy: function () { container.innerHTML = ''; } };
  }
  window.Board2D = { create: create, GLYPH: GLYPH };
})();
