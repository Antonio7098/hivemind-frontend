import { motion } from 'motion/react';
import { Check, Monitor, Layout, Layers } from 'lucide-react';
import { useTheme, type LayoutType, type StyleType } from '../contexts/ThemeContext';
import { PageHeader } from '../components/composites/PageHeader';
import styles from './ThemeMatrix.module.css';

const layoutMeta: { id: LayoutType; label: string; icon: typeof Monitor; desc: string }[] = [
  { id: 'sidebar', label: 'Sidebar', icon: Layout, desc: 'Fixed sidebar navigation' },
  { id: 'topnav', label: 'Top Rail', icon: Monitor, desc: 'Horizontal navigation bar' },
  { id: 'floating', label: 'Floating', icon: Layers, desc: 'Floating dock navigation' },
];

const styleMeta: {
  id: StyleType;
  label: string;
  desc: string;
  bg: string;
  surface: string;
  surfaceAlt: string;
  accent: string;
  accentGlow: string;
  text: string;
  textDim: string;
  border: string;
}[] = [
  {
    id: 'industrial',
    label: 'Industrial',
    desc: 'Dark brutalist, amber accents',
    bg: '#07080A',
    surface: '#111318',
    surfaceAlt: '#1C1F28',
    accent: '#F59E0B',
    accentGlow: 'rgba(245, 158, 11, 0.3)',
    text: '#F4F4F5',
    textDim: '#71717A',
    border: '#2A2E3A',
  },
  {
    id: 'ivory',
    label: 'Ivory Architect',
    desc: 'Warm editorial, forest green',
    bg: '#F5F1EB',
    surface: '#FFFDF7',
    surfaceAlt: '#F0ECE4',
    accent: '#2D5A3D',
    accentGlow: 'rgba(45, 90, 61, 0.25)',
    text: '#1A1A1A',
    textDim: '#737373',
    border: '#D6D0C4',
  },
  {
    id: 'cyber',
    label: 'Cyber Flux',
    desc: 'Neon futurism, cyan glow',
    bg: '#0A0E1A',
    surface: '#0F1525',
    surfaceAlt: '#1A233B',
    accent: '#06FFC0',
    accentGlow: 'rgba(6, 255, 192, 0.3)',
    text: '#E2E8F0',
    textDim: '#64748B',
    border: 'rgba(6, 255, 192, 0.15)',
  },
];

function MiniPreview({
  layoutId,
  styleData,
  active,
  onClick,
  delay,
}: {
  layoutId: LayoutType;
  styleData: (typeof styleMeta)[0];
  active: boolean;
  onClick: () => void;
  delay: number;
}) {
  const { bg, surface, surfaceAlt, accent, accentGlow, text, textDim, border } = styleData;

  return (
    <motion.button
      className={`${styles.cell} ${active ? styles.active : ''}`}
      onClick={onClick}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.98 }}
      style={{
        '--cell-bg': bg,
        '--cell-surface': surface,
        '--cell-surface-alt': surfaceAlt,
        '--cell-accent': accent,
        '--cell-glow': accentGlow,
        '--cell-text': text,
        '--cell-text-dim': textDim,
        '--cell-border': border,
      } as React.CSSProperties}
    >
      {active && (
        <motion.div
          className={styles.activeBadge}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          <Check size={12} strokeWidth={3} />
        </motion.div>
      )}

      <div className={styles.miniScreen}>
        {/* Sidebar layout */}
        {layoutId === 'sidebar' && (
          <>
            <div className={styles.miniSidebar}>
              <div className={styles.miniLogo} />
              <div className={styles.miniNavDots}>
                <div className={styles.miniNavDot} style={{ background: accent }} />
                <div className={styles.miniNavDot} />
                <div className={styles.miniNavDot} />
                <div className={styles.miniNavDot} />
              </div>
            </div>
            <div className={styles.miniContent}>
              <div className={styles.miniTopBar}>
                <div className={styles.miniTitle} />
                <div className={styles.miniBtn} />
              </div>
              <div className={styles.miniCards}>
                <div className={styles.miniCard} />
                <div className={styles.miniCard} />
                <div className={styles.miniCard} />
                <div className={styles.miniCard} />
              </div>
              <div className={styles.miniWideCard} />
            </div>
          </>
        )}

        {/* TopNav layout */}
        {layoutId === 'topnav' && (
          <>
            <div className={styles.miniTopNav}>
              <div className={styles.miniLogo} />
              <div className={styles.miniNavPills}>
                <div className={styles.miniPill} style={{ background: accent, opacity: 0.9 }} />
                <div className={styles.miniPill} />
                <div className={styles.miniPill} />
                <div className={styles.miniPill} />
              </div>
              <div className={styles.miniBtn} />
            </div>
            <div className={styles.miniContentFull}>
              <div className={styles.miniTopBar}>
                <div className={styles.miniTitle} />
              </div>
              <div className={styles.miniCards}>
                <div className={styles.miniCard} />
                <div className={styles.miniCard} />
                <div className={styles.miniCard} />
                <div className={styles.miniCard} />
              </div>
              <div className={styles.miniWideCard} />
            </div>
          </>
        )}

        {/* Floating layout */}
        {layoutId === 'floating' && (
          <>
            <div className={styles.miniContentFull}>
              <div className={styles.miniTopBar}>
                <div className={styles.miniTitle} />
                <div className={styles.miniBtn} />
              </div>
              <div className={styles.miniCards}>
                <div className={styles.miniCard} />
                <div className={styles.miniCard} />
                <div className={styles.miniCard} />
                <div className={styles.miniCard} />
              </div>
              <div className={styles.miniWideCard} />
            </div>
            <div className={styles.miniDock}>
              <div className={styles.miniDockPill}>
                <div className={styles.miniDockDot} style={{ background: accent }} />
                <div className={styles.miniDockDot} />
                <div className={styles.miniDockDot} />
                <div className={styles.miniDockDot} />
              </div>
            </div>
          </>
        )}
      </div>

      <div className={styles.cellLabel}>
        {active && <span className={styles.activeDot} />}
        <span className={styles.cellStyleName}>{styleData.label}</span>
        <span className={styles.cellLayoutName}>{layoutMeta.find((l) => l.id === layoutId)?.label}</span>
      </div>
    </motion.button>
  );
}

