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
        /* A thin trigger band near vertical center, not a % of the section itself
           so very tall sections (e.g. the pinned About timeline) still register. */
        var sectionObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    var match = navLinks.find(function (l) {
                        return l.getAttribute('href') === '#' + entry.target.id;
                    });
                    if (match) setActiveLink(match);
                }
            });
        }, { threshold: 0, rootMargin: '-45% 0px -45% 0px' });

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
        var titleEl = document.getElementById('milestoneTitle');

        if (!pin || !stage || !vinyl || !shapeStage || !titleEl) return;

        var SHAPE_SEQUENCE = ['dot', 'line', 'triangle', 'diamond', 'cube', 'hexagon', 'sphere'];

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
                    titleEl.textContent = m.title;
                }

                /* Shape swaps immediately (own CSS transition handles the crossfade) so it
                   can never lag or get stuck behind the text fade timer below. */
                function applyShape(idx) {
                    shapeStage.dataset.active = shapeForIndex(idx, milestones.length);
                }

                if (reduceMotion) {
                    applyMilestone(0);
                    applyShape(0);
                    return;
                }

                var activeIndex = -1;
                var ticking = false;
                var fadeTimer = null;
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
                        applyShape(idx);
                        if (fadeTimer) clearTimeout(fadeTimer);
                        ageEl.style.opacity = 0;
                        textEl.style.opacity = 0;
                        titleEl.style.opacity = 0;
                        fadeTimer = setTimeout(function (targetIdx) {
                            return function () {
                                applyMilestone(targetIdx);
                                ageEl.style.opacity = 1;
                                textEl.style.opacity = 1;
                                titleEl.style.opacity = 1;
                                fadeTimer = null;
                            };
                        }(idx), 140);
                    }
                }

                function onScroll() {
                    if (!ticking) {
                        ticking = true;
                        requestAnimationFrame(update);
                    }
                }

                applyMilestone(0);
                applyShape(0);
                update();
                window.addEventListener('scroll', onScroll, { passive: true });
                window.addEventListener('resize', onScroll);
            })
            .catch(function (error) {
                console.error('Error loading timeline:', error);
            });
    })();

    /* ---- Projects: fetch and render from JSON ---- */
    (function initProjects() {
        var row = document.getElementById('projectsRow');
        if (!row) return;

        fetch('./data/projects.json')
            .then(function (response) {
                if (!response.ok) throw new Error('Network response was not ok ' + response.statusText);
                return response.json();
            })
            .then(function (projects) {
                if (!projects || !projects.length) return;

                var html = '';
                for (var i = 0; i < projects.length; i++) {
                    var p = projects[i];
                    var hue = (i * 45) % 360;
                    var num = (i + 1 < 10 ? '0' : '') + (i + 1);
                    var cover = p.image
                        ? '<img src="' + p.image + '" alt="">'
                        : '<span class="album-groove"></span>';

                    html += '<a class="album" href="' + p.link + '" target="_blank" rel="noopener">' +
                        '<div class="album-cover" style="--hue: ' + hue + 'deg;">' +
                        cover +
                        '<span class="album-mark">' + num + '</span>' +
                        '</div>' +
                        '<h3 class="album-title">' + p.name + '</h3>' +
                        '<p class="album-desc">' + p.description + '</p>' +
                        '</a>';
                }
                row.innerHTML = html;
            })
            .catch(function (error) {
                console.error('Error loading projects:', error);
            });
    })();

    /* ---- Testimonials carousel: auto-scroll with hover pause ---- */
    (function initTestimonials() {
        var carousel = document.getElementById('testimonialCarousel');
        if (!carousel) return;

        var scrollTimer = null;

        function nextScroll() {
            var cardEl = carousel.querySelector('.testimonial-card');
            var step = cardEl ? cardEl.getBoundingClientRect().width + 24 : 300;
            var atEnd = carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth - 4;
            carousel.scrollTo({
                left: atEnd ? 0 : carousel.scrollLeft + step,
                behavior: 'smooth'
            });
        }

        function start() {
            stop();
            scrollTimer = setInterval(nextScroll, 4000);
        }

        function stop() {
            if (scrollTimer) {
                clearInterval(scrollTimer);
                scrollTimer = null;
            }
        }

        if (!reduceMotion) {
            carousel.addEventListener('mouseenter', stop);
            carousel.addEventListener('mouseleave', start);
            start();
        }
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
