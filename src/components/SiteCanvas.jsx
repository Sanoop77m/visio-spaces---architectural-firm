import { useEffect, useRef } from 'react';
import { createSiteScene } from '../scene/createSiteScene.js';
import { TIMELINE } from '../scene/timeline.js';

// The scroll position at which each section sits centred in the viewport.
function measureStops() {
  const viewport = window.innerHeight;
  const maxScroll = document.documentElement.scrollHeight - viewport;
  let previous = -1;
  return TIMELINE.map(({ stop }, index) => {
    const element = document.querySelector(`[data-stop="${stop}"]`);
    const rect = element.getBoundingClientRect();
    const centred = rect.top + window.scrollY + rect.height / 2 - viewport / 2;
    let position = index === 0 ? 0 : centred;
    if (index === TIMELINE.length - 1) position = maxScroll;
    position = Math.max(position, previous + 1);
    previous = position;
    return position;
  });
}

export default function SiteCanvas({ onSun }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let site;
    try {
      site = createSiteScene(canvasRef.current, { reducedMotion, onSun });
    } catch (error) {
      // Without WebGL the page still reads on its CSS dusk gradient.
      console.warn('3D scene unavailable', error);
      document.documentElement.classList.add('no-webgl');
      return undefined;
    }

    const measure = () => site.setStopPositions(measureStops());
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    document.fonts?.ready.then(measure);

    return () => {
      observer.disconnect();
      site.dispose();
    };
  }, [onSun]);

  return <canvas ref={canvasRef} className="site-canvas" aria-hidden="true" />;
}
