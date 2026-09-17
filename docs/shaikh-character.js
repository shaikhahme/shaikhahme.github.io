/* A playable "Shaikh" sprite that roams on top of the whole page.
   The character, its 8-direction walk spritesheet, and the direction logic are
   ported straight from the s345 "Roommates" Phaser game (shaikh_walk.png):
     - shaikh_walk.png is 384x384, an 8x8 grid of 48x48 frames.
     - one ROW per facing direction, in DIR_ORDER order, 8 walk frames per row.
     - direction is chosen from the movement vector exactly as the game's
       dirRowFromVector() does, via SLICE_TABLE.
   Arrow keys / WASD walk it around the viewport. Vertical movement also drives
   the page's own scroll, which is what scrubs the compass/sphere build timeline
   (see continuous.js) - so walking Shaikh DOWN builds the scene and walking him
   UP rewinds it. The sprite is fixed-position and z-indexed above everything,
   including the zoom-page overlays. */
(function () {
  // Keyboard-only; skip on touch-primary devices where there's nothing to drive it.
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return;

  const FRAME = 48;          // source frame size in the sheet
  const SCALE = 2;           // drawn at 2x, like the game's PLAYER_SCALE
  const SIZE = FRAME * SCALE; // 96px on screen
  const SHEET = FRAME * 8;   // 384 source sheet is 8 frames wide/tall
  const WALK_FPS = 9;        // matches the game
  const MOVE_SPEED = 4.2;    // px per frame the sprite travels
  const SCROLL_SPEED = 16;   // px per frame the page scrolls from vertical input

  // Same tables as the s345 game. Row index into the sheet == DIR_ORDER index.
  const DIR_ORDER = ["south", "south-east", "east", "north-east", "north", "north-west", "west", "south-west"];
  const SLICE_TABLE = ["east", "south-east", "south", "south-west", "west", "north-west", "north", "north-east"];
  function dirRowFromVector(dx, dy) {
    if (dx === 0 && dy === 0) return null;
    const deg = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
    const name = SLICE_TABLE[Math.round(deg / 45) % 8];
    return DIR_ORDER.indexOf(name);
  }

  // ---- the sprite element ----
  const el = document.createElement('div');
  el.id = 'shaikh';
  el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);

  // ---- a one-time hint ----
  const hint = document.createElement('p');
  hint.id = 'shaikh-hint';
  hint.textContent = 'Arrow keys / WASD to walk Shaikh · walk down to build, up to rewind';
  document.body.appendChild(hint);

  // Start roughly centred horizontally, a little below the middle so there's
  // room to walk him down into the scroll.
  let x = window.innerWidth / 2 - SIZE / 2;
  let y = window.innerHeight * 0.55;

  let row = 0;               // current facing row (0 = south, toward the viewer)
  let frame = 0;             // current walk frame within the row
  let moving = false;
  let animAcc = 0;           // time accumulator for frame stepping
  let last = performance.now();
  let hintShown = false;

  function draw() {
    el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    // background-position picks the (frame, row) cell out of the 2x-scaled sheet.
    el.style.backgroundPosition = `-${frame * SIZE}px -${row * SIZE}px`;
  }

  // ---- input ----
  const held = new Set();
  const MOVE_KEYS = new Set([
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'
  ]);
  window.addEventListener('keydown', e => {
    if (!MOVE_KEYS.has(e.key)) return;
    // stop the browser from also arrow-scrolling the page - Shaikh owns vertical scroll now.
    e.preventDefault();
    held.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    if (!hintShown) { hintShown = true; hint.classList.add('fade'); }
  }, { passive: false });
  window.addEventListener('keyup', e => {
    held.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  });
  // Don't leave keys "stuck" if focus leaves the window mid-press.
  window.addEventListener('blur', () => held.clear());

  function inputVector() {
    let dx = 0, dy = 0;
    if (held.has('ArrowLeft') || held.has('a')) dx -= 1;
    if (held.has('ArrowRight') || held.has('d')) dx += 1;
    if (held.has('ArrowUp') || held.has('w')) dy -= 1;
    if (held.has('ArrowDown') || held.has('s')) dy += 1;
    return { dx, dy };
  }

  function tick(now) {
    requestAnimationFrame(tick);
    const dt = now - last;
    last = now;

    const { dx, dy } = inputVector();
    moving = dx !== 0 || dy !== 0;

    if (moving) {
      const len = Math.hypot(dx, dy);
      const nx = (dx / len), ny = (dy / len);
      x += nx * MOVE_SPEED;
      y += ny * MOVE_SPEED;

      // Vertical input also scrolls the page, which scrubs the compass timeline.
      if (dy !== 0) window.scrollBy(0, ny * SCROLL_SPEED);

      const r = dirRowFromVector(dx, dy);
      if (r !== null) row = r;

      // Advance the walk cycle at WALK_FPS.
      animAcc += dt;
      const step = 1000 / WALK_FPS;
      while (animAcc >= step) { animAcc -= step; frame = (frame + 1) % 8; }
    } else {
      // Idle: rest on the first (standing) frame of whatever way he's facing.
      frame = 0;
      animAcc = 0;
    }

    // Keep him on screen (fixed to the viewport, so use innerWidth/Height).
    x = Math.max(0, Math.min(window.innerWidth - SIZE, x));
    y = Math.max(0, Math.min(window.innerHeight - SIZE, y));

    draw();
  }

  window.addEventListener('resize', () => {
    x = Math.max(0, Math.min(window.innerWidth - SIZE, x));
    y = Math.max(0, Math.min(window.innerHeight - SIZE, y));
  });

  draw();
  requestAnimationFrame(tick);
})();
