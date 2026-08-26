/**
 * Automations (Scheduled Tasks / Cron Jobs) domain contract.
 * Wire projection of scheduled automations and their execution history.
 *
 * @module @const-ai/host-apiproxy/api/automations
 */

import type { RpcRequest, RpcResponse } from './rpc.ts'

/** Supported schedule trigger frequencies. */
export type AutomationScheduleKind =
  | 'hourly'
  | 'daily'
  | 'weekdays'
  | 'weekly'
  | 'monthly'
  | 'custom'

/** Structured recurrence schedule definition for an automation item. */
export interface AutomationSchedule {
  kind: AutomationScheduleKind
  time?: string
  dayOfWeek?: number
  dayOfMonth?: number
  cron?: string
  intervalMinutes?: number
  intervalSeconds?: number
}

/** Configured scheduled automation task record. */
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

/** Historical record of an automation execution run. */
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

/** Automations RPC API surface. */
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
