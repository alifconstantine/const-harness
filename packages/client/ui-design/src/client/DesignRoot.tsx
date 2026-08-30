import React, { useEffect, useState } from 'react'
import type { ClientContext, WorkspaceId } from '@const-ai/client-runtime/client'
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
    workspaceId?: string | undefined
    model?: string | undefined
    permissionPreset: string
  }) => {
    try {
      const sessionId = await ctx.workspaces.connectWorkspace(
        options.workspaceId ? (options.workspaceId as unknown as WorkspaceId) : undefined,
      )

      if (sessionId) {
        ctx.sessions.open(sessionId)

        // Select model if specified
        if (options.model && api) {
          try {
            await api.sessions.selectModel({ sessionId, provider: 'default', model: options.model })
          } catch {}
        }

        // Compose full design prompt with tokens, DESIGN.md, and craft guidelines
        let finalPrompt = options.prompt
        if ((options.designSystemId || options.mode) && api) {
          try {
            const targetMode: 'deck' | 'prototype' | 'document' | 'hyperframes' = options.mode === 'slide_deck'
              ? 'deck'
              : options.mode === 'hyperframes'
                ? 'hyperframes'
                : options.mode === 'document'
                  ? 'document'
                  : 'prototype'
            const composed = await api.design.composePrompt({
              mode: targetMode,
              ...(options.designSystemId ? { designSystemId: options.designSystemId } : {}),
              customInstructions: options.prompt,
            })
            if (composed.result.ok && composed.result.value.systemPrompt) {
              finalPrompt = `[DESIGN DIRECTIVE]\n${composed.result.value.systemPrompt}\n\n[USER REQUEST]\n${options.prompt}`
            }
          } catch {}
        }

        // Send initial prompt if available
        if (api && finalPrompt) {
          void api.sessions.prompt({
            sessionId,
            mode: 'queue',
            content: [{ type: 'text', text: finalPrompt }],
          })
        }
      }

      setIsOpen(false)
      window.dispatchEvent(new CustomEvent('const:design-state', { detail: { active: false } }))
      window.dispatchEvent(new CustomEvent('const:close-design'))
      window.dispatchEvent(new CustomEvent('const:filter-mode', { detail: { mode: 'workspace' } }))
    } catch {
      setIsOpen(false)
      window.dispatchEvent(new CustomEvent('const:design-state', { detail: { active: false } }))
      window.dispatchEvent(new CustomEvent('const:close-design'))
      window.dispatchEvent(new CustomEvent('const:filter-mode', { detail: { mode: 'workspace' } }))
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
        ctx={ctx}
        onStartSession={(opts) => { void handleStartSession(opts) }}
      />
    </div>
  )
}
