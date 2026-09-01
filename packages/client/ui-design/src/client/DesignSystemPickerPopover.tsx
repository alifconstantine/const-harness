import React, { useEffect, useState } from 'react'
import type { DesignSystemSummary } from '@const-ai/host-apiproxy/api'
import {
  IconSearchOutline16,
  IconCheckOutline16,
  IconCloseOutline16,
  IconPlusOutline16,
  IconPaletteOutline16,
  IconCompassOutline16,
  IconTypeOutline14,
  IconLayersOutline16,
} from '@const-ai/client-ui-primitives'
import { CreateDesignSystemModal } from './CreateDesignSystemModal.tsx'
import styles from './DesignSystemPickerPopover.module.css'
import { en } from './locales.ts'

export interface DesignSystemPickerPopoverProps {
  isOpen: boolean
  onClose: () => void
  selectedId: string | null
  onSelect: (id: string | null, name: string) => void
  systems: readonly DesignSystemSummary[]
  onCreateSystem?: (system: DesignSystemSummary) => void
  t?: (key: keyof typeof en) => string
}

export function DesignSystemPickerPopover({
  isOpen,
  onClose,
  selectedId,
  onSelect,
  systems,
  onCreateSystem,
  t = (k: keyof typeof en) => en[k] || k,
}: DesignSystemPickerPopoverProps): React.JSX.Element | null {
  const [search, setSearch] = useState('')
  const [hoveredId, setHoveredId] = useState<string | null>(selectedId)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const filtered = systems.filter((s) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      s.name.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.tags.some(tag => tag.toLowerCase().includes(q))
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
    <>
      <div className={styles.popoverContainer} onClick={(e) => { e.stopPropagation() }}>
        <div className={styles.leftCol}>
          <div className={styles.searchHeader}>
            <IconSearchOutline16 size={15} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder={t('ds.search_placeholder')}
              value={search}
              onChange={(e) => { setSearch(e.target.value) }}
              autoFocus
            />
            <div className={styles.searchActions}>
              {search && (
                <button
                  type="button"
                  className={styles.clearBtn}
                  onClick={() => { setSearch('') }}
                  aria-label="Clear search"
                >
                  <IconCloseOutline16 size={12} />
                </button>
              )}
              <button
                type="button"
                className={styles.createBtn}
                onClick={() => { setIsCreateModalOpen(true) }}
              >
                <IconPlusOutline16 size={12} />
                <span>{t('ds.create_action')}</span>
              </button>
            </div>
          </div>

          <div className={styles.dsList}>
            {/* No design system option */}
            <button
              type="button"
              className={`${styles.dsItem} ${hoveredId === null ? styles.active : ''}`}
              onMouseEnter={() => { setHoveredId(null) }}
              onClick={() => {
                setHoveredId(null)
                onSelect(null, t('ds.no_design_system'))
                onClose()
              }}
            >
              <div className={styles.dsItemLeft}>
                <div className={styles.noDsIconWrap}>
                  <IconLayersOutline16 size={13} />
                </div>
                <span className={styles.dsItemName}>{t('ds.no_design_system')}</span>
              </div>
              {selectedId === null && <IconCheckOutline16 size={14} className={styles.checkIcon} />}
            </button>

            <div className={styles.sectionHeader}>
              <span>{t('ds.official_presets')}</span>
              <span className={styles.countBadge}>{filtered.length}</span>
            </div>

            {filtered.map((s) => {
              const colors = s.previewColors?.length ? s.previewColors : (s.palette?.length ? s.palette : ['#3b82f6', '#10b981'])
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`${styles.dsItem} ${hoveredId === s.id ? styles.active : ''}`}
                  onMouseEnter={() => { setHoveredId(s.id) }}
                  onClick={() => {
                    setHoveredId(s.id)
                  }}
                  onDoubleClick={() => {
                    onSelect(s.id, s.name)
                    onClose()
                  }}
                >
                  <div className={styles.dsItemLeft}>
                    <div className={styles.colorPips}>
                      <span style={{ backgroundColor: colors[0] || '#3b82f6' }} />
                      <span style={{ backgroundColor: colors[1] || colors[0] || '#10b981' }} />
                    </div>
                    <span className={styles.dsItemName}>{s.name}</span>
                  </div>
                  {selectedId === s.id && <IconCheckOutline16 size={14} className={styles.checkIcon} />}
                </button>
              )
            })}
          </div>
        </div>

        <div className={styles.rightCol}>
          <div className={styles.previewContent}>
            {current ? (
              <>
                <div className={styles.detailHeader}>
                  <div className={styles.categoryBadge}>
                    <IconPaletteOutline16 size={11} />
                    <span>{current.category || 'DESIGN SYSTEM'}</span>
                  </div>
                  <h3 className={styles.detailTitle}>
                    Design System Inspired by {current.name}
                  </h3>
                </div>

                <div className={styles.sectionGroup}>
                  <div className={styles.sectionLabel}>
                    <IconCompassOutline16 size={12} />
                    <span>{t('ds.identity')}</span>
                  </div>
                  <div className={styles.identityCard}>
                    <p className={styles.identityDesc}>{current.identityQuote || current.description}</p>
                  </div>
                </div>

                <div className={styles.sectionGroup}>
                  <div className={styles.sectionLabel}>
                    <IconTypeOutline14 size={12} />
                    <span>{t('ds.typography')}</span>
                  </div>
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
                  <div className={styles.sectionLabel}>
                    <IconPaletteOutline16 size={12} />
                    <span>{t('ds.palette')}</span>
                  </div>
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
              </>
            ) : (
              <>
                <div className={styles.detailHeader}>
                  <div className={styles.categoryBadge}>
                    <IconLayersOutline16 size={11} />
                    <span>DEFAULT MODE</span>
                  </div>
                  <h3 className={styles.detailTitle}>{t('ds.no_design_system')}</h3>
                </div>

                <div className={styles.sectionGroup}>
                  <div className={styles.sectionLabel}>
                    <IconCompassOutline16 size={12} />
                    <span>{t('ds.identity')}</span>
                  </div>
                  <div className={styles.identityCard}>
                    <p className={styles.identityDesc}>
                      {t('ds.no_design_system_desc')}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Pinned Action Footer */}
          <div className={styles.actionRow}>
            {current ? (
              <button
                type="button"
                className={styles.applyBtn}
                onClick={() => {
                  onSelect(current.id, current.name)
                  onClose()
                }}
              >
                <IconCheckOutline16 size={14} />
                <span>Use {current.name}</span>
              </button>
            ) : (
              <button
                type="button"
                className={styles.applyBtn}
                onClick={() => {
                  onSelect(null, t('ds.no_design_system'))
                  onClose()
                }}
              >
                <IconCheckOutline16 size={14} />
                <span>Use No Design System</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {isCreateModalOpen && (
        <CreateDesignSystemModal
          isOpen={isCreateModalOpen}
          onClose={() => { setIsCreateModalOpen(false) }}
          onCreate={(newSys) => {
            onCreateSystem?.(newSys)
            onSelect(newSys.id, newSys.name)
            onClose()
          }}
        />
      )}
    </>
  )
}
