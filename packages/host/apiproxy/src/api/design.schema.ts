/**
 * design domain zod schemas (names derived from map keys:
 * designSystemsRequestSchema / designSystemsValueSchema, etc.).
 */

import { z } from 'zod'
import type { RequestPayload, ResponseValue } from './rpc-map.ts'
import type { Wire } from './rpc.schema.ts'
import type {
  CraftGuideline,
  DesignSystemDetail,
  DesignSystemSummary,
  DesignTemplateDetail,
  DesignTemplateSummary,
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

/** CraftGuideline schema. */
export const craftGuidelineSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  content: z.string(),
}) satisfies z.ZodType<Wire<CraftGuideline>>

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

/** design.craftGuideline request payload. */
export const designCraftGuidelineRequestSchema = z.object({
  id: z.string().min(1),
}) satisfies z.ZodType<Wire<RequestPayload<'design.craftGuideline'>>>

/** design.craftGuideline response value. */
export const designCraftGuidelineValueSchema = z.object({
  guideline: craftGuidelineSchema,
}) satisfies z.ZodType<Wire<ResponseValue<'design.craftGuideline'>>>
