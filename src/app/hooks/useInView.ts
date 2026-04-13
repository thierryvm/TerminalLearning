import { useEffect, useRef, useState } from 'react';

interface UseInViewOptions {
  /** Trigger only once (default: true) */
  once?: boolean;
  /** IntersectionObserver rootMargin */
  rootMargin?: string;
  /** Visibility threshold 0–1 */
  threshold?: number;
}

/**
 * Lightweight alternative to motion's whileInView — uses IntersectionObserver
 * to detect when an element enters the viewport. Returns a ref to attach and
 * a boolean indicating visibility.
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  options: UseInViewOptions = {},
): [React.RefObject<T | null>, boolean] {
  const { once = true, rootMargin = '0px', threshold = 0.1 } = options;
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.unobserve(el);
        }
      },
      { rootMargin, threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [once, rootMargin, threshold]);

  return [ref, inView];
}
