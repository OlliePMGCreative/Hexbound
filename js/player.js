/* ═══════════════════════════════════════════════
   player.js — Player entity, physics, animation, spells
   ═══════════════════════════════════════════════ */

const Player = (() => {

  const GRAVITY    = 0.45;
  const JUMP_FORCE = -10.5;        // slightly stronger jump
  const DBL_JUMP_FORCE = -8.5;
  const MOVE_SPEED = 4.0;          // faster run
  const FRICTION   = 0.80;
  const MAX_FALL   = 14;

  const SPELL_COOLDOWN      = 14;  // faster fire rate
  const SPELL_SPEED         = 14;  // faster bolts
  const SPELL_LIFETIME      = 120; // longer range
  const INVINCIBLE_DURATION = 100; // ~1.7 sec of immunity after hit
  const MANA_REGEN_FRAMES   = 90;  // mana regen every 1.5 sec

  const entity = {
    x: 32, y: 200,
    width: 24, height: 42,
    vx: 0, vy: 0,
    onGround: false,
    facingRight: true,
    state: 'idle', // idle, walk, jump, fall, cast, hurt
    frame: 0,
    lives: 3,
    maxLives: 3,
    mana: 5,
    maxMana: 5,
    score: 0,
    invincible: 0,
    spellTimer: 0,
    jumpsLeft: 2,  // allows double jump
    spellBolts: [],
    active: true,
    civiliansSaved: 0,
    totalCivilians: 2,
    manaRegenTimer: 0,
  };

  // Input state
  const keys = {
    left:     false,
    right:    false,
    jump:     false,
    spell:    false,
    interact: false,
    jumpConsumed: false,
    spellConsumed: false,
  };

  function bindInput() {
    const keyMap = {
      'ArrowLeft':  'left',  'KeyA': 'left',
      'ArrowRight': 'right', 'KeyD': 'right',
      'ArrowUp':    'jump',  'KeyW': 'jump', 'Space': 'jump',
      'KeyJ':       'spell', 'KeyZ': 'spell',
      'KeyE':       'interact', 'ArrowDown': 'interact',
      'Enter':      'interact',
    };

    window.addEventListener('keydown', e => {
      const action = keyMap[e.code];
      if (action) {
        e.preventDefault();
        keys[action] = true;
      }
    });

    window.addEventListener('keyup', e => {
      const action = keyMap[e.code];
      if (action) {
        keys[action] = false;
        if (action === 'jump')  keys.jumpConsumed = false;
        if (action === 'spell') keys.spellConsumed = false;
      }
    });

    // Mobile controls
    const mobileMap = {
      'btn-left':     'left',
      'btn-right':    'right',
      'btn-jump':     'jump',
      'btn-spell':    'spell',
      'btn-interact': 'interact',
    };
    Object.entries(mobileMap).forEach(([id, action]) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('touchstart', e => { e.preventDefault(); keys[action] = true; }, { passive: false });
      el.addEventListener('touchend',   e => {
        e.preventDefault();
        keys[action] = false;
        if (action === 'jump')  keys.jumpConsumed = false;
        if (action === 'spell') keys.spellConsumed = false;
      }, { passive: false });
      el.addEventListener('mousedown', () => { keys[action] = true; });
      el.addEventListener('mouseup',   () => {
        keys[action] = false;
        if (action === 'jump')  keys.jumpConsumed = false;
        if (action === 'spell') keys.spellConsumed = false;
      });
    });
  }

  // ── SPELL BOLTS ──
  function fireSpell() {
    if (entity.mana <= 0) return;
    entity.mana = Math.max(0, entity.mana - 1);
    entity.spellTimer = SPELL_COOLDOWN;
    entity.state = 'cast';
    Audio.play('spell');

    entity.spellBolts.push({
      x: entity.facingRight ? entity.x + entity.width : entity.x - 16,
      y: entity.y + 14,
      vx: entity.facingRight ? SPELL_SPEED : -SPELL_SPEED,
      vy: 0,
      width: 16, height: 8,
      frame: 0,
      facingRight: entity.facingRight,
      active: true,
      lifetime: 0
    });
  }

  function updateSpellBolts() {
    entity.spellBolts = entity.spellBolts.filter(b => {
      b.x += b.vx;
      b.lifetime++;
      b.frame++;
      if (Level.isSolid(b.x + (b.facingRight ? b.width : 0), b.y + 4) || b.lifetime > SPELL_LIFETIME) {
        return false;
      }
      return b.active;
    });
  }

  // ── UPDATE ──
  function update() {
    if (!entity.active) return;

    entity.frame++;

    // Timers
    if (entity.invincible > 0) entity.invincible--;
    if (entity.spellTimer > 0) entity.spellTimer--;

    // Mana regen
    entity.manaRegenTimer++;
    if (entity.manaRegenTimer >= MANA_REGEN_FRAMES && entity.mana < entity.maxMana) {
      entity.mana++;
      entity.manaRegenTimer = 0;
    }

    // ── HORIZONTAL MOVEMENT ──
    if (keys.left) {
      entity.vx -= 0.8;
      entity.facingRight = false;
    }
    if (keys.right) {
      entity.vx += 0.8;
      entity.facingRight = true;
    }
    entity.vx *= FRICTION;
    entity.vx = Math.max(-MOVE_SPEED, Math.min(MOVE_SPEED, entity.vx));

    // ── JUMP ──
    if (keys.jump && !keys.jumpConsumed && entity.jumpsLeft > 0) {
      if (entity.jumpsLeft === 2 && entity.onGround) {
        entity.vy = JUMP_FORCE;
        entity.jumpsLeft = 1;
        Audio.play('jump');
      } else if (entity.jumpsLeft === 1 && !entity.onGround) {
        entity.vy = DBL_JUMP_FORCE;
        entity.jumpsLeft = 0;
        Audio.play('jump');
      }
      keys.jumpConsumed = true;
    }

    // ── SPELL ──
    if (keys.spell && !keys.spellConsumed && entity.spellTimer === 0) {
      fireSpell();
      keys.spellConsumed = true;
    }

    // ── GRAVITY ──
    entity.vy += GRAVITY;
    entity.vy = Math.min(entity.vy, MAX_FALL);

    // ── COLLISION ──
    const wasOnGround = entity.onGround;
    Level.resolveCollision(entity);

    if (!wasOnGround && entity.onGround) {
      entity.jumpsLeft = 2; // reset jumps on landing
      Audio.play('land');
    }

    // Kill plane — fell off the bottom of the map
    if (entity.y > Level.getMapHeight() + 64) {
      takeDamage(1);
      reset();
    }

    // ── WORLD BOUNDS ──
    entity.x = Math.max(0, Math.min(entity.x, Level.getMapWidth() - entity.width));

    // ── STATE MACHINE ──
    if (entity.invincible > 0 && entity.state !== 'hurt') {
      // hurt flash
    }
    if (entity.onGround) {
      if (Math.abs(entity.vx) > 0.4) entity.state = 'walk';
      else if (entity.spellTimer > SPELL_COOLDOWN - 6) entity.state = 'cast';
      else entity.state = 'idle';
    } else {
      entity.state = entity.vy < 0 ? 'jump' : 'fall';
    }

    updateSpellBolts();

    // ── STOMP CHECK (jump on enemy = kill) ──
    if (entity.vy > 1 && !entity.onGround) {
      Enemies.getList().forEach(enemy => {
        if (enemy.dying || !enemy.active) return;
        if (enemy.type === 'ghost') return; // ghosts can't be stomped
        const stompBox = {
          x: entity.x + 4,
          y: entity.y + entity.height - 4,
          width: entity.width - 8,
          height: 10
        };
        if (
          stompBox.x < enemy.x + enemy.width &&
          stompBox.x + stompBox.width > enemy.x &&
          stompBox.y < enemy.y + 8 &&
          stompBox.y + stompBox.height > enemy.y
        ) {
          // STOMP!
          enemy.hp = 0;
          enemy.dying = true;
          enemy.dyingFrame = 0;
          Player.addScore(150);
          Audio.play('enemyDie');
          // Bounce the player up
          entity.vy = -8;
          entity.jumpsLeft = Math.max(entity.jumpsLeft, 1);
          Game.screenShake(3, 5);
        }
      });
    }

    // ── CAMERA ──
    Level.camera.follow(entity);
  }

  // ── DAMAGE ──
  function takeDamage(amount) {
    if (entity.invincible > 0) return;
    entity.lives -= amount;
    entity.invincible = INVINCIBLE_DURATION;
    entity.state = 'hurt';
    Audio.play('hurt');
    // Light knockback — doesn't send player flying
    entity.vy = -3.5;
    entity.vx = entity.facingRight ? -2 : 2;
    Game.screenShake(5, 7);
    if (entity.lives <= 0) {
      entity.lives = 0;
      entity.active = false;
      Game.triggerGameOver();
    }
  }

  function gainMana(amount) {
    entity.mana = Math.min(entity.maxMana, entity.mana + amount);
    Audio.play('pickup');
  }

  function gainHealth(amount) {
    entity.lives = Math.min(entity.maxLives, entity.lives + amount);
    Audio.play('pickup');
  }

  function addScore(pts) {
    entity.score += pts;
  }

  function reset() {
    const spawn = Level.getSpawns().playerStart;
    entity.x = spawn.x;
    entity.y = spawn.y;
    entity.vx = 0;
    entity.vy = 0;
    entity.invincible = 60;
  }

  // ── RENDER ──
  function render(ctx) {
    const camX = Math.floor(Level.camera.x);
    const camY = Math.floor(Level.camera.y);

    const drawX = Math.floor(entity.x - camX);
    const drawY = Math.floor(entity.y - camY);

    // Invincibility flash
    if (entity.invincible > 0 && Math.floor(entity.invincible / 4) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    Sprites.drawSorcerer(ctx, drawX, drawY, entity.frame, entity.facingRight, entity.state);

    ctx.globalAlpha = 1;

    // Spell bolts
    entity.spellBolts.forEach(b => {
      Sprites.drawSpellBolt(ctx, b.x - camX, b.y - camY, b.frame, b.facingRight);
    });
  }

  // ── INIT ──
  function init() {
    const spawn = Level.getSpawns().playerStart;
    entity.x = spawn.x;
    entity.y = spawn.y;
    entity.vx = 0; entity.vy = 0;
    entity.lives = 3;
    entity.mana = 5;
    entity.score = 0;
    entity.invincible = 0;
    entity.spellTimer = 0;
    entity.frame = 0;
    entity.active = true;
    entity.spellBolts = [];
    entity.civiliansSaved = 0;
    bindInput();
  }

  return {
    entity,
    keys,
    init,
    update,
    render,
    takeDamage,
    gainMana,
    gainHealth,
    addScore,
    reset,
  };
})();
