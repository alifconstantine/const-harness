import React, { useState } from 'react'
import {
  IconCloseOutline16,
} from '@const-ai/client-ui-primitives'
import styles from './FigmaImportModal.module.css'
import { en } from './locales.ts'

const UploadIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
)

export interface FigmaImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImportMock?: (note: string) => void
  t?: (key: keyof typeof en) => string
}

export function FigmaImportModal({
  isOpen,
  onClose,
  onImportMock,
  t = (k: keyof typeof en) => en[k] || k,
}: FigmaImportModalProps): React.JSX.Element | null {
  const [tab, setTab] = useState<'fig' | 'url'>('fig')
  const [url, setUrl] = useState('')
  const [notes, setNotes] = useState('')

  if (!isOpen) return null

  const handleBuild = () => {
    onImportMock?.(notes)
    onClose()
  }

  return (
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <UploadIcon size={18} />
            <span>{t('figma.title')}</span>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <IconCloseOutline16 size={16} />
          </button>
        </div>

        <div className={styles.tabRow}>
          <button
            type="button"
            className={`${styles.tabBtn} ${tab === 'fig' ? styles.active : ''}`}
            onClick={() => setTab('fig')}
          >
            {t('figma.tab_fig')}
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${tab === 'url' ? styles.active : ''}`}
            onClick={() => setTab('url')}
          >
            {t('figma.tab_url')}
          </button>
        </div>

        {tab === 'fig' ? (
          <div className={styles.dropzone}>
            <div className={styles.dropIcon}>
              <UploadIcon size={32} />
            </div>
            <div className={styles.dropText}>
              Drop a <strong>.fig</strong> here, or <span>browse</span>
            </div>
            <div className={styles.dropSub}>
              {t('figma.drop_sub')}
            </div>
          </div>
        ) : (
          <div>
            <input
              type="text"
              className={styles.urlInput}
              placeholder="https://www.figma.com/design/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
        )}

        <input
          type="text"
          className={styles.notesInput}
          placeholder={t('figma.notes_placeholder')}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            {t('figma.cancel')}
          </button>
          <button type="button" className={styles.importBtn} onClick={handleBuild}>
            {t('figma.import_build')}
          </button>
        </div>
      </div>
    </div>
  )
}
