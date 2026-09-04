import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

gsap.registerPlugin(ScrollTrigger);

const webglEl = document.getElementById('webgl');
const css2dEl = document.getElementById('css2d');
const scrollCue = document.getElementById('scrollCue');
const dragHint = document.getElementById('dragHint');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* The ruled background repeats every 36px starting from the viewport top.
   `bottom`-anchored text can't just use a fixed px offset and land on a rule
   line for every window size - the distance from the viewport's bottom edge
   up to the nearest line depends on window.innerHeight, so it's computed
   here and reapplied on resize instead of hardcoded in CSS. */
const RULE_SPACING = 36;
function snapToRuleGrid(el) {
    el.style.bottom = (window.innerHeight % RULE_SPACING) + 'px';
}
snapToRuleGrid(scrollCue);
snapToRuleGrid(dragHint);
window.addEventListener('resize', () => {
    snapToRuleGrid(scrollCue);
    snapToRuleGrid(dragHint);
});

/* ---------- renderer / scene / camera ---------- */

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
webglEl.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
css2dEl.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
const START_CAM = new THREE.Vector3(0, 0, 12);
const END_CAM = new THREE.Vector3(7.5, 4.5, 9.5);
camera.position.copy(START_CAM);
camera.lookAt(0, 0, 0);

scene.add(new THREE.AmbientLight(0xffffff, 0.9));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(5, 8, 10);
scene.add(dirLight);

function onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    labelRenderer.setSize(w, h);
}
window.addEventListener('resize', onResize);

/* ---------- CSS2D label helper ---------- */
/* The lined-paper look comes entirely from the persistent CSS body background now
   (see shared.css) rather than an in-scene WebGL plane, so it reads identically
   whether the scene is flat/2D or the sphere has fully formed - one background,
   always there. */

function makeLabel(text, className) {
    const div = document.createElement('div');
    div.className = 'label3d ' + className;

    const textSpan = document.createElement('span');
    textSpan.className = 'label-text';
    const cursorSpan = document.createElement('span');
    cursorSpan.className = 'type-cursor';
    cursorSpan.textContent = '|';
    cursorSpan.style.display = 'none';
    div.appendChild(textSpan);
    div.appendChild(cursorSpan);

    // Every label is clickable once its own typewriter animation has finished -
    // clicking a still-typing (or not-yet-visible) label is a no-op.
    div.addEventListener('click', () => {
        if (obj.userData.p < 1) return;
        // concept labels carry an inline opacity - ignore clicks while one is
        // still fading in (reveal < 1) or has rotated to the back of the sphere.
        const op = parseFloat(div.style.opacity);
        if (!Number.isNaN(op) && op < 0.9) return;
        onLabelActivate(text, div);
    });

    const obj = new CSS2DObject(div);
    obj.userData.fullText = text;
    obj.userData.p = 0;
    obj.userData.textSpan = textSpan;
    obj.userData.cursorSpan = cursorSpan;
    return obj;
}

// The cursor only blinks while a label is actively mid-type (0 < p < 1), not
// before its own tween has started - a bug let the compass labels' cursors
// blink at their resting screen positions even at p=0 (scrolled all the way
// back to the top), well before their arrows had even begun drawing, since
// p=0 also satisfies "p < 1". The center label is the one exception: it's
// meant to blink from page load/p=0, before any scroll (blinkFromZero).
function setLabelProgress(obj, p) {
    const full = obj.userData.fullText;
    obj.userData.p = p;
    obj.userData.textSpan.textContent = full.slice(0, Math.round(full.length * p));
    const showCursor = obj.userData.blinkFromZero ? p < 1 : p > 0 && p < 1;
    obj.userData.cursorSpan.style.display = showCursor ? 'inline-block' : 'none';
}

const centerLabel = makeLabel("Shaikh's Virtues", 'center-label');
// nudged up off y=0 so the Engineering<->Psychology diameter passes under the text, not through it
centerLabel.position.set(0, 0.35, 0.2);
centerLabel.userData.blinkFromZero = true;
scene.add(centerLabel);
setLabelProgress(centerLabel, 0); // cursor blinks at the center from page load, before any scroll

/* ---------- four compass axes ---------- */

