/* ═══════════════════════════════════════════════
   level.js — Flat graveyard approach
   Ground row is computed from canvas height so it
   always sits at ~72% down the screen (GBA feel).
   Camera Y is LOCKED (only horizontal scroll).
   ═══════════════════════════════════════════════ */

const Level = (() => {

  const TILE = 16;

  // Computed at load() from actual canvas size
  let GROUND_ROW = 28;
  let MAP_ROWS    = 45;
  const MAP_COLS  = 150;

  // ── CAMERA ──
  const camera = {
    x: 0, y: 0,
    width: 800, height: 500,
    get mapPixelWidth()  { return MAP_COLS * TILE; },
    get mapPixelHeight() { return MAP_ROWS * TILE; },

    follow(entity) {
      // Horizontal only — Y is locked
      this.targetX  = entity.x - this.width * 0.38 + entity.width / 2;
      this.targetX  = Math.max(0, Math.min(this.targetX, this.mapPixelWidth - this.width));
      this.x       += (this.targetX - this.x) * 0.10;
      this.y        = 0; // always locked
    },
  };

  // ── MAP DATA ──
  let map = null;

  function buildMap() {
    // Make sure there are enough rows
    MAP_ROWS = Math.ceil(camera.height / TILE) + 10;
    // Ground sits at 70% of canvas height
    GROUND_ROW = Math.round((camera.height * 0.70) / TILE);

    const m = Array.from({ length: MAP_ROWS }, () => Array(MAP_COLS).fill(0));

    // Ground: grass top row, then solid stone fill to bottom
    for (let c = 0; c < MAP_COLS; c++) {
      m[GROUND_ROW][c] = 2;          // grass top
      for (let r = GROUND_ROW + 1; r < MAP_ROWS; r++) {
        m[r][c] = 1;                  // stone fill — creates depth
      }
    }

    return m;
  }

  // Tombstones with linked skeleton spawns
  let tombstones = []; // { tx, triggered, spawned }
  let spawns     = null;

  function buildSpawns() {
    // Tombstones every ~8 tiles from col 20 onward
    const stones = [];
    const stoneCols = [20, 28, 36, 44, 52, 60, 70, 80, 90, 100, 110, 125, 138];
    stoneCols.forEach(c => {
      stones.push({
        tx: c,
        ty: GROUND_ROW - 1,
        triggered: false,
        label: 'RIP',
      });
    });
    tombstones = stones;

    return {
      playerStart:  { x: 4 * TILE, y: (GROUND_ROW - 3) * TILE },
      enemies:      [],          // all driven by tombstone triggers
      civilians: [
        {
          tx: 55, ty: GROUND_ROW - 1,
          name: 'FARMER ALDRIC',
          dialogue: [
            "Thank the stars! A living soul!",
            "The necromancer rose three moons past.",
            "My whole village turned to bone overnight.",
            "Stop him before he reaches the city gates.",
            "Take this mana shard — may it aid your quest.",
          ],
          powerup: 'mana',
        },
        {
          tx: 115, ty: GROUND_ROW - 1,
          name: "MILLER'S DAUGHTER",
          dialogue: [
            "You came through the graveyard? How?!",
            "My father never came back from those ruins.",
            "There is a passage behind the crumbled chapel.",
            "Here — take my healing potion.",
          ],
          powerup: 'health',
        },
      ],
      levelExit: { tx: 144, ty: GROUND_ROW - 1 },
    };
  }

  // ── GBA PALETTE ──
  const PAL = {
    skyDeep:     '#0d0820',
    skyMid:      '#140c2e',
    skyHorizon:  '#1e1042',
    grassTop:    '#1a7a28',
    grassMid:    '#14621e',
    grassShadow: '#0d4414',
    stoneLight:  '#6e637a',
    stoneMid:    '#504660',
    stoneDark:   '#362c44',
    stoneDeep:   '#241c30',
    mortar:      '#2a2038',
    outline:     '#0a0614',
  };

  // ── TILE DRAWING ──
  function drawGrassTile(ctx, px, py) {
    // Stone body (makes the "face" of the ground slab)
    ctx.fillStyle = PAL.stoneMid;
    ctx.fillRect(px, py, TILE, TILE);
    // Stone face highlight (top of face, just under grass)
    ctx.fillStyle = PAL.stoneLight;
    ctx.fillRect(px + 1, py + 5, TILE - 2, 3);

    // Grass cap
    ctx.fillStyle = PAL.grassShadow;
    ctx.fillRect(px, py, TILE, 4);
    ctx.fillStyle = PAL.grassMid;
    ctx.fillRect(px, py, TILE, 3);
    ctx.fillStyle = PAL.grassTop;
    ctx.fillRect(px, py, TILE, 2);
    // Grass tufts (pixel spikes)
    ctx.fillStyle = '#22aa30';
    for (let gx = px + 1; gx < px + TILE - 1; gx += 4) {
      ctx.fillRect(gx, py - 2, 2, 3);
    }
    // Outline
    ctx.fillStyle = PAL.outline;
    ctx.fillRect(px, py - 2, TILE, 1);
  }

  function drawStoneTile(ctx, px, py, row) {
    // Base fill
    ctx.fillStyle = PAL.stoneMid;
    ctx.fillRect(px, py, TILE, TILE);

    // Brick pattern — alternating offset
    const brickH   = 6;
    const offset   = ((row % 2) === 0) ? 8 : 0;
    ctx.fillStyle  = PAL.mortar;
    // Horizontal mortar
    ctx.fillRect(px, py + brickH - 1, TILE, 1);
    // Vertical mortar (offset per row)
    ctx.fillRect(px + offset,     py, 1, brickH);
    ctx.fillRect(px + offset + 8, py, 1, brickH);

    // Side highlight (left edge lighter)
    ctx.fillStyle = PAL.stoneLight;
    ctx.fillRect(px + 1, py + 1, 1, brickH - 2);

    // Deeper rows get darker
    const depthDarken = Math.min(row * 0.04, 0.5);
    if (depthDarken > 0) {
      ctx.fillStyle = `rgba(0,0,0,${depthDarken})`;
      ctx.fillRect(px, py, TILE, TILE);
    }
  }

  // ── BACKGROUND ──
  function drawBackground(ctx) {
    const W = camera.width, H = camera.height;

    // Sky gradient — GBA limited palette approach
    ctx.fillStyle = PAL.skyDeep;
    ctx.fillRect(0, 0, W, H * 0.5);
    ctx.fillStyle = PAL.skyMid;
    ctx.fillRect(0, H * 0.3, W, H * 0.3);
    ctx.fillStyle = PAL.skyHorizon;
    ctx.fillRect(0, H * 0.55, W, H * 0.15);

    // Moon
    drawMoon(ctx, W, H);

    // Parallax silhouette trees (drawn with rectangles)
    drawSilhouetteTrees(ctx, W, H);

    // Stars
    drawStars(ctx, Math.floor(camera.x * 0.1), W, H);
  }

  function drawMoon(ctx, W, H) {
    const cx = W * 0.75, cy = H * 0.22, r = Math.min(W, H) * 0.09;
    // Glow
    ctx.fillStyle = 'rgba(232,100,240,0.12)';
    ctx.beginPath(); ctx.arc(cx, cy, r * 2.5, 0, Math.PI * 2); ctx.fill();
    // Moon disc
    ctx.fillStyle = '#e060e8';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    // Craters (pixel-style)
    ctx.fillStyle = 'rgba(120,40,160,0.5)';
    [[cx-r*0.3, cy-r*0.25, r*0.18],[cx+r*0.25, cy+r*0.3, r*0.14]].forEach(([mx,my,mr]) => {
      ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
    });
    // Outline
    ctx.fillStyle = 'rgba(80,0,100,0.3)';
    ctx.beginPath(); ctx.arc(cx, cy, r + 1, 0, Math.PI * 2); ctx.stroke?.();
  }

  function drawSilhouetteTrees(ctx, W, H) {
    const camX  = Math.floor(camera.x);
    const baseY = GROUND_ROW * TILE; // pixel y of ground

    // A few tree silhouettes at parallax 0.3
    const treePositions = [80, 200, 380, 520, 700, 900, 1100, 1350, 1600, 1900];
    treePositions.forEach(worldX => {
      const sx = worldX - camX * 0.3;
      if (sx < -80 || sx > W + 80) return;
      const screenY = baseY - camera.y;
      // Trunk
      ctx.fillStyle = '#160c28';
      ctx.fillRect(sx - 3, screenY - 60, 7, 60);
      // Bare branches (pixel rects)
      ctx.fillRect(sx - 20, screenY - 55, 40, 3);
      ctx.fillRect(sx - 14, screenY - 45, 28, 3);
      ctx.fillRect(sx - 8,  screenY - 35, 16, 3);
    });
  }

  function drawStars(ctx, scrollX, W, H) {
    const STARS = [
      [40,12],[120,35],[200,8],[290,50],[370,20],[450,6],
      [530,42],[610,18],[700,35],[780,8],[860,48],[940,15],
      [80,65],[250,58],[430,72],[640,55],[820,62],[1020,28],
    ];
    ctx.fillStyle = 'rgba(220,210,255,0.8)';
    STARS.forEach(([sx,sy]) => {
      const dx = (sx - scrollX % W + W * 2) % W;
      if (sy < H * 0.6) ctx.fillRect(dx, sy, 2, 2);
    });
  }

  // ── DECORATIONS ──
  function drawDecorations(ctx) {
    const camX = Math.floor(camera.x);
    tombstones.forEach(s => {
      const sx = s.tx * TILE - camX;
      if (sx < -32 || sx > camera.width + 32) return;
      const sy = s.ty * TILE - camera.y;
      drawTombstone(ctx, sx, sy, s.label);
    });

    // A few dead trees in the background
    const deadTrees = [15, 35, 65, 85, 105, 130];
    deadTrees.forEach(tx => {
      const sx = tx * TILE - camX;
      if (sx < -40 || sx > camera.width + 40) return;
      const sy = GROUND_ROW * TILE - camera.y;
      Sprites.drawDeadTree(ctx, sx, sy);
    });
  }

  function drawTombstone(ctx, x, y, label) {
    // Body
    ctx.fillStyle = PAL.outline;
    ctx.fillRect(x - 1, y - 17, 16, 17);
    ctx.fillStyle = '#4a4060';
    ctx.fillRect(x, y - 16, 14, 15);
    // Rounded top (arch)
    ctx.fillStyle = '#4a4060';
    ctx.fillRect(x + 3, y - 20, 8, 5);
    ctx.fillStyle = PAL.outline;
    ctx.fillRect(x + 2, y - 21, 10, 2);
    // Text
    ctx.fillStyle = '#2a2040';
    ctx.font = '4px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + 7, y - 9);
  }

  // Exit portal
  let portalFrame = 0;
  function drawExitPortal(ctx, x, y) {
    portalFrame++;
    const pulse = Math.sin(portalFrame * 0.08) * 0.4 + 0.6;
    ctx.fillStyle = `rgba(180,50,220,${pulse * 0.8})`;
    ctx.fillRect(x + 4, y - 36, 16, 36);
    ctx.fillStyle = `rgba(240,200,255,${pulse * 0.6})`;
    ctx.fillRect(x + 8, y - 32, 8, 28);
    const sw = portalFrame * 0.15;
    ctx.fillStyle = `rgba(255,240,255,${pulse * 0.9})`;
    for (let i = 0; i < 6; i++) {
      const a = sw + (i * Math.PI / 3);
      ctx.fillRect(x + 12 + Math.cos(a) * 10, y - 18 + Math.sin(a) * 10, 3, 3);
    }
    ctx.fillStyle = 'rgba(244,240,255,0.7)';
    ctx.font = '5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('EXIT', x + 12, y + 5);
  }

  // ── RENDER ──
  function render(ctx) {
    if (!map) return;
    const camX = Math.floor(camera.x);
    const camY = Math.floor(camera.y); // always 0

    drawBackground(ctx);
    drawDecorations(ctx);

    const c0 = Math.max(0, Math.floor(camX / TILE));
    const c1 = Math.min(MAP_COLS - 1, Math.ceil((camX + camera.width) / TILE));
    const r0 = Math.max(0, Math.floor(camY / TILE));
    const r1 = Math.min(MAP_ROWS - 1, Math.ceil((camY + camera.height) / TILE));

    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const t = map[r][c];
        if (!t) continue;
        const px = c * TILE - camX;
        const py = r * TILE - camY;
        if (t === 2) drawGrassTile(ctx, px, py);
        else         drawStoneTile(ctx, px, py, r - GROUND_ROW);
      }
    }

    // Bedrock fill (below last tile row — ensures no gaps on tall screens)
    const mapBottomY = MAP_ROWS * TILE - camY;
    if (mapBottomY < camera.height) {
      ctx.fillStyle = PAL.stoneDeep;
      ctx.fillRect(0, mapBottomY, camera.width, camera.height - mapBottomY);
    }

    // Exit portal
    if (spawns) {
      const ex = spawns.levelExit.tx * TILE - camX;
      const ey = spawns.levelExit.ty * TILE - camY;
      drawExitPortal(ctx, ex, ey);
    }
  }

  // ── COLLISION ──
  function getTile(col, row) {
    if (!map) return 0;
    if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) return 1;
    return map[row][col];
  }

  function isSolid(px, py) {
    return getTile(Math.floor(px / TILE), Math.floor(py / TILE)) !== 0;
  }

  function resolveCollision(entity) {
    const { width, height } = entity;
    entity.x += entity.vx;
    if (entity.vx > 0) {
      if (isSolid(entity.x + width, entity.y + 2) || isSolid(entity.x + width, entity.y + height - 2)) {
        entity.x = Math.floor((entity.x + width) / TILE) * TILE - width; entity.vx = 0;
      }
    } else if (entity.vx < 0) {
      if (isSolid(entity.x, entity.y + 2) || isSolid(entity.x, entity.y + height - 2)) {
        entity.x = Math.ceil(entity.x / TILE) * TILE; entity.vx = 0;
      }
    }
    entity.onGround = false;
    entity.y += entity.vy;
    if (entity.vy > 0) {
      if (isSolid(entity.x + 2, entity.y + height) || isSolid(entity.x + width - 2, entity.y + height)) {
        entity.y = Math.floor((entity.y + height) / TILE) * TILE - height;
        entity.vy = 0; entity.onGround = true;
      }
    } else if (entity.vy < 0) {
      if (isSolid(entity.x + 2, entity.y) || isSolid(entity.x + width - 2, entity.y)) {
        entity.y = Math.ceil(entity.y / TILE) * TILE; entity.vy = 0;
      }
    }
  }

  function load() {
    map = buildMap();
    spawns = buildSpawns();
    camera.x = 0;
    camera.y = 0;
    portalFrame = 0;
  }

  return {
    TILE, camera, load, render, resolveCollision, isSolid,
    getSpawns()     { return spawns; },
    getTombstones() { return tombstones; },
    getGroundRow()  { return GROUND_ROW; },
    getMapWidth()   { return MAP_COLS * TILE; },
    getMapHeight()  { return MAP_ROWS * TILE; },
  };
})();
