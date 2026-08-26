import React, { useState } from 'react'
import type { AutomationItem, AutomationRunHistory } from '@const-ai/host-apiproxy/api'
import styles from './Automations.module.css'

export interface AutomationsHistoryProps {
  task: AutomationItem
  historyList: AutomationRunHistory[]
  onRunNow: (taskId: string) => void
  onDeleteTask: (taskId: string) => void
  onOpenSession: (sessionId: string) => void
  onDeleteRun: (runId: string) => void
  onBack: () => void
  onSwitchToSettings: () => void
}

export function AutomationsHistory({
  task,
  historyList,
  onRunNow,
  onDeleteTask,
  onOpenSession,
  onBack,
  onSwitchToSettings,
}: AutomationsHistoryProps): React.JSX.Element {
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const formatDuration = (ms?: number): string => {
    if (ms === undefined) return '0s'
    if (ms < 1000) return `${ms}ms`
    const totalSec = Math.round(ms / 1000)
    if (totalSec < 60) return `${totalSec}s`
    const min = Math.floor(totalSec / 60)
    const sec = totalSec % 60
    return `${min}m ${sec}s`
  }

  const formatTimestamp = (isoString: string): string => {
    try {
      const d = new Date(isoString)
      const yr = d.getFullYear()
      const mo = String(d.getMonth() + 1).padStart(2, '0')
      const da = String(d.getDate()).padStart(2, '0')
      const hr = String(d.getHours()).padStart(2, '0')
      const mi = String(d.getMinutes()).padStart(2, '0')
      return `${yr}-${mo}-${da} ${hr}:${mi}`
    } catch {
      return isoString
    }
  }

  const totalPages = Math.max(1, Math.ceil(historyList.length / pageSize))
  const paginatedList = historyList.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <>
      {/* Floating Top-Left Corner Navigation Bar (Image 2) */}
      <div className={styles.topBar}>
        <button
          type="button"
          className={styles.topBarBreadcrumb}
          onClick={onBack}
          title="Back to Automations"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Automations</span>
        </button>
        <span className={styles.topBarSeparator}>/</span>
        <span className={styles.topBarCurrent}>{task.title}</span>
      </div>

      <div className={styles.pageContent}>
        {/* Header (Exact position matching form) */}
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Edit scheduled task</h1>
          <p className={styles.pageSubtitle}>
            Adjust when this task runs, what it does, and how it works.
          </p>
        </div>

        {/* Sub-tabs & Top Actions (Image 5 style) */}
        <div className={styles.controlsBar}>
          <div className={styles.segmentedTabs}>
            <button
              type="button"
              className={styles.segmentedTab}
              onClick={onSwitchToSettings}
            >
              Settings
            </button>
            <button
              type="button"
              className={`${styles.segmentedTab} ${styles.segmentedTabActive}`}
            >
              History
            </button>
          </div>

          <div className={styles.controlsRight}>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => { onRunNow(task.id) }}
              title="Run Now"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </button>

            <button
              type="button"
              className={styles.iconButton}
              onClick={() => {
                if (window.confirm(`Delete "${task.title}"?`)) {
                  onDeleteTask(task.id)
                }
              }}
              title="Delete task"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="1" />
                <circle cx="19" cy="12" r="1" />
                <circle cx="5" cy="12" r="1" />
              </svg>
            </button>
          </div>
        </div>

        {/* History Content */}
        <div className={styles.historyView}>
          {historyList.length === 0 ? (
            /* Empty runs state matching Image 4 */
            <div className={styles.emptyRunsBox}>
              <span>No runs yet.</span>
            </div>
          ) : (
            /* Run History Table matching Image 5 */
            <>
              <div className={styles.historyTableWrapper}>
                <table className={styles.historyTable}>
                  <thead>
                    <tr>
                      <th>Triggered</th>
                      <th>Source</th>
                      <th>Status</th>
                      <th>Duration</th>
                      <th style={{ width: 40 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedList.map(run => (
                      <tr
                        key={run.id}
                        onClick={() => {
                          if (run.sessionId) {
                            onOpenSession(run.sessionId)
                          }
                        }}
                        title={run.sessionId ? 'Click to open dedicated chat session' : undefined}
                      >
                        <td>{formatTimestamp(run.triggeredAt)}</td>
                        <td className={styles.sourceCell}>
                          {run.source === 'scheduled' ? 'Scheduled' : 'Manual'}
                        </td>
                        <td>
                          {run.status === 'completed' && (
                            <span className={styles.statusSucceeded}>
                              <span className={styles.statusDot} />
                              <span>Succeeded</span>
                            </span>
                          )}
                          {run.status === 'failed' && (
                            <span className={styles.statusFailure}>
                              <span className={styles.statusDot} />
                              <span>Failure</span>
                            </span>
                          )}
                          {run.status === 'skipped' && (
                            <span className={styles.statusSkipped}>
                              <span className={styles.statusDot} />
                              <span>Skipped</span>
                            </span>
                          )}
                          {run.status === 'in-progress' && (
                            <span className={styles.statusInProgress}>
                              <span className={styles.statusDot} />
                              <span>Running</span>
                            </span>
                          )}
                        </td>
                        <td>{formatDuration(run.durationMs)}</td>
                        <td>
                          <button
                            type="button"
                            className={styles.moreButton}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (run.sessionId) {
                                onOpenSession(run.sessionId)
                              }
                            }}
                            title="Open chat session"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="1" />
                              <circle cx="19" cy="12" r="1" />
                              <circle cx="5" cy="12" r="1" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls matching Image 5 */}
              {totalPages > 1 && (
                <div className={styles.paginationRow}>
                  <button
                    type="button"
                    className={styles.paginationButton}
                    disabled={currentPage <= 1}
                    onClick={() =>{  setCurrentPage(p => Math.max(1, p - 1)) }}
                  >
                    <span>&larr; Previous</span>
                  </button>

                  <div className={styles.paginationPages}>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        type="button"
                        className={`${styles.paginationPageNum} ${p === currentPage ? styles.paginationPageNumActive : ''}`}
                        onClick={() =>{  setCurrentPage(p) }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className={styles.paginationButton}
                    disabled={currentPage >= totalPages}
                    onClick={() =>{  setCurrentPage(p => Math.min(totalPages, p + 1)) }}
                  >
                    <span>Next &rarr;</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
