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
  /** Counter horizontal span & slant [cx, cw, slant] */
  counterSpec: [number, number, number];
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

function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

/**
 * Viscous wave easing with subtle organic swell (꿀렁거리는 탄성 곡선)
 */
function easeViscous(t: number): number {
  const s = easeInOutSine(t);
  return s + Math.sin(t * Math.PI * 2) * 0.055 * Math.sin(t * Math.PI);
}

function mirrorPose(pose: MonolithPose): MonolithPose {
  const edge: Pt[] = [...pose.edge]
    .reverse()
    .map(([x, y]) => [1 - x, y]);
  const [cx, cw, slant] = pose.counterSpec;
  return {
    edge,
    counterSpec: [1 - cx - cw, cw, -slant],
  };
}

/**
 * Evaluates the outer contour's y value at a given normalized x along a monotonic edge.
 */
function sampleEdgeY(edge: Pt[], x: number): number {
  if (x <= edge[0][0]) return edge[0][1];
  for (let i = 0; i < edge.length - 1; i++) {
    const [x0, y0] = edge[i];
    const [x1, y1] = edge[i + 1];
    if (x >= x0 && x <= x1) {
      if (Math.abs(x1 - x0) < 1e-6) return Math.min(y0, y1);
      const t = (x - x0) / (x1 - x0);
      return y0 + (y1 - y0) * t;
    }
  }
  return edge[edge.length - 1][1];
}

/**
 * Finds the shallowest (for top) or deepest (for bottom) outer edge y across [xStart, xEnd]
 * so we can mathematically guarantee a thick, bold black ink bridge around every counter cutout.
 */
function extremeEdgeY(
  edge: Pt[],
  xStart: number,
  xEnd: number,
  mode: 'min' | 'max'
): number {
  let result = mode === 'min' ? 1.5 : -0.5;
  const steps = 14;
  for (let s = 0; s <= steps; s++) {
    const sx = xStart + ((xEnd - xStart) * s) / steps;
    const sy = sampleEdgeY(edge, clamp01(sx));
    result = mode === 'min' ? Math.min(result, sy) : Math.max(result, sy);
  }
  for (const [ex, ey] of edge) {
    if (ex >= xStart && ex <= xEnd) {
      result = mode === 'min' ? Math.min(result, ey) : Math.max(result, ey);
    }
  }
  return result;
}

/**
 * Generates high-contrast, dramatically shifting Poster-01 / Poster-02 TOP silhouettes.
 * Alternating `variant` indices invert peaks and deep bays for radical, sculptural motion.
 */
