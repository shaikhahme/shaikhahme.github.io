(function () {
  'use strict';

  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rng = mulberry32(1337);
  const rand = (min, max) => min + rng() * (max - min);

  function para(text) { return `<p>${text}</p>`; }

  const FILLER_PAGES = (label) => [
    { title: `${label} — Ch. 1`, body: [
      para('Placeholder text. This spine is a stand-in for a future project or write-up — swap the title and these pages out once the real content exists.'),
      para('Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.')
    ]},
    { title: `${label} — Ch. 2`, body: [
      para('Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo.'),
      para('Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.')
    ]}
  ];

  const BOOKS = {
    mystory: {
      id: 'mystory', title: 'My Story', real: true, color: '#b3541e',
      pages: [
        { title: 'Prologue', body: [
          para('Placeholder foreword. This is where the personal narrative goes — how I got here, what shaped the way I work.'),
        ]},
        { title: 'Early Chapters', body: [
          para('A few formative placeholder beats: first computer, first break-in (the good kind), first time something I built actually shipped.'),
        ]},
        { title: 'What I’m Chasing', body: [
          para('Placeholder close: the throughline connecting alignment, security, and everything shelved here.'),
        ]}
      ]
    },
    alignment: {
      id: 'alignment', title: 'AI Alignment', real: true, color: '#2f8f5b',
      pages: [
        { title: 'Why Alignment', body: [
          para('Placeholder intro to the alignment work — the problems that keep systems pointed at what people actually want.'),
        ]},
        { title: 'Selected Work', body: [
          para('Placeholder project rundown: evals, interpretability, or policy work would live here.'),
        ]},
        { title: 'Open Questions', body: [
          para('Placeholder closing thoughts on what’s still unresolved in this space.'),
        ]}
      ]
    },
    aisecurity: {
      id: 'aisecurity', title: 'AI Security', real: true, color: '#a5333a',
      pages: [
        { title: 'Attacking & Defending Models', body: [
          para('Placeholder intro — prompt injection, model extraction, and the rest of the AI-specific threat surface.'),
        ]},
        { title: 'Case Studies', body: [
          para('Placeholder write-ups of specific red-team or defense work on ML systems.'),
        ]},
        { title: 'Where It’s Headed', body: [
          para('Placeholder closing notes on the evolving threat landscape.'),
        ]}
      ]
    },
    cybersecurity: {
      id: 'cybersecurity', title: 'Cybersecurity', real: true, color: '#2a5fa5',
      pages: [
        { title: 'The Fundamentals', body: [
          para('Placeholder intro to the traditional security work — the systems, not just the models.'),
        ]},
        { title: 'Selected Engagements', body: [
          para('Placeholder rundown of pentests, CTFs, or infra hardening work.'),
        ]},
        { title: 'Lessons Learned', body: [
          para('Placeholder closing thoughts on the discipline.'),
        ]}
      ]
    }
  };
  for (let i = 1; i <= 10; i++) {
    const id = 'book' + i;
    BOOKS[id] = { id, title: 'Book ' + i, real: false, color: null, pages: FILLER_PAGES('Book ' + i) };
  }

  const FILLER_COLORS = ['#5b4636', '#726a95', '#4f6d5c', '#8a6b3d', '#5c5470', '#7a4b52', '#3f5e5a', '#6e5849', '#4a5b6e', '#71533f'];
  let fillerColorIdx = 0;
  Object.keys(BOOKS).forEach((k) => {
    if (!BOOKS[k].color) BOOKS[k].color = FILLER_COLORS[fillerColorIdx++ % FILLER_COLORS.length];
  });

  const SHELVES = [
    { id: 's1', label: 'Currently Reading', books: ['mystory', 'book1', 'book2'] },
    { id: 's2', label: 'AI & Alignment', books: ['alignment', 'book3', 'book4', 'book5'] },
    { id: 's3', label: 'Security', books: ['aisecurity', 'cybersecurity', 'book6', 'book7'] },
    { id: 's4', label: 'Archives', books: ['book8', 'book9', 'book10'] }
  ];

  function pageDoc(book, page, side, pageNum) {
    const accent = book.color;
    const arrow = side === 'right' ? '›' : '‹';
    const align = side === 'right' ? 'right' : 'left';
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      * { box-sizing: border-box; }
      html,body { margin:0; height:100%; font-family: 'IM Fell English', Georgia, serif; background:#f4ecd8;
        background-image: radial-gradient(circle at 20% 10%, rgba(0,0,0,0.03), transparent 60%);
        color:#2b1c12; cursor: pointer; user-select: none; }
      .wrap { padding: 2.1rem 2.3rem; height:100%; overflow:auto; }
      .eyebrow { font-size:0.68rem; letter-spacing:0.14em; text-transform:uppercase; color:${accent}; margin:0 0 0.3rem; opacity:0.85; }
      h1 { font-size:1.35rem; margin:0 0 0.9rem; border-bottom:2px solid ${accent}55; padding-bottom:0.4rem; }
      p { font-size:1rem; line-height:1.55; margin:0 0 0.9rem; }
      .pgnum { position:absolute; bottom:0.7rem; ${align}:1rem; font-size:0.75rem; opacity:0.55; }
      .hint { position:absolute; top:50%; ${align}:0.4rem; transform:translateY(-50%); font-size:1.6rem; opacity:0; color:${accent}; transition:opacity 0.15s; }
      body:hover .hint { opacity:0.45; }
    </style></head><body>
      <div class="wrap">
        <p class="eyebrow">${book.title}</p>
        <h1>${page.title}</h1>
        ${page.body.join('')}
      </div>
      <span class="pgnum">${pageNum}</span>
      <span class="hint">${arrow}</span>
      <script>
        document.addEventListener('click', function () {
          try { window.parent.bookApi['${side === 'right' ? 'next' : 'prev'}'](); } catch (e) {}
        });
      <\/script>
    </body></html>`;
  }

  function blankDoc(side, kind) {
    const label = kind === 'front' ? 'Front Cover' : kind === 'back' ? 'The End' : '';
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      html,body{margin:0;height:100%;background:#efe4c9;cursor:pointer;}
      .c{height:100%;display:flex;align-items:center;justify-content:center;font-family:'IM Fell English',Georgia,serif;color:#8a7a5f;font-style:italic;font-size:0.95rem;}
    </style></head><body><div class="c">${label}</div>
      <script>
        document.addEventListener('click', function () {
          try { window.parent.bookApi['${side === 'right' ? 'next' : 'prev'}'](); } catch (e) {}
        });
      <\/script>
    </body></html>`;
  }

  const shelfWrap = document.getElementById('shelfWrap');
  const overlay = document.getElementById('bookOverlay');
  const bookStage = document.getElementById('bookStage');
  const iframeLeft = document.getElementById('iframeLeft');
  const iframeRight = document.getElementById('iframeRight');
  const flipLeaf = document.getElementById('flipLeaf');
  const iframeLeaf = document.getElementById('iframeLeaf');
  const bookTitlePlate = document.getElementById('bookTitlePlate');
  const closeZone = document.getElementById('closeZone');
  const slider = document.getElementById('pageSlider');
  const pageIndicator = document.getElementById('pageIndicator');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  const state = { isOpen: false, isFlipping: false, book: null, spread: 0, spineEl: null };

  function totalSpreads(book) { return Math.max(1, Math.ceil(book.pages.length / 2)); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function renderSpread(spread) {
    const book = state.book;
    const leftPage = book.pages[spread * 2];
    const rightPage = book.pages[spread * 2 + 1];
    iframeLeft.srcdoc = leftPage ? pageDoc(book, leftPage, 'left', spread * 2 + 1) : blankDoc('left', spread === 0 ? 'front' : '');
    iframeRight.srcdoc = rightPage ? pageDoc(book, rightPage, 'right', spread * 2 + 2) : blankDoc('right', 'back');
    slider.value = spread;
    pageIndicator.textContent = `Spread ${spread + 1} / ${totalSpreads(book)}`;
  }

  function setupSlider(book) {
    slider.min = 0;
    slider.max = totalSpreads(book) - 1;
    slider.value = 0;
  }

  function goTo(newSpread) {
    if (!state.isOpen || state.isFlipping) return;
    const book = state.book;
    newSpread = clamp(newSpread, 0, totalSpreads(book) - 1);
    if (newSpread === state.spread) return;
    const forward = newSpread > state.spread;
    playFlip(forward, newSpread);
  }

  function playFlip(forward, newSpread) {
    state.isFlipping = true;
    const book = state.book;
    const movingPage = forward ? book.pages[state.spread * 2 + 1] : book.pages[state.spread * 2];
    const side = forward ? 'right' : 'left';
    iframeLeaf.srcdoc = movingPage ? pageDoc(book, movingPage, side, forward ? state.spread * 2 + 2 : state.spread * 2 + 1)
      : blankDoc(side, forward ? 'back' : (state.spread === 0 ? 'front' : ''));

    flipLeaf.classList.toggle('leaf-back-origin', !forward);
    flipLeaf.style.transition = 'none';
    flipLeaf.style.transform = 'rotateY(0deg)';
    flipLeaf.style.opacity = '1';
    flipLeaf.classList.add('leaf-active');
    void flipLeaf.offsetHeight;

    requestAnimationFrame(() => {
      flipLeaf.style.transition = 'transform 0.62s cubic-bezier(.4,.05,.2,1), opacity 0.3s ease 0.32s';
      flipLeaf.style.transform = `rotateY(${forward ? -150 : 150}deg)`;
      flipLeaf.style.opacity = '0';
    });

    setTimeout(() => {
      state.spread = newSpread;
      renderSpread(state.spread);
    }, 310);

    setTimeout(() => {
      flipLeaf.classList.remove('leaf-active', 'leaf-back-origin');
      flipLeaf.style.transition = 'none';
      flipLeaf.style.transform = 'rotateY(0deg)';
      iframeLeaf.srcdoc = '';
      state.isFlipping = false;
    }, 640);
  }

  function openBook(book, spineEl) {
    if (state.isOpen) return;
    state.book = book;
    state.spread = 0;
    state.spineEl = spineEl;

    const rect = spineEl.getBoundingClientRect();
    spineEl.classList.add('is-hidden');

    overlay.hidden = false;
    bookTitlePlate.textContent = book.title;
    setupSlider(book);
    renderSpread(0);

    requestAnimationFrame(() => overlay.classList.add('is-visible'));

    const stageRect = bookStage.getBoundingClientRect();
    const dx = rect.left + rect.width / 2 - (stageRect.left + stageRect.width / 2);
    const dy = rect.top + rect.height / 2 - (stageRect.top + stageRect.height / 2);
    const scaleX = rect.width / stageRect.width;
    const scaleY = rect.height / stageRect.height;

    bookStage.style.transition = 'none';
    bookStage.style.opacity = '0.85';
    bookStage.style.transform = `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY}) rotateY(75deg)`;
    void bookStage.offsetHeight;

    requestAnimationFrame(() => {
      bookStage.style.transition = 'transform 0.6s cubic-bezier(.2,.8,.2,1), opacity 0.4s ease';
      bookStage.style.transform = 'translate(0px, 0px) scale(1, 1) rotateY(0deg)';
      bookStage.style.opacity = '1';
    });

    state.isOpen = true;
  }

  function closeBook() {
    if (!state.isOpen || state.isFlipping) return;
    const rect = state.spineEl.getBoundingClientRect();
    const stageRect = bookStage.getBoundingClientRect();
    const dx = rect.left + rect.width / 2 - (stageRect.left + stageRect.width / 2);
    const dy = rect.top + rect.height / 2 - (stageRect.top + stageRect.height / 2);
    const scaleX = rect.width / stageRect.width;
    const scaleY = rect.height / stageRect.height;

    bookStage.style.transition = 'transform 0.55s cubic-bezier(.4,0,.2,1), opacity 0.45s ease';
    bookStage.style.transform = `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY}) rotateY(75deg)`;
    bookStage.style.opacity = '0.6';
    overlay.classList.remove('is-visible');

    const spineEl = state.spineEl;
    setTimeout(() => {
      overlay.hidden = true;
      spineEl.classList.remove('is-hidden');
      bookStage.style.transition = 'none';
      bookStage.style.transform = '';
      bookStage.style.opacity = '';
      iframeLeft.srcdoc = '';
      iframeRight.srcdoc = '';
      state.isOpen = false;
      state.book = null;
      state.spineEl = null;
    }, 560);
  }

  window.bookApi = {
    next: () => goTo(state.spread + 1),
    prev: () => goTo(state.spread - 1)
  };

  document.getElementById('pageLeft').addEventListener('click', () => goTo(state.spread - 1));
  document.getElementById('pageRight').addEventListener('click', () => goTo(state.spread + 1));
  prevBtn.addEventListener('click', () => goTo(state.spread - 1));
  nextBtn.addEventListener('click', () => goTo(state.spread + 1));
  slider.addEventListener('input', () => {
    if (!state.isOpen) return;
    state.spread = clamp(parseInt(slider.value, 10) || 0, 0, totalSpreads(state.book) - 1);
    renderSpread(state.spread);
  });
  closeZone.addEventListener('click', closeBook);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeBook();
    if (!state.isOpen) return;
    if (e.key === 'ArrowRight') goTo(state.spread + 1);
    if (e.key === 'ArrowLeft') goTo(state.spread - 1);
  });

  function renderShelves() {
    SHELVES.forEach((shelf) => {
      const layer = document.createElement('section');
      layer.className = 'shelf-layer';
      const label = document.createElement('div');
      label.className = 'shelf-label';
      label.textContent = shelf.label;
      const board = document.createElement('div');
      board.className = 'shelf-board';

      shelf.books.forEach((bookId) => {
        const book = BOOKS[bookId];
        const spine = document.createElement('button');
        spine.type = 'button';
        spine.className = 'book-spine' + (book.real ? '' : ' filler');
        const w = Math.round(rand(46, 66));
        const h = Math.round(rand(175, 245));
        const tilt = rand(-4, 4).toFixed(1);
        const lift = Math.round(rand(-8, 10));
        spine.style.width = w + 'px';
        spine.style.height = h + 'px';
        spine.style.transform = `translateY(${lift}px) rotate(${tilt}deg)`;
        spine.style.background = `linear-gradient(180deg, ${book.color}, ${shadeColor(book.color, -18)})`;
        const titleSpan = document.createElement('span');
        titleSpan.className = 'spine-title';
        titleSpan.textContent = book.title;
        spine.appendChild(titleSpan);
        spine.addEventListener('click', () => openBook(book, spine));
        board.appendChild(spine);
      });

      layer.appendChild(label);
      layer.appendChild(board);
      shelfWrap.appendChild(layer);
    });
  }

  function shadeColor(hex, pct) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) + Math.round(255 * (pct / 100));
    let g = ((n >> 8) & 0xff) + Math.round(255 * (pct / 100));
    let b = (n & 0xff) + Math.round(255 * (pct / 100));
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return `rgb(${r},${g},${b})`;
  }

  const GLASS_COLORS = ['#7b2ff7', '#f72585', '#4cc9f0', '#ffb703', '#2ec4b6', '#e63946', '#3a86ff', '#ffd166'];

  function buildGlass(mode) {
    const svg = document.getElementById('glassSvg');
    svg.innerHTML = '';
    const NS = 'http://www.w3.org/2000/svg';
    const w = 1600, h = 900;
    if (mode === 'pixel') {
      const cols = 20, rows = 12;
      const cw = w / cols, ch = h / rows;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const rect = document.createElementNS(NS, 'rect');
          rect.setAttribute('x', x * cw);
          rect.setAttribute('y', y * ch);
          rect.setAttribute('width', cw);
          rect.setAttribute('height', ch);
          rect.setAttribute('fill', GLASS_COLORS[Math.floor(rng() * GLASS_COLORS.length)]);
          rect.setAttribute('fill-opacity', (0.5 + rng() * 0.35).toFixed(2));
          rect.setAttribute('stroke', '#0c0710');
          rect.setAttribute('stroke-width', '3');
          svg.appendChild(rect);
        }
      }
    } else {
      const cols = 8, rows = 5;
      const cw = w / cols, ch = h / rows;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const cx = x * cw, cy = y * ch;
          const jitter = () => rand(-14, 14);
          const pts = [
            [cx + jitter(), cy + jitter()],
            [cx + cw + jitter(), cy + jitter()],
            [cx + cw + jitter(), cy + ch + jitter()],
            [cx + jitter(), cy + ch + jitter()]
          ];
          const poly = document.createElementNS(NS, 'polygon');
          poly.setAttribute('points', pts.map((p) => p.join(',')).join(' '));
          poly.setAttribute('fill', GLASS_COLORS[Math.floor(rng() * GLASS_COLORS.length)]);
          poly.setAttribute('fill-opacity', (0.4 + rng() * 0.35).toFixed(2));
          poly.setAttribute('stroke', '#0c0710');
          poly.setAttribute('stroke-width', '5');
          svg.appendChild(poly);
        }
      }
    }
  }

  const lightOverlay = document.getElementById('lightOverlay');
  document.addEventListener('mousemove', (e) => {
    const xp = (e.clientX / window.innerWidth * 100).toFixed(1);
    const yp = (e.clientY / window.innerHeight * 100).toFixed(1);
    lightOverlay.style.setProperty('--mx', xp + '%');
    lightOverlay.style.setProperty('--my', yp + '%');
  });

  const skinBtns = document.querySelectorAll('[data-skin-btn]');
  skinBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const skin = btn.getAttribute('data-skin-btn');
      document.documentElement.setAttribute('data-skin', skin);
      skinBtns.forEach((b) => b.classList.toggle('active', b === btn));
      buildGlass(skin);
    });
  });

  renderShelves();
  buildGlass('pixel');
})();
