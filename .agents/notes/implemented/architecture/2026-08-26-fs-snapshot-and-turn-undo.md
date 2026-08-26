# Agent Note: Git Shadow Snapshot Engine and Turn Undo/Rollback Lifecycle

Status: implemented

English | [中文](2026-08-26-fs-snapshot-and-turn-undo.zh.md)

## Problem

When an agent performs modifications in a workspace across multiple turns, users frequently need visibility into what files were produced/modified during each turn, interactive file diff review, and the ability to undo a turn.

Previously:
1. There was no zero-cost, persistent filesystem snapshot mechanism tracking turn-level workspace mutations.
2. Undoing or rolling back a turn lacked complete lifecycle coordination: file mutations on disk had to be reverted to the exact pre-turn snapshot, the undone turn (user input prompt and assistant output) had to be truncated from the active transcript, and the user prompt had to be restored into the chat composer for immediate editing or resubmission.
3. The conversation deliverable UI lacked a unified preview card with inline diff statistics, language badges, and quick rollback/review triggers.

## Decision

1. **`@const-ai/fs-snapshot` Workspace Package:**
   - Implement `ShadowGit` utilizing bare shadow Git repositories stored in `~/.const/snapshots/<projectId>/<worktreeHash>`.
   - Provide `SnapshotService` (`ctx.snapshot`) registered in the Cordis microkernel.
   - Automatically record pre-turn (`turn/start`) and post-turn (`turn/end`) snapshot trees and structured diffs via `ctx.on('session/event')`.
   - Implement `ctx.snapshot.rollbackTurn(sessionId, turn, worktree)` to restore modified files on disk to pre-turn states.

2. **Turn Undo / Revert Coordination:**
   - Expose `rollbackTurn(turn: number)` on `ISession` / `SessionFace` and `ConversationController`.
   - When Undo is triggered on a turn (via `ProducedFiles` card or `↶` Restore Prompt button on the user message):
     1. Disk file modifications made during that turn are reverted to the pre-turn tree.
     2. The session event log is truncated to before the undone turn, and `ConversationNodeAssembler.replaceWindow` immediately removes the undone turn's messages and cards from the active chat view.
     3. The user's input prompt text (and draft images) is restored into `inputHub.shell(sessionId).setDraft(...)` for editing.

3. **Changed Files Preview & Review UI (`@const-ai/client-ui-deliverables`):**
   - Provide `ProducedFiles` card showing `⌵ {count} files changed +{add} -{del}` and `↶ Undo` on the right.
   - File rows render language badges (CSS purple, React cyan, TS blue, JS yellow, PY green), file path, inline `+add -del` stats, and `[Review]`, `[Open ⌵]` buttons.
   - Provide `DiffReviewModal` and sidebar review panel tab.

## Consequences

- Users have deterministic, instantaneous turn undo with zero data loss (the undone prompt is preserved in the composer).
- Workspace files are cleanly restored without leaving unstaged git artifacts or polluting the user's project git repository.
- Complete type safety across client runtime and UI components under monorepo strict gates.

## Alternatives considered

- **In-workspace git commits / stash** — rejected because creating temporary commits or branches inside the user's repository pollutes repository history, git hooks, and status output.
- **File copy backup directories** — rejected because copying whole directory trees is prohibitive for large workspaces; shadow git bare repositories provide instantaneous deduplicated content hashing.
