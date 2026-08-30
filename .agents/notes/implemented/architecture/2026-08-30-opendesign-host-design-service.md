# Agent Note: Native OpenDesign integration — Host DesignService and RPC contract

Status: implemented

English | [中文](2026-08-30-opendesign-host-design-service.zh.md)

## Problem

The previous OpenDesign integration relied on wrapping external CLI processes and unbundled filesystem assets, leading to process spawning latency, fragility across operating systems (especially Windows pathing and UTF-8 BOM encoding), and lack of type-safe RPC boundary validation. The harness requires native, in-memory indexing of 153 brand design systems, 114 starter templates, and 13 craft guidelines through the unified `ApiProxy` gateway.

## Decision

**1. Bundled static assets with in-memory caching.** All 153 brand design systems, 114 starter templates, 13 craft guidelines, and 162 agent skills are packaged directly into `packages/host/apiproxy/assets/` and `.agents/skills/`. `DesignService` scans and indexes manifests synchronously/in-memory on first read with sub-millisecond retrieval.

**2. Type-safe `DesignApi` RPC domain.** Five standard RPC methods (`design.systems`, `design.systemDetail`, `design.templates`, `design.templateDetail`, `design.craftGuideline`) are defined in `design.ts`, verified via Zod schemas in `design.schema.ts` (`satisfies z.ZodType<Wire<T>>`), and wired into `RpcMethodMap`, `UNARY_VALUE_SCHEMAS`, and `UNARY_ROUTES`.

**3. Resilient UTF-8 BOM and cross-platform file reading.** All text readers explicitly strip UTF-8 BOM (`\ufeff`) before JSON or markdown parsing to guarantee deterministic behavior across Windows and POSIX hosts.

## Consequences

- Full brand details (`DESIGN.md`, `tokens.css`, `design-tokens.json`, `components.html`, `tailwind-v4.css`, `USAGE.md`) and starter template HTML are instantly accessible via standard RPCs without external process overhead.
- All 12 unit tests in `design-service.spec.ts` pass, along with the full 400-test host apiproxy suite, 453-test client suite, full repo typecheck, and linter.

## Alternatives considered

- **Subprocess-based CLI invocation** — rejected due to subprocess startup latency and Windows process sandbox overhead.
- **Dynamic filesystem scanning on every RPC call** — rejected in favor of in-memory caching after initial scan for $<1\text{ms}$ query response times.
