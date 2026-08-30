import React, { useEffect, useState } from 'react'
import type { DesignSystemSummary } from '@const-ai/host-apiproxy/api'
import {
  IconSearchOutline16,
  IconCheckOutline16,
} from '@const-ai/client-ui-primitives'
import styles from './DesignSystemPickerPopover.module.css'
import { en } from './locales.ts'

export interface DesignSystemPickerPopoverProps {
  isOpen: boolean
  onClose: () => void
  selectedId: string | null
  onSelect: (id: string | null, name: string) => void
  systems: readonly DesignSystemSummary[]
  t?: (key: keyof typeof en) => string
}

export function DesignSystemPickerPopover({
  isOpen,
  onClose,
  selectedId,
  onSelect,
  systems,
  t = (k: keyof typeof en) => en[k] || k,
}: DesignSystemPickerPopoverProps): React.JSX.Element | null {
  const [search, setSearch] = useState('')
  const [hoveredId, setHoveredId] = useState<string | null>(selectedId)

  const filtered = systems.filter((s) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      s.name.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.tags.some(t => t.toLowerCase().includes(q))
    )
  })

  useEffect(() => {
    if (isOpen) {
      setHoveredId(selectedId)
    }
  }, [isOpen, selectedId])

  if (!isOpen) return null

  const current = hoveredId ? systems.find(s => s.id === hoveredId) : null

  return (
    <div className={styles.popoverContainer} onClick={e => e.stopPropagation()}>
      <div className={styles.leftCol}>
        <div className={styles.searchHeader}>
          <IconSearchOutline16 size={14} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder={t('ds.search_placeholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          <div className={styles.searchActions}>
            {search && (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={() => setSearch('')}
              >
                {t('ds.clear')}
              </button>
            )}
            <button type="button" className={styles.createBtn}>
              {t('ds.create')}
            </button>
          </div>
        </div>

        <div className={styles.dsList}>
          {/* No design system option */}
          <button
            type="button"
            className={`${styles.dsItem} ${hoveredId === null ? styles.active : ''}`}
            onClick={() => setHoveredId(null)}
            onDoubleClick={() => {
              onSelect(null, t('ds.no_design_system'))
              onClose()
            }}
          >
            <span>{t('ds.no_design_system')}</span>
            {selectedId === null && <IconCheckOutline16 size={14} />}
          </button>

          <div className={styles.sectionHeader}>{t('ds.official_presets')}</div>

          {filtered.map(s => (
            <button
              key={s.id}
              type="button"
              className={`${styles.dsItem} ${hoveredId === s.id ? styles.active : ''}`}
              onClick={() => setHoveredId(s.id)}
              onDoubleClick={() => {
                onSelect(s.id, s.name)
                onClose()
              }}
            >
              <span>{s.name}</span>
              {selectedId === s.id && <IconCheckOutline16 size={14} />}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.rightCol}>
        {current ? (
          <>
            <div className={styles.detailTitle}>
              Design System Inspired by {current.name}
            </div>

            <div className={styles.sectionGroup}>
              <div className={styles.sectionLabel}>{t('ds.identity')}</div>
              <p className={styles.identityDesc}>{current.identityQuote || current.description}</p>
            </div>

            <div className={styles.sectionGroup}>
              <div className={styles.sectionLabel}>{t('ds.typography')}</div>
              <div className={styles.typographyGrid}>
                <div className={styles.typoCard}>
                  <span className={styles.typoGlyph} style={{ fontFamily: current.displayFont || 'serif' }}>Ag</span>
                  <span className={styles.typoFontName} title={current.displayFont || 'Display'}>{current.displayFont || 'Display'}</span>
                  <span className={styles.typoRole}>DISPLAY</span>
                </div>
                <div className={styles.typoCard}>
                  <span className={styles.typoGlyph} style={{ fontFamily: current.bodyFont || 'sans-serif' }}>Ag</span>
                  <span className={styles.typoFontName} title={current.bodyFont || 'Body'}>{current.bodyFont || 'Body'}</span>
                  <span className={styles.typoRole}>BODY</span>
                </div>
                <div className={styles.typoCard}>
                  <span className={styles.typoGlyph} style={{ fontFamily: current.monoFont || 'monospace' }}>Ag</span>
                  <span className={styles.typoFontName} title={current.monoFont || 'Mono'}>{current.monoFont || 'Mono'}</span>
                  <span className={styles.typoRole}>MONO</span>
                </div>
              </div>
            </div>

            <div className={styles.sectionGroup}>
              <div className={styles.sectionLabel}>{t('ds.palette')}</div>
              <div className={styles.paletteRow}>
                {((current.palette && current.palette.length > 0) ? current.palette : (current.previewColors.length > 0 ? current.previewColors : ['#09090b', '#27272a', '#3b82f6', '#10b981', '#f4f4f5'])).map((c, i) => (
                  <div
                    key={i}
                    className={styles.colorSwatch}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>

            <div className={styles.actionRow}>
              <button
                type="button"
                className={styles.applyBtn}
                onClick={() => {
                  onSelect(current.id, current.name)
                  onClose()
                }}
              >
                Use {current.name}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.detailTitle}>{t('ds.no_design_system')}</div>
            <div className={styles.sectionGroup}>
              <div className={styles.sectionLabel}>{t('ds.identity')}</div>
              <p className={styles.identityDesc}>
                {t('ds.no_design_system_desc')}
              </p>
            </div>
            <div className={styles.actionRow}>
              <button
                type="button"
                className={styles.applyBtn}
                onClick={() => {
                  onSelect(null, t('ds.no_design_system'))
                  onClose()
                }}
              >
                Use No Design System
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
