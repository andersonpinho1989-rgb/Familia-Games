/* Regras de xadrez (funções puras). Casa = y*8+x, y=0 é a 8ª fileira (lado das pretas).
   Estado imutável: { b:[64], turn:'w'|'b', ep:casa|null, half, full }. Peças: {id,t,c,moved}. */
const KN = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
const KG = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const RD = [[1, 0], [-1, 0], [0, 1], [0, -1]], BD = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
let UID = 1;
const inb = (x, y) => x >= 0 && x < 8 && y >= 0 && y < 8;
const sqName = (i) => 'abcdefgh'[i & 7] + (8 - (i >> 3));
const opp = (c) => (c === 'w' ? 'b' : 'w');

function fromFEN(fen) {
  const [pos, turn, cast, ep, half, full] = fen.split(' ');
  const b = Array(64).fill(null); let i = 0;
  for (const ch of pos) {
    if (ch === '/') continue;
    if (/\d/.test(ch)) { i += +ch; continue; }
    b[i++] = { id: UID++, t: ch.toUpperCase(), c: ch === ch.toUpperCase() ? 'w' : 'b', moved: false };
  }
  [['w', 60, 56, 63, 'K', 'Q'], ['b', 4, 0, 7, 'k', 'q']].forEach(([c, k, rq, rk, ks, qs]) => {
    const has = (x) => cast.includes(x), K = b[k];
    if (K && K.t === 'K' && K.c === c) K.moved = !(has(ks) || has(qs));
    if (b[rk] && b[rk].t === 'R' && b[rk].c === c) b[rk].moved = !has(ks);
    if (b[rq] && b[rq].t === 'R' && b[rq].c === c) b[rq].moved = !has(qs);
  });
  return { b, turn, ep: ep && ep !== '-' ? (8 - +ep[1]) * 8 + 'abcdefgh'.indexOf(ep[0]) : null, half: +half || 0, full: +full || 1 };
}

function attacked(b, sq, by) { // a casa sq está sendo atacada por peças da cor "by"?
  const x = sq & 7, y = sq >> 3, py = by === 'w' ? y + 1 : y - 1;
  for (const dx of [-1, 1]) if (inb(x + dx, py)) { const q = b[py * 8 + x + dx]; if (q && q.c === by && q.t === 'P') return true; }
  for (const [dx, dy] of KN) if (inb(x + dx, y + dy)) { const q = b[(y + dy) * 8 + x + dx]; if (q && q.c === by && q.t === 'N') return true; }
  for (const [dx, dy] of KG) if (inb(x + dx, y + dy)) { const q = b[(y + dy) * 8 + x + dx]; if (q && q.c === by && q.t === 'K') return true; }
  for (const [dirs, a, b2] of [[RD, 'R', 'Q'], [BD, 'B', 'Q']]) for (const [dx, dy] of dirs) {
    let nx = x + dx, ny = y + dy;
    while (inb(nx, ny)) { const q = b[ny * 8 + nx]; if (q) { if (q.c === by && (q.t === a || q.t === b2)) return true; break; } nx += dx; ny += dy; }
  }
  return false;
}

function pseudo(st) {
  const { b, turn, ep } = st, out = [], dir = turn === 'w' ? -1 : 1, o = opp(turn);
  for (let i = 0; i < 64; i++) {
    const p = b[i]; if (!p || p.c !== turn) continue;
    const x = i & 7, y = i >> 3;
    if (p.t === 'P') {
      const y1 = y + dir; if (!inb(x, y1)) continue;
      const promo = y1 === (turn === 'w' ? 0 : 7);
      const add = (to, flag) => { if (promo) 'QRBN'.split('').forEach((pr) => out.push({ from: i, to, flag, promo: pr })); else out.push({ from: i, to, flag }); };
      if (!b[y1 * 8 + x]) {
        add(y1 * 8 + x, 'n');
        if (y === (turn === 'w' ? 6 : 1) && !b[(y + 2 * dir) * 8 + x]) out.push({ from: i, to: (y + 2 * dir) * 8 + x, flag: 'dbl' });
      }
      for (const dx of [-1, 1]) {
        if (!inb(x + dx, y1)) continue;
        const t = y1 * 8 + x + dx, q = b[t];
        if (q && q.c !== turn) add(t, 'cap'); else if (!q && t === ep) out.push({ from: i, to: t, flag: 'ep' });
      }
    } else if (p.t === 'N' || p.t === 'K') {
      for (const [dx, dy] of p.t === 'N' ? KN : KG) {
        if (!inb(x + dx, y + dy)) continue;
        const t = (y + dy) * 8 + x + dx, q = b[t];
        if (!q || q.c !== turn) out.push({ from: i, to: t, flag: q ? 'cap' : 'n' });
      }
      const y0 = turn === 'w' ? 7 : 0;
      if (p.t === 'K' && !p.moved && i === y0 * 8 + 4 && !attacked(b, i, o)) { // roque
        const rk = b[y0 * 8 + 7], rq = b[y0 * 8];
        if (rk && rk.t === 'R' && rk.c === turn && !rk.moved && !b[y0 * 8 + 5] && !b[y0 * 8 + 6] && !attacked(b, y0 * 8 + 5, o) && !attacked(b, y0 * 8 + 6, o))
          out.push({ from: i, to: y0 * 8 + 6, flag: 'castleK' });
        if (rq && rq.t === 'R' && rq.c === turn && !rq.moved && !b[y0 * 8 + 1] && !b[y0 * 8 + 2] && !b[y0 * 8 + 3] && !attacked(b, y0 * 8 + 3, o) && !attacked(b, y0 * 8 + 2, o))
          out.push({ from: i, to: y0 * 8 + 2, flag: 'castleQ' });
      }
    } else {
      for (const [dx, dy] of p.t === 'R' ? RD : p.t === 'B' ? BD : KG) {
        let nx = x + dx, ny = y + dy;
        while (inb(nx, ny)) {
          const t = ny * 8 + nx, q = b[t];
          if (!q) out.push({ from: i, to: t, flag: 'n' });
          else { if (q.c !== turn) out.push({ from: i, to: t, flag: 'cap' }); break; }
          nx += dx; ny += dy;
        }
      }
    }
  }
  return out;
}

