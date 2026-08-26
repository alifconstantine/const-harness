/**
 * Automations (Scheduled Tasks / Cron Jobs) domain contract.
 * Wire projection of scheduled automations and their execution history.
 *
 * @module @deepseek-ai/dsh-host-apiproxy/api/automations
 */

import type { RpcRequest, RpcResponse } from './rpc.ts'

export type AutomationScheduleKind =
  | 'hourly'
  | 'daily'
  | 'weekdays'
  | 'weekly'
  | 'monthly'
  | 'custom'

export interface AutomationSchedule {
  kind: AutomationScheduleKind
  time?: string
  dayOfWeek?: number
  dayOfMonth?: number
  cron?: string
  intervalMinutes?: number
  intervalSeconds?: number
}

export interface AutomationItem {
  id: string
  title: string
  instructions: string
  schedule: AutomationSchedule
  workspaceId?: string
  permissionPreset: 'read-only' | 'workspace-write' | 'danger-full-access'
  model?: string
  enabled: boolean
  createdAt: string
  updatedAt: string
  lastRunAt?: string
  nextRunAt?: string
  runCount: number
}

export interface AutomationRunHistory {
  id: string
  automationId: string
  triggeredAt: string
  source: 'scheduled' | 'manual'
  status: 'completed' | 'failed' | 'in-progress' | 'skipped'
  durationMs: number
  sessionId?: string
  error?: string
}

export interface AutomationsApi {
  list(request: RpcRequest<Record<string, never>>): Promise<RpcResponse<{ items: AutomationItem[] }>>
  create(request: RpcRequest<{
    title: string
    instructions: string
    schedule: AutomationSchedule
    workspaceId?: string
    permissionPreset?: 'read-only' | 'workspace-write' | 'danger-full-access'
    model?: string
  }>): Promise<RpcResponse<{ item: AutomationItem }>>
  update(request: RpcRequest<{
    id: string
    title?: string
    instructions?: string
    schedule?: AutomationSchedule
    workspaceId?: string
    permissionPreset?: 'read-only' | 'workspace-write' | 'danger-full-access'
    model?: string
    enabled?: boolean
  }>): Promise<RpcResponse<{ item: AutomationItem }>>
  delete(request: RpcRequest<{ id: string }>): Promise<RpcResponse<{ deleted: boolean }>>
  run(request: RpcRequest<{ id: string }>): Promise<RpcResponse<{ success: boolean; sessionId?: string; error?: string }>>
  history(request: RpcRequest<{ automationId?: string }>): Promise<RpcResponse<{ items: AutomationRunHistory[] }>>
  deleteRun(request: RpcRequest<{ id: string }>): Promise<RpcResponse<{ deleted: boolean }>>
}
