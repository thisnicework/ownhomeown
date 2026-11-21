import React, { useEffect, useRef } from 'react';

type ActiveGlyph = 'gong' | 'ju' | null;

interface HeroMotionFormsProps {
  activeGlyph: ActiveGlyph;
  scrollRatio: number;
}

type Pt = [number, number];

interface MonolithPose {
  /** Strictly monotonic 15-point outer contour (guarantees glitch-free morphing) */
  edge: Pt[];
  /** Diagonal #808080 counter cutout anchored cleanly inside solid black mass */
  counter: [Pt, Pt, Pt, Pt];
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function clamp01(v: number): number {
  return clamp(v, 0, 1);
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function mirrorPose(pose: MonolithPose): MonolithPose {
  const edge: Pt[] = [...pose.edge]
    .reverse()
    .map(([x, y]) => [1 - x, y]);
  const counter = pose.counter.map(([x, y]) => [1 - x, y] as Pt) as [
    Pt,
    Pt,
    Pt,
    Pt,
  ];
  return { edge, counter };
}

/**
 * Generates a unique, glitch-free Poster-01 style TOP black display-type silhouette.
 * Built strictly left-to-right with 15 monotonic vertices combining stepped vertical bays,
 * 45° chiseled Hanja prongs, and a cleanly placed negative-space counter cutout.
 */
function generateTopPose(flipped: boolean): MonolithPose {
  const x1 = rand(0.03, 0.08);
  const x2 = x1 + rand(0.07, 0.12);
  const x3 = x2 + rand(0.06, 0.11);
  const x4 = x3 + rand(0.09, 0.14);
  const x5 = x4 + rand(0.08, 0.12);
  const x6 = x5 + rand(0.07, 0.11);
  const x7 = x6 + rand(0.07, 0.11);
  const x8 = clamp(x7 + rand(0.11, 0.17), 0.68, 0.8);
  const x9 = clamp(x8 + rand(0.09, 0.14), 0.82, 0.93);

  const leftDrop = rand(0.8, 0.98);
  const midShelf = rand(0.42, 0.64);
  const midProng = rand(0.82, 0.98);
  const notchUp = rand(0.54, 0.74);
  const rightProng = rand(0.84, 0.99);
  const deepBay = rand(0.16, 0.34);
  const farRightDrop = rand(0.78, 0.96);

  const edge: Pt[] = [
    [0.0, rand(0.32, 0.56)],
    [x1, rand(0.22, 0.42)],
    [x1, leftDrop],
    [x2, leftDrop],
    [x3, midShelf],
    [x4, midShelf],
    [x4, midProng],
    [x5, midProng],
    [x6, notchUp],
    [x7, rightProng],
    [x8, rand(0.48, 0.66)],
    [x8, deepBay],
    [x9, deepBay],
    [x9, farRightDrop],
    [1.0, clamp(farRightDrop - rand(0.04, 0.12), 0.62, 0.94)],
  ];

  // Anchor negative-space counter cleanly along the top edge inside a solid black zone
  const cx = rand(0.14, 0.42);
  const cw = rand(0.08, 0.13);
  const ch = rand(0.24, 0.34);
  const slant = rand(0.035, 0.06);
  const counter: [Pt, Pt, Pt, Pt] = [
    [cx, -0.02],
    [cx + cw, -0.02],
    [cx + cw - slant, ch],
    [cx, ch],
  ];

  const pose: MonolithPose = { edge, counter };
  return flipped ? mirrorPose(pose) : pose;
}

/**
 * Generates a unique, glitch-free Poster-01 style BOTTOM black display-type silhouette.
 * Built strictly left-to-right with 15 monotonic vertices combining heavy vertical monoliths,
 * bold twin 45° rising peaks, stepped shoulders, and a diagonal bottom counter cutout.
 */
function generateBottomPose(flipped: boolean): MonolithPose {
  const x1 = rand(0.05, 0.11);
  const x2 = x1 + rand(0.06, 0.11);
  const x3 = x2 + rand(0.05, 0.1);
  const x4 = x3 + rand(0.1, 0.16);
  const x5 = x4 + rand(0.06, 0.1);
  const x6 = x5 + rand(0.11, 0.17);
  const x7 = clamp(x6 + rand(0.06, 0.1), 0.58, 0.72);
  const x8 = clamp(x7 + rand(0.09, 0.14), 0.7, 0.83);
  const x9 = clamp(x8 + rand(0.05, 0.08), 0.78, 0.89);
  const x10 = clamp(x9 + rand(0.05, 0.08), 0.86, 0.95);

  const leftBlock = rand(0.04, 0.22);
  const leftSlot = rand(0.54, 0.72);
  const peak1 = rand(0.02, 0.16);
  const centerValley = rand(0.32, 0.48);
  const peak2 = rand(0.02, 0.14);
  const rightStep = rand(0.36, 0.52);
  const rightShelf = rand(0.22, 0.38);

  const edge: Pt[] = [
    [0.0, leftBlock],
    [x1, leftBlock],
    [x1, leftSlot],
    [x2, leftSlot],
    [x3, rand(0.22, 0.36)],
    [x4, peak1],
    [x5, centerValley],
    [x6, peak2],
    [x7, clamp(peak2 + rand(0.06, 0.14), 0.1, 0.28)],
    [x7, rightStep],
    [x8, rightStep],
    [x9, rightShelf],
    [x10, rightShelf],
    [x10, rand(0.62, 0.78)],
    [1.0, rand(0.48, 0.66)],
  ];

  // Place diagonal counter cleanly in the thick lower black ink zone
  const cx = rand(0.58, 0.78);
  const cw = rand(0.08, 0.12);
  const cy = rand(0.66, 0.76);
  const counter: [Pt, Pt, Pt, Pt] = [
    [cx, cy + 0.08],
    [cx + cw, cy - 0.08],
    [cx + cw, cy + 0.22],
    [cx, 1.04],
  ];

  const pose: MonolithPose = { edge, counter };
  return flipped ? mirrorPose(pose) : pose;
}

/**
 * Procedural Poster-Typography Motion Engine:
 * Generates a brand-new set of Poster-01 / Poster-02 style monolithic black display-type
 * compositions on every page refresh, morphing smoothly with zero seam glitches.
 */
export const HeroMotionForms: React.FC<HeroMotionFormsProps> = ({
  activeGlyph,
  scrollRatio,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef({ x: 0.5, active: false });
  const activeGlyphRef = useRef<ActiveGlyph>(activeGlyph);
  const scrollRef = useRef(scrollRatio);

  useEffect(() => {
    activeGlyphRef.current = activeGlyph;
  }, [activeGlyph]);

  useEffect(() => {
    scrollRef.current = scrollRatio;
  }, [scrollRatio]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    // Generate brand-new unique Poster-type pose sequences on every page load/refresh
    // Keeping polarity consistent per session ensures counter cutouts never cross empty bays during morphs
    const flipTop = Math.random() < 0.5;
    const flipBottom = Math.random() < 0.5;
    const topPoses: MonolithPose[] = [
      generateTopPose(flipTop),
      generateTopPose(flipTop),
      generateTopPose(flipTop),
      generateTopPose(flipTop),
    ];
    const bottomPoses: MonolithPose[] = [
      generateBottomPose(flipBottom),
      generateBottomPose(flipBottom),
      generateBottomPose(flipBottom),
      generateBottomPose(flipBottom),
    ];

    const topCycle = rand(6.4, 8.2);
    const bottomCycle = rand(7.0, 9.0);
    const topPhase = rand(0, topCycle * topPoses.length);
    const bottomPhase = rand(0, bottomCycle * bottomPoses.length);

    let width = 0;
    let height = 0;
    let rafId = 0;
    let isVisible = true;
    const startTime = performance.now();

    let smoothPx = 0.5;
    let smoothTopFocus = 0;
    let smoothBottomFocus = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / (rect.width || 1);
      pointerRef.current = {
        x: clamp01(nx),
        active:
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom &&
          nx >= 0 &&
          nx <= 1,
      };
    };

    const onPointerLeave = () => {
      pointerRef.current.active = false;
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', onPointerLeave);

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.02 }
    );
    observer.observe(canvas);

    const drawMonolith = (
      poses: MonolithPose[],
      isTop: boolean,
      elapsed: number,
      cycleDuration: number,
      phaseShift: number,
      scrollOffset: number,
      focusBoost: number
    ) => {
      const isCompact = width < 720;
      const bandH = Math.min(
        height * (isCompact ? 0.23 : 0.285),
        isCompact ? 168 : 252
      );

      const overscan = 48;
      const drawW = width + overscan * 2;
      const shiftX = -overscan + (smoothPx - 0.5) * (isTop ? -36 : 36);
      const baseY = isTop
        ? -scrollOffset + focusBoost * 14
        : height - bandH + scrollOffset - focusBoost * 14;

      const totalCycle = (elapsed + phaseShift) / cycleDuration;
      const idx = Math.floor(totalCycle) % poses.length;
      const nextIdx = (idx + 1) % poses.length;
      const raw = totalCycle - Math.floor(totalCycle);

      const hold = 0.16;
      const morphT =
        !prefersReduced && raw > hold
          ? easeInOutCubic(clamp01((raw - hold) / (1 - hold)))
          : 0;

      const from = poses[idx];
      const to = poses[nextIdx];

      // 1. Unified single-path solid #000000 display-type mass
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      if (isTop) {
        ctx.moveTo(-overscan - 10, -60);
      } else {
        ctx.moveTo(-overscan - 10, height + 60);
      }

      for (let i = 0; i < from.edge.length; i++) {
        const [fx, fy] = from.edge[i];
        const [tx, ty] = to.edge[i];
        const mx = fx + (tx - fx) * morphT;
        const my = fy + (ty - fy) * morphT;
        ctx.lineTo(shiftX + mx * drawW, baseY + my * bandH);
      }

      if (isTop) {
        ctx.lineTo(width + overscan + 10, -60);
      } else {
        ctx.lineTo(width + overscan + 10, height + 60);
      }
      ctx.closePath();
      ctx.fill();

      // 2. Signature crisp #808080 negative-space counter cutout
      ctx.fillStyle = '#808080';
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const [fx, fy] = from.counter[i];
        const [tx, ty] = to.counter[i];
        const mx = fx + (tx - fx) * morphT;
        const my = fy + (ty - fy) * morphT;
        const px = shiftX + mx * drawW;
        const py = baseY + my * bandH;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    };

    const render = (now: number) => {
      rafId = window.requestAnimationFrame(render);
      if (!isVisible || width <= 0 || height <= 0) return;

      const elapsed = (now - startTime) * 0.001;

      const targetX = pointerRef.current.active ? pointerRef.current.x : 0.5;
      smoothPx += (targetX - smoothPx) * 0.05;

      smoothTopFocus +=
        ((activeGlyphRef.current === 'gong' ? 1 : 0) - smoothTopFocus) * 0.09;
      smoothBottomFocus +=
        ((activeGlyphRef.current === 'ju' ? 1 : 0) - smoothBottomFocus) * 0.09;

      const scrollOffset = scrollRef.current * 48;

      ctx.clearRect(0, 0, width, height);

      drawMonolith(
        topPoses,
        true,
        elapsed,
        topCycle,
        topPhase,
        scrollOffset,
        smoothTopFocus
      );
      drawMonolith(
        bottomPoses,
        false,
        elapsed,
        bottomCycle,
        bottomPhase,
        scrollOffset,
        smoothBottomFocus
      );
    };

    rafId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pdf-hero-motion"
      aria-hidden="true"
    />
  );
};
