import { describe, expect, it } from 'vitest'
import { DesignService } from '../src/design-service.ts'
import { RpcId } from '../src/api/rpc.ts'

describe('DesignService', () => {
  const service = new DesignService()

  describe('Brand Design Systems', () => {
    it('indexes and lists all bundled design systems', async () => {
      const response = await service.systems({
        rpcId: RpcId('req-1'),
        payload: {},
      })

      expect(response.result.ok).toBe(true)
      if (!response.result.ok) return

      const { systems, categories } = response.result.value
      expect(systems.length).toBeGreaterThanOrEqual(150)
      expect(categories.length).toBeGreaterThan(0)
      expect(categories).toContain('Productivity & SaaS')

      const linear = systems.find(s => s.id === 'linear-app')
      expect(linear).toBeDefined()
      expect(linear?.name).toBe('Linear')
      expect(linear?.hasTailwind).toBe(true)
      expect(linear?.previewColors.length).toBeGreaterThan(0)
    })

    it('filters design systems by category', async () => {
      const response = await service.systems({
        rpcId: RpcId('req-2'),
        payload: { category: 'Productivity & SaaS' },
      })

      expect(response.result.ok).toBe(true)
      if (!response.result.ok) return

      const { systems } = response.result.value
      expect(systems.length).toBeGreaterThan(0)
      for (const sys of systems) {
        expect(sys.category.toLowerCase()).toBe('productivity & saas')
      }
    })

    it('filters design systems by search query', async () => {
      const response = await service.systems({
        rpcId: RpcId('req-3'),
        payload: { search: 'stripe' },
      })

      expect(response.result.ok).toBe(true)
      if (!response.result.ok) return

      const { systems } = response.result.value
      expect(systems.length).toBeGreaterThan(0)
      expect(systems.some(s => s.id === 'stripe')).toBe(true)
    })

    it('loads full detail for an existing design system', async () => {
      const response = await service.systemDetail({
        rpcId: RpcId('req-4'),
        payload: { id: 'linear-app' },
      })

      expect(response.result.ok).toBe(true)
      if (!response.result.ok) return

      const { system } = response.result.value
      expect(system.id).toBe('linear-app')
      expect(system.name).toBe('Linear')
      expect(system.designMarkdown).toContain('# Design System')
      expect(system.tokensCss).toContain(':root')
      expect(system.designTokensJson).toBeDefined()
      expect(system.componentsHtml).toBeDefined()
      expect(system.tailwindCss).toBeDefined()
    })

    it('returns design-system-not-found error for non-existent system', async () => {
      const response = await service.systemDetail({
        rpcId: RpcId('req-5'),
        payload: { id: 'does-not-exist-xyz' },
      })

      expect(response.result.ok).toBe(false)
      if (response.result.ok) return

      expect(response.result.error.code).toBe('design-system-not-found')
      expect(response.result.error.details).toEqual({ id: 'does-not-exist-xyz' })
    })
  })

  describe('Starter Design Templates', () => {
    it('indexes and lists all starter templates', async () => {
      const response = await service.templates({
        rpcId: RpcId('req-6'),
        payload: {},
      })

      expect(response.result.ok).toBe(true)
      if (!response.result.ok) return

      const { templates, categories } = response.result.value
      expect(templates.length).toBeGreaterThanOrEqual(100)
      expect(categories.length).toBeGreaterThan(0)

      const pitchDeck = templates.find(t => t.id === 'html-ppt-pitch-deck')
      expect(pitchDeck).toBeDefined()
      expect(pitchDeck?.title).toContain('Pitch')
    })

    it('filters templates by search term', async () => {
      const response = await service.templates({
        rpcId: RpcId('req-7'),
        payload: { search: 'dashboard' },
      })

      expect(response.result.ok).toBe(true)
      if (!response.result.ok) return

      const { templates } = response.result.value
      expect(templates.length).toBeGreaterThan(0)
    })

    it('loads starter template detail with HTML', async () => {
      const response = await service.templateDetail({
        rpcId: RpcId('req-8'),
        payload: { id: 'html-ppt-pitch-deck' },
      })

      expect(response.result.ok).toBe(true)
      if (!response.result.ok) return

      const { template } = response.result.value
      expect(template.id).toBe('html-ppt-pitch-deck')
      expect(template.starterHtml.length).toBeGreaterThan(100)
      expect(template.starterHtml).toContain('<!DOCTYPE html>')
    })

    it('returns design-template-not-found error for non-existent template', async () => {
      const response = await service.templateDetail({
        rpcId: RpcId('req-9'),
        payload: { id: 'non-existent-template-123' },
      })

      expect(response.result.ok).toBe(false)
      if (response.result.ok) return

      expect(response.result.error.code).toBe('design-template-not-found')
      expect(response.result.error.details).toEqual({ id: 'non-existent-template-123' })
    })
  })

  describe('Craft Guidelines', () => {
    it('loads craft standard guideline by ID', async () => {
      const response = await service.craftGuideline({
        rpcId: RpcId('req-10'),
        payload: { id: 'anti-ai-slop' },
      })

      expect(response.result.ok).toBe(true)
      if (!response.result.ok) return

      const { guideline } = response.result.value
      expect(guideline.id).toBe('anti-ai-slop')
      expect(guideline.title).toBeDefined()
      expect(guideline.content.toLowerCase()).toContain('anti-ai-slop')
    })

    it('normalizes .md extension in craft guideline ID', async () => {
      const response = await service.craftGuideline({
        rpcId: RpcId('req-11'),
        payload: { id: 'anti-ai-slop.md' },
      })

      expect(response.result.ok).toBe(true)
      if (!response.result.ok) return

      const { guideline } = response.result.value
      expect(guideline.id).toBe('anti-ai-slop')
    })

    it('returns craft-guideline-not-found error for missing guideline', async () => {
      const response = await service.craftGuideline({
        rpcId: RpcId('req-12'),
        payload: { id: 'missing-craft-guideline' },
      })

      expect(response.result.ok).toBe(false)
      if (response.result.ok) return

      expect(response.result.error.code).toBe('craft-guideline-not-found')
      expect(response.result.error.details).toEqual({ id: 'missing-craft-guideline' })
    })
  })
})
