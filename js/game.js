/* ═══════════════════════════════════════════════
   game.js — Core game state manager
   ═══════════════════════════════════════════════ */

const Game = (() => {

  // ── STATE ──
  const STATE = {
    INTRO:     'intro',
    MENU:      'menu',
    PLAYING:   'playing',
    PAUSED:    'paused',
    GAMEOVER:  'gameover',
    COMPLETE:  'complete',
  };

  let currentState = STATE.INTRO;
  let currentArea  = 1;
  let areaCompleteTriggered = false;

  // Screen shake
  let shakeIntensity = 0;
  let shakeDuration  = 0;
  let shakeX = 0, shakeY = 0;

  // ── CANVAS ──
  const canvas = document.getElementById('game-canvas');
  const ctx    = canvas.getContext('2d');

  // Intro canvas — fullscreen overlay
  const introCanvas = document.getElementById('intro-canvas');
  const introCtx    = introCanvas?.getContext('2d');

  function resizeCanvas() {
    const HUD_H  = 36;
    const CTRL_H = 48;
    const W = window.innerWidth;
    const H = window.innerHeight - HUD_H - CTRL_H;

    canvas.width  = W;
    canvas.height = H;

    Level.camera.width  = W;
    Level.camera.height = H;

    // Intro canvas always fullscreen
    if (introCanvas) {
      introCanvas.width  = window.innerWidth;
      introCanvas.height = window.innerHeight;
    }
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
  function triggerAreaComplete() {
    if (areaCompleteTriggered) return;
    areaCompleteTriggered = true;
    currentState = STATE.COMPLETE;
    setTimeout(() => {
      UI.showAreaComplete(UI.AREA1_COMPLETE_CODE);
    }, 500);
  }

  function onAllCiviliansSaved() {
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

    Level.load(areaId);
    resizeCanvas();

    Player.init();
    Enemies.init();
    UI.initCivilians();

    UI.showScreen('game-screen');
    Audio.stopMusic();
    Audio.startMusic();
  }

  // ── MAIN GAME LOOP ──
  let running = false;

  function gameLoop() {
    if (!running) { requestAnimationFrame(gameLoop); return; }

    // ── INTRO ──
    if (currentState === STATE.INTRO) {
      if (introCtx && Intro.isRunning()) {
        Intro.update(introCtx, introCanvas.width, introCanvas.height);
      }
      requestAnimationFrame(gameLoop);
      return;
    }

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

    // ── RENDER (only when gameplay active) ──
    if (currentState === STATE.PLAYING || currentState === STATE.COMPLETE || currentState === STATE.GAMEOVER) {
      ctx.save();
      if (shakeX || shakeY) ctx.translate(shakeX, shakeY);

      ctx.fillStyle = '#0d0a1e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      Level.render(ctx);
      Enemies.render(ctx);
      UI.renderCivilians(ctx);
      Player.render(ctx);
      drawScanlines(ctx);

      ctx.restore();
    }

    requestAnimationFrame(gameLoop);
  }

  function drawScanlines(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    for (let y = 0; y < canvas.height; y += 4) {
      ctx.fillRect(0, y, canvas.width, 2);
    }
  }

  // ── INIT ──
  async function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Show intro canvas, hide game elements
    if (introCanvas) introCanvas.style.display = 'block';

    // Preload intro images then start
    await Intro.preload();

    running = true;
    requestAnimationFrame(gameLoop);

    Intro.start(introCanvas, introCtx, () => {
      // Intro done → show main menu
      if (introCanvas) introCanvas.style.display = 'none';
      currentState = STATE.MENU;
      UI.init();
    });
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
