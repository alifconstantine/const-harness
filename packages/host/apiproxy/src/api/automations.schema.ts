/**
 * automations domain zod schemas.
 *
 * @module @deepseek-ai/dsh-host-apiproxy/api/automations.schema
 */

import { z } from 'zod'
import type { Wire } from './rpc.schema.ts'
import type { RequestPayload, ResponseValue } from './rpc-map.ts'
import type { AutomationItem, AutomationRunHistory, AutomationSchedule } from './automations.ts'

export const automationScheduleSchema = z.object({
  kind: z.enum(['hourly', 'daily', 'weekdays', 'weekly', 'monthly', 'custom']),
  time: z.string().optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  cron: z.string().optional(),
  intervalMinutes: z.number().positive().optional(),
  intervalSeconds: z.number().positive().optional(),
}) as unknown as z.ZodType<Wire<AutomationSchedule>>

export const automationItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  instructions: z.string(),
  schedule: automationScheduleSchema,
  workspaceId: z.string().optional(),
  permissionPreset: z.enum(['read-only', 'workspace-write', 'danger-full-access']),
  model: z.string().optional(),
  enabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastRunAt: z.string().optional(),
  nextRunAt: z.string().optional(),
  runCount: z.number(),
}) as unknown as z.ZodType<Wire<AutomationItem>>

export const automationRunHistorySchema = z.object({
  id: z.string(),
  automationId: z.string(),
  triggeredAt: z.string(),
  source: z.enum(['scheduled', 'manual']),
  status: z.enum(['completed', 'failed', 'in-progress', 'skipped']),
  durationMs: z.number(),
  sessionId: z.string().optional(),
  error: z.string().optional(),
}) as unknown as z.ZodType<Wire<AutomationRunHistory>>

// ---- Request Schemas ----

export const automationListRequestSchema = z.object({}) as unknown as z.ZodType<Wire<RequestPayload<'automation.list'>>>

export const automationCreateRequestSchema = z.object({
  title: z.string().min(1),
  instructions: z.string().min(1),
  schedule: automationScheduleSchema,
  workspaceId: z.string().optional(),
  permissionPreset: z.enum(['read-only', 'workspace-write', 'danger-full-access']).optional(),
  model: z.string().optional(),
}) as unknown as z.ZodType<Wire<RequestPayload<'automation.create'>>>

export const automationUpdateRequestSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).optional(),
  instructions: z.string().min(1).optional(),
  schedule: automationScheduleSchema.optional(),
  workspaceId: z.string().optional(),
  permissionPreset: z.enum(['read-only', 'workspace-write', 'danger-full-access']).optional(),
  model: z.string().optional(),
  enabled: z.boolean().optional(),
}) as unknown as z.ZodType<Wire<RequestPayload<'automation.update'>>>

export const automationDeleteRequestSchema = z.object({
  id: z.string().min(1),
}) as unknown as z.ZodType<Wire<RequestPayload<'automation.delete'>>>

export const automationRunRequestSchema = z.object({
  id: z.string().min(1),
}) as unknown as z.ZodType<Wire<RequestPayload<'automation.run'>>>

export const automationHistoryRequestSchema = z.object({
  automationId: z.string().optional(),
}) as unknown as z.ZodType<Wire<RequestPayload<'automation.history'>>>

export const automationDeleteRunRequestSchema = z.object({
  id: z.string().min(1),
}) as unknown as z.ZodType<Wire<RequestPayload<'automation.deleteRun'>>>

// ---- Value (Response) Schemas ----

export const automationListValueSchema = z.object({
  items: z.array(automationItemSchema),
}) as unknown as z.ZodType<Wire<ResponseValue<'automation.list'>>>

export const automationCreateValueSchema = z.object({
  item: automationItemSchema,
}) as unknown as z.ZodType<Wire<ResponseValue<'automation.create'>>>

export const automationUpdateValueSchema = z.object({
  item: automationItemSchema,
}) as unknown as z.ZodType<Wire<ResponseValue<'automation.update'>>>

export const automationDeleteValueSchema = z.object({
  deleted: z.boolean(),
}) as unknown as z.ZodType<Wire<ResponseValue<'automation.delete'>>>

export const automationRunValueSchema = z.object({
  success: z.boolean(),
  sessionId: z.string().optional(),
  error: z.string().optional(),
}) as unknown as z.ZodType<Wire<ResponseValue<'automation.run'>>>

export const automationHistoryValueSchema = z.object({
  items: z.array(automationRunHistorySchema),
}) as unknown as z.ZodType<Wire<ResponseValue<'automation.history'>>>

export const automationDeleteRunValueSchema = z.object({
  deleted: z.boolean(),
}) as unknown as z.ZodType<Wire<ResponseValue<'automation.deleteRun'>>>
