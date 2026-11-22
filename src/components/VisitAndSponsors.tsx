import React, { useState } from 'react';
import { ArrowUp, Check, ChevronDown, Copy, ExternalLink } from 'lucide-react';
import {
  EXHIBITION_META,
  SPONSORS,
  VISITOR_GUIDELINES,
} from '../data/exhibition';
import { useReveal } from '../hooks/useReveal';
import { GongJuTitleLockup } from './TitleLockup';

export const VisitAndSponsors: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [openNote, setOpenNote] = useState<string>('01');
  const [visitRef, visitVisible] = useReveal<HTMLDivElement>(0.12);
  const [sponsorRef, sponsorVisible] = useReveal<HTMLDivElement>(0.12);

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(EXHIBITION_META.address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = EXHIBITION_META.address;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      {/* 06. 관람안내 — Pure White (#FFFFFF) + Interactive Accordions & Links */}
      <section id="visit" className="pdf-visit-band" aria-label="관람안내">
        <div
          ref={visitRef}
          className={`pdf-visit-band__inner reveal-block ${
            visitVisible ? 'is-visible' : ''
          }`}
        >
          <div className="pdf-visit-band__col">
            <h2 className="pdf-section-heading pdf-section-heading--dark">관람안내</h2>

            <dl className="pdf-plain-dl pdf-plain-dl--dark">
              <div>
                <dt>전시기간</dt>
                <dd>
                  {EXHIBITION_META.datesFull}
                  <span className="pdf-dl-sub">{EXHIBITION_META.datesCompact}</span>
                </dd>
              </div>
              <div>
                <dt>관람시간</dt>
                <dd>
                  {EXHIBITION_META.hours}
                  <span className="pdf-dl-sub">{EXHIBITION_META.lastAdmission}</span>
                </dd>
              </div>
              <div>
                <dt>전시장소</dt>
                <dd>
                  {EXHIBITION_META.venueName}
                  <span className="pdf-dl-sub">{EXHIBITION_META.address}</span>
                </dd>
              </div>
              <div>
                <dt>관람료</dt>
                <dd>{EXHIBITION_META.admission}</dd>
              </div>
              <div>
                <dt>공간구성</dt>
                <dd>
                  <span>1F 주主 — SECTION 1, SECTION 2</span>
                  <span>2F 공共 — SECTION 3, SECTION 4</span>
                </dd>
              </div>
            </dl>

            <div className="pdf-visit-links">
              <button
                type="button"
                className="pdf-action-link pdf-action-link--dark"
                onClick={handleCopyAddress}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? '주소 복사 완료' : '주소 복사'}
              </button>
              <a
                href={EXHIBITION_META.naverMapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="pdf-action-link pdf-action-link--dark"
              >
                네이버 지도
                <ExternalLink size={13} />
              </a>
              <a
                href={EXHIBITION_META.kakaoMapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="pdf-action-link pdf-action-link--dark"
              >
                카카오맵
                <ExternalLink size={13} />
              </a>
            </div>
          </div>

          <div className="pdf-visit-band__col">
            <h3 className="pdf-visit-subhead">관람 안내 및 유의사항</h3>
            <div className="pdf-visit-notes">
              {VISITOR_GUIDELINES.map((item) => {
                const isOpen = openNote === item.num;
                return (
                  <div
                    key={item.num}
                    className={`pdf-visit-note ${isOpen ? 'is-open' : ''}`}
                  >
                    <button
                      type="button"
                      className="pdf-visit-note__trigger"
                      aria-expanded={isOpen}
                      onClick={() =>
                        setOpenNote((prev) => (prev === item.num ? '' : item.num))
                      }
                    >
                      <span className="pdf-visit-note__num">{item.num}</span>
                      <span className="pdf-visit-note__title">{item.title}</span>
                      <ChevronDown
                        size={15}
                        className="pdf-visit-note__chevron"
                      />
                    </button>
                    <div className="pdf-visit-note__body">
                      <div className="pdf-visit-note__body-inner">
                        <p>{item.detail}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 07. 스폰서 — Flat Grey (#808080), Bookend to PDF Cover */}
      <section id="sponsors" className="pdf-sponsors-band" aria-label="스폰서 및 협력">
        <div
          ref={sponsorRef}
          className={`pdf-sponsors-band__inner reveal-block ${
            sponsorVisible ? 'is-visible' : ''
          }`}
        >
          <div className="pdf-sponsors-band__head">
            <h2 className="pdf-section-heading pdf-section-heading--dark">
              스폰서 · 주최 · 협력
            </h2>
            <p className="pdf-sponsors-band__note">{EXHIBITION_META.subtitle}</p>
          </div>

          <dl className="pdf-sponsors-list">
            {SPONSORS.map((item) => (
              <div key={item.id} className="pdf-sponsor-row">
                <dt>
                  {item.categoryLabel.split('·')[1]?.trim() ?? item.categoryLabel}
                </dt>
                <dd>
                  <strong>{item.nameKo}</strong>
                  <span className="pdf-sponsor-row__en">{item.nameEn}</span>
                  <span className="pdf-sponsor-row__desc">{item.description}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Minimal Pure Black Footer */}
      <footer className="pdf-footer">
        <div className="pdf-footer__inner">
          <GongJuTitleLockup size="nav" tone="light" />
          <p className="pdf-footer__meta">
            {EXHIBITION_META.subtitle} · {EXHIBITION_META.datesCompact}{' '}
            {EXHIBITION_META.hours} · {EXHIBITION_META.venueName}{' '}
            {EXHIBITION_META.address}
          </p>
          <button
            type="button"
            className="pdf-footer__top"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="맨 위로 이동"
          >
            <ArrowUp size={14} />
            <span>TOP</span>
          </button>
        </div>
      </footer>
    </>
  );
};
