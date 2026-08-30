/**
 * design domain contract: design systems, templates, craft guidelines,
 * and prompt templates for native OpenDesign generation within Const-Harness.
 */

import type { RpcRequest, RpcResponse } from './rpc.ts'

/** Summary metadata for one design system catalog entry. */
export interface DesignSystemSummary {
  /** Unique kebab-case identifier (e.g. 'stripe', 'linear-app', 'notion'). */
  readonly id: string
  /** Human-readable display name (e.g. 'Stripe', 'Linear', 'Notion'). */
  readonly name: string
  /** Category grouping (e.g. 'Fintech & Crypto', 'Modern SaaS', 'Minimal'). */
  readonly category: string
  /** Short description of the visual identity and purpose. */
  readonly description: string
  /** Tags for search and filtering. */
  readonly tags: readonly string[]
  /** Suggested craft rule ids (e.g. ['color', 'accessibility-baseline']). */
  readonly suggestedCraft: readonly string[]
  /** Preview colors extracted from design tokens or preview manifests. */
  readonly previewColors: readonly string[]
  /** Full brand palette colors for design system preview. */
  readonly palette?: readonly string[]
  /** Display/Heading font family (e.g. 'Playfair Display', 'Inter'). */
  readonly displayFont?: string
  /** Body font family (e.g. 'Inter', 'system-ui'). */
  readonly bodyFont?: string
  /** Monospace font family (e.g. 'JetBrains Mono', 'Menlo'). */
  readonly monoFont?: string
  /** Short identity quote or philosophy text from DESIGN.md. */
  readonly identityQuote?: string
  /** Whether the design system includes a Tailwind CSS theme file. */
  readonly hasTailwind: boolean
}

/** Complete design system bundle with design markdown, tokens, components, and preview pages. */
export interface DesignSystemDetail {
  /** Unique identifier matching the summary id. */
  readonly id: string
  /** Human-readable display name. */
  readonly name: string
  /** Category grouping. */
  readonly category: string
  /** Description of the visual identity. */
  readonly description: string
  /** Parsed manifest metadata. */
  readonly manifest: Record<string, unknown>
  /** Core design principles and rules from DESIGN.md. */
  readonly designMarkdown: string
  /** Raw CSS custom properties (:root block) from tokens.css. */
  readonly tokensCss: string
  /** Optional JSON representation of design tokens from design-tokens.json. */
  readonly designTokensJson?: Record<string, unknown>
  /** Optional pre-built HTML component library from components.html. */
  readonly componentsHtml?: string
  /** Optional Tailwind v4 theme configuration from tailwind-v4.css. */
  readonly tailwindCss?: string
  /** Optional usage documentation from USAGE.md. */
  readonly usageMarkdown?: string
  /** Optional preview HTML documents (e.g. { 'colors.html': '...', 'typography.html': '...' }). */
  readonly previewPages?: Record<string, string>
}

/** Summary metadata for one design template catalog entry. */
export interface DesignTemplateSummary {
  /** Unique kebab-case identifier (e.g. 'html-ppt-pitch-deck', 'live-dashboard'). */
  readonly id: string
  /** Human-readable display title. */
  readonly title: string
  /** Category grouping (e.g. 'slides', 'dashboard', 'prototype'). */
  readonly category: string
  /** Short description of what this template produces. */
  readonly description: string
  /** Tags for filtering and matching. */
  readonly tags: readonly string[]
  /** Optional preview role or thumbnail indicator. */
  readonly previewRole?: string
  /** Optional preview image URL for direct image thumbnail display. */
  readonly previewImageUrl?: string
  /** Optional example HTML preview string. */
  readonly exampleHtml?: string
  /** Optional example prompt / starter prompt blueprint from template manifest or SKILL.md. */
  readonly examplePrompt?: string
}

/** Complete template definition with starter HTML code and blueprints. */
export interface DesignTemplateDetail {
  /** Unique identifier matching the summary id. */
  readonly id: string
  /** Human-readable title. */
  readonly title: string
  /** Category grouping. */
  readonly category: string
  /** Description of template structure. */
  readonly description: string
  /** Starter HTML markup for the canvas/slide deck. */
  readonly starterHtml: string
  /** Optional stylesheet CSS for this template. */
  readonly stylesCss?: string
  /** Optional runtime JavaScript helper. */
  readonly scriptsJs?: string
  /** Optional configuration metadata parsed from template manifest. */
  readonly config?: Record<string, unknown>
}

/** Summary metadata for one design craft standard guideline. */
export interface CraftGuidelineSummary {
  /** Identifier (e.g. 'anti-ai-slop', 'typography', 'color'). */
  readonly id: string
  /** Human-readable title of the guideline. */
  readonly title: string
  /** First paragraph or summary description. */
  readonly summary: string
  /** Category if present. */
  readonly category?: string
}

/** Design craft standard guideline entry with full markdown content. */
export interface CraftGuideline {
  /** Identifier (e.g. 'anti-ai-slop', 'typography', 'color'). */
  readonly id: string
  /** Human-readable title of the guideline. */
  readonly title: string
  /** Full markdown content with actionable design standards. */
  readonly content: string
  /** Category if present. */
  readonly category?: string
}

/** Source attribution metadata for a prompt template. */
export interface PromptTemplateSource {
  /** Source repository (e.g. 'YouMind-OpenLab/awesome-gpt-image-2', 'heygen-com/hyperframes'). */
  readonly repo: string
  /** License (e.g. 'CC-BY-4.0', 'Apache-2.0'). */
  readonly license?: string
  /** Curator or author name. */
  readonly author?: string
  /** Upstream URL reference. */
  readonly url?: string
}

