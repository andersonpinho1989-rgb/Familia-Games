const GameEngine = require('./GameEngine');
const BI = require('../../public/bidata.js');
const { SQ, GROUPS, CARDS, HOUSES, HOTELS, JAIL, FINE, fmt } = BI;
const STATIONS = [5, 15, 25, 35], UTILS = [12, 28], JAILCARD = CARDS.findIndex((c) => c.t === 'jailCard');
const BID_MS = 25000;

/* Regras: 2-6 jogadores; dois dados (dupla = joga de novo; 3 duplas = prisão); compra ou leilão; aluguel (dobro com grupo completo sem casas;
   estações 25/50/100/200; companhias 4x ou 10x o dado); casas e hotéis (construção uniforme, estoque 32 casas/12 hotéis); hipoteca (+10% para resgatar);
   prisão (pagar R$ 50, carta, ou tirar dupla; 3ª tentativa paga); Sorte ou Revés; impostos; trocas; falência (para o credor ou para o banco). */
class Banco extends GameEngine {
  static meta = {
    id: 'banco', name: 'Banco Imobiliário', emoji: '🏠', min: 2, max: 6, available: true,
    options: [
      { key: 'cash', label: '💰 Dinheiro inicial', choices: [1000, 1500, 2500], labels: { 1000: 'R$ 1.000', 1500: 'R$ 1.500', 2500: 'R$ 2.500' }, def: 1500 },
      { key: 'salary', label: '🏁 Salário ao passar pelo Início', choices: [200, 300], labels: { 200: 'R$ 200', 300: 'R$ 300' }, def: 200 },
      { key: 'jackpot', label: '🅿 Parada Livre acumula multas', choices: ['off', 'on'], labels: { off: 'Não', on: 'Sim' }, def: 'off' },
      { key: 'view', label: '🖥 Tabuleiro na TV', choices: ['3d', '2d'], labels: { '3d': '3D', '2d': '2D' }, def: '3d', live: true },
    ],
  };

  onStart() {
    const st = this.ctx.settings();
    this.cfg = { cash: st.cash || 1500, salary: st.salary || 200, jackpot: st.jackpot === 'on' };
    this.rng = Math.random;
    this.reset();
  }

  reset() {
    const ps = this.ctx.players();
    this.order = ps.map((p) => p.id);
    this.pl = {};
    ps.forEach((p, i) => (this.pl[p.id] = { id: p.id, idx: i, cash: this.cfg.cash, pos: 0, inJail: false, jailTurns: 0, jailCards: 0, bankrupt: false }));
    this.owner = Array(40).fill(null); this.level = Array(40).fill(0); this.mort = Array(40).fill(false);
    this.deck = this.shuffle(CARDS.map((_, i) => i));
    this.turn = 0; this.phase = 'roll'; this.dice = [0, 0]; this.rollN = 0; this.doubles = 0; this.extra = false;
    this.log = []; this.card = null; this.cardN = 0; this.auction = null; this.trade = null; this.tradeN = 0; this.debt = null; this.pot = 0; this.winner = null;
    this.lastMove = null; this.moveN = 0; this.evs = []; this.evN = 0;
    clearTimeout(this.timer);
    this.say('A partida começou! Boa sorte!');
    this.upd();
  }

