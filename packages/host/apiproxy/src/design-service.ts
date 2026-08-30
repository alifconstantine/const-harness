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
                  title: data.title ?? id,
                  summary: data.summary ?? '',
                  category: data.category ?? 'General',
                  tags: Array.isArray(data.tags) ? data.tags : [],
                  model: data.model ?? 'default',
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

    const summaries: PromptTemplateSummary[] = []
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
            summaries.push({
              id: data.id ?? entry.name.replace(/\.json$/, ''),
              surface: data.surface ?? surface,
              title: data.title ?? entry.name,
              summary: data.summary ?? '',
              category: data.category ?? 'General',
              tags: Array.isArray(data.tags) ? data.tags : [],
              model: data.model ?? 'default',
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

    this.promptTemplatesCache = summaries.sort((a, b) => a.title.localeCompare(b.title))
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

          summaries.push({
            id,
            name,
            category,
            description,
            tags: [id, category.toLowerCase(), ...suggestedCraft],
            suggestedCraft,
            previewColors,
            hasTailwind,
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

    const summaries: DesignTemplateSummary[] = []
    try {
      const entries = await readdir(this.designTemplatesDir, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue

        const dir = join(this.designTemplatesDir, entry.name)
        const skillPath = join(dir, 'SKILL.md')
        const skillRaw = await safeReadText(skillPath)

        let title = entry.name
        let category = 'templates'
        let description = ''
        let tags: string[] = [entry.name]

        if (skillRaw !== undefined) {
          const frontmatter = parseSimpleFrontmatter(skillRaw)
          title = (frontmatter.en_name as string | undefined)
            ?? (frontmatter.title as string | undefined)
            ?? (frontmatter.name as string | undefined)
            ?? entry.name
          category = (frontmatter.category as string | undefined)
            ?? (entry.name.startsWith('html-ppt') ? 'slides' : 'templates')
          description = (frontmatter.description as string | undefined) ?? ''
          if (Array.isArray(frontmatter.tags)) {
            tags = frontmatter.tags.filter((t): t is string => typeof t === 'string')
          }
        }

        summaries.push({
          id: entry.name,
          title,
          category,
          description,
          tags,
        })
      }
    } catch {
      // Directory missing
    }

    this.templatesCache = summaries.sort((a, b) => a.title.localeCompare(b.title))
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
