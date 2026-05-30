/* ═══════════════════════════════════════════════
   main.js — Boot sequence
   Load sprite images first, then start game.
   ═══════════════════════════════════════════════ */

window.addEventListener('load', async () => {
  // Load all PNGs from assets/sprites/ (fails silently if missing)
  await SpriteLoader.load();
  // Start the game
  Game.init();
});
