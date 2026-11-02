import { useImperativeHandle, useRef } from 'react';
import { formatClock, TIMELINE } from '../scene/timeline.js';

const WIDTH = 120;
const HORIZON_Y = 16;
const MARGIN = 6;
const toY = (elevation) => HORIZON_Y - elevation * 1.15;
const toX = (progress) => MARGIN + progress * (WIDTH - MARGIN * 2);

const path = TIMELINE.map(
  ({ sunElevation }, index) => `${toX(index / (TIMELINE.length - 1))},${toY(sunElevation)}`,
).join(' ');

// Fixed readout of the scene's sun position. It updates every animation frame,
// so it writes to the DOM directly instead of re-rendering through React.
export default function SunDial({ ref }) {
  const time = useRef(null);
  const label = useRef(null);
  const dot = useRef(null);

  useImperativeHandle(
    ref,
    () => ({
      update({ minutes, elevation, progress }) {
        if (!time.current) return;
        time.current.textContent = formatClock(minutes);
        const degrees = Math.round(Math.abs(elevation));
        label.current.textContent = `Sun ${degrees}° ${elevation >= 0 ? 'above' : 'below'} horizon`;
        dot.current.setAttribute('cx', toX(progress));
        dot.current.setAttribute('cy', toY(elevation));
      },
    }),
    [],
  );

  return (
    <div className="sun-dial" aria-hidden="true">
      <svg viewBox="0 0 120 44" width="120" height="44">
        <line className="sun-dial__horizon" x1="0" x2={WIDTH} y1={HORIZON_Y} y2={HORIZON_Y} />
        <polyline className="sun-dial__path" points={path} />
        <circle ref={dot} className="sun-dial__sun" r="3" cx={toX(0)} cy={toY(9)} />
      </svg>
      <div className="sun-dial__readout">
        <span ref={time} className="sun-dial__time">
          17:20
        </span>
        <span ref={label} className="sun-dial__label">
          Sun 9° above horizon
        </span>
      </div>
    </div>
  );
}
