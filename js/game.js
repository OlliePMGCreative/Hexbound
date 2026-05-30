/* ═══════════════════════════════════════════════
   game.js — Core game state manager
   ═══════════════════════════════════════════════ */

const Game = (() => {

  const STATE = {
    INTRO:    'intro',
    MENU:     'menu',
    PLAYING:  'playing',
    PAUSED:   'paused',
    GAMEOVER: 'gameover',
    COMPLETE: 'complete',
  };

  let currentState = STATE.MENU; // start at menu directly
  let currentArea  = 1;
  let areaCompleteTriggered = false;

  let shakeIntensity = 0, shakeDuration = 0, shakeX = 0, shakeY = 0;

  const canvas      = document.getElementById('game-canvas');
  const ctx         = canvas.getContext('2d');
  const introCanvas = document.getElementById('intro-canvas');
  const introCtx    = introCanvas?.getContext('2d');

  function resizeCanvas() {
    const W = window.innerWidth;
    const H = window.innerHeight - 36 - 48;
    canvas.width  = W;
    canvas.height = H;
    Level.camera.width  = W;
    Level.camera.height = H;
    if (introCanvas) {
      introCanvas.width  = window.innerWidth;
      introCanvas.height = window.innerHeight;
    }
  }

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
    } else { shakeX = 0; shakeY = 0; }
  }

  function triggerAreaComplete() {
    if (areaCompleteTriggered) return;
    areaCompleteTriggered = true;
    currentState = STATE.COMPLETE;
    setTimeout(() => UI.showAreaComplete(UI.AREA1_COMPLETE_CODE), 500);
  }

  function triggerGameOver() {
    currentState = STATE.GAMEOVER;
    setTimeout(() => UI.showOverlay('gameover-screen'), 800);
  }

  // Called by UI after intro finishes
  function startArea(areaId) {
    currentArea  = areaId;
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

  function returnToMenu() {
    currentState = STATE.MENU;
    Audio.stopMusic();
    UI.showScreen('start-menu');
  }

  function togglePause() {
    if (currentState === STATE.PLAYING) {
      currentState = STATE.PAUSED;
      UI.showPause();
    } else if (currentState === STATE.PAUSED) {
      currentState = STATE.PLAYING;
      UI.hidePause();
    }
  }

  function onAllCiviliansSaved() { Player.addScore(500); }

  let running = false;

  function gameLoop() {
    if (!running) { requestAnimationFrame(gameLoop); return; }

    // Intro rendering (when intro canvas is active)
    if (currentState === STATE.INTRO) {
      if (introCtx && Intro.isRunning()) {
        Intro.update(introCtx, introCanvas.width, introCanvas.height);
      }
      requestAnimationFrame(gameLoop);
      return;
    }

    // Update (only when playing)
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

    // Render (gameplay states only)
    if (currentState === STATE.PLAYING || currentState === STATE.PAUSED ||
        currentState === STATE.COMPLETE || currentState === STATE.GAMEOVER) {
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
    for (let y = 0; y < canvas.height; y += 4) ctx.fillRect(0, y, canvas.width, 2);
  }

  function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    running = true;
    // Start at menu — UI.init() wires Play button to show intro then start game
    UI.init();
    requestAnimationFrame(gameLoop);
  }

  return {
    init, startArea, returnToMenu, togglePause,
    triggerGameOver, triggerAreaComplete, onAllCiviliansSaved, screenShake,
    getState() { return currentState; },
    setState(s) { currentState = s; },
    canvas, ctx, introCanvas, introCtx,
    STATE,
  };
})();
