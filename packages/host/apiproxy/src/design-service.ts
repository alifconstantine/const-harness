/**
 * Host Design Service: loads and indexes OpenDesign brand design systems,
 * templates, and craft guidelines from bundled assets.
 */

import { readdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type {
  CraftGuideline,
  CraftGuidelineSummary,
  DesignApi,
  DesignSystemDetail,
  DesignSystemSummary,
  DesignTemplateDetail,
  DesignTemplateSummary,
  PromptTemplateDetail,
  PromptTemplateSource,
  PromptTemplateSummary,
} from './api/design.ts'
import type { RpcRequest, RpcResponse } from './api/rpc.ts'
import { RpcId } from './api/rpc.ts'
import {
  DesignPromptInjector,
  type DesignPromptOptions,
  type DesignPromptResult,
} from './design-prompt-injector.ts'

/** DesignService constructor options. */
export interface DesignServiceOptions {
  /** Root directory for assets. Defaults to '../assets' relative to this module. */
  assetsDir?: string
}

/** Error thrown when an entity is not found in the catalog. */
export class DesignNotFoundError extends Error {
  constructor(
    readonly kind: 'system' | 'template' | 'craft' | 'prompt-template',
    readonly id: string,
  ) {
    super(`Design ${kind} not found: ${id}`)
    this.name = 'DesignNotFoundError'
  }
}

/**
 * Service managing bundled design systems, templates, craft rules, and prompt templates.
 */
export class DesignService implements DesignApi {
  private readonly assetsDir: string
  private readonly designSystemsDir: string
  private readonly designTemplatesDir: string
  private readonly craftDir: string
  private readonly promptTemplatesDir: string
  private readonly skillsDir: string
  private readonly atomsDir: string
  private readonly scenariosDir: string
  private readonly communityDir: string
  private readonly examplesDir: string
  private readonly imageTemplatesDir: string
  private readonly videoTemplatesDir: string

  private systemsCache: DesignSystemSummary[] | undefined
  private templatesCache: DesignTemplateSummary[] | undefined
  private craftIndexCache: CraftGuidelineSummary[] | undefined
  private craftCache: Map<string, string> | undefined
  private promptTemplatesCache: PromptTemplateSummary[] | undefined

  constructor(options: DesignServiceOptions = {}) {
    this.assetsDir = options.assetsDir ?? fileURLToPath(new URL('../assets', import.meta.url))
    this.designSystemsDir = join(this.assetsDir, 'design-systems')
    this.designTemplatesDir = join(this.assetsDir, 'design-templates')
    this.craftDir = join(this.assetsDir, 'craft')
    this.promptTemplatesDir = join(this.assetsDir, 'prompt-templates')
    this.skillsDir = join(this.assetsDir, 'skills')
    this.atomsDir = join(this.assetsDir, 'atoms')
    this.scenariosDir = join(this.assetsDir, 'scenarios')
    this.communityDir = join(this.assetsDir, 'community')
    this.examplesDir = join(this.assetsDir, 'examples')
    this.imageTemplatesDir = join(this.assetsDir, 'image-templates')
    this.videoTemplatesDir = join(this.assetsDir, 'video-templates')
  }

  /** Lists all available brand design systems with optional search and category filters. */
  async systems(
    request: RpcRequest<{ category?: string; search?: string }>,
  ): Promise<RpcResponse<{ systems: readonly DesignSystemSummary[]; categories: readonly string[] }>> {
    const allSystems = await this.loadSystemsIndex()
    const { category, search } = request.payload

    let filtered = allSystems
    if (category !== undefined && category.trim() !== '' && category.toLowerCase() !== 'all') {
      const catLower = category.toLowerCase()
      filtered = filtered.filter(s => s.category.toLowerCase() === catLower)
    }

    if (search !== undefined && search.trim() !== '') {
      const q = search.toLowerCase().trim()
      filtered = filtered.filter(s =>
        s.id.toLowerCase().includes(q)
        || s.name.toLowerCase().includes(q)
        || s.description.toLowerCase().includes(q)
        || s.tags.some(t => t.toLowerCase().includes(q)),
      )
    }

    const categories = Array.from(new Set(allSystems.map(s => s.category))).sort((a, b) => a.localeCompare(b))
    return {
      rpcId: request.rpcId,
      result: {
        ok: true,
        value: {
          systems: filtered,
          categories,
        },
      },
    }
  }

  /** Reads the full detail specification for one brand design system. */
  async systemDetail(
    request: RpcRequest<{ id: string }>,
  ): Promise<RpcResponse<{ system: DesignSystemDetail }>> {
    const { id } = request.payload
    const dir = join(this.designSystemsDir, id)

    const manifestRaw = await safeReadText(join(dir, 'manifest.json'))
    if (manifestRaw === undefined) {
      return {
        rpcId: request.rpcId,
        result: {
          ok: false,
          error: {
            code: 'design-system-not-found',
            message: `Design system not found: ${id}`,
            details: { id },
          },
        },
      }
    }

    try {
      const manifest = JSON.parse(manifestRaw) as Record<string, unknown>
      const name = typeof manifest.name === 'string' ? manifest.name : id
      const category = typeof manifest.category === 'string' ? manifest.category : 'General'
      const description = typeof manifest.description === 'string' ? manifest.description : ''

      const designMarkdown = await safeReadText(join(dir, 'DESIGN.md')) ?? ''
      const tokensCss = await safeReadText(join(dir, 'tokens.css')) ?? ''
      const designTokensRaw = await safeReadText(join(dir, 'design-tokens.json'))
      const designTokensJson = designTokensRaw !== undefined
        ? (JSON.parse(designTokensRaw) as Record<string, unknown>)
        : undefined

      const componentsHtml = await safeReadText(join(dir, 'components.html'))
      const tailwindCss = await safeReadText(join(dir, 'tailwind-v4.css'))
      const usageMarkdown = await safeReadText(join(dir, 'USAGE.md'))

      const previewDir = join(dir, 'preview')
      let previewPages: Record<string, string> | undefined
      try {
        const pEntries = await readdir(previewDir, { withFileTypes: true })
        for (const pe of pEntries) {
          if (pe.isFile() && pe.name.endsWith('.html')) {
            const pageContent = await safeReadText(join(previewDir, pe.name))
            if (pageContent !== undefined) {
              previewPages ??= {}
              previewPages[pe.name] = pageContent
            }
          }
        }
      } catch {
        // No preview dir
      }

      return {
        rpcId: request.rpcId,
        result: {
          ok: true,
          value: {
            system: {
              id,
              name,
              category,
              description,
              manifest,
              designMarkdown,
              tokensCss,
              ...designTokensJson !== undefined ? { designTokensJson } : {},
              ...componentsHtml !== undefined ? { componentsHtml } : {},
              ...tailwindCss !== undefined ? { tailwindCss } : {},
              ...usageMarkdown !== undefined ? { usageMarkdown } : {},
              ...previewPages !== undefined ? { previewPages } : {},
            },
          },
        },
      }
    } catch {
      return {
        rpcId: request.rpcId,
        result: {
          ok: false,
          error: {
            code: 'design-system-not-found',
            message: `Design system invalid: ${id}`,
            details: { id },
          },
        },
      }
    }
  }

  /** Lists all starter design templates with optional search and category filters. */
  async templates(
    request: RpcRequest<{ category?: string; search?: string }>,
  ): Promise<RpcResponse<{ templates: readonly DesignTemplateSummary[]; categories: readonly string[] }>> {
    const allTemplates = await this.loadTemplatesIndex()
    const { category, search } = request.payload

    let filtered = allTemplates
    if (category !== undefined && category.trim() !== '' && category.toLowerCase() !== 'all') {
      const catLower = category.toLowerCase()
      filtered = filtered.filter(t => t.category.toLowerCase() === catLower)
    }

    if (search !== undefined && search.trim() !== '') {
      const q = search.toLowerCase().trim()
      filtered = filtered.filter(t =>
        t.id.toLowerCase().includes(q)
        || t.title.toLowerCase().includes(q)
        || t.description.toLowerCase().includes(q)
        || t.tags.some(tag => tag.toLowerCase().includes(q)),
      )
    }

    const categories = Array.from(new Set(allTemplates.map(t => t.category))).sort((a, b) => a.localeCompare(b))
    return {
      rpcId: request.rpcId,
      result: {
        ok: true,
        value: {
          templates: filtered,
          categories,
        },
      },
    }
  }

  /** Reads starter HTML and blueprints for one design template. */
  async templateDetail(
    request: RpcRequest<{ id: string }>,
  ): Promise<RpcResponse<{ template: DesignTemplateDetail }>> {
    const { id } = request.payload
    const dir = join(this.designTemplatesDir, id)

    const skillText = await safeReadText(join(dir, 'SKILL.md'))
    const starterHtml = await safeReadText(join(dir, 'example.html'))
      ?? await safeReadText(join(dir, 'assets', 'template.html'))
      ?? await safeReadText(join(dir, 'index.html'))

    if (skillText === undefined && starterHtml === undefined) {
      return {
        rpcId: request.rpcId,
        result: {
          ok: false,
          error: {
            code: 'design-template-not-found',
            message: `Design template not found: ${id}`,
            details: { id },
          },
        },
      }
    }

    try {
      const frontmatter = skillText !== undefined ? parseSimpleFrontmatter(skillText) : {}

      const title = (frontmatter.en_name as string | undefined)
        ?? (frontmatter.title as string | undefined)
        ?? (frontmatter.name as string | undefined)
        ?? id
      const category = (frontmatter.category as string | undefined) ?? 'templates'
      const description = (frontmatter.description as string | undefined) ?? ''

      const stylesCss = await safeReadText(join(dir, 'assets', 'styles.css'))
      const scriptsJs = await safeReadText(join(dir, 'assets', 'runtime.js'))

      return {
        rpcId: request.rpcId,
        result: {
          ok: true,
          value: {
            template: {
              id,
              title,
              category,
              description,
              starterHtml: starterHtml ?? '',
              ...stylesCss !== undefined ? { stylesCss } : {},
              ...scriptsJs !== undefined ? { scriptsJs } : {},
              config: frontmatter,
            },
          },
        },
      }
    } catch {
      return {
        rpcId: request.rpcId,
        result: {
          ok: false,
          error: {
            code: 'design-template-not-found',
            message: `Design template invalid: ${id}`,
            details: { id },
          },
        },
      }
    }
  }

  /** Lists all available craft standard guidelines with optional search filter. */
  async craftGuidelines(
    request: RpcRequest<{ search?: string }>,
  ): Promise<RpcResponse<{ guidelines: readonly CraftGuidelineSummary[] }>> {
    const all = await this.loadCraftIndex()
    const { search } = request.payload

    let filtered = all
    if (search !== undefined && search.trim() !== '') {
      const q = search.toLowerCase().trim()
      filtered = filtered.filter(g =>
        g.id.toLowerCase().includes(q)
        || g.title.toLowerCase().includes(q)
        || g.summary.toLowerCase().includes(q),
      )
    }

    return {
      rpcId: request.rpcId,
      result: {
        ok: true,
        value: {
          guidelines: filtered,
        },
      },
    }
  }

  /** Reads one design craft standard guideline. */
  async craftGuideline(
    request: RpcRequest<{ id: string }>,
  ): Promise<RpcResponse<{ guideline: CraftGuideline }>> {
    const { id } = request.payload
    const normalizedId = id.endsWith('.md') ? id.slice(0, -3) : id
    const filePath = join(this.craftDir, `${normalizedId}.md`)

    this.craftCache ??= new Map<string, string>()
    let content = this.craftCache.get(normalizedId)
    if (content === undefined) {
      content = await safeReadText(filePath)
      if (content === undefined) {
        return {
          rpcId: request.rpcId,
          result: {
            ok: false,
            error: {
              code: 'craft-guideline-not-found',
              message: `Craft guideline not found: ${id}`,
              details: { id },
            },
          },
        }
      }
      this.craftCache.set(normalizedId, content)
    }

    const firstHeading = content.split('\n').find(line => line.startsWith('# '))
    const title = firstHeading !== undefined ? firstHeading.replace(/^#\s+/, '').trim() : normalizedId

    return {
      rpcId: request.rpcId,
      result: {
        ok: true,
        value: {
          guideline: {
            id: normalizedId,
            title,
            content,
            category: 'Craft Rules',
          },
        },
      },
    }
  }

  /** Lists all available image and video prompt templates with filtering. */
  async promptTemplates(
    request: RpcRequest<{ surface?: 'image' | 'video'; category?: string; search?: string }>,
  ): Promise<RpcResponse<{ templates: readonly PromptTemplateSummary[]; categories: readonly string[]; surfaces: readonly string[] }>> {
    const all = await this.loadPromptTemplatesIndex()
    const { surface, category, search } = request.payload

    let filtered = all
    if (surface !== undefined) {
      filtered = filtered.filter(t => t.surface === surface)
    }

    if (category !== undefined && category.trim() !== '' && category.toLowerCase() !== 'all') {
      const catLower = category.toLowerCase()
      filtered = filtered.filter(t => t.category.toLowerCase() === catLower)
    }

    if (search !== undefined && search.trim() !== '') {
      const q = search.toLowerCase().trim()
      filtered = filtered.filter(t =>
        t.id.toLowerCase().includes(q)
        || t.title.toLowerCase().includes(q)
        || t.summary.toLowerCase().includes(q)
        || t.tags.some(tag => tag.toLowerCase().includes(q)),
      )
    }

    const categories = Array.from(new Set(all.map(t => t.category))).sort((a, b) => a.localeCompare(b))
    const surfaces = Array.from(new Set(all.map(t => t.surface))).sort((a, b) => a.localeCompare(b))

    return {
      rpcId: request.rpcId,
      result: {
        ok: true,
        value: {
          templates: filtered,
          categories,
          surfaces,
        },
      },
    }
  }

  /** Reads the full prompt and parameters for one prompt template. */
  async promptTemplateDetail(
    request: RpcRequest<{ id: string }>,
  ): Promise<RpcResponse<{ template: PromptTemplateDetail }>> {
    const { id } = request.payload

    // Check image and video directories
    for (const surface of ['image', 'video'] as const) {
      const filePath = join(this.promptTemplatesDir, surface, `${id}.json`)
      const raw = await safeReadText(filePath)
      if (raw !== undefined) {
        try {
          const data = JSON.parse(raw) as {
            id?: string
            surface?: 'image' | 'video'
            title?: string
            summary?: string
            category?: string
            tags?: string[]
            model?: string
            aspect?: string
            prompt?: string
            previewImageUrl?: string
            previewVideoUrl?: string
            source?: PromptTemplateSource
          }
          return {
            rpcId: request.rpcId,
            result: {
              ok: true,
              value: {
                template: {
                  id: data.id ?? id,
                  surface: data.surface ?? surface,
                  title: cleanPluginTitle(data.title ?? id),
                  summary: cleanPluginTitle(data.summary ?? ''),
                  category: surface === 'image' ? 'Image' : 'Video',
                  tags: Array.isArray(data.tags) ? data.tags : [],
                  model: 'default',
                  aspect: data.aspect ?? '1:1',
                  prompt: data.prompt ?? '',
                  ...data.previewImageUrl !== undefined ? { previewImageUrl: data.previewImageUrl } : {},
                  ...data.previewVideoUrl !== undefined ? { previewVideoUrl: data.previewVideoUrl } : {},
                  ...data.source !== undefined ? { source: data.source } : {},
                },
              },
            },
          }
        } catch {
          // JSON parse failed
        }
      }
    }

    // Check image-templates and video-templates
    for (const [tplDir, sfc] of [[this.imageTemplatesDir, 'image'], [this.videoTemplatesDir, 'video']] as const) {
      const dir = join(tplDir, id)
      const jsonRaw = await safeReadText(join(dir, 'open-design.json'))
      const skillRaw = await safeReadText(join(dir, 'SKILL.md'))
      if (jsonRaw !== undefined || skillRaw !== undefined) {
        let title = id.replace(/-/g, ' ')
        let summary = ''
        let prompt = ''
        if (jsonRaw !== undefined) {
          try {
            const parsed = JSON.parse(jsonRaw) as { title?: string; name?: string; description?: string; prompt?: string; summary?: string }
            title = parsed.title ?? parsed.name ?? title
            summary = parsed.summary ?? parsed.description ?? ''
            prompt = parsed.prompt ?? ''
          } catch {}
        }
        if (skillRaw !== undefined) {
          const fm = parseSimpleFrontmatter(skillRaw)
          title = (fm.name as string) ?? (fm.title as string) ?? title
          summary = (fm.description as string) ?? summary
          if (!prompt) prompt = skillRaw
        }
        return {
          rpcId: request.rpcId,
          result: {
            ok: true,
            value: {
              template: {
                id,
                surface: sfc,
                title: cleanPluginTitle(title),
                summary: cleanPluginTitle(summary),
                category: sfc === 'image' ? 'Image' : 'Video',
                tags: [id, sfc],
                model: 'default',
                aspect: sfc === 'image' ? '1:1' : '16:9',
                prompt,
              },
            },
          },
        }
      }
    }

    // Check skills, atoms, scenarios, community
    for (const [pluginDir, catName] of [
      [this.skillsDir, 'Skills & Tools'],
      [this.atomsDir, 'Atoms'],
      [this.scenariosDir, 'Scenarios'],
      [this.communityDir, 'Community'],
    ] as const) {
      const dir = join(pluginDir, id)
      const skillRaw = await safeReadText(join(dir, 'SKILL.md'))
      const jsonRaw = await safeReadText(join(dir, 'open-design.json'))
      if (skillRaw !== undefined || jsonRaw !== undefined) {
        let title = id.replace(/-/g, ' ')
        let summary = ''
        let declaredCat: string | undefined
        let prompt = skillRaw ?? ''
        if (jsonRaw !== undefined) {
          try {
            const parsed = JSON.parse(jsonRaw) as { title?: string; name?: string; description?: string; prompt?: string; category?: string }
            title = parsed.title ?? parsed.name ?? title
            summary = parsed.description ?? ''
            if (parsed.prompt) prompt = parsed.prompt
            declaredCat = parsed.category
          } catch {}
        }
        if (skillRaw !== undefined) {
          const fm = parseSimpleFrontmatter(skillRaw)
          title = (fm.name as string) ?? (fm.title as string) ?? title
          summary = (fm.description as string) ?? summary
          declaredCat = (fm.category as string) ?? declaredCat
        }
        const category = resolveSkillCategory(id, declaredCat || catName)
        return {
          rpcId: request.rpcId,
          result: {
            ok: true,
            value: {
              template: {
                id,
                surface: 'image',
                title: cleanPluginTitle(title),
                summary: cleanPluginTitle(summary),
                category,
                tags: [id, category.toLowerCase()],
                model: 'default',
                aspect: '1:1',
                prompt,
              },
            },
          },
        }
      }
    }

    return {
      rpcId: request.rpcId,
      result: {
        ok: false,
        error: {
          code: 'prompt-template-not-found',
          message: `Prompt template not found: ${id}`,
          details: { id },
        },
      },
    }
  }

  /** Compiles a complete OpenDesign system prompt using active design assets. */
  async composePrompt(options: DesignPromptOptions): Promise<DesignPromptResult> {
    let designSystem = options.designSystem
    if (designSystem === undefined && options.designSystemId !== undefined) {
      const res = await this.systemDetail({
        rpcId: RpcId('compose-prompt-sys'),
        payload: { id: options.designSystemId },
      })
      if (res.result.ok) {
        designSystem = res.result.value.system
      }
    }

    let template = options.template
    if (template === undefined && options.templateId !== undefined) {
      const res = await this.templateDetail({
        rpcId: RpcId('compose-prompt-tpl'),
        payload: { id: options.templateId },
      })
      if (res.result.ok) {
        template = res.result.value.template
      }
    }

    let craftGuidelines = options.craftGuidelines
    if (craftGuidelines === undefined) {
      const ruleIds = options.craftRuleIds ?? [
        'anti-ai-slop',
        'typography',
        'color',
        'accessibility-baseline',
      ]
      const loaded: CraftGuideline[] = []
      for (const id of ruleIds) {
        const res = await this.craftGuideline({
          rpcId: RpcId('compose-prompt-craft'),
          payload: { id },
        })
        if (res.result.ok) {
          loaded.push(res.result.value.guideline)
        }
      }
      if (loaded.length > 0) {
        craftGuidelines = loaded
      }
    }

    return DesignPromptInjector.inject({
      ...options,
      ...designSystem !== undefined ? { designSystem } : {},
      ...template !== undefined ? { template } : {},
      ...craftGuidelines !== undefined ? { craftGuidelines } : {},
    })
  }

  private async loadCraftIndex(): Promise<CraftGuidelineSummary[]> {
    if (this.craftIndexCache !== undefined) return this.craftIndexCache

    const summaries: CraftGuidelineSummary[] = []
    try {
      const entries = await readdir(this.craftDir, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.md') || entry.name.startsWith('.')) continue
        if (entry.name === 'README.md' || entry.name === 'FUTURE_SECTIONS.md') continue

        const id = entry.name.replace(/\.md$/, '')
        const content = await safeReadText(join(this.craftDir, entry.name))
        if (content === undefined) continue

        const lines = content.split('\n')
        const firstHeading = lines.find(line => line.startsWith('# '))
        const title = firstHeading !== undefined ? firstHeading.replace(/^#\s+/, '').trim() : id

        // Find first non-empty paragraph after heading
        let summary = ''
        for (const line of lines) {
          const trimmed = line.trim()
          if (trimmed !== '' && !trimmed.startsWith('#') && !trimmed.startsWith('>') && !trimmed.startsWith('```')) {
            summary = trimmed
            break
          }
        }

        summaries.push({
          id,
          title,
          summary,
          category: 'Craft Rules',
        })
      }
    } catch {
      // Directory missing
    }

    this.craftIndexCache = summaries.sort((a, b) => a.title.localeCompare(b.title))
    return this.craftIndexCache
  }

  private async loadPromptTemplatesIndex(): Promise<PromptTemplateSummary[]> {
    if (this.promptTemplatesCache !== undefined) return this.promptTemplatesCache

    const map = new Map<string, PromptTemplateSummary>()

    // 1. Load prompt-templates/image and prompt-templates/video
    for (const surface of ['image', 'video'] as const) {
      const surfaceDir = join(this.promptTemplatesDir, surface)
      try {
        const entries = await readdir(surfaceDir, { withFileTypes: true })
        for (const entry of entries) {
          if (!entry.isFile() || !entry.name.endsWith('.json') || entry.name.startsWith('.')) continue
          const raw = await safeReadText(join(surfaceDir, entry.name))
          if (raw === undefined) continue
          try {
            const data = JSON.parse(raw) as {
              id?: string
              surface?: 'image' | 'video'
              title?: string
              summary?: string
              category?: string
              tags?: string[]
              model?: string
              aspect?: string
              previewImageUrl?: string
              previewVideoUrl?: string
              source?: PromptTemplateSource
            }
            const id = data.id ?? entry.name.replace(/\.json$/, '')
            const title = cleanPluginTitle(data.title ?? entry.name.replace(/\.json$/, ''))
            map.set(id, {
              id,
              surface: data.surface ?? surface,
              title,
              summary: cleanPluginTitle(data.summary ?? ''),
              category: surface === 'image' ? 'Image' : 'Video',
              tags: Array.isArray(data.tags) ? data.tags : [],
              model: 'default',
              aspect: data.aspect ?? '1:1',
              ...data.previewImageUrl !== undefined ? { previewImageUrl: data.previewImageUrl } : {},
              ...data.previewVideoUrl !== undefined ? { previewVideoUrl: data.previewVideoUrl } : {},
              ...data.source !== undefined ? { source: data.source } : {},
            })
          } catch {
            // Ignore invalid JSON
          }
        }
      } catch {
        // Directory missing
      }
    }

    // 2. Load image-templates directory
    try {
      const entries = await readdir(this.imageTemplatesDir, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue
        const id = entry.name
        if (map.has(id)) continue
        const dir = join(this.imageTemplatesDir, id)
        const jsonRaw = await safeReadText(join(dir, 'open-design.json'))
        const skillRaw = await safeReadText(join(dir, 'SKILL.md'))
        let title = cleanPluginTitle(id.replace(/-/g, ' '))
        let summary = ''
        if (jsonRaw !== undefined) {
          try {
            const parsed = JSON.parse(jsonRaw) as { title?: string; name?: string; description?: string; summary?: string }
            title = cleanPluginTitle(parsed.title ?? parsed.name ?? title)
            summary = cleanPluginTitle(parsed.summary ?? parsed.description ?? '')
          } catch {}
        } else if (skillRaw !== undefined) {
          const fm = parseSimpleFrontmatter(skillRaw)
          title = cleanPluginTitle((fm.name as string) ?? (fm.title as string) ?? title)
          summary = cleanPluginTitle((fm.description as string) ?? '')
        }
        map.set(id, {
          id,
          surface: 'image',
          title,
          summary,
          category: 'Image',
          tags: [id, 'image'],
          model: 'default',
          aspect: '1:1',
        })
      }
    } catch {}

    // 3. Load video-templates directory
    try {
      const entries = await readdir(this.videoTemplatesDir, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue
        const id = entry.name
        if (map.has(id)) continue
        const dir = join(this.videoTemplatesDir, id)
        const jsonRaw = await safeReadText(join(dir, 'open-design.json'))
        const skillRaw = await safeReadText(join(dir, 'SKILL.md'))
        let title = cleanPluginTitle(id.replace(/-/g, ' '))
        let summary = ''
        if (jsonRaw !== undefined) {
          try {
            const parsed = JSON.parse(jsonRaw) as { title?: string; name?: string; description?: string; summary?: string }
            title = cleanPluginTitle(parsed.title ?? parsed.name ?? title)
            summary = cleanPluginTitle(parsed.summary ?? parsed.description ?? '')
          } catch {}
        } else if (skillRaw !== undefined) {
          const fm = parseSimpleFrontmatter(skillRaw)
          title = cleanPluginTitle((fm.name as string) ?? (fm.title as string) ?? title)
          summary = cleanPluginTitle((fm.description as string) ?? '')
        }
        map.set(id, {
          id,
          surface: 'video',
          title,
          summary,
          category: 'Video',
          tags: [id, 'video'],
          model: 'default',
          aspect: '16:9',
        })
      }
    } catch {}

    // 4. Load skills directory (160+ skills!)
    try {
      const entries = await readdir(this.skillsDir, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue
        const id = entry.name
        if (map.has(id)) continue
        const dir = join(this.skillsDir, id)
        const skillRaw = await safeReadText(join(dir, 'SKILL.md'))
        let title = cleanPluginTitle(id.replace(/-/g, ' '))
        let summary = ''
        let declaredCat: string | undefined
        if (skillRaw !== undefined) {
          const fm = parseSimpleFrontmatter(skillRaw)
          title = cleanPluginTitle((fm.name as string) ?? (fm.title as string) ?? title)
          summary = cleanPluginTitle((fm.description as string) ?? '')
          declaredCat = fm.category as string | undefined
        }
        const category = resolveSkillCategory(id, declaredCat)
        map.set(id, {
          id,
          surface: 'image',
          title,
          summary,
          category,
          tags: [id, category.toLowerCase()],
          model: 'default',
          aspect: '1:1',
        })
      }
    } catch {}

    // 5. Load atoms directory
    try {
      const entries = await readdir(this.atomsDir, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue
        const id = entry.name
        if (map.has(id)) continue
        const dir = join(this.atomsDir, id)
        const jsonRaw = await safeReadText(join(dir, 'open-design.json'))
        let title = cleanPluginTitle(id.replace(/-/g, ' '))
        let summary = ''
        if (jsonRaw !== undefined) {
          try {
            const parsed = JSON.parse(jsonRaw) as { title?: string; name?: string; description?: string }
            title = cleanPluginTitle(parsed.title ?? parsed.name ?? title)
            summary = cleanPluginTitle(parsed.description ?? '')
          } catch {}
        }
        map.set(id, {
          id,
          surface: 'image',
          title,
          summary,
          category: 'Atoms',
          tags: [id, 'atom'],
          model: 'default',
          aspect: '1:1',
        })
      }
    } catch {}

    // 6. Load scenarios & community directories
    for (const [sDir, catName] of [[this.scenariosDir, 'Scenarios'], [this.communityDir, 'Community']] as const) {
      try {
        const entries = await readdir(sDir, { withFileTypes: true })
        for (const entry of entries) {
          if (!entry.isDirectory() || entry.name.startsWith('.')) continue
          const id = entry.name
          if (map.has(id)) continue
          const dir = join(sDir, id)
          const jsonRaw = await safeReadText(join(dir, 'open-design.json'))
          let title = cleanPluginTitle(id.replace(/-/g, ' '))
          let summary = ''
          if (jsonRaw !== undefined) {
            try {
              const parsed = JSON.parse(jsonRaw) as { title?: string; name?: string; description?: string }
              title = cleanPluginTitle(parsed.title ?? parsed.name ?? title)
              summary = cleanPluginTitle(parsed.description ?? '')
            } catch {}
          }
          map.set(id, {
            id,
            surface: 'image',
            title,
            summary,
            category: catName,
            tags: [id, catName.toLowerCase()],
            model: 'default',
            aspect: '1:1',
          })
        }
      } catch {}
    }

    this.promptTemplatesCache = Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title))
    return this.promptTemplatesCache
  }

  private async loadSystemsIndex(): Promise<DesignSystemSummary[]> {
    if (this.systemsCache !== undefined) return this.systemsCache

    const summaries: DesignSystemSummary[] = []
    try {
      const entries = await readdir(this.designSystemsDir, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === '_schema') continue

        const dir = join(this.designSystemsDir, entry.name)
        const manifestPath = join(dir, 'manifest.json')
        const manifestRaw = await safeReadText(manifestPath)
        if (manifestRaw === undefined) continue

        try {
          const manifest = JSON.parse(manifestRaw) as {
            id?: string
            name?: string
            category?: string
            description?: string
            craft?: { suggested?: string[] }
          }
          const id = manifest.id ?? entry.name
          const name = manifest.name ?? id
          const category = manifest.category ?? 'General'
          const description = manifest.description ?? ''
          const suggestedCraft = Array.isArray(manifest.craft?.suggested) ? manifest.craft.suggested : []

          // Check if tailwind exists
          const hasTailwind = await fileExists(join(dir, 'tailwind-v4.css'))

          // Extract preview colors from tokens.css or design-tokens.json
          const previewColors = await extractPreviewColors(dir)
          const brandDetails = await extractBrandDetails(dir)

          summaries.push({
            id,
            name,
            category,
            description,
            tags: [id, category.toLowerCase(), ...suggestedCraft],
            suggestedCraft,
            previewColors,
            hasTailwind,
            ...(brandDetails.palette.length > 0 ? { palette: brandDetails.palette } : {}),
            ...(brandDetails.displayFont ? { displayFont: brandDetails.displayFont } : {}),
            ...(brandDetails.bodyFont ? { bodyFont: brandDetails.bodyFont } : {}),
            ...(brandDetails.monoFont ? { monoFont: brandDetails.monoFont } : {}),
            ...(brandDetails.identityQuote ? { identityQuote: brandDetails.identityQuote } : {}),
          })
        } catch {
          // Ignore invalid manifest
        }
      }
    } catch {
      // Directory missing
    }

    this.systemsCache = summaries.sort((a, b) => a.name.localeCompare(b.name))
    return this.systemsCache
  }

  private async loadTemplatesIndex(): Promise<DesignTemplateSummary[]> {
    if (this.templatesCache !== undefined) return this.templatesCache

    const map = new Map<string, DesignTemplateSummary>()

    // Load both designTemplatesDir and examplesDir
    for (const templatesFolder of [this.examplesDir, this.designTemplatesDir]) {
      try {
        const entries = await readdir(templatesFolder, { withFileTypes: true })
        for (const entry of entries) {
          if (!entry.isDirectory() || entry.name.startsWith('.')) continue
          if (map.has(entry.name)) continue

          const dir = join(templatesFolder, entry.name)
          const skillPath = join(dir, 'SKILL.md')
          const exampleHtmlPath = join(dir, 'example.html')
          const jsonPath = join(dir, 'open-design.json')
          const skillRaw = await safeReadText(skillPath)
          const exampleHtml = await safeReadText(exampleHtmlPath)
          const jsonRaw = await safeReadText(jsonPath)

          let title = formatTemplateTitle(entry.name)
          let category = resolveTemplateCategory(entry.name)
          let description = ''
          let tags: string[] = [entry.name]

          if (jsonRaw !== undefined) {
            try {
              const parsed = JSON.parse(jsonRaw) as { title?: string; name?: string; description?: string; category?: string; tags?: string[] }
              if (parsed.title || parsed.name) title = formatTemplateTitle(entry.name, parsed.title ?? parsed.name)
              if (parsed.description) description = parsed.description
              if (parsed.category) category = resolveTemplateCategory(entry.name, parsed.category)
              if (Array.isArray(parsed.tags)) tags = parsed.tags
            } catch {}
          } else if (skillRaw !== undefined) {
            const frontmatter = parseSimpleFrontmatter(skillRaw)
            const declaredTitle = (frontmatter.en_name as string | undefined)
              ?? (frontmatter.title as string | undefined)
            if (declaredTitle) {
              title = formatTemplateTitle(entry.name, declaredTitle)
            }
            if (frontmatter.category) {
              category = resolveTemplateCategory(entry.name, frontmatter.category as string)
            }
            description = (frontmatter.description as string | undefined) ?? ''
            if (Array.isArray(frontmatter.tags)) {
              tags = frontmatter.tags.filter((t): t is string => typeof t === 'string')
            }
          }

          map.set(entry.name, {
            id: entry.name,
            title,
            category,
            description,
            tags,
            ...(exampleHtml ? { exampleHtml } : {}),
          })
        }
      } catch {
        // Directory missing
      }
    }

    this.templatesCache = Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title))
    return this.templatesCache
  }
}

