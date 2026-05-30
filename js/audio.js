/* ═══════════════════════════════════════════════
   audio.js — Retro Web Audio API sound engine
   All sound effects generated procedurally (no assets needed)
   ═══════════════════════════════════════════════ */

const Audio = (() => {
  let ctx = null;
  let sfxEnabled = true;
  let musicEnabled = true;
  let musicGain = null;
  let musicOscillators = [];

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  function resumeCtx() {
    const c = getCtx();
    if (c.state === 'suspended') c.resume();
    return c;
  }

  // ── HELPER: play a simple retro beep ──
  function beep(freq, dur, type = 'square', vol = 0.15) {
    if (!sfxEnabled) return;
    const c = resumeCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime);
    gain.gain.setValueAtTime(vol, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + dur);
  }

  // ── SFX BANK ──
  const SFX = {
    jump() {
      beep(220, 0.05, 'square', 0.12);
      setTimeout(() => beep(330, 0.08, 'square', 0.1), 50);
    },
    land() {
      beep(80, 0.08, 'square', 0.1);
    },
    spell() {
      beep(660, 0.06, 'sawtooth', 0.12);
      setTimeout(() => beep(880, 0.06, 'sawtooth', 0.1), 60);
      setTimeout(() => beep(1100, 0.1, 'sawtooth', 0.08), 120);
    },
    spellHit() {
      beep(200, 0.04, 'square', 0.15);
      setTimeout(() => beep(150, 0.06, 'square', 0.12), 40);
      setTimeout(() => beep(100, 0.1, 'square', 0.1), 80);
    },
    hurt() {
      beep(120, 0.05, 'square', 0.2);
      setTimeout(() => beep(100, 0.1, 'square', 0.15), 50);
    },
    enemyDie() {
      const c = resumeCtx();
      // Descending chromatic for death crunch
      [400, 300, 200, 100].forEach((f, i) => {
        setTimeout(() => beep(f, 0.06, 'square', 0.12), i * 40);
      });
    },
    dialogue() {
      beep(500, 0.025, 'square', 0.05);
    },
    menuSelect() {
      beep(440, 0.05, 'square', 0.1);
      setTimeout(() => beep(660, 0.08, 'square', 0.08), 50);
    },
    menuMove() {
      beep(330, 0.04, 'square', 0.06);
    },
    passcodeReveal() {
      [220, 330, 440, 660, 880].forEach((f, i) => {
        setTimeout(() => beep(f, 0.1, 'square', 0.12), i * 80);
      });
    },
    areaComplete() {
      // Jingle: C E G C octave
      const notes = [262, 330, 392, 523];
      notes.forEach((f, i) => setTimeout(() => beep(f, 0.15, 'square', 0.14), i * 100));
    },
    pickup() {
      beep(523, 0.06, 'square', 0.1);
      setTimeout(() => beep(659, 0.08, 'square', 0.1), 60);
    },
    error() {
      beep(100, 0.15, 'square', 0.18);
    }
  };

  // ── CHIPTUNE MUSIC ── (minimalist procedural loop)
  function startMusic() {
    if (!musicEnabled) return;
    const c = resumeCtx();

    // Stop existing
    stopMusic();

    musicGain = c.createGain();
    musicGain.gain.setValueAtTime(0.06, c.currentTime);
    musicGain.connect(c.destination);

    // Simple spooky arpeggio in Dm: D F A C
    const TEMPO = 0.22; // seconds per step
    const arpNotes = [146.8, 174.6, 220, 261.6]; // D3 F3 A3 C4
    let step = 0;

    function playStep() {
      if (!musicEnabled || !musicGain) return;
      const osc = c.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(arpNotes[step % arpNotes.length], c.currentTime);
      const g = c.createGain();
      g.gain.setValueAtTime(1, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + TEMPO * 0.7);
      osc.connect(g);
      g.connect(musicGain);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + TEMPO);
      step++;
      musicOscillators.push(osc);
    }

    // Use setInterval for simplicity
    const intervalId = setInterval(() => {
      if (!musicEnabled) { clearInterval(intervalId); return; }
      playStep();
    }, TEMPO * 1000);
    // Store interval id on gain node for cleanup
    musicGain._intervalId = intervalId;
  }

  function stopMusic() {
    if (musicGain) {
      clearInterval(musicGain._intervalId);
      musicGain.disconnect();
      musicGain = null;
    }
    musicOscillators.forEach(o => { try { o.stop(); } catch(e){} });
    musicOscillators = [];
  }

  return {
    sfxEnabled() { return sfxEnabled; },
    musicEnabled() { return musicEnabled; },
    setSFX(v) { sfxEnabled = v; },
    setMusic(v) {
      musicEnabled = v;
      if (v) startMusic();
      else stopMusic();
    },
    startMusic,
    stopMusic,
    play(name) {
      if (SFX[name]) SFX[name]();
    },
    init() {
      // Start audio context on first interaction
      document.addEventListener('click', () => resumeCtx(), { once: true });
      document.addEventListener('keydown', () => resumeCtx(), { once: true });
    }
  };
})();
