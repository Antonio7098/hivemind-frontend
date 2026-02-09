import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import styles from './CardHeader.module.css';

interface CardHeaderProps {
  icon?: ReactNode;
  title: string;
  trailing?: ReactNode;
  linkTo?: string;
  linkLabel?: string;
  className?: string;
}

export function CardHeader({
  icon,
  title,
  trailing,
  linkTo,
  linkLabel = 'View all',
  className = '',
}: CardHeaderProps) {
  return (
    <div className={`${styles.header} ${className}`}>
      <div className={styles.title}>
        {icon}
        <span>{title}</span>
        {trailing}
      </div>
      {linkTo && (
        <Link to={linkTo} className={styles.link}>
          {linkLabel} <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}
