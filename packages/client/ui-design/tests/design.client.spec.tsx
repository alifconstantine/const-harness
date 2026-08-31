// @vitest-environment jsdom
import { Context } from '@const-ai/cordis'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { SlotRegistry } from '@const-ai/client-runtime/client'

afterEach(cleanup)
import { apply, inject } from '../src/client/index.ts'
import { apply as nodeApply } from '../src/index.ts'
import { DesignHome } from '../src/client/DesignHome.tsx'
import { FigmaImportModal } from '../src/client/FigmaImportModal.tsx'
import { PluginPickerPopover } from '../src/client/PluginPickerPopover.tsx'
import { DesignSystemPickerPopover } from '../src/client/DesignSystemPickerPopover.tsx'
import type { DesignSystemSummary, PromptTemplateSummary } from '@const-ai/host-apiproxy/api'

describe('ui-design client plugin', () => {
  it('declares expected inject services', () => {
    expect(inject).toEqual(['slots', 'connection', 'sessions', 'workspaces'])
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

    expect(slots.entries('shell.overlay').some(e => e.options.id === 'design')).toBe(true)

    await fiber.dispose()
    expect(slots.entries('shell.overlay').some(e => e.options.id === 'design')).toBe(false)
  })
})

describe('FigmaImportModal component', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<FigmaImportModal isOpen={false} onClose={() => {}} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders modal when open and switches tabs', () => {
    const onClose = vi.fn()
    const onImportMock = vi.fn()
    render(<FigmaImportModal isOpen={true} onClose={onClose} onImportMock={onImportMock} />)

    expect(screen.getByText('Import from Figma')).toBeDefined()
    expect(screen.getByText('Upload .fig')).toBeDefined()
    expect(screen.getByText('Figma URL')).toBeDefined()

    // Switch tab to Figma URL
    fireEvent.click(screen.getByText('Figma URL'))
    expect(screen.getByPlaceholderText('https://www.figma.com/design/...')).toBeDefined()

    // Submit mock build
    fireEvent.click(screen.getByText('Import & build'))
    expect(onImportMock).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })
})

describe('PluginPickerPopover component', () => {
  const dummyTemplates: PromptTemplateSummary[] = [
    {
      id: 'lego-animation',
      surface: 'video',
      title: '3D Lego Animation',
      summary: 'A multi-shot video prompt in 3D style assembling legos',
      category: 'Animation',
      tags: ['lego', '3d'],
      model: 'hyperframes',
      aspect: '16:9',
    },
  ]

  it('filters plugins and allows selection', () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()
    render(
      <PluginPickerPopover
        isOpen={true}
        onClose={onClose}
        onSelectPlugin={onSelect}
        templates={dummyTemplates}
      />,
    )

    expect(screen.getAllByText('3D Lego Animation').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByText('Use Plugin (@lego-animation)'))
    expect(onSelect).toHaveBeenCalledWith(dummyTemplates[0])
    expect(onClose).toHaveBeenCalled()
  })
})

describe('DesignSystemPickerPopover component', () => {
  const dummySystems: DesignSystemSummary[] = [
    {
      id: 'neutral-modern',
      name: 'Neutral Modern',
      category: 'General',
      description: 'Clean modern sans-serif aesthetic',
      tags: ['clean'],
      suggestedCraft: ['typography'],
      previewColors: ['#18181b', '#3b82f6'],
      hasTailwind: true,
    },
  ]

  it('renders No design system default and official presets', () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()
    render(
      <DesignSystemPickerPopover
        isOpen={true}
        onClose={onClose}
        selectedId={null}
        onSelect={onSelect}
        systems={dummySystems}
      />,
    )

    expect(screen.getAllByText('No design system').length).toBeGreaterThan(0)
    expect(screen.getByText('Neutral Modern')).toBeDefined()

    // Select Neutral Modern
    fireEvent.click(screen.getByText('Neutral Modern'))
    fireEvent.click(screen.getByText('Use Neutral Modern'))
    expect(onSelect).toHaveBeenCalledWith('neutral-modern', 'Neutral Modern')
    expect(onClose).toHaveBeenCalled()
  })
})

describe('DesignHome component', () => {
  it('renders brand title, mode chips, and handles prompt input and template clicks', () => {
    const onStartSession = vi.fn()
    render(<DesignHome onStartSession={onStartSession} />)

    // Check Const Design title & logo
    expect(screen.getByText('Const Design')).toBeDefined()

    // Check surface mode buttons
    expect(screen.getAllByText('Prototype').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Slide deck').length).toBeGreaterThan(0)

    // Check interaction mode toggle
    expect(screen.getAllByText('Design').length).toBeGreaterThan(0)

    // Check bottom dock shows workspace & design system controls
    expect(screen.getByText('Outside project')).toBeDefined()
    expect(screen.getByText('No design system')).toBeDefined()

    // Check template card click fills prompt
    const kanbanCards = screen.getAllByText('Kanban Board')
    expect(kanbanCards.length).toBeGreaterThan(0)
    fireEvent.click(kanbanCards[0]!)

    // Check textarea is filled
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    expect(textarea.value).toContain('Kanban')

    // Click send
    const sendBtn = screen.getByLabelText('Send prompt')
    fireEvent.click(sendBtn)

    expect(onStartSession).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('Kanban') as unknown,
        mode: 'prototype',
        interaction: 'design',
      }),
    )
  })

  it('supports workspace picker dropdown with add project and outside project options', async () => {
    const pickDirectory = vi.fn().mockResolvedValue('/home/user/my-project')
    const create = vi.fn().mockResolvedValue({ workspaceId: 'ws-new', title: 'My Project', path: '/home/user/my-project' })
    const mockCtx = {
      workspaces: {
        list: {
          getSnapshot: () => ({ items: [{ workspaceId: 'ws-1', title: 'Existing Project', path: '/path/1' }] }),
          subscribe: vi.fn().mockReturnValue(() => {}),
        },
        pickDirectory,
        create,
      },
    } as never

    render(<DesignHome onStartSession={() => {}} ctx={mockCtx} />)

    // Initially selected from mockCtx
    expect(screen.getByText('Existing Project')).toBeDefined()

    // Open project dropdown
    fireEvent.click(screen.getByText('Existing Project'))

    // Check options exist in dropdown
    expect(screen.getByText('+ Add project')).toBeDefined()
    expect(screen.getByText('Outside project')).toBeDefined()

    // Click + Add project
    fireEvent.click(screen.getByText('+ Add project'))
    expect(pickDirectory).toHaveBeenCalled()
  })
})
