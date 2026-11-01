const GameEngine = require('./GameEngine');
// Anel de 52 casas; cada cor entra em OFF[assento]. Progresso p: -1 base | 0..50 anel | 51..55 reta final | 56 chegou.
const OFF = [0, 13, 26, 39], SAFE = new Set([0, 13, 26, 39, 8, 21, 34, 47]), RING_END = 50, FIN = 56;
const TURN_MS = 30000, K = process.env.LUDO_FAST ? 0.01 : 1; // K só acelera os testes

class Ludo extends GameEngine {
  static meta = {
    id: 'ludo', name: 'Ludo', emoji: '🎯', min: 2, max: 4, available: true, pick: true, // pick: cada jogador escolhe sua cor/personagem
    options: [
      { key: 'theme', label: '🎨 Tema', choices: ['classic', 'transformers', 'shrek'], labels: { classic: 'Clássico', transformers: 'Transformers', shrek: 'Shrek' }, def: 'classic' },
      { key: 'view', label: '🖥 Tabuleiro na TV', choices: ['3d', '2d'], labels: { '3d': '3D', '2d': '2D' }, def: '3d', live: true },
    ],
  };

  onStart() {
    const ps = this.ctx.players(), picks = this.ctx.picks(), seat = {}, taken = new Set();
    this.theme = this.ctx.settings().theme || 'classic';
    ps.forEach((p) => { const st = picks[p.id]; if (Number.isInteger(st) && st >= 0 && st < 4 && !taken.has(st)) { taken.add(st); seat[p.id] = st; } });
    const free = (ps.length === 2 ? [0, 2, 1, 3] : [0, 1, 2, 3]).filter((x) => !taken.has(x)); // 2 jogadores sem escolha: lados opostos
    ps.forEach((p) => { if (seat[p.id] === undefined) seat[p.id] = free.shift(); });
    this.seat = seat;
    this.order = ps.map((p) => p.id).sort((a, b) => seat[a] - seat[b]); // a vez segue o sentido do tabuleiro
    this.pos = Object.fromEntries(this.order.map((id) => [id, [-1, -1, -1, -1]]));
    this.turn = 0; this.rollN = 0; this.sixes = 0; this.dice = null; this.mv = []; this.winner = null; this.msg = '';
    this.begin();
  }

  cur() { return this.order[this.turn]; }
  name(id) { return this.ctx.players().find((p) => p.id === id)?.name || '?'; }
  ring(id, p) { return (OFF[this.seat[id]] + p) % 52; }
  movable(id, d) { return this.pos[id].map((p, i) => ((p === -1 ? d === 6 : p + d <= FIN) ? i : -1)).filter((i) => i >= 0); }
  clear() { clearTimeout(this.t); clearTimeout(this.t2); }

  begin() { this.phase = 'roll'; this.mv = []; this.arm(); this.ctx.update(); }

  arm() { // se o jogador da vez caiu ou demorou, joga automático
    clearTimeout(this.t);
    const me = this.ctx.players().find((p) => p.id === this.cur());
    const ms = (me?.connected ? TURN_MS : 3000) * K;
    this.endsAt = Date.now() + ms;
    this.t = setTimeout(() => {
      if (this.phase === 'roll') this.roll(this.cur());
      else if (this.phase === 'move') this.doMove(this.cur(), this.mv[0]);
    }, ms);
  }

  onPlayerChange() { if (this.phase === 'roll' || this.phase === 'move') this.arm(); }

  onAction(id, type, p = {}) {
    if (id !== this.cur()) return; // regra de turno sempre no servidor
    if (type === 'roll' && this.phase === 'roll') this.roll(id);
    if (type === 'move' && this.phase === 'move' && this.mv.includes(p.piece)) this.doMove(id, p.piece);
  }

  hold(fn, ms = 1600) { this.phase = 'pass'; this.ctx.update(); this.t2 = setTimeout(fn, ms * K); }

  roll(id) {
    this.clear();
    this.dice = 1 + Math.floor(Math.random() * 6); this.rollN++;
    this.sixes = this.dice === 6 ? this.sixes + 1 : 0;
    if (this.sixes >= 3) { this.mv = []; this.msg = `${this.name(id)} tirou três 6 seguidos e perdeu a vez!`; return this.hold(() => this.next(false)); }
    this.mv = this.movable(id, this.dice);
    this.msg = '';
    if (!this.mv.length) { this.msg = `${this.name(id)} não tem jogada.`; return this.hold(() => this.next(false)); }
    if (this.mv.length === 1) { const i = this.mv[0]; return this.hold(() => this.doMove(id, i), 900); } // única opção: move sozinho
    this.phase = 'move'; this.arm(); this.ctx.update();
  }

  doMove(id, i) {
    this.clear();
    const arr = this.pos[id];
    const np = arr[i] === -1 ? 0 : arr[i] + this.dice;
    arr[i] = np;
    let cap = null;
    if (np <= RING_END) {
      const r = this.ring(id, np);
      if (!SAFE.has(r)) for (const o of this.order) if (o !== id) this.pos[o].forEach((q, j) => {
        if (q >= 0 && q <= RING_END && this.ring(o, q) === r) { this.pos[o][j] = -1; cap = o; }
      });
    }
    this.mv = [];
    if (arr.every((p) => p === FIN)) { this.phase = 'over'; this.winner = id; this.msg = `${this.name(id)} venceu!`; return this.ctx.update(); }
    this.msg = cap ? `${this.name(id)} capturou uma peça de ${this.name(cap)}!` : np === FIN ? `${this.name(id)} levou uma peça para casa!` : '';
    this.next(this.dice === 6 || !!cap); // jogada extra: tirou 6 ou capturou
  }

  next(extra) {
    if (!extra) { this.turn = (this.turn + 1) % this.order.length; this.sixes = 0; }
    this.begin();
  }

  common() {
    return { theme: this.theme, view: this.ctx.settings().view || '3d', phase: this.phase, turn: this.cur(), dice: this.dice, rollN: this.rollN, msg: this.msg, pos: this.pos, seats: this.seat, order: this.order,
      winner: this.winner, endsAt: this.endsAt, serverNow: Date.now(), movable: this.phase === 'move' ? this.mv : [] };
  }
  hostView() { return this.common(); }
  playerView(id) { const c = this.common(); return { ...c, myTurn: id === this.cur(), seat: this.seat[id], movable: id === this.cur() ? c.movable : [] }; }
  destroy() { this.clear(); }
}
module.exports = Ludo;