// Cybersecurity/AI sit closer to the sphere than Engineering/Psychology, whose longer
// labels need the extra clearance from their arrowhead
const AXES = [
    { key: 'engineering', label: 'Engineering', angle: 0, labelOffset: 1 },
    { key: 'cybersecurity', label: 'Cybersecurity', angle: 90, labelOffset: 0.5 },
    { key: 'psychology', label: 'Sociology and Psychology', angle: 180, labelOffset: 1 },
    { key: 'ai', label: 'Artificial Intelligence', angle: 270, labelOffset: 0.5 }
];

const ARM_LENGTH = 3.4;
const axisGroup = new THREE.Group();
scene.add(axisGroup);

AXES.forEach(axis => {
    const rad = THREE.MathUtils.degToRad(axis.angle);
    const dir = new THREE.Vector3(Math.cos(rad), Math.sin(rad), 0);
    const arrow = new THREE.ArrowHelper(dir, new THREE.Vector3(0, 0, 0), 0.001, 0x1c1a17);
    axisGroup.add(arrow);

    const label = makeLabel(axis.label, 'axis-label');
    label.position.copy(dir.clone().multiplyScalar(ARM_LENGTH + axis.labelOffset));
    axisGroup.add(label);

    axis.dir = dir;
    axis.arrow = arrow;
    axis.label = label;
    axis.tipVec = dir.clone().multiplyScalar(ARM_LENGTH);
});

const axisByKey = {};
AXES.forEach(axis => { axisByKey[axis.key] = axis; });

/* ---------- circle joining the four arrow tips ---------- */

const CIRCLE_SEGMENTS = 128;
const circlePositions = new Float32Array((CIRCLE_SEGMENTS + 1) * 3);
for (let i = 0; i <= CIRCLE_SEGMENTS; i++) {
    const t = (i / CIRCLE_SEGMENTS) * Math.PI * 2;
    circlePositions[i * 3] = Math.cos(t) * ARM_LENGTH;
    circlePositions[i * 3 + 1] = Math.sin(t) * ARM_LENGTH;
    circlePositions[i * 3 + 2] = 0;
}
const circleGeo = new THREE.BufferGeometry();
circleGeo.setAttribute('position', new THREE.BufferAttribute(circlePositions, 3));
circleGeo.setDrawRange(0, 0);
const circleLine = new THREE.LineLoop(circleGeo, new THREE.LineBasicMaterial({ color: 0xb3000b }));
scene.add(circleLine);

/* ---------- red diameters: Cybersecurity<->AI and Engineering<->Psychology ---------- */

function makeDiameter(axisA, axisB) {
    const geo = new THREE.BufferGeometry().setFromPoints([axisA.tipVec, axisB.tipVec]);
    const mat = new THREE.LineBasicMaterial({ color: 0xb3000b, transparent: true, opacity: 0 });
    const line = new THREE.Line(geo, mat);
    scene.add(line);
    return line;
}

const diameterCyberAI = makeDiameter(axisByKey.cybersecurity, axisByKey.ai);
const diameterEngPsych = makeDiameter(axisByKey.engineering, axisByKey.psychology);


/* ---------- second equator, perpendicular to the first, through Engineering/Psychology
   and both poles (the vertical great circle in the XZ plane) - only makes visual sense
   once the sphere has actually formed, so it fades in alongside it ---------- */

const equator2Positions = new Float32Array((CIRCLE_SEGMENTS + 1) * 3);
for (let i = 0; i <= CIRCLE_SEGMENTS; i++) {
    const t = (i / CIRCLE_SEGMENTS) * Math.PI * 2;
    equator2Positions[i * 3] = Math.cos(t) * ARM_LENGTH;
    equator2Positions[i * 3 + 1] = 0;
    equator2Positions[i * 3 + 2] = Math.sin(t) * ARM_LENGTH;
}
const equator2Geo = new THREE.BufferGeometry();
equator2Geo.setAttribute('position', new THREE.BufferAttribute(equator2Positions, 3));
const equator2Line = new THREE.LineLoop(equator2Geo, new THREE.LineBasicMaterial({ color: 0xb3000b, transparent: true, opacity: 0 }));
scene.add(equator2Line);

