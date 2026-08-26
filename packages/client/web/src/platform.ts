/**
 * Shared browser platform modules. Seeding, bundling externals, and Vite
 * aliases consume this list so their module identities cannot drift.
 * @module @const-ai/client-web/src/platform
 */

/** The module specifiers the shell shares into the frozen module table. */
export const PLATFORM_MODULES = [
  'react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', '@const-ai/cordis',
  '@const-ai/client-ui-slots',
  '@const-ai/client-web-react',
  '@const-ai/client-ui-primitives',
  '@const-ai/client-ui-attachment',
  '@const-ai/client-schema-form',
] as const

/** One platform module specifier (a seed-table key). */
export type PlatformModule = (typeof PLATFORM_MODULES)[number]
