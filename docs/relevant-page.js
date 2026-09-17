/* Phase 3/4: the "relevant page" a label's overlay zooms into - a short note,
   a vertically scrollable projects list, and a right sidebar that plays a
   timer-driven (not scroll-linked) mind map, step by step, when a project is
   clicked: each step's shape draws in, an arrow draws down from the previous
   step, then its title/description type out - the same drawing language as
   the compass arrows in phase 1, just vertical and on a timer instead of tied
   to scroll. Every one of the sphere's 10 clickable labels (4 axes + 6
   concept vectors) opens this same view, filtered to the projects in
   data/projects.json whose tags include that label - see RELEVANT_PAGE_ALIASES
   below for the one label/tag spelling mismatch. The per-topic "short note"
   is placeholder copy for now; real per-topic prose doesn't exist yet. */

// The sphere's "Artificial Intelligence" axis label doesn't match any tag
// verbatim - every project instead uses the shorter "AI" tag - so alias it.
const RELEVANT_PAGE_ALIASES = {
    'Artificial Intelligence': 'AI'
};

function relevantPageTagFor(label) {
    return RELEVANT_PAGE_ALIASES[label] || label;
}

/* Timing is driven by requestAnimationFrame rather than setTimeout/setInterval
   throughout this file - some environments this page runs in throttle plain
   timers down to roughly one callback per second (a background-tab
   power-saving policy), which made typing crawl at ~1 character/second, while
   rAF (which drives the page's actual rendering) kept ticking normally. */
