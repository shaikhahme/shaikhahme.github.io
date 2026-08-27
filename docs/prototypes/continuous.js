import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

gsap.registerPlugin(ScrollTrigger);

const webglEl = document.getElementById('webgl');
const css2dEl = document.getElementById('css2d');
const scrollCue = document.getElementById('scrollCue');
const dragHint = document.getElementById('dragHint');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

    // Stubbed for now - every label is clickable, but what a click should actually do
    // (focus the camera on it, open a description, navigate somewhere) isn't decided yet.
    div.addEventListener('click', () => console.log('label clicked:', text));

    const obj = new CSS2DObject(div);
    obj.userData.fullText = text;
    obj.userData.p = 0;
    obj.userData.textSpan = textSpan;
    obj.userData.cursorSpan = cursorSpan;
    return obj;
}

function setLabelProgress(obj, p) {
    const full = obj.userData.fullText;
    obj.userData.p = p;
    obj.userData.textSpan.textContent = full.slice(0, Math.round(full.length * p));
    obj.userData.cursorSpan.style.display = p < 1 ? 'inline-block' : 'none';
}

const centerLabel = makeLabel("Shaikh's Virtues", 'center-label');
// nudged up off y=0 so the Engineering<->Psychology diameter passes under the text, not through it
centerLabel.position.set(0, 0.35, 0.2);
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
    label.position.copy(concept.point.clone().multiplyScalar(1.12));
    label.element.style.opacity = 0;
    group.add(label);

    concept.arrow = arrow;
    concept.labelObj = label;
    concept.revealed = false;
}

const conceptGroup = new THREE.Group();
scene.add(conceptGroup);
CONCEPTS.forEach(concept => buildConceptVector(concept, conceptGroup, 'vector-label', 0.35, 0.16));

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
    sphereMesh.material.opacity = 1;
    wireMesh.material.opacity = 0.12;
    camera.position.copy(END_CAM);
    camera.lookAt(0, 0, 0);
    CONCEPTS.forEach(concept => {
        concept.arrow.line.material.opacity = 1;
        concept.arrow.cone.material.opacity = 1;
        concept.labelObj.element.style.opacity = 1;
        concept.revealed = true;
    });
}

if (reduceMotion) {
    setFinalState();
    enableOrbit();
    scrollCue.classList.add('hidden');
} else {
    // The sphere becomes interactive once the concept labels are most of the way through
    // fading in (comfortably readable) rather than waiting for the very last frame of the
    // timeline - "slightly before the end" instead of exactly at it. Scrolling back up past
    // this same point hands control back to the scripted timeline (see the else-branch below).
    const ORBIT_ENABLE_PROGRESS = 0.99;

    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: '#spacer',
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.6,
            onUpdate: self => {
                scrollCue.classList.toggle('hidden', self.progress > 0.02);
                if (self.progress >= ORBIT_ENABLE_PROGRESS && !interactive) {
                    CONCEPTS.forEach(c => { c.revealed = true; });
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
            onUpdate: () => axis.arrow.setLength(lenProxy.len, Math.min(0.3, lenProxy.len * 0.2), Math.min(0.18, lenProxy.len * 0.12))
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

    // Phase 8: the concept vectors fade in (orbit kicks in mid-fade - see ORBIT_ENABLE_PROGRESS above)
    CONCEPTS.forEach((concept, i) => {
        tl.to(concept.arrow.line.material, { opacity: 1, duration: 0.6 }, i === 0 ? undefined : '<');
        tl.to(concept.arrow.cone.material, { opacity: 1, duration: 0.6 }, '<');
        tl.to(concept.labelObj.element.style, { opacity: 1, duration: 0.6 }, '<');
    });
}

/* ---------- render loop ---------- */

function animate() {
    requestAnimationFrame(animate);
    if (interactive) {
        controls.update();

        // fade concept labels/arrows when they rotate onto the far side of the sphere
        const camDir = new THREE.Vector3().subVectors(camera.position, new THREE.Vector3(0, 0, 0)).normalize();
        CONCEPTS.forEach(concept => {
            if (!concept.revealed) return;
            const normal = concept.point.clone().normalize();
            const facing = normal.dot(camDir) > -0.15;
            const targetOpacity = facing ? 1 : 0.12;
            concept.labelObj.element.style.opacity = String(targetOpacity);
            concept.arrow.line.material.opacity = targetOpacity;
            concept.arrow.cone.material.opacity = targetOpacity;
        });
    }
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
}
animate();
