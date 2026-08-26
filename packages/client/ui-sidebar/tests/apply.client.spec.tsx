/** Sidebar shell slot registration and its plain runtime/layout callbacks. */
import { Context } from '@const-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { SlotRegistry } from '@const-ai/client-runtime/client'
import { LocaleRuntime } from '@const-ai/client-locale/client'
import { apply, inject } from '@const-ai/client-ui-sidebar/client'
import type { SidebarRootInjected } from '@const-ai/client-ui-sidebar/client'

async function bench(declare = true) {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  const layout = { toggleSidebar: vi.fn() }
  const workspaces = { startSession: vi.fn(), openPath: vi.fn() }
  const sessions = { open: vi.fn(), clear: vi.fn(), search: vi.fn().mockResolvedValue({ ok: true, value: [] }) }
  ctx.provide('layout', layout)
  ctx.provide('sessions', sessions as never)
  ctx.provide('workspaces', workspaces as never)
  ctx.provide('locale', new LocaleRuntime(ctx))
  const slots = ctx.get('slots') as SlotRegistry
  if (declare) {
    slots.register(
      { name: 'root', children: { 'sidebar': { kind: 'single', scope: 'root' } } } as never,
      () => null,
    )
  }
  return { ctx, slots, layout, workspaces, sessions }
}

describe('ui-sidebar apply', () => {
  it('declares only the services it uses', () => {
    expect(inject).toEqual(['slots', 'layout', 'sessions', 'workspaces', 'locale'])
  })

  it('registers the shell and declares its child seats', async () => {
    const b = await bench()
    await b.ctx.plugin({ inject: [...inject], apply }).await()
    expect(b.slots.entries('sidebar')).toHaveLength(1)
    expect(b.slots.spec('sidebar.workspaces')).toEqual({ kind: 'single', scope: 'root' })
    expect(b.slots.spec('sidebar.settings')).toEqual({ kind: 'single', scope: 'root' })
    expect(b.slots.spec('sidebar.footer.action')).toEqual({ kind: 'list', scope: 'root' })
    // Copy rides the standard locale seat, not the inject face.
    expect(b.slots.entries('sidebar')[0]!.locale).toBe('sidebar')
    const injected = (b.slots.entries('sidebar')[0]!.inject as () => SidebarRootInjected)()
    expect(Object.keys(injected)).toEqual(['startSession', 'openSession', 'toggleSidebar', 'openPath', 'searchSessions'])
    // Both arms delegate to the runtime's shared New Session action.
    injected.startSession('workspace' as never)
    expect(b.workspaces.startSession).toHaveBeenCalledWith('workspace')
    injected.startSession()
    expect(b.workspaces.startSession).toHaveBeenLastCalledWith()
    injected.openSession('s1' as never)
    expect(b.sessions.open).toHaveBeenCalledWith('s1')
    injected.toggleSidebar()
    expect(b.layout.toggleSidebar).toHaveBeenCalledOnce()
    await injected.openPath?.('test-path')
    expect(b.workspaces.openPath).toHaveBeenCalledWith('test-path')
    await injected.searchSessions?.('query')
    expect(b.sessions.search).toHaveBeenCalledWith('query', expect.any(Object))
  })

  it('fails when no live owner declared the sidebar slot', async () => {
    const b = await bench(false)
    await expect(b.ctx.plugin({ inject: [...inject], apply })).rejects.toThrow(/not declared/)
  })

  it('removes the entry and child declaration on teardown', async () => {
    const b = await bench()
    const fiber = b.ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    await fiber.dispose()
    expect(b.slots.entries('sidebar')).toHaveLength(0)
    expect(b.slots.spec('sidebar.workspaces')).toBeUndefined()
    expect(b.slots.spec('sidebar.footer.action')).toBeUndefined()
  })
})
