import React from 'react'
import type { ClientContext } from '@const-ai/client-runtime/client'
import type {} from '@const-ai/client-ui-slots'
import type {} from '@const-ai/client-ui-layout/client'
import type {} from '@const-ai/client-connection/client'
import { AutomationsRoot } from './AutomationsRoot.tsx'

export { AutomationsRoot } from './AutomationsRoot.tsx'

export const inject = ['slots', 'connection', 'sessions']

export function apply(ctx: ClientContext): void {
  ctx.slots.inject('shell.overlay', () => ctx.slots.register(
    { name: 'shell.overlay', id: 'automations' },
    () => React.createElement(AutomationsRoot, { ctx }),
  ))
}
