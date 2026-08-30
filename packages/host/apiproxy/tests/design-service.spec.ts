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

    it('loads full detail for an existing design system with preview pages', async () => {
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
      expect(system.previewPages).toBeDefined()
      expect(Object.keys(system.previewPages ?? {}).length).toBeGreaterThan(0)
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
    it('indexes and lists all craft standard guidelines', async () => {
      const response = await service.craftGuidelines({
        rpcId: RpcId('req-10'),
        payload: {},
      })

      expect(response.result.ok).toBe(true)
      if (!response.result.ok) return

      const { guidelines } = response.result.value
      expect(guidelines.length).toBeGreaterThanOrEqual(10)
      const antiSlop = guidelines.find(g => g.id === 'anti-ai-slop')
      expect(antiSlop).toBeDefined()
      expect(antiSlop?.title).toBeDefined()
      expect(antiSlop?.summary.length).toBeGreaterThan(0)
    })

    it('filters craft guidelines by search term', async () => {
      const response = await service.craftGuidelines({
        rpcId: RpcId('req-11'),
        payload: { search: 'typography' },
      })

      expect(response.result.ok).toBe(true)
      if (!response.result.ok) return

      const { guidelines } = response.result.value
      expect(guidelines.length).toBeGreaterThan(0)
      for (const g of guidelines) {
        expect(g.id.includes('typography') || g.title.toLowerCase().includes('typography') || g.summary.toLowerCase().includes('typography')).toBe(true)
      }
    })

    it('loads craft standard guideline by ID', async () => {
      const response = await service.craftGuideline({
        rpcId: RpcId('req-12'),
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
        rpcId: RpcId('req-13'),
        payload: { id: 'anti-ai-slop.md' },
      })

      expect(response.result.ok).toBe(true)
      if (!response.result.ok) return

      const { guideline } = response.result.value
      expect(guideline.id).toBe('anti-ai-slop')
    })

    it('returns craft-guideline-not-found error for missing guideline', async () => {
      const response = await service.craftGuideline({
        rpcId: RpcId('req-14'),
        payload: { id: 'missing-craft-guideline' },
      })

      expect(response.result.ok).toBe(false)
      if (response.result.ok) return

      expect(response.result.error.code).toBe('craft-guideline-not-found')
      expect(response.result.error.details).toEqual({ id: 'missing-craft-guideline' })
    })
  })

  describe('Prompt Templates', () => {
    it('indexes and lists all image and video prompt templates', async () => {
      const response = await service.promptTemplates({
        rpcId: RpcId('req-15'),
        payload: {},
      })

      expect(response.result.ok).toBe(true)
      if (!response.result.ok) return

      const { templates, categories, surfaces } = response.result.value
      expect(templates.length).toBeGreaterThanOrEqual(100)
      expect(categories.length).toBeGreaterThan(0)
      expect(surfaces).toContain('image')
      expect(surfaces).toContain('video')
    })

    it('filters prompt templates by surface', async () => {
      const imgResponse = await service.promptTemplates({
        rpcId: RpcId('req-16'),
        payload: { surface: 'image' },
      })

      expect(imgResponse.result.ok).toBe(true)
      if (!imgResponse.result.ok) return

      const { templates: imgTemplates } = imgResponse.result.value
      expect(imgTemplates.length).toBeGreaterThan(0)
      for (const t of imgTemplates) {
        expect(t.surface).toBe('image')
      }

      const vidResponse = await service.promptTemplates({
        rpcId: RpcId('req-17'),
        payload: { surface: 'video' },
      })

      expect(vidResponse.result.ok).toBe(true)
      if (!vidResponse.result.ok) return

      const { templates: vidTemplates } = vidResponse.result.value
      expect(vidTemplates.length).toBeGreaterThan(0)
      for (const t of vidTemplates) {
        expect(t.surface).toBe('video')
      }
    })

    it('filters prompt templates by search term', async () => {
      const response = await service.promptTemplates({
        rpcId: RpcId('req-18'),
        payload: { search: 'hyperframes' },
      })

      expect(response.result.ok).toBe(true)
      if (!response.result.ok) return

      const { templates } = response.result.value
      expect(templates.length).toBeGreaterThan(0)
      for (const t of templates) {
        expect(
          t.id.toLowerCase().includes('hyperframes')
          || t.title.toLowerCase().includes('hyperframes')
          || t.summary.toLowerCase().includes('hyperframes')
          || t.tags.some(tag => tag.toLowerCase().includes('hyperframes')),
        ).toBe(true)
      }
    })

    it('loads image prompt template detail with structured prompt', async () => {
      const response = await service.promptTemplateDetail({
        rpcId: RpcId('req-19'),
        payload: { id: '3d-stone-staircase-evolution-infographic' },
      })

      expect(response.result.ok).toBe(true)
      if (!response.result.ok) return

      const { template } = response.result.value
      expect(template.id).toBe('3d-stone-staircase-evolution-infographic')
      expect(template.surface).toBe('image')
      expect(template.prompt.length).toBeGreaterThan(50)
      expect(template.previewImageUrl).toBeDefined()
    })

    it('loads video prompt template detail with prompt blueprint', async () => {
      const response = await service.promptTemplateDetail({
        rpcId: RpcId('req-20'),
        payload: { id: 'hyperframes-saas-product-promo-30s' },
      })

      expect(response.result.ok).toBe(true)
      if (!response.result.ok) return

      const { template } = response.result.value
      expect(template.id).toBe('hyperframes-saas-product-promo-30s')
      expect(template.surface).toBe('video')
      expect(template.prompt).toContain('HyperFrames')
      expect(template.aspect).toBe('16:9')
    })

    it('returns prompt-template-not-found error for non-existent template', async () => {
      const response = await service.promptTemplateDetail({
        rpcId: RpcId('req-21'),
        payload: { id: 'missing-prompt-template-xyz' },
      })

      expect(response.result.ok).toBe(false)
      if (response.result.ok) return

      expect(response.result.error.code).toBe('prompt-template-not-found')
      expect(response.result.error.details).toEqual({ id: 'missing-prompt-template-xyz' })
    })
  })
})
