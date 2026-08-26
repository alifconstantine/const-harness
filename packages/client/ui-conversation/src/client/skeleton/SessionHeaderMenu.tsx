import { useCallback, useState } from 'react'
import {
  Button,
  IconActivityOutline16,
  IconArchiveOutline16,
  IconCopyOutline16,
  IconDownloadOutline16,
  IconEditOutline16,
  IconEllipsisOutline16,
  IconFolderOpenOutline16,
  IconWarningOutline16,
  Input,
  Menu,
  Modal,
  type MenuEntry,
} from '@const-ai/client-ui-primitives'
import type { SessionId } from '@const-ai/client-runtime/client'
import css from './SessionHeaderMenu.module.css'

export interface SessionHeaderMenuProps {
  sessionId: SessionId
  displayTitle: string
  cwd?: string | undefined
  onRename?: (newTitle: string) => Promise<unknown> | void
  onOpenTrajectory?: () => void
  onExportLog?: () => void
  onOpenPath?: (path: string) => void
}

export function SessionHeaderMenu({
  sessionId,
  displayTitle,
  cwd,
  onRename,
  onOpenTrajectory,
  onExportLog,
  onOpenPath,
}: SessionHeaderMenuProps) {
  const [open, setOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [titleInput, setTitleInput] = useState(displayTitle)
  const [renaming, setRenaming] = useState(false)

  const handleSelect = useCallback((id: string) => {
    setOpen(false)
    switch (id) {
      case 'pin': {
        // Pin task state can be integrated or notified
        break
      }
      case 'rename': {
        setTitleInput(displayTitle)
        setRenameOpen(true)
        break
      }
      case 'archive': {
        // Archive task action
        break
      }
      case 'unread': {
        // Mark as unread
        break
      }
      case 'open-explorer': {
        if (cwd) onOpenPath?.(cwd)
        break
      }
      case 'copy-path': {
        if (cwd) void navigator.clipboard.writeText(cwd)
        break
      }
      case 'copy-task-path': {
        const path = cwd ? `${cwd}/${sessionId}` : sessionId
        void navigator.clipboard.writeText(path)
        break
      }
      case 'copy-log-path': {
        void navigator.clipboard.writeText(`session-${sessionId}.jsonl`)
        break
      }
      case 'copy-session-id': {
        void navigator.clipboard.writeText(sessionId)
        break
      }
      case 'go-to-config': {
        // Navigate or open config
        break
      }
      case 'view-trajectory': {
        onOpenTrajectory?.()
        break
      }
      case 'export-session-log': {
        onExportLog?.()
        break
      }
      case 'report-issue': {
        window.open('https://github.com/deepseek-ai/deepseek-harness/issues', '_blank')
        break
      }
    }
  }, [cwd, displayTitle, onExportLog, onOpenPath, onOpenTrajectory, sessionId])

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titleInput.trim() || renaming) return
    setRenaming(true)
    try {
      await onRename?.(titleInput.trim())
      setRenameOpen(false)
    } finally {
      setRenaming(false)
    }
  }

  const items: readonly MenuEntry[] = [
    { id: 'pin', label: 'Pin task' },
    { id: 'rename', label: 'Rename task', icon: <IconEditOutline16 size={14} /> },
    { id: 'archive', label: 'Archive task', icon: <IconArchiveOutline16 size={14} /> },
    { id: 'unread', label: 'Mark as unread' },
    { type: 'separator', id: 'sep-1' },
    { id: 'open-explorer', label: 'Open in File Explorer', icon: <IconFolderOpenOutline16 size={14} />, disabled: !cwd },
    { id: 'copy-path', label: 'Copy path', icon: <IconCopyOutline16 size={14} />, disabled: !cwd },
    { id: 'copy-task-path', label: 'Copy task path', icon: <IconCopyOutline16 size={14} /> },
    { id: 'copy-log-path', label: 'Copy log path', icon: <IconCopyOutline16 size={14} /> },
    { id: 'copy-session-id', label: 'Copy session ID', icon: <IconCopyOutline16 size={14} /> },
    { id: 'go-to-config', label: 'Go to config' },
    { type: 'separator', id: 'sep-2' },
    { id: 'view-trajectory', label: 'View model trajectory', icon: <IconActivityOutline16 size={14} /> },
    { id: 'export-session-log', label: 'Export session log', icon: <IconDownloadOutline16 size={14} /> },
    { id: 'report-issue', label: 'Report issue', icon: <IconWarningOutline16 size={14} /> },
  ]

  return (
    <>
      <Menu
        open={open}
        anchor={(
          <button
            type="button"
            className={css.moreButton}
            aria-label="More session actions"
            data-open={open || undefined}
            onClick={() => { setOpen(prev => !prev) }}
          >
            <IconEllipsisOutline16 size={16} />
          </button>
        )}
        items={items}
        onSelect={handleSelect}
        onClose={() => { setOpen(false) }}
        side="bottom"
        align="start"
      />

      <Modal
        open={renameOpen}
        onClose={() => { if (!renaming) setRenameOpen(false) }}
        title="Rename task"
        description="Enter a new title for this conversation task."
      >
        <form onSubmit={(e) => { void handleRenameSubmit(e) }} className={css.renameForm}>
          <Input
            value={titleInput}
            onChange={(e) => { setTitleInput(e.target.value) }}
            placeholder="Task title"
            autoFocus
            disabled={renaming}
          />
          <div className={css.modalFooter}>
            <Button
              type="button"
              variant="ghost"
              disabled={renaming}
              onClick={() => { setRenameOpen(false) }}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              disabled={renaming || !titleInput.trim()}
            >
              Save
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
