import React, { useEffect, useState } from 'react';

type MorphPhase = 'gongju' | 'deconstruct' | 'gongAndJu';

interface StrokeRect {
  x: number;
  y: number;
  w: number;
  h: number;
  rotate: number;
  opacity?: number;
}

const PHASE_LABELS: { id: MorphPhase; label: string }[] = [
  { id: 'gongju', label: '公主' },
  { id: 'deconstruct', label: '해체' },
  { id: 'gongAndJu', label: '共 · 主' },
];

/**
 * 6 architectural vector strokes that physically transform 公 (4 strokes) → 해체 → 共 (6 strokes)
 * Every stroke is a crisp pure-black geometric bar rotating & gliding cleanly into place.
 */
const LEFT_STROKES: Record<MorphPhase, StrokeRect[]> = {
  // State 0: 公 (tightly paired next to 主 on x: 46..162)
  gongju: [
    // s1: 公 top-left diagonal (丿) -> becomes 共 bottom-left leg (丿)
    { x: 64, y: 50, w: 50, h: 11, rotate: -58, opacity: 1 },
    // s2: 公 top-right diagonal (丶) -> becomes 共 bottom-right leg (丶)
    { x: 102, y: 50, w: 50, h: 11, rotate: 58, opacity: 1 },
    // s3: 公 lower-left slant (厶 left) -> becomes 共 left vertical pillar (丨)
    { x: 68, y: 106, w: 52, h: 11, rotate: -56, opacity: 1 },
    // s4: 公 bottom horizontal (厶 base) -> becomes 共 main lower crossbar (一)
    { x: 62, y: 132, w: 80, h: 11, rotate: 0, opacity: 1 },
    // s5: 公 lower-right dot (厶 dot) -> becomes 共 right vertical pillar (丨)
    { x: 120, y: 118, w: 28, h: 11, rotate: 52, opacity: 1 },
    // s6: Hidden cleanly inside s4 until reassembly -> becomes 共 upper crossbar (一)
    { x: 74, y: 132, w: 56, h: 11, rotate: 0, opacity: 0 },
  ],
  // State 1: 해체 (strokes cleanly detach & open outward along 0°/90°/45° axes)
  deconstruct: [
    { x: 24, y: 88, w: 46, h: 11, rotate: -52, opacity: 1 },
    { x: 102, y: 88, w: 46, h: 11, rotate: 52, opacity: 1 },
    { x: 44, y: 66, w: 56, h: 11, rotate: -90, opacity: 1 },
    { x: 22, y: 116, w: 116, h: 11, rotate: 0, opacity: 1 },
    { x: 102, y: 66, w: 56, h: 11, rotate: 90, opacity: 1 },
    { x: 38, y: 52, w: 84, h: 11, rotate: 0, opacity: 0.7 },
  ],
  // State 2: 共 (reassembled cleanly on left x: 14..142, separated from 主)
  gongAndJu: [
    // s1: 共 bottom-left leg (丿)
    { x: 32, y: 132, w: 42, h: 11, rotate: -52, opacity: 1 },
    // s2: 共 bottom-right leg (丶)
    { x: 86, y: 132, w: 42, h: 11, rotate: 52, opacity: 1 },
    // s3: 共 left vertical pillar (丨)
    { x: 26, y: 74, w: 66, h: 11, rotate: 90, opacity: 1 },
    // s4: 共 lower main horizontal crossbar (一)
    { x: 16, y: 102, w: 128, h: 11, rotate: 0, opacity: 1 },
    // s5: 共 right vertical pillar (丨)
    { x: 68, y: 74, w: 66, h: 11, rotate: 90, opacity: 1 },
    // s6: 共 upper horizontal crossbar (一)
    { x: 32, y: 60, w: 96, h: 11, rotate: 0, opacity: 1 },
  ],
};

/**
 * 5 architectural vector strokes of 主 that glide cleanly from tight 公主 pairing
 * into an independent, open architectural right-side position.
 */
