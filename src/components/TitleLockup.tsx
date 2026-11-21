import React from 'react';

interface GongJuTitleLockupProps {
  size?: 'nav' | 'md' | 'poster' | 'cover';
  tone?: 'dark' | 'light';
  className?: string;
}

/**
 * Exact recreation of the PDF cover wordmark: 공共과 주主
 * Medium-weight geometric Korean sans interlocked with regular serif Hanja.
 */
export const GongJuTitleLockup: React.FC<GongJuTitleLockupProps> = ({
  size = 'cover',
  tone = 'dark',
  className = '',
}) => {
  return (
    <span
      className={`pdf-wordmark pdf-wordmark--${size} pdf-wordmark--${tone} ${className}`.trim()}
      aria-label="공과 주 (공共과 주主)"
    >
      <span className="pdf-wordmark__unit">
        <span className="pdf-wordmark__ko">공</span>
        <span className="pdf-wordmark__hanja" aria-hidden="true">
          共
        </span>
      </span>
      <span className="pdf-wordmark__conj">과</span>
      <span className="pdf-wordmark__unit">
        <span className="pdf-wordmark__ko">주</span>
        <span className="pdf-wordmark__hanja" aria-hidden="true">
          主
        </span>
      </span>
    </span>
  );
};

interface FloorMarkProps {
  floor: '1F' | '2F';
  tone?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Exact recreation of the PDF Page 2 floor emblems:
 * - 2F: 공共 2F (white on black)
 * - 1F: 주主 1F (black on white)
 */
export const FloorMark: React.FC<FloorMarkProps> = ({
  floor,
  tone,
  size = 'md',
}) => {
  const resolvedTone = tone ?? (floor === '1F' ? 'dark' : 'light');
  const ko = floor === '1F' ? '주' : '공';
  const hanja = floor === '1F' ? '主' : '共';

  return (
    <span
      className={`pdf-floor-mark pdf-floor-mark--${floor.toLowerCase()} pdf-floor-mark--${resolvedTone} pdf-floor-mark--${size}`}
      aria-label={`${ko}${hanja} ${floor}`}
    >
      <span className="pdf-floor-mark__glyph">
        <span className="pdf-floor-mark__hanja" aria-hidden="true">
          {hanja}
        </span>
        <span className="pdf-floor-mark__ko" aria-hidden="true">
          {ko}
        </span>
      </span>
      <span className="pdf-floor-mark__lvl">{floor}</span>
    </span>
  );
};
