/* Plain rAF-driven scale/opacity tween, used by continuous.js for the
   Prezi-style zoom transitions. CSS `transition` on transform/opacity turned
   out not to advance reliably in every environment this was tested in (it can
   get stuck at its start value even though the class change registers) -
   driving the same animation from requestAnimationFrame instead, like the
   rest of this page's motion already does, sidesteps that entirely and gives
   an explicit onDone callback for chaining. */
function zoomAnimate(el, { fromScale, toScale, fromOpacity, toOpacity, duration, onDone }) {
    // Without this, the browser has no advance notice that `transform`/`opacity`
    // are about to be animated, so it can end up rasterizing this element (and
    // its ruled-line background-image, which is expensive to repaint) fresh on
    // every frame instead of just compositing a cached layer - the difference
    // between a smooth tween and a visibly choppy one. Cleared once the tween
    // settles rather than left on permanently, since an always-promoted layer
    // costs memory for no benefit while nothing is animating.
    el.style.willChange = 'transform, opacity';
    const start = performance.now();
    function ease(t) { return 1 - Math.pow(1 - t, 3); }
    function frame(now) {
        const t = Math.min(1, (now - start) / duration);
        const e = ease(t);
        el.style.transform = `scale(${fromScale + (toScale - fromScale) * e})`;
        el.style.opacity = String(fromOpacity + (toOpacity - fromOpacity) * e);
        if (t < 1) {
            requestAnimationFrame(frame);
        } else {
            el.style.willChange = 'auto';
            if (onDone) onDone();
        }
    }
    requestAnimationFrame(frame);
}
