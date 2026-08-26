import React, { useEffect, useState } from 'react'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type { AutomationItem, AutomationRunHistory, WorkspaceView } from '@deepseek-ai/dsh-host-apiproxy/api'
import type { SessionId } from '@deepseek-ai/dsh-session'
import { AutomationsDashboard, type StarterTemplate } from './AutomationsDashboard.tsx'
import { AutomationsForm, type FormSubmitData } from './AutomationsForm.tsx'
import { AutomationsHistory } from './AutomationsHistory.tsx'
import styles from './Automations.module.css'

export interface AutomationsRootProps {
  ctx: ClientContext
}

export function AutomationsRoot({ ctx }: AutomationsRootProps): React.JSX.Element | null {
  const [isOpen, setIsOpen] = useState(false)
  const [view, setView] = useState<'dashboard' | 'create' | 'settings' | 'history'>('dashboard')
  const [tasks, setTasks] = useState<AutomationItem[]>([])
  const [selectedTask, setSelectedTask] = useState<AutomationItem | null>(null)
  const [historyList, setHistoryList] = useState<AutomationRunHistory[]>([])
  const [prefillValues, setPrefillValues] = useState<Partial<AutomationItem> | undefined>(undefined)
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string }[]>([])
  const [availableModels, setAvailableModels] = useState<string[]>([])
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
      setView('dashboard')
      setSelectedTask(null)
      window.dispatchEvent(new CustomEvent('const:automations-state', { detail: { active: true } }))
    }

    const handleClose = () => {
      setIsOpen(false)
      window.dispatchEvent(new CustomEvent('const:automations-state', { detail: { active: false } }))
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose()
      }
    }

    window.addEventListener('const:open-automations', handleOpen)
    window.addEventListener('const:close-automations', handleClose)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('const:open-automations', handleOpen)
      window.removeEventListener('const:close-automations', handleClose)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // Close automations view when user switches session
  useEffect(() => {
    if (!isOpen) return

    const initialId = ctx.sessions.list.getSnapshot().current
    const unsubscribe = ctx.sessions.list.subscribe(() => {
      const nowId = ctx.sessions.list.getSnapshot().current
      if (initialId && nowId && nowId !== initialId) {
        setIsOpen(false)
        window.dispatchEvent(new CustomEvent('const:automations-state', { detail: { active: false } }))
      }
    })

    return () => {
      unsubscribe()
    }
  }, [isOpen, ctx])

  // Load tasks, workspaces, models
  const refreshTasks = async () => {
    if (!api) return
    try {
      const res = await api.automations.list({})
      if (res.result.ok) {
        setTasks(res.result.value.items)
      }
    } catch {
      // Non-fatal
    }
  }

  const refreshHistory = async (automationId?: string) => {
    if (!api) return
    try {
      const res = await api.automations.history(automationId ? { automationId } : {})
      if (res.result.ok) {
        setHistoryList(res.result.value.items)
      }
    } catch {
      // Non-fatal
    }
  }

  useEffect(() => {
    if (!isOpen || !api) return

    void refreshTasks()

    void (async () => {
      try {
        const wsRes = await api.workspace.list({})
        if (wsRes.result.ok) {
          setWorkspaces(
            wsRes.result.value.items.map((w: WorkspaceView) => ({
              id: w.workspaceId,
              name: w.title || w.path.split(/[\\/]/).pop() || w.workspaceId,
            })),
          )
        }
      } catch {
        // Fallback
      }

      try {
        const modelRes = await api.llm.models({})
        if (modelRes.result.ok) {
          const names: string[] = []
          for (const grp of modelRes.result.value.groups) {
            for (const m of grp.models) {
              names.push(m.id)
            }
          }
          setAvailableModels(names)
        }
      } catch {
        // Fallback
      }
    })()
  }, [isOpen, api])

  useEffect(() => {
    if (selectedTask && (view === 'history' || view === 'settings')) {
      void refreshHistory(selectedTask.id)
    }
  }, [selectedTask, view])

  if (!isOpen) return null

  const handleRunNow = async (taskId: string) => {
    if (!api) return
    try {
      await api.automations.run({ id: taskId })
      await refreshTasks()
      if (selectedTask?.id === taskId) {
        await refreshHistory(taskId)
      }
    } catch {
      // Non-fatal
    }
  }

  const handleSelectTemplate = (template: StarterTemplate) => {
    setPrefillValues({
      title: template.title,
      instructions: template.instructions,
      schedule: template.schedule,
      permissionPreset: template.permissionPreset,
    })
    setView('create')
  }

  const handleSelectTask = (task: AutomationItem) => {
    setSelectedTask(task)
    setView('settings')
  }

  const handleCreateSubmit = async (data: FormSubmitData) => {
    if (!api) return
    try {
      const res = await api.automations.create(data)
      if (res.result.ok) {
        await refreshTasks()
        setView('dashboard')
      }
    } catch {
      // Non-fatal
    }
  }

  const handleUpdateSubmit = async (data: FormSubmitData) => {
    if (!selectedTask || !api) return
    try {
      const res = await api.automations.update({
        id: selectedTask.id,
        ...data,
      })
      if (res.result.ok) {
        setSelectedTask(res.result.value.item)
        await refreshTasks()
      }
    } catch {
      // Non-fatal
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!api) return
    try {
      await api.automations.delete({ id: taskId })
      await refreshTasks()
      setSelectedTask(null)
      setView('dashboard')
    } catch {
      // Non-fatal
    }
  }

  const handleOpenSession = (sessionId: string) => {
    setIsOpen(false)
    window.dispatchEvent(new CustomEvent('const:automations-state', { detail: { active: false } }))
    try {
      ctx.sessions.open(sessionId as SessionId)
    } catch {
      // Non-fatal
    }
  }

  const handleDeleteRun = async (runId: string) => {
    if (!api) return
    try {
      await api.automations.deleteRun({ id: runId })
      if (selectedTask) {
        await refreshHistory(selectedTask.id)
      }
    } catch {
      // Non-fatal
    }
  }

  return (
    <div
      className={styles.pageContainer}
      style={{ left: `${sidebarWidth}px` }}
    >
      {view === 'dashboard' && (
        <AutomationsDashboard
          tasks={tasks}
          onCreateNew={() => {
            setPrefillValues(undefined)
            setView('create')
          }}
          onSelectTemplate={handleSelectTemplate}
          onSelectTask={handleSelectTask}
          onRunNow={handleRunNow}
          onRefresh={refreshTasks}
        />
      )}

      {view === 'create' && (
        <AutomationsForm
          initialValues={prefillValues}
          workspaces={workspaces}
          availableModels={availableModels}
          isEditing={false}
          onSubmit={handleCreateSubmit}
          onCancel={() => setView('dashboard')}
        />
      )}

      {view === 'settings' && selectedTask && (
        <AutomationsForm
          initialValues={selectedTask}
          workspaces={workspaces}
          availableModels={availableModels}
          isEditing={true}
          onSubmit={handleUpdateSubmit}
          onCancel={() => {
            setView('dashboard')
            setSelectedTask(null)
          }}
          onSwitchToHistory={() => setView('history')}
        />
      )}

      {view === 'history' && selectedTask && (
        <AutomationsHistory
          task={selectedTask}
          historyList={historyList}
          onRunNow={handleRunNow}
          onDeleteTask={handleDeleteTask}
          onOpenSession={handleOpenSession}
          onDeleteRun={handleDeleteRun}
          onBack={() => {
            setView('dashboard')
            setSelectedTask(null)
          }}
          onSwitchToSettings={() => setView('settings')}
        />
      )}
    </div>
  )
}
