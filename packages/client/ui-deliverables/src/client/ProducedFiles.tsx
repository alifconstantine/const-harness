/**
 * ProducedFiles: File Change Summary and Review Card rendered at the end of a turn.
 * Displays total files changed with +add/-del stats, collapsible list of files with
 * language badges, Review button opening the interactive Diff Review Modal, and Undo.
 *
 * @module @const-ai/client-ui-deliverables
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { HostDescriptionSource } from '@const-ai/client-connection/client'
import type { InjectFace, PropsLocale } from '@const-ai/client-ui-slots'
import type { TurnTailOwnerProps } from '@const-ai/client-ui-conversation/client'
import { FileIcon } from './FileIcon.tsx'
import { DiffReviewModal } from './DiffReviewModal.tsx'
import { basename, dirname, truncatePath, type ProducedFileItem } from './turn-deliverables.ts'
import type { NS } from './locales.ts'
import css from './ProducedFiles.module.css'

/** Registration-side Host capability facts. */
export interface ProducedFilesInjected {
  /** Whether the browser itself is connected over loopback. */
  isLoopback: boolean
  hooks: {
    /** Current generation's Host description, bound by the slot renderer. */
    hostDescription: HostDescriptionSource
  }
}

/** Matched paths plus the opener, locale, and injected Host capability. */
export type ProducedFilesProps = Pick<TurnTailOwnerProps, 'openFile'> & {
  matched: readonly ProducedFileItem[]
  onUndo?: (() => void) | undefined
} & PropsLocale<typeof NS> & InjectFace<ProducedFilesInjected>

export function ProducedFiles({
  matched: files,
  openFile,
  onUndo,
  t,
}: ProducedFilesProps) {
  const [expanded, setExpanded] = useState(true)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [selectedFileForReview, setSelectedFileForReview] = useState<string | undefined>()
  const [undoStatus, setUndoStatus] = useState<'idle' | 'confirm' | 'done'>('idle')
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    return () => {
      if (undoTimerRef.current !== undefined) {
        clearTimeout(undoTimerRef.current)
      }
    }
  }, [])

  const { totalAdditions, totalDeletions } = useMemo(() => {
    let add = 0
    let del = 0
    for (const f of files) {
      add += f.additions
      del += f.deletions
    }
    return { totalAdditions: add, totalDeletions: del }
  }, [files])

  if (files.length === 0) return null

  const countLabel = files.length === 1
    ? t('produced.fileChanged')
    : t('produced.filesChanged', { count: String(files.length) })

  const handleOpenReview = (e: React.MouseEvent, filePath?: string) => {
    e.stopPropagation()
    setSelectedFileForReview(filePath ?? files[0]?.path)
    setReviewOpen(true)
  }

  const handleUndoClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (undoTimerRef.current !== undefined) {
      clearTimeout(undoTimerRef.current)
      undoTimerRef.current = undefined
    }
    if (undoStatus === 'confirm') {
      onUndo?.()
      setUndoStatus('done')
      undoTimerRef.current = setTimeout(() => {
        setUndoStatus('idle')
        undoTimerRef.current = undefined
      }, 2000)
    } else {
      setUndoStatus('confirm')
      undoTimerRef.current = setTimeout(() => {
        setUndoStatus('idle')
        undoTimerRef.current = undefined
      }, 3000)
    }
  }

  return (
    <>
      <div className={css.container}>
        {/* Header summary bar */}
        <div
          className={css.header}
          onClick={() => { setExpanded(prev => !prev) }}
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
        >
          <div className={css.headerLeft}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`${css.chevron} ${expanded ? css.chevronExpanded : ''}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
            <span className={css.headerText}>{countLabel}</span>
            <div className={css.stats}>
              {totalAdditions > 0 && (
                <span className={css.statAdd}>+{totalAdditions}</span>
              )}
              {totalDeletions > 0 && (
                <span className={css.statDel}>-{totalDeletions}</span>
              )}
            </div>
          </div>

          <div className={css.headerRight}>
            <button
              type="button"
              className={css.undoButton}
              onClick={handleUndoClick}
              aria-label={t('produced.revert')}
              title={undoStatus === 'confirm' ? t('produced.revertConfirm') : t('produced.revert')}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={css.undoIcon}
              >
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              <span>{undoStatus === 'confirm' ? t('produced.revertConfirm') : (undoStatus === 'done' ? t('produced.revertSuccess') : (t('produced.revert') || 'Undo'))}</span>
            </button>
          </div>
        </div>

        {/* File list (collapsible) */}
        {expanded && (
          <div className={css.fileList}>
            {files.map((file) => {
              const fileBasename = basename(file.path)
              const fileDir = dirname(file.path)
              const truncatedDir = fileDir ? `${truncatePath(fileDir, 45)}/` : ''

              return (
                <div
                  key={file.path}
                  className={css.fileRow}
                  title={file.path}
                >
                  <div className={css.fileMain}>
                    <FileIcon filename={fileBasename} size={15} />
                    <span className={css.fileName}>{fileBasename}</span>
                    {truncatedDir && (
                      <span className={css.fileDir}>{truncatedDir}</span>
                    )}
                    <div className={css.fileStats}>
                      {file.additions > 0 && (
                        <span className={css.statAdd}>+{file.additions}</span>
                      )}
                      {file.deletions > 0 && (
                        <span className={css.statDel}>-{file.deletions}</span>
                      )}
                    </div>
                  </div>

                  <div className={css.fileActions}>
                    <button
                      type="button"
                      className={css.rowButton}
                      onClick={(e) => { handleOpenReview(e, file.path) }}
                      aria-label={`${t('produced.review')} ${fileBasename}`}
                    >
                      {t('produced.review')}
                    </button>

                    <button
                      type="button"
                      className={css.rowButton}
                      onClick={(e) => {
                        e.stopPropagation()
                        openFile(file.path)
                      }}
                      aria-label={t('produced.open', { name: fileBasename })}
                    >
                      <span>Open</span>
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={css.openChevron}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Review Diff Modal */}
      {reviewOpen && (
        <DiffReviewModal
          open={reviewOpen}
          onClose={() => { setReviewOpen(false) }}
          files={files}
          openFile={openFile}
          totalAdditions={totalAdditions}
          totalDeletions={totalDeletions}
          {...(selectedFileForReview !== undefined ? { initialSelectedPath: selectedFileForReview } : {})}
        />
      )}
    </>
  )
}
