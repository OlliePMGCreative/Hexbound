/* ═══════════════════════════════════════════════
   game.js — Core game state manager
   ═══════════════════════════════════════════════ */

const Game = (() => {

  // ── STATE ──
  const STATE = {
    MENU:      'menu',
    PLAYING:   'playing',
    PAUSED:    'paused',
    GAMEOVER:  'gameover',
    COMPLETE:  'complete',
  };

  let currentState   = STATE.MENU;
  let currentArea    = 1;
  let areaCompleted  = false;

  // Screen shake
  let shakeIntensity = 0;
  let shakeDuration  = 0;
  let shakeX = 0, shakeY = 0;

  // ── CANVAS ──
  const canvas = document.getElementById('game-canvas');
  const ctx    = canvas.getContext('2d');

  // Ensure canvas pixel dimensions match logical area
  function resizeCanvas() {
    canvas.width  = 800;
    canvas.height = 414; // full height minus HUD (36) and mobile controls (48)

    // Update camera height
    Level.camera.width  = 800;
    Level.camera.height = 414;
  }

  // ── SCREEN SHAKE ──
  function screenShake(intensity, duration) {
    shakeIntensity = intensity;
    shakeDuration  = duration;
  }

  function updateShake() {
    if (shakeDuration > 0) {
      shakeX = (Math.random() - 0.5) * shakeIntensity;
      shakeY = (Math.random() - 0.5) * shakeIntensity;
      shakeDuration--;
      shakeIntensity *= 0.85;
    } else {
      shakeX = 0; shakeY = 0;
    }
  }

  // ── AREA COMPLETION ──
  let areaCompleteTriggered = false;

  function triggerAreaComplete() {
    if (areaCompleteTriggered) return;
    areaCompleteTriggered = true;
    currentState = STATE.COMPLETE;
    setTimeout(() => {
      UI.showAreaComplete(UI.AREA1_COMPLETE_CODE);
    }, 500);
  }

  function onAllCiviliansSaved() {
    // Bonus score for saving everyone
    Player.addScore(500);
  }

  // ── GAME OVER ──
  function triggerGameOver() {
    currentState = STATE.GAMEOVER;
    setTimeout(() => {
      UI.showOverlay('gameover-screen');
    }, 800);
  }

  // ── START AREA ──
  function startArea(areaId) {
    currentArea = areaId;
    currentState = STATE.PLAYING;
    areaCompleteTriggered = false;

    // Load level
    Level.load(areaId);
    resizeCanvas();

    // Init systems
    Player.init();
    Enemies.init();
    UI.initCivilians();

    // Show game screen
    UI.showScreen('game-screen');
    Audio.stopMusic();
    // Minimal ambient loop during gameplay
    Audio.startMusic();
  }

  // ── MAIN GAME LOOP ──
  let lastTime = 0;
  let running = false;

  function gameLoop(timestamp) {
    if (!running) return;

    // ── UPDATE ──
    if (currentState === STATE.PLAYING) {
      if (!UI.hasActiveDialogue()) {
        Player.update();
        Enemies.update();
      }
      UI.updateCivilians();
      UI.checkLevelExit();
      UI.updateHUD(Player.entity);
      updateShake();
    }

    // ── RENDER ──
    ctx.save();

    // Apply screen shake
    if (shakeX || shakeY) {
      ctx.translate(shakeX, shakeY);
    }

    // Clear
    ctx.fillStyle = '#0d0a1e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw level
    Level.render(ctx);

    // Draw entities
    Enemies.render(ctx);
    UI.renderCivilians(ctx);
    Player.render(ctx);

    // CRT pixel scanlines (canvas-level)
    drawScanlines(ctx);

    ctx.restore();

    requestAnimationFrame(gameLoop);
  }

  function drawScanlines(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    for (let y = 0; y < canvas.height; y += 4) {
      ctx.fillRect(0, y, canvas.width, 2);
    }
  }

  // ── INIT ──
  function init() {
    resizeCanvas();
    UI.init();

    // Handle window resize
    window.addEventListener('resize', resizeCanvas);

    running = true;
    requestAnimationFrame(gameLoop);
  }

  return {
    init,
    startArea,
    triggerGameOver,
    triggerAreaComplete,
    onAllCiviliansSaved,
    screenShake,
    getState() { return currentState; },
    canvas,
    ctx,
  };
})();
