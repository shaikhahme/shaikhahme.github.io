/* A playable "Shaikh" sprite that roams on top of the whole page, speaks in a
   typewriter chat bubble, and interacts with the page via an E "action" key.

   Character + 8-direction walk spritesheet are ported from the s345 "Roommates"
   Phaser game (shaikh_walk.png): 384x384, an 8x8 grid of 48x48 frames, one ROW
   per facing direction in DIR_ORDER order, 8 walk frames per row; direction is
   chosen from the movement vector via SLICE_TABLE, exactly like the game.

   ------- controls -------
   Arrow keys / WASD: walk. Horizontal is always free-roam.

   BUILDING the globe (before it's "set"): the sprite's vertical position drives
   the scroll/build - top border = original, bottom = complete, saturating a bit
   before each border (BUILD_COMPLETE_AT / BUILD_REWIND_AT). Walking down builds,
   up rewinds; the mouse wheel nudges him too ("scroll down" still works).

   ONCE SET (he reaches the complete point / the globe appears): walking is
   DECOUPLED from the build - he roams freely everywhere (so he can reach every
   label) and walking up no longer rewinds. Reversing the animation is now only
   possible by SCROLLING UP with the wheel. If the wheel takes it all the way
   back to the blank original, it re-arms and walking drives the build again.

   E (action key):
     - TAP E (press & release without steering) while over a link -> "clicks" it
       (opens a label's page / project / inline link / the Back button). A prompt
       ("press e to check it out!" / "press e to go back") shows when in range.
     - HOLD E + arrows -> on the main page rotates the globe (left/right spin,
       up/down tilt); inside a sub-page up/down scrolls the content, and holding
       up while already at the top exits back to the sphere.

   Interaction uses body-overlap (rect vs rect), not pixel-precise point-testing,
   so even the thin Back arrow is caught reliably. */
