# Agent 记录：非破坏性会话与文件回滚

Status: implemented

[English](2026-08-27-non-destructive-session-and-file-rollback.md) | 中文

## 问题

之前回滚轮次时会销毁（dispose）活动的 agent 句柄，并通过 `ctx.agents.resume()` 重新创建会话。销毁步骤会触发 `session/disposed`，导致通过 SSE 发送 `host/session-removed` 帧，使 Web 客户端陷入“Session unavailable”的不可用状态。同时，`PersistenceCoordinator.prepare` 会因为会话 ID 仍在存储区与退出队列中跟踪而拒绝重新创建会话。此外，轮次快照元数据此前仅保留在易失性内存中，服务器重启或重新加载后将丢失所有回滚能力。

## 决定

回滚流程现变更为严格的非破坏性模式：
1. 活动的 agent 会被取消（`agent.cancel`），而不会销毁其活动句柄或触发 `session/disposed`。
2. 内存中的会话通过 `Session.truncate(toSeq)` 就地截断，重置派生消息和 surface 管理器投影。
3. 持久化存储后端通过 `SessionPersistence.truncate(id, events)` 截断存储的事件日志，而不会逐出活动会话身份。
4. `SnapshotService` 将轮次快照记录（`beforeTreeId`、`afterTreeId`、`diffs`）持久化到磁盘清单文件（`~/.const/snapshots/.../sessions/<sessionId>.json`）并完整恢复工作区。
5. 客户端轮次导航与行内提示词编辑在提交替换轮次前与宿主回滚响应异步同步。

## 考虑过的替代方案

**异步销毁并重新创建 agent fiber。** 这仍会触发 `session/disposed`，并需要客户端重新连接并重新绑定活动订阅，存在事件竞态和 UI 闪烁风险。

**仅在会话事件负载中存储快照。** 扩展事件定义会带来向后兼容性要求，并重复 shadow Git 层已管理的树元数据。

## 影响

轮次回滚和消息编辑可以在不发生会话重启、连接断开或记录损坏的情况下正常执行。快照历史跨服务器重启保持持久，Web 客户端能够无缝反映还原后的状态。
