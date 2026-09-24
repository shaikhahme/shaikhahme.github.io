(function () {
  const isTouch = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

  const FRAME = 48, SCALE = 2, SIZE = FRAME * SCALE;
  const WALK_STRIDE_PX = 13;
  const MOVE_SPEED = 7;
  const MARGIN = 16;
  const WHEEL_TO_Y = 0.6;
  const ROT_STEP = 2.6;
  const SUB_SCROLL_STEP = 16;
  const BODY_HALF = 26;
  const BUILD_COMPLETE_AT = 0.55;
  const BUILD_REWIND_AT = 0.10;
  const TOUCH_HINT_CLEARANCE = 48;
  const DASH_SPEED = 36;
  const DASH_STRIDE_PX = 30;
  const SUB_PAGE_BUBBLE_MS = 6000;
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

  const el = document.createElement('div');
  el.id = 'shaikh';
  el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);

  let x = MARGIN, y = MARGIN;
  let row = 0, frame = 0, distAcc = 0;
  let built = false;
  let rotateHintShown = false;
  let lastScrollY = 0;

  function draw() {
    el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    el.style.backgroundPosition = `-${frame * SIZE}px -${row * SIZE}px`;
    positionBubble();
    positionPrompt();
  }

  let bubbleEl = null, bubbleTextEl = null, bubbleToken = null;
  let hintUp = false;
  let hintDismissable = false;
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
  function sayHint(text, opts) {
    opts = opts || {};
    speak(text);
    hintUp = true;
    hintDismissable = !!opts.dismissOnInput;
    clearTimeout(hintAutoHide);
    if (opts.autoMs) hintAutoHide = setTimeout(() => { if (hintUp) { hideBubble(); hintUp = false; } }, opts.autoMs);
  }
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
    let by = y - bh - 2;
    if (by < 6) by = y + SIZE + 2;
    promptEl.style.transform = `translate(${Math.round(bx)}px, ${Math.round(by)}px)`;
  }

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

  function applyBuildBinding() {
    const p = clamp((normY() - BUILD_REWIND_AT) / (BUILD_COMPLETE_AT - BUILD_REWIND_AT), 0, 1);
    const target = p * maxScroll();
    if (Math.abs(window.scrollY - target) > 1) window.scrollTo(0, target);
  }

  function scheduleRotateHint() {
    setTimeout(() => { if (!home && !inSubPage()) sayHint(ROTATE_HINT, { autoMs: 4000 }); }, 800);
  }

  let home = null, dash = null;

  window.shaikhEnterSubPage = text => {
    if (!home) home = dash && dash.returning ? { x: dash.tx, y: dash.ty } : { x, y };
    hideBubble();
    hintUp = false;
    dash = { tx: Math.max(0, window.innerWidth - SIZE), ty: topBorder(), returning: false, text };
  };

  window.shaikhLeaveSubPage = () => {
    if (!home) return;
    clearTimeout(hintAutoHide);
    hideBubble();
    hintUp = false;
    dash = { tx: home.x, ty: home.y, returning: true };
    home = null;
  };

  function stepDash() {
    const ddx = dash.tx - x, ddy = dash.ty - y;
    const dist = Math.hypot(ddx, ddy);
    if (dist <= DASH_SPEED) {
      x = dash.tx; y = dash.ty;
      frame = 0; distAcc = 0;
      row = DIR_ORDER.indexOf('south');
      const text = dash.text;
      dash = null;
      if (text) sayHint(text, { autoMs: text.length * 42 + SUB_PAGE_BUBBLE_MS });
    } else {
      x += ddx / dist * DASH_SPEED;
      y += ddy / dist * DASH_SPEED;
      const r = dirRowFromVector(Math.abs(ddx) > 1 ? Math.sign(ddx) : 0, Math.abs(ddy) > 1 ? Math.sign(ddy) : 0);
      if (r !== null) row = r;
      distAcc += DASH_SPEED;
      while (distAcc >= DASH_STRIDE_PX) { distAcc -= DASH_STRIDE_PX; frame = (frame + 1) % 8; }
    }
    setPrompt(null);
    draw();
  }

  const held = new Set();
  const MOVE_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D']);
  let eDown = false, eMoved = false;

  if (!isTouch) window.addEventListener('keydown', e => {
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

  if (!isTouch) window.addEventListener('keyup', e => {
    if (e.key === 'e' || e.key === 'E') {
      if (eDown && !eMoved) tapAction();
      eDown = false;
      return;
    }
    held.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  });

  let wheelAccum = 0;
  window.addEventListener('wheel', e => {
    if (e.ctrlKey || inSubPage() || built) return;
    e.preventDefault();
    wheelAccum += e.deltaY;
    dismissHint();
  }, { passive: false });

  window.addEventListener('blur', () => { held.clear(); eDown = false; });

  if (isTouch) window.addEventListener('scroll', () => { if (window.scrollY > 4) dismissHint(); }, { passive: true });

  function followScroll() {
    const bottom = Math.max(topBorder(), botBorder() - TOUCH_HINT_CLEARANCE);
    const target = topBorder() + clamp(window.scrollY / maxScroll(), 0, 1) * (bottom - topBorder());
    const dir = Math.sign(target - y);
    y = clamp(target, topBorder(), botBorder());
    return dir;
  }

  function inputVector() {
    let dx = 0, dy = 0;
    if (held.has('ArrowLeft') || held.has('a')) dx -= 1;
    if (held.has('ArrowRight') || held.has('d')) dx += 1;
    if (held.has('ArrowUp') || held.has('w')) dy -= 1;
    if (held.has('ArrowDown') || held.has('s')) dy += 1;
    return { dx, dy };
  }

  function tick() {
    requestAnimationFrame(tick);
    if (dash) { stepDash(); return; }
    const { dx, dy } = inputVector();
    const anyInput = dx !== 0 || dy !== 0;

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
    if (wheelAccum !== 0 && !built && !inSubPage()) {
      y = clamp(y + wheelAccum * WHEEL_TO_Y, topBorder(), botBorder());
      wheelDir = Math.sign(wheelAccum);
      wheelAccum = 0;
    }

    if (isTouch) {
      if (!inSubPage()) wheelDir = followScroll();
    } else if (!inSubPage()) {
      if (!built) {
        applyBuildBinding();
        if (normY() >= BUILD_COMPLETE_AT) {
          built = true;
          lastScrollY = window.scrollY;
          if (!rotateHintShown) { rotateHintShown = true; scheduleRotateHint(); }
        }
      } else {
        const ds = window.scrollY - lastScrollY;
        if (ds !== 0) {
          const range = Math.max(1, botBorder() - topBorder());
          y = clamp(y + ds * (range / maxScroll()), topBorder(), botBorder());
          wheelDir = Math.sign(ds);
          lastScrollY = window.scrollY;
        }
        if (window.scrollY <= 1) { built = false; y = topBorder(); lastScrollY = 0; }
      }
    }

    if (anyInput) { const r = dirRowFromVector(dx, dy); if (r !== null) row = r; }
    else if (wheelDir !== 0) row = wheelDir < 0 ? DIR_ORDER.indexOf('north') : DIR_ORDER.indexOf('south');

    const moved = Math.hypot(x - prevX, y - prevY);
    if (moved > 0.4) {
      distAcc += moved;
      while (distAcc >= WALK_STRIDE_PX) { distAcc -= WALK_STRIDE_PX; frame = (frame + 1) % 8; }
    } else { frame = 0; distAcc = 0; }

    if (!isTouch && !hintUp && !eDown) {
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

  if (isTouch) followScroll();
  draw();
  requestAnimationFrame(tick);
  sayHint(isTouch ? 'Welcome! Scroll down.' : 'Welcome! Press down arrow, S, or scroll down.', { dismissOnInput: true });
})();