/* ---------- third meridian, perpendicular to both the main equator and equator2,
   through Cybersecurity/AI and both poles (the vertical great circle in the YZ
   plane) - the straight-line diameterCyberAI above only spans the flat 2D
   construction phase, this is its sphere-native counterpart, mirroring equator2's
   role for Engineering/Psychology. Fades in alongside the sphere, same as equator2. ---------- */

const equator3Positions = new Float32Array((CIRCLE_SEGMENTS + 1) * 3);
for (let i = 0; i <= CIRCLE_SEGMENTS; i++) {
    const t = (i / CIRCLE_SEGMENTS) * Math.PI * 2;
    equator3Positions[i * 3] = 0;
    equator3Positions[i * 3 + 1] = Math.cos(t) * ARM_LENGTH;
    equator3Positions[i * 3 + 2] = Math.sin(t) * ARM_LENGTH;
}
const equator3Geo = new THREE.BufferGeometry();
equator3Geo.setAttribute('position', new THREE.BufferAttribute(equator3Positions, 3));
const equator3Line = new THREE.LineLoop(equator3Geo, new THREE.LineBasicMaterial({ color: 0xb3000b, transparent: true, opacity: 0 }));
scene.add(equator3Line);

/* ---------- sphere the construction becomes ---------- */

const sphereMesh = new THREE.Mesh(
    new THREE.SphereGeometry(ARM_LENGTH, 48, 32),
    new THREE.MeshStandardMaterial({ color: 0xece7e2, transparent: true, opacity: 0, roughness: 0.85, metalness: 0.05 })
);
scene.add(sphereMesh);

const wireMesh = new THREE.Mesh(
    new THREE.SphereGeometry(ARM_LENGTH + 0.01, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0x1c1a17, wireframe: true, transparent: true, opacity: 0 })
);
scene.add(wireMesh);

/* ---------- three concept vectors on the sphere ---------- */

function spherePoint(polarDeg, azimuthDeg, radius) {
    const phi = THREE.MathUtils.degToRad(polarDeg);
    const theta = THREE.MathUtils.degToRad(azimuthDeg);
    return new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
    );
}

const CONCEPTS = [
    { label: 'AI Alignment', point: spherePoint(-45, 0, ARM_LENGTH) },
    { label: 'AI Security', point: spherePoint(0, 90, ARM_LENGTH) },
    { label: 'Security Architecture', point: spherePoint(90, 45, ARM_LENGTH) },
    { label: 'Social Engineering', point: spherePoint(160, 90, ARM_LENGTH) },
    { label: 'Neural Networks', point: spherePoint(200, 90, ARM_LENGTH) },
    { label: 'AI Governance', point: spherePoint(45, 45, ARM_LENGTH) }
];

function buildConceptVector(concept, group, labelClass, arrowHeadLen, arrowHeadWidth) {
    const dir = concept.point.clone().normalize();
    const arrow = new THREE.ArrowHelper(dir, new THREE.Vector3(0, 0, 0), ARM_LENGTH, 0xb3000b, arrowHeadLen, arrowHeadWidth);
    arrow.line.material.transparent = true;
    arrow.line.material.opacity = 0;
    arrow.cone.material.transparent = true;
    arrow.cone.material.opacity = 0;
    group.add(arrow);

    const label = makeLabel(concept.label, labelClass);
    label.userData.textSpan.textContent = concept.label;
    label.userData.p = 1; // these fade in rather than type, but are fully "typed" as soon as visible
    label.position.copy(concept.point.clone().multiplyScalar(1.12));
    label.element.style.opacity = 0;
    group.add(label);

    concept.arrow = arrow;
    concept.labelObj = label;
    concept.normal = concept.point.clone().normalize();
    concept.reveal = 0;      // 0..1, owned solely by the scroll-scrubbed timeline
    concept.dispOpacity = 0;  // eased on-screen opacity = reveal x facing-fade multiplier
}

const conceptGroup = new THREE.Group();
scene.add(conceptGroup);
CONCEPTS.forEach(concept => buildConceptVector(concept, conceptGroup, 'vector-label', 0.35, 0.16));

