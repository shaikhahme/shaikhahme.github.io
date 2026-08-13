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

    /* ---- Shared: turn a horizontally-scrollable row into an infinite loop.
       Triples the content and silently snaps back by one set-width whenever the
       scroll position drifts into either outer copy, so both drag-scrolling and
       programmatic scrollTo() feel endless in both directions. ---- */
    function makeInfiniteLoop(container) {
        if (!container || !container.children.length) return null;

        container.innerHTML = container.innerHTML + container.innerHTML + container.innerHTML;
        var setWidth = container.scrollWidth / 3;
        container.scrollLeft = setWidth;

        container.addEventListener('scroll', function () {
            if (container.scrollLeft < setWidth * 0.5) {
                container.scrollLeft += setWidth;
            } else if (container.scrollLeft > setWidth * 1.5) {
                container.scrollLeft -= setWidth;
            }
        }, { passive: true });

        return setWidth;
    }

    /* ---- Scroll-pinned vinyl timeline (About section) ---- */
    (function initTimeline() {
        var pin = document.getElementById('timelinePin');
        var stage = document.getElementById('timelineStage');
        var vinyl = document.getElementById('vinylRecord');
        var vinylCore = document.getElementById('vinylCore');
        var tonearm = document.getElementById('tonearm');
        var ageEl = document.getElementById('timelineAge');
        var textEl = document.getElementById('timelineText');
        var indexEl = document.getElementById('timelineIndex');
        var totalEl = document.getElementById('timelineTotal');
        var ringTextPath = document.getElementById('ringTextPath');

        if (!pin || !stage || !vinyl || !vinylCore || !ringTextPath) return;

        var ringTextEl = ringTextPath.parentNode;
        var ringPathEl = document.getElementById('ringPath');

        /* Build a shallow arc (sampled, avoids SVG arc-flag ambiguity) that sits in its
           own dedicated strip directly below the disc. It curves the same way as the
           vinyl's own rim (dips away from the disc at the center, tucks back up toward
           it at the edges) rather than mirroring away from it. */
        var RING_CX = 50, RING_CY = -68.6, RING_R = 82.6;
        var RING_START_DEG = 124, RING_END_DEG = 56;
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

        function pad(n) { return n < 10 ? '0' + n : '' + n; }

        /* Center label recolors per milestone instead of morphing through shapes -
           a smooth hue rotation around the color wheel, one stop per chapter. */
        function applyColor(idx, total) {
            var hue = Math.round((idx / total) * 360);
            vinylCore.style.setProperty('--core-color', 'hsl(' + hue + ', 68%, 42%)');
            vinylCore.style.setProperty('--core-color-dark', 'hsl(' + hue + ', 55%, 18%)');
            vinylCore.style.setProperty('--core-glow', 'hsla(' + hue + ', 75%, 50%, 0.35)');
        }

        fetch('/data/timeline.json')
            .then(function (response) {
                if (!response.ok) throw new Error('Network response was not ok ' + response.statusText);
                return response.json();
            })
            .then(function (milestones) {
                if (!milestones || !milestones.length) return;
                if (totalEl) totalEl.textContent = milestones.length;

                function applyMilestone(idx) {
                    var m = milestones[idx];
                    ageEl.textContent = m.age;
                    textEl.textContent = m.text;
                    if (indexEl) indexEl.textContent = pad(idx + 1);
                    ringTextPath.textContent = m.title;
                    var fontSize = Math.max(3, Math.min(6.5, RING_ARC_LEN / (m.title.length * 0.62)));
                    ringTextEl.setAttribute('font-size', fontSize.toFixed(2));
                }

                if (reduceMotion) {
                    applyMilestone(0);
                    applyColor(0, milestones.length);
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

                    if (tonearm) {
                        var tonearmDeg = TONEARM_START + (TONEARM_END - TONEARM_START) * progress;
                        tonearm.style.transform = 'rotate(' + tonearmDeg.toFixed(2) + 'deg)';
                    }

                    var idx = Math.min(milestones.length - 1, Math.floor(progress * milestones.length));
                    if (idx !== activeIndex) {
                        activeIndex = idx;
                        applyColor(idx, milestones.length);
                        if (fadeTimer) clearTimeout(fadeTimer);
                        ageEl.style.opacity = 0;
                        textEl.style.opacity = 0;
                        ringTextEl.style.opacity = 0;
                        fadeTimer = setTimeout(function (targetIdx) {
                            return function () {
                                applyMilestone(targetIdx);
                                ageEl.style.opacity = 1;
                                textEl.style.opacity = 1;
                                ringTextEl.style.opacity = 1;
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
                applyColor(0, milestones.length);
                update();
                window.addEventListener('scroll', onScroll, { passive: true });
                window.addEventListener('resize', onScroll);
            })
            .catch(function (error) {
                console.error('Error loading timeline:', error);
            });
    })();

    /* ---- Projects: fetch and render from JSON, then loop infinitely ---- */
    (function initProjects() {
        var row = document.getElementById('projectsRow');
        if (!row) return;

        fetch('/data/projects.json')
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
                makeInfiniteLoop(row);
            })
            .catch(function (error) {
                console.error('Error loading projects:', error);
            });
    })();

    /* ---- Testimonials carousel: fetch from JSON, infinite loop, auto-scroll, pauses on hover ---- */
    (function initTestimonials() {
        var carousel = document.getElementById('testimonialCarousel');
        if (!carousel) return;

        fetch('/data/site.json')
            .then(function (response) {
                if (!response.ok) throw new Error('Network response was not ok ' + response.statusText);
                return response.json();
            })
            .then(function (site) {
                var testimonials = site && site.testimonials;
                if (!testimonials || !testimonials.length) return;

                testimonials.forEach(function (t) {
                    var card = document.createElement('div');
                    card.className = 'testimonial-card';

                    var quote = document.createElement('p');
                    quote.className = 'testimonial-quote';
                    quote.textContent = '"' + t.quote + '"';

                    var credit = document.createElement('p');
                    credit.className = 'testimonial-credit';
                    credit.textContent = t.credit;

                    card.appendChild(quote);
                    card.appendChild(credit);
                    carousel.appendChild(card);
                });

                makeInfiniteLoop(carousel);

                var scrollTimer = null;

                function nextScroll() {
                    var cardEl = carousel.querySelector('.testimonial-card');
                    var step = cardEl ? cardEl.getBoundingClientRect().width + 24 : 300;
                    carousel.scrollTo({ left: carousel.scrollLeft + step, behavior: 'smooth' });
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
            })
            .catch(function (error) {
                console.error('Error loading testimonials:', error);
            });
    })();

    /* ---- Specialty page prose: fetch per-page and shared copy from JSON ---- */
    (function initSpecialtyContent() {
        var heroTagline = document.getElementById('heroTagline');
        var virtueParagraphs = document.getElementById('virtueParagraphs');
        if (!heroTagline && !virtueParagraphs) return;

        var slug = window.location.pathname.split('/').filter(Boolean)[0];

        function setText(id, text) {
            var el = document.getElementById(id);
            if (el && text != null) el.textContent = text;
        }

        Promise.all([
            fetch('/data/pages.json').then(function (r) { return r.json(); }),
            fetch('/data/site.json').then(function (r) { return r.json(); })
        ]).then(function (results) {
            var pages = results[0];
            var site = results[1];
            var data = pages && pages[slug];

            if (data) {
                if (data.metaTitle) document.title = data.metaTitle;
                var metaDesc = document.getElementById('metaDescription');
                if (metaDesc && data.metaDescription) metaDesc.setAttribute('content', data.metaDescription);

                setText('heroTagline', data.tagline);
                setText('virtueTitle', data.virtueTitle);
                setText('virtueCtaBtn', data.virtueCta);
                setText('projectsIntro', data.projectsIntro);
                setText('knowledgeIntro', data.knowledgeIntro);
                setText('contactIntro', data.contactIntro);

                var NBSP = ' ', MIDDOT = '·';
                function eyebrow(side, track) {
                    return data.specialtyLabel + NBSP + MIDDOT + NBSP + 'Side' + NBSP + side + NBSP + MIDDOT + NBSP + 'Track' + NBSP + track;
                }
                setText('eyebrowAbout', eyebrow('A', '01'));
                setText('eyebrowProjects', eyebrow('A', '02'));
                setText('eyebrowKnowledge', eyebrow('B', '03'));
                setText('eyebrowContact', eyebrow('B', '04'));

                if (virtueParagraphs && data.virtueParagraphs) {
                    virtueParagraphs.innerHTML = '';
                    data.virtueParagraphs.forEach(function (text) {
                        var p = document.createElement('p');
                        p.className = 'reflection';
                        p.textContent = text;
                        virtueParagraphs.appendChild(p);
                    });
                }
            }

            if (site && site.contact) {
                var email = document.getElementById('contactEmail');
                var emailText = document.getElementById('contactEmailText');
                if (email) email.setAttribute('href', 'mailto:' + site.contact.email);
                if (emailText) emailText.textContent = site.contact.email;

                var linkedin = document.getElementById('contactLinkedin');
                var linkedinText = document.getElementById('contactLinkedinText');
                if (linkedin) linkedin.setAttribute('href', site.contact.linkedinUrl);
                if (linkedinText) linkedinText.textContent = site.contact.linkedinLabel;
            }
        }).catch(function (error) {
            console.error('Error loading page content:', error);
        });
    })();

    /* ---- Landing page: fetch hero copy and crate tiles from JSON ---- */
    (function initLandingContent() {
        var crateBox = document.getElementById('crateBox');
        if (!crateBox) return;

        fetch('/data/site.json')
            .then(function (response) {
                if (!response.ok) throw new Error('Network response was not ok ' + response.statusText);
                return response.json();
            })
            .then(function (site) {
                var landing = site && site.landing;
                if (!landing) return;

                var eyebrow = document.getElementById('landingEyebrow');
                var name = document.getElementById('landingName');
                var tagline = document.getElementById('landingTagline');
                var hint = document.getElementById('landingHint');
                if (eyebrow) eyebrow.textContent = landing.eyebrow;
                if (name) name.textContent = landing.name;
                if (tagline) tagline.textContent = landing.tagline;
                if (hint) hint.textContent = landing.hint;

                if (!landing.tiles || !landing.tiles.length) return;

                landing.tiles.forEach(function (tile) {
                    var a = document.createElement('a');
                    a.className = 'crate-album';
                    a.href = '/' + tile.page + '/';
                    a.setAttribute('role', 'listitem');
                    a.style.setProperty('--tile-color', tile.color);
                    a.style.setProperty('--tile-img', "url('" + tile.image + "')");

                    var cover = document.createElement('div');
                    cover.className = 'crate-album-cover';

                    var title = document.createElement('h2');
                    title.className = 'crate-album-title';
                    title.textContent = tile.title;

                    var desc = document.createElement('p');
                    desc.className = 'crate-album-desc';
                    desc.textContent = tile.description;

                    a.appendChild(cover);
                    a.appendChild(title);
                    a.appendChild(desc);
                    crateBox.appendChild(a);
                });
            })
            .catch(function (error) {
                console.error('Error loading landing content:', error);
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
