import React, { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { EXHIBITION_META, NAV_ITEMS } from '../data/exhibition';
import { GongJuTitleLockup } from './TitleLockup';

interface HeaderNavProps {
  activeId: string;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({ activeId }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      const max =
        document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(100, Math.max(0, (y / max) * 100)) : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  return (
    <>
      <header className={`pdf-header ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="pdf-header__inner">
          <a href="#overview" className="pdf-header__brand" aria-label="공과 주 전시 홈">
            <GongJuTitleLockup size="nav" tone="light" />
          </a>

          <nav className="pdf-nav" aria-label="전시 섹션 내비게이션">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`pdf-nav__link ${activeId === item.id ? 'is-active' : ''}`}
              >
                <span>{item.label}</span>
              </a>
            ))}
          </nav>

          <button
            type="button"
            className="pdf-header__menu-btn"
            aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Hairline scroll progress thread */}
        <div className="pdf-header__progress" aria-hidden="true">
          <span style={{ transform: `scaleX(${progress / 100})` }} />
        </div>
      </header>

      <div
        className={`pdf-drawer ${menuOpen ? 'is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!menuOpen}
        aria-label="모바일 내비게이션"
      >
        <div className="pdf-drawer__inner">
          <nav className="pdf-drawer__nav">
            {NAV_ITEMS.map((item, idx) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`pdf-drawer__link ${activeId === item.id ? 'is-active' : ''}`}
                style={{ transitionDelay: menuOpen ? `${idx * 40}ms` : '0ms' }}
                tabIndex={menuOpen ? 0 : -1}
                onClick={() => setMenuOpen(false)}
              >
                <span className="pdf-drawer__num">{item.num}</span>
                <span className="pdf-drawer__label">{item.label}</span>
                <span className="pdf-drawer__en">{item.en}</span>
              </a>
            ))}
          </nav>
          <div className="pdf-drawer__footer">
            <p>{EXHIBITION_META.subtitle}</p>
            <p>
              {EXHIBITION_META.datesCompact} {EXHIBITION_META.hours} ·{' '}
              {EXHIBITION_META.venueName}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
