import { type ReactNode, type CSSProperties, type HTMLAttributes } from 'react';
import { useInView } from '../../hooks/useInView';

interface FadeInProps extends Omit<HTMLAttributes<HTMLElement>, 'style'> {
  children: ReactNode;
  className?: string;
  /** 'up' adds translateY, 'none' is opacity only */
  direction?: 'up' | 'none';
  /** Stagger delay in ms (applied via animation-delay) */
  delay?: number;
  /** HTML tag to render */
  as?: 'div' | 'span';
  style?: CSSProperties;
}

/**
 * Lightweight scroll-reveal wrapper. Uses IntersectionObserver + CSS keyframes
 * instead of motion/react — saves ~124 kB from the Landing critical path.
 */
export function FadeIn({
  children,
  className = '',
  direction = 'up',
  delay = 0,
  as: Tag = 'div',
  style,
  ...rest
}: FadeInProps) {
  const [ref, inView] = useInView<HTMLDivElement>();

  const animClass = inView
    ? direction === 'up' ? 'animate-fade-in-up' : 'animate-fade-in'
    : 'animate-hidden';

  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement & HTMLSpanElement>}
      className={`${animClass} ${className}`}
      style={delay > 0 ? { animationDelay: `${delay}ms`, ...style } : style}
      {...rest}
    >
      {children}
    </Tag>
  );
}
