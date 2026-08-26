/**
 * ui-automations client unit tests.
 */
import { Context } from '@const-ai/cordis'
import { describe, expect, it } from 'vitest'
import { SlotRegistry } from '@const-ai/client-runtime/client'
import { apply, inject } from '../src/client/index.ts'
import { apply as nodeApply } from '../src/index.ts'

describe('ui-automations client plugin', () => {
  it('declares expected inject services', () => {
    expect(inject).toEqual(['slots', 'connection', 'sessions'])
  })

  it('node-half apply is a safe no-op', () => {
    expect(() => { nodeApply() }).not.toThrow()
  })

  it('registers shell.overlay slot entry on browser apply', async () => {
    const ctx = new Context()
    await ctx.plugin(SlotRegistry).await()
    const slots = ctx.get('slots') as SlotRegistry
    slots.register({
      name: 'root',
      children: { 'shell.overlay': { kind: 'ordered' } },
    } as never, () => null)

    const fiber = ctx.plugin({ inject: ['slots'], apply: apply as never })
    await fiber.await()

    expect(slots.entries('shell.overlay').some(e => e.options.id === 'automations')).toBe(true)

    await fiber.dispose()
    expect(slots.entries('shell.overlay').some(e => e.options.id === 'automations')).toBe(false)
  })
})
