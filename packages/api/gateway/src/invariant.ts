/**
 * Package-owned invariant companion for `@const-ai/api-gateway`.
 * @module @const-ai/api-gateway/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@const-ai/cordis'
import type { InvariantInstaller } from '@const-ai/invariants'

const PACKAGE_NAME = '@const-ai/api-gateway'

/** Cordis companion plugin name. */
export const name = 'api-gateway-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: Host calls re-read authoritative Cordis and Typert
 * state, while Client methods, descriptors, and `$on` subscriptions mutate in
 * one owned effect.
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
