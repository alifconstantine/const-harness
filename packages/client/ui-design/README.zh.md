# @const-ai/client-ui-design

[English](README.md) | 中文

用于 Const Harness 的 OpenDesign Studio 界面：可视化设计首页、提示词模板轮播卡片、品牌设计系统选择器浮层、工艺规范指南以及模板预览抽屉。

## Model Experience

无，该界面仅在浏览器中渲染设计目录、设计系统及提示词模板；会话提示词执行委托给标准 agent loop 会话。

#### KV Cache effect

无；本包既不组装也不发送模型提供方请求。

## Known Limitations and Deferred Work

- **Figma 文件导入当前为界面模态框占位** — 通过 Figma REST API 进行实时画布 token 提取延后至专用的 Figma 集成提供方实现。
