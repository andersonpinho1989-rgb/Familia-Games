const GameEngine = require('./GameEngine');
/* Dama brasileira: 8x8, 12 peças, peça comum anda 1 casa na diagonal à frente e captura para frente e para trás,
   dama anda/captura a qualquer distância ("voadora"), captura obrigatória pela sequência que pega MAIS peças,
   a peça só vira dama se TERMINAR a jogada na última fileira. Casa = y*8+x; pretas começam em cima (y 0-2). */
const DIRS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const inb = (x, y) => x >= 0 && x < 8 && y >= 0 && y < 8;
const sqName = (i) => 'abcdefgh'[i & 7] + (8 - (i >> 3));
let UID = 1;

function setup() {
  const b = Array(64).fill(null);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    if ((x + y) % 2 !== 1) continue;
    if (y < 3) b[y * 8 + x] = { id: UID++, c: 'b', k: false };
    if (y > 4) b[y * 8 + x] = { id: UID++, c: 'w', k: false };
  }
  return { b, turn: 'w', kingMoves: 0 };
}

function captureSeqs(b, from) { // todas as sequências de captura terminadas da peça em "from"
  const p = b[from], out = [];
  const empty = (i) => b[i] === null || i === from; // a casa de partida conta como vazia
  (function dfs(pos, caps, path) {
    let found = false; const x = pos & 7, y = pos >> 3;
    for (const [dx, dy] of DIRS) {
      if (!p.k) {
        const bx = x + 2 * dx, by = y + 2 * dy; if (!inb(bx, by)) continue;
        const a = (y + dy) * 8 + x + dx, t = by * 8 + bx, q = b[a];
        if (q && q.c !== p.c && !caps.includes(a) && empty(t)) { found = true; dfs(t, caps.concat(a), path.concat(t)); }
      } else {
        let cx = x + dx, cy = y + dy;
        while (inb(cx, cy) && empty(cy * 8 + cx)) { cx += dx; cy += dy; }
        if (!inb(cx, cy)) continue;
        const a = cy * 8 + cx, q = b[a];
        if (!q || q.c === p.c || caps.includes(a)) continue; // própria peça ou peça já capturada bloqueia
        let lx = cx + dx, ly = cy + dy;
        while (inb(lx, ly) && empty(ly * 8 + lx)) { found = true; dfs(ly * 8 + lx, caps.concat(a), path.concat(ly * 8 + lx)); lx += dx; ly += dy; }
      }
    }
    if (!found && caps.length) out.push({ from, to: pos, caps, path });
  })(from, [], [from]);
  return out;
}

function moves(st) {
  const { b, turn } = st, caps = [], simple = [];
  for (let i = 0; i < 64; i++) {
    const p = b[i]; if (!p || p.c !== turn) continue;
    caps.push(...captureSeqs(b, i));
  }
  if (caps.length) { const mx = Math.max(...caps.map((m) => m.caps.length)); return caps.filter((m) => m.caps.length === mx); }
  for (let i = 0; i < 64; i++) {
    const p = b[i]; if (!p || p.c !== turn) continue;
    const x = i & 7, y = i >> 3;
    for (const [dx, dy] of DIRS) {
      if (!p.k) {
        if (dy !== (turn === 'w' ? -1 : 1)) continue;
        if (inb(x + dx, y + dy) && !b[(y + dy) * 8 + x + dx]) simple.push({ from: i, to: (y + dy) * 8 + x + dx, caps: [], path: [i, (y + dy) * 8 + x + dx] });
      } else {
        let nx = x + dx, ny = y + dy;
        while (inb(nx, ny) && !b[ny * 8 + nx]) { simple.push({ from: i, to: ny * 8 + nx, caps: [], path: [i, ny * 8 + nx] }); nx += dx; ny += dy; }
      }
    }
  }
  return simple;
}

function apply(st, m) {
  const b = st.b.slice(), p = b[m.from];
  m.caps.forEach((c) => (b[c] = null)); // as capturadas saem só no fim da jogada
  const lastRow = p.c === 'w' ? 0 : 7;
  b[m.from] = null; // primeiro libera a origem: a captura pode terminar na própria casa de partida
  b[m.to] = { id: p.id, c: p.c, k: p.k || (m.to >> 3) === lastRow };
  return { b, turn: p.c === 'w' ? 'b' : 'w', kingMoves: !m.caps.length && p.k ? st.kingMoves + 1 : 0 };
}