function generateTopPose(flipped: boolean, variant: number): MonolithPose {
  const mode = variant % 3;

  const x1 =
    mode === 0
      ? rand(0.02, 0.06)
      : mode === 1
        ? rand(0.09, 0.15)
        : rand(0.04, 0.1);
  const x2 = x1 + (mode === 1 ? rand(0.11, 0.17) : rand(0.06, 0.11));
  const x3 = x2 + rand(0.05, 0.11);
  const x4 = x3 + (mode === 0 ? rand(0.11, 0.16) : rand(0.06, 0.11));
  const x5 = x4 + (mode === 2 ? rand(0.11, 0.16) : rand(0.07, 0.12));
  const x6 = x5 + rand(0.06, 0.11);
  const x7 = x6 + rand(0.06, 0.11);
  const x8 = clamp(x7 + rand(0.09, 0.16), 0.64, 0.82);
  const x9 = clamp(x8 + rand(0.08, 0.14), 0.8, 0.94);

  const leftDrop =
    mode === 0
      ? rand(0.98, 1.15)
      : mode === 1
        ? rand(0.38, 0.56)
        : rand(0.84, 1.04);
  const midShelf =
    mode === 0
      ? rand(0.36, 0.54)
      : mode === 1
        ? rand(0.94, 1.12)
        : rand(0.46, 0.64);
  const midProng =
    mode === 0
      ? rand(0.94, 1.14)
      : mode === 1
        ? rand(0.72, 0.88)
        : rand(1.0, 1.16);
  const notchUp =
    mode === 0
      ? rand(0.7, 0.86)
      : mode === 1
        ? rand(0.44, 0.62)
        : rand(0.74, 0.9);
  const rightProng =
    mode === 0
      ? rand(0.82, 0.98)
      : mode === 1
        ? rand(0.98, 1.15)
        : rand(0.76, 0.94);
  const deepBay =
    mode === 0
      ? rand(0.2, 0.36)
      : mode === 1
        ? rand(0.46, 0.64)
        : rand(0.18, 0.32);
  const farRightDrop =
    mode === 0
      ? rand(0.74, 0.94)
      : mode === 1
        ? rand(0.96, 1.14)
        : rand(0.88, 1.08);

  const edge: Pt[] = [
    [0.0, mode === 1 ? rand(0.68, 0.92) : rand(0.28, 0.52)],
    [x1, mode === 1 ? rand(0.56, 0.78) : rand(0.22, 0.42)],
    [x1, leftDrop],
    [x2, leftDrop],
    [x3, midShelf],
    [x4, midShelf],
    [x4, midProng],
    [x5, midProng],
    [x6, notchUp],
    [x7, rightProng],
    [x8, mode === 1 ? rand(0.72, 0.88) : rand(0.44, 0.66)],
    [x8, deepBay],
    [x9, deepBay],
    [x9, farRightDrop],
    [1.0, clamp(farRightDrop - rand(-0.08, 0.16), 0.52, 1.08)],
  ];

  const cw = rand(0.085, 0.13);
  const cx = clamp(
    mode === 0
      ? rand(0.38, 0.52)
      : mode === 1
        ? rand(0.5, 0.64)
        : rand(0.42, 0.58),
    0.34,
    0.72 - cw
  );
  const slant = rand(0.03, 0.065);

  const pose: MonolithPose = { edge, counterSpec: [cx, cw, slant] };
  return flipped ? mirrorPose(pose) : pose;
}

/**
 * Generates high-contrast, dramatically shifting Poster-01 / Poster-02 BOTTOM silhouettes.
 * Alternating `variant` indices invert peaks and deep valleys for bold kinetic energy.
 */
