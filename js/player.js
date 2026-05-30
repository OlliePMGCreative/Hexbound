/* ═══════════════════════════════════════════════
   player.js — Physics, controls, melee + fireball
   Controls: WASD/arrows move, Space/W jump,
             E = staff melee, R = fireball, F = interact
   ═══════════════════════════════════════════════ */

const Player = (() => {

  // ── CONSTANTS ──
  const GRAVITY         = 0.45;
  const JUMP_FORCE      = -10.5;
  const DBL_JUMP_FORCE  = -8.5;
  const MOVE_SPEED      = 4.0;
  const FRICTION        = 0.80;
  const MAX_FALL        = 14;

  const SPELL_COOLDOWN  = 14;
  const SPELL_SPEED     = 14;
  const SPELL_LIFETIME  = 120;
  const INVINCIBLE_DUR  = 100;
  const MANA_REGEN      = 90;

  // Melee (E key — staff swing)
  const MELEE_DUR          = 20;  // total frames of swing
  const MELEE_COOLDOWN_DUR = 28;  // frames before can swing again
  const MELEE_RANGE        = 48;  // hitbox width
  const MELEE_HEIGHT       = 36;  // hitbox height
  const MELEE_HIT_START    = 5;   // frame hitbox activates
  const MELEE_HIT_END      = 17;  // frame hitbox deactivates

  const entity = {
    x: 32, y: 200,
    width: 24, height: 42,
    vx: 0, vy: 0,
    onGround: false,
    facingRight: true,
    state: 'idle',
    frame: 0,
    lives: 3, maxLives: 3,
    mana: 5,  maxMana: 5,
    score: 0,
    invincible: 0,
    spellTimer: 0,
    jumpsLeft: 2,
    spellBolts: [],
    active: true,
    civiliansSaved: 0,
    totalCivilians: 2,
    manaRegenTimer: 0,
    // melee
    meleeTimer: 0,
    meleeCooldown: 0,
    meleeAttFrame: 0,
    meleeHitLanded: false,
  };

  const keys = {
    left: false, right: false, jump: false,
    spell: false, melee: false, interact: false,
    jumpConsumed: false, spellConsumed: false, meleeConsumed: false,
  };

  let inputBound = false;

  function bindInput() {
    if (inputBound) return;
    inputBound = true;

    const keyMap = {
      'ArrowLeft':  'left',  'KeyA': 'left',
      'ArrowRight': 'right', 'KeyD': 'right',
      'ArrowUp':    'jump',  'KeyW': 'jump', 'Space': 'jump',
      'KeyR':       'spell',    // R = fireball
      'KeyE':       'melee',    // E = staff swing
      'KeyF':       'interact', 'Enter': 'interact', 'ArrowDown': 'interact',
    };

    window.addEventListener('keydown', e => {
      const a = keyMap[e.code];
      if (a) { e.preventDefault(); keys[a] = true; }
      if (e.code === 'Escape' || e.code === 'KeyM') {
        e.preventDefault();
        if (Game.getState() === Game.STATE.PLAYING || Game.getState() === Game.STATE.PAUSED) {
          Game.togglePause();
        }
      }
    });

    window.addEventListener('keyup', e => {
      const a = keyMap[e.code];
      if (!a) return;
      keys[a] = false;
      if (a === 'jump')  keys.jumpConsumed  = false;
      if (a === 'spell') keys.spellConsumed = false;
      if (a === 'melee') keys.meleeConsumed = false;
    });

    // Mobile
    const mob = {
      'btn-left':'left', 'btn-right':'right', 'btn-jump':'jump',
      'btn-spell':'spell', 'btn-interact':'interact',
    };
    Object.entries(mob).forEach(([id, action]) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('touchstart', e => { e.preventDefault(); keys[action] = true; }, { passive: false });
      el.addEventListener('touchend',   e => {
        e.preventDefault(); keys[action] = false;
        if (action === 'jump')  keys.jumpConsumed  = false;
        if (action === 'spell') keys.spellConsumed = false;
      }, { passive: false });
      el.addEventListener('mousedown', () => keys[action] = true);
      el.addEventListener('mouseup',   () => { keys[action] = false; });
    });
  }

  // ── FIREBALL ──
  function fireSpell() {
    if (entity.mana <= 0) return;
    entity.mana--;
    entity.spellTimer = SPELL_COOLDOWN;
    entity.state = 'cast';
    Audio.play('spell');
    entity.spellBolts.push({
      x: entity.facingRight ? entity.x + entity.width : entity.x - 16,
      y: entity.y + 14,
      vx: entity.facingRight ? SPELL_SPEED : -SPELL_SPEED,
      vy: 0, width: 16, height: 8,
      frame: 0, facingRight: entity.facingRight,
      active: true, lifetime: 0,
    });
  }

  function updateSpellBolts() {
    entity.spellBolts = entity.spellBolts.filter(b => {
      b.x += b.vx; b.lifetime++; b.frame++;
      if (Level.isSolid(b.x + (b.facingRight ? b.width : 0), b.y + 4) || b.lifetime > SPELL_LIFETIME) return false;
      return b.active;
    });
  }

  // ── STAFF MELEE ──
  function startMelee() {
    if (entity.meleeTimer > 0 || entity.meleeCooldown > 0) return;
    entity.meleeTimer    = MELEE_DUR;
    entity.meleeHitLanded = false;
    entity.state         = 'attack';
    Audio.play('menuSelect');
  }

  function updateMelee() {
    if (entity.meleeTimer > 0) {
      entity.meleeTimer--;
      entity.meleeAttFrame = MELEE_DUR - entity.meleeTimer;

      if (entity.meleeAttFrame >= MELEE_HIT_START &&
          entity.meleeAttFrame <= MELEE_HIT_END &&
          !entity.meleeHitLanded) {
        checkMeleeHit();
      }
      if (entity.meleeTimer === 0) entity.meleeCooldown = MELEE_COOLDOWN_DUR;
    }
    if (entity.meleeCooldown > 0) entity.meleeCooldown--;
  }

  function checkMeleeHit() {
    const hx = entity.facingRight ? entity.x + entity.width : entity.x - MELEE_RANGE;
    const hitBox = { x: hx, y: entity.y + 4, width: MELEE_RANGE, height: MELEE_HEIGHT };

    let hit = false;
    Enemies.getList().forEach(enemy => {
      if (!enemy.active || enemy.dying || !enemy.spawned) return;
      if (hitBox.x < enemy.x + enemy.width  &&
          hitBox.x + hitBox.width  > enemy.x &&
          hitBox.y < enemy.y + enemy.height  &&
          hitBox.y + hitBox.height > enemy.y) {
        enemy.hp--;
        enemy.hurtTimer = 12;
        const knockDir = entity.facingRight ? 1 : -1;
        enemy.vx = knockDir * 2.5;
        if (enemy.hp <= 0) {
          enemy.dying = true; enemy.dyingFrame = 0;
          Player.addScore(100); Audio.play('enemyDie');
        } else {
          Audio.play('spellHit');
        }
        hit = true;
      }
    });

    if (hit) {
      entity.meleeHitLanded = true;
      Game.screenShake(3, 4);
    }
  }

  // ── UPDATE ──
  function update() {
    if (!entity.active) return;

    entity.frame++;
    if (entity.invincible > 0) entity.invincible--;
    if (entity.spellTimer  > 0) entity.spellTimer--;

    entity.manaRegenTimer++;
    if (entity.manaRegenTimer >= MANA_REGEN && entity.mana < entity.maxMana) {
      entity.mana++; entity.manaRegenTimer = 0;
    }

    const attacking = entity.meleeTimer > 0;

    // Horizontal — halved during melee
    if (keys.left)  { entity.vx -= attacking ? 0.4 : 0.8; entity.facingRight = false; }
    if (keys.right) { entity.vx += attacking ? 0.4 : 0.8; entity.facingRight = true; }
    entity.vx *= FRICTION;
    entity.vx = Math.max(-MOVE_SPEED, Math.min(MOVE_SPEED, entity.vx));

    // Jump
    if (keys.jump && !keys.jumpConsumed && entity.jumpsLeft > 0) {
      if (entity.jumpsLeft === 2 && entity.onGround) {
        entity.vy = JUMP_FORCE; entity.jumpsLeft = 1; Audio.play('jump');
      } else if (entity.jumpsLeft === 1 && !entity.onGround) {
        entity.vy = DBL_JUMP_FORCE; entity.jumpsLeft = 0; Audio.play('jump');
      }
      keys.jumpConsumed = true;
    }

    // E — melee
    if (keys.melee && !keys.meleeConsumed) { startMelee(); keys.meleeConsumed = true; }

    // R — fireball
    if (keys.spell && !keys.spellConsumed && entity.spellTimer === 0 && !attacking) {
      fireSpell(); keys.spellConsumed = true;
    }

    updateMelee();

    // Gravity & collision
    entity.vy += GRAVITY;
    entity.vy  = Math.min(entity.vy, MAX_FALL);
    const wasOnGround = entity.onGround;
    Level.resolveCollision(entity);
    if (!wasOnGround && entity.onGround) { entity.jumpsLeft = 2; Audio.play('land'); }

    if (entity.y > Level.getMapHeight() + 64) { takeDamage(1); reset(); }
    entity.x = Math.max(0, Math.min(entity.x, Level.getMapWidth() - entity.width));

    // State machine
    if (entity.meleeTimer > 0) {
      entity.state = 'attack';
    } else if (entity.onGround) {
      if (Math.abs(entity.vx) > 0.4) entity.state = 'walk';
      else if (entity.spellTimer > SPELL_COOLDOWN - 6) entity.state = 'cast';
      else entity.state = 'idle';
    } else {
      entity.state = entity.vy < 0 ? 'jump' : 'fall';
    }

    updateSpellBolts();

    // Stomp on enemies (jump on top to kill)
    if (entity.vy > 1 && !entity.onGround) {
      const foot = { x: entity.x + 4, y: entity.y + entity.height - 4, width: entity.width - 8, height: 10 };
      Enemies.getList().forEach(enemy => {
        if (!enemy.active || enemy.dying || !enemy.spawned || enemy.type === 'ghost') return;
        if (foot.x < enemy.x + enemy.width && foot.x + foot.width > enemy.x &&
            foot.y < enemy.y + 8 && foot.y + foot.height > enemy.y) {
          enemy.hp = 0; enemy.dying = true; enemy.dyingFrame = 0;
          Player.addScore(150); Audio.play('enemyDie');
          entity.vy = -8;
          entity.jumpsLeft = Math.max(entity.jumpsLeft, 1);
          Game.screenShake(3, 5);
        }
      });
    }

    Level.camera.follow(entity);
  }

  // ── DAMAGE ──
  function takeDamage(amount) {
    if (entity.invincible > 0) return;
    entity.lives -= amount;
    entity.invincible = INVINCIBLE_DUR;
    entity.state = 'hurt';
    Audio.play('hurt');
    entity.vy = -3.5;
    entity.vx = entity.facingRight ? -2 : 2;
    Game.screenShake(5, 7);
    if (entity.lives <= 0) { entity.lives = 0; entity.active = false; Game.triggerGameOver(); }
  }

  function gainMana(amount)   { entity.mana   = Math.min(entity.maxMana,  entity.mana + amount);   Audio.play('pickup'); }
  function gainHealth(amount) { entity.lives   = Math.min(entity.maxLives, entity.lives + amount);  Audio.play('pickup'); }
  function addScore(pts)      { entity.score  += pts; }

  function reset() {
    const s = Level.getSpawns().playerStart;
    entity.x = s.x; entity.y = s.y;
    entity.vx = 0; entity.vy = 0;
    entity.invincible = 60;
  }

  // ── RENDER ──
  function render(ctx) {
    const camX = Math.floor(Level.camera.x);
    const camY = Math.floor(Level.camera.y);
    const dx   = Math.floor(entity.x - camX);
    const dy   = Math.floor(entity.y - camY);

    if (entity.invincible > 0 && Math.floor(entity.invincible / 4) % 2 === 0) ctx.globalAlpha = 0.35;

    Sprites.drawSorcerer(ctx, dx, dy, entity.frame, entity.facingRight, entity.state, entity.meleeAttFrame);

    // Draw melee arc during active frames
    if (entity.meleeTimer > 0 &&
        entity.meleeAttFrame >= MELEE_HIT_START &&
        entity.meleeAttFrame <= MELEE_HIT_END) {
      drawMeleeArc(ctx, dx, dy);
    }

    ctx.globalAlpha = 1;

    // Spell bolts
    entity.spellBolts.forEach(b => Sprites.drawSpellBolt(ctx, b.x - camX, b.y - camY, b.frame, b.facingRight));
  }

  function drawMeleeArc(ctx, x, y) {
    const t = (entity.meleeAttFrame - MELEE_HIT_START) / (MELEE_HIT_END - MELEE_HIT_START);
    const alpha = Math.sin(t * Math.PI) * 0.7;
    const arcX  = entity.facingRight ? x + entity.width : x - MELEE_RANGE + 8;

    ctx.save();
    ctx.globalAlpha = alpha;
    // Staff glow arc
    const grad = ctx.createLinearGradient(arcX, y + 10, arcX + MELEE_RANGE, y + MELEE_HEIGHT);
    grad.addColorStop(0, 'rgba(232,121,249,0.9)');
    grad.addColorStop(1, 'rgba(217,70,239,0)');
    ctx.fillStyle = grad;
    // Diagonal arc shape (3 rectangles for pixel feel)
    if (entity.facingRight) {
      ctx.fillRect(x + entity.width,      y + 8,  20, 6);
      ctx.fillRect(x + entity.width + 16, y + 14, 18, 6);
      ctx.fillRect(x + entity.width + 28, y + 20, 16, 6);
    } else {
      ctx.fillRect(x - 20,  y + 8,  20, 6);
      ctx.fillRect(x - 34,  y + 14, 18, 6);
      ctx.fillRect(x - 44,  y + 20, 16, 6);
    }
    // Spark at tip
    ctx.fillStyle = 'rgba(255,230,255,0.9)';
    const sparkX = entity.facingRight ? x + entity.width + 28 + 16 : x - 46;
    ctx.fillRect(sparkX, y + 18, 6, 6);
    ctx.restore();
  }

  // ── INIT ──
  function init() {
    const s = Level.getSpawns().playerStart;
    entity.x = s.x; entity.y = s.y;
    entity.vx = 0; entity.vy = 0;
    entity.lives = 3; entity.mana = 5;
    entity.score = 0; entity.invincible = 0;
    entity.spellTimer = 0; entity.frame = 0;
    entity.active = true; entity.spellBolts = [];
    entity.civiliansSaved = 0;
    entity.meleeTimer = 0; entity.meleeCooldown = 0;
    entity.meleeAttFrame = 0; entity.meleeHitLanded = false;
    bindInput();
  }

  return { entity, keys, init, update, render, takeDamage, gainMana, gainHealth, addScore, reset };
})();
