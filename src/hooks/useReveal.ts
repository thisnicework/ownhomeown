import { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * High-sensitivity scroll reveal hook using IntersectionObserver.
 * Returns a tuple [ref, visible] so React Compiler tracks ref & state cleanly.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  threshold = 0.14
) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState<boolean>(prefersReducedMotion);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin: '0px 0px -6% 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, visible]);

  return [ref, visible] as const;
}
