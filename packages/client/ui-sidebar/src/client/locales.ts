/** `sidebar` namespace dictionaries: shell controls (brand row, New Session, fold toggle). */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'session.new': '新建任务',
  'session.new.label': '新建会话',
  'toggle.open': '打开侧边栏',
  'toggle.collapse': '收起侧边栏',
  'nav.newTask': '新建任务',
  'nav.search': '搜索',
  'nav.design': '设计',
  'nav.automations': '自动化',
  'nav.plugins': '插件市场',
  'nav.mobileRemote': '移动端远程',
} satisfies Record<string, string>

/** The sidebar namespace key union. */
export type SidebarKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'session.new': 'New task',
  'session.new.label': 'New session',
  'toggle.open': 'Open sidebar',
  'toggle.collapse': 'Collapse sidebar',
  'nav.newTask': 'New task',
  'nav.search': 'Search',
  'nav.design': 'Design',
  'nav.automations': 'Automations',
  'nav.plugins': 'Plugin Marketplace',
  'nav.mobileRemote': 'Mobile Remote',
} satisfies Record<SidebarKey, string>