(function () {
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return;

  const FRAME = 48, SCALE = 2, SIZE = FRAME * SCALE; // 96px on screen
  const WALK_STRIDE_PX = 13;
  const MOVE_SPEED = 7;
  const MARGIN = 16;
  const WHEEL_TO_Y = 0.6;
  const ROT_STEP = 2.6;
  const SUB_SCROLL_STEP = 16;
  const BODY_HALF = 26;          // half-size of his interaction body box
  const BUILD_COMPLETE_AT = 0.55;
  const BUILD_REWIND_AT = 0.10;
  const ROTATE_HINT = 'Hold E and steer to spin the globe.';

  const DIR_ORDER = ["south", "south-east", "east", "north-east", "north", "north-west", "west", "south-west"];
  const SLICE_TABLE = ["east", "south-east", "south", "south-west", "west", "north-west", "north", "north-east"];
  function dirRowFromVector(dx, dy) {
    if (dx === 0 && dy === 0) return null;
    const deg = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
    return DIR_ORDER.indexOf(SLICE_TABLE[Math.round(deg / 45) % 8]);
  }
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const topBorder = () => MARGIN;
  const botBorder = () => window.innerHeight - SIZE - MARGIN;
  const maxScroll = () => Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const inSubPage = () => !!document.querySelector('.zoom-page');
  const normY = () => clamp((y - topBorder()) / Math.max(1, botBorder() - topBorder()), 0, 1);

  // ---- sprite element ----
  const el = document.createElement('div');
  el.id = 'shaikh';
  el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);

  let x = MARGIN, y = MARGIN;   // starts top-left
  let row = 0, frame = 0, distAcc = 0;
  let built = false;            // has the globe been "set" (fully built) yet?
  let rotateHintShown = false;
  let lastScrollY = 0;          // post-set: track native scroll to walk him along it

  function draw() {
    el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    el.style.backgroundPosition = `-${frame * SIZE}px -${row * SIZE}px`;
    positionBubble();
    positionPrompt();
  }

  // =====================================================================
  // speak() + hint bubbles
  // =====================================================================
  let bubbleEl = null, bubbleTextEl = null, bubbleToken = null;
  let hintUp = false;              // a hint bubble is showing
  let hintDismissable = false;     // does input dismiss it?
  let hintAutoHide = 0;

  function ensureBubble() {
    if (bubbleEl) return;
    bubbleEl = document.createElement('div');
    bubbleEl.className = 'shaikh-bubble';
    bubbleTextEl = document.createElement('span');
    bubbleTextEl.className = 'shaikh-bubble-text';
    const cursor = document.createElement('span');
    cursor.className = 'shaikh-bubble-cursor';
    cursor.textContent = '|';
    bubbleEl.appendChild(bubbleTextEl);
    bubbleEl.appendChild(cursor);
    document.body.appendChild(bubbleEl);
  }

  function speak(text, opts) {
    opts = opts || {};
    ensureBubble();
    if (bubbleToken) bubbleToken.cancelled = true;
    const token = { cancelled: false };
    bubbleToken = token;
    bubbleEl.classList.remove('hidden', 'done');
    bubbleEl.classList.add('visible');
    bubbleTextEl.textContent = '';
    const speed = opts.msPerChar || 42;
    const start = performance.now();
    (function stepFn(now) {
      if (token.cancelled) return;
      const n = Math.min(text.length, Math.floor(((now || performance.now()) - start) / speed));
      bubbleTextEl.textContent = text.slice(0, n);
      positionBubble();
      if (n < text.length) requestAnimationFrame(stepFn);
      else bubbleEl.classList.add('done');
    })(start);
  }
  function hideBubble() {
    if (bubbleToken) bubbleToken.cancelled = true;
    if (bubbleEl) { bubbleEl.classList.add('hidden'); bubbleEl.classList.remove('visible'); }
  }
  // A hint that types out, then hides after a timeout and/or on the next input.
  function sayHint(text, opts) {
    opts = opts || {};
    speak(text);
    hintUp = true;
    hintDismissable = !!opts.dismissOnInput;
    clearTimeout(hintAutoHide);
    if (opts.autoMs) hintAutoHide = setTimeout(() => { if (hintUp) { hideBubble(); hintUp = false; } }, opts.autoMs);
  }
  // Called on input; only hides hints that opted into input-dismissal (the
  // welcome). The "hold E to spin" hint stays put while he walks around.
  function dismissHint() { if (hintUp && hintDismissable) { hintUp = false; clearTimeout(hintAutoHide); hideBubble(); } }

  function positionBubble() {
    if (bubbleEl && bubbleEl.classList.contains('visible')) {
      const bw = bubbleEl.offsetWidth, bh = bubbleEl.offsetHeight;
      let bx = x + SIZE + 12, flip = false;
      if (bx + bw > window.innerWidth - 8) { bx = x - bw - 12; flip = true; }
      bx = clamp(bx, 8, Math.max(8, window.innerWidth - bw - 8));
      const by = clamp(y + SIZE * 0.15, 8, Math.max(8, window.innerHeight - bh - 8));
      bubbleEl.style.transform = `translate(${Math.round(bx)}px, ${Math.round(by)}px)`;
      bubbleEl.classList.toggle('flip', flip);
    }
  }

  window.shaikhSpeak = speak;
  window.shaikhHideBubble = hideBubble;

  // =====================================================================
  // "press e ..." prompt, pinned right above his head (close to him)
  // =====================================================================
  const promptEl = document.createElement('div');
  promptEl.id = 'shaikh-prompt';
  document.body.appendChild(promptEl);
  let promptKind = null;
  function setPrompt(kind) {
    if (kind === promptKind) return;
    promptKind = kind;
    if (kind) {
      promptEl.textContent = kind === 'back' ? 'press e to go back' : 'press e to check it out!';
      promptEl.classList.add('visible');
    } else {
      promptEl.classList.remove('visible');
    }
  }
  function positionPrompt() {
    if (!promptKind) return;
    const bw = promptEl.offsetWidth, bh = promptEl.offsetHeight;
    let bx = clamp(x + SIZE / 2 - bw / 2, 6, Math.max(6, window.innerWidth - bw - 6));
    let by = y - bh - 2;                    // just above his head
    if (by < 6) by = y + SIZE + 2;          // flip below if no room above
    promptEl.style.transform = `translate(${Math.round(bx)}px, ${Math.round(by)}px)`;
  }

  // =====================================================================
  // interaction targets by BODY OVERLAP (robust, catches the thin Back arrow)
  // =====================================================================
  // Targets depend on context: the sphere labels on the main page, or the
  // sub-page's OWN controls when an overlay is open. The sphere labels still
  // exist in the DOM behind the overlay, so we must not match them in a sub-page.
  function linkSel() {
    return inSubPage()
      ? '.zoom-page .project-row, .zoom-page .relevant-note-source, .zoom-page .virtues-content a, .zoom-page .mindmap-sidebar-header a, .zoom-page .relevant-note a'
      : '.label3d';
  }
  function clickSel() {
    return inSubPage() ? linkSel() + ', .zoom-page-back' : '.label3d';
  }

  function bodyRect() {
    const cx = x + SIZE / 2, cy = y + SIZE / 2;
    return { left: cx - BODY_HALF, top: cy - BODY_HALF, right: cx + BODY_HALF, bottom: cy + BODY_HALF };
  }
  function overlapArea(a, b) {
    const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return ox > 0 && oy > 0 ? ox * oy : 0;
  }
  // The clickable element whose rect his body overlaps most (skips off-screen /
  // faded-to-the-back labels, which aren't really clickable).
  function targetOverlap(sel) {
    const body = bodyRect();
    let best = null, bestArea = 0;
    document.querySelectorAll(sel).forEach(node => {
      if (node.classList && node.classList.contains('label3d')) {
        const op = parseFloat(node.style.opacity);
        if (!Number.isNaN(op) && op < 0.9) return;
      }
      const r = node.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const a = overlapArea(body, r);
      if (a > bestArea) { bestArea = a; best = node; }
    });
    return best;
  }

  function tapAction() {
    const t = targetOverlap(clickSel());
    if (t) { t.click(); return true; }
    return false;
  }

  function holdAction(dx, dy) {
    if (inSubPage()) {
      const pane = document.querySelector('.zoom-page .virtues-content, .zoom-page .projects-list, .zoom-page .mindmap-flow');
      if (dy > 0 && pane) pane.scrollTop += SUB_SCROLL_STEP;
      else if (dy < 0) {
        if (pane && pane.scrollTop > 0) pane.scrollTop -= SUB_SCROLL_STEP;
        else { const back = document.querySelector('.zoom-page-back'); if (back) back.click(); }
      }
    } else if (typeof window.shaikhRotateGlobe === 'function') {
      window.shaikhRotateGlobe(dx ? Math.sign(dx) * ROT_STEP : 0, dy ? -Math.sign(dy) * ROT_STEP : 0);
    }
  }

  // =====================================================================
  // build binding (only while NOT yet set): sprite vertical -> scroll
  // =====================================================================
  function applyBuildBinding() {
    const p = clamp((normY() - BUILD_REWIND_AT) / (BUILD_COMPLETE_AT - BUILD_REWIND_AT), 0, 1);
    const target = p * maxScroll();
    if (Math.abs(window.scrollY - target) > 1) window.scrollTo(0, target);
  }

  function scheduleRotateHint() {
    // Stays put while he walks (dismissOnInput defaults false); hides after 4s.
    setTimeout(() => { sayHint(ROTATE_HINT, { autoMs: 4000 }); }, 800);
  }

  // =====================================================================
  // input
  // =====================================================================
  const held = new Set();
  const MOVE_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D']);
  let eDown = false, eMoved = false;

  window.addEventListener('keydown', e => {
    if (e.key === 'e' || e.key === 'E') {
      dismissHint();
      if (!eDown) { eDown = true; eMoved = false; }
      return;
    }
    if (!MOVE_KEYS.has(e.key)) return;
    e.preventDefault();
    held.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    dismissHint();
  }, { passive: false });

  window.addEventListener('keyup', e => {
    if (e.key === 'e' || e.key === 'E') {
      if (eDown && !eMoved) tapAction();  // a clean tap = "click"
      eDown = false;
      return;
    }
    held.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  });

  // Wheel: BEFORE the globe is set, nudge him vertically (accumulated and applied
  // in the loop so it reads as walking, and it drives the build via binding).
  // AFTER it's set, let the wheel scroll natively - that's the only way to reverse
  // the animation - and the loop walks him up along that scroll. Always native in
  // a sub-page.
  let wheelAccum = 0;
  window.addEventListener('wheel', e => {
    if (e.ctrlKey || inSubPage() || built) return;
    e.preventDefault();
    wheelAccum += e.deltaY;
    dismissHint();
  }, { passive: false });

  window.addEventListener('blur', () => { held.clear(); eDown = false; });

  function inputVector() {
    let dx = 0, dy = 0;
    if (held.has('ArrowLeft') || held.has('a')) dx -= 1;
    if (held.has('ArrowRight') || held.has('d')) dx += 1;
    if (held.has('ArrowUp') || held.has('w')) dy -= 1;
    if (held.has('ArrowDown') || held.has('s')) dy += 1;
    return { dx, dy };
  }

  // =====================================================================
  // main loop
  // =====================================================================
  function tick() {
    requestAnimationFrame(tick);
    const { dx, dy } = inputVector();
    const anyInput = dx !== 0 || dy !== 0;

    // HOLD E + steering -> rotate / scroll instead of walking.
    if (eDown && anyInput) {
      eMoved = true;
      holdAction(dx, dy);
      const r = dirRowFromVector(dx, dy);
      if (r !== null) row = r;
      frame = 0;
      setPrompt(null);
      draw();
      return;
    }

    const prevX = x, prevY = y;
    if (dx !== 0) x = clamp(x + Math.sign(dx) * MOVE_SPEED, 0, window.innerWidth - SIZE);
    if (dy !== 0) y = clamp(y + Math.sign(dy) * MOVE_SPEED, topBorder(), botBorder());

    let wheelDir = 0;
    // Pre-set wheel: nudge him vertically (drives the build via binding below).
    if (wheelAccum !== 0 && !built && !inSubPage()) {
      y = clamp(y + wheelAccum * WHEEL_TO_Y, topBorder(), botBorder());
      wheelDir = Math.sign(wheelAccum);
      wheelAccum = 0;
    }

    // Build control on the main page.
    if (!inSubPage()) {
      if (!built) {
        applyBuildBinding();                 // sprite drives the build
        if (normY() >= BUILD_COMPLETE_AT) {   // reached the complete point -> SET
          built = true;
          lastScrollY = window.scrollY;
          if (!rotateHintShown) { rotateHintShown = true; scheduleRotateHint(); }
        }
      } else {
        // Post-set: native scroll (wheel) rewinds/rebuilds, and we walk him along
        // it - so scrolling up carries him smoothly all the way back to the top
        // (a consistent start), while KEY walking still never touches the build.
        const ds = window.scrollY - lastScrollY;
        if (ds !== 0) {
          const range = Math.max(1, botBorder() - topBorder());
          y = clamp(y + ds * (range / maxScroll()), topBorder(), botBorder());
          wheelDir = Math.sign(ds);
          lastScrollY = window.scrollY;
        }
        if (window.scrollY <= 1) { built = false; y = topBorder(); lastScrollY = 0; } // re-arm at the original
      }
    }

    // Facing: keys win; otherwise face the way the wheel/scroll is walking him.
    if (anyInput) { const r = dirRowFromVector(dx, dy); if (r !== null) row = r; }
    else if (wheelDir !== 0) row = wheelDir < 0 ? DIR_ORDER.indexOf('north') : DIR_ORDER.indexOf('south');

    const moved = Math.hypot(x - prevX, y - prevY);
    if (moved > 0.4) {
      distAcc += moved;
      while (distAcc >= WALK_STRIDE_PX) { distAcc -= WALK_STRIDE_PX; frame = (frame + 1) % 8; }
    } else { frame = 0; distAcc = 0; }

    // Contextual prompt (links, or the Back arrow in a sub-page).
    if (!hintUp && !eDown) {
      if (targetOverlap(linkSel())) setPrompt('link');
      else if (inSubPage() && targetOverlap('.zoom-page-back')) setPrompt('back');
      else setPrompt(null);
    } else setPrompt(null);

    draw();
  }

  window.addEventListener('resize', () => {
    x = clamp(x, 0, window.innerWidth - SIZE);
    y = clamp(y, topBorder(), botBorder());
  });

  draw();
  requestAnimationFrame(tick);
  sayHint('Welcome! Press down arrow, S, or scroll down.', { dismissOnInput: true });
})();
