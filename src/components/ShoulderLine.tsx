"use client";

import { useEffect, useRef, useState } from "react";

/** Rendered stroke width in CSS px (brief: about 1–1.5px). */
const STROKE_PX = 1.25;
const VIEWBOX_WIDTH = 1000;

/**
 * The olive "shoulder" line in the home statement section: one thin
 * path that rises gently, rounds over and falls away, like the line of a
 * one-shoulder gown. It is drawn progressively and scroll-linked — the
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
      viewBox={`0 0 ${VIEWBOX_WIDTH} 160`}
      preserveAspectRatio="none"
      // Mirrored under RTL so it draws from the reading side.
      className={`block h-16 w-full sm:h-20 rtl:-scale-x-100 ${className}`}
    >
      <path
        ref={pathRef}
        d="M 0 150 C 170 146, 300 118, 420 72 C 505 40, 575 22, 640 34 C 720 50, 790 105, 1000 152"
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
