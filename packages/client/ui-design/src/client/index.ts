import React from 'react'
import type { ClientContext } from '@const-ai/client-runtime/client'
import type {} from '@const-ai/client-ui-slots'
import type {} from '@const-ai/client-ui-layout/client'
import type {} from '@const-ai/client-connection/client'
import type {} from '@const-ai/client-locale/client'
import { DesignRoot } from './DesignRoot.tsx'
import { en, NS, zh } from './locales.ts'

export { DesignRoot } from './DesignRoot.tsx'
export { DesignHome } from './DesignHome.tsx'
export { FigmaImportModal } from './FigmaImportModal.tsx'
export { PluginPickerPopover } from './PluginPickerPopover.tsx'
export { DesignSystemPickerPopover } from './DesignSystemPickerPopover.tsx'
export { CreateDesignSystemModal } from './CreateDesignSystemModal.tsx'

export const inject = ['slots', 'connection', 'sessions', 'workspaces']

export function apply(ctx: ClientContext): void {
  ctx.inject(['locale'], (scope) => {
    scope.effect(() => scope.locale.register(NS, { zh, en }), 'ui-design: dictionaries')
  })

  ctx.slots.inject('shell.overlay', () => ctx.slots.register(
    { name: 'shell.overlay', id: 'design' },
    () => React.createElement(DesignRoot, { ctx }),
  ))
}
