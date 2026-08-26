import React, { useState } from 'react'
import { CustomDropdown } from './CustomDropdown.tsx'
import styles from './Automations.module.css'

export interface CustomRepeatConfig {
  frequency: number
  unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months'
  endsNever: boolean
  endDate?: string | undefined
}

export interface CustomRepeatModalProps {
  initialConfig?: CustomRepeatConfig | undefined
  onConfirm: (config: CustomRepeatConfig) => void
  onClose: () => void
}

export function CustomRepeatModal({
  initialConfig,
  onConfirm,
  onClose,
}: CustomRepeatModalProps): React.JSX.Element {
  const [frequency, setFrequency] = useState(initialConfig?.frequency ?? 1)
  const [unit, setUnit] = useState<'minutes' | 'hours' | 'days' | 'weeks' | 'months'>(
    initialConfig?.unit ?? 'days',
  )
  const [endsNever, setEndsNever] = useState(initialConfig?.endsNever ?? true)
  const [endDate, setEndDate] = useState(
    initialConfig?.endDate ?? new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  )

  const unitOptions = [
    { value: 'minutes', label: 'minutes' },
    { value: 'hours', label: 'hours' },
    { value: 'days', label: 'days' },
    { value: 'weeks', label: 'weeks' },
    { value: 'months', label: 'months' },
  ]

  const handleConfirm = () => {
    onConfirm({
      frequency: Math.max(1, frequency),
      unit,
      endsNever,
      endDate: endsNever ? undefined : endDate,
    })
  }

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.customRepeatModal} onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className={styles.customRepeatHeader}>
          <h3 className={styles.customRepeatTitle}>Custom Repeat</h3>
          <button
            type="button"
            className={styles.modalCloseButton}
            onClick={onClose}
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className={styles.customRepeatBody}>
          {/* Repetition frequency */}
          <div className={styles.formField}>
            <label className={styles.formLabel}>Repetition frequency</label>
            <div className={styles.repeatFreqRow}>
              <input
                type="number"
                className={styles.repeatFreqInput}
                min={1}
                max={365}
                value={frequency}
                onChange={e => setFrequency(Number.parseInt(e.target.value, 10) || 1)}
              />
              <CustomDropdown
                value={unit}
                options={unitOptions}
                onChange={val => setUnit(val as typeof unit)}
                className={styles.repeatUnitDropdown}
              />
            </div>
          </div>

          {/* Ends options */}
          <div className={styles.formField}>
            <label className={styles.formLabel}>Ends</label>
            <div className={styles.repeatEndsOptions}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="repeatEnds"
                  checked={endsNever}
                  onChange={() => setEndsNever(true)}
                />
                <span>Never ends</span>
              </label>

              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="repeatEnds"
                  checked={!endsNever}
                  onChange={() => setEndsNever(false)}
                />
                <span>Ends on date</span>
              </label>

              {!endsNever && (
                <div style={{ marginTop: 6 }}>
                  <input
                    type="date"
                    className={styles.input}
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className={styles.customRepeatFooter}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}
