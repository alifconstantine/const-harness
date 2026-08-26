import { clientBundle } from '../../client/tsdown.client.ts'

export default clientBundle(
  '@const-ai/api-remotes',
  ['lib/types/index.js', 'lib/types/invariant.js'],
  { hostPhase: true },
)