class Dama extends GameEngine {
  static meta = {
    id: 'dama', name: 'Dama', emoji: '⚫', min: 2, max: 2, available: true,
    options: [
      { key: 'white', label: '⚪ Quem joga de brancas', choices: ['random', 'vip', 'other'], labels: { random: 'Sorteio', vip: '⭐ (quem iniciou)', other: 'O outro jogador' }, def: 'random' },
      { key: 'view', label: '🖥 Tabuleiro na TV', choices: ['3d', '2d'], labels: { '3d': '3D', '2d': '2D' }, def: '3d', live: true },
    ],
  };

  onStart() { this.sides = null; this.init(); }

  init() {
    const ps = this.ctx.players().map((p) => p.id), opt = this.ctx.settings().white || 'random';
    if (!this.sides) {
      let w = ps[Math.random() < 0.5 ? 0 : 1];
      if (opt === 'vip') w = this.ctx.vip(); else if (opt === 'other') w = ps.find((id) => id !== this.ctx.vip()) || ps[1];
      this.sides = { w, b: ps.find((id) => id !== w) };
    } else this.sides = { w: this.sides.b, b: this.sides.w };
    this.st = setup(); this.legal = moves(this.st);
    this.history = []; this.lost = { w: 0, b: 0 }; this.moves = 0; this.last = null; this.lastCap = false; this.over = null; this.drawOffer = null;
    this.ctx.update();
  }

  colorOf(pid) { return pid === this.sides.w ? 'w' : pid === this.sides.b ? 'b' : null; }

  onAction(pid, type, p = {}) {
    const color = this.colorOf(pid); if (!color) return;
    if (this.over) { if (type === 'rematch') this.init(); return; }
    if (type === 'move') {
      if (color !== this.st.turn) return;
      const m = this.legal.find((x) => x.from === p.from && x.to === p.to); // várias sequências com o mesmo destino: vale a primeira
      if (m) this.play(m);
    } else if (type === 'resign') this.finish(color === 'w' ? 'b' : 'w', 'resign');
    else if (type === 'offerDraw') { if (!this.drawOffer) { this.drawOffer = color; this.ctx.update(); } }
    else if (type === 'acceptDraw') { if (this.drawOffer && this.drawOffer !== color) this.finish(null, 'agreement'); }
    else if (type === 'declineDraw') { if (this.drawOffer && this.drawOffer !== color) { this.drawOffer = null; this.ctx.update(); } }
  }

  play(m) {
    const mover = this.st.turn, opp = mover === 'w' ? 'b' : 'w';
    this.history.push(m.caps.length ? sqName(m.from) + m.path.slice(1).map((s) => 'x' + sqName(s)).join('') : sqName(m.from) + '-' + sqName(m.to));
    this.lost[opp] += m.caps.length; this.lastCap = m.caps.length > 0; this.last = { from: m.from, to: m.to };
    this.st = apply(this.st, m); this.moves++; this.drawOffer = null;
    this.legal = moves(this.st);
    if (!this.legal.length) return this.finish(mover, 'nomoves'); // quem não tem jogada (ou peças) perde
    if (this.st.kingMoves >= 40) return this.finish(null, 'kings');  // 20 lances de damas de cada lado sem captura
    this.ctx.update();
  }

  finish(winner, reason) { this.over = { winner, reason }; this.drawOffer = null; this.ctx.update(); }

  base() {
    const pieces = []; this.st.b.forEach((p, i) => p && pieces.push({ id: p.id, t: p.k ? 'K' : 'M', c: p.c, x: i & 7, y: i >> 3 }));
    return { kind: 'dama', pieces, turn: this.st.turn, check: -1, last: this.last, lastCap: this.lastCap, history: this.history, lost: this.lost,
      side: this.sides, over: this.over, drawOffer: this.drawOffer, moves: this.moves, view: this.ctx.settings().view || '3d' };
  }
  hostView() { return this.base(); }
  playerView(pid) {
    const me = this.colorOf(pid);
    return { ...this.base(), me, legal: !this.over && me === this.st.turn ? this.legal.map((m) => [m.from, m.to, m.caps.length]) : [] };
  }
}
Dama.core = { setup, moves, apply, captureSeqs, sqName };
module.exports = Dama;
