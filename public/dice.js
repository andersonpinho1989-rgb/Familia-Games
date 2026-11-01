/* Dado 3D em CSS. Dice.create(el, tamanhoPx) -> { set(v), roll(v) } */
(function () {
  var PIPS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
  var ROT = { 1: [0, 0], 2: [0, -90], 3: [-90, 0], 4: [90, 0], 5: [0, 90], 6: [0, 180] }; // gira o cubo p/ a face v ficar de frente
  var PLACE = { 1: '', 2: 'rotateY(90deg) ', 3: 'rotateX(90deg) ', 4: 'rotateX(-90deg) ', 5: 'rotateY(-90deg) ', 6: 'rotateY(180deg) ' };
  function create(el, size) {
    var faces = '';
    for (var v = 1; v <= 6; v++) {
      var pips = PIPS[v].map(function (n) { return '<i style="grid-area:' + Math.ceil(n / 3) + '/' + (((n - 1) % 3) + 1) + '"></i>'; }).join('');
      faces += '<div class="dface' + (v === 1 ? ' one' : '') + '" style="transform:' + PLACE[v] + 'translateZ(' + size / 2 + 'px)">' + pips + '</div>';
    }
    el.innerHTML = '<div class="dwrap" style="width:' + size + 'px;height:' + size + 'px"><div class="dtilt"><div class="dcube">' + faces + '</div></div></div>';
    var wrap = el.firstChild, cube = wrap.firstChild.firstChild, kx = 0, ky = 0;
    function apply(v, anim) {
      cube.style.transition = anim ? 'transform 1.25s cubic-bezier(.15,.75,.25,1)' : 'none';
      cube.style.transform = 'rotateX(' + (ROT[v][0] + 360 * kx) + 'deg) rotateY(' + (ROT[v][1] + 360 * ky) + 'deg)';
    }
    apply(1, false);
    return {
      set: function (v) { apply(v, false); },
      roll: function (v) {
        kx += 2 + Math.floor(Math.random() * 2); ky += 2 + Math.floor(Math.random() * 2);
        wrap.classList.remove('toss'); void wrap.offsetWidth; wrap.classList.add('toss'); apply(v, true);
      }
    };
  }
  window.Dice = { create: create };
})();
