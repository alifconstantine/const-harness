import React, { useEffect, useRef, useState } from 'react'
import styles from './Automations.module.css'

export interface DayPickerGridProps {
  value: number // 1 to 31
  onChange: (day: number) => void
}

export function DayPickerGrid({ value = 1, onChange }: DayPickerGridProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const days = Array.from({ length: 31 }, (_, i) => i + 1)

  return (
    <div ref={containerRef} className={styles.dayPickerContainer}>
      <button
        type="button"
        className={styles.dropdownTrigger}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span>Day {value}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`${styles.dropdownChevron} ${open ? styles.dropdownChevronOpen : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className={styles.dayGridPopover}>
          <div className={styles.dayGridHeader}>Select day of month</div>
          <div className={styles.dayGrid}>
            {days.map(d => (
              <button
                key={d}
                type="button"
                className={`${styles.dayGridCell} ${d === value ? styles.dayGridCellActive : ''}`}
                onClick={() => {
                  onChange(d)
                  setOpen(false)
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
