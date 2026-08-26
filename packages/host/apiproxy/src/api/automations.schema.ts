/**
 * automations domain zod schemas.
 *
 * @module @const-ai/host-apiproxy/api/automations.schema
 */

import { z } from 'zod'
import type { Wire } from './rpc.schema.ts'
import type { RequestPayload, ResponseValue } from './rpc-map.ts'
import type { AutomationItem, AutomationRunHistory, AutomationSchedule } from './automations.ts'

/** Wire validation schema for automation schedules. */
export const automationScheduleSchema = z.object({
  kind: z.enum(['hourly', 'daily', 'weekdays', 'weekly', 'monthly', 'custom']),
  time: z.string().optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  cron: z.string().optional(),
  intervalMinutes: z.number().positive().optional(),
  intervalSeconds: z.number().positive().optional(),
}) as unknown as z.ZodType<Wire<AutomationSchedule>>

/** Wire validation schema for automation items. */
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

/** Wire validation schema for automation run history entries. */
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

/** Wire schema for automation.list request payload. */
export const automationListRequestSchema = z.object({}) as unknown as z.ZodType<Wire<RequestPayload<'automation.list'>>>

/** Wire schema for automation.create request payload. */
export const automationCreateRequestSchema = z.object({
  title: z.string().min(1),
  instructions: z.string().min(1),
  schedule: automationScheduleSchema,
  workspaceId: z.string().optional(),
  permissionPreset: z.enum(['read-only', 'workspace-write', 'danger-full-access']).optional(),
  model: z.string().optional(),
}) as unknown as z.ZodType<Wire<RequestPayload<'automation.create'>>>

/** Wire schema for automation.update request payload. */
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

/** Wire schema for automation.delete request payload. */
export const automationDeleteRequestSchema = z.object({
  id: z.string().min(1),
}) as unknown as z.ZodType<Wire<RequestPayload<'automation.delete'>>>

/** Wire schema for automation.run request payload. */
export const automationRunRequestSchema = z.object({
  id: z.string().min(1),
}) as unknown as z.ZodType<Wire<RequestPayload<'automation.run'>>>

/** Wire schema for automation.history request payload. */
export const automationHistoryRequestSchema = z.object({
  automationId: z.string().optional(),
}) as unknown as z.ZodType<Wire<RequestPayload<'automation.history'>>>

/** Wire schema for automation.deleteRun request payload. */
export const automationDeleteRunRequestSchema = z.object({
  id: z.string().min(1),
}) as unknown as z.ZodType<Wire<RequestPayload<'automation.deleteRun'>>>

// ---- Value (Response) Schemas ----

/** Wire schema for automation.list response value. */
export const automationListValueSchema = z.object({
  items: z.array(automationItemSchema),
}) as unknown as z.ZodType<Wire<ResponseValue<'automation.list'>>>

/** Wire schema for automation.create response value. */
export const automationCreateValueSchema = z.object({
  item: automationItemSchema,
}) as unknown as z.ZodType<Wire<ResponseValue<'automation.create'>>>

/** Wire schema for automation.update response value. */
export const automationUpdateValueSchema = z.object({
  item: automationItemSchema,
}) as unknown as z.ZodType<Wire<ResponseValue<'automation.update'>>>

/** Wire schema for automation.delete response value. */
export const automationDeleteValueSchema = z.object({
  deleted: z.boolean(),
}) as unknown as z.ZodType<Wire<ResponseValue<'automation.delete'>>>

/** Wire schema for automation.run response value. */
export const automationRunValueSchema = z.object({
  success: z.boolean(),
  sessionId: z.string().optional(),
  error: z.string().optional(),
}) as unknown as z.ZodType<Wire<ResponseValue<'automation.run'>>>

/** Wire schema for automation.history response value. */
export const automationHistoryValueSchema = z.object({
  items: z.array(automationRunHistorySchema),
}) as unknown as z.ZodType<Wire<ResponseValue<'automation.history'>>>

/** Wire schema for automation.deleteRun response value. */
export const automationDeleteRunValueSchema = z.object({
  deleted: z.boolean(),
}) as unknown as z.ZodType<Wire<ResponseValue<'automation.deleteRun'>>>
