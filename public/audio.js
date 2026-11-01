/* Áudio 100% sintetizado (WebAudio): música de fundo + efeitos, com variação por tema do Ludo
   (classic | transformers | shrek). Composições originais; nada de arquivos externos. */
(function () {
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null, master = null, musicGain = null, sfxGain = null;
  var on = true, wanted = false, timer = null, step = 0, nextT = 0, theme = 'classic';
  try { on = localStorage.getItem('ga_mute') !== '1'; } catch (e) {}

  function ensure() {
    if (!AC) return false;
    if (!ctx) {
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = on ? 1 : 0; master.connect(ctx.destination);
      musicGain = ctx.createGain(); musicGain.gain.value = 0.10; musicGain.connect(master);
      sfxGain = ctx.createGain(); sfxGain.gain.value = 0.35; sfxGain.connect(master);
    }
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
    return true;
  }
  // lp = corte de filtro passa-baixa (timbre mais "abafado"/metálico)
  function tone(f, t, d, type, vol, dest, slide, lp) {
    var o = ctx.createOscillator(), g = ctx.createGain(), out = g;
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.5, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g);
    if (lp) { var fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; g.connect(fl); out = fl; }
    out.connect(dest || sfxGain); o.start(t); o.stop(t + d + 0.05);
  }
  function noise(t, d, vol, dest) {
    var n = Math.floor(ctx.sampleRate * d), b = ctx.createBuffer(1, n, ctx.sampleRate), x = b.getChannelData(0);
    for (var i = 0; i < n; i++) x[i] = Math.random() * 2 - 1;
    var s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = b; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(g); g.connect(dest || sfxGain); s.start(t);
  }
  function seq(notes, t, gap, type, vol, d, lp) { notes.forEach(function (f, i) { tone(f, t + i * gap, d || 0.18, type || 'triangle', vol || 0.5, null, 0, lp); }); }

  // ---------- efeitos padrão ----------
  var SFX = {
    click: function (t) { tone(660, t, 0.07, 'triangle', 0.4); },
    ok: function (t) { seq([523, 659, 784], t, 0.07); },
    join: function (t) { seq([587, 784], t, 0.08); },
    error: function (t) { tone(200, t, 0.25, 'sawtooth', 0.3, null, 110); },
    dice: function (t) { for (var i = 0; i < 7; i++) tone(250 + Math.random() * 500, t + i * 0.06, 0.05, 'square', 0.22); tone(880, t + 0.45, 0.12, 'triangle', 0.4); },
    move: function (t) { tone(420, t, 0.12, 'sine', 0.55, null, 700); },
    capture: function (t) { noise(t, 0.2, 0.5); tone(320, t, 0.35, 'sawtooth', 0.4, null, 70); },
    home: function (t) { seq([784, 988, 1175], t, 0.09, 'triangle', 0.5, 0.25); },
    turn: function (t) { seq([659, 880], t, 0.1); },
    tick: function (t) { tone(1000, t, 0.05, 'square', 0.18); },
    stop: function (t) { noise(t, 0.12, 0.4); tone(150, t, 0.45, 'sawtooth', 0.45, null, 70); },
    reveal: function (t) { seq([523, 659, 784, 1047], t, 0.08, 'triangle', 0.5, 0.25); },
    start: function (t) { seq([392, 523, 659], t, 0.1, 'triangle', 0.5, 0.22); },
    cancel: function (t) { seq([392, 330, 262], t, 0.12, 'triangle', 0.45, 0.25); },
    win: function (t) { seq([523, 523, 523, 659, 784, 1047], t, 0.13, 'triangle', 0.55, 0.3); }
  };
  // ---------- variações por tema (o que não está aqui usa o padrão) ----------
  var SFX_T = {
    transformers: { // robótico / metálico
      click: function (t) { tone(900, t, 0.04, 'square', 0.2, null, 0, 3000); },
      dice: function (t) { for (var i = 0; i < 8; i++) tone(800 - i * 55, t + i * 0.05, 0.03, 'square', 0.22); noise(t + 0.45, 0.25, 0.4); tone(220, t + 0.45, 0.3, 'sawtooth', 0.35, null, 110, 1500); },
      move: function (t) { tone(180, t, 0.16, 'sawtooth', 0.28, null, 460, 1400); },
      capture: function (t) { tone(1000, t, 0.45, 'sawtooth', 0.35, null, 110, 2500); noise(t, 0.3, 0.5); },
      home: function (t) { seq([440, 659, 880, 1319], t, 0.07, 'square', 0.28, 0.22, 3500); },
      turn: function (t) { tone(1200, t, 0.08, 'square', 0.22); tone(900, t + 0.11, 0.1, 'square', 0.22); },
      start: function (t) { tone(200, t, 0.6, 'sawtooth', 0.3, null, 1300, 3000); noise(t, 0.4, 0.3); },
      join: function (t) { seq([700, 1050], t, 0.07, 'square', 0.25, 0.1); },
      win: function (t) { seq([330, 330, 330, 440, 523, 659, 880], t, 0.13, 'sawtooth', 0.4, 0.34, 2600); }
    },
    shrek: { // brincalhão / medieval
      click: function (t) { tone(520, t, 0.05, 'triangle', 0.45, null, 380); },
      dice: function (t) { for (var i = 0; i < 6; i++) tone(150 + Math.random() * 90, t + i * 0.07, 0.09, 'triangle', 0.55, null, 90); tone(880, t + 0.5, 0.2, 'sine', 0.4); },
      move: function (t) { tone(300, t, 0.18, 'sine', 0.5, null, 720); tone(720, t + 0.12, 0.14, 'sine', 0.4, null, 340); },
      capture: function (t) { noise(t, 0.25, 0.5); tone(420, t, 0.32, 'sine', 0.5, null, 90); },
      home: function (t) { seq([587, 740, 880, 1175], t, 0.08, 'triangle', 0.5, 0.26); },
      turn: function (t) { seq([392, 494], t, 0.09, 'triangle', 0.5, 0.22); },
      start: function (t) { seq([392, 523, 659, 784], t, 0.09, 'triangle', 0.5, 0.24); },
      win: function (t) { seq([392, 494, 587, 784, 587, 784], t, 0.14, 'triangle', 0.55, 0.32); }
    }
  };

  // ---------- músicas de fundo (cada tema: andamento + função que toca o passo n) ----------
  var CH = [[130.81, 164.81, 196], [110, 130.81, 164.81], [87.31, 110, 130.81], [98, 123.47, 146.83]];
  var PENT = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
  var MEL = [0, -1, 2, -1, 4, -1, 2, -1, 1, -1, 3, -1, 5, -1, 3, -1, 0, -1, 2, 4, 5, -1, 4, -1, 2, -1, 1, -1, 0, -1, -1, -1];
  var MUSIC = {
    classic: { sps: 60 / 104 / 2, play: function (n, t) {
      var c = CH[Math.floor(n / 8) % 4], i = n % 8;
      if (i % 4 === 0) tone(c[0], t, 0.5, 'triangle', 0.9, musicGain);
      tone(c[i % 3] * 2, t, 0.22, 'sine', 0.35, musicGain);
      var m = MEL[n % 32]; if (m >= 0) tone(PENT[m], t, 0.28, 'triangle', 0.4, musicGain);
    } },
    // Transformers-like: Lá menor, batida marcada, baixo serrilhado e lead de sintetizador (composição original)
    transformers: { sps: 60 / 124 / 2, play: function (n, t) {
      var ROOT = [110, 87.31, 130.81, 98], ch = ROOT[Math.floor(n / 8) % 4], i = n % 8;
      var LEAD = [440, 523.25, 587.33, 659.25, 783.99];
      var ML = [0, -1, -1, 2, -1, 3, -1, 2, 4, -1, 3, -1, 2, -1, 0, -1, 0, -1, -1, 2, -1, 3, -1, 4, 3, -1, 2, -1, 1, -1, 0, -1];
      tone(ch, t, 0.2, 'sawtooth', 0.8, musicGain, 0, 700);                       // baixo pulsante
      if (i === 0 || i === 4) tone(80, t, 0.22, 'sine', 1.0, musicGain, 38);          // bumbo
      if (i % 2 === 1) noise(t, 0.05, 0.25, musicGain);                                // chimbal metálico
      if (i === 0) { tone(ch * 4, t, 0.3, 'sawtooth', 0.28, musicGain, 0, 2200); tone(ch * 6, t, 0.3, 'sawtooth', 0.22, musicGain, 0, 2200); } // "metais"
      var m = ML[n % 32]; if (m >= 0) tone(LEAD[m], t, 0.2, 'square', 0.22, musicGain, 0, 2800);
    } },
    // Shrek-like: folk/medieval brincalhão em Sol maior, "oom-pah" com alaúde e flautinha (composição original)
    shrek: { sps: 60 / 108 / 2, play: function (n, t) {
      var ROOT = [98, 82.41, 130.81, 73.42 * 2], CHD = [[196, 246.94, 293.66], [164.81, 196, 246.94], [196, 261.63, 329.63], [185, 220, 293.66]];
      var bar = Math.floor(n / 8) % 4, i = n % 8, ch = CHD[bar];
      var FL = [784, 880, 988, 1175, 1319];
      var MF = [0, -1, 1, 2, -1, 1, 0, -1, 3, -1, 2, 1, -1, 0, -1, -1, 0, -1, 1, 2, -1, 3, 4, -1, 3, -1, 2, 1, 0, -1, -1, -1];
      if (i === 0) tone(ROOT[bar], t, 0.35, 'triangle', 0.95, musicGain);
      if (i === 4) tone(ROOT[bar] * 1.5, t, 0.3, 'triangle', 0.8, musicGain);
      if (i === 2 || i === 6) ch.forEach(function (f, k) { tone(f, t + k * 0.02, 0.22, 'triangle', 0.35, musicGain); }); // acorde dedilhado
      var m = MF[n % 32]; if (m >= 0) tone(FL[m], t, 0.26, 'sine', 0.38, musicGain);
    } }
  };
  function sched() {
    var M = MUSIC[theme] || MUSIC.classic;
    while (nextT < ctx.currentTime + 0.3) { M.play(step, nextT); nextT += M.sps; step++; }
  }
  function running() { return !!ctx && ctx.state === 'running'; }
  function musicStart() { if (!ensure() || timer) return; nextT = ctx.currentTime + 0.1; step = 0; timer = setInterval(sched, 100); }
  function musicStop() { if (timer) { clearInterval(timer); timer = null; } }

  window.GA = {
    unlock: function () { if (ensure() && wanted) musicStart(); },
    running: running,
    setMusic: function (b) { wanted = b; if (b) { if (ensure()) musicStart(); } else musicStop(); },
    setTheme: function (id) { id = MUSIC[id] ? id : 'classic'; if (id === theme) return; theme = id; if (timer) { musicStop(); musicStart(); } },
    sfx: function (name) {
      var f = (SFX_T[theme] && SFX_T[theme][name]) || SFX[name];
      if (!on || !f || !ensure() || !running()) return;
      try { f(ctx.currentTime + 0.01); } catch (e) {}
    },
    toggle: function () { on = !on; if (master) master.gain.value = on ? 1 : 0; try { localStorage.setItem('ga_mute', on ? '0' : '1'); } catch (e) {} return on; },
    isOn: function () { return on; }
  };
})();
