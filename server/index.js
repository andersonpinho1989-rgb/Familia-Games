const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const { Server } = require('socket.io');
const { GAMES, list } = require('./games');

const app = express();
app.use(express.static(path.join(__dirname, '../public'), { etag: false, setHeaders: (res) => res.setHeader('Cache-Control', 'no-store') }));
const BUILD = String(Date.now());
const server = http.createServer(app);
const io = new Server(server, { pingInterval: 10000, pingTimeout: 20000 });

const rooms = new Map();
const COLORS = ['#FF5A5F', '#FCA311', '#2EC4B6', '#4D96FF', '#9B5DE5', '#F15BB5', '#8AC926', '#E9ECEF'];

const newCode = () => {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let c;
  do { c = Array.from({ length: 4 }, () => abc[Math.floor(Math.random() * abc.length)]).join(''); } while (rooms.has(c));
  return c;
};

// "VIP efetivo": se o ⭐ caiu, o primeiro jogador conectado assume (ninguém fica sem poder encerrar/iniciar)
const vipOf = (r) => {
  const v = r.players.get(r.vip);
  if (v && v.connected) return r.vip;
  const c = [...r.players.values()].find((x) => x.connected);
  return c ? c.id : r.vip;
};
// configurações escolhidas pelo ⭐ (tempo, tema...) = padrões do jogo + o que foi alterado
const settingsOf = (r) => {
  if (!r.gameId) return {};
  const out = {};
  (GAMES[r.gameId].meta.options || []).forEach((o) => (out[o.key] = o.def));
  return Object.assign(out, r.settings[r.gameId] || {});
};
function applySetting(r, key, value) {
  if (!r.gameId) return;
  const opt = (GAMES[r.gameId].meta.options || []).find((o) => o.key === key);
  if (!opt || !opt.choices.includes(value)) return;   // só valores permitidos
  if (r.game && !opt.live) return;                    // com a partida rolando, só opções "live" (ex.: 2D/3D)
  (r.settings[r.gameId] = r.settings[r.gameId] || {})[key] = value;
  push(r);
}
const publicPlayers = (r) => [...r.players.values()].map(({ id, name, color, connected }) => ({ id, name, color, connected }));

function snapshot(r, pid) {
  const base = { build: BUILD, settings: settingsOf(r), picks: r.picks, code: r.code, phase: r.game ? 'game' : 'lobby', players: publicPlayers(r), vip: vipOf(r), games: list(), gameId: r.gameId };
  if (r.game) base.view = pid ? r.game.playerView(pid) : r.game.hostView();
  return pid ? { ...base, me: pid } : base;
}

function push(r) {
  if (r.closed) return; // sala encerrada: ignora eventos de celulares antigos
  r.touched = Date.now();
  if (r.hostSid) io.to(r.hostSid).emit('state', snapshot(r));
  r.players.forEach((p) => p.sid && io.to(p.sid).emit('state', snapshot(r, p.id)));
}

const makeCtx = (r) => ({ players: () => publicPlayers(r), vip: () => vipOf(r), settings: () => settingsOf(r), picks: () => r.picks, update: () => push(r) });

