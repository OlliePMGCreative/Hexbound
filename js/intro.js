/* ═══════════════════════════════════════════════════
   intro.js — Storyboard cutscene animation system
   4 panels, typewriter narration, skip support
   ═══════════════════════════════════════════════════ */

const Intro = (() => {

  const PANELS = [
    {
      img: 'assets/images/intro1.png',
      title: 'THE VILLAGE OF OAKHAVEN',
      lines: [
        'Long ago, in the quiet village of Oakhaven,',
        'there lived a sorcerer named ALDRIC.',
        'Keeper of the old ways. Guardian of the living.',
        'The village folk knew him only as a wanderer...',
        '...but Aldric carried a weight few could imagine.'
      ]
    },
    {
      img: 'assets/images/intro2.png',
      title: 'THE RISE OF MALACHAR',
      lines: [
        'From the forgotten crypt beneath the castle hill,',
        'an ancient evil stirred.',
        'MALACHAR — the Necromancer — had returned.',
        'With dark sorcery, he tore the dead from their rest.',
        'An undead army rose at his command.'
      ]
    },
    {
      img: 'assets/images/intro3.png',
      title: 'OAKHAVEN FALLS',
      lines: [
        'In a single cursed night, Oakhaven was consumed.',
        'Green spectral fire devoured the streets.',
        'Friends. Neighbours. All turned to bone and shadow.',
        'Aldric watched helplessly from the hillside...',
        '...and swore an oath he would never forget.'
      ]
    },
    {
      img: 'assets/images/intro4.png',
      title: 'THE SORCERER SETS FORTH',
      lines: [
        '"I am the last. I will not yield."',
        'Aldric took his staff and turned toward the castle.',
        'The road was lined with graves.',
        'The dead stirred in every shadow.',
        'But tonight — the sorcerer hunts.'
      ]
    }
  ];

  // Loaded images
  const images = [];

  let panelIndex   = 0;
  let lineIndex    = 0;
  let charIndex    = 0;
  let frameCount   = 0;
  let fadeAlpha    = 0;      // 0..1 fade in
  let fadeOut      = false;
  let fadeOutAlpha = 1;
  let running      = false;
  let onComplete   = null;
  let skipPressed  = false;

  // Typewriter speed: 1 char every N frames
  const CHAR_SPEED   = 2;
  // Hold after all lines typed (frames)
  const HOLD_FRAMES  = 140;
  let holdTimer      = 0;
  let allLinesTyped  = false;

  // ── PRELOAD ──
  function preload() {
    return new Promise(resolve => {
      let loaded = 0;
      PANELS.forEach((p, i) => {
        const img = new Image();
        img.onload = () => { loaded++; if (loaded === PANELS.length) resolve(); };
        img.onerror = () => { loaded++; if (loaded === PANELS.length) resolve(); };
        img.src = p.img;
        images[i] = img;
      });
    });
  }

  // ── ADVANCE to next panel ──
  function nextPanel() {
    panelIndex++;
    if (panelIndex >= PANELS.length) {
      end();
      return;
    }
    lineIndex = 0;
    charIndex = 0;
    frameCount = 0;
    holdTimer = 0;
    allLinesTyped = false;
    fadeAlpha = 0;
    fadeOut = false;
    fadeOutAlpha = 1;
  }

  // ── SKIP all text on current panel ──
  function skipToEnd() {
    if (!allLinesTyped) {
      charIndex = PANELS[panelIndex].lines[lineIndex].length;
      lineIndex = PANELS[panelIndex].lines.length - 1;
      charIndex = PANELS[panelIndex].lines[lineIndex].length;
      allLinesTyped = true;
      holdTimer = 0;
    } else {
      // Second press: advance panel
      holdTimer = HOLD_FRAMES;
    }
  }

  // ── END ──
  function end() {
    running = false;
    document.removeEventListener('keydown', onKey);
    const skipBtn = document.getElementById('btn-skip-intro');
    if (skipBtn) {
      skipBtn.removeEventListener('click', onSkipClick);
      skipBtn.style.display = 'none';
    }
    if (onComplete) onComplete();
  }

  // ── INPUT ──
  function onKey(e) {
    if (!running) return;
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') {
      e.preventDefault();
      if (e.code === 'Escape') {
        // Skip entire intro
        end();
        return;
      }
      skipToEnd();
    }
  }

  function onSkipClick() {
    if (!running) return;
    end();
  }

  // ── UPDATE & RENDER ──
  function update(ctx, W, H) {
    if (!running) return;

    frameCount++;
    const panel = PANELS[panelIndex];

    // ── FADE IN ──
    if (fadeAlpha < 1) {
      fadeAlpha = Math.min(1, fadeAlpha + 0.03);
    }

    // ── TYPEWRITER ──
    if (!allLinesTyped) {
      if (frameCount % CHAR_SPEED === 0) {
        charIndex++;
        const currentLine = panel.lines[lineIndex];
        if (charIndex >= currentLine.length) {
          charIndex = currentLine.length;
          // Pause between lines
          if (lineIndex < panel.lines.length - 1) {
            if (frameCount % 40 === 0) {
              lineIndex++;
              charIndex = 0;
              Audio.play('dialogue');
            }
          } else {
            allLinesTyped = true;
            holdTimer = 0;
          }
        } else {
          if (charIndex % 3 === 0) Audio.play('dialogue');
        }
      }
    } else {
      holdTimer++;
      if (holdTimer >= HOLD_FRAMES) {
        // Fade out then advance
        if (!fadeOut) { fadeOut = true; fadeOutAlpha = 1; }
      }
    }

    // ── FADE OUT ──
    if (fadeOut) {
      fadeOutAlpha = Math.max(0, fadeOutAlpha - 0.04);
      if (fadeOutAlpha <= 0) {
        nextPanel();
        return;
      }
    }

    // ── DRAW ──
    ctx.save();
    ctx.globalAlpha = fadeAlpha * (fadeOut ? fadeOutAlpha : 1);

    // Letterbox bars
    const barH = H * 0.08;
    const imgY = barH;
    const imgH = H * 0.62;
    const textY = imgY + imgH;
    const textH = H - imgH - barH * 2;

    // Background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // Panel image
    if (images[panelIndex]?.complete) {
      ctx.drawImage(images[panelIndex], 0, imgY, W, imgH);
    }

    // Letterbox bars (top and bottom)
    ctx.fillStyle = '#0a0814';
    ctx.fillRect(0, 0, W, barH);
    ctx.fillRect(0, H - barH, W, barH);

    // Panel title
    ctx.fillStyle = '#e879f9';
    ctx.font = `bold 13px "Press Start 2P", monospace`;
    ctx.textAlign = 'center';
    ctx.shadowColor = '#d946ef';
    ctx.shadowBlur = 12;
    ctx.fillText(panel.title, W / 2, barH * 0.65);
    ctx.shadowBlur = 0;

    // Text box background
    ctx.fillStyle = 'rgba(10, 8, 20, 0.88)';
    ctx.fillRect(0, textY, W, textH + barH);

    // Top border of text area
    ctx.fillStyle = '#5b2d8e';
    ctx.fillRect(0, textY, W, 2);

    // Narration lines (already typed)
    ctx.textAlign = 'left';
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.fillStyle = '#f4f0ff';
    ctx.shadowBlur = 0;

    const lineHeight = 20;
    const textPadX = Math.max(24, W * 0.04);
    const textStartY = textY + 22;

    for (let i = 0; i < panel.lines.length; i++) {
      let text;
      if (i < lineIndex) {
        text = panel.lines[i];
      } else if (i === lineIndex) {
        text = panel.lines[i].slice(0, charIndex);
        // Blinking cursor
        if (!allLinesTyped && frameCount % 20 < 10) text += '▮';
      } else {
        break;
      }
      ctx.fillStyle = i < lineIndex ? 'rgba(180,160,220,0.7)' : '#f4f0ff';
      ctx.fillText(text, textPadX, textStartY + i * lineHeight);
    }

    // ── PROGRESS DOTS ──
    const dotSpacing = 18;
    const dotsX = W / 2 - (PANELS.length * dotSpacing) / 2;
    const dotsY = H - barH * 0.5;
    PANELS.forEach((_, i) => {
      ctx.fillStyle = i === panelIndex ? '#e879f9' : 'rgba(155,89,216,0.4)';
      ctx.fillRect(dotsX + i * dotSpacing, dotsY - 4, 10, 4);
    });

    // ── HINT ──
    if (allLinesTyped && frameCount % 40 < 20) {
      ctx.fillStyle = 'rgba(155,89,216,0.8)';
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      const isLast = panelIndex === PANELS.length - 1;
      ctx.fillText(isLast ? '[ SPACE ] BEGIN QUEST' : '[ SPACE ] CONTINUE', W / 2, dotsY - 14);
    }

    // Skip button hint
    ctx.fillStyle = 'rgba(100,80,140,0.6)';
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('ESC / SKIP', W - 16, barH * 0.65);

    ctx.restore();
  }

  // ── START ──
  function start(canvasEl, ctxRef, callback) {
    onComplete = callback;
    panelIndex = 0;
    lineIndex = 0;
    charIndex = 0;
    frameCount = 0;
    holdTimer = 0;
    allLinesTyped = false;
    fadeAlpha = 0;
    fadeOut = false;
    fadeOutAlpha = 1;
    running = true;

    document.addEventListener('keydown', onKey);
    const skipBtn = document.getElementById('btn-skip-intro');
    if (skipBtn) {
      skipBtn.style.display = 'block';
      skipBtn.addEventListener('click', onSkipClick);
    }
  }

  return {
    preload,
    start,
    update,
    isRunning() { return running; }
  };
})();