function relevantPageSleep(ms, token) {
    return new Promise(resolve => {
        const start = performance.now();
        function frame(now) {
            if ((token && token.cancelled) || now - start >= ms) { resolve(); return; }
            requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
    });
}

function relevantPageTypeText(el, text, msPerChar, token) {
    return new Promise(resolve => {
        const start = performance.now();
        function frame(now) {
            if (token.cancelled) { resolve(); return; }
            const chars = Math.min(text.length, Math.floor((now - start) / msPerChar));
            el.textContent = text.slice(0, chars);
            if (chars >= text.length) { resolve(); return; }
            requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
    });
}

function relevantPageGrowArrow(container, token) {
    return new Promise(resolve => {
        const wrap = document.createElement('div');
        wrap.className = 'mindmap-arrow';
        const line = document.createElement('div');
        line.className = 'mindmap-arrow-line';
        const head = document.createElement('div');
        head.className = 'mindmap-arrow-head';
        wrap.appendChild(line);
        wrap.appendChild(head);
        container.appendChild(wrap);

        const TARGET_PX = 32;
        const DURATION_MS = 280;
        const start = performance.now();
        function frame(now) {
            if (token.cancelled) { resolve(); return; }
            const t = Math.min(1, (now - start) / DURATION_MS);
            line.style.height = (TARGET_PX * t) + 'px';
            head.style.opacity = t > 0.85 ? '1' : '0';
            if (t < 1) requestAnimationFrame(frame);
            else resolve();
        }
        requestAnimationFrame(frame);
    });
}

/* Slides the sidebar in/out via a translateX tween (same rAF-driven approach
   as the rest of this file/zoom-anim.js, rather than a CSS `transition`). */
function relevantPageSlideSidebar(el, fromPct, toPct, duration, onDone) {
    const start = performance.now();
    function frame(now) {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        el.style.transform = `translateX(${fromPct + (toPct - fromPct) * eased}%)`;
        if (t < 1) requestAnimationFrame(frame);
        else if (onDone) onDone();
    }
    requestAnimationFrame(frame);
}

/* Step "type" (not a raw shape) drives both the geometry and the border
   color - see design.md's phase 4 mind-map legend:
   arbitrary -> black rectangle, decision -> diamond, ai -> red rectangle,
   output -> green rectangle. */
const MINDMAP_TYPE_SHAPE = {
    arbitrary: 'rectangle',
    decision: 'diamond',
    ai: 'rectangle',
    output: 'rectangle'
};

function relevantPageCreateShapeEl(type) {
    const shape = MINDMAP_TYPE_SHAPE[type] || 'rectangle';
    const el = document.createElement('div');
    el.className = 'mindmap-shape mindmap-shape-' + shape + ' mindmap-type-' + (MINDMAP_TYPE_SHAPE[type] ? type : 'arbitrary');
    const inner = document.createElement('div');
    inner.className = 'mindmap-shape-inner';
    const title = document.createElement('p');
    title.className = 'mindmap-title';
    const desc = document.createElement('p');
    desc.className = 'mindmap-desc';
    inner.appendChild(title);
    inner.appendChild(desc);
    el.appendChild(inner);
    return { el, title, desc };
}

async function relevantPagePlayMindmap(container, steps, token) {
    container.innerHTML = '';
    const ordered = [...steps].sort((a, b) => a.step - b.step);
    for (let i = 0; i < ordered.length; i++) {
        if (token.cancelled) return;
        if (i > 0) {
            await relevantPageGrowArrow(container, token);
            if (token.cancelled) return;
        }
        const step = ordered[i];
        const { el, title, desc } = relevantPageCreateShapeEl(step.type);
        container.appendChild(el);
        await relevantPageTypeText(title, step.title, 35, token);
        if (token.cancelled) return;
        await relevantPageTypeText(desc, step.description, 18, token);
        if (token.cancelled) return;
        await relevantPageSleep(250, token);
    }
}

/* The life timeline (center label) auto-plays and, unlike a project's
   mind-map, never just sits there once finished - it loops back to step 1
   for as long as the sidebar stays open (token.cancelled, set by
   closeSidebar/openProject, is what ends it). */
async function relevantPagePlayMindmapLoop(container, steps, token) {
    while (!token.cancelled) {
        await relevantPagePlayMindmap(container, steps, token);
        if (token.cancelled) return;
        await relevantPageSleep(900, token);
    }
}

/* Every row's rendered *bottom edge* needs to land on a multiple of 36 (the
   ruled-paper spacing) for the row after it to stay on the grid too -
   `min-height: 108px` (3 rule-lines, see shared.css) only guarantees that for
   a row whose name/description/tags happen to fit in exactly three lines.
   Real project descriptions wrap to all kinds of line counts, so most rows
   render taller than that and land on an arbitrary height instead - dragging
   every row below the first mismatched one off the grid. Rather than cap
   each row's height (which is exactly the fixed-height + overflow:hidden bug
   that used to clip long titles - see the CSS comment on .project-row), this
   pads each row's bottom out to the next multiple of 36, snapping its bottom
   edge back onto a rule line. Re-run on resize since wrapping (and so
   height) depends on the container's width.
   Processed top-to-bottom, measuring each row's *actual rendered position*
   relative to the list rather than assuming heights simply add up - rows
   overlap by 1px each (`.project-row:not(:first-child) { margin-top: -1px }`,
   collapsing adjacent borders into one line), which would otherwise
   accumulate into a growing drift row by row if each row's fix only
   accounted for its own height in isolation.
   `.project-row` uses `justify-content: flex-start` (not `center`) so this
   only ever adds trailing whitespace below a card's content - it never
   shifts the content itself. */
const RULE_SPACING = 36;
function relevantPageSnapRowsToRuleGrid(listEl) {
    const rows = listEl.querySelectorAll('.project-row');
    rows.forEach(row => { row.style.paddingBottom = ''; });
    const listTop = listEl.getBoundingClientRect().top;
    rows.forEach(row => {
        const relBottom = Math.round(row.getBoundingClientRect().bottom - listTop);
        const extra = (RULE_SPACING - relBottom % RULE_SPACING) % RULE_SPACING;
        if (extra) row.style.paddingBottom = `${16 + extra}px`;
    });
}

/* The center "Shaikh's Virtues" label's page has no project list of its own
   (see isLifeTimeline below), so instead of a placeholder note it renders the
   full human-written essay from data/virtues.json - the essay's own
   paragraphs/quotes/headings, then an AI-generated "Where this reaches"
   section mapping the essay's three pillars onto the sphere's other nine
   labels, closing with that section's own AI-disclosure line. All HTML here
   comes from our own authored JSON, never user input, so building it via
   innerHTML is fine. */
function relevantPageRenderVirtuesBlock(block) {
    const el = document.createElement(block.type === 'heading' ? 'h2' : block.type === 'quote' ? 'blockquote' : 'p');
    el.className = 'virtues-' + block.type;
    el.innerHTML = block.html;
    return el;
}

function relevantPageRenderVirtuesContent(container, data) {
    container.innerHTML = '';

    const authorNote = document.createElement('p');
    authorNote.className = 'virtues-author-note';
    authorNote.innerHTML = data.human.authorNote;
    container.appendChild(authorNote);

    data.human.blocks.forEach(block => {
        container.appendChild(relevantPageRenderVirtuesBlock(block));
    });

    const hr = document.createElement('hr');
    hr.className = 'virtues-divider';
    container.appendChild(hr);

    const relHeading = document.createElement('h2');
    relHeading.className = 'virtues-heading';
    relHeading.textContent = data.relationships.heading;
    container.appendChild(relHeading);

    const relIntro = document.createElement('p');
    relIntro.className = 'virtues-paragraph';
    relIntro.innerHTML = data.relationships.intro;
    container.appendChild(relIntro);

    data.relationships.items.forEach(item => {
        const row = document.createElement('p');
        row.className = 'virtues-relationship';
        row.innerHTML = `<strong>${item.concept}</strong> &mdash; ${item.html}`;
        container.appendChild(row);
    });

    const disclosure = document.createElement('p');
    disclosure.className = 'virtues-ai-disclosure';
    disclosure.textContent = data.relationships.aiDisclosure;
    container.appendChild(disclosure);
}

function relevantPageRenderProjectsList(listEl, projects, onSelect) {
    listEl.innerHTML = '';
    projects.forEach(project => {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'project-row';

        const name = document.createElement('div');
        name.className = 'project-name';
        name.textContent = project.name;

        const desc = document.createElement('div');
        desc.className = 'project-desc';
        desc.textContent = project.description;

        const tags = document.createElement('div');
        tags.className = 'project-tags';
        project.tags.forEach(tag => {
            const span = document.createElement('span');
            span.className = 'project-tag';
            span.textContent = tag;
            tags.appendChild(span);
        });

        row.appendChild(name);
        row.appendChild(desc);
        row.appendChild(tags);
        row.addEventListener('click', () => onSelect(project, row));
        listEl.appendChild(row);
    });
    relevantPageSnapRowsToRuleGrid(listEl);
}

async function renderRelevantPage(container, onBack, label, isLifeTimeline) {
    container.innerHTML = '';

    const page = document.createElement('div');
    page.className = 'relevant-page';

    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'zoom-page-back relevant-back';
    back.textContent = '←';
    back.title = 'Back to sphere';
    back.setAttribute('aria-label', 'Back to sphere');
    back.addEventListener('click', onBack);

    const main = document.createElement('div');
    main.className = 'relevant-main';

    const title = document.createElement('h1');
    title.className = 'relevant-title';

    const note = document.createElement('p');
    note.className = 'relevant-note';

    const projectsHeading = document.createElement('h2');
    projectsHeading.className = 'relevant-projects-heading';
    projectsHeading.textContent = 'Projects';

    const list = document.createElement('div');
    list.className = 'projects-list';

    main.appendChild(title);
    main.appendChild(note);
    // The life timeline has no project list of its own - see isLifeTimeline
    // below - it gets the virtues essay/relationships content instead.
    const virtuesContent = document.createElement('div');
    virtuesContent.className = 'virtues-content';
    if (!isLifeTimeline) {
        main.appendChild(projectsHeading);
        main.appendChild(list);
    } else {
        main.appendChild(virtuesContent);
    }

    const sidebar = document.createElement('aside');
    sidebar.className = 'mindmap-sidebar';

    page.appendChild(back);
    page.appendChild(main);
    page.appendChild(sidebar);
    container.appendChild(page);

    const SIDEBAR_SLIDE_MS = 320;
    let currentToken = null;
    let activeRow = null;

    function closeSidebar() {
        if (currentToken) currentToken.cancelled = true;
        if (activeRow) activeRow.classList.remove('is-active');
        activeRow = null;
        if (!sidebar.classList.contains('is-open')) return;
        relevantPageSlideSidebar(sidebar, 0, 100, SIDEBAR_SLIDE_MS, () => {
            sidebar.classList.remove('is-open');
            sidebar.innerHTML = '';
        });
    }

    // Shared by openProject and openLifeTimeline below - handles the sidebar's
    // slide-in (or, if it's already open, just resets it to resting position
    // before the new content replaces the old).
    function openSidebar() {
        const wasOpen = sidebar.classList.contains('is-open');
        sidebar.innerHTML = '';
        sidebar.classList.add('is-open');
        if (wasOpen) {
            sidebar.style.transform = 'translateX(0%)';
        } else {
            sidebar.style.transform = 'translateX(100%)';
            relevantPageSlideSidebar(sidebar, 100, 0, SIDEBAR_SLIDE_MS);
        }
    }

    function openProject(project, row) {
        if (currentToken) currentToken.cancelled = true;
        if (activeRow) activeRow.classList.remove('is-active');
        activeRow = row;
        row.classList.add('is-active');

        openSidebar();

        const header = document.createElement('div');
        header.className = 'mindmap-sidebar-header';
        const name = document.createElement('h3');
        name.textContent = project.name;
        const desc = document.createElement('p');
        desc.textContent = project.description;
        const link = document.createElement('a');
        link.href = project.link;
        link.textContent = project.link;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        header.appendChild(name);
        header.appendChild(desc);
        header.appendChild(link);

        const flow = document.createElement('div');
        flow.className = 'mindmap-flow';

        sidebar.appendChild(header);
        sidebar.appendChild(flow);

        const token = { cancelled: false };
        currentToken = token;
        relevantPagePlayMindmap(flow, project.mindmap, token);
    }

    // The center "Shaikh's Virtues" label's page: no project to click, the
    // sidebar opens itself and plays the life timeline (one arbitrary step per
    // milestone, per design.md's mind-map legend - these are just life events,
    // not decisions/AI-steps/outputs) on a loop for as long as it stays open.
    async function openLifeTimeline() {
        if (currentToken) currentToken.cancelled = true;
        if (activeRow) activeRow.classList.remove('is-active');
        activeRow = null;

        openSidebar();

        const header = document.createElement('div');
        header.className = 'mindmap-sidebar-header';
        const name = document.createElement('h3');
        name.textContent = 'The Timeline';
        header.appendChild(name);

        const flow = document.createElement('div');
        flow.className = 'mindmap-flow';

        sidebar.appendChild(header);
        sidebar.appendChild(flow);

        const token = { cancelled: false };
        currentToken = token;

        try {
            const res = await fetch('/data/timeline.json');
            const milestones = await res.json();
            const steps = milestones.map((m, i) => ({
                step: i + 1,
                type: 'arbitrary',
                title: `${m.age} — ${m.title}`,
                description: m.text
            }));
            relevantPagePlayMindmapLoop(flow, steps, token);
        } catch (e) {
            flow.textContent = 'Failed to load the timeline.';
        }
    }

    // "Click in the centre area" closes the sidebar - anywhere in the main
    // column that isn't a project row itself.
    main.addEventListener('click', event => {
        if (event.target.closest('.project-row')) return;
        closeSidebar();
    });

    title.textContent = label;

    if (isLifeTimeline) {
        note.textContent = 'A step-by-step walk through the path that led here.';
        openLifeTimeline();
        try {
            const res = await fetch('/data/virtues.json');
            const virtuesData = await res.json();
            relevantPageRenderVirtuesContent(virtuesContent, virtuesData);
        } catch (e) {
            virtuesContent.textContent = 'Failed to load content.';
        }
        return;
    }

    note.textContent = `Placeholder note for ${label} - a short write-up of why this matters to Shaikh goes here.`;

    try {
        const res = await fetch('/data/projects.json');
        const allProjects = await res.json();
        const tag = relevantPageTagFor(label);
        const projects = allProjects.filter(project => project.tags.includes(tag));
        if (projects.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'projects-empty';
            empty.textContent = `No projects tagged with "${tag}" yet.`;
            list.appendChild(empty);
        } else {
            relevantPageRenderProjectsList(list, projects, openProject);
            // Re-snap on resize, since text wrapping (and so each row's natural
            // height) depends on the list's width. Self-unregisters once this
            // page's DOM is gone rather than needing an explicit teardown hook.
            const onResize = () => {
                if (!list.isConnected) { window.removeEventListener('resize', onResize); return; }
                relevantPageSnapRowsToRuleGrid(list);
            };
            window.addEventListener('resize', onResize);
        }
    } catch (e) {
        note.textContent = 'Failed to load content.';
    }
}
