import React, { useEffect, useRef, useState } from 'react';

type MorphTarget = 'gongju' | 'gongAndJu';

/**
 * Calligraphic Myeongjo cubic-Bézier stroke definition in a 140×140 em-box:
 * - Spine: (x0, y0) -> (cx1, cy1) -> (cx2, cy2) -> (x1, y1)
 * - Variable brush width: w0 (start), wMid (center), w1 (end)
 * - Optical serif terminals (startCap / endCap) matching Noto Serif KR / Batang
 */
interface CalligStroke {
  x0: number;
  y0: number;
  cx1: number;
  cy1: number;
  cx2: number;
  cy2: number;
  x1: number;
  y1: number;
  w0: number;
  wMid: number;
  w1: number;
  serifEnd?: number; // 0..1 intensity of Myeongjo right/top triangular serif (우로코)
  serifStart?: number; // 0..1 intensity of angled press-in entry (기필)
  alpha?: number;
}

interface MorphStrokePair {
  from: CalligStroke;
  to: CalligStroke;
  delay: number; // 0..0.28 subtle natural stroke stagger
}

/**
 * 6 calligraphic strokes that smoothly morph 公 (4 strokes) <-> 共 (6 strokes)
 * inside a 140×140 em-box.
 */
const GONG_MORPH_STROKES: MorphStrokePair[] = [
  // 1. 公 좌상단 삐침(丿) -> 共 좌하단 삐침(丿)
  {
    delay: 0.08,
    from: {
      x0: 52, y0: 25, cx1: 44, cy1: 42, cx2: 31, cy2: 58, x1: 15, y1: 72,
      w0: 7.4, wMid: 5.2, w1: 1.2, serifStart: 0.7, serifEnd: 0, alpha: 1,
    },
    to: {
      x0: 52, y0: 96, cx1: 45, cy1: 108, cx2: 33, cy2: 118, x1: 17, y1: 127,
      w0: 7.6, wMid: 5.2, w1: 1.2, serifStart: 0.75, serifEnd: 0, alpha: 1,
    },
  },
  // 2. 公 우상단 파임(丶) -> 共 우하단 점(丶)
  {
    delay: 0.14,
    from: {
      x0: 82, y0: 20, cx1: 93, cy1: 37, cx2: 106, cy2: 54, x1: 125, y1: 68,
      w0: 4.8, wMid: 6.4, w1: 9.2, serifStart: 0.3, serifEnd: 0.4, alpha: 1,
    },
    to: {
      x0: 86, y0: 96, cx1: 98, cy1: 105, cx2: 109, cy2: 114, x1: 121, y1: 124,
      w0: 3.4, wMid: 6.2, w1: 8.6, serifStart: 0.2, serifEnd: 0.3, alpha: 1,
    },
  },
  // 3. 公 하단 꺾임 좌사선(厶) -> 共 좌측 세로기둥(丨)
  {
    delay: 0.0,
    from: {
      x0: 66, y0: 62, cx1: 56, cy1: 82, cx2: 43, cy2: 101, x1: 29, y1: 118,
      w0: 7.6, wMid: 6.2, w1: 4.4, serifStart: 0.8, serifEnd: 0, alpha: 1,
    },
    to: {
      x0: 49, y0: 21, cx1: 49, cy1: 43, cx2: 49, cy2: 65, x1: 49, y1: 86,
      w0: 8.2, wMid: 7.2, w1: 6.8, serifStart: 0.85, serifEnd: 0, alpha: 1,
    },
  },
  // 4. 公 하단 가로획(厶 밑변) -> 共 주 가로획(一)
  {
    delay: 0.04,
    from: {
      x0: 27, y0: 118, cx1: 52, cy1: 115, cx2: 79, cy2: 112, x1: 106, y1: 108,
      w0: 5.2, wMid: 5.2, w1: 4.8, serifStart: 0.2, serifEnd: 0.35, alpha: 1,
    },
    to: {
      x0: 13, y0: 86, cx1: 50, cy1: 86, cx2: 88, cy2: 86, x1: 127, y1: 86,
      w0: 4.6, wMid: 4.9, w1: 5.4, serifStart: 0.25, serifEnd: 1.0, alpha: 1,
    },
  },
  // 5. 公 우하단 점(厶 점) -> 共 우측 세로기둥(丨)
  {
    delay: 0.1,
    from: {
      x0: 93, y0: 87, cx1: 101, cy1: 98, cx2: 109, cy2: 110, x1: 116, y1: 123,
      w0: 3.4, wMid: 6.4, w1: 8.4, serifStart: 0.15, serifEnd: 0.2, alpha: 1,
    },
    to: {
      x0: 91, y0: 19, cx1: 91, cy1: 42, cx2: 91, cy2: 64, x1: 91, y1: 86,
      w0: 8.2, wMid: 7.2, w1: 6.8, serifStart: 0.85, serifEnd: 0, alpha: 1,
    },
  },
  // 6. 共 상단 가로획(一) — 중앙에서 자연스럽게 뻗어 나오는 보조 가로획
  {
    delay: 0.18,
    from: {
      x0: 70, y0: 51, cx1: 70, cy1: 51, cx2: 70, cy2: 51, x1: 70, y1: 51,
      w0: 1.0, wMid: 1.0, w1: 1.0, serifStart: 0, serifEnd: 0, alpha: 0,
    },
    to: {
      x0: 25, y0: 51, cx1: 54, cy1: 51, cx2: 86, cy2: 51, x1: 115, y1: 51,
      w0: 4.4, wMid: 4.7, w1: 5.2, serifStart: 0.25, serifEnd: 0.95, alpha: 1,
    },
  },
];

