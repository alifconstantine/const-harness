# Agent Note: 原生 OpenDesign 集成 — Host DesignService 与 RPC 约定

Status: implemented

[English](2026-08-30-opendesign-host-design-service.md) | 中文

## Problem

先前的 OpenDesign 集成依赖于包装外部 CLI 子进程与未打包的文件系统资源，导致进程启动延迟、跨操作系统脆弱性（尤其是 Windows 路径解析与 UTF-8 BOM 编码）以及缺少类型安全的 RPC 边界校验。Harness 需要通过统一的 `ApiProxy` 网关，在内存中原生索引 153 个品牌设计系统、114 个初始模板以及 13 个 craft 指南。

## Decision

**1. 打包静态资源与内存缓存。** 所有 153 个品牌设计系统、114 个初始模板、13 个 craft 指南及 162 个 agent 技能均直接打包至 `packages/host/apiproxy/assets/` 与 `.agents/skills/` 中。`DesignService` 在首次读取时同步在内存中扫描并索引清单，实现亚毫秒级检索。

**2. 类型安全的 `DesignApi` RPC 领域。** 在 `design.ts` 中定义了五个标准 RPC 方法（`design.systems`、`design.systemDetail`、`design.templates`、`design.templateDetail`、`design.craftGuideline`），通过 `design.schema.ts` 中的 Zod Schema（`satisfies z.ZodType<Wire<T>>`）进行校验，并接入 `RpcMethodMap`、`UNARY_VALUE_SCHEMAS` 与 `UNARY_ROUTES`。

**3. 具备鲁棒性的 UTF-8 BOM 与跨平台文件读取。** 所有文本读取器在解析 JSON 或 Markdown 之前均显式剥离 UTF-8 BOM（`\ufeff`），确保在 Windows 与 POSIX 主机上表现完全确定。

## Consequences

- 完整的品牌细节（`DESIGN.md`、`tokens.css`、`design-tokens.json`、`components.html`、`tailwind-v4.css`、`USAGE.md`）和初始模板 HTML 可通过标准 RPC 即时访问，无需外部进程开销。
- `design-service.spec.ts` 中的全部 12 个单元测试均通过，同时通过了完整的 host apiproxy 400 个测试套件、453 个客户端测试套件、全库类型检查和 linter。

## Alternatives considered

- **基于子进程的 CLI 调用** — 因子进程启动延迟及 Windows 进程沙盒开销而被否决。
- **每次 RPC 调用时动态扫描文件系统** — 否决，改用初始扫描后驻留内存缓存，以获得 $<1\text{ms}$ 的查询响应时间。
