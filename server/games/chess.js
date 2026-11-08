const GameEngine = require('./GameEngine');
const core = require('./chesscore');

class Chess extends GameEngine {
  static meta = {
    id: 'xadrez', name: 'Xadrez', emoji: '♟️', min: 2, max: 2, available: true,
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
    } else this.sides = { w: this.sides.b, b: this.sides.w }; // revanche: troca as cores
    this.st = core.fromFEN(core.START);
    this.legal = core.legal(this.st);
    this.history = []; this.cap = { w: [], b: [] }; this.moves = 0; this.last = null; this.lastCap = false;
    this.over = null; this.drawOffer = null; this.reps = { [core.key(this.st)]: 1 };
    this.ctx.update();
  }

  colorOf(pid) { return pid === this.sides.w ? 'w' : pid === this.sides.b ? 'b' : null; }

  onAction(pid, type, p = {}) {
    const color = this.colorOf(pid); if (!color) return;
    if (this.over) { if (type === 'rematch') this.init(); return; }
    if (type === 'move') {
      if (color !== this.st.turn) return;
      const promo = 'QRBN'.includes(p.promo) && p.promo ? p.promo : 'Q';
      const m = this.legal.find((x) => x.from === p.from && x.to === p.to && (!x.promo || x.promo === promo));
      if (m) this.play(m);
    } else if (type === 'resign') this.finish(core.opp(color), 'resign');
    else if (type === 'offerDraw') { if (!this.drawOffer) { this.drawOffer = color; this.ctx.update(); } }
    else if (type === 'acceptDraw') { if (this.drawOffer && this.drawOffer !== color) this.finish(null, 'agreement'); }
    else if (type === 'declineDraw') { if (this.drawOffer && this.drawOffer !== color) { this.drawOffer = null; this.ctx.update(); } }
  }

  play(m) {
    let s = core.san(this.st, m, this.legal);
    const ns = core.make(this.st, m);
    this.st = ns; this.moves++; this.drawOffer = null;
    if (ns.cap) this.cap[ns.cap.c].push(ns.cap.t);
    this.lastCap = !!ns.cap; this.last = { from: m.from, to: m.to };
    this.legal = core.legal(ns);
    const res = core.result(ns, this.legal), chk = core.inCheck(ns);
    s += res === 'checkmate' ? '#' : chk ? '+' : '';
    this.history.push(s);
    const k = core.key(ns); this.reps[k] = (this.reps[k] || 0) + 1;
    if (res === 'checkmate') return this.finish(core.opp(ns.turn), 'checkmate');
    if (res) return this.finish(null, res);
    if (this.reps[k] >= 3) return this.finish(null, 'repetition');
    this.ctx.update();
  }

  finish(winner, reason) { this.over = { winner, reason }; this.drawOffer = null; this.ctx.update(); }

  base() {
    const pieces = []; this.st.b.forEach((p, i) => p && pieces.push({ id: p.id, t: p.t, c: p.c, x: i & 7, y: i >> 3 }));
    return { kind: 'chess', pieces, turn: this.st.turn, check: core.inCheck(this.st) ? core.kingSq(this.st.b, this.st.turn) : -1, last: this.last, lastCap: this.lastCap,
      history: this.history, captured: this.cap, side: this.sides, over: this.over, drawOffer: this.drawOffer, moves: this.moves, view: this.ctx.settings().view || '3d' };
  }
  hostView() { return this.base(); }
  playerView(pid) {
    const me = this.colorOf(pid);
    return { ...this.base(), me, legal: !this.over && me === this.st.turn ? this.legal.map((m) => [m.from, m.to, m.promo || null]) : [] };
  }
}
Chess.core = core;
module.exports = Chess;
