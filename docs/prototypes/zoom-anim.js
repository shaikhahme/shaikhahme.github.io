/* Plain rAF-driven scale/opacity tween, shared by continuous.js and pages/test.html.
   CSS `transition` on transform/opacity turned out not to advance reliably in every
   environment this prototype was tested in (it can get stuck at its start value even
   though the class change registers) - driving the same animation from
   requestAnimationFrame instead, like the rest of this prototype's motion already does,
   sidesteps that entirely and gives an explicit onDone callback for chaining. */
function zoomAnimate(el, { fromScale, toScale, fromOpacity, toOpacity, duration, onDone }) {
    const start = performance.now();
    function ease(t) { return 1 - Math.pow(1 - t, 3); }
    function frame(now) {
        const t = Math.min(1, (now - start) / duration);
        const e = ease(t);
        el.style.transform = `scale(${fromScale + (toScale - fromScale) * e})`;
        el.style.opacity = String(fromOpacity + (toOpacity - fromOpacity) * e);
        if (t < 1) {
            requestAnimationFrame(frame);
        } else if (onDone) {
            onDone();
        }
    }
    requestAnimationFrame(frame);
}
