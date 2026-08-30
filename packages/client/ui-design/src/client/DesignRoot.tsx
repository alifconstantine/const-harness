import React, { useEffect, useState } from 'react'
import type { ClientContext } from '@const-ai/client-runtime/client'
import type { ConnectionHandle } from '@const-ai/client-connection/client'
import { OpenDesignHome } from './OpenDesignHome.tsx'
import styles from './DesignRoot.module.css'

export interface DesignRootProps {
  ctx: ClientContext
}

export function DesignRoot({ ctx }: DesignRootProps): React.JSX.Element | null {
  const [isOpen, setIsOpen] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState<number>(260)

  const connection = ctx.get('connection') as ConnectionHandle | undefined
  const api = connection?.api

  // Measure dynamic sidebar column width
  useEffect(() => {
    const updateWidth = () => {
      const sidebarEl = document.querySelector('[class*="sidebarCol"]')
      if (sidebarEl) {
        const rect = sidebarEl.getBoundingClientRect()
        if (rect.width > 0) {
          setSidebarWidth(rect.width)
        }
      }
    }

    updateWidth()
    const sidebarEl = document.querySelector('[class*="sidebarCol"]')
    const observer = new ResizeObserver(updateWidth)
    if (sidebarEl) observer.observe(sidebarEl)
    window.addEventListener('resize', updateWidth)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateWidth)
    }
  }, [])

  // Listen for open/close events
  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true)
      window.dispatchEvent(new CustomEvent('const:design-state', { detail: { active: true } }))
    }

    const handleClose = () => {
      setIsOpen(false)
      window.dispatchEvent(new CustomEvent('const:design-state', { detail: { active: false } }))
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose()
      }
    }

    const handleOpenSession = () => {
      setIsOpen(false)
      window.dispatchEvent(new CustomEvent('const:design-state', { detail: { active: false } }))
    }

    window.addEventListener('const:open-design', handleOpen)
    window.addEventListener('const:close-design', handleClose)
    window.addEventListener('const:open-session', handleOpenSession)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('const:open-design', handleOpen)
      window.removeEventListener('const:close-design', handleClose)
      window.removeEventListener('const:open-session', handleOpenSession)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleStartSession = async (options: {
    prompt: string
    mode: string
    interaction: string
    designSystemId: string | null
    workspaceId?: string
    model?: string
    permissionPreset: string
  }) => {
    try {
      if (api?.sessions?.create) {
        const res = await api.sessions.create(
          options.workspaceId ? { workspaceId: options.workspaceId as any } : {},
        )
        if (res?.result?.ok) {
          const sessionId = res.result.value.sessionId
          ctx.sessions.open(sessionId)

          // Send initial prompt if available
          if (api.sessions?.prompt && options.prompt) {
            void api.sessions.prompt({
              sessionId,
              mode: 'queue',
              content: [{ type: 'text', text: options.prompt }],
            })
          }
        }
      }

      setIsOpen(false)
      window.dispatchEvent(new CustomEvent('const:design-state', { detail: { active: false } }))
    } catch {
      setIsOpen(false)
      window.dispatchEvent(new CustomEvent('const:design-state', { detail: { active: false } }))
    }
  }

  return (
    <div
      className={styles.pageContainer}
      style={{ left: `${sidebarWidth}px` }}
      role="region"
      aria-label="Const Design Studio"
    >
      <OpenDesignHome
        api={api}
        onStartSession={(opts) => { void handleStartSession(opts) }}
      />
    </div>
  )
}
