/* ═══════════════════════════════════════════════
   enemies.js — Tombstone-triggered enemy spawns
   Skeletons rise when player walks past tombstones
   ═══════════════════════════════════════════════ */

const Enemies = (() => {

  let enemyList = [];
  const RISE_FRAMES = 40;
  const TRIGGER_DIST = 120; // px ahead of player to trigger

  // ── SPAWN FACTORY ──
  function makeSkeleton(worldX, worldY) {
    return {
      type: 'skeleton',
      x: worldX, y: worldY,
      width: 16, height: 28,
      vx: 0, vy: 0,
      onGround: false,
      facingRight: false, // faces player (will be set on spawn)
      hp: 2, maxHp: 2,
      frame: 0,
      active: true,
      dying: false, dyingFrame: 0,
      hurtTimer: 0,
      // Spawn rise
      spawned: false,
      spawning: false,
      spawnFrame: 0,
      spawnBaseY: worldY,   // feet position (ground level)
      patrolMin: worldX - 80,
      patrolMax: worldX + 80,
    };
  }

  // ── TOMBSTONE TRIGGER CHECK ──
  function checkTombstoneTriggers() {
    const p = Level.getTombstones();
    if (!p) return;
    const player = Player.entity;
    const groundY = Level.getGroundRow() * Level.TILE;

    p.forEach(stone => {
      if (stone.triggered) return;
      const stoneWorldX = stone.tx * Level.TILE;
      // Trigger when player walks within range ahead of tombstone
      if (player.x + player.width + TRIGGER_DIST >= stoneWorldX) {
        stone.triggered = true;
        // Spawn skeleton rising from this tombstone's feet
        const sk = makeSkeleton(stoneWorldX, groundY - 28);
        sk.spawnBaseY  = groundY; // feet at ground
        sk.spawning    = true;
        sk.spawnFrame  = 0;
        sk.facingRight = player.x < stoneWorldX;
        // Start fully underground
        sk.y = groundY;
        enemyList.push(sk);
      }
    });
  }

  // ── RISE ANIMATION ──
  function updateSpawning(e) {
    e.spawnFrame++;
    const progress = Math.min(1, e.spawnFrame / RISE_FRAMES);
    // Emerges upward from ground
    e.y = e.spawnBaseY - e.height * progress;
    if (progress >= 1) {
      e.spawning = false;
      e.spawned  = true;
      e.y        = e.spawnBaseY - e.height;
    }
  }

  // ── SKELETON AI ──
  function updateSkeleton(e) {
    if (e.dying) { e.dyingFrame++; if (e.dyingFrame > 30) e.active = false; return; }
    e.frame++;
    if (e.hurtTimer > 0) e.hurtTimer--;

    // Gravity
    e.vy += 0.5; e.vy = Math.min(e.vy, 12);
    Level.resolveCollision(e);

    // Walk / edge detection
    if (e.onGround) {
      const aheadX  = e.facingRight ? e.x + e.width + 2 : e.x - 2;
      const belowY  = e.y + e.height + 2;
      const edge    = !Level.isSolid(aheadX, belowY);
      const wall    =  Level.isSolid(aheadX, e.y + e.height / 2);

      if (edge || wall || e.x <= e.patrolMin || e.x >= e.patrolMax) {
        e.vx *= -1; e.facingRight = !e.facingRight;
      } else {
        e.vx = e.facingRight ? 0.6 : -0.6;
      }
    }

    // Chase player when close
    const p = Player.entity;
    const dx = p.x - e.x, dy = p.y - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 120) { e.facingRight = dx > 0; e.vx = e.facingRight ? 1.1 : -1.1; }

    if (rectsOverlap(e, p) && p.invincible === 0) Player.takeDamage(1);
  }

  // ── SPELL BOLT COLLISIONS ──
  function checkSpellCollisions() {
    Player.entity.spellBolts.forEach(bolt => {
      if (!bolt.active) return;
      enemyList.forEach(enemy => {
        if (!enemy.active || enemy.dying || !enemy.spawned) return;
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
    checkTombstoneTriggers();

    enemyList.forEach(e => {
      if (!e.active) return;
      if (e.spawning) { updateSpawning(e); return; }
      if (!e.spawned) return;
      if (e.type === 'skeleton') updateSkeleton(e);
    });

    checkSpellCollisions();
    enemyList = enemyList.filter(e => e.active);
  }

  // ── RENDER ──
  function render(ctx) {
    const camX = Math.floor(Level.camera.x);
    const camY = Math.floor(Level.camera.y);
    const W = Level.camera.width, H = Level.camera.height;
    const groundY = Level.getGroundRow() * Level.TILE;

    enemyList.forEach(e => {
      if (!e.active) return;
      const dx = Math.floor(e.x - camX);
      const dy = Math.floor(e.y - camY);
      if (dx < -60 || dx > W + 60) return;

      ctx.save();

      // Clip rising skeleton to ground level (emerges from soil)
      if (e.spawning) {
        const groundScreenY = groundY - camY;
        ctx.beginPath();
        ctx.rect(dx - 4, 0, e.width + 8, groundScreenY);
        ctx.clip();
        // Soil disturbance particles
        const prog = e.spawnFrame / 40;
        ctx.fillStyle = '#2a1a0a';
        for (let i = 0; i < 5; i++) {
          const ox = Math.sin(e.spawnFrame * 0.4 + i * 1.2) * 10;
          ctx.fillRect(dx + ox, groundScreenY - 6, 3, 3);
        }
        // Purple bone glow
        ctx.fillStyle = `rgba(180,80,220,${0.4 * prog})`;
        ctx.fillRect(dx - 2, groundScreenY - 8, e.width + 4, 8);
      }

      if (e.hurtTimer > 0 && Math.floor(e.hurtTimer / 3) % 2 === 0) ctx.globalAlpha = 0.25;
      Sprites.drawSkeleton(ctx, dx, dy, e.frame, e.facingRight, e.dying);
      ctx.globalAlpha = 1;

      // HP bar on hurt
      if (e.hurtTimer > 0 && e.maxHp > 1) {
        ctx.fillStyle = '#1a0020'; ctx.fillRect(dx, dy - 6, e.width, 3);
        ctx.fillStyle = '#cc2020'; ctx.fillRect(dx, dy - 6, (e.hp / e.maxHp) * e.width, 3);
      }

      ctx.restore();
    });
  }

  // ── INIT ──
  function init() {
    enemyList = [];
    // Enemies are all spawned via tombstone triggers now
  }

  return {
    init, update, render,
    getList() { return enemyList; },
  };
})();
