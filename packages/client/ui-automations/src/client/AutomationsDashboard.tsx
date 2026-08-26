import React, { useState } from 'react'
import type { AutomationItem, AutomationSchedule } from '@const-ai/host-apiproxy/api'
import styles from './Automations.module.css'

export interface StarterTemplate {
  title: string
  description: string
  instructions: string
  schedule: AutomationSchedule
  scheduleLabel: string
  permissionPreset: 'read-only' | 'workspace-write' | 'danger-full-access'
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    title: 'Morning dev brief',
    description:
      'Summarize commits, module changes, CI status, and follow-ups since the previous workday, then produce no more than...',
    instructions:
      'Summarize commits, module changes, CI status, and follow-ups since the previous workday. Review repository history, flag any broken builds or failing tests, and highlight outstanding items.',
    schedule: { kind: 'weekdays', time: '09:00' },
    scheduleLabel: 'Every weekday at 09:00',
    permissionPreset: 'read-only',
  },
  {
    title: 'Risk scan',
    description:
      'Inspect code changes from the last 24 hours for high-confidence risks involving runtime failures, data loss...',
    instructions:
      'Inspect git commits and pull requests from the last 24 hours. Analyze modified code paths for potential security vulnerabilities, regressions, data loss risks, or missing test coverage.',
    schedule: { kind: 'daily', time: '10:00' },
    scheduleLabel: 'Daily at 10:00',
    permissionPreset: 'read-only',
  },
  {
    title: 'Release brief',
    description:
      'Organize PRs and commits merged this week into Features, Fixes, Experience improvements, and Engineering...',
    instructions:
      'Organize all pull requests and commits merged this week into clear changelog categories: Features, Bug Fixes, User Experience Improvements, and Internal Engineering. Prepare draft release notes.',
    schedule: { kind: 'weekly', dayOfWeek: 5, time: '16:00' },
    scheduleLabel: 'Weekly on Fri at 16:00',
    permissionPreset: 'workspace-write',
  },
  {
    title: 'Documentation sync check',
    description:
      'Compare code, configuration, API, and documentation changes from the last seven days. Identify high-confidence...',
    instructions:
      'Compare recent code, configuration, and API modifications over the last seven days against the documentation in docs/ and README. Identify any outdated docs, missing parameter descriptions, or broken examples.',
    schedule: { kind: 'weekly', dayOfWeek: 3, time: '15:00' },
    scheduleLabel: 'Weekly on Wed at 15:00',
    permissionPreset: 'workspace-write',
  },
]

export interface AutomationsDashboardProps {
  tasks: AutomationItem[]
  onCreateNew: () => void
  onSelectTemplate: (template: StarterTemplate) => void
  onSelectTask: (task: AutomationItem) => void
  onRunNow: (taskId: string) => void
  onRefresh?: (() => void) | undefined
}

