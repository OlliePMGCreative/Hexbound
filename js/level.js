/* ═══════════════════════════════════════════════
   level.js — Level data, tilemap, parallax, camera
   ═══════════════════════════════════════════════ */

const Level = (() => {

  const TILE = 16; // pixels per tile on the logical canvas

  // ── PARALLAX BACKGROUND LAYERS ──
  // We load the generated image and also draw procedural layers on top
  const bgImage = new Image();
  bgImage.src = 'assets/images/area1_bg.png';

  // ── AREA 1 MAP DATA ──
  // 0 = empty, 1 = stone tile, 2 = grass tile (top of platform)
  // Map is 80 tiles wide × 25 tiles tall
  // Each row is a string; character positions match tile columns
  const AREA1_MAP_ROWS = 25;
  const AREA1_MAP_COLS = 120; // wider map for larger screens

  // Build the map as a 2D array
  function buildArea1Map() {
    const map = Array.from({ length: AREA1_MAP_ROWS }, () => Array(AREA1_MAP_COLS).fill(0));

    // Ground floor — row 22-24
    for (let x = 0; x < AREA1_MAP_COLS; x++) {
      map[22][x] = 2; // grass
      map[23][x] = 1;
      map[24][x] = 1;
    }

    // Floating platforms (row, startCol, length)
    const platforms = [
      [18, 6,  6],
      [15, 14, 5],
      [17, 22, 7],
      [13, 32, 5],
      [17, 38, 4],
      [14, 44, 6],
      [16, 52, 5],
      [13, 58, 4],
      [15, 64, 5],
      [12, 70, 6],
      [17, 74, 6],
      [14, 82, 5],
      [16, 90, 7],
      [13, 98, 4],
      [15, 104, 6],
      [17, 112, 5],
    ];

    platforms.forEach(([row, startX, len]) => {
      for (let x = startX; x < startX + len; x++) {
        if (x < AREA1_MAP_COLS) {
          map[row][x] = 2;
          map[row + 1][x] = 1;
          map[row + 2][x] = 1;
        }
      }
    });

    // Left starting platform (cols 0-12)
    for (let x = 0; x < 12; x++) {
      map[20][x] = 2;
      map[21][x] = 1;
    }

    return map;
  }

  // ── DECORATIONS ──
  function buildArea1Decorations() {
    return [
      // { type, x, y (in tile units), label }
      { type: 'tombstone', tx: 2,  ty: 21, label: 'RIP' },
      { type: 'tombstone', tx: 5,  ty: 21, label: 'RIP' },
      { type: 'tombstone', tx: 11, ty: 22, label: 'RIP' },
      { type: 'tombstone', tx: 20, ty: 22, label: 'RIP' },
      { type: 'tombstone', tx: 30, ty: 22, label: 'RIP' },
      { type: 'tombstone', tx: 40, ty: 22, label: 'RIP' },
      { type: 'tombstone', tx: 55, ty: 22, label: 'RIP' },
      { type: 'deadtree',  tx: 8,  ty: 18 },
      { type: 'deadtree',  tx: 18, ty: 18 },
      { type: 'deadtree',  tx: 35, ty: 18 },
      { type: 'deadtree',  tx: 50, ty: 18 },
      { type: 'deadtree',  tx: 65, ty: 18 },
    ];
  }

  // ── SPAWNS ──
  function buildArea1Spawns() {
    return {
      playerStart: { x: 2 * TILE, y: 17 * TILE }, // pixel position
      enemies: [
        { type: 'skeleton', tx: 15, ty: 21 },
        { type: 'skeleton', tx: 25, ty: 22 },
        { type: 'skeleton', tx: 42, ty: 22 },
        { type: 'skeleton', tx: 55, ty: 22 },
        { type: 'skeleton', tx: 68, ty: 22 },
        { type: 'ghost',    tx: 18, ty: 16 },
        { type: 'ghost',    tx: 45, ty: 15 },
        { type: 'bat',      tx: 22, ty: 12 },
        { type: 'bat',      tx: 38, ty: 13 },
        { type: 'bat',      tx: 60, ty: 12 },
      ],
      civilians: [
        {
          tx: 34, ty: 21,
          name: 'FARMER ALDRIC',
          dialogue: [
            "Thank the stars! I thought I'd never see a living soul again...",
            "The necromancer... Malachar they call him. He rose from the crypt three moons past.",
            "My whole village... turned to bone and shadow overnight.",
            "Please, brave one. Stop him before he reaches the city gates.",
            "Take this mana shard. May it strengthen your spells."
          ],
          powerup: 'mana'
        },
        {
          tx: 80, ty: 22,
          name: "MILLER'S DAUGHTER",
          dialogue: [
            "You... you came from the graveyard path? How are you still alive?!",
            "My father tried to fight them. He never came back.",
            "There is a secret passage behind the crumbled chapel wall ahead.",
            "The castle gate opens only when all graveyard spirits are at rest.",
            "Here — take my healing potion. My father would have wanted that."
          ],
          powerup: 'health'
        }
      ],
      levelExit: { tx: 117, ty: 22 }
    };
  }

  // ── STATE ──
  let map = null;
  let decorations = [];
  let spawns = null;

  // ── CAMERA ──
  const camera = {
    x: 0, y: 0,
    targetX: 0, targetY: 0,
    width: 800,
    height: 500,
    get mapPixelWidth()  { return AREA1_MAP_COLS * TILE; },
    get mapPixelHeight() { return AREA1_MAP_ROWS * TILE; },

    follow(entity) {
      // Horizontal follow — centre player horizontally
      this.targetX = entity.x - this.width / 2 + entity.width / 2;
      this.targetX = Math.max(0, Math.min(this.targetX, this.mapPixelWidth - this.width));
      this.x += (this.targetX - this.x) * 0.12;

      // Vertical follow — keep player in lower 60% of screen
      this.targetY = entity.y - this.height * 0.5;
      this.targetY = Math.max(0, Math.min(this.targetY, this.mapPixelHeight - this.height));
      this.y += (this.targetY - this.y) * 0.10;
    }
  };

  // ── PARALLAX ──
  let parallaxOffsets = [0, 0, 0];

  function drawBackground(ctx, camX) {
    const W = camera.width;
    const H = camera.height;

    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0d0a1e');
    grad.addColorStop(0.5, '#130e2a');
    grad.addColorStop(1, '#1a1135');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Layer 0 — distant BG image (very slow parallax, 0.1x)
    if (bgImage.complete && bgImage.naturalWidth > 0) {
      const parallaxX = -(camX * 0.05) % W;
      ctx.globalAlpha = 0.6;
      ctx.drawImage(bgImage, parallaxX, 0, W, H);
      if (parallaxX < 0) ctx.drawImage(bgImage, parallaxX + W, 0, W, H);
      ctx.globalAlpha = 1;
    }

    // Layer 1 — mid stars (0.2x)
    drawStars(ctx, camX * 0.2);

    // Layer 2 — moon (fixed in upper center)
    drawMoon(ctx);

    // Fog at ground level
    drawFog(ctx, camX);
  }

  function drawStars(ctx, scrollX) {
    // Static seeded stars
    const STAR_SEED = [
      [50, 20], [120, 45], [200, 15], [280, 60], [340, 30],
      [410, 10], [480, 50], [550, 25], [620, 40], [700, 15],
      [760, 55], [820, 20], [100, 80], [300, 70], [500, 85],
    ];
    ctx.fillStyle = 'rgba(244,240,255,0.7)';
    STAR_SEED.forEach(([sx, sy]) => {
      const drawX = (sx - scrollX % camera.width + camera.width) % camera.width;
      ctx.fillRect(drawX, sy, 2, 2);
    });
  }

  function drawMoon(ctx) {
    const cx = camera.width * 0.65;
    const cy = 80;
    const r = 48;
    // Glow
    const grd = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 2);
    grd.addColorStop(0, 'rgba(232,121,249,0.25)');
    grd.addColorStop(1, 'rgba(232,121,249,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 2, 0, Math.PI * 2);
    ctx.fill();
    // Moon disc
    ctx.fillStyle = '#e879f9';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    // Moon craters
    ctx.fillStyle = 'rgba(180,80,220,0.4)';
    [[cx-15, cy-10, 10], [cx+10, cy+15, 8], [cx+5, cy-20, 6]].forEach(([mx, my, mr]) => {
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawFog(ctx, camX) {
    const grad = ctx.createLinearGradient(0, camera.height - 80, 0, camera.height);
    grad.addColorStop(0, 'rgba(19,14,42,0)');
    grad.addColorStop(1, 'rgba(13,10,30,0.6)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, camera.height - 80, camera.width, 80);
  }

  // ── RENDER ──
  function render(ctx) {
    if (!map) return; // guard: level not loaded yet

    const camX = Math.floor(camera.x);
    const camY = Math.floor(camera.y);

    drawBackground(ctx, camX);

    // Determine visible tile columns and rows
    const startCol = Math.max(0, Math.floor(camX / TILE));
    const endCol   = Math.min(AREA1_MAP_COLS - 1, Math.ceil((camX + camera.width) / TILE));
    const startRow = Math.max(0, Math.floor(camY / TILE));
    const endRow   = Math.min(AREA1_MAP_ROWS - 1, Math.ceil((camY + camera.height) / TILE));

    // Draw tiles
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const tile = map[row][col];
        if (tile === 0) continue;
        const px = col * TILE - camX;
        const py = row * TILE - camY;
        if (tile === 2) {
          Sprites.drawGrassTile(ctx, px, py);
        } else if (tile === 1) {
          Sprites.drawStoneTile(ctx, px, py, 0);
        }
      }
    }

    // Draw decorations
    decorations.forEach(dec => {
      const px = dec.tx * TILE - camX;
      const py = dec.ty * TILE - camY;
      if (px < -64 || px > camera.width + 64) return;
      if (py < -64 || py > camera.height + 64) return;
      if (dec.type === 'tombstone') Sprites.drawTombstone(ctx, px, py, dec.label);
      if (dec.type === 'deadtree')  Sprites.drawDeadTree(ctx, px, py);
    });

    // Draw level exit portal
    if (spawns) {
      const ex = spawns.levelExit.tx * TILE - camX;
      const ey = spawns.levelExit.ty * TILE - camY;
      drawExitPortal(ctx, ex, ey);
    }
  }

  let portalFrame = 0;
  function drawExitPortal(ctx, x, y) {
    portalFrame++;
    const pulse = Math.sin(portalFrame * 0.08) * 0.4 + 0.6;
    // Glow
    const grd = ctx.createRadialGradient(x + 12, y - 16, 4, x + 12, y - 16, 28);
    grd.addColorStop(0, `rgba(217,70,239,${pulse * 0.7})`);
    grd.addColorStop(1, 'rgba(217,70,239,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(x - 16, y - 44, 56, 56);
    // Portal arch
    ctx.fillStyle = `rgba(217,70,239,${pulse * 0.9})`;
    ctx.fillRect(x + 4,  y - 32, 16, 32);
    ctx.fillStyle = `rgba(244,240,255,${pulse * 0.6})`;
    ctx.fillRect(x + 8,  y - 28, 8, 24);
    // Swirl effect (simple rotating pixels)
    ctx.fillStyle = `rgba(244,240,255,${pulse * 0.8})`;
    const swirl = portalFrame * 0.15;
    for (let i = 0; i < 6; i++) {
      const a = swirl + (i * Math.PI / 3);
      ctx.fillRect(
        x + 12 + Math.cos(a) * 10,
        y - 16 + Math.sin(a) * 10,
        3, 3
      );
    }
    // Label
    ctx.fillStyle = 'rgba(244,240,255,0.7)';
    ctx.font = '5px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', x + 12, y + 6);
  }

  // ── COLLISION ──
  function getTile(col, row) {
    if (!map) return 0;
    if (row < 0 || row >= AREA1_MAP_ROWS || col < 0 || col >= AREA1_MAP_COLS) return 1;
    return map[row][col];
  }

  function isSolid(pixelX, pixelY) {
    const col = Math.floor(pixelX / TILE);
    const row = Math.floor(pixelY / TILE);
    return getTile(col, row) !== 0;
  }

  // Rectangle collision with map
  function resolveCollision(entity) {
    const { width, height } = entity;

    // Horizontal movement
    entity.x += entity.vx;
    if (entity.vx > 0) {
      if (isSolid(entity.x + width, entity.y + 2) || isSolid(entity.x + width, entity.y + height - 2)) {
        entity.x = Math.floor((entity.x + width) / TILE) * TILE - width;
        entity.vx = 0;
      }
    } else if (entity.vx < 0) {
      if (isSolid(entity.x, entity.y + 2) || isSolid(entity.x, entity.y + height - 2)) {
        entity.x = Math.ceil(entity.x / TILE) * TILE;
        entity.vx = 0;
      }
    }

    // Vertical movement
    entity.onGround = false;
    entity.y += entity.vy;
    if (entity.vy > 0) {
      if (isSolid(entity.x + 2, entity.y + height) || isSolid(entity.x + width - 2, entity.y + height)) {
        entity.y = Math.floor((entity.y + height) / TILE) * TILE - height;
        entity.vy = 0;
        entity.onGround = true;
      }
    } else if (entity.vy < 0) {
      if (isSolid(entity.x + 2, entity.y) || isSolid(entity.x + width - 2, entity.y)) {
        entity.y = Math.ceil(entity.y / TILE) * TILE;
        entity.vy = 0;
      }
    }
  }

  // ── PUBLIC API ──
  function load(areaId) {
    map = buildArea1Map();
    decorations = buildArea1Decorations();
    spawns = buildArea1Spawns();
    camera.x = 0;
    camera.y = 0;
  }

  return {
    TILE,
    camera,
    load,
    render,
    resolveCollision,
    isSolid,
    getSpawns() { return spawns; },
    getMapWidth()  { return AREA1_MAP_COLS * TILE; },
    getMapHeight() { return AREA1_MAP_ROWS * TILE; }
  };
})();
