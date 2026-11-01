const GameEngine = require('./GameEngine');
const CATS = ['Nome', 'Animal', 'Cidade/País', 'Cor', 'Fruta/Comida', 'Objeto', 'Profissão', 'Marca', 'Filme/Série'];
const LETTERS = 'ABCDEFGHIJLMNOPRSTV'.split('');
const ROUND_MS = 60000, ROUNDS = 3;
const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const shuffle = (a) => [...a].sort(() => Math.random() - 0.5);

class Adedonha extends GameEngine {
  static meta = { id: 'adedonha', name: 'Adedonha / Stop', emoji: '✍️', min: 2, max: 8, available: true };

  onStart() { this.scores = {}; this.round = 0; this.nextRound(); }

  nextRound() {
    clearTimeout(this.timer);
    if (this.round >= ROUNDS) { this.phase = 'final'; return this.ctx.update(); }
    this.round++;
    this.phase = 'playing';
    this.letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    this.cats = shuffle(CATS).slice(0, 5);
    this.drafts = {}; this.results = null; this.stopper = null;
    this.endsAt = Date.now() + ROUND_MS;
    this.timer = setTimeout(() => this.finish(null), ROUND_MS);
    this.ctx.update();
  }

  onAction(pid, type, p = {}) {
    const clean = (a) => (Array.isArray(a) ? a : []).slice(0, this.cats?.length || 0).map((x) => String(x).slice(0, 30));
    if (this.phase === 'playing') {
      if (type === 'draft') { this.drafts[pid] = clean(p.answers); this.ctx.update(); }
      if (type === 'stop') {
        if (p.answers) this.drafts[pid] = clean(p.answers);
        this.finish(pid);
      }
    } else if (this.phase === 'results' && type === 'next' && pid === this.ctx.vip()) {
      this.nextRound();
    }
  }

  finish(stopperId) {
    if (this.phase !== 'playing') return;
    clearTimeout(this.timer);
    this.phase = 'results';
    this.stopper = stopperId;
    const ids = this.ctx.players().map((p) => p.id);
    const valid = (t) => norm(t).length >= 2 && norm(t)[0] === this.letter.toLowerCase();
    const results = {};
    ids.forEach((id) => (results[id] = { cells: [], total: 0 }));
    this.cats.forEach((_, i) => {
      const count = {};
      ids.forEach((id) => { const t = this.drafts[id]?.[i]; if (valid(t)) count[norm(t)] = (count[norm(t)] || 0) + 1; });
      ids.forEach((id) => {
        const t = this.drafts[id]?.[i] || '';
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
    return this.ctx.players().map((p) => ({ id: p.id, score: this.scores?.[p.id] || 0 })).sort((a, b) => b.score - a.score);
  }

  hostView() {
    return {
      phase: this.phase, round: this.round, rounds: ROUNDS, letter: this.letter, cats: this.cats,
      endsAt: this.endsAt, serverNow: Date.now(), stopper: this.stopper,
      filled: Object.fromEntries(Object.entries(this.drafts || {}).map(([id, a]) => [id, a.filter((x) => x.trim()).length])),
      results: this.phase === 'results' ? this.results : null, ranking: this.ranking(),
    };
  }

  playerView() {
    return { phase: this.phase, round: this.round, letter: this.letter, cats: this.cats, endsAt: this.endsAt, serverNow: Date.now(), ranking: this.ranking() };
  }

  destroy() { clearTimeout(this.timer); }
}
module.exports = Adedonha;
