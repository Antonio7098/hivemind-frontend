import type { ReactNode, CSSProperties } from 'react';

interface GridProps {
  columns?: string | number;
  rows?: string;
  gap?: number | string;
  columnGap?: number | string;
  rowGap?: number | string;
  align?: CSSProperties['alignItems'];
  justify?: CSSProperties['justifyContent'];
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export function Grid({
  columns = 1,
  rows,
  gap = 0,
  columnGap,
  rowGap,
  align,
  justify,
  className = '',
  style,
  children,
}: GridProps) {
  const toGap = (v: number | string) =>
    typeof v === 'number' ? `var(--space-${v})` : v;

  return (
    <div
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns:
          typeof columns === 'number' ? `repeat(${columns}, 1fr)` : columns,
        gridTemplateRows: rows,
        gap: gap ? toGap(gap) : undefined,
        columnGap: columnGap ? toGap(columnGap) : undefined,
        rowGap: rowGap ? toGap(rowGap) : undefined,
        alignItems: align,
        justifyContent: justify,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