function make(st, m) {
  const b = st.b.slice(), p = b[m.from], y0 = m.from >> 3;
  let cap = b[m.to];
  if (m.flag === 'ep') { const ci = y0 * 8 + (m.to & 7); cap = b[ci]; b[ci] = null; }
  b[m.to] = { id: p.id, t: m.promo || p.t, c: p.c, moved: true }; b[m.from] = null;
  if (m.flag === 'castleK') { b[y0 * 8 + 5] = { ...b[y0 * 8 + 7], moved: true }; b[y0 * 8 + 7] = null; }
  if (m.flag === 'castleQ') { b[y0 * 8 + 3] = { ...b[y0 * 8], moved: true }; b[y0 * 8] = null; }
  return { b, turn: opp(st.turn), ep: m.flag === 'dbl' ? (m.from + m.to) / 2 : null, half: p.t === 'P' || cap ? 0 : st.half + 1, full: st.full + (st.turn === 'b' ? 1 : 0), cap };
}

const kingSq = (b, c) => b.findIndex((p) => p && p.t === 'K' && p.c === c);
const inCheck = (st) => attacked(st.b, kingSq(st.b, st.turn), opp(st.turn));
function legal(st) {
  const o = opp(st.turn);
  return pseudo(st).filter((m) => { const ns = make(st, m); return !attacked(ns.b, kingSq(ns.b, st.turn), o); });
}
function perft(st, d) { if (d === 0) return 1; const mv = legal(st); if (d === 1) return mv.length; let n = 0; for (const m of mv) n += perft(make(st, m), d - 1); return n; }

function insufficient(b) {
  const ps = b.map((p, i) => (p && p.t !== 'K' ? { p, i } : null)).filter(Boolean);
  if (!ps.length) return true;
  if (ps.length === 1) return ps[0].p.t === 'B' || ps[0].p.t === 'N';
  return ps.every((o) => o.p.t === 'B') && new Set(ps.map((o) => ((o.i >> 3) + (o.i & 7)) % 2)).size === 1;
}
function result(st, mv) { // null = a partida continua
  mv = mv || legal(st);
  if (!mv.length) return inCheck(st) ? 'checkmate' : 'stalemate';
  if (insufficient(st.b)) return 'material';
  if (st.half >= 100) return '50';
  return null;
}
function key(st) { // posição para contar repetições
  const r = (i, c, t) => { const p = st.b[i]; return p && p.t === t && p.c === c && !p.moved ? 1 : 0; };
  const k = (c, i) => (st.b[i] && st.b[i].t === 'K' && st.b[i].c === c && !st.b[i].moved);
  const cast = (k('w', 60) && r(63, 'w', 'R') ? 'K' : '') + (k('w', 60) && r(56, 'w', 'R') ? 'Q' : '') + (k('b', 4) && r(7, 'b', 'R') ? 'k' : '') + (k('b', 4) && r(0, 'b', 'R') ? 'q' : '');
  return st.b.map((p) => (p ? (p.c === 'w' ? p.t : p.t.toLowerCase()) : '.')).join('') + st.turn + cast + (st.ep === null ? '' : st.ep);
}

function san(st, m, mv) { // notação algébrica (sem o sufixo + / #)
  const p = st.b[m.from];
  if (m.flag === 'castleK') return 'O-O';
  if (m.flag === 'castleQ') return 'O-O-O';
  let s = '';
  const isCap = !!st.b[m.to] || m.flag === 'ep', file = (i) => 'abcdefgh'[i & 7], rank = (i) => 8 - (i >> 3);
  if (p.t !== 'P') {
    s += p.t;
    const others = mv.filter((o) => o !== m && o.to === m.to && st.b[o.from].t === p.t && o.from !== m.from);
    if (others.length) {
      if (!others.some((o) => (o.from & 7) === (m.from & 7))) s += file(m.from);
      else if (!others.some((o) => (o.from >> 3) === (m.from >> 3))) s += rank(m.from);
      else s += file(m.from) + rank(m.from);
    }
  } else if (isCap) s += file(m.from);
  if (isCap) s += 'x';
  s += sqName(m.to);
  if (m.promo) s += '=' + m.promo;
  return s;
}

module.exports = { START, fromFEN, legal, make, inCheck, attacked, perft, result, key, san, sqName, kingSq, opp };
