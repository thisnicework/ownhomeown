import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { EXHIBITION_SECTIONS, type ExhibitionSectionData } from '../data/exhibition';
import { CosmosFloorplan, type SectionId } from './CosmosFloorplan';

type MobileFloorFilter = 'all' | '1F' | '2F';

/**
 * Preserves the exact PDF Page 2 three-column spread on desktop while elevating it
 * with synchronized spatial-text focus, subtle participant disclosure, and a tactile
 * sticky 1F/2F floor switcher on tablet & mobile viewports.
 */
export const SectionsShowcase: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const [mobileFloor, setMobileFloor] = useState<MobileFloorFilter>('all');
  const [openArtists, setOpenArtists] = useState<Record<string, boolean>>({});

  const sec1 = EXHIBITION_SECTIONS[0];
  const sec2 = EXHIBITION_SECTIONS[1];
  const sec3 = EXHIBITION_SECTIONS[2];
  const sec4 = EXHIBITION_SECTIONS[3];

  const handleSelectSection = (id: SectionId) => {
    setActiveSection(id);
    if (id === 'section-1' || id === 'section-2') {
      if (mobileFloor === '2F') setMobileFloor('1F');
    } else if (mobileFloor === '1F') {
      setMobileFloor('2F');
    }
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  };

  const toggleArtists = (id: string) => {
    setOpenArtists((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderSectionBlock = (
    sec: ExhibitionSectionData,
    theme: 'light' | 'dark'
  ) => {
    const isActive = activeSection === sec.id;
    const isDimmed = activeSection !== null && activeSection !== sec.id;
    const expanded = Boolean(openArtists[sec.id]);

    return (
      <article
        key={sec.id}
        id={sec.id}
        className={`pdf-sec-block pdf-sec-block--${theme} ${
          isActive ? 'is-highlighted' : ''
        } ${isDimmed ? 'is-dimmed' : ''}`}
        onMouseEnter={() => setActiveSection(sec.id)}
        onMouseLeave={() => setActiveSection(null)}
      >
        <h2 className="pdf-sec-block__title">{sec.headerTitle}</h2>

        <div className="pdf-sec-block__intro">
          {sec.intro.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>

        <h3 className="pdf-sec-block__work">{sec.artworkTitle}</h3>

        <div className="pdf-sec-block__desc">
          {sec.description.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>

        <div className="pdf-sec-block__meta">
          <button
            type="button"
            className="pdf-sec-toggle"
            aria-expanded={expanded}
            onClick={() => toggleArtists(sec.id)}
          >
            <span>참여 {sec.artists.length}인</span>
            <ChevronDown
              size={14}
              className={`pdf-sec-toggle__icon ${expanded ? 'is-open' : ''}`}
            />
          </button>
          <div className={`pdf-sec-artists ${expanded ? 'is-open' : ''}`}>
            <div className="pdf-sec-artists__inner">
              <p>{sec.artists.join(' · ')}</p>
              <small>{sec.participationNote}</small>
            </div>
          </div>
        </div>
      </article>
    );
  };

  return (
    <section
      id="sections"
      className={`pdf-spread-wrap pdf-spread-wrap--filter-${mobileFloor.toLowerCase()}`}
      aria-label="작품 및 공간 평면도"
    >
      {/* Responsive Mobile/Tablet Sticky Floor Bar (hidden on desktop 3-col spread) */}
      <div className="pdf-floor-switcher" role="tablist" aria-label="층별 보기 전환">
        <button
          type="button"
          role="tab"
          aria-selected={mobileFloor === 'all'}
          className={`pdf-floor-switcher__btn ${
            mobileFloor === 'all' ? 'is-active' : ''
          }`}
          onClick={() => setMobileFloor('all')}
        >
          전체 보기
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileFloor === '1F'}
          className={`pdf-floor-switcher__btn ${
            mobileFloor === '1F' ? 'is-active' : ''
          }`}
          onClick={() => setMobileFloor('1F')}
        >
          1F 주主 · SEC 1–2
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileFloor === '2F'}
          className={`pdf-floor-switcher__btn ${
            mobileFloor === '2F' ? 'is-active' : ''
          }`}
          onClick={() => setMobileFloor('2F')}
        >
          2F 공共 · SEC 3–4
        </button>
      </div>

      <div className="pdf-spread">
        {/* Left Column — Pure White (#FFFFFF) : SECTION 1 & SECTION 2 */}
        <div className="pdf-spread__col pdf-spread__col--white">
          {[sec1, sec2].map((sec) => renderSectionBlock(sec, 'light'))}
        </div>

        {/* Center Column — Top Black (공共 2F) + Bottom White (주主 1F) */}
        <div className="pdf-spread__col pdf-spread__col--plans">
          <div className="pdf-spread__plan-half pdf-spread__plan-half--2f">
            <CosmosFloorplan
              floor="2F"
              activeSection={activeSection}
              onSelectSection={handleSelectSection}
              onHoverSection={setActiveSection}
            />
          </div>
          <div className="pdf-spread__plan-half pdf-spread__plan-half--1f">
            <CosmosFloorplan
              floor="1F"
              activeSection={activeSection}
              onSelectSection={handleSelectSection}
              onHoverSection={setActiveSection}
            />
          </div>
        </div>

        {/* Right Column — Pure Black (#000000) : SECTION 3 & SECTION 4 */}
        <div className="pdf-spread__col pdf-spread__col--black">
          {[sec3, sec4].map((sec) => renderSectionBlock(sec, 'dark'))}
        </div>
      </div>
    </section>
  );
};
