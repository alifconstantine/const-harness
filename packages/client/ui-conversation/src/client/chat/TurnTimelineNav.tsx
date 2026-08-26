/**
 * TurnTimelineNav: vertical mini-timeline navigator on the left side of the chat.
 * Displays subtle dashes (-) for each turn, shows compact preview tooltip on hover (image1 style),
 * and smoothly scrolls to that message on click.
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChatNodeStore, ConversationTimelineSnapshot } from '@const-ai/client-runtime/client'
import type { ChatNode } from '../contract/chat-nodes.ts'
import css from './TurnTimelineNav.module.css'

export interface TurnNavEntry {
  readonly turn: number
  readonly userKey: string
  readonly anchorKey: string
  readonly userText: string
  readonly assistantText?: string | undefined
  readonly isRunning?: boolean
}

/** Clean and strip markdown syntax for a neat preview snippet */
function cleanPreviewText(raw: string): string {
  return raw
    .replace(/```[\s\S]*?```/g, '') // remove code blocks
    .replace(/`([^`]+)`/g, '$1')     // inline code
    .replace(/#{1,6}\s+/g, '')       // headings
    .replace(/[*_~]/g, '')          // bold/italics
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // markdown links
    .replace(/\s+/g, ' ')           // normalize whitespace
    .trim()
}

function extractUserText(content: readonly unknown[]): string {
  const parts: string[] = []
  for (const block of content) {
    const b = block as { type?: string; text?: string }
    if (b.type === 'text' && typeof b.text === 'string') {
      parts.push(b.text)
    }
  }
  return cleanPreviewText(parts.join(' '))
}

function extractAssistantText(node: ChatNode<'assistant-step'>): string {
  const data = node.data
  const parts: string[] = []
  const blocks = data.finalNode?.blocks ?? data.blocks
  for (const b of blocks) {
    if (b.kind === 'text' && typeof b.text === 'string') parts.push(b.text)
  }
  return cleanPreviewText(parts.join(' '))
}

function deriveTurnNavEntries(
  order: readonly string[],
  nodeStore: ChatNodeStore,
  timeline: ConversationTimelineSnapshot,
): readonly TurnNavEntry[] {
  const entries: TurnNavEntry[] = []
  for (let i = 0; i < order.length; i++) {
    const key = order[i]
    if (key === undefined) continue
    const node = nodeStore.get(key) as ChatNode | undefined
    if (node === undefined || node.kind !== 'user') continue

    const turnCoord = node.location.kind === 'turn' || node.location.kind === 'step'
      ? node.location.turn.turn
      : entries.length + 1

    const userText = extractUserText(node.data.content)
    const turnObj = timeline.turns.get(turnCoord)
    const isRunning = turnObj?.status === 'open'

    // Find assistant reply in the same turn
    let assistantText: string | undefined
    for (let j = i + 1; j < order.length; j++) {
      const nextKey = order[j]
      if (nextKey === undefined) break
      const nextNode = nodeStore.get(nextKey) as ChatNode | undefined
      if (nextNode?.kind === 'user') break
      if (nextNode?.kind === 'assistant-step') {
        const text = extractAssistantText(nextNode)
        if (text.length > 0) {
          assistantText = text
          break
        }
      }
    }

    entries.push({
      turn: turnCoord,
      userKey: key,
      anchorKey: node.key,
      userText: userText.length > 0 ? userText : `Turn ${turnCoord}`,
      assistantText,
      isRunning,
    })
  }
  return entries
}

/** Active column host when present; otherwise the view-local scroller. */
function scrollerOf(from: HTMLElement): HTMLElement {
  return from.closest('[data-conversation-scroll]') ?? from
}

function findAnchorElement(list: HTMLElement, key: string): HTMLElement | null {
  for (const row of list.querySelectorAll<HTMLElement>('[data-chat-anchor-key]')) {
    if (row.dataset.chatAnchorKey === key) return row
  }
  return null
}

export interface TurnTimelineNavProps {
  readonly order: readonly string[]
  readonly nodeStore: ChatNodeStore
  readonly timeline: ConversationTimelineSnapshot
  readonly listRef: React.RefObject<HTMLDivElement | null>
}

export const TurnTimelineNav = memo(function TurnTimelineNav({
  order,
  nodeStore,
  timeline,
  listRef,
}: TurnTimelineNavProps) {
  const entries = useMemo(() => deriveTurnNavEntries(order, nodeStore, timeline), [order, nodeStore, timeline])
  const [hoveredTurn, setHoveredTurn] = useState<number | null>(null)
  const [activeTurn, setActiveTurn] = useState<number | null>(null)
  const [navPos, setNavPos] = useState<{ left: number; top: number } | null>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef = useRef<number | null>(null)

  const clearHideTimer = () => {
    if (hideTimerRef.current !== null) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }

  const handlePointerEnter = (turn: number) => {
    clearHideTimer()
    setHoveredTurn(turn)
  }

  const handlePointerLeave = () => {
    clearHideTimer()
    hideTimerRef.current = setTimeout(() => {
      setHoveredTurn(null)
    }, 120)
  }

  const scrollToTurn = useCallback((anchorKey: string) => {
    clearHideTimer()
    setHoveredTurn(null) // Dismiss preview immediately on jump
    const local = listRef.current
    if (local === null) return
    const scroller = scrollerOf(local)
    const target = findAnchorElement(local, anchorKey)
    if (target !== null) {
      if (typeof scroller.scrollTo === 'function') {
        const rect = target.getBoundingClientRect()
        const scrollerRect = scroller.getBoundingClientRect()
        const targetScrollTop = scroller.scrollTop + (rect.top - scrollerRect.top) - 20
        scroller.scrollTo({ top: Math.max(0, targetScrollTop), behavior: 'smooth' })
      } else if (typeof target.scrollIntoView === 'function') {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }, [listRef])

  // Track position relative to conversation scroller
  useEffect(() => {
    const local = listRef.current
    if (local === null) return
    const el = scrollerOf(local)

    const updatePos = () => {
      const rect = el.getBoundingClientRect()
      setNavPos({
        left: rect.left + 18,
        top: rect.top + rect.height / 2,
      })
    }

    updatePos()
    window.addEventListener('resize', updatePos)
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updatePos) : null
    ro?.observe(el)
    return () => {
      window.removeEventListener('resize', updatePos)
      ro?.disconnect()
    }
  }, [listRef])

  // Track active visible turn on scroll with rAF throttle and bottom detection
  useEffect(() => {
    const local = listRef.current
    if (local === null || entries.length === 0) return
    const el = scrollerOf(local)

    const updateActiveTurn = () => {
      const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 40
      if (isAtBottom && entries.length > 0) {
        setActiveTurn(entries[entries.length - 1]?.turn ?? null)
        return
      }

      const viewport = el.getBoundingClientRect()
      const threshold = viewport.top + 140
      let currentActive = entries[0]?.turn ?? null

      for (const entry of entries) {
        const row = findAnchorElement(local, entry.anchorKey)
        if (row !== null) {
          const rect = row.getBoundingClientRect()
          if (rect.top <= threshold) {
            currentActive = entry.turn
          }
        }
      }
      setActiveTurn(currentActive)
    }

    const onScroll = () => {
      if (rafRef.current !== null) return
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        updateActiveTurn()
      })
    }

    updateActiveTurn()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [entries, listRef])

  // Dismiss on Escape key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearHideTimer()
        setHoveredTurn(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      clearHideTimer()
    }
  }, [])

  if (entries.length === 0) {
    return null
  }

  return (
    <nav
      className={css.track}
      style={navPos !== null ? { left: navPos.left, top: navPos.top } : undefined}
      aria-label="Conversation Turns"
    >
      {entries.map((entry) => {
        const isHovered = hoveredTurn === entry.turn
        const isActive = activeTurn === entry.turn

        return (
          <div
            key={entry.anchorKey}
            className={css.itemWrapper}
            onPointerEnter={() => { handlePointerEnter(entry.turn) }}
            onPointerLeave={handlePointerLeave}
          >
            <button
              type="button"
              className={css.dashBtn}
              data-active={isActive || undefined}
              aria-label={`Jump to turn: ${entry.userText}`}
              onClick={() => { scrollToTurn(entry.anchorKey) }}
            >
              <div className={css.dash} />
            </button>

            {isHovered && (
              <div
                className={css.previewCard}
                role="tooltip"
                onClick={() => { scrollToTurn(entry.anchorKey) }}
              >
                <div className={css.previewTitle}>{entry.userText}</div>
                {entry.assistantText ? (
                  <div className={css.previewSnippet}>{entry.assistantText}</div>
                ) : entry.isRunning ? (
                  <div className={css.previewEmpty}>Sedang memproses respons...</div>
                ) : (
                  <div className={css.previewEmpty}>Eksekusi selesai</div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
})
