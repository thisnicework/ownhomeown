import { useEffect, useState } from 'react';
import { NAV_ITEMS } from './data/exhibition';
import { HeaderNav } from './components/HeaderNav';
import { OverviewAndPreface } from './components/OverviewAndPreface';
import { PosterSection } from './components/PosterSection';
import { SectionsShowcase } from './components/SectionsShowcase';
import { CreditsSection } from './components/CreditsSection';
import { VisitAndSponsors } from './components/VisitAndSponsors';
import './App.css';

export function App() {
  const [activeSectionId, setActiveSectionId] = useState<string>('overview');

  useEffect(() => {
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
  }, []);

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
