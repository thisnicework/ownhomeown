import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import {
  PRODUCTION_CREDITS,
  SPECIAL_THANKS_CREDITS,
  SUPPORT_CREDITS,
  type CreditRow,
} from '../data/exhibition';
import { useReveal } from '../hooks/useReveal';

type CreditFilter = 'all' | 'production' | 'special' | 'support';

const FILTER_OPTIONS: { id: CreditFilter; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'production', label: 'PRODUCTION' },
  { id: 'special', label: 'Special Thanks' },
  { id: 'support', label: '도움 주신 분들' },
];

const matchesQuery = (row: CreditRow, q: string) => {
  if (!q) return true;
  return (
    row.role.toLowerCase().includes(q) ||
    (row.subGroup && row.subGroup.toLowerCase().includes(q)) ||
    row.names.some((n) => n.toLowerCase().includes(q))
  );
};

/**
 * PDF Page 1 Center Pure Black Column + Diagonal Grey Wedge,
 * elevated with whisper-minimal typographic filter, hairline name search,
 * and subtle row spotlight hover interaction.
 */
export const CreditsSection: React.FC = () => {
  const [filter, setFilter] = useState<CreditFilter>('all');
  const [query, setQuery] = useState('');
  const [creditsRef, creditsVisible] = useReveal<HTMLDivElement>(0.1);

  const normalized = query.trim().toLowerCase();

  const prodRows = useMemo(
    () => PRODUCTION_CREDITS.filter((r) => matchesQuery(r, normalized)),
    [normalized]
  );
  const filmThanks = useMemo(
    () =>
      SPECIAL_THANKS_CREDITS.filter(
        (r) =>
          r.subGroup === '영화 〈쓰레기 궁전의 신데렐라〉' &&
          matchesQuery(r, normalized)
      ),
    [normalized]
  );
  const exhibitionThanks = useMemo(
    () =>
      SPECIAL_THANKS_CREDITS.filter(
        (r) => r.subGroup === '전시 협력' && matchesQuery(r, normalized)
      ),
    [normalized]
  );
  const facultySupport = useMemo(
    () =>
      SUPPORT_CREDITS.filter(
        (r) => r.subGroup === '학부 및 아카이빙' && matchesQuery(r, normalized)
      ),
    [normalized]
  );
  const centerSupport = useMemo(
    () =>
      SUPPORT_CREDITS.filter(
        (r) =>
          r.subGroup === '〈창작실습지원센터〉' && matchesQuery(r, normalized)
      ),
    [normalized]
  );

  const showProd = (filter === 'all' || filter === 'production') && prodRows.length > 0;
  const showSpecial =
    (filter === 'all' || filter === 'special') &&
    (filmThanks.length > 0 || exhibitionThanks.length > 0);
  const showSupport =
    (filter === 'all' || filter === 'support') &&
    (facultySupport.length > 0 || centerSupport.length > 0);

  const hasResults = showProd || showSpecial || showSupport;

  return (
    <section id="credits" className="pdf-credits-band" aria-label="크레딧">
      <div
        ref={creditsRef}
        className={`pdf-credits-band__container reveal-block ${
          creditsVisible ? 'is-visible' : ''
        }`}
      >
        {/* Whisper-minimal inline filter & hairline search */}
        <div className="pdf-credits-toolbar">
          <div className="pdf-credits-tabs" role="tablist" aria-label="크레딧 분류">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                role="tab"
                aria-selected={filter === opt.id}
                className={`pdf-text-tab ${filter === opt.id ? 'is-active' : ''}`}
                onClick={() => setFilter(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="pdf-credits-search">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="이름 · 파트 검색"
              aria-label="크레딧 이름 또는 파트 검색"
            />
            {query && (
              <button
                type="button"
                className="pdf-credits-search__clear"
                onClick={() => setQuery('')}
                aria-label="검색어 지우기"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {!hasResults ? (
          <div className="pdf-credits-empty">
            <p>“{query}”에 해당하는 크레딧이 없습니다.</p>
            <button
              type="button"
              className="pdf-action-link pdf-action-link--light"
              onClick={() => {
                setQuery('');
                setFilter('all');
              }}
            >
              전체 보기
            </button>
          </div>
        ) : (
          <div
            className={`pdf-credits-band__inner ${
              filter !== 'all' ? 'is-single-col' : ''
            }`}
          >
            {showProd && (
              <div className="pdf-credits-col">
                <h2 className="pdf-credits-title">PRODUCTION CREDITS</h2>
                <dl className="pdf-credits-dl">
                  {prodRows.map((row) => (
                    <div
                      key={row.role}
                      className={`pdf-credits-row ${
                        row.role.startsWith('SECTION')
                          ? 'pdf-credits-row--section'
                          : ''
                      }`}
                    >
                      <dt>{row.role}</dt>
                      <dd>{row.names.join(' ')}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {showSpecial && (
              <div className="pdf-credits-col">
                <h2 className="pdf-credits-title">Special Thanks to</h2>

                {filmThanks.length > 0 && (
                  <>
                    <p className="pdf-credits-subhead">
                      영화 〈쓰레기 궁전의 신데렐라〉
                    </p>
                    <dl className="pdf-credits-dl">
                      {filmThanks.map((row) => (
                        <div key={row.role} className="pdf-credits-row">
                          <dt>{row.role}</dt>
                          <dd>{row.names.join(' ')}</dd>
                        </div>
                      ))}
                    </dl>
                  </>
                )}

                {exhibitionThanks.length > 0 && (
                  <dl className="pdf-credits-dl pdf-credits-dl--spaced">
                    {exhibitionThanks.map((row) => (
                      <div key={row.role} className="pdf-credits-row">
                        <dt>{row.role}</dt>
                        <dd>{row.names.join(' ')}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            )}

            {showSupport && (
              <div className="pdf-credits-col">
                <h2 className="pdf-credits-title">도움 주신 분들</h2>
                {facultySupport.length > 0 && (
                  <dl className="pdf-credits-dl">
                    {facultySupport.map((row) => (
                      <div
                        key={row.role}
                        className="pdf-credits-row pdf-credits-row--wide-dt"
                      >
                        <dt>{row.role}</dt>
                        <dd>{row.names.join(' ')}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                {centerSupport.length > 0 && (
                  <>
                    <p className="pdf-credits-subhead pdf-credits-subhead--spaced">
                      〈창작실습지원센터〉
                    </p>
                    <dl className="pdf-credits-dl">
                      {centerSupport.map((row) => (
                        <div
                          key={row.role}
                          className="pdf-credits-row pdf-credits-row--wide-dt"
                        >
                          <dt>{row.role}</dt>
                          <dd>{row.names.join(' ')}</dd>
                        </div>
                      ))}
                    </dl>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
