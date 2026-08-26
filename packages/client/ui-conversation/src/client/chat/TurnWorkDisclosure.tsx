import { memo, useState } from 'react'
import type { ReactNode } from 'react'
import { IconChevronRightOutline14 } from '@const-ai/client-ui-primitives'
import type { ChatViewSlotProps } from '../contract/slots.ts'
import { formatRunDuration } from './message-chrome.ts'
import css from './TurnWorkDisclosure.module.css'

export interface TurnWorkDisclosureProps {
  readonly turn: number
  readonly durationMs?: number | undefined
  readonly summary?: string | undefined
  readonly children: ReactNode
  readonly t: ChatViewSlotProps['t']
  readonly defaultOpen?: boolean | undefined
}

/**
 * Collapsible summary accordion for intermediate turn work items
 * (context injections, tool calls, thinking/reasoning blocks).
 *
 * Defaults to collapsed upon turn completion to keep chat transcript clean,
 * while allowing full inspection of intermediate steps when expanded.
 * @param props - turn number, elapsed duration, summary string, children, locale seat, and default open state.
 * @returns the collapsible disclosure element.
 */
export const TurnWorkDisclosure = memo(function TurnWorkDisclosure({
  durationMs,
  summary,
  children,
  t,
  defaultOpen = false,
}: TurnWorkDisclosureProps) {
  const [open, setOpen] = useState(defaultOpen)
  const durationText = durationMs !== undefined ? formatRunDuration(durationMs, t) : undefined
  const title = durationText !== undefined
    ? t('message.workedFor', { duration: durationText })
    : t('message.worked')

  return (
    <div className={css.root} data-turn-work-disclosure="" data-open={open ? 'true' : undefined}>
      <button
        type="button"
        className={css.headerButton}
        aria-expanded={open}
        onClick={() => { setOpen(prev => !prev) }}
      >
        <span className={open ? css.chevronExpanded : css.chevron}>
          <IconChevronRightOutline14 size={14} />
        </span>
        <span className={css.title}>{title}</span>
        {summary !== undefined && <span className={css.summary}>· {summary}</span>}
      </button>
      <div className={open ? css.body : css.bodyHidden}>
        {children}
      </div>
    </div>
  )
})
