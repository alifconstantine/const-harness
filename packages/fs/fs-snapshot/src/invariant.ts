/**
 * Package-owned invariant companion for `@const-ai/fs-snapshot`.
 * @module @const-ai/fs-snapshot/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@const-ai/cordis'
import type { InvariantInstaller } from '@const-ai/invariants'

const PACKAGE_NAME = '@const-ai/fs-snapshot'

/** Cordis companion plugin name. */
export const name = 'fs-snapshot-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: this package provides shadow git snapshot operations; it owns no event stream or mutable cross-session state.
 */
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
