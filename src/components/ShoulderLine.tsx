"use client";

import { useEffect, useRef, useState } from "react";

/** Rendered stroke width in CSS px (brief: about 1–1.5px). */
const STROKE_PX = 1.25;
const VIEWBOX_WIDTH = 1000;

/**
 * The olive "shoulder" line in the home statement section: one thin,
 * asymmetric path — a shoulder seen from the front. From the neck side
 * it slopes gently down, rounds over the shoulder point, then falls more
 * steeply toward the arm and ends softly. It is drawn progressively and scroll-linked — the
 * dash offset follows the section's position in the viewport (same idea
 * as the header's scroll-linked color change), not a timed animation.
 * `pathLength="1"` makes the dash offset simply "the undrawn fraction".
 * With prefers-reduced-motion it is shown fully drawn and static.
 */
export default function ShoulderLine({ className = "" }: { className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [strokeWidth, setStrokeWidth] = useState(STROKE_PX);

  // Keep the stroke ~1.25px on screen whatever width the SVG is scaled to.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const update = () => {
      const width = svg.getBoundingClientRect().width;
      if (width > 0) setStrokeWidth((STROKE_PX * VIEWBOX_WIDTH) / width);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const path = pathRef.current;
    const section = svgRef.current?.closest("section");
    if (!path || !section) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const draw = () => {
      frame = 0;
      if (reduced.matches) {
        path.style.strokeDashoffset = "0";
        return;
      }
      // 0 when the section's top reaches the bottom of the viewport,
      // 1 once it has risen to 25% from the top — fully drawn while in view.
      const { top } = section.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = Math.min(1, Math.max(0, (vh - top) / (vh * 0.75)));
      path.style.strokeDashoffset = String(1 - progress);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };

    draw();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    reduced.addEventListener("change", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      reduced.removeEventListener("change", schedule);
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      focusable="false"
      data-testid="shoulder-line"
      viewBox={`0 0 ${VIEWBOX_WIDTH} 360`}
      // Mirrored under RTL so it starts (neck side) on the reading side.
      className={`block h-auto w-full overflow-visible rtl:-scale-x-100 ${className}`}
    >
      <path
        ref={pathRef}
        // neck -> gentle slope -> rounded shoulder point -> steeper fall down the arm, soft end
        d="M 30 8 C 48 58, 110 88, 214 100 C 390 120, 556 142, 680 166 C 790 188, 864 222, 878 280 C 886 314, 884 338, 876 356"
        fill="none"
        stroke="#556B2F"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray="1 1"
        style={{ strokeDashoffset: 1 }}
      />
    </svg>
  );
}
