import React from 'react';
import { FloorMark } from './TitleLockup';

export type SectionId = 'section-1' | 'section-2' | 'section-3' | 'section-4';

interface CosmosFloorplanProps {
  floor: '1F' | '2F';
  activeSection?: SectionId | null;
  onSelectSection?: (id: SectionId) => void;
  onHoverSection?: (id: SectionId | null) => void;
}

/**
 * Exact architectural floorplan SVG matching PDF Page 2 center column,
 * enhanced with crisp tactile room highlights and interactive badge feedback.
 */
export const CosmosFloorplan: React.FC<CosmosFloorplanProps> = ({
  floor,
  activeSection = null,
  onSelectSection,
  onHoverSection,
}) => {
  const is1F = floor === '1F';
  const strokeMain = is1F ? '#000000' : '#FFFFFF';
  const activeFill = is1F ? 'rgba(0, 0, 0, 0.09)' : 'rgba(255, 255, 255, 0.14)';

  const handleSelect = (id: SectionId) => {
    onSelectSection?.(id);
  };

  return (
    <div className={`pdf-plan pdf-plan--${is1F ? '1f' : '2f'}`}>
      <div className="pdf-plan__mark">
        <FloorMark floor={floor} size="lg" />
      </div>

      {is1F ? (
        <svg
          viewBox="0 0 540 360"
          className="pdf-plan__svg"
          role="img"
          aria-label="코스모스 1층 평면도 (주主 1F): GUESTDESK, INFORMATION, ENT, SECTION 1, SECTION 2"
        >
          <path
            d="M 16 24 L 272 24 A 196 196 0 0 1 460 206 L 460 220"
            fill="none"
            stroke={strokeMain}
            strokeWidth="3.5"
          />
          <path
            d="M 460 264 L 460 338 L 16 338 L 16 24"
            fill="none"
            stroke={strokeMain}
            strokeWidth="3.5"
          />

          <path
            d="M 16 106 L 238 106 A 110 110 0 0 1 346 214 L 346 226"
            fill="none"
            stroke={strokeMain}
            strokeWidth="2.6"
          />
          <line x1="346" y1="264" x2="346" y2="294" stroke={strokeMain} strokeWidth="2.6" />

          <polyline
            points="16,144 64,144 64,188 16,188"
            fill="none"
            stroke={strokeMain}
            strokeWidth="2"
          />
          <polyline
            points="346,294 312,294 312,338"
            fill="none"
            stroke={strokeMain}
            strokeWidth="2.4"
          />
          <polyline
            points="250,338 250,318 292,318 292,338"
            fill="none"
            stroke={strokeMain}
            strokeWidth="2"
          />

          <rect x="132" y="148" width="94" height="25" fill="#8C8C8C" />
          <text
            x="179"
            y="165"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="11.5"
            fontWeight="600"
            letterSpacing="0.04em"
          >
            GUESTDESK
          </text>

          <rect x="234" y="148" width="108" height="25" fill="#8C8C8C" />
          <text
            x="288"
            y="165"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="11.5"
            fontWeight="600"
            letterSpacing="0.04em"
          >
            INFORMATION
          </text>

          <polygon points="471,242 479,236 479,248" fill={strokeMain} />
          <text
            x="484"
            y="247"
            fill={strokeMain}
            fontSize="13.5"
            fontWeight="700"
            letterSpacing="0.04em"
          >
            ENT
          </text>

          {/* SECTION 1 Interactive Zone */}
          <g
            className={`pdf-plan__zone ${activeSection === 'section-1' ? 'is-active' : ''}`}
            onClick={() => handleSelect('section-1')}
            onPointerEnter={(e) => {
              if (e.pointerType === 'mouse') onHoverSection?.('section-1');
            }}
            onPointerLeave={(e) => {
              if (e.pointerType === 'mouse') onHoverSection?.(null);
            }}
            role="button"
            tabIndex={0}
            aria-label="SECTION 1 FILM ROOM 보기"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelect('section-1');
              }
            }}
          >
            <polygon
              className="pdf-plan__zone-area"
              points="18,216 188,216 218,246 218,336 18,336"
              fill={activeSection === 'section-1' ? activeFill : 'transparent'}
            />
            <polyline
              points="16,216 188,216 218,246 218,288"
              fill="none"
              stroke={strokeMain}
              strokeWidth="2.6"
            />
            <line x1="218" y1="316" x2="218" y2="338" stroke={strokeMain} strokeWidth="2.6" />
            <rect className="pdf-plan__badge" x="44" y="242" width="114" height="24" fill="#000000" />
            <text
              x="101"
              y="258.5"
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize="12"
              fontWeight="700"
              letterSpacing="0.05em"
            >
              SECTION 1
            </text>
          </g>

          {/* SECTION 2 Interactive Zone */}
          <g
            className={`pdf-plan__zone ${activeSection === 'section-2' ? 'is-active' : ''}`}
            onClick={() => handleSelect('section-2')}
            onPointerEnter={(e) => {
              if (e.pointerType === 'mouse') onHoverSection?.('section-2');
            }}
            onPointerLeave={(e) => {
              if (e.pointerType === 'mouse') onHoverSection?.(null);
            }}
            role="button"
            tabIndex={0}
            aria-label="SECTION 2 재조립 허물기 보기"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelect('section-2');
              }
            }}
          >
            <rect
              className="pdf-plan__zone-area"
              x="224"
              y="240"
              width="216"
              height="94"
              fill={activeSection === 'section-2' ? activeFill : 'transparent'}
            />
            <rect className="pdf-plan__badge" x="242" y="272" width="114" height="24" fill="#000000" />
            <text
              x="299"
              y="288.5"
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize="12"
              fontWeight="700"
              letterSpacing="0.05em"
            >
              SECTION 2
            </text>
          </g>
        </svg>
      ) : (
        <svg
          viewBox="0 0 540 360"
          className="pdf-plan__svg"
          role="img"
          aria-label="코스모스 2층 평면도 (공共 2F): SECTION 3, SECTION 4"
        >
          <path
            d="M 16 24 L 272 24 A 196 196 0 0 1 460 206 L 460 338 L 16 338 Z"
            fill="none"
            stroke={strokeMain}
            strokeWidth="3.5"
          />

          <path
            d="M 16 106 L 238 106 A 110 110 0 0 1 346 214 L 346 238"
            fill="none"
            stroke={strokeMain}
            strokeWidth="2.6"
          />

          <line x1="16" y1="188" x2="250" y2="188" stroke={strokeMain} strokeWidth="2.6" />
          <line x1="292" y1="188" x2="460" y2="188" stroke={strokeMain} strokeWidth="2.6" />
          <line x1="250" y1="188" x2="250" y2="338" stroke={strokeMain} strokeWidth="2.6" />

          <g stroke={strokeMain} strokeWidth="1.8">
            <rect x="366" y="256" width="94" height="82" fill="none" />
            <line x1="366" y1="270" x2="460" y2="270" />
            <line x1="366" y1="284" x2="460" y2="284" />
            <line x1="366" y1="298" x2="460" y2="298" />
            <line x1="366" y1="312" x2="460" y2="312" />
            <line x1="366" y1="326" x2="460" y2="326" />
          </g>

          {/* SECTION 3 Interactive Zone */}
          <g
            className={`pdf-plan__zone ${activeSection === 'section-3' ? 'is-active' : ''}`}
            onClick={() => handleSelect('section-3')}
            onPointerEnter={(e) => {
              if (e.pointerType === 'mouse') onHoverSection?.('section-3');
            }}
            onPointerLeave={(e) => {
              if (e.pointerType === 'mouse') onHoverSection?.(null);
            }}
            role="button"
            tabIndex={0}
            aria-label="SECTION 3 재조립 짓기 보기"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelect('section-3');
              }
            }}
          >
            <rect
              className="pdf-plan__zone-area"
              x="20"
              y="192"
              width="226"
              height="142"
              fill={activeSection === 'section-3' ? activeFill : 'transparent'}
            />
            <rect className="pdf-plan__badge" x="76" y="224" width="114" height="24" fill="#FFFFFF" />
            <text
              x="133"
              y="240.5"
              textAnchor="middle"
              fill="#000000"
              fontSize="12"
              fontWeight="700"
              letterSpacing="0.05em"
            >
              SECTION 3
            </text>
          </g>

          {/* SECTION 4 Interactive Zone */}
          <g
            className={`pdf-plan__zone ${activeSection === 'section-4' ? 'is-active' : ''}`}
            onClick={() => handleSelect('section-4')}
            onPointerEnter={(e) => {
              if (e.pointerType === 'mouse') onHoverSection?.('section-4');
            }}
            onPointerLeave={(e) => {
              if (e.pointerType === 'mouse') onHoverSection?.(null);
            }}
            role="button"
            tabIndex={0}
            aria-label="SECTION 4 공동의 집 응답하기 보기"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelect('section-4');
              }
            }}
          >
            <polygon
              className="pdf-plan__zone-area"
              points="254,192 456,192 456,252 362,252 362,334 254,334"
              fill={activeSection === 'section-4' ? activeFill : 'transparent'}
            />
            <rect className="pdf-plan__badge" x="284" y="224" width="114" height="24" fill="#FFFFFF" />
            <text
              x="341"
              y="240.5"
              textAnchor="middle"
              fill="#000000"
              fontSize="12"
              fontWeight="700"
              letterSpacing="0.05em"
            >
              SECTION 4
            </text>
          </g>
        </svg>
      )}
    </div>
  );
};