/**
 * 5 matching Myeongjo calligraphic strokes of 主 inside the same 140×140 em-box
 * so 公/共 and 主 share identical print-grade stroke weight and serif DNA.
 */
const JU_STROKES: CalligStroke[] = [
  // 1. 상단 점획 (丶)
  {
    x0: 61, y0: 17, cx1: 66, cy1: 23, cx2: 71, cy2: 30, x1: 76, y1: 37,
    w0: 3.8, wMid: 6.8, w1: 8.2, serifStart: 0.2, serifEnd: 0.2, alpha: 1,
  },
  // 2. 상단 가로획 (一)
  {
    x0: 25, y0: 46, cx1: 54, cy1: 46, cx2: 86, cy2: 46, x1: 116, y1: 46,
    w0: 4.6, wMid: 4.8, w1: 5.2, serifStart: 0.25, serifEnd: 1.0, alpha: 1,
  },
  // 3. 중앙 세로기둥 (丨)
  {
    x0: 70, y0: 46, cx1: 70, cy1: 71, cx2: 70, cy2: 96, x1: 70, y1: 119,
    w0: 7.8, wMid: 7.4, w1: 7.2, serifStart: 0.4, serifEnd: 0, alpha: 1,
  },
  // 4. 중단 가로획 (一)
  {
    x0: 32, y0: 82, cx1: 56, cy1: 82, cx2: 84, cy2: 82, x1: 108, y1: 82,
    w0: 4.5, wMid: 4.7, w1: 5.1, serifStart: 0.25, serifEnd: 0.95, alpha: 1,
  },
  // 5. 하단 기저 가로획 (一)
  {
    x0: 14, y0: 119, cx1: 50, cy1: 119, cx2: 90, cy2: 119, x1: 126, y1: 119,
    w0: 4.8, wMid: 5.1, w1: 5.5, serifStart: 0.25, serifEnd: 1.0, alpha: 1,
  },
];

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeInOutQuart(t: number): number {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

function lerpStroke(a: CalligStroke, b: CalligStroke, t: number): CalligStroke {
  return {
    x0: lerp(a.x0, b.x0, t),
    y0: lerp(a.y0, b.y0, t),
    cx1: lerp(a.cx1, b.cx1, t),
    cy1: lerp(a.cy1, b.cy1, t),
    cx2: lerp(a.cx2, b.cx2, t),
    cy2: lerp(a.cy2, b.cy2, t),
    x1: lerp(a.x1, b.x1, t),
    y1: lerp(a.y1, b.y1, t),
    w0: lerp(a.w0, b.w0, t),
    wMid: lerp(a.wMid, b.wMid, t),
    w1: lerp(a.w1, b.w1, t),
    serifStart: lerp(a.serifStart ?? 0, b.serifStart ?? 0, t),
    serifEnd: lerp(a.serifEnd ?? 0, b.serifEnd ?? 0, t),
    alpha: lerp(a.alpha ?? 1, b.alpha ?? 1, t),
  };
}

/**
 * Renders a smooth variable-width calligraphic Myeongjo brush stroke along a cubic Bézier spine.
 */
function drawCalligStroke(
  ctx: CanvasRenderingContext2D,
  s: CalligStroke,
  ox: number,
  oy: number,
  scale: number
) {
  const alpha = s.alpha ?? 1;
  if (alpha < 0.01) return;

  const dxTotal = s.x1 - s.x0;
  const dyTotal = s.y1 - s.y0;
  if (Math.hypot(dxTotal, dyTotal) < 0.8) return;

  const steps = 24;
  const leftPts: [number, number][] = [];
  const rightPts: [number, number][] = [];

  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const inv = 1 - u;

    // Cubic Bézier point
    const x =
      inv * inv * inv * s.x0 +
      3 * inv * inv * u * s.cx1 +
      3 * inv * u * u * s.cx2 +
      u * u * u * s.x1;
    const y =
      inv * inv * inv * s.y0 +
      3 * inv * inv * u * s.cy1 +
      3 * inv * u * u * s.cy2 +
      u * u * u * s.y1;

    // Cubic Bézier tangent
    let tx =
      3 * inv * inv * (s.cx1 - s.x0) +
      6 * inv * u * (s.cx2 - s.cx1) +
      3 * u * u * (s.x1 - s.cx2);
    let ty =
      3 * inv * inv * (s.cy1 - s.y0) +
      6 * inv * u * (s.cy2 - s.cy1) +
      3 * u * u * (s.y1 - s.cy2);

    const len = Math.hypot(tx, ty) || 1;
    tx /= len;
    ty /= len;

    // Normal perpendicular to tangent
    const nx = -ty;
    const ny = tx;

    // Quadratic width interpolation: w0 -> wMid -> w1
    const w =
      inv * inv * s.w0 + 2 * inv * u * s.wMid + u * u * s.w1;
    const hw = w * 0.5;

    leftPts.push([ox + (x + nx * hw) * scale, oy + (y + ny * hw) * scale]);
    rightPts.push([ox + (x - nx * hw) * scale, oy + (y - ny * hw) * scale]);
  }

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#0e0e0e';

  ctx.beginPath();
  ctx.moveTo(leftPts[0][0], leftPts[0][1]);
  for (let i = 1; i <= steps; i++) {
    ctx.lineTo(leftPts[i][0], leftPts[i][1]);
  }
  for (let i = steps; i >= 0; i--) {
    ctx.lineTo(rightPts[i][0], rightPts[i][1]);
  }
  ctx.closePath();
  ctx.fill();

  // Authentic Myeongjo triangular horizontal terminal serif (우로코)
  const serifEnd = s.serifEnd ?? 0;
  if (serifEnd > 0.15 && Math.abs(dxTotal) > Math.abs(dyTotal) * 1.5) {
    const ex = ox + s.x1 * scale;
    const ey = oy + s.y1 * scale;
    const sw = 10.5 * serifEnd * scale;
    const sh = 6.2 * serifEnd * scale;
    ctx.beginPath();
    ctx.moveTo(ex - sw, ey - s.w1 * 0.45 * scale);
    ctx.lineTo(ex - sw * 0.28, ey - s.w1 * 0.45 * scale - sh);
    ctx.lineTo(ex + 2.4 * serifEnd * scale, ey + s.w1 * 0.45 * scale);
    ctx.lineTo(ex - sw, ey + s.w1 * 0.45 * scale);
    ctx.closePath();
    ctx.fill();
  }

  // Subtle angled brush entry serif (기필) on vertical / sweeping starts
  const serifStart = s.serifStart ?? 0;
  if (serifStart > 0.35 && Math.abs(dyTotal) >= Math.abs(dxTotal) * 0.7) {
    const sx = ox + s.x0 * scale;
    const sy = oy + s.y0 * scale;
    const r = s.w0 * 0.56 * scale * serifStart;
    ctx.beginPath();
    ctx.moveTo(sx - r * 1.15, sy - r * 0.25);
    ctx.lineTo(sx + r * 0.35, sy - r * 0.9);
    ctx.lineTo(sx + r * 1.25, sy + r * 0.45);
    ctx.lineTo(sx - r * 0.75, sy + r * 0.75);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Fluid 60fps Calligraphic Stroke Morph (公主 <-> 共 · 主):
 * Zero slash/cutline — the actual Myeongjo brush strokes of 公 fluidly curve,
 * straighten, and reassemble into 共 while 主 glides smoothly open beside it.
 */
export const PrefaceStrokeMorph: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [manualTarget, setManualTarget] = useState<MorphTarget | null>(() =>
    prefersReducedMotion() ? 'gongAndJu' : null
  );
  const [displayPhase, setDisplayPhase] = useState<MorphTarget>(() =>
    prefersReducedMotion() ? 'gongAndJu' : 'gongju'
  );
  const [labelOpacity, setLabelOpacity] = useState(() =>
    prefersReducedMotion() ? 1 : 0
  );

  const manualTargetRef = useRef<MorphTarget | null>(manualTarget);

  useEffect(() => {
    manualTargetRef.current = manualTarget;
  }, [manualTarget]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let rafId = 0;
    let isVisible = false;
    let hasTriggeredAuto = prefersReducedMotion();
    let lastNow = performance.now();

    // One-shot auto transition: holds 公主 briefly once scrolled into view,
    // morphs briskly into 共 · 主 (함께 공 / 주인 주), and stays there permanently.
    let autoTime = 0;
    let currentT = prefersReducedMotion() ? 1 : 0;
    let lastReportedPhase: MorphTarget = currentT > 0.5 ? 'gongAndJu' : 'gongju';
    let lastLabelBucket = -1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (entry.isIntersecting) {
          hasTriggeredAuto = true;
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(canvas);

    // One-shot timings (seconds): brief hold on 公主 (0.75s) -> brisk morph (0.95s) -> stay on 共 · 主
    const T_HOLD_1 = 0.75;
    const T_MORPH_FWD = 0.95;

    const render = (now: number) => {
      rafId = window.requestAnimationFrame(render);
      const dt = Math.min(0.05, (now - lastNow) / 1000);
      lastNow = now;
      if (width <= 0 || height <= 0) return;
      if (!isVisible && currentT !== 0 && currentT !== 1) return;

      const manual = manualTargetRef.current;
      if (manual !== null) {
        const goal = manual === 'gongAndJu' ? 1 : 0;
        currentT += (goal - currentT) * Math.min(1, dt * 7.5);
        if (Math.abs(goal - currentT) < 0.002) currentT = goal;
      } else if (!prefersReducedMotion() && hasTriggeredAuto && currentT < 1) {
        autoTime += dt;
        if (autoTime < T_HOLD_1) {
          currentT = 0;
        } else {
          currentT = clamp01((autoTime - T_HOLD_1) / T_MORPH_FWD);
        }
      }

      // Sync UI tab indicator & sub-labels efficiently
      const nextPhase: MorphTarget = currentT >= 0.5 ? 'gongAndJu' : 'gongju';
      if (nextPhase !== lastReportedPhase) {
        lastReportedPhase = nextPhase;
        setDisplayPhase(nextPhase);
      }

      const rawLabelOp = clamp01((currentT - 0.65) / 0.35);
      const bucket = Math.round(rawLabelOp * 25);
      if (bucket !== lastLabelBucket) {
        lastLabelBucket = bucket;
        setLabelOpacity(rawLabelOp);
      }

      // Render crisp calligraphic strokes onto retina canvas
      ctx.clearRect(0, 0, width, height);

      const em = Math.min(height * 0.92, width * 0.38);
      const scale = em / 140;
      const easedOverall = easeInOutQuart(clamp01(currentT));

      // Smoothly expand spacing from tight 公主 -> open 共   主
      const gapTight = em * 0.12;
      const gapOpen = Math.min(em * 0.56, Math.max(gapTight, width - em * 2 - 4));
      const gap = lerp(gapTight, gapOpen, easedOverall);

      const leftX = 2;
      const rightX = leftX + em + gap;
      const topY = (height - em) * 0.5;

      // 1. Morphing left character: 公 -> 共 (per-stroke organic calligraphic stagger)
      for (const pair of GONG_MORPH_STROKES) {
        const localRaw = clamp01((currentT - pair.delay) / (1 - pair.delay));
        const st = easeInOutQuart(localRaw);
        const morphed = lerpStroke(pair.from, pair.to, st);
        drawCalligStroke(ctx, morphed, leftX, topY, scale);
      }

      // 2. Right character: 主 gliding smoothly into independent space
      for (const s of JU_STROKES) {
        drawCalligStroke(ctx, s, rightX, topY, scale);
      }
    };

    rafId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, []);

  const handleSelect = (target: MorphTarget) => {
    setManualTarget(target);
    setDisplayPhase(target);
  };

  return (
    <div className="psm-callig">
      <div
        className="psm-callig__stage"
        onClick={() =>
          handleSelect(displayPhase === 'gongju' ? 'gongAndJu' : 'gongju')
        }
        role="button"
        tabIndex={0}
        aria-label="공주(公主)가 공(共)과 주(主)로 획 전환되는 타이포그래피 — 클릭하여 전환"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleSelect(displayPhase === 'gongju' ? 'gongAndJu' : 'gongju');
          }
        }}
      >
        <canvas ref={canvasRef} className="psm-callig__canvas" />

        <div
          className="psm-callig__labels"
          style={{
            opacity: labelOpacity,
            transform: `translateY(${(1 - labelOpacity) * 6}px)`,
          }}
        >
          <span>함께 공</span>
          <span>주인 주</span>
        </div>
      </div>

      <div className="psm__controls" role="tablist" aria-label="전환 상태">
        <button
          type="button"
          role="tab"
          aria-selected={displayPhase === 'gongju'}
          className={`psm__step ${displayPhase === 'gongju' ? 'is-active' : ''}`}
          onClick={() => handleSelect('gongju')}
        >
          公主
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={displayPhase === 'gongAndJu'}
          className={`psm__step ${displayPhase === 'gongAndJu' ? 'is-active' : ''}`}
          onClick={() => handleSelect('gongAndJu')}
        >
          共 · 主
        </button>
      </div>
    </div>
  );
};
