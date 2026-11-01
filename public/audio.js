/* Áudio 100% sintetizado (WebAudio): música de fundo + efeitos. Sem arquivos externos. */
(function () {
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null, master = null, musicGain = null, sfxGain = null;
  var on = true, wanted = false, timer = null, step = 0, nextT = 0, SPS = 60 / 104 / 2;
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
  function tone(f, t, d, type, vol, dest, slide) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.5, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(dest || sfxGain); o.start(t); o.stop(t + d + 0.05);
  }
  function noise(t, d, vol) {
    var n = Math.floor(ctx.sampleRate * d), b = ctx.createBuffer(1, n, ctx.sampleRate), x = b.getChannelData(0);
    for (var i = 0; i < n; i++) x[i] = Math.random() * 2 - 1;
    var s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = b; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(g); g.connect(sfxGain); s.start(t);
  }
  function seq(notes, t, gap, type, vol, d) { notes.forEach(function (f, i) { tone(f, t + i * gap, d || 0.18, type || 'triangle', vol || 0.5); }); }

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

  var CH = [[130.81, 164.81, 196], [110, 130.81, 164.81], [87.31, 110, 130.81], [98, 123.47, 146.83]];
  var PENT = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
  var MEL = [0, -1, 2, -1, 4, -1, 2, -1, 1, -1, 3, -1, 5, -1, 3, -1, 0, -1, 2, 4, 5, -1, 4, -1, 2, -1, 1, -1, 0, -1, -1, -1];
  function sched() {
    while (nextT < ctx.currentTime + 0.3) {
      var c = CH[Math.floor(step / 8) % 4], i = step % 8;
      if (i % 4 === 0) tone(c[0], nextT, 0.5, 'triangle', 0.9, musicGain);
      tone(c[i % 3] * 2, nextT, 0.22, 'sine', 0.35, musicGain);
      var m = MEL[step % 32]; if (m >= 0) tone(PENT[m], nextT, 0.28, 'triangle', 0.4, musicGain);
      nextT += SPS; step++;
    }
  }
  function running() { return !!ctx && ctx.state === 'running'; }
  function musicStart() { if (!ensure() || timer) return; nextT = ctx.currentTime + 0.1; step = 0; timer = setInterval(sched, 100); }
  function musicStop() { if (timer) { clearInterval(timer); timer = null; } }

  window.GA = {
    unlock: function () { if (ensure() && wanted) musicStart(); },
    running: running,
    setMusic: function (b) { wanted = b; if (b) { if (ensure()) musicStart(); } else musicStop(); },
    sfx: function (name) { if (!on || !SFX[name] || !ensure() || !running()) return; try { SFX[name](ctx.currentTime + 0.01); } catch (e) {} },
    toggle: function () { on = !on; if (master) master.gain.value = on ? 1 : 0; try { localStorage.setItem('ga_mute', on ? '0' : '1'); } catch (e) {} return on; },
    isOn: function () { return on; }
  };
})();
