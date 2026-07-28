(function () {
    'use strict';

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---- Scroll-reveal ---- */
    var revealEls = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window && !reduceMotion) {
        revealEls.forEach(function (el, i) {
            el.style.setProperty('--reveal-delay', Math.min(i % 4, 3) * 0.08 + 's');
        });

        var revealObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

        revealEls.forEach(function (el) { revealObserver.observe(el); });
    } else {
        revealEls.forEach(function (el) { el.classList.add('is-visible'); });
    }

    /* ---- Nav: active section + sliding indicator ---- */
    var navLinks = Array.prototype.slice.call(document.querySelectorAll('.site-nav nav a'));
    var navIndicator = document.getElementById('navIndicator');
    var sections = navLinks
        .map(function (link) { return document.querySelector(link.getAttribute('href')); })
        .filter(Boolean);

    function setActiveLink(link) {
        navLinks.forEach(function (l) { l.classList.remove('is-active'); });
        if (!link) return;
        link.classList.add('is-active');
        if (navIndicator) {
            var linkRect = link.getBoundingClientRect();
            var navRect = link.closest('nav').getBoundingClientRect();
            navIndicator.style.width = linkRect.width + 'px';
            navIndicator.style.transform = 'translateX(' + (linkRect.left - navRect.left) + 'px)';
        }
    }

    if ('IntersectionObserver' in window && sections.length) {
        var sectionObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    var match = navLinks.find(function (l) {
                        return l.getAttribute('href') === '#' + entry.target.id;
                    });
                    if (match) setActiveLink(match);
                }
            });
        }, { threshold: 0.5 });

        sections.forEach(function (s) { sectionObserver.observe(s); });
    }

    if (navLinks.length) setActiveLink(navLinks[0]);
    window.addEventListener('resize', function () {
        var active = document.querySelector('.site-nav a.is-active');
        if (active) setActiveLink(active);
    });

    /* ---- Scroll-pinned vinyl timeline (About section) ---- */
    (function initTimeline() {
        var pin = document.getElementById('timelinePin');
        var stage = document.getElementById('timelineStage');
        var vinyl = document.getElementById('vinylRecord');
        var tonearm = document.getElementById('tonearm');
        var shapeStage = document.getElementById('shapeStage');
        var sphereEl = document.getElementById('shapeSphere');
        var ageEl = document.getElementById('timelineAge');
        var textEl = document.getElementById('timelineText');
        var indexEl = document.getElementById('timelineIndex');
        var ringTextPath = document.getElementById('ringTextPath');

        if (!pin || !stage || !vinyl || !shapeStage || !ringTextPath) return;

        var ringTextEl = ringTextPath.parentNode;
        var ringPathEl = document.getElementById('ringPath');

        /* Build the ring path as a sampled arc (avoids SVG arc-flag ambiguity) */
        var RING_CX = 50, RING_CY = 50, RING_R = 42;
        var RING_START_DEG = 200, RING_END_DEG = 340;
        var RING_ARC_LEN = RING_R * Math.abs(RING_END_DEG - RING_START_DEG) * Math.PI / 180;

        if (ringPathEl) {
            var steps = 48;
            var d = '';
            for (var p = 0; p <= steps; p++) {
                var deg = RING_START_DEG + (RING_END_DEG - RING_START_DEG) * (p / steps);
                var rad = deg * Math.PI / 180;
                var px = RING_CX + RING_R * Math.cos(rad);
                var py = RING_CY + RING_R * Math.sin(rad);
                d += (p === 0 ? 'M ' : 'L ') + px.toFixed(2) + ' ' + py.toFixed(2) + ' ';
            }
            ringPathEl.setAttribute('d', d.trim());
        }

        var SHAPE_SEQUENCE = ['dot', 'line', 'triangle', 'pyramid', 'cube', 'octahedron', 'sphere'];

        function shapeForIndex(idx, total) {
            return SHAPE_SEQUENCE[Math.min(SHAPE_SEQUENCE.length - 1, Math.floor(idx * SHAPE_SEQUENCE.length / total))];
        }

        function pad(n) { return n < 10 ? '0' + n : '' + n; }

        /* Build the particle sphere once, using a Fibonacci sphere distribution */
        var SPHERE_COUNT = 34;
        var SPHERE_RADIUS = 24;
        if (sphereEl && !sphereEl.childElementCount) {
            var goldenAngle = Math.PI * (3 - Math.sqrt(5));
            for (var i = 0; i < SPHERE_COUNT; i++) {
                var y = 1 - (i / (SPHERE_COUNT - 1)) * 2;
                var radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
                var theta = goldenAngle * i;
                var x = Math.cos(theta) * radiusAtY;
                var z = Math.sin(theta) * radiusAtY;
                var dot = document.createElement('span');
                dot.className = 'sphere-dot';
                dot.style.transform = 'translate3d(' + (x * SPHERE_RADIUS).toFixed(1) + 'px, ' + (y * SPHERE_RADIUS).toFixed(1) + 'px, ' + (z * SPHERE_RADIUS).toFixed(1) + 'px)';
                sphereEl.appendChild(dot);
            }
        }

        fetch('./data/timeline.json')
            .then(function (response) {
                if (!response.ok) throw new Error('Network response was not ok ' + response.statusText);
                return response.json();
            })
            .then(function (milestones) {
                if (!milestones || !milestones.length) return;

                function applyMilestone(idx) {
                    var m = milestones[idx];
                    ageEl.textContent = m.age;
                    textEl.textContent = m.text;
                    if (indexEl) indexEl.textContent = pad(idx + 1);
                    ringTextPath.textContent = m.title;
                    var fontSize = Math.max(2.6, Math.min(4.4, RING_ARC_LEN / (m.title.length * 0.55)));
                    ringTextEl.setAttribute('font-size', fontSize.toFixed(2));
                    shapeStage.dataset.active = shapeForIndex(idx, milestones.length);
                }

                if (reduceMotion) {
                    applyMilestone(0);
                    return;
                }

                var activeIndex = -1;
                var ticking = false;
                var TOTAL_SPINS = 1;
                var TONEARM_START = -30;
                var TONEARM_END = -4;

                function update() {
                    ticking = false;
                    var rect = pin.getBoundingClientRect();
                    var total = rect.height - window.innerHeight;
                    var progress = total > 0 ? (-rect.top) / total : 0;
                    progress = Math.max(0, Math.min(1, progress));

                    var deg = progress * TOTAL_SPINS * 360;
                    vinyl.style.transform = 'rotate(' + deg.toFixed(2) + 'deg)';
                    shapeStage.style.transform = 'rotateX(14deg) rotateY(' + (progress * 4 * 360).toFixed(2) + 'deg)';

                    if (tonearm) {
                        var tonearmDeg = TONEARM_START + (TONEARM_END - TONEARM_START) * progress;
                        tonearm.style.transform = 'rotate(' + tonearmDeg.toFixed(2) + 'deg)';
                    }

                    var idx = Math.min(milestones.length - 1, Math.floor(progress * milestones.length));
                    if (idx !== activeIndex) {
                        activeIndex = idx;
                        ageEl.style.opacity = 0;
                        textEl.style.opacity = 0;
                        ringTextEl.style.opacity = 0;
                        setTimeout(function () {
                            applyMilestone(activeIndex);
                            ageEl.style.opacity = 1;
                            textEl.style.opacity = 1;
                            ringTextEl.style.opacity = 1;
                        }, 140);
                    }
                }

                function onScroll() {
                    if (!ticking) {
                        ticking = true;
                        requestAnimationFrame(update);
                    }
                }

                applyMilestone(0);
                update();
                window.addEventListener('scroll', onScroll, { passive: true });
                window.addEventListener('resize', onScroll);
            })
            .catch(function (error) {
                console.error('Error loading timeline:', error);
            });
    })();

    /* ---- Cursor glow (desktop only) ---- */
    var cursorGlow = document.getElementById('cursorGlow');
    if (cursorGlow && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        var rafId = null;
        var targetX = 0, targetY = 0;

        window.addEventListener('mousemove', function (e) {
            targetX = e.clientX;
            targetY = e.clientY;
            cursorGlow.classList.add('is-active');
            if (!rafId) {
                rafId = requestAnimationFrame(moveGlow);
            }
        });

        window.addEventListener('mouseleave', function () {
            cursorGlow.classList.remove('is-active');
        });

        function moveGlow() {
            cursorGlow.style.transform = 'translate3d(' + targetX + 'px, ' + targetY + 'px, 0)';
            rafId = null;
        }
    }
})();
