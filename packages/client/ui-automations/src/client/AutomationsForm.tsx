import React, { useState } from 'react'
import type { AutomationItem, AutomationSchedule, AutomationScheduleKind } from '@deepseek-ai/dsh-host-apiproxy/api'
import { CustomDropdown } from './CustomDropdown.tsx'
import { TimePicker } from './TimePicker.tsx'
import { DayPickerGrid } from './DayPickerGrid.tsx'
import { CustomRepeatModal, type CustomRepeatConfig } from './CustomRepeatModal.tsx'
import styles from './Automations.module.css'

export interface FormSubmitData {
  title: string
  instructions: string
  schedule: AutomationSchedule
  workspaceId?: string
  permissionPreset?: 'read-only' | 'workspace-write' | 'danger-full-access'
  model?: string
}

export interface AutomationsFormProps {
  initialValues?: Partial<AutomationItem> | undefined
  workspaces?: { id: string; name: string }[] | undefined
  availableModels?: string[] | undefined
  isEditing?: boolean | undefined
  onSubmit: (data: FormSubmitData) => void
  onCancel: () => void
  onSwitchToHistory?: () => void
}

export function AutomationsForm({
  initialValues,
  workspaces = [],
  availableModels = [],
  isEditing = false,
  onSubmit,
  onCancel,
  onSwitchToHistory,
}: AutomationsFormProps): React.JSX.Element {
  const [title, setTitle] = useState(initialValues?.title ?? '')
  const [instructions, setInstructions] = useState(initialValues?.instructions ?? '')
  const [hasSchedule, setHasSchedule] = useState(Boolean(initialValues?.schedule))

  const [scheduleKind, setScheduleKind] = useState<AutomationScheduleKind>(
    initialValues?.schedule?.kind ?? 'daily',
  )
  const [scheduleTime, setScheduleTime] = useState(initialValues?.schedule?.time ?? '09:00')
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState(
    initialValues?.schedule?.dayOfWeek ?? 1,
  )
  const [scheduleDayOfMonth, setScheduleDayOfMonth] = useState(
    initialValues?.schedule?.dayOfMonth ?? 1,
  )
  const [customConfig, setCustomConfig] = useState<CustomRepeatConfig>({
    frequency: Math.max(1, Math.round((initialValues?.schedule?.intervalMinutes ?? 1440) / 1440)) || 1,
    unit: 'days',
    endsNever: true,
  })
  const [showCustomModal, setShowCustomModal] = useState(false)

  const [workspaceId, setWorkspaceId] = useState(initialValues?.workspaceId ?? '')
  const [permissionPreset, setPermissionPreset] = useState<'read-only' | 'workspace-write' | 'danger-full-access'>(
    initialValues?.permissionPreset ?? 'workspace-write',
  )
  const [model, setModel] = useState(initialValues?.model ?? '')

  const [activeSubTab, setActiveSubTab] = useState<'settings' | 'history'>('settings')

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!title.trim() || !instructions.trim()) return

    let intervalMinutes = 60
    if (customConfig.unit === 'minutes') intervalMinutes = customConfig.frequency
    if (customConfig.unit === 'hours') intervalMinutes = customConfig.frequency * 60
    if (customConfig.unit === 'days') intervalMinutes = customConfig.frequency * 1440
    if (customConfig.unit === 'weeks') intervalMinutes = customConfig.frequency * 10080
    if (customConfig.unit === 'months') intervalMinutes = customConfig.frequency * 43200

    const schedule: AutomationSchedule = {
      kind: scheduleKind,
      ...(scheduleKind !== 'hourly' && scheduleKind !== 'custom' ? { time: scheduleTime } : {}),
      ...(scheduleKind === 'weekly' ? { dayOfWeek: scheduleDayOfWeek } : {}),
      ...(scheduleKind === 'monthly' ? { dayOfMonth: scheduleDayOfMonth } : {}),
      ...(scheduleKind === 'custom' ? { intervalMinutes, time: scheduleTime } : {}),
    }

    onSubmit({
      title: title.trim(),
      instructions: instructions.trim(),
      schedule,
      ...(workspaceId ? { workspaceId } : {}),
      permissionPreset,
      ...(model ? { model } : {}),
    })
  }

  // Schedule Options for CustomDropdown
  const scheduleKindOptions = [
    { value: 'hourly', label: 'Hourly' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekdays', label: 'Weekdays' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'custom', label: 'Custom' },
  ]

  const weekDayOptions = [
    { value: '1', label: 'Monday' },
    { value: '2', label: 'Tuesday' },
    { value: '3', label: 'Wednesday' },
    { value: '4', label: 'Thursday' },
    { value: '5', label: 'Friday' },
    { value: '6', label: 'Saturday' },
    { value: '0', label: 'Sunday' },
  ]

  const getSummaryText = (): string => {
    if (!hasSchedule) return 'No schedule'
    switch (scheduleKind) {
      case 'hourly':
        return 'Every hour'
      case 'daily':
        return `Every day at ${scheduleTime}`
      case 'weekdays':
        return `Every weekday at ${scheduleTime}`
      case 'weekly': {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        return `Weekly on ${days[scheduleDayOfWeek]} at ${scheduleTime}`
      }
      case 'monthly':
        return `Monthly on day ${scheduleDayOfMonth} at ${scheduleTime}`
      case 'custom':
        return `Every ${customConfig.frequency} ${customConfig.unit} at ${scheduleTime}`
      default:
        return 'Custom'
    }
  }

  // Workspaces options
  const workspaceOptions = [
    { value: '', label: 'Default workspace' },
    ...workspaces.map(w => ({ value: w.id, label: w.name })),
  ]

  // Permission presets
  const permissionOptions = [
    { value: 'read-only', label: 'Read only' },
    { value: 'workspace-write', label: 'Workspace write' },
    { value: 'danger-full-access', label: 'Full access' },
  ]

  // Models
  const modelOptions = [
    { value: '', label: 'Default model' },
    ...availableModels.map(m => ({ value: m, label: m })),
  ]

  return (
    <>
      {/* Floating Top-Left Corner Navigation Bar (Image 2) */}
      <div className={styles.topBar}>
        <button
          type="button"
          className={styles.topBarBreadcrumb}
          onClick={onCancel}
          title="Back to Automations"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Automations</span>
        </button>
        <span className={styles.topBarSeparator}>/</span>
        <span className={styles.topBarCurrent}>
          {isEditing ? (title || 'Edit task') : 'New task'}
        </span>
      </div>

      {/* Main Page Content (heading at fixed stable vertical position) */}
      <div className={styles.pageContent}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>
            {isEditing ? 'Edit scheduled task' : 'New scheduled task'}
          </h1>
          <p className={styles.pageSubtitle}>
            Configure when this task runs, what it does, and how it works.
          </p>
        </div>

        {/* Controls Bar */}
        <div className={styles.controlsBar}>
          <div className={styles.segmentedTabs}>
            <button
              type="button"
              className={`${styles.segmentedTab} ${activeSubTab === 'settings' ? styles.segmentedTabActive : ''}`}
              onClick={() => setActiveSubTab('settings')}
            >
              Settings
            </button>
            <button
              type="button"
              className={`${styles.segmentedTab} ${activeSubTab === 'history' ? styles.segmentedTabActive : ''}`}
              onClick={() => {
                if (isEditing && onSwitchToHistory) {
                  onSwitchToHistory()
                } else {
                  setActiveSubTab('history')
                }
              }}
            >
              History
            </button>
          </div>

          <div className={styles.controlsRight}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={onCancel}
            >
              Cancel
            </button>
            {activeSubTab === 'settings' && (
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => handleSubmit()}
                disabled={!title.trim() || !instructions.trim()}
              >
                {isEditing ? 'Save changes' : 'Create scheduled task'}
              </button>
            )}
          </div>
        </div>

        {/* If History sub-tab active on a new task with no runs yet (Image 4) */}
        {activeSubTab === 'history' ? (
          <div className={styles.emptyRunsBox}>
            <span>No runs yet.</span>
          </div>
        ) : (
        /* Form Fields */
          <form className={styles.formContainer} onSubmit={handleSubmit}>
            {/* Field: Task Title */}
            <div className={styles.formField}>
              <label className={styles.formLabel}>Task title</label>
              <input
                type="text"
                className={styles.input}
                placeholder="Untitled Automation"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Field: Schedule Bar (Images 4 & 5) */}
            <div className={styles.formField}>
              <label className={styles.formLabel}>Schedule</label>
              {!hasSchedule ? (
                <div
                  className={styles.scheduleEmptyBar}
                  onClick={() => setHasSchedule(true)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>Add schedule</span>
                </div>
              ) : (
                <div className={styles.scheduleBarConfigured}>
                  <div className={styles.scheduleBarControls}>
                    {/* Schedule Kind Dropdown */}
                    <CustomDropdown
                      value={scheduleKind}
                      options={scheduleKindOptions}
                      onChange={(val) => {
                        setScheduleKind(val as AutomationScheduleKind)
                        if (val === 'custom') {
                          setShowCustomModal(true)
                        }
                      }}
                    />

                    {/* If Custom: button opening CustomRepeatModal */}
                    {scheduleKind === 'custom' && (
                      <button
                        type="button"
                        className={styles.scheduleBarButton}
                        onClick={() => setShowCustomModal(true)}
                      >
                        <span>Every {customConfig.frequency} {customConfig.unit}</span>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </button>
                    )}

                    {/* If Weekly: Day dropdown */}
                    {scheduleKind === 'weekly' && (
                      <>
                        <span className={styles.scheduleSeparatorText}>on</span>
                        <CustomDropdown
                          value={String(scheduleDayOfWeek)}
                          options={weekDayOptions}
                          onChange={val => setScheduleDayOfWeek(Number.parseInt(val, 10))}
                        />
                      </>
                    )}

                    {/* If Monthly: Day grid picker (Image 1 fix) */}
                    {scheduleKind === 'monthly' && (
                      <>
                        <span className={styles.scheduleSeparatorText}>day</span>
                        <DayPickerGrid
                          value={scheduleDayOfMonth}
                          onChange={setScheduleDayOfMonth}
                        />
                      </>
                    )}

                    {/* Time picker for daily/weekdays/weekly/monthly/custom */}
                    {scheduleKind !== 'hourly' && (
                      <>
                        <span className={styles.scheduleSeparatorText}>at</span>
                        <TimePicker
                          value={scheduleTime}
                          onChange={setScheduleTime}
                        />
                      </>
                    )}

                    {/* Schedule Summary Preview */}
                    <span className={styles.scheduleSummaryText}>
                      {getSummaryText()}
                    </span>
                  </div>

                  {/* Reset / Trash Schedule Button */}
                  <button
                    type="button"
                    className={styles.scheduleTrashButton}
                    onClick={() => setHasSchedule(false)}
                    title="Remove schedule"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* Field: Instructions with Custom Dropdowns in Toolbar (Image 1 fix) */}
            <div className={styles.formField}>
              <label className={styles.formLabel}>Instructions</label>
              <div className={styles.instructionsContainer}>
                <textarea
                  className={styles.instructionsTextarea}
                  placeholder="e.g. Review commits from the last 24 hours and summarize likely bugs and fixes"
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                  required
                />

                {/* Embedded Toolbar at bottom of textarea */}
                <div className={styles.instructionsToolbar}>
                  <div className={styles.toolbarLeft}>
                    {/* Workspace Dropdown */}
                    <CustomDropdown
                      icon={
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                      }
                      value={workspaceId}
                      options={workspaceOptions}
                      onChange={setWorkspaceId}
                    />

                    {/* Permission Preset Dropdown */}
                    <CustomDropdown
                      icon={
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                      }
                      value={permissionPreset}
                      options={permissionOptions}
                      onChange={val => setPermissionPreset(val as typeof permissionPreset)}
                    />
                  </div>

                  <div className={styles.toolbarRight}>
                    {/* Model Dropdown */}
                    <CustomDropdown
                      icon={
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="3" />
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                      }
                      value={model}
                      options={modelOptions}
                      onChange={setModel}
                    />
                  </div>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Custom Repeat Modal */}
      {showCustomModal && (
        <CustomRepeatModal
          initialConfig={customConfig}
          onConfirm={(cfg) => {
            setCustomConfig(cfg)
            setShowCustomModal(false)
          }}
          onClose={() => setShowCustomModal(false)}
        />
      )}
    </>
  )
}
