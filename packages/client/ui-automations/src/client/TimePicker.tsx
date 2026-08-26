/* jscpd:ignore-start */
import React, { useEffect, useRef, useState } from 'react'
import styles from './Automations.module.css'

export interface TimePickerProps {
  value: string // e.g. "09:00"
  onChange: (time: string) => void
}

export function TimePicker({ value, onChange }: TimePickerProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const [hours, minutes] = (value || '09:00').split(':')
  const curHour = hours || '09'
  const curMinute = minutes || '00'

  const [inputVal, setInputVal] = useState(value || '09:00')

  useEffect(() => {
    setInputVal(value || '09:00')
  }, [value])

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

  const handleHourSelect = (h: string) => {
    const formatted = `${h.padStart(2, '0')}:${curMinute}`
    setInputVal(formatted)
    onChange(formatted)
  }

  const handleMinuteSelect = (m: string) => {
    const formatted = `${curHour}:${m.padStart(2, '0')}`
    setInputVal(formatted)
    onChange(formatted)
  }

  const handleDirectInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInputVal(val)
    if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(val)) {
      onChange(val)
    }
  }

  const hoursList = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
  const minutesList = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']

  return (
    <div ref={containerRef} className={styles.timePickerContainer}>
      <button
        type="button"
        className={styles.timePickerTrigger}
        onClick={() =>{  setOpen(!open) }}
        aria-expanded={open}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span>{value || '09:00'}</span>
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
        <div className={styles.timePickerPopover}>
          {/* Direct typing field */}
          <div className={styles.timePickerInputRow}>
            <input
              type="text"
              className={styles.timePickerDirectInput}
              value={inputVal}
              onChange={handleDirectInput}
              maxLength={5}
              placeholder="09:00"
            />
            <span style={{ fontSize: 11, color: '#71717a' }}>24-hour format</span>
          </div>

          {/* Symmetrical Dual Column Picker (Hour & Min without preset pills) */}
          <div className={styles.timeColumns}>
            <div className={styles.timeColumn}>
              <div className={styles.timeColumnHeader}>Hour</div>
              <div className={styles.timeColumnList}>
                {hoursList.map(h => (
                  <button
                    key={h}
                    type="button"
                    className={`${styles.timeItem} ${h === curHour ? styles.timeItemActive : ''}`}
                    onClick={() =>{  handleHourSelect(h) }}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.timeColumnDivider} />

            <div className={styles.timeColumn}>
              <div className={styles.timeColumnHeader}>Min</div>
              <div className={styles.timeColumnList}>
                {minutesList.map(m => (
                  <button
                    key={m}
                    type="button"
                    className={`${styles.timeItem} ${m === curMinute ? styles.timeItemActive : ''}`}
                    onClick={() =>{  handleMinuteSelect(m) }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* jscpd:ignore-end */