const RIGHT_STROKES: Record<MorphPhase, StrokeRect[]> = {
  // Tight next to 公 (x: 190..298)
  gongju: [
    // j1: Top crown dot (丶)
    { x: 233, y: 38, w: 22, h: 11, rotate: 45, opacity: 1 },
    // j2: Top horizontal bar (一)
    { x: 196, y: 62, w: 96, h: 11, rotate: 0, opacity: 1 },
    // j3: Middle horizontal bar (一)
    { x: 208, y: 98, w: 72, h: 11, rotate: 0, opacity: 1 },
    // j4: Base horizontal bar (一)
    { x: 186, y: 136, w: 116, h: 11, rotate: 0, opacity: 1 },
    // j5: Center vertical spine (丨)
    { x: 204, y: 99, w: 80, h: 11, rotate: 90, opacity: 1 },
  ],
  // Slightly detached & opening rightward
  deconstruct: [
    { x: 262, y: 28, w: 22, h: 11, rotate: 45, opacity: 1 },
    { x: 224, y: 60, w: 98, h: 11, rotate: 0, opacity: 1 },
    { x: 238, y: 98, w: 74, h: 11, rotate: 0, opacity: 1 },
    { x: 214, y: 140, w: 120, h: 11, rotate: 0, opacity: 1 },
    { x: 234, y: 99, w: 82, h: 11, rotate: 90, opacity: 1 },
  ],
  // Settled cleanly on right (x: 218..342), balanced across the open space from 共
  gongAndJu: [
    { x: 269, y: 38, w: 22, h: 11, rotate: 45, opacity: 1 },
    { x: 230, y: 62, w: 100, h: 11, rotate: 0, opacity: 1 },
    { x: 244, y: 98, w: 72, h: 11, rotate: 0, opacity: 1 },
    { x: 218, y: 136, w: 124, h: 11, rotate: 0, opacity: 1 },
    { x: 240, y: 99, w: 80, h: 11, rotate: 90, opacity: 1 },
  ],
};

/**
 * Minimal vector motion-graphic: the actual angular strokes of 公 physically detach
 * and reassemble into 共 while separating cleanly from 主.
 */
const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const PrefaceStrokeMorph: React.FC = () => {
  const [phase, setPhase] = useState<MorphPhase>(() =>
    prefersReducedMotion() ? 'gongAndJu' : 'gongju'
  );
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion() || paused) return;

    const durations: Record<MorphPhase, number> = {
      gongju: 2200,
      deconstruct: 900,
      gongAndJu: 3200,
    };

    const nextMap: Record<MorphPhase, MorphPhase> = {
      gongju: 'deconstruct',
      deconstruct: 'gongAndJu',
      gongAndJu: 'gongju',
    };

    const timer = window.setTimeout(() => {
      setPhase(nextMap[phase]);
    }, durations[phase]);

    return () => window.clearTimeout(timer);
  }, [phase, paused]);

  const leftList = LEFT_STROKES[phase];
  const rightList = RIGHT_STROKES[phase];
  const isSplit = phase === 'gongAndJu';

  const handleSelectPhase = (target: MorphPhase) => {
    setPaused(true);
    setPhase(target);
  };

  return (
    <div
      className={`pdf-stroke-morph pdf-stroke-morph--${phase}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <svg
        viewBox="0 0 360 192"
        className="pdf-stroke-morph__svg"
        role="img"
        aria-label="공주(公主)의 한자 획이 해체되어 공(共)과 주(主)로 재조립되는 모션그래픽"
      >
        {/* Left Character Strokes: 公 → 해체 → 共 */}
        <g fill="#000000">
          {leftList.map((s, idx) => {
            const cx = s.x + s.w / 2;
            const cy = s.y + s.h / 2;
            return (
              <rect
                key={`left-${idx}`}
                x={-s.w / 2}
                y={-s.h / 2}
                width={s.w}
                height={s.h}
                className="pdf-stroke-morph__bar"
                style={{
                  transform: `translate(${cx}px, ${cy}px) rotate(${s.rotate}deg)`,
                  opacity: s.opacity ?? 1,
                }}
              />
            );
          })}
        </g>

        {/* Right Character Strokes: 主 */}
        <g fill="#000000">
          {rightList.map((s, idx) => {
            const cx = s.x + s.w / 2;
            const cy = s.y + s.h / 2;
            return (
              <rect
                key={`right-${idx}`}
                x={-s.w / 2}
                y={-s.h / 2}
                width={s.w}
                height={s.h}
                className="pdf-stroke-morph__bar"
                style={{
                  transform: `translate(${cx}px, ${cy}px) rotate(${s.rotate}deg)`,
                  opacity: s.opacity ?? 1,
                }}
              />
            );
          })}
        </g>

        {/* Subtle editorial caption appearing cleanly under 共 & 主 when reassembled */}
        <g
          className={`pdf-stroke-morph__labels ${isSplit ? 'is-visible' : ''}`}
          fill="#141414"
          fontSize="12"
          fontWeight="600"
          textAnchor="middle"
        >
          <text x="80" y="182">
            함께 공
          </text>
          <text x="280" y="182">
            주인 주
          </text>
        </g>
      </svg>

      {/* Whisper-minimal phase selector (also lets visitor step manually) */}
      <div className="pdf-stroke-morph__controls" role="tablist" aria-label="해체 단계">
        {PHASE_LABELS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={phase === item.id}
            className={`pdf-stroke-morph__step ${
              phase === item.id ? 'is-active' : ''
            }`}
            onClick={() => handleSelectPhase(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};
