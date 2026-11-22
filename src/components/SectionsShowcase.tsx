import React, { useCallback, useEffect, useState } from 'react';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import { EXHIBITION_SECTIONS, type ExhibitionSectionData } from '../data/exhibition';
import { CosmosFloorplan, type SectionId } from './CosmosFloorplan';
import { WorkPreviewModal } from './WorkPreviewModal';

type MobileFloorFilter = 'all' | '1F' | '2F';

const PREVIEW_HASH_PREFIX = '#preview/';

function parsePreviewHash(): SectionId | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash;
  if (!hash.startsWith(PREVIEW_HASH_PREFIX)) return null;
  const candidate = hash.slice(PREVIEW_HASH_PREFIX.length) as SectionId;
  const match = EXHIBITION_SECTIONS.find(
    (s) => s.id === candidate && (s.preview?.items.length ?? 0) > 0
  );
  return match ? match.id : null;
}

/**
 * Preserves the exact PDF Page 2 three-column spread on desktop while elevating it
 * with synchronized spatial-text focus, subtle participant disclosure, a tactile
 * sticky 1F/2F floor switcher on tablet & mobile, and Plan-A full-screen artwork previews.
 */
export const SectionsShowcase: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const [mobileFloor, setMobileFloor] = useState<MobileFloorFilter>('all');
  const [openArtists, setOpenArtists] = useState<Record<string, boolean>>({});
  const [previewSectionId, setPreviewSectionId] = useState<SectionId | null>(
    () => parsePreviewHash()
  );

  const sec1 = EXHIBITION_SECTIONS[0];
  const sec2 = EXHIBITION_SECTIONS[1];
  const sec3 = EXHIBITION_SECTIONS[2];
  const sec4 = EXHIBITION_SECTIONS[3];

  const openPreview = useCallback((id: SectionId) => {
    const target = EXHIBITION_SECTIONS.find((s) => s.id === id);
    if (!target || (target.preview?.items.length ?? 0) === 0) return;
    setPreviewSectionId(id);
    const nextHash = `${PREVIEW_HASH_PREFIX}${id}`;
    if (window.location.hash !== nextHash) {
      window.history.pushState(null, '', nextHash);
    }
  }, []);

  const closePreview = useCallback(() => {
    setPreviewSectionId(null);
    if (window.location.hash.startsWith(PREVIEW_HASH_PREFIX)) {
      window.history.replaceState(
        null,
        '',
        window.location.pathname + window.location.search + '#sections'
      );
    }
  }, []);

  useEffect(() => {
    const onHashOrPop = () => {
      setPreviewSectionId(parsePreviewHash());
    };
    window.addEventListener('hashchange', onHashOrPop);
    window.addEventListener('popstate', onHashOrPop);
    return () => {
      window.removeEventListener('hashchange', onHashOrPop);
      window.removeEventListener('popstate', onHashOrPop);
    };
  }, []);

  const handleSelectSection = (id: SectionId) => {
    const target = EXHIBITION_SECTIONS.find((s) => s.id === id);
    const hasPreview = (target?.preview?.items.length ?? 0) > 0;

    // Second click on an already-focused room opens its artwork preview directly
    if (activeSection === id && hasPreview) {
      openPreview(id);
      return;
    }

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
    const hasPreview = (sec.preview?.items.length ?? 0) > 0;

    return (
      <article
        key={sec.id}
        id={sec.id}
        className={`pdf-sec-block pdf-sec-block--${theme} ${
          isActive ? 'is-highlighted' : ''
        } ${isDimmed ? 'is-dimmed' : ''}`}
        onPointerEnter={(e) => {
          if (e.pointerType === 'mouse') setActiveSection(sec.id);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === 'mouse') setActiveSection(null);
        }}
      >
        <h2 className="pdf-sec-block__title">{sec.headerTitle}</h2>

        <div className="pdf-sec-block__intro">
          {sec.intro.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>

        {hasPreview ? (
          <h3 className="pdf-sec-block__work">
            <button
              type="button"
              className="pdf-sec-work-btn"
              onClick={() => openPreview(sec.id)}
            >
              <span>{sec.artworkTitle}</span>
              <ArrowUpRight size={15} className="pdf-sec-work-btn__icon" />
            </button>
          </h3>
        ) : (
          <h3 className="pdf-sec-block__work">{sec.artworkTitle}</h3>
        )}

        <div className="pdf-sec-block__desc">
          {sec.description.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>

        <div className="pdf-sec-block__meta">
          <div className="pdf-sec-block__actions">
            <button
              type="button"
              className="pdf-sec-toggle"
              aria-expanded={expanded}
              onClick={() => toggleArtists(sec.id)}
            >
              <span>참여 {sec.artists.length + (sec.sound?.length ?? 0)}인</span>
              <ChevronDown
                size={14}
                className={`pdf-sec-toggle__icon ${expanded ? 'is-open' : ''}`}
              />
            </button>

            {hasPreview && (
              <button
                type="button"
                className="pdf-sec-preview-btn"
                onClick={() => openPreview(sec.id)}
              >
                <span>작품 미리보기</span>
                <ArrowUpRight size={14} className="pdf-sec-preview-btn__icon" />
              </button>
            )}
          </div>
          <div className={`pdf-sec-artists ${expanded ? 'is-open' : ''}`}>
            <div className="pdf-sec-artists__inner">
              <p>{sec.artists.join(' · ')}</p>
              {sec.sound && sec.sound.length > 0 && (
                <p className="pdf-sec-artists__sound">
                  <span className="pdf-sec-artists__role">사운드</span>{' '}
                  {sec.sound.join(' · ')}
                </p>
              )}
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

      <WorkPreviewModal
        sectionId={previewSectionId}
        onSelectSection={openPreview}
        onClose={closePreview}
      />
    </section>
  );
};
