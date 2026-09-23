function zoomAnimate(el, { fromScale, toScale, fromOpacity, toOpacity, duration, onDone }) {
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
