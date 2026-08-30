/**
 * design domain contract: design systems, templates, and craft guidelines
 * for native OpenDesign generation within Const-Harness.
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
  /** Whether the design system includes a Tailwind CSS theme file. */
  readonly hasTailwind: boolean
}

/** Complete design system bundle with design markdown, tokens, and components. */
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

/** Design craft standard guideline entry. */
export interface CraftGuideline {
  /** Identifier (e.g. 'anti-ai-slop', 'typography', 'color'). */
  readonly id: string
  /** Human-readable title of the guideline. */
  readonly title: string
  /** Full markdown content with actionable design standards. */
  readonly content: string
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

  /** Reads the markdown content for one design craft standard guideline. */
  craftGuideline(request: RpcRequest<{ id: string }>):
  Promise<RpcResponse<{ guideline: CraftGuideline }>>
}
