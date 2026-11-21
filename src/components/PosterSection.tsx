import React, { useState } from 'react';
import { POSTERS, type PosterItem } from '../data/exhibition';
import { useReveal } from '../hooks/useReveal';

interface PosterPlateProps {
  poster: PosterItem;
  index: number;
  hoveredIndex: number | null;
  onHoverChange: (index: number | null) => void;
}

const PosterPlate: React.FC<PosterPlateProps> = ({
  poster,
  index,
  hoveredIndex,
  onHoverChange,
}) => {
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50, active: false });
  const isHovered = hoveredIndex === index;
  const isDimmed = hoveredIndex !== null && hoveredIndex !== index;

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setTilt({
      rx: (0.5 - py) * 5,
      ry: (px - 0.5) * 5,
      gx: px * 100,
      gy: py * 100,
      active: true,
    });
  };

  const handlePointerLeave = () => {
    setTilt({ rx: 0, ry: 0, gx: 50, gy: 50, active: false });
    onHoverChange(null);
  };

  return (
    <figure
      className={`pdf-diptych__item ${isHovered ? 'is-focused' : ''} ${
        isDimmed ? 'is-dimmed' : ''
      }`}
      onMouseEnter={() => onHoverChange(index)}
      onMouseLeave={handlePointerLeave}
    >
      <div
        className={`pdf-diptych__frame ${tilt.active ? 'is-tilting' : ''}`}
        onPointerMove={handlePointerMove}
        style={{
          transform: `perspective(1100px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
        }}
      >
        <img
          src={poster.src}
          alt={`⟪공과 주⟫ ${poster.label}`}
          className="pdf-diptych__img"
        />
        <div
          className="pdf-poster-sheen"
          aria-hidden="true"
          style={{
            opacity: tilt.active ? 1 : 0,
            background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,0.16), transparent 62%)`,
          }}
        />
      </div>
    </figure>
  );
};

export const PosterSection: React.FC = () => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [posterRef, posterVisible] = useReveal<HTMLDivElement>(0.12);

  return (
    <section id="poster" className="pdf-poster-band" aria-label="포스터">
      <div
        ref={posterRef}
        className={`pdf-diptych-container reveal-block ${
          posterVisible ? 'is-visible' : ''
        }`}
      >
        <div className="pdf-diptych-header">
          <h2 className="pdf-section-heading pdf-section-heading--light">포스터</h2>
          <span className="pdf-diptych-header__meta">
            그래픽 디자인 한시우 이세진
          </span>
        </div>

        <div className="pdf-diptych">
          {POSTERS.map((poster, idx) => (
            <PosterPlate
              key={poster.id}
              poster={poster}
              index={idx}
              hoveredIndex={hoveredIndex}
              onHoverChange={setHoveredIndex}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
