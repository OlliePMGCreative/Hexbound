/* ═══════════════════════════════════════════════
   enemies.js — All enemy types for Area 1
   Skeleton, Ghost, Bat
   ═══════════════════════════════════════════════ */

const Enemies = (() => {

  let enemyList = [];

  // ── SPAWN HELPERS ──
  function spawnSkeleton(tx, ty) {
    return {
      type: 'skeleton',
      x: tx * Level.TILE,
      y: ty * Level.TILE - 30,
      width: 18, height: 30,
      vx: (Math.random() > 0.5 ? 1 : -1) * 0.6, // slower, more predictable
      vy: 0,
      onGround: false,
      facingRight: true,
      hp: 2,
      maxHp: 2,
      frame: 0,
      active: true,
      dying: false,
      dyingFrame: 0,
      patrolMin: Math.max(0, tx * Level.TILE - 96),
      patrolMax: tx * Level.TILE + 96,
      hurtTimer: 0,
    };
  }

  function spawnGhost(tx, ty) {
    return {
      type: 'ghost',
      x: tx * Level.TILE,
      y: ty * Level.TILE,
      width: 16, height: 20,
      vx: 0.8,
      vy: 0,
      hp: 1,
      maxHp: 1,
      frame: 0,
      active: true,
      dying: false,
      dyingFrame: 0,
      startX: tx * Level.TILE,
      startY: ty * Level.TILE,
      patrolRadius: 60,
      angle: 0,
      hurtTimer: 0,
    };
  }

  function spawnBat(tx, ty) {
    return {
      type: 'bat',
      x: tx * Level.TILE,
      y: ty * Level.TILE,
      width: 20, height: 12,
      vx: 1.2,
      vy: 0,
      hp: 1,
      maxHp: 1,
      frame: 0,
      active: true,
      dying: false,
      dyingFrame: 0,
      diveTimer: Math.floor(Math.random() * 120),
      diving: false,
      baseY: ty * Level.TILE,
      hurtTimer: 0,
    };
  }

  // ── DAMAGE ──
  function hitEnemy(enemy, damage) {
    if (enemy.dying) return false;
    enemy.hp -= damage;
    enemy.hurtTimer = 12;
    Audio.play('spellHit');
    if (enemy.hp <= 0) {
      enemy.dying = true;
      enemy.dyingFrame = 0;
      Player.addScore(100);
      Audio.play('enemyDie');
    }
    return true;
  }

  // ── AI UPDATES ──

  function updateSkeleton(e) {
    if (e.dying) {
      e.dyingFrame++;
      if (e.dyingFrame > 30) e.active = false;
      return;
    }

    e.frame++;
    if (e.hurtTimer > 0) e.hurtTimer--;

    // Gravity
    e.vy += 0.5;
    e.vy = Math.min(e.vy, 12);
    Level.resolveCollision(e);

    // Walk patrol
    if (e.onGround) {
      // Check edge detection (avoid walking off platforms)
      const aheadX = e.facingRight ? e.x + e.width + 2 : e.x - 2;
      const belowY = e.y + e.height + 2;
      const edgeAhead = !Level.isSolid(aheadX, belowY);
      const wallAhead = Level.isSolid(aheadX, e.y + e.height / 2);

      if (edgeAhead || wallAhead || e.x <= e.patrolMin || e.x >= e.patrolMax) {
        e.vx *= -1;
        e.facingRight = !e.facingRight;
      } else {
        e.vx = e.facingRight ? 0.6 : -0.6; // slow, predictable walk
      }
    }

    // Chase player when nearby (but slower than before)
    const p = Player.entity;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 100) {
      e.facingRight = dx > 0;
      e.vx = e.facingRight ? 1.1 : -1.1; // chase speed capped
    }

    // Damage player on contact
    if (rectsOverlap(e, p) && p.invincible === 0) {
      Player.takeDamage(1);
    }
  }

  function updateGhost(e) {
    if (e.dying) {
      e.dyingFrame++;
      if (e.dyingFrame > 25) e.active = false;
      return;
    }

    e.frame++;
    if (e.hurtTimer > 0) e.hurtTimer--;

    // Float in a figure-of-8 pattern
    e.angle += 0.025;
    e.x = e.startX + Math.cos(e.angle) * e.patrolRadius;
    e.y = e.startY + Math.sin(e.angle * 2) * 20;

    // Chase player when very close
    const p = Player.entity;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 80) {
      e.x += (dx / dist) * 1.5;
      e.y += (dy / dist) * 1.0;
    }

    // Damage player on contact
    if (rectsOverlap(e, p) && p.invincible === 0) {
      Player.takeDamage(1);
    }
  }

  function updateBat(e) {
    if (e.dying) {
      e.dyingFrame++;
      if (e.dyingFrame > 20) e.active = false;
      return;
    }

    e.frame++;
    if (e.hurtTimer > 0) e.hurtTimer--;
    e.diveTimer--;

    const p = Player.entity;

    if (e.diveTimer <= 0) {
      // Swoop towards player
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        e.x += (dx / dist) * 3;
        e.y += (dy / dist) * 2;
      }
      if (e.diveTimer < -60) {
        // Return to base
        e.y += (e.baseY - e.y) * 0.05;
        if (e.diveTimer < -90) {
          e.diveTimer = 90 + Math.floor(Math.random() * 60);
        }
      }
    } else {
      // Patrol horizontally
      e.x += e.vx;
      if (e.x < Level.camera.x || e.x > Level.camera.x + 900) e.vx *= -1;
    }

    // Damage player on contact
    if (rectsOverlap(e, p) && p.invincible === 0) {
      Player.takeDamage(1);
    }
  }

  // ── SPELL-BOLT → ENEMY HIT DETECTION ──
  function checkSpellCollisions() {
    const bolts = Player.entity.spellBolts;
    enemyList.forEach(enemy => {
      if (!enemy.active || enemy.dying) return;
      bolts.forEach(bolt => {
        if (!bolt.active) return;
        if (rectsOverlap(bolt, enemy)) {
          hitEnemy(enemy, 1);
          bolt.active = false;
        }
      });
    });
  }

  // ── RECT OVERLAP HELPER ──
  function rectsOverlap(a, b) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  // ── MAIN UPDATE ──
  function update() {
    enemyList.forEach(e => {
      if (!e.active) return;
      if (e.type === 'skeleton') updateSkeleton(e);
      if (e.type === 'ghost')    updateGhost(e);
      if (e.type === 'bat')      updateBat(e);
    });

    checkSpellCollisions();

    // Remove dead enemies
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

      // Only render if on screen
      if (dx < -64 || dx > 864 || dy < -64 || dy > 514) return;

      // Hurt flash
      if (e.hurtTimer > 0 && Math.floor(e.hurtTimer / 3) % 2 === 0) {
        ctx.globalAlpha = 0.3;
      }

      if (e.type === 'skeleton') {
        Sprites.drawSkeleton(ctx, dx, dy, e.frame, e.facingRight, e.dying);
      } else if (e.type === 'ghost') {
        ctx.globalAlpha = e.dying ? Math.max(0, 1 - e.dyingFrame / 25) : ctx.globalAlpha;
        Sprites.drawGhost(ctx, dx, dy, e.frame);
      } else if (e.type === 'bat') {
        Sprites.drawBat(ctx, dx, dy, e.frame);
      }

      ctx.globalAlpha = 1;

      // HP bar (show when hurt)
      if (e.hurtTimer > 0 && e.maxHp > 1) {
        drawHPBar(ctx, dx, dy, e.hp, e.maxHp, e.width);
      }
    });
  }

  function drawHPBar(ctx, x, y, hp, maxHp, width) {
    const barW = width;
    const barH = 3;
    ctx.fillStyle = '#1a1135';
    ctx.fillRect(x, y - 6, barW, barH);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(x, y - 6, (hp / maxHp) * barW, barH);
  }

  // ── INIT ──
  function init() {
    enemyList = [];
    const spawns = Level.getSpawns();
    spawns.enemies.forEach(s => {
      if (s.type === 'skeleton') enemyList.push(spawnSkeleton(s.tx, s.ty));
      if (s.type === 'ghost')    enemyList.push(spawnGhost(s.tx, s.ty));
      if (s.type === 'bat')      enemyList.push(spawnBat(s.tx, s.ty));
    });
  }

  return {
    init,
    update,
    render,
    getList() { return enemyList; }
  };
})();
