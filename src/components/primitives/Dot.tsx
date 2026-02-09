import type { CSSProperties } from 'react';

interface DotProps {
  color?: string;
  size?: number;
  pulse?: boolean;
  className?: string;
}

export function Dot({ color = 'var(--accent-500)', size = 8, pulse = false, className = '' }: DotProps) {
  const style: CSSProperties = {
    width: size,
    height: size,
    minWidth: size,
    borderRadius: '50%',
    background: color,
    animation: pulse ? 'pulse-glow 2s ease-in-out infinite' : undefined,
  };

  return <span className={className} style={style} />;
}
