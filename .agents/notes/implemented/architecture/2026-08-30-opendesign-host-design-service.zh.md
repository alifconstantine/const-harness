# Agent Note: 原生 OpenDesign 集成 — Host DesignService 与 RPC 契约

Status: implemented

[English](2026-08-30-opendesign-host-design-service.md) | 中文

## 问题

先前的 OpenDesign 集成依赖于包装外部 CLI 进程与未打包的文件系统资产，导致子进程启动延迟、跨操作系统（特别是 Windows 路径与 UTF-8 BOM 编码）脆弱性，以及缺少类型安全的 RPC 边界校验。Harness 需要通过统一的 `ApiProxy` 网关，对 153 个品牌设计系统、114 个入门模板和 13 个 craft 规范进行原生内存索引。

## 决策

**1. 静态资产打包与内存缓存。** 将全部 153 个品牌设计系统、114 个入门模板、13 个 craft 规范以及 162 个 Agent 技能直接打包至 `packages/host/apiproxy/assets/` 与 `.agents/skills/` 中。`DesignService` 在首次读取时于内存中同步扫描并索引 manifest，实现亚毫秒级检索。

**2. 类型安全的 `DesignApi` RPC 领域。** 在 `design.ts` 中定义 5 个标准 RPC 方法（`design.systems`、`design.systemDetail`、`design.templates`、`design.templateDetail`、`design.craftGuideline`），在 `design.schema.ts` 中通过 Zod 模式校验（`satisfies z.ZodType<Wire<T>>`），并注册进 `RpcMethodMap`、`UNARY_VALUE_SCHEMAS` 与 `UNARY_ROUTES`。

**3. 健壮的 UTF-8 BOM 与跨平台文件读取。** 所有文本读取器在进行 JSON 或 markdown 解析前显式去除 UTF-8 BOM（`\ufeff`），确保在 Windows 和 POSIX 主机上具备确定性行为。

## 结果

- 完整的品牌规范（`DESIGN.md`、`tokens.css`、`design-tokens.json`、`components.html`、`tailwind-v4.css`、`USAGE.md`）和入门模板 HTML 可通过标准 RPC 立即访问，无外部进程开销。
- `design-service.spec.ts` 中全部 12 个单元测试通过，400 个 host apiproxy 测试、453 个 client 测试、全仓 typecheck 和 linter 全部通过。

## 考虑过的替代方案

- **基于子进程的 CLI 调用** — 因子进程启动开销和 Windows 进程沙箱限制而被否决。
- **每次 RPC 调用时动态扫描文件系统** — 否决；采用初次扫描后的内存缓存以获得 $<1\text{ms}$ 的响应速度。
