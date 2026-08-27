# Agent Note: Non-destructive session and file rollback

Status: implemented

English | [中文](2026-08-27-non-destructive-session-and-file-rollback.zh.md)

## Problem

Rolling back a turn previously disposed of the live agent handle and recreated the session through `ctx.agents.resume()`. The disposal step emitted `session/disposed`, triggering a `host/session-removed` frame over SSE and locking the web client out with a "Session unavailable" state. Concurrently, `PersistenceCoordinator.prepare` rejected session recreation because the session ID was still tracked in the store and retirement queues. Furthermore, turn snapshot metadata was retained only in volatile memory, losing all rollback capabilities on server restart or reload.

## Decision

Rollback transitions are now strictly non-destructive:
1. Active agents are cancelled (`agent.cancel`) without tearing down their live handles or firing `session/disposed`.
2. In-memory sessions are truncated in place via `Session.truncate(toSeq)`, resetting derived message and surface manager projections.
3. Durable persistence backends truncate the stored event log through `SessionPersistence.truncate(id, events)` without evicting live session identity.
4. `SnapshotService` persists turn snapshot records (`beforeTreeId`, `afterTreeId`, `diffs`) to disk manifests (`~/.const/snapshots/.../sessions/<sessionId>.json`) and restores workspaces cleanly.
5. Client turn navigation and inline prompt editing synchronize asynchronously with the host rollback response before submitting replacement turns.

## Alternatives considered

**Dispose and recreate agent fibers asynchronously.** This still fires `session/disposed` and requires clients to reconnect and rebind their active subscriptions, risking event race conditions and UI flickering.

**Store snapshots only in session event payloads.** Expanding event definitions creates backward compatibility requirements and duplicates tree metadata already managed by the shadow Git layer.

## Consequences

Turn rollbacks and message edits succeed without session restarts, disconnection errors, or transcript corruption. Snapshot histories persist across server restarts, and the web client reflects reverted states seamlessly.
