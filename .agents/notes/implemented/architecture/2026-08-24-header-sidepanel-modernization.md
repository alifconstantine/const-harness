# Agent Note: Session Header and Side Panel Companion UI Modernization

Status: implemented

English | [中文](2026-08-24-header-sidepanel-modernization.zh.md)

## Problem

The previous conversation session header displayed a standalone subheader tab bar toggling between Chat and Trajectory in the primary scroll column, while the companion side panel offered a rigid three-tab layout. User interactions required faster workspace context (project/folder identification), quick session task operations (renaming, path and ID copying, explorer reveal, session log download), direct interactive shell/terminal access, and a flexible multi-tab companion workspace that accommodates trajectory inspections, code reviews, web browsing, and tasks.

## Decision

1. **Session Header Chrome**:
   - Replaced the subheader Chat/Trajectory bar with a unified single-row header containing hierarchical session crumbs, a project folder badge (displaying the workspace title or `Default`), an ellipsis (`···`) menu with session actions (rename task, open in file explorer, copy paths/IDs, view trajectory, export session log), the standard agent preset chip, a direct Terminal launcher button, and a Side Panel toggle button.
2. **Companion Side Panel Multi-Tab System**:
   - Introduced a stateful multi-tab system in `DetailsPanel` with tab pills, tab closure (`×`), panel collapse (`⌄`), and an add-tab action (`+`).
   - Added an "Open tab" chooser view when no tabs are active, allowing users to choose between Side conversation, Trajectory, Review, Terminal, and Browser.
   - Added an interactive Terminal console view with PowerShell styling and working directory prompt matching the active session's `cwd`.