export function AutomationsDashboard({
  tasks,
  onCreateNew,
  onSelectTemplate,
  onSelectTask,
  onRunNow,
  onRefresh,
}: AutomationsDashboardProps): React.JSX.Element {
  const [keepAwake, setKeepAwake] = useState(true)

  const formatSchedule = (schedule: AutomationSchedule): string => {
    switch (schedule.kind) {
      case 'hourly':
        return 'Hourly'
      case 'daily':
        return `Daily at ${schedule.time ?? '09:00'}`
      case 'weekdays':
        return `Weekdays at ${schedule.time ?? '09:00'}`
      case 'weekly': {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        const day = days[schedule.dayOfWeek ?? 1]
        return `Weekly on ${day} at ${schedule.time ?? '09:00'}`
      }
      case 'monthly':
        return `Monthly on day ${schedule.dayOfMonth ?? 1} at ${schedule.time ?? '09:00'}`
      case 'custom':
        return `Every ${schedule.intervalMinutes ?? 60}m`
      default:
        return 'Custom'
    }
  }

  const formatNextRunRelative = (nextRunAt?: string): string => {
    if (!nextRunAt) return ''
    const diffMs = Date.parse(nextRunAt) - Date.now()
    if (diffMs <= 0) return 'due now'
    const diffHours = Math.round(diffMs / (1000 * 3600))
    if (diffHours < 1) {
      const diffMins = Math.max(1, Math.round(diffMs / (1000 * 60)))
      return `Next run in ${diffMins}m`
    }
    if (diffHours < 24) {
      return `Next run in ${diffHours}h`
    }
    const diffDays = Math.round(diffHours / 24)
    return `Next run in ${diffDays}d`
  }

  return (
    <div className={styles.pageContent}>
      {/* Page Heading */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Automations</h1>
        <p className={styles.pageSubtitle}>Run tasks on a schedule or whenever you need them.</p>
      </div>

      {/* Controls Bar (Idle tab removed as requested) */}
      <div className={styles.controlsBar}>
        <div className={styles.segmentedTabs}>
          <span
            className={`${styles.segmentedTab} ${styles.segmentedTabActive}`}
            style={{ cursor: 'default' }}
          >
            Scheduled tasks
          </span>
        </div>

        <div className={styles.controlsRight}>
          {onRefresh && (
            <button
              type="button"
              className={styles.iconButton}
              onClick={onRefresh}
              title="Refresh"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.83 6.72 2.24L21 8M21 3v5h-5" />
              </svg>
            </button>
          )}

          <button
            type="button"
            className={styles.primaryButton}
            onClick={onCreateNew}
          >
            <span>Create scheduled task</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Info / Awake Banner */}
      <div className={styles.infoBanner}>
        <div className={styles.infoBannerLeft}>
          <span className={styles.infoBannerIcon}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </span>
          <span>Keep your computer awake while Const is running an automation task.</span>
        </div>
        <button
          type="button"
          className={`${styles.switchTrack} ${keepAwake ? styles.switchTrackActive : ''}`}
          onClick={() =>{  setKeepAwake(!keepAwake) }}
          aria-label="Toggle keep awake"
        >
          <div className={`${styles.switchThumb} ${keepAwake ? styles.switchThumbActive : ''}`} />
        </button>
      </div>

      {/* Task Created Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Task created</h2>
        </div>

        {tasks.length === 0 ? (
          <div className={styles.emptyState}>
            <span>No scheduled tasks yet.</span>
            <span>Create one from the templates below or click Create scheduled task.</span>
          </div>
        ) : (
          <div className={styles.taskCardsList}>
            {tasks.map((task) => {
              const scheduleText = formatSchedule(task.schedule)
              const relTime = formatNextRunRelative(task.nextRunAt)
              const badgeText = relTime ? `${scheduleText} · ${relTime}` : scheduleText

              return (
                <div
                  key={task.id}
                  className={styles.taskCard}
                  onClick={() => { onSelectTask(task) }}
                >
                  <div className={styles.taskCardTop}>
                    <h3 className={styles.taskCardTitle}>{task.title}</h3>
                    <div
                      className={styles.taskCardActions}
                      onClick={(e) => { e.stopPropagation() }}
                    >
                      <button
                        type="button"
                        className={styles.runNowButton}
                        onClick={() => { onRunNow(task.id) }}
                        title="Run this task right now"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                        <span>Run Now</span>
                      </button>
                    </div>
                  </div>

                  <p className={styles.taskCardInstructions}>{task.instructions}</p>

                  <div className={styles.taskCardFooter}>
                    <div className={styles.taskCardFooterLeft}>
                      <span className={styles.scheduleBadge}>
                        <span className={styles.greenDot} />
                        <span>{badgeText}</span>
                      </span>
                    </div>

                    <span className={styles.runCountBadge}>
                      {task.runCount > 0 ? `Ran ${task.runCount} times` : 'Not run yet'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Scheduled Task Template Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Scheduled task template</h2>
        </div>

        <div className={styles.templateGrid}>
          {STARTER_TEMPLATES.map((tmpl, idx) => (
            <div
              key={tmpl.title}
              className={styles.templateCard}
              onClick={() => { onSelectTemplate(tmpl) }}
            >
              <div className={styles.templateCardHeader}>
                <span className={styles.templateIcon}>
                  {idx === 0 && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                    </svg>
                  )}
                  {idx === 1 && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  )}
                  {idx === 2 && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                  )}
                  {idx === 3 && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                      <path d="M9 14l2 2 4-4" />
                    </svg>
                  )}
                </span>
                <h3 className={styles.templateTitle}>{tmpl.title}</h3>
              </div>

              <p className={styles.templateDesc}>{tmpl.description}</p>
              <div className={styles.templateScheduleTag}>{tmpl.scheduleLabel}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
