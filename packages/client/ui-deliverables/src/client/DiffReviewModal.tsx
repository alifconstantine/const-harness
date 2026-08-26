import { useState } from 'react'
import { Modal, DiffBlock } from '@const-ai/client-ui-primitives'
import { FileIcon } from './FileIcon.tsx'
import { basename } from './turn-deliverables.ts'
import type { ProducedFileItem } from './turn-deliverables.ts'
import css from './DiffReviewModal.module.css'

export interface DiffReviewModalProps {
  open: boolean
  onClose: () => void
  files: readonly ProducedFileItem[]
  openFile: (path: string) => void
  totalAdditions: number
  totalDeletions: number
  initialSelectedPath?: string | undefined
}

export function DiffReviewModal({
  open,
  onClose,
  files,
  openFile,
  totalAdditions,
  totalDeletions,
  initialSelectedPath,
}: DiffReviewModalProps) {
  const [selectedPath, setSelectedPath] = useState<string>(
    initialSelectedPath ?? files[0]?.path ?? '',
  )

  const activeFile = files.find(f => f.path === selectedPath) ?? files[0]

  if (!open) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Review Changes"
      className={css.dialog}
      contentClassName={css.content}
    >
      <div className={css.headerRow}>
        <div className={css.headerStats}>
          <span className={css.headerCount}>
            {files.length} {files.length === 1 ? 'file changed' : 'files changed'}
          </span>
          <span className={css.statAdd}>+{totalAdditions}</span>
          <span className={css.statDel}>-{totalDeletions}</span>
        </div>
      </div>

      <div className={css.body}>
        {/* Left sidebar with files */}
        <div className={css.fileRail}>
          {files.map((file) => {
            const isSelected = file.path === activeFile?.path
            return (
              <button
                key={file.path}
                type="button"
                className={`${css.fileRailItem} ${isSelected ? css.fileRailItemSelected : ''}`}
                onClick={() => { setSelectedPath(file.path) }}
                title={file.path}
              >
                <FileIcon filename={basename(file.path)} size={14} />
                <span className={css.railFilename}>{basename(file.path)}</span>
                <span className={css.railDiff}>
                  <span className={css.statAdd}>+{file.additions}</span>
                  <span className={css.statDel}>-{file.deletions}</span>
                </span>
              </button>
            )
          })}
        </div>

        {/* Right pane with diff viewer */}
        <div className={css.diffPane}>
          {activeFile && (
            <div className={css.diffCard}>
              <div className={css.diffCardHeader}>
                <div className={css.diffCardTitle}>
                  <FileIcon filename={basename(activeFile.path)} size={16} />
                  <span className={css.cardPath}>{activeFile.path}</span>
                </div>
                <div className={css.diffCardActions}>
                  <button
                    type="button"
                    className={css.openButton}
                    onClick={() => { openFile(activeFile.path) }}
                  >
                    Open in Editor
                  </button>
                </div>
              </div>

              <div className={css.diffBody}>
                {activeFile.diffs && activeFile.diffs.length > 0 ? (
                  <DiffBlock
                    diffs={activeFile.diffs.map(d => ({
                      path: d.path,
                      oldText: d.oldText,
                      newText: d.newText,
                    }))}
                    maxLines={1000}
                  />
                ) : (
                  <div className={css.emptyDiff}>
                    <p>File modified: {basename(activeFile.path)}</p>
                    <p className={css.emptyDiffSub}>
                      +{activeFile.additions} additions, -{activeFile.deletions} deletions
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