/* Single writer for a concept vector's on-screen opacity, so the scroll timeline
   and the interactive facing-fade never fight over the same property. An earlier
   version tweened material/label opacity from GSAP in the render loop with
   overwrite:true, which permanently killed the timeline's own tween on those
   properties - so after any orbit interaction the vectors and their labels
   stayed on screen even when scrolled all the way back to the top.
   Now `reveal` (0..1) is driven only by the timeline; the far-side facing-fade
   is a multiplier eased in here, frame by frame, with no tween at all. */
const _camDir = new THREE.Vector3();
function applyConceptOpacity(concept, dt) {
    const facingActive = interactive && concept.reveal >= 1;
    let target = concept.reveal;
    if (facingActive) {
        _camDir.copy(camera.position).normalize();
        target = concept.normal.dot(_camDir) > -0.15 ? 1 : 0.12;
        concept.dispOpacity += (target - concept.dispOpacity) * Math.min(1, dt * 10);
    } else {
        concept.dispOpacity = target; // snap while the timeline scrubs, for scroll responsiveness
    }
    const o = Math.abs(concept.dispOpacity - target) < 0.002 ? target : concept.dispOpacity;
    if (o === concept._lastOpacity) return; // skip redundant per-frame writes once settled
    concept._lastOpacity = o;
    concept.dispOpacity = o;
    concept.arrow.line.material.opacity = o;
    concept.arrow.cone.material.opacity = o;
    concept.labelObj.element.style.opacity = String(o);
}

/* ---------- orbit controls (only live once the sequence finishes) ---------- */

const controls = new OrbitControls(camera, renderer.domElement);
controls.enabled = false;
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 6;
controls.maxDistance = 24;
controls.target.set(0, 0, 0);
// Zoom and pan are handled entirely by our own pinch listener below, not OrbitControls'
// native wheel handling - that keeps plain scroll wheel/trackpad input isolated to driving
// the page/timeline, never hijacked for camera interaction.
controls.enableZoom = false;
controls.enablePan = false;

let interactive = false;

function enableOrbit() {
    interactive = true;
    controls.enabled = true;
    dragHint.classList.add('visible');
}

function disableOrbit() {
    interactive = false;
    controls.enabled = false;
    dragHint.classList.remove('visible');
}

/* Pinch-to-zoom only: trackpad/touchpad pinch gestures arrive as wheel events with
   ctrlKey set (the standard browser convention), which is otherwise the native
   "zoom the whole page" gesture - preventDefault() here swaps that for dollying the
   camera instead, while a plain wheel event (no ctrlKey) is left completely alone and
   falls through to normal page scroll, which always drives the scripted timeline (see
   the ScrollTrigger below) whether or not the sphere is currently interactive. */
window.addEventListener('wheel', event => {
    if (!event.ctrlKey) return;
    event.preventDefault(); // always swallow pinch so it never triggers native page zoom
    if (!interactive) return;
    const dist = camera.position.distanceTo(controls.target);
    const factor = 1 + event.deltaY * 0.01;
    const newDist = THREE.MathUtils.clamp(dist * factor, controls.minDistance, controls.maxDistance);
    camera.position.sub(controls.target).setLength(newDist).add(controls.target);
}, { passive: false });

/* ---------- scroll-scrubbed timeline ---------- */

function setFinalState() {
    setLabelProgress(centerLabel, 1);
    AXES.forEach(axis => {
        axis.arrow.setLength(ARM_LENGTH, 0.3, 0.18);
        setLabelProgress(axis.label, 1);
    });
    circleGeo.setDrawRange(0, CIRCLE_SEGMENTS + 1);
    diameterCyberAI.material.opacity = 0.6;
    diameterEngPsych.material.opacity = 0.6;
    equator2Line.material.opacity = 0.6;
    equator3Line.material.opacity = 0.6;
    sphereMesh.material.opacity = 1;
    wireMesh.material.opacity = 0.12;
    camera.position.copy(END_CAM);
    camera.lookAt(0, 0, 0);
    CONCEPTS.forEach(concept => {
        concept.reveal = 1;
        concept.dispOpacity = 1;
        concept.arrow.line.material.opacity = 1;
        concept.arrow.cone.material.opacity = 1;
        concept.labelObj.element.style.opacity = '1';
    });
}

