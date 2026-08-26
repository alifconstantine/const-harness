# @const-ai/fs-snapshot

[English](README.md) | 中文

工作区文件的 Shadow Git 快照与轮次代码回滚服务。在用户主状态目录（~/.const/snapshots）中维护独立的 Bare Git 仓库，捕获不可变的 Tree 状态，实现对轮次修改的一键回滚，且不污染用户项目本身的 Git 提交历史。

本服务提供基于 write-tree 的高性能快照捕获、基于 diff-tree 的结构化 Diff 计算，以及通过 checkout-index 恢复工作区文件。

## Model Experience

无，本包提供宿主端 Shadow Git 快照服务，未注册任何面向模型的提示词或工具上下文。

#### KV Cache effect

无；本包既不组装也不发送任何提供商请求。

## Known Limitations and Deferred Work

- **本地磁盘占用** — 快照保存在用户主目录中，占用与工作区变更量成比例的存储空间。
- **系统 Git 依赖** — 需要系统 PATH 中存在可用的 git 可执行文件以执行底层 Tree 与 Diff 操作。
