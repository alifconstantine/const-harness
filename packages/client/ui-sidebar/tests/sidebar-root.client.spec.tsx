// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type {
  SidebarFooterActionOwnerProps, SidebarRootComponentProps, SidebarSectionOwnerProps,
  SidebarSettingsOwnerProps,
} from '../src/client/contract/slots.ts'
import { SidebarRoot } from '../src/client/SidebarRoot.tsx'
import { en } from '../src/client/locales.ts'

// English-dictionary translate stub: the shell renders the same copy the
// assertions below query by accessible name.
const t: SidebarRootComponentProps['t'] = key => (en as Record<string, string>)[key] ?? key

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

// Global hook stubs providing ready session and workspace state
const mockSessions = ((selector: (s: unknown) => unknown) => selector({
  phase: 'ready',
  ids: ['s1', 's2'],
  byId: {
    s1: { id: 's1', displayTitle: 'Evaluasi Plan Implementasi', updatedAt: Date.now() - 10000 },
    s2: { id: 's2', displayTitle: 'Perbandingan ZCode dan DSH', updatedAt: Date.now() - 50000 },
  },
})) as never
const mockWorkspaces = ((selector: (s: unknown) => unknown) => selector({ phase: 'ready', workspaces: [] })) as never

function mountShell({ collapsed = false, width = 300 }: { collapsed?: boolean; width?: number } = {}) {
  const startSession = vi.fn()
  const toggleSidebar = vi.fn()
  let regionOwner: SidebarSectionOwnerProps | undefined
  let settingsOwner: SidebarSettingsOwnerProps | undefined
  let footerActionOwner: SidebarFooterActionOwnerProps | undefined
  let current = { collapsed, width }
  const root = () => (
    <SidebarRoot
      collapsed={current.collapsed} width={current.width}
      useSessions={mockSessions} useWorkspaces={mockWorkspaces}
      startSession={startSession} toggleSidebar={toggleSidebar} t={t}
      renderSlot={((
        key: string,
        owner: SidebarFooterActionOwnerProps | SidebarSectionOwnerProps | SidebarSettingsOwnerProps,
      ) => {
        if (key === 'sidebar.settings') {
          settingsOwner = owner
          return <div data-testid="settings-seat" data-wide={owner.wide} />
        }
        if (key === 'sidebar.footer.action') {
          footerActionOwner = owner
          return <div data-testid="footer-action-seat" data-wide={owner.wide} />
        }
        regionOwner = owner as SidebarSectionOwnerProps
        return <div data-testid="region" data-wide={owner.wide} />
      }) as SidebarRootComponentProps['renderSlot']}
    />
  )
  const view = render(root())
  return {
    startSession,
    toggleSidebar,
    regionOwner: () => {
      if (regionOwner === undefined) throw new Error('region owner not rendered')
      return regionOwner
    },
    settingsOwner: () => {
      if (settingsOwner === undefined) throw new Error('settings owner not rendered')
      return settingsOwner
    },
    footerActionOwner: () => {
      if (footerActionOwner === undefined) throw new Error('footer action owner not rendered')
      return footerActionOwner
    },
    rerender(next: Partial<typeof current>) {
      current = { ...current, ...next }
      view.rerender(root())
    },
  }
}

describe('SidebarRoot shell', () => {
  it('routes New Session (nav item + wordmark) and the column toggle', () => {
    const b = mountShell()
    // Expanded, both the wordmark and the New task nav item start a session.
    fireEvent.click(screen.getByRole('button', { name: 'New session' }))
    fireEvent.click(screen.getByRole('button', { name: 'New task' }))
    expect(b.startSession).toHaveBeenCalledTimes(2)

    // Check presence of other top navigation items
    expect(screen.getByRole('button', { name: 'Search' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Automations' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Plugin Marketplace' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Design' })).toBeTruthy()

    // Check footer Mobile Remote button
    const mobileBtn = screen.getByRole('button', { name: 'Mobile Remote' })
    expect(mobileBtn).toBeTruthy()
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')
    fireEvent.click(mobileBtn)
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'const:open-mobile-remote' }))
    dispatchSpy.mockRestore()

    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }))
    expect(b.toggleSidebar).toHaveBeenCalledOnce()
  })

  it('hands the region its wide flag and clamps expandSidebar to the collapsed state', () => {
    const b = mountShell()
    expect(b.regionOwner().wide).toBe(true)
    // The settings seat rides the same wide flag (ui-settings renders the row).
    expect(b.settingsOwner().wide).toBe(true)
    expect(b.footerActionOwner().wide).toBe(true)
    // Expanded: the request is a no-op (no accidental collapse).
    b.regionOwner().expandSidebar()
    expect(b.toggleSidebar).not.toHaveBeenCalled()
  })

  it('keeps the region mounted through collapse and expands on its request', () => {
    vi.useFakeTimers()
    const b = mountShell()
    b.rerender({ collapsed: true })
    // Wide content survives the crossfade window, then settles into the rail.
    expect(b.regionOwner().wide).toBe(true)
    vi.advanceTimersByTime(200)
    b.rerender({})
    expect(b.regionOwner().wide).toBe(false)
    expect(b.footerActionOwner().wide).toBe(false)
    expect(screen.getByTestId('region')).toBeTruthy()
    b.regionOwner().expandSidebar()
    expect(b.toggleSidebar).toHaveBeenCalledOnce()
  })

  it('renders statically collapsed on a cold start (no crossfade classes)', () => {
    const b = mountShell({ collapsed: true })
    expect(b.regionOwner().wide).toBe(false)
    expect(screen.getByRole('button', { name: 'Open sidebar' })).toBeTruthy()
  })

  it('opens command palette modal, switches tabs, searches tasks, and executes actions', () => {
    mountShell()
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    expect(screen.getByPlaceholderText('Search actions, tasks, or files')).toBeTruthy()
    expect(screen.getByText('Recent tasks')).toBeTruthy()
    expect(screen.getByText('Evaluasi Plan Implementasi')).toBeTruthy()

    // Switch to Actions tab
    fireEvent.click(screen.getByRole('tab', { name: /actions/i }))
    expect(screen.getByText('Open workspace')).toBeTruthy()
    expect(screen.queryByText('Evaluasi Plan Implementasi')).toBeNull()

    // Switch to Tasks tab
    fireEvent.click(screen.getByRole('tab', { name: /tasks/i }))
    expect(screen.getByText('Evaluasi Plan Implementasi')).toBeTruthy()

    // Search query
    const input = screen.getByPlaceholderText('Search actions, tasks, or files')
    fireEvent.change(input, { target: { value: 'Evaluasi' } })
    expect(screen.getByText('Evaluasi')).toBeTruthy()

    // Switch to Actions and execute Open workspace action
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.click(screen.getByRole('tab', { name: /actions/i }))
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')
    fireEvent.click(screen.getByText('Open workspace'))
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'const:open-workspace-picker' }))
    dispatchSpy.mockRestore()
    expect(screen.queryByPlaceholderText('Search actions, tasks, or files')).toBeNull()
  })
})
