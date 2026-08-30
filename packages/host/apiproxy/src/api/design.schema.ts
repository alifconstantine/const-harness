/**
 * design domain zod schemas (names derived from map keys:
 * designSystemsRequestSchema / designSystemsValueSchema, etc.).
 */

import { z } from 'zod'
import type { RequestPayload, ResponseValue } from './rpc-map.ts'
import type { Wire } from './rpc.schema.ts'
import type {
  CraftGuideline,
  CraftGuidelineSummary,
  DesignSystemDetail,
  DesignSystemSummary,
  DesignTemplateDetail,
  DesignTemplateSummary,
  PromptTemplateDetail,
  PromptTemplateSource,
  PromptTemplateSummary,
} from './design.ts'

/** DesignSystemSummary schema. */
export const designSystemSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  description: z.string(),
  tags: z.array(z.string()),
  suggestedCraft: z.array(z.string()),
  previewColors: z.array(z.string()),
  hasTailwind: z.boolean(),
}) satisfies z.ZodType<Wire<DesignSystemSummary>>

/** DesignSystemDetail schema. */
export const designSystemDetailSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  description: z.string(),
  manifest: z.record(z.string(), z.unknown()),
  designMarkdown: z.string(),
  tokensCss: z.string(),
  designTokensJson: z.record(z.string(), z.unknown()).optional(),
  componentsHtml: z.string().optional(),
  tailwindCss: z.string().optional(),
  usageMarkdown: z.string().optional(),
  previewPages: z.record(z.string(), z.string()).optional(),
}) satisfies z.ZodType<Wire<DesignSystemDetail>>

/** DesignTemplateSummary schema. */
export const designTemplateSummarySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
  description: z.string(),
  tags: z.array(z.string()),
  previewRole: z.string().optional(),
}) satisfies z.ZodType<Wire<DesignTemplateSummary>>

/** DesignTemplateDetail schema. */
export const designTemplateDetailSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
  description: z.string(),
  starterHtml: z.string(),
  stylesCss: z.string().optional(),
  scriptsJs: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
}) satisfies z.ZodType<Wire<DesignTemplateDetail>>

/** CraftGuidelineSummary schema. */
export const craftGuidelineSummarySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string(),
  category: z.string().optional(),
}) satisfies z.ZodType<Wire<CraftGuidelineSummary>>

/** CraftGuideline schema. */
export const craftGuidelineSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  content: z.string(),
  category: z.string().optional(),
}) satisfies z.ZodType<Wire<CraftGuideline>>

/** PromptTemplateSource schema. */
export const promptTemplateSourceSchema = z.object({
  repo: z.string().min(1),
  license: z.string().optional(),
  author: z.string().optional(),
  url: z.string().optional(),
}) satisfies z.ZodType<Wire<PromptTemplateSource>>

/** PromptTemplateSummary schema. */
export const promptTemplateSummarySchema = z.object({
  id: z.string().min(1),
  surface: z.enum(['image', 'video']),
  title: z.string().min(1),
  summary: z.string(),
  category: z.string().min(1),
  tags: z.array(z.string()),
  model: z.string().min(1),
  aspect: z.string().min(1),
  previewImageUrl: z.string().optional(),
  previewVideoUrl: z.string().optional(),
  source: promptTemplateSourceSchema.optional(),
}) satisfies z.ZodType<Wire<PromptTemplateSummary>>

/** PromptTemplateDetail schema. */
export const promptTemplateDetailSchema = promptTemplateSummarySchema.extend({
  prompt: z.string(),
}) satisfies z.ZodType<Wire<PromptTemplateDetail>>

/** design.systems request payload. */
export const designSystemsRequestSchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
}) satisfies z.ZodType<Wire<RequestPayload<'design.systems'>>>

/** design.systems response value. */
export const designSystemsValueSchema = z.object({
  systems: z.array(designSystemSummarySchema),
  categories: z.array(z.string()),
}) satisfies z.ZodType<Wire<ResponseValue<'design.systems'>>>

/** design.systemDetail request payload. */
export const designSystemDetailRequestSchema = z.object({
  id: z.string().min(1),
}) satisfies z.ZodType<Wire<RequestPayload<'design.systemDetail'>>>

/** design.systemDetail response value. */
export const designSystemDetailValueSchema = z.object({
  system: designSystemDetailSchema,
}) satisfies z.ZodType<Wire<ResponseValue<'design.systemDetail'>>>

/** design.templates request payload. */
export const designTemplatesRequestSchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
}) satisfies z.ZodType<Wire<RequestPayload<'design.templates'>>>

/** design.templates response value. */
export const designTemplatesValueSchema = z.object({
  templates: z.array(designTemplateSummarySchema),
  categories: z.array(z.string()),
}) satisfies z.ZodType<Wire<ResponseValue<'design.templates'>>>

/** design.templateDetail request payload. */
export const designTemplateDetailRequestSchema = z.object({
  id: z.string().min(1),
}) satisfies z.ZodType<Wire<RequestPayload<'design.templateDetail'>>>

/** design.templateDetail response value. */
export const designTemplateDetailValueSchema = z.object({
  template: designTemplateDetailSchema,
}) satisfies z.ZodType<Wire<ResponseValue<'design.templateDetail'>>>

/** design.craftGuidelines request payload. */
export const designCraftGuidelinesRequestSchema = z.object({
  search: z.string().optional(),
}) satisfies z.ZodType<Wire<RequestPayload<'design.craftGuidelines'>>>

/** design.craftGuidelines response value. */
export const designCraftGuidelinesValueSchema = z.object({
  guidelines: z.array(craftGuidelineSummarySchema),
}) satisfies z.ZodType<Wire<ResponseValue<'design.craftGuidelines'>>>

/** design.craftGuideline request payload. */
export const designCraftGuidelineRequestSchema = z.object({
  id: z.string().min(1),
}) satisfies z.ZodType<Wire<RequestPayload<'design.craftGuideline'>>>

/** design.craftGuideline response value. */
export const designCraftGuidelineValueSchema = z.object({
  guideline: craftGuidelineSchema,
}) satisfies z.ZodType<Wire<ResponseValue<'design.craftGuideline'>>>

/** design.promptTemplates request payload. */
export const designPromptTemplatesRequestSchema = z.object({
  surface: z.enum(['image', 'video']).optional(),
  category: z.string().optional(),
  search: z.string().optional(),
}) satisfies z.ZodType<Wire<RequestPayload<'design.promptTemplates'>>>

/** design.promptTemplates response value. */
export const designPromptTemplatesValueSchema = z.object({
  templates: z.array(promptTemplateSummarySchema),
  categories: z.array(z.string()),
  surfaces: z.array(z.string()),
}) satisfies z.ZodType<Wire<ResponseValue<'design.promptTemplates'>>>

/** design.promptTemplateDetail request payload. */
export const designPromptTemplateDetailRequestSchema = z.object({
  id: z.string().min(1),
}) satisfies z.ZodType<Wire<RequestPayload<'design.promptTemplateDetail'>>>

/** design.promptTemplateDetail response value. */
export const designPromptTemplateDetailValueSchema = z.object({
  template: promptTemplateDetailSchema,
}) satisfies z.ZodType<Wire<ResponseValue<'design.promptTemplateDetail'>>>
