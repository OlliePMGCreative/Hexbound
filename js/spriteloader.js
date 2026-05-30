/* ═══════════════════════════════════════════════
   spriteloader.js — Image-based sprite system
   Loads all PNGs from assets/sprites/.
   If a file is missing, the procedural fallback
   in spritesheet.js is used automatically.
   ═══════════════════════════════════════════════ */

const SpriteLoader = (() => {

  // All sprite definitions. Edit path, fw, fh, frames to match your art.
  const MANIFEST = {
    // ── Player ──
    sorcerer_idle:   { path: 'assets/sprites/player/sorcerer_idle.png',   fw: 24, fh: 44, frames: 4 },
    sorcerer_walk:   { path: 'assets/sprites/player/sorcerer_walk.png',   fw: 24, fh: 44, frames: 6 },
    sorcerer_jump:   { path: 'assets/sprites/player/sorcerer_jump.png',   fw: 24, fh: 44, frames: 2 },
    sorcerer_cast:   { path: 'assets/sprites/player/sorcerer_cast.png',   fw: 24, fh: 44, frames: 3 },
    sorcerer_attack: { path: 'assets/sprites/player/sorcerer_attack.png', fw: 24, fh: 44, frames: 4 },
    sorcerer_hurt:   { path: 'assets/sprites/player/sorcerer_hurt.png',   fw: 24, fh: 44, frames: 2 },

    // ── Enemies ──
    skeleton_walk:   { path: 'assets/sprites/enemies/skeleton_walk.png',  fw: 16, fh: 28, frames: 6 },
    skeleton_rise:   { path: 'assets/sprites/enemies/skeleton_rise.png',  fw: 16, fh: 28, frames: 8 },
    skeleton_die:    { path: 'assets/sprites/enemies/skeleton_die.png',   fw: 16, fh: 28, frames: 4 },
    ghost_float:     { path: 'assets/sprites/enemies/ghost_float.png',    fw: 16, fh: 20, frames: 4 },
    bat_fly:         { path: 'assets/sprites/enemies/bat_fly.png',        fw: 20, fh: 12, frames: 4 },

    // ── Tiles (16×16 each; stone sheet has 3 variants side-by-side) ──
    tile_grass:      { path: 'assets/sprites/tiles/tile_grass.png',       fw: 16, fh: 16, frames: 1 },
    tile_stone:      { path: 'assets/sprites/tiles/tile_stone.png',       fw: 16, fh: 16, frames: 3 },
    tile_tombstone:  { path: 'assets/sprites/tiles/tombstone.png',        fw: 14, fh: 22, frames: 1 },
    tile_dead_tree:  { path: 'assets/sprites/tiles/dead_tree.png',        fw: 28, fh: 56, frames: 1 },

    // ── Background ──
    bg_sky:          { path: 'assets/sprites/background/sky.png',         fw: 480, fh: 270, frames: 1 },
    bg_moon:         { path: 'assets/sprites/background/moon.png',        fw: 96,  fh: 96,  frames: 1 },
    bg_silhouette:   { path: 'assets/sprites/background/silhouette.png',  fw: 480, fh: 120, frames: 1 },

    // ── UI ──
    ui_heart_full:   { path: 'assets/sprites/ui/heart_full.png',          fw: 12, fh: 10, frames: 1 },
    ui_heart_empty:  { path: 'assets/sprites/ui/heart_empty.png',         fw: 12, fh: 10, frames: 1 },
    ui_mana_full:    { path: 'assets/sprites/ui/mana_orb_full.png',       fw: 10, fh: 10, frames: 1 },
    ui_mana_empty:   { path: 'assets/sprites/ui/mana_orb_empty.png',      fw: 10, fh: 10, frames: 1 },
  };

  const loaded = {};
  let _ready = false;

  function load() {
    return new Promise(resolve => {
      const entries = Object.entries(MANIFEST);
      let done = 0;
      const total = entries.length;

      function tick() { done++; if (done >= total) { _ready = true; resolve(); } }

      entries.forEach(([key, spec]) => {
        const img = new Image();
        img.onload  = () => { loaded[key] = { img, ...spec }; tick(); };
        img.onerror = () => tick(); // missing = fall back to procedural
        img.src     = spec.path;
      });
    });
  }

  // Draw a frame from a loaded sprite sheet.
  // Returns true if the image was used, false if not available (caller should fall back).
  function draw(ctx, key, x, y, frame = 0, flipH = false, alpha = 1) {
    const s = loaded[key];
    if (!s) return false;

    const frameIdx = Math.floor(frame) % s.frames;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.imageSmoothingEnabled = false;
    if (flipH) { ctx.scale(-1, 1); x = -(x + s.fw); }
    ctx.drawImage(s.img, frameIdx * s.fw, 0, s.fw, s.fh, Math.floor(x), Math.floor(y), s.fw, s.fh);
    ctx.restore();
    return true;
  }

  // Draw a single tile variant from a multi-variant stone sheet
  function drawVariant(ctx, key, variantIndex, x, y) {
    const s = loaded[key];
    if (!s) return false;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(s.img, variantIndex * s.fw, 0, s.fw, s.fh, Math.floor(x), Math.floor(y), s.fw, s.fh);
    ctx.restore();
    return true;
  }

  return {
    load,
    draw,
    drawVariant,
    has(key) { return !!loaded[key]; },
    getManifest() { return MANIFEST; },
    isReady() { return _ready; },
  };
})();
