/* ═══════════════════════════════════════════════
   level.js — Tilemap, camera, parallax, collision
   Area 1: The Graveyard Approach
   ═══════════════════════════════════════════════ */

const Level = (() => {

  const TILE = 16;
  const AREA1_ROWS = 25;
  const AREA1_COLS = 120;

  // Background image
  const bgImage = new Image();
  bgImage.src = 'assets/images/area1_bg.png';

  /* ────────────────────────────────────────────
     MAP BUILDER
     Tile codes:  0=empty  1=stone  2=grass top
                  3=wall (same as stone but drawn darker)
  ──────────────────────────────────────────── */
  function buildArea1Map() {
    const m = Array.from({ length: AREA1_ROWS }, () => Array(AREA1_COLS).fill(0));

    const solid = (row, col, type = 1) => { if (row >= 0 && row < AREA1_ROWS && col >= 0 && col < AREA1_COLS) m[row][col] = type; };
    const hline = (row, c1, c2, top = 2, fill = 1) => {
      for (let c = c1; c <= c2; c++) { solid(row, c, top); solid(row + 1, c, fill); solid(row + 2, c, fill); }
    };
    const vwall = (col, r1, r2) => { for (let r = r1; r <= r2; r++) solid(r, col, 1); };

    // ── GROUND FLOOR (rows 22-24, full width) ──
    for (let c = 0; c < AREA1_COLS; c++) {
      m[22][c] = 2; m[23][c] = 1; m[24][c] = 1;
    }

    // ── ZONE 1: SAFE INTRO (cols 0-20) ──
    // Small step up at col 10 to teach jumping
    hline(20, 8, 13);        // low platform (step up)
    hline(18, 16, 21);       // second step

    // ── ZONE 2: FIRST ENCOUNTER (cols 21-45) ──
    // Terrain dips then rises — graveyard grounds
    hline(17, 22, 29);       // elevated ground section
    hline(20, 30, 35);       // dip back down
    hline(16, 36, 43);       // elevated ruin slab

    // Stone wall pillar (teaches player to jump over)
    vwall(31, 19, 22);       // short wall
    vwall(32, 19, 22);

    // ── ZONE 3: RUINED WALLS (cols 44-70) ──
    hline(14, 44, 52);       // high ruin platform
    hline(17, 53, 60);       // mid platform
    hline(20, 61, 68);       // low connecting platform

    // Stone column obstacles
    vwall(47, 11, 14);       // tall column
    vwall(48, 11, 14);
    vwall(56, 14, 17);       // medium column
    vwall(57, 14, 17);

    // Arch bridge (platform with gap beneath)
    for (let c = 62; c <= 69; c++) { m[20][c] = 2; m[21][c] = 1; }  // walkable arch

    // ── ZONE 4: DENSE GRAVEYARD (cols 69-95) ──
    hline(13, 69, 77);       // high section
    hline(16, 78, 86);       // mid section
    hline(19, 87, 95);       // back to near-ground

    // Stair steps connecting zones
    for (let i = 0; i < 5; i++) hline(20 - i, 88 + i, 88 + i);

    vwall(72, 10, 13);
    vwall(73, 10, 13);
    vwall(83, 13, 16);
    vwall(84, 13, 16);

    // ── ZONE 5: CASTLE APPROACH (cols 95-120) ──
    // Stepped ascent toward the exit
    hline(18, 95, 102);
    hline(15, 103, 110);
    hline(12, 111, 119);

    // Castle gate wall (solid pillar pair at end)
    vwall(113, 9, 12);
    vwall(114, 9, 12);
    vwall(117, 9, 12);
    vwall(118, 9, 12);

    return m;
  }

  function buildArea1Decorations() {
    return [
      // Zone 1 — safe, quiet
      { type: 'tombstone', tx: 3,  ty: 21, label: 'RIP' },
      { type: 'tombstone', tx: 6,  ty: 21, label: 'RIP' },
      { type: 'deadtree',  tx: 14, ty: 18 },

      // Zone 2 — first graveyard
      { type: 'tombstone', tx: 22, ty: 16, label: 'RIP' },
      { type: 'tombstone', tx: 26, ty: 21, label: 'RIP' },
      { type: 'tombstone', tx: 33, ty: 19, label: 'RIP' },
      { type: 'deadtree',  tx: 38, ty: 15 },

      // Zone 3 — ruins
      { type: 'tombstone', tx: 44, ty: 13, label: 'RIP' },
      { type: 'tombstone', tx: 50, ty: 13, label: 'RIP' },
      { type: 'deadtree',  tx: 53, ty: 16 },
      { type: 'tombstone', tx: 62, ty: 19, label: 'RIP' },

      // Zone 4
      { type: 'deadtree',  tx: 71, ty: 12 },
      { type: 'tombstone', tx: 76, ty: 12, label: 'RIP' },
      { type: 'tombstone', tx: 82, ty: 15, label: 'RIP' },
      { type: 'deadtree',  tx: 90, ty: 18 },

      // Zone 5 — castle approach
      { type: 'tombstone', tx: 97,  ty: 17, label: 'RIP' },
      { type: 'deadtree',  tx: 106, ty: 14 },
      { type: 'tombstone', tx: 110, ty: 11, label: 'RIP' },
    ];
  }

  function buildArea1Spawns() {
    return {
      playerStart: { x: 2 * TILE, y: 19 * TILE },
      enemies: [
        // Zone 2 — first skeleton (triggerTile = how far camera needs to scroll)
        { type: 'skeleton', tx: 24, ty: 16, triggerTile: 15 },
        { type: 'skeleton', tx: 33, ty: 21, triggerTile: 22 },

        // Zone 3 — ghost + skeleton
        { type: 'skeleton', tx: 46, ty: 13, triggerTile: 36 },
        { type: 'ghost',    tx: 50, ty: 12, triggerTile: 40 },
        { type: 'bat',      tx: 55, ty: 10, triggerTile: 42 },

        // Zone 4 — mix of enemies
        { type: 'skeleton', tx: 71, ty: 12, triggerTile: 58 },
        { type: 'bat',      tx: 74, ty:  9, triggerTile: 60 },
        { type: 'skeleton', tx: 80, ty: 15, triggerTile: 66 },
        { type: 'ghost',    tx: 84, ty: 14, triggerTile: 70 },
        { type: 'skeleton', tx: 91, ty: 18, triggerTile: 76 },

        // Zone 5 — approach
        { type: 'skeleton', tx: 98,  ty: 17, triggerTile: 84 },
        { type: 'bat',      tx: 102, ty: 12, triggerTile: 88 },
        { type: 'skeleton', tx: 108, ty: 14, triggerTile: 92 },
        { type: 'ghost',    tx: 112, ty: 11, triggerTile: 96 },
      ],
      civilians: [
        {
          tx: 40, ty: 15,
          name: 'FARMER ALDRIC',
          dialogue: [
            "Thank the stars! A living soul!",
            "The necromancer Malachar rose three moons past.",
            "My whole village turned to bone overnight.",
            "Stop him before he reaches the city gates.",
            "Take this mana shard — may it aid your quest.",
          ],
          powerup: 'mana',
        },
        {
          tx: 88, ty: 18,
          name: "MILLER'S DAUGHTER",
          dialogue: [
            "You came through the graveyard? How?!",
            "My father tried to fight them. He never returned.",
            "There is a passage behind the crumbled chapel ahead.",
            "The castle gate opens when all spirits are at rest.",
            "Here — take my healing potion.",
          ],
          powerup: 'health',
        },
      ],
      levelExit: { tx: 116, ty: 11 },
    };
  }

  // ── STATE ──
  let map = null, decorations = [], spawns = null;

  // ── CAMERA ──
  const camera = {
    x: 0, y: 0, targetX: 0, targetY: 0,
    width: 800, height: 500,
    get mapPixelWidth()  { return AREA1_COLS * TILE; },
    get mapPixelHeight() { return AREA1_ROWS * TILE; },
    follow(entity) {
      this.targetX = entity.x - this.width  * 0.4 + entity.width  / 2;
      this.targetX = Math.max(0, Math.min(this.targetX, this.mapPixelWidth - this.width));
      this.x += (this.targetX - this.x) * 0.12;

      this.targetY = entity.y - this.height * 0.5;
      this.targetY = Math.max(0, Math.min(this.targetY, this.mapPixelHeight - this.height));
      this.y += (this.targetY - this.y) * 0.10;
    },
  };

  // ── BACKGROUND ──
  function drawBackground(ctx, camX, camY) {
    const W = camera.width, H = camera.height;

    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0a0618');
    grad.addColorStop(0.5, '#130e2a');
    grad.addColorStop(1, '#1a1135');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // BG image (slow parallax)
    if (bgImage.complete && bgImage.naturalWidth > 0) {
      const px = -(camX * 0.05) % W;
      ctx.globalAlpha = 0.55;
      ctx.drawImage(bgImage, px, 0, W, H);
      if (px < 0) ctx.drawImage(bgImage, px + W, 0, W, H);
      ctx.globalAlpha = 1;
    }

    drawStars(ctx, camX * 0.15);
    drawMoon(ctx);
    drawFog(ctx);
  }

  function drawStars(ctx, scrollX) {
    const STARS = [
      [50,15],[130,40],[210,12],[290,55],[360,25],[430,8],
      [500,45],[575,22],[650,38],[730,10],[795,52],[860,18],
      [100,75],[300,65],[520,80],[720,60],[900,30],[980,70],
    ];
    ctx.fillStyle = 'rgba(244,240,255,0.75)';
    STARS.forEach(([sx, sy]) => {
      const dx = (sx - scrollX % camera.width + camera.width * 2) % camera.width;
      ctx.fillRect(dx, sy, 2, 2);
    });
  }

  function drawMoon(ctx) {
    const cx = camera.width * 0.72, cy = 70, r = 52;
    const grd = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 2.2);
    grd.addColorStop(0, 'rgba(232,121,249,0.22)');
    grd.addColorStop(1, 'rgba(232,121,249,0)');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(cx, cy, r * 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e879f9';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(180,80,220,0.4)';
    [[cx - 18, cy - 12, 11], [cx + 12, cy + 16, 9], [cx + 6, cy - 22, 7]].forEach(([mx, my, mr]) => {
      ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
    });
  }

  function drawFog(ctx) {
    const grad = ctx.createLinearGradient(0, camera.height - 90, 0, camera.height);
    grad.addColorStop(0, 'rgba(19,14,42,0)');
    grad.addColorStop(1, 'rgba(13,10,30,0.65)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, camera.height - 90, camera.width, 90);
  }

  // ── TILE RENDERING HELPERS ──
  const STONE_DARK  = '#2a2040';
  const STONE_MID   = '#362c55';
  const STONE_LIGHT = '#463870';
  const GRASS_TOP   = '#1a5c30';
  const GRASS_EDGE  = '#22c55e';

  function drawTile(ctx, px, py, type) {
    if (type === 0) return;
    // Stone fill
    ctx.fillStyle = STONE_MID;
    ctx.fillRect(px, py, TILE, TILE);
    // Brick pattern (alternating offset lines)
    const brickH = 4;
    for (let by = 0; by < TILE; by += brickH) {
      const offset = (Math.floor((py + by) / brickH) % 2) * 8;
      ctx.fillStyle = STONE_DARK;
      ctx.fillRect(px + offset,     py + by, 1, brickH - 1);
      ctx.fillRect(px + offset + 8, py + by, 1, brickH - 1);
    }
    // Highlight edge
    ctx.fillStyle = STONE_LIGHT;
    ctx.fillRect(px, py, TILE, 1);
    ctx.fillRect(px, py, 1, TILE);
  }

  function drawGrassTile(ctx, px, py) {
    // Stone body
    drawTile(ctx, px, py, 1);
    // Grass cap
    ctx.fillStyle = GRASS_TOP;
    ctx.fillRect(px, py, TILE, 4);
    ctx.fillStyle = GRASS_EDGE;
    ctx.fillRect(px, py, TILE, 2);
    // Grass tufts
    ctx.fillStyle = '#16a34a';
    for (let gx = px + 2; gx < px + TILE - 2; gx += 5) {
      ctx.fillRect(gx, py - 1, 2, 3);
    }
  }

  // ── RENDER ──
  let portalFrame = 0;

  function render(ctx) {
    if (!map) return;
    const camX = Math.floor(camera.x);
    const camY = Math.floor(camera.y);

    drawBackground(ctx, camX, camY);

    const c0 = Math.max(0, Math.floor(camX / TILE));
    const c1 = Math.min(AREA1_COLS - 1, Math.ceil((camX + camera.width) / TILE));
    const r0 = Math.max(0, Math.floor(camY / TILE));
    const r1 = Math.min(AREA1_ROWS - 1, Math.ceil((camY + camera.height) / TILE));

    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const t = map[r][c];
        if (t === 0) continue;
        const px = c * TILE - camX, py = r * TILE - camY;
        if (t === 2) drawGrassTile(ctx, px, py);
        else         drawTile(ctx, px, py, t);
      }
    }

    // Decorations
    decorations.forEach(d => {
      const px = d.tx * TILE - camX, py = d.ty * TILE - camY;
      if (px < -64 || px > camera.width + 64 || py < -64 || py > camera.height + 64) return;
      if (d.type === 'tombstone') Sprites.drawTombstone(ctx, px, py, d.label);
      if (d.type === 'deadtree')  Sprites.drawDeadTree(ctx, px, py);
    });

    // Exit portal
    if (spawns) {
      const ex = spawns.levelExit.tx * TILE - camX;
      const ey = spawns.levelExit.ty * TILE - camY;
      drawExitPortal(ctx, ex, ey);
    }
  }

  function drawExitPortal(ctx, x, y) {
    portalFrame++;
    const pulse = Math.sin(portalFrame * 0.08) * 0.4 + 0.6;
    const grd = ctx.createRadialGradient(x + 12, y - 16, 4, x + 12, y - 16, 28);
    grd.addColorStop(0, `rgba(217,70,239,${pulse * 0.7})`);
    grd.addColorStop(1, 'rgba(217,70,239,0)');
    ctx.fillStyle = grd; ctx.fillRect(x - 16, y - 44, 56, 56);
    ctx.fillStyle = `rgba(217,70,239,${pulse * 0.9})`;
    ctx.fillRect(x + 4, y - 32, 16, 32);
    ctx.fillStyle = `rgba(244,240,255,${pulse * 0.6})`;
    ctx.fillRect(x + 8, y - 28, 8, 24);
    const sw = portalFrame * 0.15;
    ctx.fillStyle = `rgba(244,240,255,${pulse * 0.8})`;
    for (let i = 0; i < 6; i++) {
      const a = sw + (i * Math.PI / 3);
      ctx.fillRect(x + 12 + Math.cos(a) * 10, y - 16 + Math.sin(a) * 10, 3, 3);
    }
    ctx.fillStyle = 'rgba(244,240,255,0.7)';
    ctx.font = '5px "Press Start 2P",monospace';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', x + 12, y + 6);
  }

  // ── COLLISION ──
  function getTile(col, row) {
    if (!map) return 0;
    if (row < 0 || row >= AREA1_ROWS || col < 0 || col >= AREA1_COLS) return 1;
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

  // ── LOAD ──
  function load(areaId) {
    map = buildArea1Map();
    decorations = buildArea1Decorations();
    spawns = buildArea1Spawns();
    camera.x = 0; camera.y = 0;
    portalFrame = 0;
  }

  return {
    TILE, camera, load, render, resolveCollision, isSolid,
    getSpawns()    { return spawns; },
    getMapWidth()  { return AREA1_COLS * TILE; },
    getMapHeight() { return AREA1_ROWS * TILE; },
  };
})();
