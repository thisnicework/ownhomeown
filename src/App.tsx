import { lazy, Suspense, useEffect, useState } from 'react';
import { NAV_ITEMS } from './data/exhibition';
import { HeaderNav } from './components/HeaderNav';
import { OverviewAndPreface } from './components/OverviewAndPreface';
import { PosterSection } from './components/PosterSection';
import { SectionsShowcase } from './components/SectionsShowcase';
import { CreditsSection } from './components/CreditsSection';
import { VisitAndSponsors } from './components/VisitAndSponsors';
import './App.css';

const PhotoGuestbookPage = lazy(() =>
  import('./components/PhotoGuestbookPage').then((m) => ({
    default: m.PhotoGuestbookPage,
  }))
);

function isPhotoRoute(): boolean {
  if (typeof window === 'undefined') return false;
  const normalized = window.location.pathname.replace(/\/+$/, '') || '/';
  return normalized === '/photo' || normalized === '/archive';
}

export function App() {
  const [onPhotoPage, setOnPhotoPage] = useState<boolean>(() => isPhotoRoute());
  const [activeSectionId, setActiveSectionId] = useState<string>('overview');

  useEffect(() => {
    const syncRoute = () => setOnPhotoPage(isPhotoRoute());
    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);

  useEffect(() => {
    if (onPhotoPage) {
      document.title = '포토 방명록 | ⟪공과 주⟫ 공共과 주主';
      return;
    }
    document.title =
      '⟪공과 주⟫ 공共과 주主 | 서울예술대학교 학사학위 전공심화과정 독립창작프로젝트';
  }, [onPhotoPage]);

  useEffect(() => {
    if (onPhotoPage) return;
    const ids = NAV_ITEMS.map((item) => item.id);
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) {
          setActiveSectionId(visible[0].target.id);
        }
      },
      {
        rootMargin: '-20% 0px -55% 0px',
        threshold: [0.05, 0.2, 0.4, 0.6],
      }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [onPhotoPage]);

  if (onPhotoPage) {
    return (
      <Suspense fallback={null}>
        <PhotoGuestbookPage />
      </Suspense>
    );
  }

  return (
    <div className="app-shell">
      <HeaderNav activeId={activeSectionId} />
      <main>
        <OverviewAndPreface />
        <PosterSection />
        <SectionsShowcase />
        <CreditsSection />
        <VisitAndSponsors />
      </main>
    </div>
  );
}

export default App;
