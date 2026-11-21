import React, { useEffect, useRef, useState } from 'react';
import { EXHIBITION_META, PREFACE_CONTENT } from '../data/exhibition';
import { useReveal } from '../hooks/useReveal';
import { HeroMotionForms } from './HeroMotionForms';

type ActiveGlyph = 'gong' | 'ju' | null;

const PREFACE_STAGES = [
  { num: '01', label: '주어진 서사' },
  { num: '02', label: '해체와 재해석' },
  { num: '03', label: '공동의 집' },
];

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Main Hero (#overview) + Exhibition Preface (#preface) with
 * scroll-driven typographic deconstruction (公主 → 共 · 主) in the left sticky column.
 */
export const OverviewAndPreface: React.FC = () => {
  const [activeGlyph, setActiveGlyph] = useState<ActiveGlyph>(null);
  const [scrollRatio, setScrollRatio] = useState(0);
  const [prefaceProgress, setPrefaceProgress] = useState(0);

  const heroRef = useRef<HTMLElement | null>(null);
  const prefaceSectionRef = useRef<HTMLElement | null>(null);

  const [prefaceRef, prefaceVisible] = useReveal<HTMLDivElement>(0.12);
  const [staggerRef, staggerVisible] = useReveal<HTMLDivElement>(0.25);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    const onScroll = () => {
      const heroEl = heroRef.current;
      if (heroEl && !prefersReduced) {
        const h = heroEl.offsetHeight || 1;
        setScrollRatio(clamp01(window.scrollY / h));
      }

      const prefEl = prefaceSectionRef.current;
      if (prefEl) {
        if (prefersReduced) {
          setPrefaceProgress(1);
          return;
        }
        const rect = prefEl.getBoundingClientRect();
        const vh = window.innerHeight || 1;
        // Hold intact 公主 until #preface reaches the upper reading zone, then deconstruct as user reads down
        const start = vh * 0.16;
        const end = -Math.max(rect.height - vh * 0.58, vh * 0.42);
        const raw = (start - rect.top) / (start - end);
        setPrefaceProgress(clamp01(raw));
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const toggleGlyph = (glyph: 'gong' | 'ju') => {
    setActiveGlyph((prev) => (prev === glyph ? null : glyph));
  };

  // Deconstruction kinematics: keep 公主 intact on entry, then swap & split smoothly mid-read
  const swapT = clamp01((prefaceProgress - 0.26) / 0.38); // 公 -> 共 swap
  const splitT = clamp01((prefaceProgress - 0.32) / 0.44); // 公主 -> 共   主 separation
  const activeStage = prefaceProgress < 0.32 ? 0 : prefaceProgress < 0.72 ? 1 : 2;

  return (
    <>
      {/* 01. 전시개요 — Morphing Top/Bottom Black Motion-Graphics Sculptures on Flat #808080 */}
      <section
        id="overview"
        ref={heroRef}
        className={`pdf-cover-band ${activeGlyph ? `is-hero-${activeGlyph}` : ''}`}
        aria-label="전시개요"
      >
        <HeroMotionForms activeGlyph={activeGlyph} scrollRatio={scrollRatio} />

        {/* Center Sculptural Lockup & Info */}
        <div className="pdf-cover-band__center">
          <h1
            className={`pdf-cover-band__title ${
              activeGlyph ? `is-focus-${activeGlyph}` : ''
            }`}
          >
            <span
              className="pdf-wordmark pdf-wordmark--cover pdf-wordmark--dark pdf-wordmark--interactive"
              aria-label="공과 주 (공共과 주主)"
            >
              <button
                type="button"
                className={`pdf-glyph-btn ${activeGlyph === 'gong' ? 'is-active' : ''}`}
                onMouseEnter={() => setActiveGlyph('gong')}
                onMouseLeave={() => setActiveGlyph(null)}
                onClick={() => toggleGlyph('gong')}
                aria-pressed={activeGlyph === 'gong'}
                aria-label="공(共) 의미 보기"
              >
                <span className="pdf-wordmark__ko">공</span>
                <span className="pdf-wordmark__hanja" aria-hidden="true">
                  共
                </span>
              </button>

              <span className="pdf-wordmark__conj" aria-hidden="true">
                과
              </span>

              <button
                type="button"
                className={`pdf-glyph-btn ${activeGlyph === 'ju' ? 'is-active' : ''}`}
                onMouseEnter={() => setActiveGlyph('ju')}
                onMouseLeave={() => setActiveGlyph(null)}
                onClick={() => toggleGlyph('ju')}
                aria-pressed={activeGlyph === 'ju'}
                aria-label="주(主) 의미 보기"
              >
                <span className="pdf-wordmark__ko">주</span>
                <span className="pdf-wordmark__hanja" aria-hidden="true">
                  主
                </span>
              </button>
            </span>
          </h1>

          <div className="pdf-cover-band__meaning" aria-live="polite">
            {activeGlyph === 'gong' && (
              <p className="pdf-meaning-line">
                <strong>共 함께 공</strong> — 서로의 선택을 존중하고 응답하며 함께
                살아가는 관계의 가능성
              </p>
            )}
            {activeGlyph === 'ju' && (
              <p className="pdf-meaning-line">
                <strong>主 주인 주</strong> — 주어진 역할과 서사에서 벗어나 자신의
                삶을 스스로 선택하는 주체성
              </p>
            )}
            {activeGlyph === null && (
              <p className="pdf-meaning-kicker">2026–2 독립창작프로젝트Ⅱ</p>
            )}
          </div>

          <p className="pdf-cover-band__subtitle">{EXHIBITION_META.subtitle}</p>
          <p className="pdf-cover-band__schedule">
            26.11.25–26.11.28 Wed–Sat {EXHIBITION_META.hours}
          </p>
          <p className="pdf-cover-band__venue">
            {EXHIBITION_META.venueName} {EXHIBITION_META.address}
          </p>
        </div>

        {/* Centered Kinetic Scroll Cue */}
        <a href="#preface" className="pdf-scroll-cue" aria-label="전시서문으로 이동">
          <span className="pdf-scroll-cue__label">SCROLL</span>
          <span className="pdf-scroll-cue__line" aria-hidden="true" />
        </a>
      </section>

      {/* 02. 전시서문 (기획의도) — Left Sticky Scroll-Driven Deconstruction Typo (公主 → 共 · 主) */}
      <section
        id="preface"
        ref={prefaceSectionRef}
        className="pdf-preface-band"
        aria-label="전시서문"
      >
        <div
          ref={prefaceRef}
          className={`pdf-preface-band__inner reveal-block ${
            prefaceVisible ? 'is-visible' : ''
          }`}
        >
          <aside className="pdf-preface-aside">
            <p className="pdf-preface-band__origin">
              본 전시는 2026-2 독립창작프로젝트Ⅱ 선정작 단편영화
              <br />
              〈쓰레기 궁전의 신데렐라〉의 이야기를 전시의 언어로 확장합니다.
            </p>

            {/* Scroll-Driven Typographic Deconstruction Stage: 公主 → 共 · 主 */}
            <div
              className="pdf-deconstruct-stage"
              aria-label="공주에서 공과 주로의 스크롤 해체 타이포그래피"
            >
              <div className="pdf-deconstruct-glyphs">
                {/* Left Character: 公 morphing into 共 */}
                <div
                  className="pdf-deconstruct-char pdf-deconstruct-char--left"
                  style={{
                    transform: `translate3d(${-splitT * 18}px, 0, 0)`,
                  }}
                >
                  <span
                    className="pdf-deconstruct-hanja pdf-deconstruct-hanja--old"
                    style={{
                      opacity: Math.max(0, 1 - swapT * 1.35),
                      transform: `translateY(${-swapT * 18}px)`,
                    }}
                    aria-hidden="true"
                  >
                    公
                  </span>
                  <span
                    className="pdf-deconstruct-hanja pdf-deconstruct-hanja--new"
                    style={{
                      opacity: clamp01((swapT - 0.15) * 1.25),
                      transform: `translateY(${(1 - swapT) * 18}px)`,
                    }}
                  >
                    共
                  </span>
                  <span
                    className="pdf-deconstruct-sub"
                    style={{ opacity: clamp01((splitT - 0.15) * 1.4) }}
                  >
                    함께 공
                  </span>
                </div>

                {/* Vertical Fracture Hairline opening between 共 and 主 */}
                <span
                  className="pdf-deconstruct-crack"
                  aria-hidden="true"
                  style={{
                    transform: `scaleY(${splitT})`,
                    opacity: splitT * 0.55,
                  }}
                />

                {/* Right Character: 主 */}
                <div
                  className="pdf-deconstruct-char pdf-deconstruct-char--right"
                  style={{
                    transform: `translate3d(${splitT * 18}px, 0, 0)`,
                  }}
                >
                  <span className="pdf-deconstruct-hanja">主</span>
                  <span
                    className="pdf-deconstruct-sub"
                    style={{ opacity: clamp01((splitT - 0.15) * 1.4) }}
                  >
                    주인 주
                  </span>
                </div>
              </div>

              {/* Minimal Swiss-grid scroll progress index */}
              <div className="pdf-deconstruct-track" aria-hidden="true">
                <span
                  className="pdf-deconstruct-track__fill"
                  style={{ transform: `scaleX(${prefaceProgress})` }}
                />
              </div>
              <ol className="pdf-deconstruct-steps">
                {PREFACE_STAGES.map((stage, i) => (
                  <li
                    key={stage.num}
                    className={activeStage === i ? 'is-active' : ''}
                  >
                    <span>{stage.num}</span>
                    <span>{stage.label}</span>
                  </li>
                ))}
              </ol>
            </div>
          </aside>

          <div className="pdf-preface-band__content">
            <h2 className="pdf-preface-band__heading">
              {PREFACE_CONTENT.heading}
              <span className="pdf-preface-band__sublabel">전시서문</span>
            </h2>

            <div className="pdf-preface-band__body">
              {PREFACE_CONTENT.paragraphs.map((para, idx) => (
                <p key={idx}>{para}</p>
              ))}
              <p>{PREFACE_CONTENT.closingLead}</p>

              <div
                ref={staggerRef}
                className={`pdf-preface-band__stagger ${
                  staggerVisible ? 'is-visible' : ''
                }`}
              >
                <span className="pdf-stagger-1">
                  {PREFACE_CONTENT.staggeredClimax[0]}
                </span>
                <span className="pdf-stagger-2">
                  {PREFACE_CONTENT.staggeredClimax[1]}
                </span>
                <span className="pdf-stagger-3">
                  {PREFACE_CONTENT.staggeredClimax[2]}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