/** Safely reads utf8 text from a file, stripping BOM, returning undefined on absence or error. */
async function safeReadText(filePath: string): Promise<string | undefined> {
  try {
    const raw = await readFile(filePath, 'utf8')
    return stripBom(raw)
  } catch {
    return undefined
  }
}

/** Strips UTF-8 byte order mark if present. */
function stripBom(str: string): string {
  return str.charCodeAt(0) === 0xFEFF ? str.slice(1) : str
}

/** Checks whether a file exists. */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    const s = await stat(filePath)
    return s.isFile()
  } catch {
    return false
  }
}

/** Extracts 2-4 key hex colors from tokens.css for visual badges. */
async function extractPreviewColors(systemDir: string): Promise<string[]> {
  const colors: string[] = []
  const tokensText = await safeReadText(join(systemDir, 'tokens.css'))
  if (tokensText !== undefined) {
    const hexMatches = tokensText.match(/#[0-9a-fA-F]{6}\b/g)
    if (hexMatches !== null) {
      for (const hex of hexMatches) {
        const lower = hex.toLowerCase()
        if (!colors.includes(lower) && colors.length < 4) {
          colors.push(lower)
        }
      }
    }
  }
  return colors
}

/** Extracts typography, full color palette, and identity quote from DESIGN.md or tokens. */
async function extractBrandDetails(systemDir: string): Promise<{
  palette: string[]
  displayFont?: string
  bodyFont?: string
  monoFont?: string
  identityQuote?: string
}> {
  const palette: string[] = []
  let displayFont: string | undefined
  let bodyFont: string | undefined
  let monoFont: string | undefined
  let identityQuote: string | undefined

  // Read DESIGN.md
  const designMd = await safeReadText(join(systemDir, 'DESIGN.md'))
  if (designMd !== undefined) {
    const lines = designMd.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      // Extract quote
      if (trimmed.startsWith('> ') && !trimmed.toLowerCase().includes('category:') && !identityQuote) {
        identityQuote = trimmed.slice(2).trim()
      }
      // Extract typography families: primary=Playfair Display, display=Playfair Display, mono=JetBrains Mono
      if (trimmed.includes('Families:') || trimmed.includes('families:')) {
        const dMatch = trimmed.match(/display=([^,;]+)/i)
        if (dMatch) displayFont = dMatch[1]?.trim()
        const pMatch = trimmed.match(/primary=([^,;]+)/i)
        if (pMatch) bodyFont = pMatch[1]?.trim()
        const bMatch = trimmed.match(/body=([^,;]+)/i)
        if (bMatch) bodyFont = bMatch[1]?.trim()
        const mMatch = trimmed.match(/mono=([^,;]+)/i)
        if (mMatch) monoFont = mMatch[1]?.trim()
      }
    }
  }

  // Read tokens.css for fonts and full palette
  const tokensText = await safeReadText(join(systemDir, 'tokens.css'))
  if (tokensText !== undefined) {
    // Hex colors
    const hexMatches = tokensText.match(/#[0-9a-fA-F]{6}\b/g)
    if (hexMatches !== null) {
      for (const hex of hexMatches) {
        const lower = hex.toLowerCase()
        if (!palette.includes(lower)) {
          palette.push(lower)
        }
      }
    }
    // Fonts if not found in DESIGN.md
    if (!displayFont) {
      const match = tokensText.match(/--font-display:\s*([^;]+);/)
      if (match && match[1]) displayFont = match[1].split(',')[0]?.replace(/["']/g, '').trim()
    }
    if (!bodyFont) {
      const match = tokensText.match(/--font-body:\s*([^;]+);/)
      if (match && match[1]) bodyFont = match[1].split(',')[0]?.replace(/["']/g, '').trim()
    }
    if (!monoFont) {
      const match = tokensText.match(/--font-mono:\s*([^;]+);/)
      if (match && match[1]) monoFont = match[1].split(',')[0]?.replace(/["']/g, '').trim()
    }
  }

  return {
    palette: palette.slice(0, 10),
    ...(displayFont ? { displayFont } : {}),
    ...(bodyFont ? { bodyFont } : {}),
    ...(monoFont ? { monoFont } : {}),
    ...(identityQuote ? { identityQuote } : {}),
  }
}

/** Parses lightweight key-value frontmatter from markdown without external heavy deps. */
function parseSimpleFrontmatter(text: string): Record<string, unknown> {
  const clean = stripBom(text)
  const result: Record<string, unknown> = {}
  if (!clean.startsWith('---')) return result

  const endIdx = clean.indexOf('\n---', 3)
  if (endIdx === -1) return result

  const frontmatterBlock = clean.slice(3, endIdx).trim()
  const lines = frontmatterBlock.split('\n')

  let currentKey = ''
  let inList = false
  const listItems: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('- ') && inList) {
      const val = trimmed.slice(2).replace(/^["']|["']$/g, '').trim()
      listItems.push(val)
      continue
    }

    if (inList && listItems.length > 0) {
      result[currentKey] = [...listItems]
      listItems.length = 0
      inList = false
    }

    const colonIdx = line.indexOf(':')
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim()
      const rawVal = line.slice(colonIdx + 1).trim()

      if (rawVal === '' || rawVal === '|') {
        currentKey = key
        inList = true
      } else {
        const cleanVal = rawVal.replace(/^["']|["']$/g, '').trim()
        result[key] = cleanVal
      }
    }
  }

  if (inList && listItems.length > 0) {
    result[currentKey] = [...listItems]
  }

  return result
}

function formatTemplateTitle(id: string, frontmatterTitle?: string): string {
  if (frontmatterTitle && frontmatterTitle !== id && !frontmatterTitle.includes('-')) {
    return frontmatterTitle
  }
  return id
    .replace(/^html-ppt-/, '')
    .split('-')
    .map((w) => {
      const lower = w.toLowerCase()
      if (lower === 'ui') return 'UI'
      if (lower === 'api') return 'API'
      if (lower === 'hr') return 'HR'
      if (lower === 'dcf') return 'DCF'
      if (lower === 'kpi') return 'KPI'
      if (lower === 'saas') return 'SaaS'
      if (lower === 'ai') return 'AI'
      if (lower === 'okrs') return 'OKRs'
      if (lower === 'flowai') return 'FlowAI'
      if (lower === 'ppt') return 'PPT'
      if (lower === 'fpv') return 'FPV'
      return w.charAt(0).toUpperCase() + w.slice(1)
    })
    .join(' ')
}

function resolveTemplateCategory(id: string, frontmatterCat?: string): string {
  const lower = id.toLowerCase()
  if (lower.startsWith('html-ppt') || lower.includes('deck') || lower.includes('pitch') || lower === 'guizang-ppt') {
    return 'Slide deck'
  }
  if (lower.includes('wireframe')) {
    return 'Wireframe'
  }
  if (
    lower.includes('mobile') ||
    lower.includes('gamified') ||
    lower.includes('dating') ||
    lower.includes('hr-onboarding')
  ) {
    return 'Mobile app'
  }
  if (
    lower.includes('dashboard') ||
    lower.includes('kanban') ||
    lower.includes('finance') ||
    lower.includes('valuation') ||
    lower.includes('trading')
  ) {
    return 'Dashboards'
  }
  if (
    lower.includes('landing') ||
    lower.includes('pricing') ||
    lower.includes('waitlist') ||
    lower.includes('marketing') ||
    lower.includes('email') ||
    lower.includes('blog') ||
    lower.includes('poster') ||
    lower.includes('contact')
  ) {
    return 'Landing / marketing'
  }
  if (frontmatterCat && frontmatterCat !== 'templates') {
    return frontmatterCat
  }
  return 'Apps'
}

function cleanPluginTitle(raw: string): string {
  let s = raw
  s = s.replace(/seedance\s*2(?:\.0)?\s*[-–—:]*\s*/gi, '')
  s = s.replace(/seedance\s*[-–—:]*\s*/gi, '')
  s = s.replace(/gpt\s*image\s*2(?:\.0)?\s*[-–—:]*\s*/gi, '')
  s = s.replace(/gpt\s*image\s*[-–—:]*\s*/gi, '')
  s = s.replace(/seedream\s*[-–—:]*\s*/gi, '')
  s = s.replace(/flux-pro-v1\.1\s*[-–—:]*\s*/gi, '')
  s = s.replace(/flux\s*[-–—:]*\s*/gi, '')
  s = s.replace(/kling\s*o3\s*[-–—:]*\s*/gi, '')
  s = s.replace(/kling\s*[-–—:]*\s*/gi, '')
  s = s.replace(/sora\s*[-–—:]*\s*/gi, '')
  s = s.replace(/minimax\s*[-–—:]*\s*/gi, '')
  s = s.replace(/^[-–—:\s]+|[-–—:\s]+$/g, '').trim()
  if (s === '') return raw
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function resolveSkillCategory(id: string, declaredCat?: string): string {
  const lower = id.toLowerCase()
  if (declaredCat && declaredCat !== 'General' && declaredCat !== 'skill') return declaredCat
  if (lower.includes('animat') || lower.includes('motion') || lower.includes('gsap') || lower.includes('remotion') || lower.includes('video') || lower.includes('hyperframe')) {
    return 'Animation'
  }
  if (lower.includes('figma') || lower.includes('canvas') || lower.includes('design') || lower.includes('color') || lower.includes('theme') || lower.includes('taste') || lower.includes('stitch') || lower.includes('apple-hig')) {
    return 'Design'
  }
  if (lower.includes('flutter') || lower.includes('swift') || lower.includes('frontend') || lower.includes('react') || lower.includes('shadcn') || lower.includes('threejs') || lower.includes('shader') || lower.includes('ui') || lower.includes('web')) {
    return 'UI / Code'
  }
  if (lower.includes('image') || lower.includes('fal-') || lower.includes('venice-') || lower.includes('photo') || lower.includes('sticker') || lower.includes('art')) {
    return 'Image'
  }
  return 'Skills & Tools'
}


