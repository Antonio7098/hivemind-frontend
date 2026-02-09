import type { ReactNode, CSSProperties } from 'react';

interface IconBoxProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  bg?: string;
  rounded?: boolean;
  className?: string;
  children: ReactNode;
}

const sizeMap = {
  sm: { box: 24, icon: 12 },
  md: { box: 32, icon: 16 },
  lg: { box: 40, icon: 20 },
  xl: { box: 48, icon: 24 },
};

export function IconBox({
  size = 'md',
  color,
  bg,
  rounded = false,
  className = '',
  children,
}: IconBoxProps) {
  const s = sizeMap[size];
  const style: CSSProperties = {
    width: s.box,
    height: s.box,
    minWidth: s.box,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: rounded ? '50%' : 'var(--radius-lg)',
    background: bg || 'var(--surface-3)',
    color: color || 'var(--text-tertiary)',
    fontSize: s.icon,
  };

  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}