  // ---------- utilidades ----------
  shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(this.rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  die() { return 1 + Math.floor(this.rng() * 6); }
  P(id) { return this.pl[id]; }
  cur() { return this.order[this.turn]; }
  active() { return this.order.filter((id) => !this.pl[id].bankrupt); }
  name(id) { const p = this.ctx.players().find((x) => x.id === id); return p ? p.name : '?'; }
  present(id) { const p = this.ctx.players().find((x) => x.id === id); return !!(p && p.connected); }
  say(m) { this.log.push(m); if (this.log.length > 40) this.log.shift(); }
  fire(type) { this.evs.push({ n: ++this.evN, type }); if (this.evs.length > 8) this.evs.shift(); }
  upd() { this.arm(); this.ctx.update(); }
  housesUsed() { let n = 0; this.level.forEach((l) => { if (l > 0 && l < 5) n += l; }); return n; }
  hotelsUsed() { return this.level.filter((l) => l === 5).length; }
  owns(id, list) { return list.filter((i) => this.owner[i] === id); }

  // ---------- ações ----------
  onAction(pid, type, p = {}) {
    const pl = this.pl[pid]; if (!pl) return;
    if (this.phase === 'over') { if (type === 'rematch') this.reset(); return; }
    if (pl.bankrupt) return;
    const isCur = pid === this.cur();
    switch (type) {
      case 'roll': if (isCur && this.phase === 'roll') this.roll(); break;
      case 'buy': if (isCur && this.phase === 'buy') this.buy(pid); break;
      case 'decline': if (isCur && this.phase === 'buy') this.startAuction(pl.pos); break;
      case 'bid': this.bid(pid, Math.floor(+p.amount)); break;
      case 'pass': this.passBid(pid); break;
      case 'endTurn': if (isCur && this.phase === 'manage' && !this.trade) this.nextTurn(); break;
      case 'payJail': if (isCur && this.phase === 'roll') this.payJail(pid); break;
      case 'useCard': if (isCur && this.phase === 'roll') this.useJailCard(pid); break;
      case 'build': case 'sell': case 'mortgage': case 'unmortgage': if (isCur) this.manage(pid, type, +p.sq); break;
      case 'bankrupt': if (isCur && ['roll', 'manage', 'debt', 'buy'].includes(this.phase)) { this.say(`🏳 ${this.name(pid)} desistiu.`); this.bankrupt(pid, this.debt && this.debt.payees.length === 1 && this.debt.payees[0].id !== 'bank' ? this.debt.payees[0].id : 'bank'); } break;
      case 'offerTrade': this.offerTrade(pid, p); break;
      case 'acceptTrade': this.acceptTrade(pid); break;
      case 'rejectTrade': this.rejectTrade(pid); break;
      case 'cancelTrade': if (this.trade && this.trade.from === pid) this.dropTrade(`${this.name(pid)} cancelou a proposta.`); break;
      default: break;
    }
  }

  // ---------- turno ----------
  roll() {
    const id = this.cur(), p = this.P(id), d1 = this.die(), d2 = this.die(), dbl = d1 === d2;
    this.dice = [d1, d2]; this.rollN++; this.card = null; this.fire('dice');
    this.say(`🎲 ${this.name(id)} tirou ${d1} e ${d2}${dbl ? ' (dupla!)' : ''}.`);
    if (p.inJail) {
      if (dbl) { p.inJail = false; p.jailTurns = 0; this.extra = false; this.say(`${this.name(id)} tirou dupla e saiu da prisão!`); return this.moveBy(p, d1 + d2); }
      p.jailTurns++;
      if (p.jailTurns >= 3) { p.inJail = false; p.jailTurns = 0; this.say(`${this.name(id)} falhou 3 vezes: paga a multa de ${fmt(FINE)} e sai.`); return this.pay(id, [{ id: 'bank', amt: FINE }], 'multa da prisão', () => this.moveBy(p, d1 + d2)); }
      this.say(`${this.name(id)} continua na prisão.`); this.phase = 'manage'; return this.upd();
    }
    if (dbl) {
      this.doubles++;
      if (this.doubles >= 3) { this.say(`Três duplas seguidas! ${this.name(id)} vai para a prisão.`); this.jail(p); this.doubles = 0; this.phase = 'manage'; return this.upd(); }
      this.extra = true;
    } else { this.doubles = 0; this.extra = false; }
    this.moveBy(p, d1 + d2);
  }

  setPos(p, to, kind) { this.lastMove = { id: p.id, from: p.pos, to, kind }; this.moveN++; p.pos = to; }
  salary(p) { p.cash += this.cfg.salary; this.say(`💰 ${this.name(p.id)} passou pelo Início: +${fmt(this.cfg.salary)}.`); this.fire('salary'); }
  moveBy(p, steps) { const from = p.pos; if (from + steps >= 40) this.salary(p); this.setPos(p, (from + steps) % 40, 'step'); this.land(p, {}); }
  jail(p) { p.inJail = true; p.jailTurns = 0; this.extra = false; this.setPos(p, JAIL, 'jump'); this.fire('jail'); }

  afterAction() {
    if (this.phase === 'over') return;
    const p = this.P(this.cur());
    if (p.bankrupt) return this.nextTurn();
    if (this.extra && !p.inJail) { this.extra = false; this.phase = 'roll'; this.say(`${this.name(p.id)} jogou uma dupla e joga de novo.`); }
    else { this.extra = false; this.phase = 'manage'; }
    this.upd();
  }

  nextTurn() {
    if (this.phase === 'over') return;
    const n = this.order.length;
    for (let k = 1; k <= n; k++) { const i = (this.turn + k) % n; if (!this.pl[this.order[i]].bankrupt) { this.turn = i; break; } }
    this.doubles = 0; this.extra = false; this.phase = 'roll'; this.card = null;
    this.say(`➡ Vez de ${this.name(this.cur())}.`);
    this.upd();
  }

  land(p, opt) {
    const s = SQ[p.pos], id = p.id, nm = this.name(id);
    switch (s.type) {
      case 'prop': case 'station': case 'util': {
        const o = this.owner[p.pos];
        if (o === null) {
          if (p.cash >= s.price) { this.phase = 'buy'; this.say(`${nm} parou em ${s.name} (${fmt(s.price)}).`); return this.upd(); }
          this.say(`${nm} não tem dinheiro para ${s.name}: vai a leilão.`); return this.startAuction(p.pos);
        }
        if (o === id) { this.say(`${nm} está em casa: ${s.name}.`); return this.afterAction(); }
        if (this.mort[p.pos]) { this.say(`${s.name} está hipotecada: sem aluguel.`); return this.afterAction(); }
        const rent = this.rentFor(p.pos, this.dice[0] + this.dice[1], opt);
        this.say(`${nm} paga ${fmt(rent)} de aluguel a ${this.name(o)} (${s.name}).`); this.fire('rent');
        return this.pay(id, [{ id: o, amt: rent }], 'aluguel');
      }
      case 'tax': this.say(`${nm} paga ${s.name}: ${fmt(s.amt)}.`); this.fire('rent'); return this.pay(id, [{ id: 'bank', amt: s.amt, pot: true }], s.name);
      case 'card': return this.drawCard(p);
      case 'gotojail': this.say(`${nm} foi para a prisão!`); this.jail(p); return this.afterAction();
      case 'parking':
        if (this.cfg.jackpot && this.pot > 0) { p.cash += this.pot; this.say(`🅿 ${nm} levou o acumulado da Parada Livre: ${fmt(this.pot)}!`); this.fire('salary'); this.pot = 0; }
        return this.afterAction();
      default: return this.afterAction();
    }
  }

  rentFor(sq, diceSum, opt = {}) {
    const s = SQ[sq], o = this.owner[sq];
    if (s.type === 'prop') {
      const lvl = this.level[sq];
      if (lvl > 0) return s.rent[lvl];
      return s.rent[0] * (GROUPS[s.group].every((i) => this.owner[i] === o) ? 2 : 1);
    }
    if (s.type === 'station') { const n = this.owns(o, STATIONS).length; return 25 * Math.pow(2, n - 1) * (opt.doubleRent ? 2 : 1); }
    const n = this.owns(o, UTILS).length;
    return (opt.utilTen || n === 2 ? 10 : 4) * diceSum;
  }

  // ---------- pagamentos e dívidas ----------
  settle(id, payees, reason) {
    payees.forEach((q) => {
      this.P(id).cash -= q.amt;
      if (q.id === 'bank') { if (q.pot && this.cfg.jackpot) this.pot += q.amt; } else this.P(q.id).cash += q.amt;
    });
  }
  pay(id, payees, reason, cont) {
    cont = cont || (() => this.afterAction());
    const total = payees.reduce((a, q) => a + q.amt, 0);
    if (total <= 0) return cont();
    if (this.P(id).cash >= total) { this.settle(id, payees, reason); return cont(); }
    this.debt = { from: id, payees, amount: total, reason, cont };
    this.phase = 'debt';
    this.say(`⚠ ${this.name(id)} precisa de ${fmt(total)} (${reason}) e não tem o suficiente: venda ou hipoteque para pagar.`);
    this.upd();
  }
  checkDebt(id) {
    const d = this.debt; if (!d || d.from !== id || this.P(id).cash < d.amount) return;
    this.debt = null; this.settle(id, d.payees, d.reason);
    this.say(`${this.name(id)} levantou o dinheiro e pagou ${fmt(d.amount)}.`);
    d.cont();
  }

  // ---------- cartas ----------
  drawCard(p) {
    const idx = this.deck.shift(), c = CARDS[idx], id = p.id, nm = this.name(id);
    this.card = { n: ++this.cardN, text: c.text, who: id };
    this.say(`🎴 ${nm}: ${c.text}`); this.fire('card');
    if (idx === JAILCARD) { p.jailCards++; return this.afterAction(); }
    this.deck.push(idx);
    const others = this.active().filter((o) => o !== id);
    switch (c.t) {
      case 'collect': p.cash += c.amt; return this.afterAction();
      case 'pay': return this.pay(id, [{ id: 'bank', amt: c.amt }], 'carta');
      case 'eachGive': others.forEach((o) => { const t = Math.min(c.amt, this.P(o).cash); this.P(o).cash -= t; p.cash += t; }); return this.afterAction();
      case 'payEach': return this.pay(id, others.map((o) => ({ id: o, amt: c.amt })), 'carta');
      case 'repairs': {
        let h = 0, ho = 0; this.level.forEach((l, i) => { if (this.owner[i] === id) { if (l === 5) ho++; else h += l; } });
        const amt = h * c.house + ho * c.hotel;
        if (amt) this.say(`${nm} tem ${h} casa(s) e ${ho} hotel(is): paga ${fmt(amt)}.`);
        return this.pay(id, [{ id: 'bank', amt }], 'reformas');
      }
      case 'moveTo': { if (c.sq <= p.pos) this.salary(p); this.setPos(p, c.sq, 'step'); return this.land(p, {}); }
      case 'back': this.setPos(p, (p.pos - c.n + 40) % 40, 'jump'); return this.land(p, {});
      case 'jail': this.jail(p); return this.afterAction();
      case 'nearest': {
        const list = c.kind === 'station' ? STATIONS : UTILS; let to = p.pos;
        for (let k = 1; k <= 40; k++) { const q = (p.pos + k) % 40; if (list.includes(q)) { to = q; break; } }
        if (to <= p.pos) this.salary(p);
        this.setPos(p, to, 'step'); return this.land(p, c.kind === 'station' ? { doubleRent: true } : { utilTen: true });
      }
      default: return this.afterAction();
    }
  }

  // ---------- prisão ----------
  payJail(id) { const p = this.P(id); if (!p.inJail || p.cash < FINE) return; p.cash -= FINE; p.inJail = false; p.jailTurns = 0; this.say(`${this.name(id)} pagou ${fmt(FINE)} e saiu da prisão.`); this.fire('free'); this.upd(); }
  useJailCard(id) { const p = this.P(id); if (!p.inJail || p.jailCards < 1) return; p.jailCards--; this.deck.push(JAILCARD); p.inJail = false; p.jailTurns = 0; this.say(`${this.name(id)} usou a carta e saiu da prisão.`); this.fire('free'); this.upd(); }

  // ---------- compra e leilão ----------
  buy(id) {
    const p = this.P(id), s = SQ[p.pos];
    if (this.owner[p.pos] !== null || p.cash < s.price) return;
    p.cash -= s.price; this.owner[p.pos] = id; this.say(`🏠 ${this.name(id)} comprou ${s.name} por ${fmt(s.price)}.`); this.fire('buy');
    this.afterAction();
  }
  startAuction(sq) {
    const n = this.order.length, ids = [];
    for (let k = 1; k <= n; k++) { const id = this.order[(this.turn + k) % n]; if (!this.pl[id].bankrupt) ids.push(id); }
    this.auction = { sq, active: ids, idx: 0, high: 0, bidder: null, endsAt: 0 };
    this.phase = 'auction'; this.say(`🔨 Leilão de ${SQ[sq].name}! Lance mínimo R$ 10.`); this.fire('auction');
    this.upd();
  }
  bid(id, amt) {
    const a = this.auction; if (this.phase !== 'auction' || a.active[a.idx] !== id) return;
    if (!Number.isFinite(amt) || amt < (a.high ? a.high + 10 : 10) || amt > this.P(id).cash) return;
    a.high = amt; a.bidder = id; this.say(`🔨 ${this.name(id)} oferece ${fmt(amt)}.`); this.fire('bid');
    a.idx = (a.idx + 1) % a.active.length;
    this.auctionCheck();
  }
  passBid(id) {
    const a = this.auction; if (this.phase !== 'auction' || a.active[a.idx] !== id) return;
    a.active.splice(a.idx, 1); this.say(`${this.name(id)} saiu do leilão.`);
    if (a.idx >= a.active.length) a.idx = 0;
    this.auctionCheck();
  }
  auctionCheck() {
    const a = this.auction;
    if (a.active.length === 0 || (a.active.length === 1 && a.bidder === a.active[0])) {
      const s = SQ[a.sq];
      if (a.bidder && a.high > 0) { this.P(a.bidder).cash -= a.high; this.owner[a.sq] = a.bidder; this.say(`✅ ${s.name} vendida a ${this.name(a.bidder)} por ${fmt(a.high)}.`); this.fire('buy'); }
      else this.say(`Ninguém quis ${s.name}: continua com o banco.`);
      this.auction = null; return this.afterAction();
    }
    this.upd();
  }

  // ---------- construção e hipoteca ----------
  groupOwned(id, g) { return GROUPS[g].every((i) => this.owner[i] === id); }
  okBuild(id, sq) {
    const s = SQ[sq]; if (s.type !== 'prop' || this.owner[sq] !== id || !this.groupOwned(id, s.group)) return false;
    const grp = GROUPS[s.group], lv = this.level[sq];
    if (grp.some((i) => this.mort[i]) || lv >= 5 || grp.some((i) => this.level[i] < lv)) return false;
    if (lv < 4 && this.housesUsed() >= HOUSES) return false;
    if (lv === 4 && this.hotelsUsed() >= HOTELS) return false;
    return this.P(id).cash >= s.house;
  }
  okSell(id, sq) {
    const s = SQ[sq]; if (s.type !== 'prop' || this.owner[sq] !== id) return false;
    const lv = this.level[sq]; if (lv < 1 || GROUPS[s.group].some((i) => this.level[i] > lv)) return false;
    return !(lv === 5 && this.housesUsed() + 4 > HOUSES);
  }
  okMortgage(id, sq) {
    const s = SQ[sq]; if (!s.price || this.owner[sq] !== id || this.mort[sq]) return false;
    return s.type !== 'prop' || GROUPS[s.group].every((i) => this.level[i] === 0);
  }
  unmortgageCost(sq) { return Math.ceil(SQ[sq].mort * 1.1); }
  okUnmortgage(id, sq) { return !!SQ[sq].price && this.owner[sq] === id && this.mort[sq] && this.P(id).cash >= this.unmortgageCost(sq); }

  manage(id, type, sq) {
    if (!Number.isInteger(sq) || sq < 0 || sq > 39) return;
    const debt = this.phase === 'debt' && this.debt && this.debt.from === id;
    if (!debt && !['roll', 'manage'].includes(this.phase)) return;
    if (debt && (type === 'build' || type === 'unmortgage')) return;
    const p = this.P(id), s = SQ[sq];
    if (type === 'build' && this.okBuild(id, sq)) {
      p.cash -= s.house; this.level[sq]++; this.say(`🏗 ${this.name(id)} ${this.level[sq] === 5 ? 'construiu um HOTEL' : 'construiu uma casa'} em ${s.name}.`); this.fire('build');
    } else if (type === 'sell' && this.okSell(id, sq)) {
      p.cash += Math.floor(s.house / 2); this.level[sq]--; this.say(`${this.name(id)} vendeu uma construção em ${s.name}.`); this.fire('sell');
    } else if (type === 'mortgage' && this.okMortgage(id, sq)) {
      p.cash += s.mort; this.mort[sq] = true; this.say(`${this.name(id)} hipotecou ${s.name} (+${fmt(s.mort)}).`); this.fire('sell');
    } else if (type === 'unmortgage' && this.okUnmortgage(id, sq)) {
      p.cash -= this.unmortgageCost(sq); this.mort[sq] = false; this.say(`${this.name(id)} resgatou ${s.name}.`); this.fire('build');
    } else return;
    if (debt) return this.checkDebt(id);
    this.upd();
  }
  autoLiquidate(id) {
    for (let guard = 0; guard < 80 && this.debt && this.P(id).cash < this.debt.amount; guard++) {
      let done = false;
      for (let sq = 0; sq < 40 && !done; sq++) if (this.okSell(id, sq)) { this.manage(id, 'sell', sq); done = true; }
      for (let sq = 0; sq < 40 && !done; sq++) if (this.okMortgage(id, sq)) { this.manage(id, 'mortgage', sq); done = true; }
      if (!done) break;
      if (this.phase !== 'debt') return;
    }
  }

  // ---------- falência ----------
  bankrupt(id, creditor) {
    const p = this.P(id), cr = creditor !== 'bank' ? this.P(creditor) : null;
    this.debt = null; this.auction = this.auction && this.auction.active.includes(id) ? this.auction : this.auction;
    if (cr) { cr.cash += p.cash; cr.jailCards += p.jailCards; } else for (let k = 0; k < p.jailCards; k++) this.deck.push(JAILCARD);
    for (let i = 0; i < 40; i++) {
      if (this.owner[i] !== id) continue;
      this.level[i] = 0; // construções voltam ao banco
      if (cr) { this.owner[i] = creditor; if (this.mort[i]) cr.cash = Math.max(0, cr.cash - Math.ceil(SQ[i].mort * 0.1)); }
      else { this.owner[i] = null; this.mort[i] = false; }
    }
    if (this.trade && (this.trade.from === id || this.trade.to === id)) this.trade = null;
    p.cash = 0; p.jailCards = 0; p.bankrupt = true; p.inJail = false;
    this.say(`💥 ${this.name(id)} faliu${cr ? ' e entregou tudo a ' + this.name(creditor) : ''}.`); this.fire('bankrupt');
    const alive = this.active();
    if (alive.length === 1) {
      this.winner = alive[0]; this.phase = 'over'; this.say(`🏆 ${this.name(this.winner)} venceu o jogo!`); this.fire('win');
      clearTimeout(this.timer); return this.ctx.update();
    }
    if (id === this.cur()) return this.nextTurn();
    this.upd();
  }

  // ---------- trocas ----------
  cleanSide(x, list) {
    x = x || {}; const props = [...new Set((Array.isArray(x.props) ? x.props : []).map(Number))].filter((i) => Number.isInteger(i) && i >= 0 && i < 40 && SQ[i].price);
    return { cash: Math.max(0, Math.floor(+x.cash) || 0), props, cards: Math.max(0, Math.floor(+x.cards) || 0) };
  }
  validTrade(t) {
    const a = this.pl[t.from], b = this.pl[t.to];
    if (!a || !b || a.bankrupt || b.bankrupt || t.from === t.to) return false;
    if (t.give.cash > a.cash || t.get.cash > b.cash || t.give.cards > a.jailCards || t.get.cards > b.jailCards) return false;
    if (!t.give.cash && !t.get.cash && !t.give.props.length && !t.get.props.length && !t.give.cards && !t.get.cards) return false;
    const okProp = (i, o) => this.owner[i] === o && (SQ[i].type !== 'prop' || GROUPS[SQ[i].group].every((j) => this.level[j] === 0));
    if (!t.give.props.every((i) => okProp(i, t.from)) || !t.get.props.every((i) => okProp(i, t.to))) return false;
    const fee = (list) => list.filter((i) => this.mort[i]).reduce((s, i) => s + Math.ceil(SQ[i].mort * 0.1), 0);
    return a.cash - t.give.cash + t.get.cash - fee(t.get.props) >= 0 && b.cash - t.get.cash + t.give.cash - fee(t.give.props) >= 0;
  }
  offerTrade(id, p) {
    if (id !== this.cur() || !['roll', 'manage'].includes(this.phase) || this.trade) return;
    const t = { id: ++this.tradeN, from: id, to: p.to, give: this.cleanSide(p.give), get: this.cleanSide(p.get) };
    if (!this.validTrade(t)) return;
    this.trade = t; this.say(`🤝 ${this.name(id)} propôs uma troca a ${this.name(t.to)}.`); this.fire('trade'); this.upd();
  }
  dropTrade(msg) { this.trade = null; this.say(msg); this.upd(); }
  rejectTrade(id) { const t = this.trade; if (t && t.to === id) this.dropTrade(`${this.name(id)} recusou a troca.`); }
  acceptTrade(id) {
    const t = this.trade; if (!t || t.to !== id) return;
    if (!this.validTrade(t)) return this.dropTrade('A troca não é mais possível e foi cancelada.');
    const a = this.P(t.from), b = this.P(t.to);
    a.cash += t.get.cash - t.give.cash; b.cash += t.give.cash - t.get.cash;
    a.jailCards += t.get.cards - t.give.cards; b.jailCards += t.give.cards - t.get.cards;
    t.give.props.forEach((i) => { this.owner[i] = t.to; if (this.mort[i]) b.cash -= Math.ceil(SQ[i].mort * 0.1); });
    t.get.props.forEach((i) => { this.owner[i] = t.from; if (this.mort[i]) a.cash -= Math.ceil(SQ[i].mort * 0.1); });
    this.trade = null; this.say(`✅ Troca fechada entre ${this.name(t.from)} e ${this.name(t.to)}!`); this.fire('trade'); this.upd();
  }

  // ---------- jogador ausente / tempo do leilão ----------
  arm() {
    clearTimeout(this.timer); this.endsAt = 0;
    if (this.phase === 'over' || !this.order) return;
    let actor = this.cur(), ms = 0;
    if (this.trade && !this.present(this.trade.to)) ms = 3000;
    else if (this.phase === 'auction') { actor = this.auction.active[this.auction.idx]; ms = this.present(actor) ? BID_MS : 2500; if (this.present(actor)) this.endsAt = Date.now() + ms; }
    else if (!this.present(actor)) ms = 3000;
    if (ms) this.timer = setTimeout(() => this.auto(actor), ms);
  }
  auto(actor) {
    if (this.phase === 'over') return;
    if (this.trade && !this.present(this.trade.to)) return this.rejectTrade(this.trade.to);
    const p = this.P(actor);
    switch (this.phase) {
      case 'auction': return this.passBid(actor);
      case 'roll': if (p.inJail && p.cash >= FINE + 300) this.payJail(actor); return this.roll();
      case 'buy': return p.cash - SQ[p.pos].price >= 250 ? this.buy(actor) : this.startAuction(p.pos);
      case 'debt': this.autoLiquidate(actor); if (this.phase === 'debt') this.bankrupt(actor, this.debt.payees.length === 1 && this.debt.payees[0].id !== 'bank' ? this.debt.payees[0].id : 'bank'); return;
      case 'manage': if (this.trade) this.trade = null; return this.nextTurn();
      default: return undefined;
    }
  }
  onPlayerChange() { if (this.order && this.phase !== 'over') this.arm(); }
  destroy() { clearTimeout(this.timer); }

  // ---------- visões ----------
  base() {
    const a = this.auction, d = this.debt;
    return {
      kind: 'banco', phase: this.phase, turn: this.cur(), order: this.order,
      players: this.order.map((id) => { const p = this.pl[id]; return { id, idx: p.idx, cash: p.cash, pos: p.pos, inJail: p.inJail, jailCards: p.jailCards, bankrupt: p.bankrupt }; }),
      owner: this.owner, level: this.level, mort: this.mort, dice: this.dice, rollN: this.rollN, doubles: this.doubles,
      log: this.log.slice(-14), card: this.card, pot: this.cfg.jackpot ? this.pot : null, winner: this.winner,
      houses: { used: this.housesUsed(), max: HOUSES, hotels: this.hotelsUsed(), maxHotels: HOTELS },
      lastMove: this.lastMove, moveN: this.moveN, evs: this.evs, serverNow: Date.now(), view: this.ctx.settings().view || '3d',
      auction: a ? { sq: a.sq, high: a.high, bidder: a.bidder, cur: a.active[a.idx], active: a.active, endsAt: this.endsAt } : null,
      trade: this.trade ? { id: this.trade.id, from: this.trade.from, to: this.trade.to, give: this.trade.give, get: this.trade.get } : null,
      debt: d ? { from: d.from, amount: d.amount, reason: d.reason, to: d.payees.map((q) => q.id) } : null,
    };
  }
  hostView() { return this.base(); }
  can(id) {
    const p = this.P(id), c = id === this.cur(), ph = this.phase;
    const out = { roll: false, buy: false, decline: false, endTurn: false, payJail: false, useCard: false, bankrupt: false, trade: false, respond: false, cancelTrade: false, bid: null, build: [], sell: [], mortgage: [], unmortgage: [] };
    if (p.bankrupt || ph === 'over') return out;
    out.roll = c && ph === 'roll';
    out.payJail = c && ph === 'roll' && p.inJail && p.cash >= FINE;
    out.useCard = c && ph === 'roll' && p.inJail && p.jailCards > 0;
    out.buy = c && ph === 'buy' && this.owner[p.pos] === null && p.cash >= SQ[p.pos].price;
    out.decline = c && ph === 'buy';
    out.endTurn = c && ph === 'manage' && !this.trade;
    out.bankrupt = c && ['roll', 'manage', 'debt', 'buy'].includes(ph);
    out.trade = c && ['roll', 'manage'].includes(ph) && !this.trade;
    out.respond = !!(this.trade && this.trade.to === id);
    out.cancelTrade = !!(this.trade && this.trade.from === id);
    const free = c && ['roll', 'manage'].includes(ph), debt = c && ph === 'debt';
    if (free || debt) for (let i = 0; i < 40; i++) {
      if (free && this.okBuild(id, i)) out.build.push(i);
      if (this.okSell(id, i)) out.sell.push(i);
      if (this.okMortgage(id, i)) out.mortgage.push(i);
      if (free && this.okUnmortgage(id, i)) out.unmortgage.push(i);
    }
    if (ph === 'auction' && this.auction.active[this.auction.idx] === id) out.bid = { min: this.auction.high ? this.auction.high + 10 : 10, max: p.cash };
    return out;
  }
  playerView(id) { return { ...this.base(), me: id, can: this.can(id) }; }
}
module.exports = Banco;
