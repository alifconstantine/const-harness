import { describe, expect, it } from 'vitest'
import {
  automationItemSchema,
  automationCreateRequestSchema,
  automationCreateValueSchema,
  automationRunRequestSchema,
  automationRunValueSchema,
  automationHistoryValueSchema,
} from '../src/api/automations.schema.ts'
import { calculateNextRunAt } from '../src/automations-service.ts'

describe('Automations Zod Schemas', () => {
  it('validates automationItemSchema', () => {
    const item = {
      id: 'auto_1234',
      title: 'Morning Brief',
      instructions: 'Summarize git log',
      schedule: { kind: 'daily' as const, time: '09:00' },
      permissionPreset: 'workspace-write' as const,
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      runCount: 2,
      lastRunAt: new Date().toISOString(),
      nextRunAt: new Date().toISOString(),
    }
    expect(automationItemSchema.parse(item)).toEqual(item)
  })

  it('validates automation.create request and response', () => {
    const req = {
      title: 'Test Task',
      instructions: 'Do tests',
      schedule: { kind: 'weekdays' as const, time: '18:00' },
      permissionPreset: 'read-only' as const,
    }
    expect(automationCreateRequestSchema.parse(req)).toEqual(req)

    const res = {
      item: {
        id: 'auto_5678',
        title: req.title,
        instructions: req.instructions,
        schedule: req.schedule,
        permissionPreset: req.permissionPreset,
        enabled: true,
        createdAt: '2026-08-26T00:00:00.000Z',
        updatedAt: '2026-08-26T00:00:00.000Z',
        runCount: 0,
      },
    }
    expect(automationCreateValueSchema.parse(res)).toEqual(res)
  })

  it('validates automation.run request and response', () => {
    expect(automationRunRequestSchema.parse({ id: 'auto_1' })).toEqual({ id: 'auto_1' })
    expect(automationRunValueSchema.parse({ success: true, sessionId: 'ses-1' })).toEqual({ success: true, sessionId: 'ses-1' })
  })

  it('validates automation.history response', () => {
    const history = {
      items: [
        {
          id: 'run_1',
          automationId: 'auto_1',
          sessionId: 'ses_1',
          triggeredAt: new Date().toISOString(),
          source: 'scheduled' as const,
          status: 'completed' as const,
          durationMs: 1250,
        },
      ],
    }
    expect(automationHistoryValueSchema.parse(history)).toEqual(history)
  })
})

describe('calculateNextRunAt', () => {
  it('calculates next run for daily schedule', () => {
    const base = new Date('2026-08-26T08:00:00.000Z').getTime()
    const next = calculateNextRunAt({ kind: 'daily', time: '09:00' }, base)
    expect(next).toBeDefined()
  })

  it('calculates next run for custom interval', () => {
    const base = new Date('2026-08-26T08:00:00.000Z').getTime()
    const next = calculateNextRunAt({ kind: 'custom', intervalMinutes: 15 }, base)
    expect(next).toBe(new Date(base + 15 * 60 * 1000).toISOString())
  })

  it('calculates next run for monthly schedule on specified day', () => {
    const base = new Date('2026-08-26T08:00:00.000Z').getTime()
    const next = calculateNextRunAt({ kind: 'monthly', dayOfMonth: 1, time: '09:00' }, base)
    const nextDate = new Date(next)
    expect(nextDate.getDate()).toBe(1)
    expect(nextDate.getTime()).toBeGreaterThan(base)
  })

  it('calculates next run for weekdays schedule skipping weekends', () => {
    // 2026-08-28 is a Friday
    const friday = new Date('2026-08-28T18:00:00.000Z').getTime()
    const next = calculateNextRunAt({ kind: 'weekdays', time: '09:00' }, friday)
    const nextDate = new Date(next)
    // Should be Monday (day 1), not Saturday (6) or Sunday (0)
    expect(nextDate.getDay()).toBe(1)
  })

  it('calculates next run for weekly schedule', () => {
    const base = new Date('2026-08-26T08:00:00.000Z').getTime() // Wednesday (3)
    const next = calculateNextRunAt({ kind: 'weekly', dayOfWeek: 5, time: '16:00' }, base) // Friday (5)
    const nextDate = new Date(next)
    expect(nextDate.getDay()).toBe(5)
    expect(nextDate.getTime()).toBeGreaterThan(base)
  })
})
