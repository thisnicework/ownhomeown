import React, { useEffect, useState } from 'react';

type MorphPhase = 'whole' | 'cut' | 'split';

const PHASES: { id: MorphPhase; label: string }[] = [
  { id: 'whole', label: '公主' },
  { id: 'cut', label: '해체' },
  { id: 'split', label: '共 · 主' },
];

const DURATIONS: Record<MorphPhase, number> = {
  whole: 2800,
  cut: 1500,
  split: 3800,
};

const NEXT: Record<MorphPhase, MorphPhase> = {
  whole: 'cut',
  cut: 'split',
  split: 'whole',
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A real serif glyph rendered as two horizontally sliced halves. */
const SlicedGlyph: React.FC<{ char: string; className?: string }> = ({
  char,
  className = '',
}) => (
  <span className={`psm__glyph ${className}`.trim()} aria-hidden="true">
    <span className="psm__half psm__half--top">{char}</span>
    <span className="psm__half psm__half--bottom">{char}</span>
  </span>
);

/**
 * 公主 → (sliced) → 共 · 主
 * Uses real typeface glyphs: the word is cut along a horizontal line,
 * the halves shear apart, 公 is replaced by 共, and the two characters separate.
 */
export const PrefaceStrokeMorph: React.FC = () => {
  const [phase, setPhase] = useState<MorphPhase>(() =>
    prefersReducedMotion() ? 'split' : 'whole'
  );
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion() || paused) return;
    const timer = window.setTimeout(
      () => setPhase(NEXT[phase]),
      DURATIONS[phase]
    );
    return () => window.clearTimeout(timer);
  }, [phase, paused]);

  return (
    <div
      className={`psm psm--${phase}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="psm__word"
        role="img"
        aria-label="공주(公主)가 공(共)과 주(主)로 해체되는 타이포그래피"
      >
        <span className="psm__slot psm__slot--left">
          <span className="psm__stack">
            <SlicedGlyph char="公" className="psm__glyph--old" />
            <SlicedGlyph char="共" className="psm__glyph--new" />
          </span>
          <span className="psm__label">함께 공</span>
        </span>

        <span className="psm__slot psm__slot--right">
          <span className="psm__stack">
            <SlicedGlyph char="主" />
          </span>
          <span className="psm__label">주인 주</span>
        </span>

        <span className="psm__cutline" aria-hidden="true" />
      </div>

      <div className="psm__controls" role="tablist" aria-label="해체 단계">
        {PHASES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={phase === item.id}
            className={`psm__step ${phase === item.id ? 'is-active' : ''}`}
            onClick={() => {
              setPaused(true);
              setPhase(item.id);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};
