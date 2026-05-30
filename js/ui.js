/* ═══════════════════════════════════════════════
   ui.js — Menus, HUD, Dialogue, Passcode system
   ═══════════════════════════════════════════════ */

const UI = (() => {

  // ── PASSCODE TABLE ──
  // Each area code grants access to that area
  const PASSCODES = {
    'GRVD': 1, // Start - graveyard (Area 1, but can be used to restart)
    'CRYPT': 2, // Area 2 code — players receive this on area 1 completion
  };
  const AREA1_COMPLETE_CODE = 'CRPT'; // Code revealed on Area 1 completion

  const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';

  // ── CIVILIAN NPC SYSTEM ──
  let civilianEntities = [];
  let activeDialogue = null;
  let dialogueIndex  = 0;
  let dialogueCharIdx = 0;
  let dialogueTimer   = 0;

  // ── HUD REFS ──
  const hudLives     = document.getElementById('hud-lives');
  const hudMana      = document.getElementById('hud-mana');
  const hudScore     = document.getElementById('hud-score');
  const hudCivilians = document.getElementById('hud-civilians');

  // ── SCREEN MANAGEMENT ──
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => {
      s.classList.remove('active');
      s.style.display = '';
    });
    const target = document.getElementById(id);
    if (target) {
      target.style.display = 'flex';
      target.classList.add('active');
    }
  }

  // ── OVERLAY TOGGLE ──
  function showOverlay(id)   { document.getElementById(id).classList.remove('hidden'); }
  function hideOverlay(id)   { document.getElementById(id).classList.add('hidden'); }

  // ── PASSCODE GRID BUILDER ──
  function buildPasscodeGrid() {
    const grid = document.getElementById('passcode-grid');
    if (!grid) return;
    grid.innerHTML = '';
    let passcodeInput = ['', '', '', ''];
    let currentIdx = 0;

    function updateDisplay() {
      for (let i = 0; i < 4; i++) {
        const charEl = document.getElementById(`pc${i}`);
        if (charEl) {
          charEl.textContent = passcodeInput[i] || '_';
          charEl.classList.toggle('active-char', i === currentIdx);
        }
      }
    }

    // Character buttons
    CHARS.split('').forEach(ch => {
      const btn = document.createElement('button');
      btn.className = 'pgrid-btn';
      btn.textContent = ch;
      btn.addEventListener('click', () => {
        if (currentIdx < 4) {
          passcodeInput[currentIdx] = ch;
          currentIdx = Math.min(3, currentIdx + 1);
          updateDisplay();
          Audio.play('menuMove');
        }
      });
      grid.appendChild(btn);
    });

    // Backspace
    const backBtn = document.createElement('button');
    backBtn.className = 'pgrid-btn backspace';
    backBtn.textContent = '◀ DEL';
    backBtn.addEventListener('click', () => {
      if (currentIdx > 0 || passcodeInput[currentIdx] !== '') {
        passcodeInput[currentIdx] = '';
        currentIdx = Math.max(0, currentIdx - 1);
        passcodeInput[currentIdx] = '';
        updateDisplay();
        Audio.play('menuMove');
      }
    });
    grid.appendChild(backBtn);

    // Allow keyboard input on passcode screen
    function onKeyForPasscode(e) {
      if (!document.getElementById('passcode-screen').classList.contains('active')) return;
      if (/^[A-Za-z0-9]$/.test(e.key) && currentIdx < 4) {
        passcodeInput[currentIdx] = e.key.toUpperCase();
        currentIdx = Math.min(3, currentIdx + 1);
        updateDisplay();
        Audio.play('menuMove');
      } else if (e.key === 'Backspace') {
        passcodeInput[currentIdx] = '';
        currentIdx = Math.max(0, currentIdx - 1);
        passcodeInput[currentIdx] = '';
        updateDisplay();
      } else if (e.key === 'Enter') {
        confirmPasscode();
      }
    }
    window.addEventListener('keydown', onKeyForPasscode);

    function confirmPasscode() {
      const code = passcodeInput.join('');
      const errEl = document.getElementById('passcode-error');
      if (code.length < 4) {
        errEl.textContent = 'ENTER 4 CHARACTERS';
        Audio.play('error');
        return;
      }
      if (PASSCODES[code] !== undefined) {
        errEl.textContent = '';
        Audio.play('menuSelect');
        Game.startArea(PASSCODES[code]);
      } else {
        errEl.textContent = 'INVALID CODE. TRY AGAIN.';
        errEl.style.animation = 'none';
        requestAnimationFrame(() => { errEl.style.animation = 'shake 0.4s ease'; });
        Audio.play('error');
        passcodeInput = ['', '', '', ''];
        currentIdx = 0;
        updateDisplay();
      }
    }

    document.getElementById('btn-passcode-confirm').addEventListener('click', confirmPasscode);
    document.getElementById('btn-passcode-back').addEventListener('click', () => {
      Audio.play('menuSelect');
      showMainMenu();
    });

    updateDisplay();
  }

  // ── MAIN MENU SETUP ──
  function showMainMenu() {
    showScreen('start-menu');
    Audio.startMusic();
  }

  function initMainMenu() {
    document.getElementById('btn-play').addEventListener('click', () => {
      Audio.play('menuSelect');
      Game.startArea(1);
    });
    document.getElementById('btn-load').addEventListener('click', () => {
      Audio.play('menuSelect');
      showScreen('passcode-screen');
      buildPasscodeGrid();
    });
    document.getElementById('btn-settings').addEventListener('click', () => {
      Audio.play('menuSelect');
      showScreen('settings-screen');
    });
    document.getElementById('btn-settings-back').addEventListener('click', () => {
      Audio.play('menuSelect');
      showMainMenu();
    });

    // Settings toggles
    initToggle('sfx-toggle', true, (v) => {
      Audio.setSFX(v);
    });
    initToggle('music-toggle', true, (v) => {
      Audio.setMusic(v);
    });
    initToggle('crt-toggle', true, (v) => {
      document.body.classList.toggle('crt-off', !v);
    });

    // Press any key on start menu
    document.addEventListener('keydown', (e) => {
      const menu = document.getElementById('start-menu');
      if (menu && menu.classList.contains('active')) {
        if (e.code === 'Enter' || e.code === 'Space') {
          Audio.play('menuSelect');
          Game.startArea(1);
        }
      }
    });
  }

  function initToggle(id, defaultVal, onChange) {
    const btn = document.getElementById(id);
    if (!btn) return;
    let state = defaultVal;
    btn.addEventListener('click', () => {
      state = !state;
      btn.textContent = state ? 'ON' : 'OFF';
      btn.classList.toggle('active', state);
      onChange(state);
      Audio.play('menuMove');
    });
  }

  // ── GAMEOVER / RETRY ──
  function initGameOver() {
    document.getElementById('btn-retry').addEventListener('click', () => {
      Audio.play('menuSelect');
      hideOverlay('gameover-screen');
      Game.startArea(1);
    });
    document.getElementById('btn-gameover-menu').addEventListener('click', () => {
      Audio.play('menuSelect');
      hideOverlay('gameover-screen');
      showMainMenu();
    });
  }

  // ── AREA COMPLETE / PASSCODE REVEAL ──
  function showAreaComplete(code) {
    document.getElementById('reveal-code').textContent = code;
    showOverlay('passcode-reveal');
    Audio.play('passcodeReveal');
    setTimeout(() => Audio.play('areaComplete'), 600);

    document.getElementById('btn-reveal-continue').addEventListener('click', () => {
      Audio.play('menuSelect');
      hideOverlay('passcode-reveal');
      showMainMenu();
    }, { once: true });
  }

  // ── HUD UPDATE ──
  function updateHUD(playerEntity) {
    // Lives (hearts)
    const hearts = '♥ '.repeat(Math.max(0, playerEntity.lives)).trimEnd();
    const emptyHearts = '♡ '.repeat(Math.max(0, playerEntity.maxLives - playerEntity.lives)).trimEnd();
    hudLives.textContent = hearts + (emptyHearts ? ' ' + emptyHearts : '');

    // Mana (stars)
    const manaFull  = '✦ '.repeat(Math.max(0, playerEntity.mana)).trimEnd();
    const manaEmpty = '✧ '.repeat(Math.max(0, playerEntity.maxMana - playerEntity.mana)).trimEnd();
    hudMana.textContent = manaFull + (manaEmpty ? ' ' + manaEmpty : '');

    // Score
    hudScore.textContent = 'SCORE: ' + String(playerEntity.score).padStart(6, '0');

    // Civilians
    hudCivilians.textContent = `SAVED: ${playerEntity.civiliansSaved}/${playerEntity.totalCivilians}`;
  }

  // ── CIVILIAN NPC SYSTEM ──
  function initCivilians() {
    civilianEntities = [];
    const spawns = Level.getSpawns();
    spawns.civilians.forEach(c => {
      civilianEntities.push({
        x: c.tx * Level.TILE,
        y: c.ty * Level.TILE - 28,
        width: 14, height: 28,
        name: c.name,
        dialogue: c.dialogue,
        powerup: c.powerup,
        frame: 0,
        saved: false,
        waving: false,
        interactable: false,
      });
    });
  }

  function rectsOverlap(a, b) {
    return (
      a.x < b.x + b.width  &&
      a.x + a.width > b.x  &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  function updateCivilians() {
    if (!civilianEntities.length) return;

    const p = Player.entity;
    const INTERACT_RANGE = 40;

    civilianEntities.forEach(civ => {
      if (civ.saved) return;
      civ.frame++;

      const dx = p.x - civ.x;
      const dy = p.y - civ.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      civ.waving = dist < 80;
      civ.interactable = dist < INTERACT_RANGE;
    });

    // Trigger dialogue
    if (Player.keys.interact && !activeDialogue) {
      const nearCiv = civilianEntities.find(c => !c.saved && c.interactable);
      if (nearCiv) {
        startDialogue(nearCiv);
      }
    }

    // Advance dialogue
    if (activeDialogue) {
      dialogueTimer++;
      const line = activeDialogue.dialogue[dialogueIndex];

      // Typewriter effect
      if (dialogueCharIdx < line.length) {
        if (dialogueTimer % 2 === 0) {
          dialogueCharIdx++;
          document.getElementById('dialogue-text').textContent = line.slice(0, dialogueCharIdx);
          Audio.play('dialogue');
        }
      }

      // Advance on interact press (debounced)
      if (Player.keys.interact && dialogueTimer > 10) {
        if (dialogueCharIdx < line.length) {
          // Skip typewriter
          dialogueCharIdx = line.length;
          document.getElementById('dialogue-text').textContent = line;
        } else {
          dialogueIndex++;
          dialogueTimer = 0;
          dialogueCharIdx = 0;
          Audio.play('menuMove');
          if (dialogueIndex >= activeDialogue.dialogue.length) {
            endDialogue(activeDialogue);
          } else {
            document.getElementById('dialogue-text').textContent = '';
          }
        }
        // Brief debounce — wait for key release
        Player.keys.interact = false;
      }
    }
  }

  function startDialogue(civ) {
    activeDialogue = civ;
    dialogueIndex = 0;
    dialogueCharIdx = 0;
    dialogueTimer = 0;
    document.getElementById('dialogue-name').textContent = civ.name;
    document.getElementById('dialogue-text').textContent = '';
    drawCivilianPortrait(civ);
    showOverlay('dialogue-overlay');
    Audio.play('menuMove');
  }

  function drawCivilianPortrait(civ) {
    const canvas = document.getElementById('dialogue-portrait');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 48, 48);
    ctx.fillStyle = '#1a1135';
    ctx.fillRect(0, 0, 48, 48);
    // Scale up the civilian sprite to fit portrait
    ctx.save();
    ctx.scale(1.5, 1.5);
    Sprites.drawCivilian(ctx, 5, 5, 0, false);
    ctx.restore();
  }

  function endDialogue(civ) {
    activeDialogue = null;
    civ.saved = true;
    hideOverlay('dialogue-overlay');

    // Grant powerup
    if (civ.powerup === 'mana')   Player.gainMana(3);
    if (civ.powerup === 'health') Player.gainHealth(1);

    Player.entity.civiliansSaved++;
    Audio.play('areaComplete');

    // Check if all civilians saved
    const allSaved = civilianEntities.every(c => c.saved);
    if (allSaved) {
      Game.onAllCiviliansSaved();
    }
  }

  function renderCivilians(ctx) {
    const camX = Math.floor(Level.camera.x);
    const camY = Math.floor(Level.camera.y);

    civilianEntities.forEach(civ => {
      if (civ.saved) return;
      const dx = Math.floor(civ.x - camX);
      const dy = Math.floor(civ.y - camY);
      if (dx < -64 || dx > 864) return;

      Sprites.drawCivilian(ctx, dx, dy, civ.frame, civ.waving);

      // Exclamation bubble if interactable
      if (civ.interactable && !activeDialogue) {
        ctx.fillStyle = '#f4f0ff';
        ctx.fillRect(dx + 4, dy - 14, 8, 10);
        ctx.fillStyle = '#d946ef';
        ctx.font = '7px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('!', dx + 8, dy - 6);
        ctx.fillStyle = '#f4f0ff';
        ctx.fillRect(dx + 6, dy - 4, 4, 3);

        // "PRESS E" hint
        ctx.fillStyle = 'rgba(244,240,255,0.7)';
        ctx.font = '5px "Press Start 2P", monospace';
        ctx.fillText('PRESS E', dx + 7, dy - 18);
      }
    });
  }

  // ── AREA EXIT CHECK ──
  function checkLevelExit() {
    const spawns = Level.getSpawns();
    if (!spawns) return;
    const ex = spawns.levelExit;
    const exitRect = {
      x: ex.tx * Level.TILE - 8,
      y: ex.ty * Level.TILE - 32,
      width: 40,
      height: 48
    };
    const p = Player.entity;
    if (rectsOverlap(p, exitRect)) {
      Game.triggerAreaComplete();
    }
  }

  // ── INIT ──
  function init() {
    Audio.init();
    initMainMenu();
    initGameOver();
    showMainMenu();
  }

  return {
    init,
    showMainMenu,
    showScreen,
    showOverlay,
    hideOverlay,
    updateHUD,
    initCivilians,
    updateCivilians,
    renderCivilians,
    checkLevelExit,
    showAreaComplete,
    AREA1_COMPLETE_CODE,
    hasActiveDialogue() { return activeDialogue !== null; }
  };
})();
