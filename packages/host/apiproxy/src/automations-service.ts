/**
 * Host-side Automations / Scheduled Tasks service and background runner.
 * Manages automations and execution history under ~/.const/storages/automations/
 * and runs scheduled tasks in dedicated sessions.
 *
 * @module @deepseek-ai/dsh-host-apiproxy/automations-service
 */

import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { dshHomePath } from '@deepseek-ai/dsh-home-paths'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { SessionId } from '@deepseek-ai/dsh-session'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace'
import type {
  AutomationItem,
  AutomationRunHistory,
  AutomationSchedule,
  AutomationsApi,
} from './api/automations.ts'
import type { RpcError, RpcRequest, RpcResponse } from './api/rpc.ts'

declare module '@deepseek-ai/dsh-session' {
  interface SessionEventMap {
    'permission/preset': { preset: string }
  }
}

function ok<T>(request: RpcRequest<unknown>, value: T): RpcResponse<T> {
  return { rpcId: request.rpcId, result: { ok: true, value } }
}

function err<T>(request: RpcRequest<unknown>, error: RpcError): RpcResponse<T> {
  return { rpcId: request.rpcId, result: { ok: false, error } }
}

/**
 * Calculate the next ISO timestamp for a given schedule configuration.
 */
export function calculateNextRunAt(schedule: AutomationSchedule, fromMs: number = Date.now()): string {
  if (schedule.kind === 'hourly') {
    const next = new Date(fromMs)
    next.setHours(next.getHours() + 1, 0, 0, 0)
    return next.toISOString()
  }

  const parseTime = (timeStr?: string): { hour: number; minute: number } => {
    if (!timeStr) return { hour: 9, minute: 0 }
    const parts = timeStr.split(':')
    return {
      hour: Number.parseInt(parts[0] ?? '9', 10),
      minute: Number.parseInt(parts[1] ?? '0', 10),
    }
  }

  const { hour, minute } = parseTime(schedule.time)

  if (schedule.kind === 'daily') {
    const target = new Date(fromMs)
    target.setHours(hour, minute, 0, 0)
    if (target.getTime() <= fromMs) {
      target.setDate(target.getDate() + 1)
    }
    return target.toISOString()
  }

  if (schedule.kind === 'weekdays') {
    const target = new Date(fromMs)
    target.setHours(hour, minute, 0, 0)
    if (target.getTime() <= fromMs) {
      target.setDate(target.getDate() + 1)
    }
    while (target.getDay() === 0 || target.getDay() === 6) {
      target.setDate(target.getDate() + 1)
    }
    return target.toISOString()
  }

  if (schedule.kind === 'weekly') {
    const targetDay = schedule.dayOfWeek ?? 1
    const target = new Date(fromMs)
    target.setHours(hour, minute, 0, 0)
    let daysUntil = (targetDay - target.getDay() + 7) % 7
    if (daysUntil === 0 && target.getTime() <= fromMs) {
      daysUntil = 7
    }
    target.setDate(target.getDate() + daysUntil)
    return target.toISOString()
  }

  if (schedule.kind === 'monthly') {
    const targetDay = Math.min(31, Math.max(1, schedule.dayOfMonth ?? 1))
    const target = new Date(fromMs)
    target.setDate(targetDay)
    target.setHours(hour, minute, 0, 0)
    if (target.getTime() <= fromMs) {
      target.setMonth(target.getMonth() + 1)
      target.setDate(targetDay)
    }
    return target.toISOString()
  }

  const intervalMinutes = schedule.intervalMinutes ?? (schedule.intervalSeconds ? Math.round(schedule.intervalSeconds / 60) : 60)
  if (schedule.time && intervalMinutes >= 1440) {
    const days = Math.round(intervalMinutes / 1440)
    const target = new Date(fromMs)
    target.setHours(hour, minute, 0, 0)
    if (target.getTime() <= fromMs) {
      target.setDate(target.getDate() + days)
    }
    return target.toISOString()
  }
  return new Date(fromMs + intervalMinutes * 60 * 1000).toISOString()

  return new Date(fromMs + 24 * 3600 * 1000).toISOString()
}

export interface AutomationsManagerDeps {
  ensureSession: (sessionId: SessionId, cwd: string) => Promise<Agent>
  defaultCwd: string
  setModel?: ((agent: Agent, model: string) => void) | undefined
}

export class AutomationsManager {
  private automations: AutomationItem[] = []
  private historyList: AutomationRunHistory[] = []
  private runningIds = new Set<string>()
  private loaded = false
  private timer: NodeJS.Timeout | undefined
  private dir: string

