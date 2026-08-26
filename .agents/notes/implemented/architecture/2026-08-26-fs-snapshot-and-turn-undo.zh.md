# Agent Note: Git Shadow 快照引擎与轮次撤销/回滚生命周期

状态: implemented

[English](2026-08-26-fs-snapshot-and-turn-undo.md) | 中文

## 问题

当 Agent 在工作区中跨多个轮次进行修改时，用户经常需要查看每轮生成/修改了哪些文件、交互式 Diff 审查以及撤销某一轮操作的能力。

此前：
1. 缺乏零成本、持久化的文件系统快照机制来跟踪轮次级别的工作区修改。
2. 撤销或回滚轮次缺乏完整的生命周期协同：既要将磁盘文件修改回滚到准确的轮前快照，又需从活动会话转录中移除撤销轮次（用户提示词和助手回复），并将用户提示词还原到输入框以便立即修改或重新提交。
3. 对话产出物 UI 缺少包含内联 Diff 统计、语言图标和快速回滚/审查触发器的统一预览卡片。

## 决策

1. **`@const-ai/fs-snapshot` 工作区包：**
   - 实现 `ShadowGit`，利用存储在 `~/.const/snapshots/<projectId>/<worktreeHash>` 的裸 Shadow Git 仓库。
   - 提供在 Cordis 微内核中注册的 `SnapshotService` (`ctx.snapshot`)。
   - 通过 `ctx.on('session/event')` 自动捕获轮前 (`turn/start`) 和轮后 (`turn/end`) 的快照树和结构化 Diff。
   - 实现 `ctx.snapshot.rollbackTurn(sessionId, turn, worktree)` 将磁盘修改文件还原至轮前状态。

2. **轮次撤销 / 回滚协同：**
   - 在 `ISession` / `SessionFace` 及 `ConversationController` 上暴露 `rollbackTurn(turn: number)`。
   - 当在某一轮触发撤销时（通过 `ProducedFiles` 卡片或用户消息上的 `↶` 恢复提示词按钮）：
     1. 该轮产生的磁盘文件修改还原为轮前树。
     2. 会话事件日志截断至被撤销轮次之前，`ConversationNodeAssembler.replaceWindow` 立即从活动聊天视图中移除被撤销轮次的消息与卡片。
     3. 用户输入提示词文本（及草稿图片）还原至 `inputHub.shell(sessionId).setDraft(...)` 以供编辑。

3. **变更文件预览与审查 UI (`@const-ai/client-ui-deliverables`)：**
   - 提供 `ProducedFiles` 卡片，左侧显示 `⌵ {count} files changed +{add} -{del}`，右侧显示 `↶ Undo`。
   - 文件行渲染语言徽章（CSS 紫色、React 青色、TS 蓝色、JS 黄色、PY 绿色）、文件路径、内联 `+add -del` 统计以及 `[Review]` 与 `[Open ⌵]` 按钮。
   - 提供 `DiffReviewModal` 和侧边栏审查面板标签页。

## 影响

- 用户获得确定性、即时的轮次撤销体验，且不会丢失数据（被撤销的提示词保留在输入框中）。
- 工作区文件干净还原，不会遗留未暂存的 Git 产物或污染用户项目的 Git 仓库。
- 在 monorepo 严格门禁下保持客户端运行时和 UI 组件的完整类型安全。

## 备选方案

- **在工作区内执行 git commit / stash** — 已否决，因为在用户仓库内创建临时提交或分支会污染 Git 历史记录、Git Hook 和工作区状态。
- **全量文件拷贝备份** — 已否决，因为完整复制目录树对于大型工作区开销巨大；Shadow Git Bare 仓库提供了瞬时的去重内容哈希与极速恢复能力。
