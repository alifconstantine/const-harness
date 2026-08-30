import { describe, expect, it } from 'vitest'
import { RpcId } from '../src/api/rpc.ts'
import { DesignService } from '../src/design-service.ts'
import {
  ANTI_AI_SLOP_RULES,
  CANONICAL_DIRECTIONS,
  DECK_FRAMEWORK_DIRECTIVE,
  DECK_SKELETON_HTML,
  DesignPromptInjector,
  LIVE_TWEAKS_DIRECTIVE,
} from '../src/design-prompt-injector.ts'

describe('DesignPromptInjector & Prompt Engine', () => {
  const service = new DesignService()

  describe('Core Charter & Default Assembly', () => {
    it('compiles a default general system prompt when no options are supplied', () => {
      const result = DesignPromptInjector.inject({})

      expect(result.systemPrompt).toContain('OpenDesign Senior Designer Charter')
      expect(result.systemPrompt).toContain('Instruction Priority')
      expect(result.systemPrompt).toContain(ANTI_AI_SLOP_RULES)
      expect(result.systemPrompt).toContain('Visual Direction Selection (Zero-Brand Default)')
      expect(result.systemPrompt).toContain('editorial-monocle')
      expect(result.systemPrompt).toContain('modern-minimal')
      expect(result.systemPrompt).toContain('Output Delivery Contract')
      expect(result.metadata.mode).toBe('general')
      expect(result.metadata.locale).toBe('en')
      expect(result.injectedCraftRules).toEqual([])
    })

    it('supports Chinese locale override', () => {
      const result = DesignPromptInjector.inject({ locale: 'zh-CN' })

      expect(result.systemPrompt).toContain('OpenDesign 专家设计宪章')
      expect(result.systemPrompt).toContain('UI & Content Language Override')
      expect(result.systemPrompt).toContain('Simplified Chinese')
      expect(result.metadata.locale).toBe('zh-CN')
    })

    it('supports Indonesian locale override', () => {
      const result = DesignPromptInjector.inject({ locale: 'id' })

      expect(result.systemPrompt).toContain('Piagam Desain Utama OpenDesign')
      expect(result.systemPrompt).toContain('UI & Content Language Override')
      expect(result.systemPrompt).toContain('Indonesian')
      expect(result.metadata.locale).toBe('id')
    })
  })

  describe('Active Brand Design System Injection', () => {
    it('injects active brand tokens and design markdown', () => {
      const result = DesignPromptInjector.inject({
        designSystem: {
          id: 'custom-brand',
          name: 'Custom Brand',
          category: 'SaaS',
          description: 'A custom brand system',
          manifest: { name: 'Custom Brand' },
          designMarkdown: '# Custom Brand Visual Rules\nUse custom typography.',
          tokensCss: ':root { --accent: #ff0055; --bg: #ffffff; }',
        },
      })

      expect(result.systemPrompt).toContain('## Active Design System — Custom Brand')
      expect(result.systemPrompt).toContain('Use custom typography.')
      expect(result.systemPrompt).toContain(':root { --accent: #ff0055; --bg: #ffffff; }')
      expect(result.tokensCss).toBe(':root { --accent: #ff0055; --bg: #ffffff; }')
      expect(result.designMarkdown).toContain('Custom Brand Visual Rules')
      // Fallback directions should NOT be present when active design system is provided
      expect(result.systemPrompt).not.toContain('Visual Direction Selection (Zero-Brand Default)')
    })
  })

  describe('Fixed 16:9 Slide Deck Framework', () => {
    it('injects 16:9 slide framework and skeleton in deck mode', () => {
      const result = DesignPromptInjector.inject({ mode: 'deck' })

      expect(result.systemPrompt).toContain(DECK_FRAMEWORK_DIRECTIVE)
      expect(result.systemPrompt).toContain('1920×1080 fixed canvas')
      expect(result.systemPrompt).toContain('.slide:not(.active) { display: none !important; }')
      expect(result.systemPrompt).toContain(':where(.slide.active) { display: flex; flex-direction: column; }')
      expect(result.systemPrompt).toContain('@media print')
      expect(result.systemPrompt).toContain('@page { size: 1920px 1080px; margin: 0; }')
      expect(result.systemPrompt).toContain('Data Chart Discipline')
      expect(result.systemPrompt).toContain('Mermaid Diagram Theme Discipline')
      expect(result.systemPrompt).toContain('pitch-deck.html')
      expect(result.metadata.mode).toBe('deck')
    })

    it('injects slide skeleton when includeSlideSkeleton is explicitly true', () => {
      const result = DesignPromptInjector.inject({ includeSlideSkeleton: true })

      expect(result.systemPrompt).toContain(DECK_FRAMEWORK_DIRECTIVE)
    })
  })

  describe('Live Dashboard & Tweaks Parameter Directive', () => {
    it('injects live tweaks schema in dashboard mode', () => {
      const result = DesignPromptInjector.inject({ mode: 'dashboard' })

      expect(result.systemPrompt).toContain(LIVE_TWEAKS_DIRECTIVE)
      expect(result.systemPrompt).toContain('<script type="application/json" id="data-schema">')
      expect(result.metadata.mode).toBe('dashboard')
    })

    it('injects live tweaks schema when includeLiveTweaksSchema is true', () => {
      const result = DesignPromptInjector.inject({ includeLiveTweaksSchema: true })

      expect(result.systemPrompt).toContain(LIVE_TWEAKS_DIRECTIVE)
    })
  })

  describe('Surface Modes (Prototype, Document, HyperFrames)', () => {
    it('injects prototype directive in prototype mode', () => {
      const result = DesignPromptInjector.inject({ mode: 'prototype' })

      expect(result.systemPrompt).toContain('Web / Application Prototype Directive')
      expect(result.systemPrompt).toContain('Flexbox and Grid')
      expect(result.metadata.mode).toBe('prototype')
    })

    it('injects document directive in document mode', () => {
      const result = DesignPromptInjector.inject({ mode: 'document' })

      expect(result.systemPrompt).toContain('Editorial Document Directive')
      expect(result.systemPrompt).toContain('typographic hierarchy and page-break definitions')
      expect(result.metadata.mode).toBe('document')
    })

    it('injects hyperframes directive in hyperframes mode', () => {
      const result = DesignPromptInjector.inject({ mode: 'hyperframes' })

      expect(result.systemPrompt).toContain('HyperFrames Motion Directive')
      expect(result.systemPrompt).toContain('60fps CSS / GSAP timeline animations')
      expect(result.metadata.mode).toBe('hyperframes')
    })
  })

  describe('Custom Instructions & Starter Templates', () => {
    it('injects custom instructions and template guidance', () => {
      const result = DesignPromptInjector.inject({
        customInstructions: 'Must use 3-column layout and dark theme only.',
        template: {
          id: 'tpl-1',
          title: 'Fintech Dashboard Template',
          category: 'dashboard',
          description: 'A fintech trading dashboard starter.',
          starterHtml: '<div>Starter</div>',
          config: {},
        },
      })

      expect(result.systemPrompt).toContain('## Custom Project Instructions')
      expect(result.systemPrompt).toContain('Must use 3-column layout and dark theme only.')
      expect(result.systemPrompt).toContain('## Active Starter Template: Fintech Dashboard Template')
      expect(result.systemPrompt).toContain('A fintech trading dashboard starter.')
    })
  })

  describe('Craft Guidelines Injection', () => {
    it('provides exportable constants for canonical directions and skeletons', () => {
      expect(CANONICAL_DIRECTIONS.length).toBe(5)
      expect(DECK_SKELETON_HTML).toContain('<!doctype html>')
    })

    it('injects multiple craft guidelines and tracks their IDs', () => {
      const result = DesignPromptInjector.inject({
        craftGuidelines: [
          {
            id: 'anti-ai-slop',
            title: 'Anti-AI-slop rules',
            content: '# Anti-AI-slop\nNo purple gradients.',
            category: 'Craft Rules',
          },
          {
            id: 'typography',
            title: 'Typography discipline',
            content: '# Typography\nUse display vs body contrast.',
            category: 'Craft Rules',
          },
        ],
      })

      expect(result.injectedCraftRules).toEqual(['anti-ai-slop', 'typography'])
      expect(result.systemPrompt).toContain('## Universal Craft Guidelines')
      expect(result.systemPrompt).toContain('### Craft Rule: Anti-AI-slop rules')
      expect(result.systemPrompt).toContain('No purple gradients.')
      expect(result.systemPrompt).toContain('### Craft Rule: Typography discipline')
    })
  })

  describe('DesignService.composePrompt Integration', () => {
    it('automatically resolves brand design system by ID from bundled assets', async () => {
      const res = await service.composePrompt({
        rpcId: RpcId('compose-1'),
        payload: {
          designSystemId: 'linear-app',
          mode: 'prototype',
        },
      })

      expect(res.result.ok).toBe(true)
      if (!res.result.ok) return
      const result = res.result.value

      expect(result.tokensCss).toBeDefined()
      expect(result.tokensCss).toContain(':root')
      expect(result.designMarkdown).toBeDefined()
      expect(result.systemPrompt).toContain('Linear')
      expect(result.systemPrompt).toContain(result.tokensCss ?? '')
      expect(result.metadata.designSystemId).toBe('linear-app')
      expect(result.metadata.mode).toBe('prototype')
    })

    it('automatically resolves template by ID and loads craft guidelines', async () => {
      const res = await service.composePrompt({
        rpcId: RpcId('compose-2'),
        payload: {
          templateId: 'html-ppt-pitch-deck',
          mode: 'deck',
        },
      })

      expect(res.result.ok).toBe(true)
      if (!res.result.ok) return
      const result = res.result.value

      expect(result.systemPrompt).toContain('Pitch')
      expect(result.systemPrompt).toContain(DECK_FRAMEWORK_DIRECTIVE)
      expect(result.injectedCraftRules.length).toBeGreaterThan(0)
      expect(result.injectedCraftRules).toContain('anti-ai-slop')
      expect(result.injectedCraftRules).toContain('typography')
    })

    it('handles non-existent design system gracefully by falling back to canonical directions', async () => {
      const res = await service.composePrompt({
        rpcId: RpcId('compose-3'),
        payload: {
          designSystemId: 'non-existent-system-xyz',
        },
      })

      expect(res.result.ok).toBe(true)
      if (!res.result.ok) return
      const result = res.result.value

      expect(result.tokensCss).toBeUndefined()
      expect(result.systemPrompt).toContain('Visual Direction Selection (Zero-Brand Default)')
      expect(result.systemPrompt).toContain('modern-minimal')
    })
  })
})