  constructor(
    private readonly ctx: Context,
    private readonly deps: AutomationsManagerDeps,
  ) {
    this.dir = dshHomePath('storages', 'automations')
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return
    try {
      await mkdir(this.dir, { recursive: true })
      const automationsPath = join(this.dir, 'automations.json')
      const historyPath = join(this.dir, 'history.json')

      try {
        const autoContent = await readFile(automationsPath, 'utf8')
        this.automations = JSON.parse(autoContent) as AutomationItem[]
      } catch {
        this.automations = []
      }

      try {
        const histContent = await readFile(historyPath, 'utf8')
        this.historyList = JSON.parse(histContent) as AutomationRunHistory[]
      } catch {
        this.historyList = []
      }
    } catch {
      this.automations = []
      this.historyList = []
    }
    this.loaded = true
  }

  private async persist(): Promise<void> {
    try {
      await mkdir(this.dir, { recursive: true })
      await writeFile(join(this.dir, 'automations.json'), JSON.stringify(this.automations, null, 2), 'utf8')
      await writeFile(join(this.dir, 'history.json'), JSON.stringify(this.historyList, null, 2), 'utf8')
    } catch (err: unknown) {
      this.ctx.logger.warn(`automations: persist failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  start(): void {
    if (this.timer) return
    void this.ensureLoaded()
    this.timer = setInterval(() => {
      void this.checkDueSchedules()
    }, 30_000)
    this.registerTools()
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = undefined
    }
  }

  async listAutomations(): Promise<AutomationItem[]> {
    await this.ensureLoaded()
    return [...this.automations]
  }

  async createAutomation(data: {
    title: string
    instructions: string
    schedule: AutomationSchedule
    workspaceId?: string
    permissionPreset?: AutomationItem['permissionPreset']
    model?: string
  }): Promise<AutomationItem> {
    await this.ensureLoaded()
    const id = `auto_${randomUUID().slice(0, 8)}`
    const now = new Date().toISOString()
    const nextRunAt = calculateNextRunAt(data.schedule)
    const item: AutomationItem = {
      id,
      title: data.title,
      instructions: data.instructions,
      schedule: data.schedule,
      permissionPreset: data.permissionPreset ?? 'workspace-write',
      enabled: true,
      createdAt: now,
      updatedAt: now,
      runCount: 0,
      nextRunAt,
      ...(data.workspaceId !== undefined ? { workspaceId: data.workspaceId } : {}),
      ...(data.model !== undefined ? { model: data.model } : {}),
    }
    this.automations.unshift(item)
    await this.persist()
    return item
  }

  async deleteAutomation(id: string): Promise<boolean> {
    await this.ensureLoaded()
    const idx = this.automations.findIndex(a => a.id === id)
    if (idx === -1) return false
    this.automations.splice(idx, 1)
    await this.persist()
    return true
  }

  private registerTools(): void {
    const tools = this.ctx.get('tools')
    if (!tools) return

    tools.register(defineTool({
      name: 'automation_create',
      description: 'Create a new scheduled automation task (cron job). The task will run periodically or at scheduled times in its own dedicated session and will be visible in the Automations dashboard.',
      parameters: {
        title: {
          type: 'string',
          required: true,
          description: 'Short descriptive title of the automation (e.g. "Morning Dev Brief", "Daily Dependency Audit").',
        },
        instructions: {
          type: 'string',
          required: true,
          description: 'Detailed instructions / prompt that the agent will execute when the automation runs.',
        },
        schedule_kind: {
          type: 'string',
          required: true,
          enum: ['hourly', 'daily', 'weekdays', 'weekly', 'monthly', 'custom'],
          description: 'Schedule frequency: "hourly", "daily", "weekdays" (Mon-Fri), "weekly", "monthly", or "custom".',
        },
        time: {
          type: 'string',
          description: 'Time of day in HH:mm 24-hour format (e.g. "09:00", "19:30"). Used for daily, weekdays, weekly, monthly.',
        },
        day_of_week: {
          type: 'number',
          description: 'Day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday). Used for weekly schedule.',
        },
        day_of_month: {
          type: 'number',
          description: 'Day of the month (1-31). Used for monthly schedule.',
        },
        interval_minutes: {
          type: 'number',
          description: 'Interval in minutes. Used for custom schedule.',
        },
        permission_preset: {
          type: 'string',
          enum: ['read-only', 'workspace-write', 'danger-full-access'],
          description: 'Execution permission preset. Defaults to "workspace-write".',
        },
      },
      output: {
        schema: { type: 'json' },
        render: (_args, value: unknown) => {
          const val = value as { id: string; title: string; nextRunAt: string }
          return [{
            type: 'text',
            text: `Automation created successfully!\nID: ${val.id}\nTitle: ${val.title}\nNext Run: ${val.nextRunAt}`,
          }]
        },
      },
      execute: async (args) => {
        const schedule: AutomationSchedule = {
          kind: args.schedule_kind,
          ...(args.time !== undefined ? { time: args.time } : {}),
          ...(args.day_of_week !== undefined ? { dayOfWeek: args.day_of_week } : {}),
          ...(args.day_of_month !== undefined ? { dayOfMonth: args.day_of_month } : {}),
          ...(args.interval_minutes !== undefined ? { intervalMinutes: args.interval_minutes } : {}),
        }
        const item = await this.createAutomation({
          title: args.title,
          instructions: args.instructions,
          schedule,
          ...(args.permission_preset !== undefined ? { permissionPreset: args.permission_preset } : {}),
        })
        return {
          success: true,
          id: item.id,
          title: item.title,
          nextRunAt: item.nextRunAt ?? 'N/A',
        }
      },
    }))

    tools.register(defineTool({
      name: 'automation_list',
      description: 'List all configured scheduled automations and their next scheduled run times.',
      parameters: {},
      output: {
        schema: { type: 'json' },
        render: (_args, value: unknown) => {
          const val = value as { items: Array<{ id: string; title: string; schedule: { kind: string }; nextRunAt?: string }> }
          return [{
            type: 'text',
            text: val.items.length === 0
              ? 'No automations configured.'
              : val.items.map(i => `- [${i.id}] ${i.title} (${i.schedule.kind}): next run at ${i.nextRunAt ?? 'none'}`).join('\n'),
          }]
        },
      },
      execute: async () => {
        const items = await this.listAutomations()
        return {
          items: items.map((i: AutomationItem) => ({
            id: i.id,
            title: i.title,
            schedule: i.schedule as unknown as Record<string, string | number>,
            enabled: i.enabled,
            nextRunAt: i.nextRunAt ?? null,
            runCount: i.runCount,
          })),
        }
      },
    }))

    tools.register(defineTool({
      name: 'automation_delete',
      description: 'Delete a scheduled automation by its ID.',
      parameters: {
        id: {
          type: 'string',
          required: true,
          description: 'ID of the automation to delete.',
        },
      },
      output: {
        schema: { type: 'json' },
        render: (_args, value: unknown) => {
          const val = value as { deleted: boolean }
          return [{ type: 'text', text: val.deleted ? 'Automation deleted.' : 'Automation not found.' }]
        },
      },
      execute: async (args) => {
        const deleted = await this.deleteAutomation(args.id)
        return { deleted }
      },
    }))

    tools.register(defineTool({
      name: 'automation_run',
      description: 'Trigger an immediate execution of a scheduled automation by its ID.',
      parameters: {
        id: {
          type: 'string',
          required: true,
          description: 'ID of the automation to run.',
        },
      },
      output: {
        schema: { type: 'json' },
        render: (_args, value: unknown) => {
          const val = value as { triggered: boolean }
          return [{ type: 'text', text: val.triggered ? 'Automation execution started.' : 'Failed to trigger automation.' }]
        },
      },
      execute: async (args) => {
        await this.executeAutomation(args.id, 'manual')
        return { triggered: true }
      },
    }))
  }

  private async checkDueSchedules(): Promise<void> {
    await this.ensureLoaded()
    const now = Date.now()
    for (const item of this.automations) {
      if (!item.enabled || !item.nextRunAt) continue
      if (this.runningIds.has(item.id)) continue
      const dueTime = Date.parse(item.nextRunAt)
      if (!Number.isNaN(dueTime) && dueTime <= now) {
        // Immediately advance nextRunAt to prevent double triggers on subsequent ticks
        item.nextRunAt = calculateNextRunAt(item.schedule, now + 1000)
        await this.persist()
        void this.executeAutomation(item.id, 'scheduled')
      }
    }
  }

  async executeAutomation(
    id: string,
    source: 'scheduled' | 'manual',
  ): Promise<{ success: boolean; sessionId?: string; error?: string }> {
    await this.ensureLoaded()
    const item = this.automations.find(a => a.id === id)
    if (!item) {
      return { success: false, error: `Automation "${id}" not found` }
    }

    if (this.runningIds.has(item.id)) {
      return { success: false, error: `Automation "${id}" is already running` }
    }
    this.runningIds.add(item.id)

    const runId = `run_${randomUUID().slice(0, 8)}`
    const startTime = Date.now()
    const historyEntry: AutomationRunHistory = {
      id: runId,
      automationId: item.id,
      triggeredAt: new Date(startTime).toISOString(),
      source,
      status: 'in-progress',
      durationMs: 0,
    }
    this.historyList.unshift(historyEntry)

    item.runCount += 1
    item.lastRunAt = new Date().toISOString()
    item.nextRunAt = calculateNextRunAt(item.schedule, startTime + 1000)
    await this.persist()

    try {
      let cwd: string | undefined
      if (item.workspaceId) {
        const ws = this.ctx.workspaceRegistry.get(item.workspaceId as WorkspaceId)
        if (ws) cwd = ws.path
      }

      const sessionId = `session-${randomUUID()}` as SessionId
      const targetCwd = cwd ?? this.deps.defaultCwd
      const agent = await this.deps.ensureSession(sessionId, targetCwd)

      historyEntry.sessionId = sessionId

      if (item.workspaceId) {
        try {
          const ws = this.ctx.workspaceRegistry.get(item.workspaceId as WorkspaceId)
          if (ws) await ws.attachSession(sessionId)
        } catch {
          // Non-fatal
        }
      }

      if (item.model && this.deps.setModel) {
        try {
          this.deps.setModel(agent, item.model)
        } catch {
          // Non-fatal
        }
      }

      try {
        const preset = item.permissionPreset
        agent.session.append('permission/preset', { preset })
      } catch {
        // Non-fatal
      }

      try {
        const titleService = this.ctx.get('sessionTitle') as { setTitle?: (id: SessionId, title: string) => Promise<void> } | undefined
        if (titleService?.setTitle) {
          void titleService.setTitle(sessionId, `[Automation] ${item.title}`)
        }
      } catch {
        // Non-fatal
      }

      const userMsg = createUserMessage({
        content: [{ type: 'text', text: item.instructions }],
        source: { kind: 'user' },
      })

      await agent.whenIdle()
      agent.followup(userMsg)

      // Watch completion in background to update history duration and status
      void (async () => {
        try {
          await agent.whenIdle()
          historyEntry.status = 'completed'
          historyEntry.durationMs = Date.now() - startTime
          await this.persist()
        } catch (err: unknown) {
          historyEntry.status = 'failed'
          historyEntry.error = err instanceof Error ? err.message : String(err)
          historyEntry.durationMs = Date.now() - startTime
          await this.persist()
        } finally {
          this.runningIds.delete(item.id)
        }
      })()

      await this.persist()
      return { success: true, sessionId }
    } catch (error: unknown) {
      this.runningIds.delete(item.id)
      const msg = error instanceof Error ? error.message : String(error)
      historyEntry.status = 'failed'
      historyEntry.error = msg
      historyEntry.durationMs = Date.now() - startTime
      await this.persist()
      return { success: false, error: msg }
    }
  }

  asApi(): AutomationsApi {
    return {
      list: async (req) => {
        const items = await this.listAutomations()
        return ok(req, { items })
      },

      create: async (req) => {
        const item = await this.createAutomation(req.payload)
        return ok(req, { item })
      },

      update: async (req) => {
        await this.ensureLoaded()
        const { id, title, instructions, schedule, workspaceId, permissionPreset, model, enabled } = req.payload
        const item = this.automations.find(a => a.id === id)
        if (!item) {
          return err(req, { code: 'bad-request', message: `Automation "${id}" not found`, details: { issues: [] } })
        }
        if (title !== undefined) item.title = title
        if (instructions !== undefined) item.instructions = instructions
        if (schedule !== undefined) {
          item.schedule = schedule
          const next = calculateNextRunAt(schedule)
          item.nextRunAt = next
        }
        if (workspaceId !== undefined) item.workspaceId = workspaceId
        if (permissionPreset !== undefined) item.permissionPreset = permissionPreset
        if (model !== undefined) item.model = model
        if (enabled !== undefined) {
          item.enabled = enabled
          if (enabled && !item.nextRunAt) {
            const next = calculateNextRunAt(item.schedule)
            item.nextRunAt = next
          }
        }
        item.updatedAt = new Date().toISOString()
        await this.persist()
        return ok(req, { item })
      },

      delete: async (req) => {
        await this.ensureLoaded()
        const { id } = req.payload
        const index = this.automations.findIndex(a => a.id === id)
        if (index === -1) {
          return ok(req, { deleted: false })
        }
        this.automations.splice(index, 1)
        this.historyList = this.historyList.filter(h => h.automationId !== id)
        await this.persist()
        return ok(req, { deleted: true })
      },

      run: async (req) => {
        const res = await this.executeAutomation(req.payload.id, 'manual')
        return ok(req, res)
      },

      history: async (req) => {
        await this.ensureLoaded()
        const { automationId } = req.payload
        let items = [...this.historyList]
        if (automationId) {
          items = items.filter(h => h.automationId === automationId)
        }
        return ok(req, { items })
      },

      deleteRun: async (req) => {
        await this.ensureLoaded()
        const { id } = req.payload
        const prevLength = this.historyList.length
        this.historyList = this.historyList.filter(h => h.id !== id)
        await this.persist()
        return ok(req, { deleted: this.historyList.length < prevLength })
      },
    }
  }
}
