import { describe, expect, it } from 'vitest'
import { Context } from '@const-ai/cordis'
import InvariantRegistry from '@const-ai/invariants'
import * as UserIdInvariant from '@const-ai/anonymous-user-id/invariant'

describe('invariant companion', () => {
  it('registers the package ownership with an empty installer', async () => {
    const ctx = new Context()
    await ctx.plugin(InvariantRegistry, { enabled: true })
    await expect(ctx.plugin(UserIdInvariant).await()).resolves.toBeDefined()
  })
})
