/** `deliverables` namespace dictionaries. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'deliverables'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'produced.label': '产物',
  'produced.moreOne': '+ 1 个文件',
  'produced.more': '+ {count} 个文件',
  'produced.open': '打开 {name}',
  'produced.showInFolder': '在文件夹中显示',
  'produced.filesChanged': '{count} 个文件已更改',
  'produced.fileChanged': '1 个文件已更改',
  'produced.review': '审查',
  'produced.reviewTitle': '审查文件修改',
  'produced.revert': '回滚修改',
  'produced.revertConfirm': '确定要回滚本轮的所有文件修改吗？',
  'produced.revertSuccess': '已成功回滚修改',
}

/** English dictionary (same key set). */
export const en: Record<DeliverablesKey, string> = {
  'produced.label': 'Produced',
  'produced.moreOne': '+ 1 file',
  'produced.more': '+ {count} files',
  'produced.open': 'Open {name}',
  'produced.showInFolder': 'Show in folder',
  'produced.filesChanged': '{count} files changed',
  'produced.fileChanged': '1 file changed',
  'produced.review': 'Review',
  'produced.reviewTitle': 'Review Changes',
  'produced.revert': 'Revert Changes',
  'produced.revertConfirm': 'Are you sure you want to revert changes from this turn?',
  'produced.revertSuccess': 'Changes successfully reverted',
}

/** Union of this namespace's dictionary keys. */
export type DeliverablesKey = keyof typeof zh

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Produced-files row copy. */
    'deliverables': DeliverablesKey
  }
}