export function ThemeMatrix() {
  const { layout, style, setLayout, setStyle } = useTheme();

  const handleSelect = (l: LayoutType, s: StyleType) => {
    setLayout(l);
    setStyle(s);
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Theme Matrix"
        subtitle="9 combinations. Pick your reality."
      />

      {/* Matrix */}
      <div className={styles.matrix}>
        {/* Column headers (layouts) */}
        <div className={styles.cornerCell} />
        {layoutMeta.map((l, i) => (
          <motion.div
            key={l.id}
            className={`${styles.colHeader} ${layout === l.id ? styles.headerActive : ''}`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08 }}
          >
            <l.icon size={18} className={styles.headerIcon} />
            <span className={styles.headerLabel}>{l.label}</span>
            <span className={styles.headerDesc}>{l.desc}</span>
          </motion.div>
        ))}

        {/* Rows */}
        {styleMeta.map((s, rowIndex) => (
          <>
            {/* Row header (style) */}
            <motion.div
              key={`header-${s.id}`}
              className={`${styles.rowHeader} ${style === s.id ? styles.headerActive : ''}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + rowIndex * 0.1 }}
            >
              <div className={styles.colorSwatch}>
                <span style={{ background: s.bg }} />
                <span style={{ background: s.accent }} />
                <span style={{ background: s.text }} />
              </div>
              <span className={styles.headerLabel}>{s.label}</span>
              <span className={styles.headerDesc}>{s.desc}</span>
            </motion.div>

            {/* Cells */}
            {layoutMeta.map((l, colIndex) => (
              <MiniPreview
                key={`${l.id}-${s.id}`}
                layoutId={l.id}
                styleData={s}
                active={layout === l.id && style === s.id}
                onClick={() => handleSelect(l.id, s.id)}
                delay={0.15 + rowIndex * 0.1 + colIndex * 0.08}
              />
            ))}
          </>
        ))}
      </div>

      {/* Current selection indicator */}
      <motion.div
        className={styles.currentSelection}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <div className={styles.currentLabel}>Current</div>
        <div className={styles.currentValue}>
          <span className={styles.currentLayout}>{layoutMeta.find((l) => l.id === layout)?.label}</span>
          <span className={styles.currentDivider}>/</span>
          <span className={styles.currentStyle}>{styleMeta.find((s) => s.id === style)?.label}</span>
        </div>
        <p className={styles.currentHint}>Click any cell above to switch instantly</p>
      </motion.div>
    </div>
  );
}
