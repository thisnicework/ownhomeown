import React, { useEffect, useRef, useState } from 'react';
import { EXHIBITION_META, PREFACE_CONTENT } from '../data/exhibition';
import { useReveal } from '../hooks/useReveal';
import { HeroMotionForms } from './HeroMotionForms';

type ActiveGlyph = 'gong' | 'ju' | null;

/**
 * Main Hero (#overview) on flat #808080 background with top & bottom pure-black
 * sculptural silhouettes morphing fluidly like contemporary motion graphics.
 */
export const OverviewAndPreface: React.FC = () => {
  const [activeGlyph, setActiveGlyph] = useState<ActiveGlyph>(null);
  const [scrollRatio, setScrollRatio] = useState(0);
  const heroRef = useRef<HTMLElement | null>(null);

  const [prefaceRef, prefaceVisible] = useReveal<HTMLDivElement>(0.12);
  const [staggerRef, staggerVisible] = useReveal<HTMLDivElement>(0.25);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (prefersReduced) return;

    const onScroll = () => {
      const el = heroRef.current;
      if (!el) return;
      const h = el.offsetHeight || 1;
      setScrollRatio(Math.min(1, Math.max(0, window.scrollY / h)));
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggleGlyph = (glyph: 'gong' | 'ju') => {
    setActiveGlyph((prev) => (prev === glyph ? null : glyph));
  };

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
              <p className="pdf-meaning-kicker">
                2026–2 독립창작프로젝트Ⅱ
              </p>
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

      {/* 02. 전시서문 (기획의도) — PDF Page 1 Left Panel + Staggered Entrance */}
      <section id="preface" className="pdf-preface-band" aria-label="전시서문">
        <div className="pdf-preface-band__black-notch" aria-hidden="true" />

        <div
          ref={prefaceRef}
          className={`pdf-preface-band__inner reveal-block ${
            prefaceVisible ? 'is-visible' : ''
          }`}
        >
          <p className="pdf-preface-band__origin">
            본 전시는 2026-2 독립창작프로젝트Ⅱ 선정작 단편영화
            <br />
            〈쓰레기 궁전의 신데렐라〉의 이야기를 전시의 언어로 확장합니다.
          </p>

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
