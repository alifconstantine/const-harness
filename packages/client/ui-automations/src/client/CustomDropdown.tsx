import React, { useEffect, useRef, useState } from 'react'
import styles from './Automations.module.css'

export interface DropdownOption {
  value: string
  label: string
  icon?: React.ReactNode
}

export interface CustomDropdownProps {
  value: string
  options: DropdownOption[]
  onChange: (value: string) => void
  icon?: React.ReactNode | undefined
  placeholder?: string | undefined
  className?: string | undefined
}

export function CustomDropdown({
  value,
  options,
  onChange,
  icon,
  placeholder = 'Select...',
  className,
}: CustomDropdownProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(o => o.value === value)

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

  return (
    <div ref={containerRef} className={`${styles.dropdownContainer} ${className || ''}`}>
      <button
        type="button"
        className={styles.dropdownTrigger}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className={styles.dropdownTriggerLeft}>
          {icon || selectedOption?.icon}
          <span>{selectedOption ? selectedOption.label : placeholder}</span>
        </span>
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
        <div className={styles.dropdownMenu}>
          {options.map((option) => {
            const isSelected = option.value === value
            return (
              <button
                key={option.value}
                type="button"
                className={`${styles.dropdownMenuItem} ${isSelected ? styles.dropdownMenuItemActive : ''}`}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
              >
                <span className={styles.dropdownMenuItemLeft}>
                  {option.icon}
                  <span>{option.label}</span>
                </span>
                {isSelected && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className={styles.dropdownCheckIcon}
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
