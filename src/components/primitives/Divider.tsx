import type { CSSProperties } from 'react';

interface DividerProps {
  direction?: 'horizontal' | 'vertical';
  color?: string;
  spacing?: number;
  className?: string;
}

export function Divider({
  direction = 'horizontal',
  color = 'var(--border-subtle)',
  spacing = 0,
  className = '',
}: DividerProps) {
  const style: CSSProperties =
    direction === 'horizontal'
      ? {
          width: '100%',
          height: 1,
          background: color,
          margin: spacing ? `var(--space-${spacing}) 0` : undefined,
        }
      : {
          width: 1,
          height: '100%',
          background: color,
          margin: spacing ? `0 var(--space-${spacing})` : undefined,
        };

  return <div className={className} style={style} />;
}