if (reduceMotion) {
    setFinalState();
    enableOrbit();
    scrollCue.classList.add('hidden');
} else {
    // The sphere becomes interactive as soon as the concept vectors *start* fading in,
    // rather than waiting for that fade (or the whole timeline) to finish - dragging/
    // zooming works while the labels are still animating up to full opacity. This is
    // computed from the timeline itself (via the 'conceptsStart' label added below,
    // right before Phase 8) rather than hardcoded, so it stays correct if earlier
    // phases' durations ever change. Scrolling back up past this same point hands
    // control back to the scripted timeline (see the else-branch below).
    let ORBIT_ENABLE_PROGRESS = 1; // placeholder until the full timeline is built below

    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: '#spacer',
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.6,
            onUpdate: self => {
                scrollCue.classList.toggle('hidden', self.progress > 0.02);
                if (self.progress >= ORBIT_ENABLE_PROGRESS && !interactive) {
                    enableOrbit();
                } else if (self.progress < ORBIT_ENABLE_PROGRESS && interactive) {
                    disableOrbit();
                }
            }
        },
        defaults: { ease: 'none' }
    });

    // Phase 1: type "Shaikh's Virtues"
    tl.to(centerLabel.userData, { p: 1, duration: 1.2, onUpdate: () => setLabelProgress(centerLabel, centerLabel.userData.p) });

    // Phases 2-5: each axis draws its arrow, then types its label
    AXES.forEach(axis => {
        const lenProxy = { len: 0.001 };
        tl.to(lenProxy, {
            len: ARM_LENGTH,
            duration: 0.5,
            onUpdate: () => {
                axis.arrow.visible = lenProxy.len > 0.02; // stay fully hidden when scrolled back to the top
                axis.arrow.setLength(lenProxy.len, Math.min(0.3, lenProxy.len * 0.2), Math.min(0.18, lenProxy.len * 0.12));
            }
        });
        tl.to(axis.label.userData, {
            p: 1,
            duration: 0.7,
            onUpdate: () => setLabelProgress(axis.label, axis.label.userData.p)
        });
    });

    // Phase 6: circle joins the four tips
    const circleProxy = { n: 0 };
    tl.to(circleProxy, {
        n: CIRCLE_SEGMENTS + 1,
        duration: 1.0,
        onUpdate: () => circleGeo.setDrawRange(0, Math.round(circleProxy.n))
    });
    tl.to(diameterCyberAI.material, { opacity: 0.6, duration: 0.8 }, '<');
    tl.to(diameterEngPsych.material, { opacity: 0.6, duration: 0.8 }, '<');

    tl.to({}, { duration: 0.3 }); // brief settle

    // Phase 7: camera pans back, sphere and its perpendicular equator fade in
    tl.to(camera.position, {
        x: END_CAM.x, y: END_CAM.y, z: END_CAM.z,
        duration: 2.0,
        onUpdate: () => camera.lookAt(0, 0, 0)
    }, '<');
    tl.to(sphereMesh.material, { opacity: 1, duration: 2.0 }, '<');
    tl.to(wireMesh.material, { opacity: 0.12, duration: 2.0 }, '<');
    tl.to(equator2Line.material, { opacity: 0.6, duration: 2.0 }, '<');
    tl.to(equator3Line.material, { opacity: 0.6, duration: 2.0 }, '<');

    // Phase 8: the concept vectors fade in (orbit kicks in mid-fade - see ORBIT_ENABLE_PROGRESS above).
    // Only `concept.reveal` is tweened; applyConceptOpacity() turns that into the actual
    // material/label opacity every frame, so the interactive facing-fade never has to
    // tween (and possibly clobber) the same properties the timeline is scrubbing.
    tl.addLabel('conceptsStart');
    CONCEPTS.forEach((concept, i) => {
        tl.to(concept, {
            reveal: 1,
            duration: 0.6,
            onUpdate: () => applyConceptOpacity(concept, 0)
        }, i === 0 ? undefined : '<');
    });

    ORBIT_ENABLE_PROGRESS = tl.labels.conceptsStart / tl.duration();
}

/* ---------- Phase 2/3: label -> "relevant page" zoom transition ----------
   Clicking a label zooms the sphere away and an in-page DOM overlay (a
   .zoom-page) zooms in over it, Prezi-style, anchored at the click point.
   The Back button reverses the same animation. The overlay's actual content
   (short note, projects list, mind-map sidebar) is built by
   renderRelevantPage() in relevant-page.js. */

