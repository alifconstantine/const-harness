import React, { useEffect, useState, useMemo } from 'react'
import type { PromptTemplateSummary } from '@const-ai/host-apiproxy/api'
import {
  IconSearchOutline16,
  IconCloseOutline16,
} from '@const-ai/client-ui-primitives'
import styles from './PluginPickerPopover.module.css'
import { en } from './locales.ts'

function IconVideoOutlineSvg({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  )
}

function IconImageOutlineSvg({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

function IconBlueprintSvg({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  )
}

export interface PluginPickerPopoverProps {
  isOpen: boolean
  onClose: () => void
  onSelectPlugin: (plugin: PromptTemplateSummary) => void
  templates: readonly PromptTemplateSummary[]
  t?: (key: keyof typeof en) => string
}

export function PluginPickerPopover({
  isOpen,
  onClose,
  onSelectPlugin,
  templates,
  t = (k: keyof typeof en) => en[k] || k,
}: PluginPickerPopoverProps): React.JSX.Element | null {
  const [search, setSearch] = useState('')
  const [selectedCat, setSelectedCat] = useState<string>('all')
  const [selectedId, setSelectedId] = useState<string>('')

  const filtered = useMemo(() => {
    return templates.filter((item) => {
      if (selectedCat !== 'all') {
        const catLower = item.category.toLowerCase()
        const targetLower = selectedCat.toLowerCase()
        if (targetLower === 'skills' && !catLower.includes('skill') && !catLower.includes('tool')) return false
        if (targetLower === 'ui / code' && !catLower.includes('ui') && !catLower.includes('code') && !catLower.includes('react') && !catLower.includes('frontend')) return false
        if (targetLower === 'image' && item.surface !== 'image' && !catLower.includes('image')) return false
        if (targetLower === 'video' && item.surface !== 'video' && !catLower.includes('video')) return false
        if (targetLower === 'animation' && !catLower.includes('animat') && !catLower.includes('motion')) return false
        if (targetLower === 'atoms' && !catLower.includes('atom')) return false
      }
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        item.tags.some((tag: string) => tag.toLowerCase().includes(q))
      )
    })
  }, [templates, selectedCat, search])

  useEffect(() => {
    const first = filtered[0]
    if (first && (!selectedId || !filtered.some(f => f.id === selectedId))) {
      setSelectedId(first.id)
    }
  }, [filtered, selectedId])

  if (!isOpen) return null

  const current = templates.find(item => item.id === selectedId) ?? filtered[0]

  return (
    <div className={styles.popoverContainer} onClick={e => e.stopPropagation()}>
      {/* Left Column: Search & Filtered List */}
      <div className={styles.leftCol}>
        <div className={styles.searchHeader}>
          <div className={styles.searchBox}>
            <IconSearchOutline16 size={14} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder={t('plugins.search_placeholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
            {search && (
              <button
                type="button"
                className={styles.clearSearchBtn}
                onClick={() => setSearch('')}
                aria-label="Clear search"
              >
                <IconCloseOutline16 size={12} />
              </button>
            )}
          </div>

          {/* Filter Chips */}
          <div className={styles.surfaceFilterRow}>
            {[
              { id: 'all', label: `All (${templates.length})` },
              { id: 'skills', label: 'Skills & Tools' },
              { id: 'ui / code', label: 'UI / Code' },
              { id: 'image', label: 'Image' },
              { id: 'video', label: 'Video' },
              { id: 'animation', label: 'Animation' },
              { id: 'atoms', label: 'Atoms' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                className={`${styles.filterChip} ${selectedCat === tab.id ? styles.activeChip : ''}`}
                onClick={() => setSelectedCat(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.pluginList}>
          {filtered.length === 0 ? (
            <div className={styles.emptyResults}>No plugins match your search</div>
          ) : (
            filtered.map(item => (
              <button
                key={item.id}
                type="button"
                className={`${styles.pluginItem} ${item.id === selectedId ? styles.active : ''}`}
                onClick={() => setSelectedId(item.id)}
                onDoubleClick={() => {
                  onSelectPlugin(item)
                  onClose()
                }}
              >
                <span className={styles.itemIconWrapper}>
                  {item.surface === 'video' ? (
                    <IconVideoOutlineSvg size={14} />
                  ) : (
                    <IconImageOutlineSvg size={14} />
                  )}
                </span>
                <div className={styles.itemTextCol}>
                  <div className={styles.itemTitle}>{item.title}</div>
                  <div className={styles.itemSubRow}>
                    <span className={styles.itemCategory}>{item.category}</span>
                    {item.model && <span className={styles.itemModelTag}>{item.model}</span>}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        <div className={styles.footerRow}>
          <span className={styles.footerCount}>
            {filtered.length} prompt {filtered.length === 1 ? 'blueprint' : 'blueprints'}
          </span>
        </div>
      </div>

      {/* Right Column: High-Fidelity Preview Stage */}
      <div className={styles.rightCol}>
        {current ? (
          <div className={styles.previewContent}>
            <div className={styles.previewHeader}>
              <div className={styles.previewTitleRow}>
                <h3 className={styles.previewTitle}>{current.title}</h3>
                <button
                  type="button"
                  className={styles.closeModalBtn}
                  onClick={onClose}
                  aria-label="Close dialog"
                >
                  <IconCloseOutline16 size={14} />
                </button>
              </div>

              <div className={styles.badgeRow}>
                <span className={`${styles.badge} ${styles.badgeSurface}`}>
                  {current.surface === 'video' ? (
                    <>
                      <IconVideoOutlineSvg size={11} /> Video
                    </>
                  ) : (
                    <>
                      <IconImageOutlineSvg size={11} /> Image
                    </>
                  )}
                </span>
                {current.model && (
                  <span className={`${styles.badge} ${styles.badgeModel}`}>
                    {current.model}
                  </span>
                )}
                {current.aspect && (
                  <span className={`${styles.badge} ${styles.badgeAspect}`}>
                    {current.aspect}
                  </span>
                )}
                <span className={`${styles.badge} ${styles.badgeOfficial}`}>
                  {t('plugins.official')}
                </span>
              </div>
            </div>

            <div className={styles.previewSummaryBox}>
              <p className={styles.previewSummary}>{current.summary}</p>
            </div>

            <div className={styles.previewMediaFrame}>
              {current.previewImageUrl ? (
                <img
                  src={current.previewImageUrl}
                  alt={current.title}
                  className={styles.previewImage}
                  loading="lazy"
                />
              ) : (
                <div className={styles.mediaFallback}>
                  <IconBlueprintSvg size={36} />
                  <span>Prompt Blueprint Preview</span>
                </div>
              )}
            </div>

            {current.tags && current.tags.length > 0 && (
              <div className={styles.tagsRow}>
                {current.tags.map(tag => (
                  <span key={tag} className={styles.tagChip}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className={styles.actionContainer}>
              <button
                type="button"
                className={styles.usePluginBtn}
                onClick={() => {
                  onSelectPlugin(current)
                  onClose()
                }}
              >
                <span>Use Plugin (@{current.id})</span>
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.noSelection}>
            <IconBlueprintSvg size={40} />
            <span>Select a plugin from the list to preview details</span>
          </div>
        )}
      </div>
    </div>
  )
}