io.on('connection', (socket) => {
  let room = null, pid = null;

  // ---- TV ----
  const createRoom = () => {
    const code = newCode();
    const r = { code, hostSid: socket.id, hostToken: crypto.randomUUID(), players: new Map(), vip: null, game: null, gameId: null, settings: {}, picks: {}, touched: Date.now() };
    rooms.set(code, r);
    return r;
  };
  socket.on('host:create', (_, ack) => { room = createRoom(); ack({ code: room.code, hostToken: room.hostToken }); push(room); });

  // "Encerrar tudo": fecha a sala, desconecta todos os celulares e gera um novo código/QR Code
  socket.on('host:reset', (_, ack) => {
    if (!room || room.hostSid !== socket.id) return;
    const old = room;
    if (old.game) old.game.destroy();
    old.game = null; old.closed = true; old.hostSid = null;
    old.players.forEach((p) => p.sid && io.to(p.sid).emit('room:closed'));
    rooms.delete(old.code);
    room = createRoom(); ack({ code: room.code, hostToken: room.hostToken }); push(room);
  });

  socket.on('host:resume', ({ code, hostToken }, ack) => {
    const r = rooms.get(code);
    if (!r || r.hostToken !== hostToken) return ack({ error: 'Sala não encontrada' });
    room = r; room.hostSid = socket.id; ack({ code });
    push(room);
  });

  // ---- Celular ----
  socket.on('player:join', ({ code, name, color, playerId }, ack) => {
    const r = rooms.get(String(code || '').toUpperCase());
    if (!r) return ack({ error: 'Sala não encontrada. Confira o código.' });
    let p = playerId && r.players.get(playerId);
    if (p && p.left) return ack({ error: 'Você saiu desta partida.' });
    if (!p) { // novo jogador
      if (r.game) return ack({ error: 'A partida já começou.' });
      if (r.players.size >= 8) return ack({ error: 'Sala cheia (máx. 8).' });
      if (!name || !name.trim()) return ack({ error: 'Digite um nome.' });
      const used = new Set([...r.players.values()].map((x) => x.color));
      p = { id: crypto.randomUUID(), name: name.trim().slice(0, 12), color: used.has(color) || !color ? COLORS.find((c) => !used.has(c)) : color };
      r.players.set(p.id, p);
      if (!r.vip) r.vip = p.id;
    }
    p.sid = socket.id; p.connected = true; // novo ou reconexão: só troca o socket
    room = r; pid = p.id;
    ack({ playerId: p.id, color: p.color });
    r.game?.onPlayerChange(); push(r);
  });

  socket.on('game:select', (gameId) => {
    if (!room || pid !== vipOf(room) || room.game || !GAMES[gameId]?.meta.available) return;
    room.gameId = gameId; push(room);
  });

  socket.on('game:setting', ({ key, value } = {}) => { if (room && pid === vipOf(room)) applySetting(room, key, value); });
  socket.on('host:setting', ({ key, value } = {}) => { if (room && room.hostSid === socket.id) applySetting(room, key, value); });

  socket.on('player:pick', (seat) => { // escolher cor/personagem antes de começar
    if (!room || !pid || room.game || !room.gameId || !GAMES[room.gameId].meta.pick) return;
    if (![0, 1, 2, 3].includes(seat)) return;
    if (Object.entries(room.picks).some(([id, st]) => st === seat && id !== pid)) return;
    room.picks[pid] = seat; push(room);
  });

  socket.on('player:leave', () => { // botão "Sair" do celular
    if (!room || !pid) return;
    const r = room, p = r.players.get(pid);
    if (p) {
      if (!r.game) { r.players.delete(pid); delete r.picks[pid]; r.vip = [...r.players.keys()][0] || null; }
      else { p.connected = false; p.sid = null; p.left = true; r.game.onPlayerChange(); }
    }
    room = null; pid = null; push(r);
  });

  socket.on('game:start', () => {
    if (!room || pid !== vipOf(room) || room.game || !room.gameId) return;
    const { min, max } = GAMES[room.gameId].meta;
    const n = room.players.size;
    if (n < min || n > max) return socket.emit('toast', min === max ? `Este jogo precisa de exatamente ${min} jogadores (agora há ${n}).` : `Este jogo precisa de ${min} a ${max} jogadores.`);
    room.game = new GAMES[room.gameId](makeCtx(room));
    room.game.onStart(); push(room);
  });

  socket.on('host:end', () => { // TV encerra a partida a qualquer momento
    if (!room || room.hostSid !== socket.id || !room.game) return;
    room.game.destroy(); room.game = null; room.gameId = null; push(room);
  });

  socket.on('game:action', ({ type, payload } = {}) => {
    if (!room?.game || !pid) return;
    try { room.game.onAction(pid, type, payload); } catch (e) { console.error(e); }
  });

  socket.on('game:end', () => { // VIP volta ao lobby
    if (!room?.game || pid !== vipOf(room)) return;
    room.game.destroy(); room.game = null; room.gameId = null; push(room);
  });

  socket.on('disconnect', () => {
    if (!room) return;
    const p = pid && room.players.get(pid);
    if (p && p.sid === socket.id) { p.connected = false; p.sid = null; room.game?.onPlayerChange(); push(room); }
    if (room.hostSid === socket.id) room.hostSid = null; // sala sobrevive para a TV reconectar
  });
});

setInterval(() => { // limpa salas abandonadas
  for (const [c, r] of rooms) if (!r.hostSid && Date.now() - r.touched > 4 * 3600e3) { r.game?.destroy(); rooms.delete(c); }
}, 600e3);

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`TV: http://localhost:${PORT}  (celulares: use o IP da sua rede)`));