/** Summary metadata for one image or video prompt template. */
export interface PromptTemplateSummary {
  /** Unique kebab-case identifier. */
  readonly id: string
  /** Generation surface: 'image' or 'video'. */
  readonly surface: 'image' | 'video'
  /** Human-readable title. */
  readonly title: string
  /** Short summary of visual composition and theme. */
  readonly summary: string
  /** Category grouping (e.g. 'Infographic', 'Marketing', 'Avatar', 'Gaming'). */
  readonly category: string
  /** Tags for filtering. */
  readonly tags: readonly string[]
  /** Target model identifier (e.g. 'gpt-image-2', 'hyperframes-html', 'seedance-2-0'). */
  readonly model: string
  /** Aspect ratio (e.g. '1:1', '16:9', '9:16'). */
  readonly aspect: string
  /** Preview image thumbnail URL. */
  readonly previewImageUrl?: string
  /** Optional preview video MP4 URL. */
  readonly previewVideoUrl?: string
  /** Source attribution metadata. */
  readonly source?: PromptTemplateSource
}

/** Complete prompt template with structured prompt body. */
export interface PromptTemplateDetail extends PromptTemplateSummary {
  /** Full prompt blueprint / JSON structure. */
  readonly prompt: string
}

/** Supported prompt modes for OpenDesign deliverables. */
export type DesignPromptMode =
  | 'deck'
  | 'prototype'
  | 'dashboard'
  | 'document'
  | 'hyperframes'
  | 'general'

/** Configuration options for generating an OpenDesign system prompt. */
export interface DesignPromptOptions {
  /** Target deliverable mode. Defaults to 'general'. */
  readonly mode?: DesignPromptMode
  /** Brand design system ID (e.g. 'linear-app', 'stripe', 'apple'). */
  readonly designSystemId?: string
  /** Optional pre-loaded design system detail. */
  readonly designSystem?: DesignSystemDetail
  /** Starter design template ID (e.g. 'html-ppt-pitch-deck', 'live-dashboard'). */
  readonly templateId?: string
  /** Optional pre-loaded template detail. */
  readonly template?: DesignTemplateDetail
  /** IDs of craft guidelines to inject. Defaults to key rules. */
  readonly craftRuleIds?: readonly string[]
  /** Optional pre-loaded craft guidelines map. */
  readonly craftGuidelines?: readonly CraftGuideline[]
  /** Whether to inject the fixed 16:9 slide deck framework (auto-true for 'deck' mode). */
  readonly includeSlideSkeleton?: boolean
  /** Whether to inject the interactive live tweaks parameter schema directive (auto-true for 'dashboard' mode). */
  readonly includeLiveTweaksSchema?: boolean
  /** Output locale code (e.g. 'en', 'zh-CN', 'id'). Defaults to 'en'. */
  readonly locale?: string
  /** Custom user/project-level design instructions. */
  readonly customInstructions?: string
}

/** Result of prompt compilation. */
export interface DesignPromptResult {
  /** Full assembled system prompt string. */
  readonly systemPrompt: string
  /** Resolved CSS tokens (:root block) if a design system was active. */
  readonly tokensCss?: string
  /** Resolved DESIGN.md markdown rules if a design system was active. */
  readonly designMarkdown?: string
  /** List of craft rule IDs successfully injected into the prompt. */
  readonly injectedCraftRules: readonly string[]
  /** Compilation metadata. */
  readonly metadata: {
    readonly mode: DesignPromptMode
    readonly designSystemId?: string
    readonly templateId?: string
    readonly locale?: string
  }
}

/** Design domain unary methods (the map key design.* of RpcMethodMap). */
export interface DesignApi {
  /** Lists all available brand design systems with category filtering. */
  systems(request: RpcRequest<{ category?: string; search?: string }>):
  Promise<RpcResponse<{ systems: readonly DesignSystemSummary[]; categories: readonly string[] }>>

  /** Reads the full assets and token specification for one brand design system. */
  systemDetail(request: RpcRequest<{ id: string }>):
  Promise<RpcResponse<{ system: DesignSystemDetail }>>

  /** Lists all available starter design templates with category filtering. */
  templates(request: RpcRequest<{ category?: string; search?: string }>):
  Promise<RpcResponse<{ templates: readonly DesignTemplateSummary[]; categories: readonly string[] }>>

  /** Reads the starter HTML and configurations for one design template. */
  templateDetail(request: RpcRequest<{ id: string }>):
  Promise<RpcResponse<{ template: DesignTemplateDetail }>>

  /** Lists all available craft standard guidelines with optional search. */
  craftGuidelines(request: RpcRequest<{ search?: string }>):
  Promise<RpcResponse<{ guidelines: readonly CraftGuidelineSummary[] }>>

  /** Reads the markdown content for one design craft standard guideline. */
  craftGuideline(request: RpcRequest<{ id: string }>):
  Promise<RpcResponse<{ guideline: CraftGuideline }>>

  /** Lists all available image and video prompt templates with filtering. */
  promptTemplates(request: RpcRequest<{ surface?: 'image' | 'video'; category?: string; search?: string }>):
  Promise<RpcResponse<{ templates: readonly PromptTemplateSummary[]; categories: readonly string[]; surfaces: readonly string[] }>>

  /** Reads the full prompt and parameters for one prompt template. */
  promptTemplateDetail(request: RpcRequest<{ id: string }>):
  Promise<RpcResponse<{ template: PromptTemplateDetail }>>

  /** Compiles a complete OpenDesign system prompt using active design assets. */
  composePrompt(request: RpcRequest<DesignPromptOptions>):
  Promise<RpcResponse<DesignPromptResult>>
}
