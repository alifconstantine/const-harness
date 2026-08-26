/** Package-owned invariant companion. @module @const-ai/host-plugin-inventory/invariant */

/* jscpd:ignore-start */
import type { Context } from '@const-ai/cordis'
import type { InvariantInstaller } from '@const-ai/invariants'

const PACKAGE_NAME = '@const-ai/host-plugin-inventory'

/** Cordis companion plugin name. */
export const name = 'host-plugin-inventory-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/** No runtime invariant: every snapshot is projected directly from Loader-owned state. */
const install: InvariantInstaller = () => {}

/** Register this package's invariant companion. */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
