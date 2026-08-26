import React from 'react'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-connection/client'
import { AutomationsRoot } from './AutomationsRoot.tsx'

export { AutomationsRoot } from './AutomationsRoot.tsx'

export const inject = ['slots', 'connection', 'sessions']

export function apply(ctx: ClientContext): void {
  ctx.slots.inject('shell.overlay', () => ctx.slots.register(
    { name: 'shell.overlay', id: 'automations' },
    () => React.createElement(AutomationsRoot, { ctx }),
  ))
}