function generateBottomPose(flipped: boolean, variant: number): MonolithPose {
  const mode = variant % 3;

  const x1 =
    mode === 0
      ? rand(0.04, 0.09)
      : mode === 1
        ? rand(0.11, 0.17)
        : rand(0.06, 0.12);
  const x2 = x1 + (mode === 0 ? rand(0.09, 0.14) : rand(0.05, 0.1));
  const x3 = x2 + rand(0.05, 0.1);
  const x4 = x3 + (mode === 1 ? rand(0.12, 0.17) : rand(0.07, 0.13));
  const x5 = x4 + rand(0.06, 0.12);
  const x6 = x5 + (mode === 2 ? rand(0.12, 0.17) : rand(0.08, 0.14));
  const x7 = clamp(x6 + rand(0.06, 0.12), 0.55, 0.75);
  const x8 = clamp(x7 + rand(0.08, 0.14), 0.68, 0.85);
  const x9 = clamp(x8 + rand(0.04, 0.09), 0.77, 0.91);
  const x10 = clamp(x9 + rand(0.04, 0.08), 0.85, 0.96);

  const leftBlock =
    mode === 0
      ? rand(-0.1, 0.12)
      : mode === 1
        ? rand(0.32, 0.5)
        : rand(0.02, 0.2);
  const leftSlot =
    mode === 0
      ? rand(0.56, 0.74)
      : mode === 1
        ? rand(0.18, 0.36)
        : rand(0.46, 0.66);
  const peak1 =
    mode === 0
      ? rand(-0.12, 0.06)
      : mode === 1
        ? rand(0.22, 0.38)
        : rand(-0.08, 0.1);
  const centerValley =
    mode === 0
      ? rand(0.36, 0.54)
      : mode === 1
        ? rand(-0.08, 0.12)
        : rand(0.28, 0.46);
  const peak2 =
    mode === 0
      ? rand(-0.06, 0.12)
      : mode === 1
        ? rand(0.2, 0.36)
        : rand(-0.14, 0.04);
  const rightStep =
    mode === 0
      ? rand(0.4, 0.58)
      : mode === 1
        ? rand(0.14, 0.3)
        : rand(0.34, 0.52);
  const rightShelf =
    mode === 0
      ? rand(0.1, 0.28)
      : mode === 1
        ? rand(-0.06, 0.14)
        : rand(0.18, 0.34);

  const edge: Pt[] = [
    [0.0, leftBlock],
    [x1, leftBlock],
    [x1, leftSlot],
    [x2, leftSlot],
    [x3, mode === 1 ? rand(0.02, 0.2) : rand(0.24, 0.44)],
    [x4, peak1],
    [x5, centerValley],
    [x6, peak2],
    [x7, clamp(peak2 + rand(0.04, 0.16), -0.02, 0.34)],
    [x7, rightStep],
    [x8, rightStep],
    [x9, rightShelf],
    [x10, rightShelf],
    [x10, mode === 1 ? rand(0.34, 0.52) : rand(0.56, 0.74)],
    [1.0, mode === 1 ? rand(0.22, 0.42) : rand(0.46, 0.66)],
  ];

  const cw = rand(0.085, 0.125);
  const cx = clamp(
    mode === 0
      ? rand(0.46, 0.58)
      : mode === 1
        ? rand(0.56, 0.68)
        : rand(0.5, 0.64),
    0.42,
    0.76 - cw
  );
  const slant = rand(0.08, 0.14);

  const pose: MonolithPose = { edge, counterSpec: [cx, cw, slant] };
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
      generateTopPose(flipTop, 0),
      generateTopPose(flipTop, 1),
      generateTopPose(flipTop, 2),
      generateTopPose(flipTop, 0),
      generateTopPose(flipTop, 1),
      generateTopPose(flipTop, 2),
    ];
    const bottomPoses: MonolithPose[] = [
      generateBottomPose(flipBottom, 1),
      generateBottomPose(flipBottom, 2),
      generateBottomPose(flipBottom, 0),
      generateBottomPose(flipBottom, 1),
      generateBottomPose(flipBottom, 2),
      generateBottomPose(flipBottom, 0),
    ];

    // Medium tempo with a distinct still hold on each pose after undulating
    const topCycle = rand(3.8, 4.5);
    const bottomCycle = rand(4.1, 4.8);
    const topPhase = rand(0, topCycle * topPoses.length);
    const bottomPhase = rand(0, bottomCycle * bottomPoses.length);
    const morphedEdge: Pt[] = Array.from({ length: 15 }, () => [0, 0]);

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
        height * (isCompact ? 0.25 : 0.305),
        isCompact ? 184 : 272
      );

      const overscan = 68;
      const drawW = width + overscan * 2;
      const dir = isTop ? 1 : -1;

      const totalCycle = (elapsed + phaseShift) / cycleDuration;
      const idx = Math.floor(totalCycle) % poses.length;
      const nextIdx = (idx + 1) % poses.length;
      const raw = totalCycle - Math.floor(totalCycle);

      // Hold completely still for 24% of each cycle (~1.0s), then undulate into the next pose
      const hold = 0.24;
      const morphPhase =
        !prefersReduced && raw > hold
          ? clamp01((raw - hold) / (1 - hold))
          : 0;
      const globalEnv = Math.sin(morphPhase * Math.PI);

      const surgeX =
        Math.sin(morphPhase * Math.PI * 2 * dir + idx * 1.3) * 22 * globalEnv;
      const surgeY =
        Math.sin(morphPhase * Math.PI * 2 - 0.6) * 11 * globalEnv;
      const shiftX =
        -overscan + surgeX + (smoothPx - 0.5) * (isTop ? -52 : 52);
      const baseY = isTop
        ? -scrollOffset + focusBoost * 22 + surgeY
        : height - bandH + scrollOffset - focusBoost * 22 - surgeY;

      const from = poses[idx];
      const to = poses[nextIdx];

      // 1. Unified single-path solid #000000 display-type mass:
      // ripples like a heavy wave during morphPhase (0 -> 1) and locks completely still during hold
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      if (isTop) {
        ctx.moveTo(-overscan - 10, -80);
      } else {
        ctx.moveTo(-overscan - 10, height + 80);
      }

      const nPts = from.edge.length;
      let prevX = 0;

      for (let i = 0; i < nPts; i++) {
        const [fx, fy] = from.edge[i];
        const [tx, ty] = to.edge[i];

        // Travelling phase lag across the contour so vertices ripple sequentially,
        // yet all finish at morphPhase === 1 so the entire monolith comes to a full stop
        const spatialPhase = isTop ? fx : 1 - fx;
        const staggerSpan = 0.34;
        const localRaw =
          morphPhase <= 0
            ? 0
            : clamp01(
                (morphPhase - spatialPhase * staggerSpan) / (1 - staggerSpan)
              );
        const localT = !prefersReduced ? easeViscous(localRaw) : 0;
        const localEnv = Math.sin(localRaw * Math.PI);

        let mx = fx + (tx - fx) * localT;
        let my = fy + (ty - fy) * localT;

        if (!prefersReduced && localEnv > 0.0001) {
          // Horizontal undulation gated by localEnv (0 at start and 0 at rest)
          if (i > 0 && i < nPts - 1) {
            const xSwell =
              Math.sin(localRaw * Math.PI * 2 - fx * 4.6 * dir) *
              0.026 *
              localEnv;
            mx = clamp(mx + xSwell, prevX, 0.985);
          }

          // Vertical multi-harmonic undulation (꿀렁거리다 정지)
          const ySwell =
            (Math.sin(localRaw * Math.PI * 2.5 - fx * 5.4 * dir + i * 0.35) *
              0.125 +
              Math.cos(localRaw * Math.PI * 2 + i * 0.6) * 0.055) *
            localEnv;
          my = clamp(my + ySwell, 0.04, 1.16);
        }

        prevX = mx;
        morphedEdge[i][0] = mx;
        morphedEdge[i][1] = my;
        ctx.lineTo(shiftX + mx * drawW, baseY + my * bandH);
      }

      if (isTop) {
        ctx.lineTo(width + overscan + 10, -80);
      } else {
        ctx.lineTo(width + overscan + 10, height + 80);
      }
      ctx.closePath();
      ctx.fill();

      // 2. Signature crisp #808080 negative-space counter cutout riding the same gated undulation
      const [fcx, fcw, fslant] = from.counterSpec;
      const [tcx, tcw, tslant] = to.counterSpec;
      const counterT = !prefersReduced ? easeViscous(morphPhase) : 0;
      const counterSwellX = !prefersReduced
        ? Math.sin(morphPhase * Math.PI * 2 * dir) * 0.02 * globalEnv
        : 0;
      const cx = fcx + (tcx - fcx) * counterT + counterSwellX;
      const cw = fcw + (tcw - fcw) * counterT;
      const slant =
        fslant +
        (tslant - fslant) * counterT +
        (!prefersReduced
          ? Math.sin(morphPhase * Math.PI * 2) * 0.016 * globalEnv
          : 0);

      ctx.fillStyle = '#808080';
      ctx.beginPath();

      if (isTop) {
        const minOuterY = extremeEdgeY(
          morphedEdge,
          cx - 0.04,
          cx + cw + 0.04,
          'min'
        );
        const ch = clamp(minOuterY - 0.36, 0.14, 0.34);
        const pts: [Pt, Pt, Pt, Pt] = [
          [cx, -0.04],
          [cx + cw, -0.04],
          [cx + cw - slant, ch],
          [cx, ch],
        ];
        for (let i = 0; i < 4; i++) {
          const px = shiftX + pts[i][0] * drawW;
          const py = baseY + pts[i][1] * bandH;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
      } else {
        const maxOuterY = extremeEdgeY(
          morphedEdge,
          cx - 0.04,
          cx + cw + 0.04,
          'max'
        );
        const counterTop = clamp(maxOuterY + 0.38, 0.64, 0.85);
        const leftTop = clamp(counterTop + Math.abs(slant), 0.72, 0.93);
        const pts: [Pt, Pt, Pt, Pt] =
          slant >= 0
            ? [
                [cx, leftTop],
                [cx + cw, counterTop],
                [cx + cw, 1.06],
                [cx, 1.06],
              ]
            : [
                [cx, counterTop],
                [cx + cw, leftTop],
                [cx + cw, 1.06],
                [cx, 1.06],
              ];
        for (let i = 0; i < 4; i++) {
          const px = shiftX + pts[i][0] * drawW;
          const py = baseY + pts[i][1] * bandH;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
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
