# @const-ai/fs-snapshot

English | [中文](README.zh.md)

Shadow Git snapshot and turn rollback service for workspace files. Maintains an isolated bare Git repository in the user's home state directory (~/.const/snapshots) to capture immutable tree states and roll back turn modifications without polluting the user's actual Git repository history.

The service provides high-performance write-tree captures, structured unified diff computations via diff-tree, and file restoration through checkout-index.

## Model Experience

None, as this package provides host shadow git snapshots and registers no model-facing prompt or tool context.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **Local disk storage** — snapshots reside in the user's home directory and consume disk space proportional to workspace file diffs.
- **Git binary requirement** — requires a working git executable on the system PATH to perform tree and diff operations.
