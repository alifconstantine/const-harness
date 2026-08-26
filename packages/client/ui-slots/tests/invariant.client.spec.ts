import { describe, expect, it } from 'vitest'
import { Context } from '@const-ai/cordis'
import * as SlotsInvariant from '@const-ai/client-ui-slots/invariant'
import InvariantRegistry from '@const-ai/invariants'

describe('invariant companion', () => {
  it('registers under the package name with an empty installer', async () => {
    const ctx = new Context()
    await ctx.plugin(InvariantRegistry, { enabled: true })
    await expect(ctx.plugin(SlotsInvariant).await()).resolves.toBeDefined()
  })
})