const ZOOM_DURATION_MS = 850;

function originPctFromClientXY(x, y) {
    return { xPct: (x / window.innerWidth) * 100, yPct: (y / window.innerHeight) * 100 };
}

function setTransformOrigin(el, originPct) {
    el.style.transformOrigin = `${originPct.xPct}% ${originPct.yPct}%`;
}

function animateIn(el, duration = ZOOM_DURATION_MS) {
    return new Promise(resolve => zoomAnimate(el, { fromScale: 0.02, toScale: 1, fromOpacity: 0, toOpacity: 1, duration, onDone: resolve }));
}

function animateOut(el, duration = ZOOM_DURATION_MS) {
    return new Promise(resolve => zoomAnimate(el, { fromScale: 1, toScale: 0.02, fromOpacity: 1, toOpacity: 0, duration, onDone: resolve }));
}

function makeZoomPageEl() {
    const el = document.createElement('div');
    el.className = 'zoom-page';
    return el;
}

let wasInteractiveBeforeZoom = false;
let transitioning = false;

function zoomStageOut(originPct) {
    wasInteractiveBeforeZoom = interactive;
    disableOrbit();
    const stage = webglEl.parentElement;
    setTransformOrigin(stage, originPct);
    stage.classList.add('zoomed-out');
    return new Promise(resolve => zoomAnimate(stage, { fromScale: 1, toScale: 9, fromOpacity: 1, toOpacity: 0, duration: ZOOM_DURATION_MS, onDone: resolve }));
}

function zoomStageIn(originPct) {
    const stage = webglEl.parentElement;
    setTransformOrigin(stage, originPct);
    return new Promise(resolve => zoomAnimate(stage, {
        fromScale: 9, toScale: 1, fromOpacity: 0, toOpacity: 1, duration: ZOOM_DURATION_MS,
        onDone: () => {
            stage.classList.remove('zoomed-out');
            if (wasInteractiveBeforeZoom) enableOrbit();
            resolve();
        }
    }));
}

/* ---------- overlay: label click -> relevant page ---------- */

let overlayEl = null;

async function openOverlayPage(originPct, label, isLifeTimeline) {
    transitioning = true;
    zoomStageOut(originPct);

    overlayEl = makeZoomPageEl();
    setTransformOrigin(overlayEl, originPct);
    document.body.appendChild(overlayEl);
    document.body.style.overflow = 'hidden';
    renderRelevantPage(overlayEl, closeOverlayPage, label, isLifeTimeline);

    await animateIn(overlayEl);
    transitioning = false;
}

async function closeOverlayPage() {
    if (!overlayEl) return;
    const el = overlayEl;
    overlayEl = null;
    // re-derive the exact origin used to open this overlay from its own inline style
    const [xPct, yPct] = el.style.transformOrigin.split(' ').map(parseFloat);
    await Promise.all([animateOut(el), zoomStageIn({ xPct, yPct })]);
    document.body.style.overflow = '';
    el.remove();
}

/* ---------- shared entry point for every label click ---------- */

function onLabelActivate(text, _el) {
    if (overlayEl || transitioning) return; // already zoomed into a page, or mid-transition
    const rect = _el.getBoundingClientRect();
    const originPct = originPctFromClientXY(rect.left + rect.width / 2, rect.top + rect.height / 2);
    // The center "Shaikh's Virtues" label opens the life timeline (auto-playing,
    // looping mind-map) instead of a topic's project list - distinguished by its
    // own label3d class rather than matching on the text itself.
    const isLifeTimeline = _el.classList.contains('center-label');
    openOverlayPage(originPct, text, isLifeTimeline);
}

/* ---------- render loop ---------- */

const _frameClock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const dt = _frameClock.getDelta();
    if (interactive) controls.update();
    // Concept vector opacity is recomputed every frame from concept.reveal
    // (timeline-owned) times a far-side facing-fade multiplier - see
    // applyConceptOpacity. No GSAP tween here, so nothing competes with the
    // scroll timeline for these properties and a scroll back to the top always
    // returns them to fully hidden.
    for (const concept of CONCEPTS) applyConceptOpacity(concept, dt);
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
}
animate();
