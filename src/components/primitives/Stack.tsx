import type { ReactNode, CSSProperties } from 'react';

interface StackProps {
  direction?: 'column' | 'row';
  gap?: number | string;
  align?: CSSProperties['alignItems'];
  justify?: CSSProperties['justifyContent'];
  wrap?: boolean;
  flex?: CSSProperties['flex'];
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export function Stack({
  direction = 'column',
  gap = 0,
  align,
  justify,
  wrap = false,
  flex,
  className = '',
  style,
  children,
}: StackProps) {
  const gapValue = typeof gap === 'number' ? `var(--space-${gap})` : gap;

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: direction,
        gap: gap ? gapValue : undefined,
        alignItems: align,
        justifyContent: justify,
        flexWrap: wrap ? 'wrap' : undefined,
        flex,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
