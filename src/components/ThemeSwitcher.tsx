import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Palette, X, Monitor, Layers, Layout } from 'lucide-react';
import { useTheme, type LayoutType, type StyleType } from '../contexts/ThemeContext';
import styles from './ThemeSwitcher.module.css';

const layoutOptions: { id: LayoutType; label: string; icon: typeof Monitor; desc: string }[] = [
  { id: 'sidebar', label: 'Sidebar', icon: Layout, desc: 'Fixed sidebar navigation' },
  { id: 'topnav', label: 'Top Rail', icon: Monitor, desc: 'Horizontal navigation bar' },
  { id: 'floating', label: 'Floating', icon: Layers, desc: 'Floating dock navigation' },
];

const styleOptions: { id: StyleType; label: string; colors: string[]; desc: string }[] = [
  { id: 'industrial', label: 'Industrial', colors: ['#07080A', '#F59E0B', '#F4F4F5'], desc: 'Dark brutalist, amber accents' },
  { id: 'ivory', label: 'Ivory Architect', colors: ['#F5F1EB', '#2D5A3D', '#1A1A1A'], desc: 'Warm editorial, forest green' },
  { id: 'cyber', label: 'Cyber Flux', colors: ['#0A0E1A', '#06FFC0', '#E2E8F0'], desc: 'Neon futurism, cyan glow' },
];

export function ThemeSwitcher() {
  const { layout, style, setLayout, setStyle } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      <motion.button
        className={styles.trigger}
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="Theme & Layout"
      >
        <Palette size={18} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className={styles.backdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className={styles.panel}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className={styles.header}>
                <h4 className={styles.title}>Appearance</h4>
                <button className={styles.closeBtn} onClick={() => setOpen(false)}>
                  <X size={16} />
                </button>
              </div>

              <div className={styles.section}>
                <span className={styles.sectionLabel}>Layout</span>
                <div className={styles.options}>
                  {layoutOptions.map((opt) => (
                    <button
                      key={opt.id}
                      className={`${styles.option} ${layout === opt.id ? styles.active : ''}`}
                      onClick={() => setLayout(opt.id)}
                    >
                      <opt.icon size={16} className={styles.optionIcon} />
                      <div className={styles.optionInfo}>
                        <span className={styles.optionLabel}>{opt.label}</span>
                        <span className={styles.optionDesc}>{opt.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.divider} />

              <div className={styles.section}>
                <span className={styles.sectionLabel}>Style</span>
                <div className={styles.options}>
                  {styleOptions.map((opt) => (
                    <button
                      key={opt.id}
                      className={`${styles.option} ${style === opt.id ? styles.active : ''}`}
                      onClick={() => setStyle(opt.id)}
                    >
                      <div className={styles.colorPreview}>
                        {opt.colors.map((c, i) => (
                          <span key={i} className={styles.colorDot} style={{ background: c }} />
                        ))}
                      </div>
                      <div className={styles.optionInfo}>
                        <span className={styles.optionLabel}>{opt.label}</span>
                        <span className={styles.optionDesc}>{opt.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.footer}>
                <span className={styles.combo}>
                  {layoutOptions.find((l) => l.id === layout)?.label} +{' '}
                  {styleOptions.find((s) => s.id === style)?.label}
                </span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
