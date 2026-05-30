/* ═══════════════════════════════════════════════
   spritesheet.js — Pixel-art sprite renderer
   All sprites are drawn procedurally on canvas
   using 8-bit style pixel blocks
   ═══════════════════════════════════════════════ */

const Sprites = (() => {

  const PIXEL = 3; // base pixel size (scales up for retro look)

  // ── Colour palettes ──
  const PAL = {
    // Sorcerer
    sorcererRobe:  '#5b2d8e',
    sorcererHood:  '#2a1758',
    sorcererSkin:  '#f4c28a',
    sorcererEyes:  '#e879f9',
    staffBrown:    '#7c5233',
    staffGlow:     '#d946ef',

    // Skeleton
    skeletonBone:  '#d1c9b0',
    skeletonEye:   '#ef4444',
    skeletonDark:  '#8a7e6a',

    // Ghost
    ghostBody:     'rgba(180,160,255,0.6)',
    ghostEye:      '#ef4444',
    ghostGlow:     'rgba(155,89,216,0.3)',

    // Bat
    batBody:       '#1a1135',
    batWing:       '#2a1758',
    batEye:        '#ef4444',

    // Civilian
    civSkin:       '#e8b87d',
    civClothes:    '#3d6b4f',
    civHair:       '#6b3a1f',

    // Platform tile colours
    stoneDark:     '#2d2b3a',
    stoneMid:      '#3d3b52',
    stoneLight:    '#5a5875',
    moss:          '#1a4d2e',
    mossLight:     '#22c55e',

    // Spell bolt
    boltCore:      '#f4f0ff',
    boltGlow:      '#d946ef',

    // Projectile
    projInner:     '#ffffff',
    projOuter:     '#c026d3',
  };

  // ─── Utility: draw a 1-unit pixel block ───
  function px(ctx, x, y, color, size = PIXEL) {
    if (!color || color === 'T') return;
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x * size), Math.floor(y * size), size, size);
  }

  // ─── Outline: draw 1px black border around rect ───
  const OL = '#06030f'; // GBA outline colour
  function outline(ctx, x, y, w, h) {
    ctx.fillStyle = OL;
    ctx.fillRect(x - 1, y,     1,     h);
    ctx.fillRect(x + w, y,     1,     h);
    ctx.fillRect(x,     y - 1, w,     1);
    ctx.fillRect(x,     y + h, w,     1);
  }

  // ─── Draw a grid of pixels from a colour map ───
  function drawGrid(ctx, grid, palette, ox = 0, oy = 0, size = PIXEL) {
    grid.forEach((row, y) => {
      [...row].forEach((char, x) => {
        const color = palette[char];
        if (color) px(ctx, ox + x, oy + y, color, size);
      });
    });
  }

  // ════════════════════════════════════════
  //   SORCERER — 14×20 pixels (×3 = 42×60)
  // ════════════════════════════════════════
  // Key: H=hood, R=robe, S=skin, E=eye, B=staff, G=glow, T=transparent
  const SORCERER_IDLE = [
    'TTTHHHTTTTTTT',
    'TTHHHHHTTTTTT',
    'THHSSSHHTTTT',
    'THHSESHHTTT',
    'TTHHHHHTTTT',
    'TTRRRRRRTTT',
    'TRRRRRRRRTT',
    'TRRRBRRRRTT',
    'TRRRBRRRRTT',
    'TRRBGBRRRT',
    'TRRRBRRRRTT',
    'TTRRRRRRTT',
    'TTRRRRRRTTT',
  ];

  // We'll draw sprites using procedural canvas calls for better quality
  // and animation support. This avoids external image dependencies.

  function drawSorcerer(ctx, x, y, frame = 0, facingRight = true, state = 'idle', meleeAttFrame = 0) {
    // ── Try image first ──
    const stateKey = {
      idle: 'sorcerer_idle', walk: 'sorcerer_walk', jump: 'sorcerer_jump',
      fall: 'sorcerer_jump', cast: 'sorcerer_cast', attack: 'sorcerer_attack',
      hurt: 'sorcerer_hurt',
    }[state] || 'sorcerer_idle';
    const animFrame = Math.floor(frame / 6); // slow down to ~10fps
    if (SpriteLoader.draw(ctx, stateKey, x, y, animFrame, !facingRight)) return;

    // ── Procedural fallback ──
    ctx.save();
    if (!facingRight) { ctx.scale(-1, 1); x = -x - 24; }

    const bobY   = state === 'idle' ? Math.sin(frame * 0.08) * 1 : 0;
    const baseX  = x, baseY = y + bobY;
    const isAtk  = state === 'attack';

    // ── HOOD (GBA chunky) ──
    ctx.fillStyle = PAL.sorcererHood;
    ctx.fillRect(baseX + 6, baseY,     12, 3);
    ctx.fillRect(baseX + 3, baseY + 3, 18, 3);
    ctx.fillRect(baseX,     baseY + 6, 24, 3);
    outline(ctx, baseX + 3, baseY, 18, 9);

    // ── FACE ──
    ctx.fillStyle = PAL.sorcererSkin;
    ctx.fillRect(baseX + 6,  baseY + 9,  12, 9);
    outline(ctx, baseX + 6,  baseY + 9,  12, 9);

    // Eyes
    ctx.fillStyle = PAL.sorcererEyes;
    ctx.fillRect(baseX + 7,  baseY + 12, 3, 3);
    ctx.fillRect(baseX + 14, baseY + 12, 3, 3);

    // ── ROBE ──
    ctx.fillStyle = PAL.sorcererRobe;
    ctx.fillRect(baseX + 3, baseY + 18, 18, 6);
    ctx.fillRect(baseX,     baseY + 24, 24, 6);
    ctx.fillRect(baseX,     baseY + 30, 24, 6);
    ctx.fillRect(baseX + 3, baseY + 36, 18, 6);
    // Left shadow strip
    ctx.fillStyle = PAL.sorcererHood;
    ctx.fillRect(baseX + 3, baseY + 18, 3, 24);
    outline(ctx, baseX, baseY + 18, 24, 24);

    // ── STAFF ──
    if (!isAtk) {
      // Resting staff
      ctx.fillStyle = PAL.staffBrown;
      ctx.fillRect(baseX + 21, baseY + 18, 3, 27);
      ctx.fillStyle = OL;
      ctx.fillRect(baseX + 20, baseY + 18, 1, 27);
      // Orb
      const glowP = Math.sin(frame * 0.12) * 0.4 + 0.6;
      ctx.fillStyle = PAL.staffGlow;
      ctx.fillRect(baseX + 18, baseY + 12, 9, 9);
      ctx.fillStyle = `rgba(217,70,239,${glowP * 0.5})`;
      ctx.fillRect(baseX + 15, baseY + 9, 15, 15);
      outline(ctx, baseX + 18, baseY + 12, 9, 9);
    } else {
      // Attack swing — staff raised and swung forward
      const swingPct = Math.min(1, meleeAttFrame / 16);
      const swingAngle = -1.2 + swingPct * 2.4; // -70deg to +70deg
      ctx.save();
      ctx.translate(baseX + 21, baseY + 22);
      ctx.rotate(swingAngle);
      ctx.fillStyle = PAL.staffBrown;
      ctx.fillRect(-2, -28, 4, 28);
      ctx.fillStyle = OL;
      ctx.fillRect(-3, -28, 1, 28);
      // Orb at tip
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-3, -32, 7, 7);
      ctx.fillStyle = PAL.staffGlow;
      ctx.fillRect(-2, -31, 5, 5);
      ctx.restore();
    }

    // ── WALK LEGS ──
    if (state === 'walk') {
      const swing = Math.sin(frame * 0.25) * 4;
      ctx.fillStyle = PAL.sorcererHood;
      ctx.fillRect(baseX + 6,  baseY + 42 - swing, 6, 6);
      ctx.fillRect(baseX + 12, baseY + 42 + swing, 6, 6);
      outline(ctx, baseX + 6, baseY + 42 - Math.abs(swing), 12, 6);
    } else {
      ctx.fillStyle = PAL.sorcererHood;
      ctx.fillRect(baseX + 6, baseY + 42, 12, 3);
    }

    ctx.restore();
  }

  // ════════════════
  //   SKELETON — 18x30
  // ════════════════
  function drawSkeleton(ctx, x, y, frame = 0, facingRight = true, dying = false) {
    // ── Try image first ──
    const key = dying ? 'skeleton_die' : 'skeleton_walk';
    const alpha = dying ? Math.max(0, 1 - (frame / 20)) : 1;
    const animFrame = Math.floor(frame / 6);
    if (SpriteLoader.draw(ctx, key, x, y, animFrame, !facingRight, alpha)) return;

    // ── Procedural fallback ──
    ctx.save();
    if (!facingRight) { ctx.scale(-1, 1); x = -x - 16; }
    ctx.globalAlpha = alpha;

    // Skull
    ctx.fillStyle = PAL.skeletonBone;
    ctx.fillRect(x + 2, y,     12, 3);
    ctx.fillRect(x,     y + 3, 16, 9);
    ctx.fillRect(x + 2, y + 12,12, 3);
    // Jaw
    ctx.fillRect(x + 2, y + 15,12, 3);
    outline(ctx, x, y, 16, 18);

    // Eyes (red glowing)
    ctx.fillStyle = PAL.skeletonEye;
    ctx.fillRect(x + 2, y + 6, 4, 4);
    ctx.fillRect(x + 10,y + 6, 4, 4);
    ctx.fillStyle = 'rgba(255,50,50,0.4)';
    ctx.fillRect(x + 1, y + 5, 6, 6);
    ctx.fillRect(x + 9, y + 5, 6, 6);

    // Ribcage
    ctx.fillStyle = PAL.skeletonBone;
    ctx.fillRect(x + 2, y + 18, 12, 9);
    outline(ctx, x + 2, y + 18, 12, 9);
    ctx.fillStyle = PAL.skeletonDark;
    [2,5,7].forEach(r => ctx.fillRect(x + 3, y + 18 + r, 10, 1));

    // Arms
    const armS = Math.sin(frame * 0.2) * 3;
    ctx.fillStyle = PAL.skeletonBone;
    ctx.fillRect(x - 2,  y + 18 - armS, 4, 9);
    ctx.fillRect(x + 14, y + 18 + armS, 4, 9);
    outline(ctx, x - 2,  y + 18 - Math.abs(armS), 4, 9);
    outline(ctx, x + 14, y + 18 + Math.abs(armS), 4, 9);

    // Pelvis
    ctx.fillStyle = PAL.skeletonBone;
    ctx.fillRect(x + 2, y + 27, 12, 3);

    // Legs
    const legS = Math.sin(frame * 0.2) * 3;
    ctx.fillStyle = PAL.skeletonBone;
    ctx.fillRect(x + 2,  y + 27 + legS, 4, 9);
    ctx.fillRect(x + 10, y + 27 - legS, 4, 9);
    outline(ctx, x + 2,  y + 27 + Math.abs(legS), 4, 9);
    outline(ctx, x + 10, y + 27 + Math.abs(legS), 4, 9);

    ctx.restore();
  }

  // ════════════════
  //   GHOST — 16x20
  // ════════════════
  function drawGhost(ctx, x, y, frame = 0) {
    // ── Try image first ──
    const floatOffset = Math.sin(frame * 0.07) * 4;
    if (SpriteLoader.draw(ctx, 'ghost_float', x, y + floatOffset, Math.floor(frame / 6))) return;

    // ── Procedural fallback ──
    const floatY = y + floatOffset;
    ctx.save();
    // Glow halo
    const grd = ctx.createRadialGradient(x + 8, floatY + 10, 2, x + 8, floatY + 10, 18);
    grd.addColorStop(0, 'rgba(155,89,216,0.3)');
    grd.addColorStop(1, 'rgba(155,89,216,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(x - 10, floatY - 8, 36, 36);

    // Body
    ctx.fillStyle = PAL.ghostBody;
    ctx.fillRect(x + 3,  floatY,     10, 3);
    ctx.fillRect(x,      floatY + 3, 16, 12);
    ctx.fillRect(x + 3,  floatY + 15,4,  3);
    ctx.fillRect(x + 9,  floatY + 15,4,  3);

    // Eyes
    ctx.fillStyle = PAL.ghostEye;
    ctx.fillRect(x + 3,  floatY + 6, 3, 3);
    ctx.fillRect(x + 10, floatY + 6, 3, 3);

    ctx.restore();
  }

  // ════════════════
  //   BAT — 20x12
  // ════════════════
  function drawBat(ctx, x, y, frame = 0) {
    // ── Try image first ──
    const floatOffset = Math.sin(frame * 0.2) * 2;
    if (SpriteLoader.draw(ctx, 'bat_fly', x, y + floatOffset, Math.floor(frame / 4))) return;

    // ── Procedural fallback ──
    const flapY = y + floatOffset;
    const flapAngle = Math.sin(frame * 0.3) * 0.4;

    ctx.save();
    ctx.translate(x + 10, flapY + 6);

    // Wings
    ctx.fillStyle = PAL.batWing;
    ctx.save();
    ctx.rotate(-flapAngle);
    ctx.fillRect(-20, -3, 12, 6);
    ctx.restore();
    ctx.save();
    ctx.rotate(flapAngle);
    ctx.fillRect(8, -3, 12, 6);
    ctx.restore();

    // Body
    ctx.fillStyle = PAL.batBody;
    ctx.fillRect(-4, -6, 8, 9);

    // Eyes
    ctx.fillStyle = PAL.batEye;
    ctx.fillRect(-3, -5, 2, 2);
    ctx.fillRect(1,  -5, 2, 2);

    ctx.restore();
  }

  // ════════════════
  //   CIVILIAN — 14x28
  // ════════════════
  function drawCivilian(ctx, x, y, frame = 0, waving = false) {
    ctx.save();

    // Hair
    ctx.fillStyle = PAL.civHair;
    ctx.fillRect(x + 3, y,     8, 3);
    ctx.fillRect(x + 2, y + 3, 10, 3);

    // Face
    ctx.fillStyle = PAL.civSkin;
    ctx.fillRect(x + 2, y + 6,  10, 9);

    // Eyes
    ctx.fillStyle = '#333';
    ctx.fillRect(x + 3,  y + 9,  2, 2);
    ctx.fillRect(x + 9,  y + 9,  2, 2);

    // Mouth (worried)
    ctx.fillRect(x + 5,  y + 12, 4, 1);

    // Body
    ctx.fillStyle = PAL.civClothes;
    ctx.fillRect(x + 2,  y + 15, 10, 9);

    // Arm (waving if player nearby)
    if (waving) {
      const wave = Math.sin(frame * 0.25) * 0.5;
      ctx.save();
      ctx.translate(x + 12, y + 15);
      ctx.rotate(-1.2 + wave);
      ctx.fillRect(0, 0, 3, 7);
      ctx.restore();
    } else {
      ctx.fillRect(x, y + 15, 3, 7);
      ctx.fillRect(x + 11, y + 15, 3, 7);
    }

    // Legs
    ctx.fillStyle = PAL.civHair;
    ctx.fillRect(x + 3,  y + 24, 3, 6);
    ctx.fillRect(x + 8,  y + 24, 3, 6);

    ctx.restore();
  }

  // ════════════════
  //   SPELL BOLT — 12x6
  // ════════════════
  function drawSpellBolt(ctx, x, y, frame = 0, facingRight = true) {
    ctx.save();
    if (!facingRight) {
      ctx.scale(-1, 1);
      x = -x - 12;
    }
    const pulse = Math.sin(frame * 0.4) * 0.3 + 0.7;

    // Glow trail
    ctx.fillStyle = `rgba(217, 70, 239, ${pulse * 0.3})`;
    ctx.fillRect(x - 6, y,  18, 6);

    // Core
    ctx.fillStyle = PAL.boltCore;
    ctx.fillRect(x + 3, y + 1, 6, 4);
    ctx.fillStyle = PAL.boltGlow;
    ctx.fillRect(x, y + 2, 12, 2);

    ctx.restore();
  }

  // GBA tile drawing with image support
  function drawStoneTile(ctx, x, y, variant = 0) {
    if (SpriteLoader.drawVariant(ctx, 'tile_stone', variant % 3, x, y)) return;
    // ── Procedural fallback ──
    const P = 16;
    ctx.fillStyle = variant === 1 ? PAL.stoneMid : PAL.stoneDark;
    ctx.fillRect(x, y, P, P);
    ctx.fillStyle = PAL.stoneDark;
    ctx.fillRect(x, y, P, 1); ctx.fillRect(x, y, 1, P);
    ctx.fillRect(x + P-1, y, 1, P); ctx.fillRect(x, y+P-1, P, 1);
    ctx.fillStyle = PAL.stoneLight;
    if (variant === 0) {
      ctx.fillRect(x+2,y+2,5,4); ctx.fillRect(x+9,y+2,5,4);
      ctx.fillRect(x+2,y+10,5,4); ctx.fillRect(x+9,y+10,5,4);
    } else {
      ctx.fillRect(x+2,y+2,12,4); ctx.fillRect(x+2,y+10,12,4);
    }
    ctx.fillStyle = PAL.stoneMid;
    ctx.fillRect(x+1,y+1,P-2,1);
  }

  function drawGrassTile(ctx, x, y) {
    if (SpriteLoader.draw(ctx, 'tile_grass', x, y)) return;
    // ── Procedural fallback ──
    drawStoneTile(ctx, x, y, 1);
    ctx.fillStyle = PAL.moss;
    ctx.fillRect(x, y, 16, 4);
    ctx.fillStyle = PAL.mossLight;
    for (let i = 0; i < 16; i += 4) {
      ctx.fillRect(x+i+1, y-2, 1, 3);
      ctx.fillRect(x+i+3, y-1, 1, 2);
    }
  }

  // ════════════════
  //   TOMBSTONE — 12x18
  // ════════════════
  function drawTombstone(ctx, x, y, label = 'RIP') {
    // Stone body
    ctx.fillStyle = '#4a4860';
    ctx.fillRect(x + 2, y + 6, 8, 12);
    // Arch top
    ctx.fillRect(x, y + 4, 12, 8);
    ctx.fillRect(x + 2, y, 8, 6);

    // Highlight
    ctx.fillStyle = '#6b6880';
    ctx.fillRect(x + 3, y + 1, 6, 4);
    ctx.fillRect(x + 1, y + 5, 2, 8);

    // Shadow
    ctx.fillStyle = '#2d2b3a';
    ctx.fillRect(x + 10, y + 5, 2, 13);
    ctx.fillRect(x + 2, y + 17,10, 1);

    // Text (tiny)
    ctx.fillStyle = '#8a7e9a';
    ctx.font = '4px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + 6, y + 13);
  }

  // ════════════════
  //   DEAD TREE — 20x40
  // ════════════════
  function drawDeadTree(ctx, x, y) {
    ctx.fillStyle = '#1a1320';
    // Trunk
    ctx.fillRect(x + 8, y + 20, 4, 20);
    // Main branches
    ctx.fillRect(x, y + 10, 20, 3);
    ctx.fillRect(x + 2, y + 16, 16, 3);
    // Thin branches
    ctx.fillRect(x, y + 8, 10, 2);
    ctx.fillRect(x + 12, y + 7, 8, 2);
    ctx.fillRect(x + 2, y + 4, 6, 2);
    ctx.fillRect(x + 14, y + 12, 6, 2);
  }

  return {
    drawSorcerer,
    drawSkeleton,
    drawGhost,
    drawBat,
    drawCivilian,
    drawSpellBolt,
    drawStoneTile,
    drawGrassTile,
    drawTombstone,
    drawDeadTree,
    PIXEL
  };
})();
