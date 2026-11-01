const GameEngine = require('./GameEngine');
const CATS = ['Nome', 'Animal', 'Cidade/País', 'Cor', 'Fruta/Comida', 'Objeto', 'Profissão', 'Marca', 'Filme/Série'];
const ALPHABET = 'ABCDEFGHIJLMNOPQRSTUVXZ'.split(''); // sem K, W, Y (quase impossíveis em português). Edite aqui se quiser todas as 26.
const ROUND_MS = 60000, SPIN_MS = 3500, DRAW_MS = 20000, ROUNDS = 3;
const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const shuffle = (a) => [...a].sort(() => Math.random() - 0.5);

class Adedonha extends GameEngine {
  static meta = { id: 'adedonha', name: 'Adedonha / Stop', emoji: '✍️', min: 2, max: 8, available: true };

  onStart() { this.scores = {}; this.used = []; this.round = 0; this.nextRound(); }

  clear() { clearTimeout(this.timer); }

  // 1) cada rodada começa com um jogador (em rodízio) girando a roleta de letras
  nextRound() {
    this.clear();
    if (this.round >= ROUNDS) { this.phase = 'final'; return this.ctx.update(); }
    this.round++;
    const ps = this.ctx.players();
    const drawer = ps[(this.round - 1) % ps.length];
    this.drawer = drawer.id;
    this.phase = 'draw';
    this.letter = null; this.cats = shuffle(CATS).slice(0, 5);
    this.drafts = {}; this.results = null; this.stopper = null;
    const ms = drawer.connected ? DRAW_MS : 3000; // se o sorteador sumiu, gira sozinho
    this.endsAt = Date.now() + ms;
    this.timer = setTimeout(() => this.spin(), ms);
    this.ctx.update();
  }

  // 2) sorteio: nunca repete uma letra já usada na partida
  spin() {
    if (this.phase !== 'draw') return;
    this.clear();
    const pool = ALPHABET.filter((l) => !this.used.includes(l));
    this.letter = pool[Math.floor(Math.random() * pool.length)];
    this.used.push(this.letter);
    this.phase = 'spinning';
    this.spinEndsAt = Date.now() + SPIN_MS;
    this.timer = setTimeout(() => this.startPlay(), SPIN_MS + 700);
    this.ctx.update();
  }

  startPlay() {
    this.phase = 'playing';
    this.endsAt = Date.now() + ROUND_MS;
    this.timer = setTimeout(() => this.finish(null), ROUND_MS);
    this.ctx.update();
  }

  onAction(pid, type, p = {}) {
    const clean = (a) => (Array.isArray(a) ? a : []).slice(0, this.cats ? this.cats.length : 0).map((x) => String(x).slice(0, 30));
    if (this.phase === 'draw' && type === 'spin' && pid === this.drawer) this.spin();
    else if (this.phase === 'playing') {
      if (type === 'draft') { this.drafts[pid] = clean(p.answers); this.ctx.update(); }
      if (type === 'stop') { if (p.answers) this.drafts[pid] = clean(p.answers); this.finish(pid); }
    } else if (this.phase === 'results' && type === 'next' && pid === this.ctx.vip()) this.nextRound();
  }

  finish(stopperId) {
    if (this.phase !== 'playing') return;
    this.clear();
    this.phase = 'results';
    this.stopper = stopperId;
    const ids = this.ctx.players().map((p) => p.id);
    const valid = (t) => norm(t).length >= 2 && norm(t)[0] === this.letter.toLowerCase();
    const results = {};
    ids.forEach((id) => (results[id] = { cells: [], total: 0 }));
    this.cats.forEach((_, i) => {
      const count = {};
      ids.forEach((id) => { const t = this.drafts[id] && this.drafts[id][i]; if (valid(t)) count[norm(t)] = (count[norm(t)] || 0) + 1; });
      ids.forEach((id) => {
        const t = (this.drafts[id] && this.drafts[id][i]) || '';
        const pts = !valid(t) ? 0 : count[norm(t)] === 1 ? 10 : 5;
        results[id].cells.push({ text: t, pts });
        results[id].total += pts;
      });
    });
    ids.forEach((id) => (this.scores[id] = (this.scores[id] || 0) + results[id].total));
    this.results = results;
    this.ctx.update();
  }

  ranking() {
    return this.ctx.players().map((p) => ({ id: p.id, score: (this.scores && this.scores[p.id]) || 0 })).sort((a, b) => b.score - a.score);
  }

  base() {
    return { phase: this.phase, round: this.round, rounds: ROUNDS, cats: this.cats, endsAt: this.endsAt, serverNow: Date.now(),
      drawer: this.drawer, alphabet: ALPHABET, ranking: this.ranking() };
  }
  hostView() {
    return { ...this.base(), letter: this.letter, used: this.used, spinEndsAt: this.spinEndsAt, stopper: this.stopper,
      filled: Object.fromEntries(Object.entries(this.drafts || {}).map(([id, a]) => [id, a.filter((x) => x.trim()).length])),
      results: this.phase === 'results' ? this.results : null };
  }
  playerView() { // celulares só veem a letra quando a rodada começa
    const show = ['playing', 'results', 'final'].includes(this.phase);
    return { ...this.base(), letter: show ? this.letter : null, used: this.phase === 'spinning' ? this.used.slice(0, -1) : this.used };
  }
  destroy() { this.clear(); }
}
module.exports = Adedonha;
