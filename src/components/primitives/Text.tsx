import type { ReactNode, CSSProperties, ElementType } from 'react';
import styles from './Text.module.css';

type TextVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'body'
  | 'body-sm'
  | 'caption'
  | 'label'
  | 'overline'
  | 'mono'
  | 'mono-sm'
  | 'display';

type TextColor =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'muted'
  | 'accent'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'inherit';

interface TextProps {
  variant?: TextVariant;
  color?: TextColor;
  as?: ElementType;
  weight?: CSSProperties['fontWeight'];
  align?: CSSProperties['textAlign'];
  truncate?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

const variantTag: Record<TextVariant, ElementType> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  body: 'p',
  'body-sm': 'p',
  caption: 'span',
  label: 'span',
  overline: 'span',
  mono: 'span',
  'mono-sm': 'span',
  display: 'h1',
};

const colorMap: Record<TextColor, string> = {
  primary: 'var(--text-primary)',
  secondary: 'var(--text-secondary)',
  tertiary: 'var(--text-tertiary)',
  muted: 'var(--text-muted)',
  accent: 'var(--accent-500)',
  success: 'var(--status-success)',
  warning: 'var(--status-warning)',
  error: 'var(--status-error)',
  info: 'var(--status-info)',
  inherit: 'inherit',
};

export function Text({
  variant = 'body',
  color,
  as,
  weight,
  align,
  truncate = false,
  className = '',
  style,
  children,
}: TextProps) {
  const Tag = as || variantTag[variant];

  return (
    <Tag
      className={`${styles[variant]} ${truncate ? styles.truncate : ''} ${className}`}
      style={{
        color: color ? colorMap[color] : undefined,
        fontWeight: weight,
        textAlign: align,
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}
