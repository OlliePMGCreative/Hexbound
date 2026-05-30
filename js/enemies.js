/* ═══════════════════════════════════════════════
   enemies.js — Enemy types with spawn-trigger system
   Enemies rise from the ground when player approaches
   ═══════════════════════════════════════════════ */

const Enemies = (() => {

  let enemyList = [];

  const SPAWN_RISE_FRAMES = 45; // frames for rise animation

  // ── SPAWN HELPERS ──
  // spawnTriggerX: camera.x at which enemy starts rising
  function mkBase(extra) {
    return Object.assign({
      active: true, dying: false, dyingFrame: 0,
      frame: 0, hurtTimer: 0,
      // Spawn system
      spawned: false,      // true when fully risen & active
      spawning: false,     // true while rise animation plays
      spawnFrame: 0,       // 0..SPAWN_RISE_FRAMES
      spawnTriggerX: 0,    // set per-enemy
      spawnGroundY: 0,     // y position of ground (feet)
    }, extra);
  }

  function spawnSkeleton(tx, ty, triggerTileX) {
    const groundY = ty * Level.TILE;
    return mkBase({
      type: 'skeleton',
      x: tx * Level.TILE, y: groundY,
      width: 18, height: 30,
      vx: 0.6, vy: 0, onGround: false,
      facingRight: true, hp: 2, maxHp: 2,
      patrolMin: Math.max(0, tx * Level.TILE - 96),
      patrolMax: tx * Level.TILE + 96,
      spawnTriggerX: (triggerTileX ?? tx) * Level.TILE,
      spawnGroundY:  groundY,
    });
  }

  function spawnGhost(tx, ty, triggerTileX) {
    return mkBase({
      type: 'ghost',
      x: tx * Level.TILE, y: ty * Level.TILE,
      width: 16, height: 20, vx: 0.8, vy: 0,
      hp: 1, maxHp: 1,
      startX: tx * Level.TILE, startY: ty * Level.TILE,
      patrolRadius: 60, angle: 0,
      spawnTriggerX: (triggerTileX ?? tx) * Level.TILE,
      spawnGroundY:  ty * Level.TILE,
      spawned: true, // ghosts materialise, don't rise
      spawnFrame: SPAWN_RISE_FRAMES,
    });
  }

  function spawnBat(tx, ty, triggerTileX) {
    return mkBase({
      type: 'bat',
      x: tx * Level.TILE, y: ty * Level.TILE,
      width: 20, height: 12, vx: 1.2, vy: 0,
      hp: 1, maxHp: 1,
      diveTimer: Math.floor(Math.random() * 120),
      baseY: ty * Level.TILE,
      spawnTriggerX: (triggerTileX ?? tx) * Level.TILE,
      spawnGroundY:  ty * Level.TILE,
      spawned: true, // bats appear, don't rise
      spawnFrame: SPAWN_RISE_FRAMES,
    });
  }

  // ── SPAWN TRIGGER CHECK ──
  function checkSpawnTriggers() {
    const camRight = Level.camera.x + Level.camera.width * 0.75;
    enemyList.forEach(e => {
      if (e.spawned || e.spawning) return;
      if (camRight >= e.spawnTriggerX) {
        e.spawning  = true;
        e.spawnFrame = 0;
        // Start underground (hidden)
        if (e.type === 'skeleton') {
          e.y = e.spawnGroundY + 2; // ground level feet
        }
        // Ghost/bat pop in with fade
        if (e.type === 'ghost' || e.type === 'bat') {
          e.spawning = false;
          e.spawned  = true;
        }
      }
    });
  }

  // ── RISE ANIMATION ──
  function updateSpawning(e) {
    e.spawnFrame++;
    // Rise: move y upward from underground
    const progress = e.spawnFrame / SPAWN_RISE_FRAMES;
    const riseAmt  = e.height * progress; // emerges by its own height
    e.y = e.spawnGroundY - (e.height * progress);

    if (e.spawnFrame >= SPAWN_RISE_FRAMES) {
      e.spawning = false;
      e.spawned  = true;
      e.y = e.spawnGroundY - e.height;
    }
  }

  // ── AI ──
  function updateSkeleton(e) {
    if (e.dying) { e.dyingFrame++; if (e.dyingFrame > 30) e.active = false; return; }
    e.frame++;
    if (e.hurtTimer > 0) e.hurtTimer--;

    e.vy += 0.5;
    e.vy  = Math.min(e.vy, 12);
    Level.resolveCollision(e);

    if (e.onGround) {
      const aheadX   = e.facingRight ? e.x + e.width + 2 : e.x - 2;
      const belowY   = e.y + e.height + 2;
      const edgeAhead = !Level.isSolid(aheadX, belowY);
      const wallAhead =  Level.isSolid(aheadX, e.y + e.height / 2);

      if (edgeAhead || wallAhead || e.x <= e.patrolMin || e.x >= e.patrolMax) {
        e.vx *= -1; e.facingRight = !e.facingRight;
      } else {
        e.vx = e.facingRight ? 0.6 : -0.6;
      }
    }

    // Chase player when close
    const p  = Player.entity;
    const dx = p.x - e.x, dy = p.y - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 100) { e.facingRight = dx > 0; e.vx = e.facingRight ? 1.1 : -1.1; }

    if (rectsOverlap(e, p) && p.invincible === 0) Player.takeDamage(1);
  }

  function updateGhost(e) {
    if (e.dying) { e.dyingFrame++; if (e.dyingFrame > 25) e.active = false; return; }
    e.frame++;
    if (e.hurtTimer > 0) e.hurtTimer--;

    e.angle += 0.025;
    e.x = e.startX + Math.cos(e.angle) * e.patrolRadius;
    e.y = e.startY + Math.sin(e.angle * 2) * 20;

    const p = Player.entity;
    const dx = p.x - e.x, dy = p.y - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 80) { e.x += (dx / dist) * 1.5; e.y += (dy / dist) * 1.0; }

    if (rectsOverlap(e, p) && p.invincible === 0) Player.takeDamage(1);
  }

  function updateBat(e) {
    if (e.dying) { e.dyingFrame++; if (e.dyingFrame > 20) e.active = false; return; }
    e.frame++; if (e.hurtTimer > 0) e.hurtTimer--;
    e.diveTimer--;

    const p = Player.entity;
    if (e.diveTimer <= 0) {
      const dx = p.x - e.x, dy = p.y - e.y;
      const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      e.x += (dx / dist) * 2.5; e.y += (dy / dist) * 1.8;
      if (e.diveTimer < -60) {
        e.y += (e.baseY - e.y) * 0.05;
        if (e.diveTimer < -90) e.diveTimer = 90 + Math.floor(Math.random() * 60);
      }
    } else {
      e.x += e.vx;
      const camR = Level.camera.x + Level.camera.width;
      if (e.x < Level.camera.x - 60 || e.x > camR + 60) e.vx *= -1;
    }
    if (rectsOverlap(e, p) && p.invincible === 0) Player.takeDamage(1);
  }

  function checkSpellCollisions() {
    const bolts = Player.entity.spellBolts;
    enemyList.forEach(enemy => {
      if (!enemy.active || enemy.dying || !enemy.spawned) return;
      bolts.forEach(bolt => {
        if (!bolt.active) return;
        if (rectsOverlap(bolt, enemy)) {
          enemy.hp--; enemy.hurtTimer = 12;
          Audio.play('spellHit');
          if (enemy.hp <= 0) {
            enemy.dying = true; enemy.dyingFrame = 0;
            Player.addScore(100); Audio.play('enemyDie');
          }
          bolt.active = false;
        }
      });
    });
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.width  && a.x + a.width  > b.x &&
           a.y < b.y + b.height && a.y + a.height > b.y;
  }

  // ── UPDATE ──
  function update() {
    checkSpawnTriggers();

    enemyList.forEach(e => {
      if (!e.active) return;

      // Rise animation
      if (e.spawning) { updateSpawning(e); return; }

      // Not yet spawned (waiting for trigger)
      if (!e.spawned) return;

      if (e.type === 'skeleton') updateSkeleton(e);
      if (e.type === 'ghost')    updateGhost(e);
      if (e.type === 'bat')      updateBat(e);
    });

    checkSpellCollisions();
    enemyList = enemyList.filter(e => e.active);
  }

  // ── RENDER ──
  function render(ctx) {
    const camX = Math.floor(Level.camera.x);
    const camY = Math.floor(Level.camera.y);

    enemyList.forEach(e => {
      if (!e.active) return;
      const dx = Math.floor(e.x - camX);
      const dy = Math.floor(e.y - camY);

      // Cull off-screen
      const W = Level.camera.width, H = Level.camera.height;
      if (dx < -80 || dx > W + 80 || dy < -80 || dy > H + 80) return;

      ctx.save();

      // Rising: clip to ground level (emerges upward)
      if (e.spawning) {
        const clipY = Math.floor(e.spawnGroundY - camY);
        ctx.beginPath();
        ctx.rect(dx - 4, clipY - e.height, e.width + 8, e.height);
        ctx.clip();
        // Dirt particle effect (simple coloured dots)
        const prog = e.spawnFrame / SPAWN_RISE_FRAMES;
        ctx.fillStyle = 'rgba(80,50,20,0.6)';
        for (let i = 0; i < 4; i++) {
          const ox = (i * 7 - 10) + Math.sin(e.spawnFrame * 0.3 + i) * 4;
          ctx.fillRect(dx + ox, clipY - 4, 4, 4);
        }
        ctx.fillStyle = `rgba(232,121,249,${0.3 * prog})`;
        ctx.fillRect(dx, clipY - 8, e.width, 8);
      }

      // Ghost fade-in when just spawned
      if (e.type === 'ghost' && e.frame < 30) ctx.globalAlpha = e.frame / 30;
      if (e.hurtTimer > 0 && Math.floor(e.hurtTimer / 3) % 2 === 0) ctx.globalAlpha = 0.3;

      if (e.type === 'skeleton') {
        Sprites.drawSkeleton(ctx, dx, dy, e.frame, e.facingRight, e.dying);
      } else if (e.type === 'ghost') {
        if (e.dying) ctx.globalAlpha = Math.max(0, 1 - e.dyingFrame / 25);
        Sprites.drawGhost(ctx, dx, dy, e.frame);
      } else if (e.type === 'bat') {
        Sprites.drawBat(ctx, dx, dy, e.frame);
      }

      ctx.globalAlpha = 1;

      if (e.hurtTimer > 0 && e.maxHp > 1) drawHPBar(ctx, dx, dy, e.hp, e.maxHp, e.width);

      ctx.restore();
    });
  }

  function drawHPBar(ctx, x, y, hp, maxHp, width) {
    ctx.fillStyle = '#1a1135'; ctx.fillRect(x, y - 6, width, 3);
    ctx.fillStyle = '#ef4444'; ctx.fillRect(x, y - 6, (hp / maxHp) * width, 3);
  }

  // ── INIT ──
  function init() {
    enemyList = [];
    const spawns = Level.getSpawns();
    spawns.enemies.forEach(s => {
      // triggerTile = where camera needs to be to trigger spawn
      if (s.type === 'skeleton') enemyList.push(spawnSkeleton(s.tx, s.ty, s.triggerTile));
      if (s.type === 'ghost')    enemyList.push(spawnGhost(s.tx, s.ty, s.triggerTile));
      if (s.type === 'bat')      enemyList.push(spawnBat(s.tx, s.ty, s.triggerTile));
    });
  }

  return { init, update, render, getList() { return enemyList; } };
})();
