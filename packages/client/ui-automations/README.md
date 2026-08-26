# @const-ai/client-ui-automations

English | [中文](README.zh.md)

Scheduled automations UI feature package: provides dashboard, task creation form, execution history, and cron configuration views for scheduled tasks. Interacts with the host automations API to manage recurring background tasks and inspect execution logs.

The component supports creating scheduled tasks with customizable recurrence frequencies (hourly, daily, weekdays, weekly, monthly, and custom intervals), configuring permission presets, and binding executions to target workspace directories.

## Model Experience

None, as this package is browser-side UI and registers nothing model-facing.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **Client-only triggering** — automation execution is driven by the host process; if the host is stopped, scheduled intervals are evaluated upon the next startup.
- **Single active execution per task** — overlapping executions of the same automation task are prevented; concurrent runs must wait for the preceding session to conclude.
