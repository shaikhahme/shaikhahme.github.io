const RELEVANT_PAGE_ALIASES = {
    'Artificial Intelligence': 'AI'
};

function relevantPageTagFor(label) {
    return RELEVANT_PAGE_ALIASES[label] || label;
}

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

        const TARGET_PX = 44;
        const DURATION_MS = 440;
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
        await relevantPageTypeText(title, step.title, 55, token);
        if (token.cancelled) return;
        await relevantPageTypeText(desc, step.description, 32, token);
        if (token.cancelled) return;
        await relevantPageSleep(450, token);
    }
}

async function relevantPagePlayMindmapLoop(container, steps, token) {
    while (!token.cancelled) {
        await relevantPagePlayMindmap(container, steps, token);
        if (token.cancelled) return;
        await relevantPageSleep(1200, token);
    }
}

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

function relevantPageRenderVirtuesBlock(block) {
    const el = document.createElement(block.type === 'heading' ? 'h2' : block.type === 'quote' ? 'blockquote' : 'p');
    el.className = 'virtues-' + block.type;
    el.innerHTML = block.html;
    return el;
}

function relevantPagePlainText(html) {
    const el = document.createElement('div');
    el.innerHTML = html;
    return el.textContent.trim();
}

function relevantPageShaikhSays(container, parts) {
    const text = parts.filter(Boolean).map(part => /[.!?\u201d"]$/.test(part) ? part : part + '.').join(' ');
    if (text && container.isConnected && typeof window.shaikhEnterSubPage === 'function') window.shaikhEnterSubPage(text);
}

function relevantPageRenderVirtuesContent(container, data) {
    container.innerHTML = '';

    data.human.blocks.forEach(block => {
        container.appendChild(relevantPageRenderVirtuesBlock(block));
    });
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

        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'zoom-page-back mindmap-close';
        close.textContent = '← Back to projects';
        close.addEventListener('click', closeSidebar);

        sidebar.appendChild(close);
        sidebar.appendChild(header);
        sidebar.appendChild(flow);

        const token = { cancelled: false };
        currentToken = token;
        relevantPagePlayMindmap(flow, project.mindmap, token);
    }

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

        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'zoom-page-back mindmap-close';
        close.textContent = '← Back to the essay';
        close.addEventListener('click', closeSidebar);

        sidebar.appendChild(close);
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
                title: `${m.age}: ${m.title}`,
                description: m.text
            }));
            relevantPagePlayMindmapLoop(flow, steps, token);
        } catch (e) {
            flow.textContent = 'Failed to load the timeline.';
        }
    }

    main.addEventListener('click', event => {
        if (event.target.closest('.project-row, .timeline-open')) return;
        closeSidebar();
    });

    title.textContent = label;

    if (isLifeTimeline) {
        note.remove();
        if (window.matchMedia('(max-width: 720px), (max-height: 500px)').matches) {
            const openTimeline = document.createElement('button');
            openTimeline.type = 'button';
            openTimeline.className = 'zoom-page-back timeline-open';
            openTimeline.textContent = 'See the timeline →';
            openTimeline.addEventListener('click', openLifeTimeline);
            main.insertBefore(openTimeline, virtuesContent);
        } else {
            openLifeTimeline();
        }
        try {
            const res = await fetch('/data/virtues.json');
            const virtuesData = await res.json();
            relevantPageRenderVirtuesContent(virtuesContent, virtuesData);
            relevantPageShaikhSays(container, [relevantPagePlainText(virtuesData.human.authorNote)]);
        } catch (e) {
            virtuesContent.textContent = 'Failed to load content.';
        }
        return;
    }

    note.textContent = `Placeholder note for ${label} - a short write-up of why this matters to Shaikh goes here.`;

    try {
        const virtuesRes = await fetch('/data/virtues.json');
        const virtuesData = await virtuesRes.json();
        const topicNote = virtuesData.notes && virtuesData.notes.items[label];
        if (topicNote) {
            note.remove();
            relevantPageShaikhSays(container, [
                relevantPagePlainText(topicNote),
                relevantPagePlainText(virtuesData.human.authorNote),
                relevantPagePlainText(virtuesData.notes.aiDisclosure)
            ]);
        }
    } catch (e) {  }

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
