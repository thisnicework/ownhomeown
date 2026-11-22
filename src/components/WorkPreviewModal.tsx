import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { EXHIBITION_SECTIONS, type ExhibitionSectionData } from '../data/exhibition';
import type { SectionId } from './CosmosFloorplan';

interface WorkPreviewModalProps {
  sectionId: SectionId | null;
  onSelectSection: (id: SectionId) => void;
  onClose: () => void;
}

/**
 * Monochrome museum gallery overlay for previewing SECTION 1–4 artwork media
 * (images, videos, pixel-art captures, or embeds) with keyboard & swipe support.
 */
export const WorkPreviewModal: React.FC<WorkPreviewModalProps> = ({
  sectionId,
  onSelectSection,
  onClose,
}) => {
  const [mediaIndex, setMediaIndex] = useState(0);
  const touchStartXRef = useRef<number | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  const section: ExhibitionSectionData | null = sectionId
    ? EXHIBITION_SECTIONS.find((s) => s.id === sectionId) ?? null
    : null;

  const items = section?.preview?.items ?? [];
  const safeIndex = items.length > 0 ? Math.min(mediaIndex, items.length - 1) : 0;
  const activeMedia = items[safeIndex] ?? null;

  const availableSections = EXHIBITION_SECTIONS.filter(
    (s) => (s.preview?.items.length ?? 0) > 0
  );

  const switchSection = useCallback(
    (id: SectionId) => {
      setMediaIndex(0);
      onSelectSection(id);
    },
    [onSelectSection]
  );

  const stepMedia = useCallback(
    (dir: -1 | 1) => {
      if (!section) return;
      if (items.length > 1) {
        const nextIdx = safeIndex + dir;
        if (nextIdx >= 0 && nextIdx < items.length) {
          setMediaIndex(nextIdx);
          return;
        }
      }
      if (availableSections.length > 1) {
        const curSecIdx = availableSections.findIndex((s) => s.id === section.id);
        if (curSecIdx !== -1) {
          const nextSec =
            availableSections[
              (curSecIdx + dir + availableSections.length) % availableSections.length
            ];
          switchSection(nextSec.id);
        }
      }
    },
    [section, items.length, safeIndex, availableSections, switchSection]
  );

  // Body scroll lock & initial focus
  useEffect(() => {
    if (!section) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeBtnRef.current?.focus();

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [section]);

  // Keyboard navigation: ESC / ArrowLeft / ArrowRight
  useEffect(() => {
    if (!section) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepMedia(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepMedia(-1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [section, onClose, stepMedia]);

  if (!section || !activeMedia) return null;

  const hasMultipleSlides = items.length > 1 || availableSections.length > 1;
  const floorLabel = section.floor === '1F' ? '1F 주主' : '2F 공共';

  return (
    <div
      className="preview-sheet"
      role="dialog"
      aria-modal="true"
      aria-label={`${section.code} ${section.artworkTitle} 미리보기`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="preview-sheet__panel">
        {/* Top Bar: 4-Section Switcher + Close */}
        <header className="preview-sheet__header">
          <nav
            className="preview-sheet__tabs"
            aria-label="작품 미리보기 섹션 전환"
          >
            {EXHIBITION_SECTIONS.map((sec) => {
              const hasMedia = (sec.preview?.items.length ?? 0) > 0;
              const isCurrent = sec.id === section.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  disabled={!hasMedia}
                  className={`preview-sheet__tab ${isCurrent ? 'is-active' : ''}`}
                  onClick={() => hasMedia && switchSection(sec.id)}
                  title={hasMedia ? sec.artworkTitle : '미리보기 준비 중'}
                >
                  <span>SEC {sec.number.replace(/^0/, '')}</span>
                  {!hasMedia && (
                    <span className="preview-sheet__tab-soon">예정</span>
                  )}
                </button>
              );
            })}
          </nav>

          <button
            ref={closeBtnRef}
            type="button"
            className="preview-sheet__close"
            onClick={onClose}
            aria-label="미리보기 닫기"
          >
            <span className="preview-sheet__esc">ESC</span>
            <X size={18} strokeWidth={1.75} />
          </button>
        </header>

        {/* Center Media Stage */}
        <div
          className="preview-sheet__stage"
          onTouchStart={(e) => {
            touchStartXRef.current = e.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            if (touchStartXRef.current === null) return;
            const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
            const delta = endX - touchStartXRef.current;
            touchStartXRef.current = null;
            if (Math.abs(delta) > 48) {
              stepMedia(delta < 0 ? 1 : -1);
            }
          }}
        >
          {hasMultipleSlides && (
            <button
              type="button"
              className="preview-sheet__nav preview-sheet__nav--prev"
              onClick={() => stepMedia(-1)}
              aria-label="이전 미리보기"
            >
              <ChevronLeft size={22} strokeWidth={1.5} />
            </button>
          )}

          <figure className="preview-sheet__figure" key={`${section.id}-${safeIndex}`}>
            {activeMedia.type === 'image' && (
              <img
                src={activeMedia.src}
                alt={activeMedia.alt}
                className={`preview-sheet__media ${
                  activeMedia.pixelated ? 'is-pixelated' : ''
                }`}
              />
            )}
            {activeMedia.type === 'video' && (
              <video
                src={activeMedia.src}
                poster={activeMedia.poster}
                controls
                playsInline
                preload="metadata"
                className="preview-sheet__media preview-sheet__media--video"
              />
            )}
            {activeMedia.type === 'embed' && (
              <div className="preview-sheet__embed">
                <iframe
                  src={activeMedia.src}
                  title={activeMedia.alt}
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </figure>

          {hasMultipleSlides && (
            <button
              type="button"
              className="preview-sheet__nav preview-sheet__nav--next"
              onClick={() => stepMedia(1)}
              aria-label="다음 미리보기"
            >
              <ChevronRight size={22} strokeWidth={1.5} />
            </button>
          )}
        </div>

        {/* Multi-item indicator bar (only rendered when a section has 2+ media items) */}
        {items.length > 1 && (
          <div className="preview-sheet__pager" role="tablist" aria-label="슬라이드 선택">
            <span className="preview-sheet__count">
              {String(safeIndex + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
            </span>
            <div className="preview-sheet__dots">
              {items.map((item, idx) => (
                <button
                  key={`${item.src}-${idx}`}
                  type="button"
                  role="tab"
                  aria-selected={idx === safeIndex}
                  aria-label={`${idx + 1}번째 미리보기`}
                  className={`preview-sheet__dot ${idx === safeIndex ? 'is-active' : ''}`}
                  onClick={() => setMediaIndex(idx)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Editorial Caption Footer (official exhibition copy only) */}
        <footer className="preview-sheet__footer">
          <div className="preview-sheet__info">
            <span className="preview-sheet__kicker">
              {floorLabel} · {section.headerTitle}
            </span>
            <h3 className="preview-sheet__title">{section.artworkTitle}</h3>
          </div>
          <p className="preview-sheet__artists">{section.artists.join(' · ')}</p>
        </footer>
      </div>
    </div>
  );
};
