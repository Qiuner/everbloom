# 永生花 · Everbloom

保存软件时代的切片，记录代码被重新理解的时刻。

当前阶段：记录理念、收集数据，并以静态原型探索网站视觉与交互。

站点：<https://qiuner.github.io/everbloom/>（由 [`prototype/`](prototype/) 经 GitHub Actions 自动部署到 GitHub Pages）。

收集经典软件的开源重实现、兼容项目和公开技术研究，记录来源、实现方式、体积与成熟度。将独立重实现与授权破解分开描述。

本仓库不存放破解程序、补丁、序列号、密钥、下载链接或绕过授权的操作步骤。

## 记录原则

- 只引用公开可访问的原帖、新闻或厂商公告。
- 将“公开声称”与“已验证事实”分开记录。
- 不下载、运行或传播来历不明的软件包。
- 优先记录软件版本、发布日期、原帖时间、作者、证据类型和风险。
- 对涉及未授权复制或分发的内容，使用官方购买渠道或免费替代品作为参考。

## 条目状态

- `unverified`：仅有公开说法，尚未核验。
- `partially-verified`：部分证据可核验，但无法确认完整性或真实性。
- `verified`：有可信的独立证据支持，仍不代表授权分发合法。
- `retracted`：原作者撤回、帖子删除或事实被反驳。

## 目录

- [`PHILOSOPHY.md`](PHILOSOPHY.md)：理念、收录范围，以及留待后续的网站与 SEO/GEO 方向。
- [`LEADS.md`](LEADS.md)：公开来源发现的待核查项目。
- [`claims.csv`](claims.csv)：结构化索引。
- [`CONTRIBUTING.md`](CONTRIBUTING.md)：提交记录的格式和安全边界。
- [`prototype/`](prototype/)：网站视觉原型（首页与 PhotoCraft 标本页）。

## 首个标本：PhotoCraft

项目：[storytold/photocraft](https://github.com/storytold/photocraft)。

- 定位：作者称其为基于公开规格与可观察行为、用纯 Rust 独立实现的 Photoshop 风格图像编辑器；许可证为 MIT / Apache-2.0。这是项目声明，未独立审计其 clean-room 过程。
- 技术：Cargo 工作区包括 PSD、文档、画笔、合成、GPU、自动化及 egui UI 等模块。README 描述了图层、蒙版、调整层、PSD 读写和 CLI / MCP 控制能力。
- 体积：核查时最新发布为 v0.3.0。Web ZIP 为 11,119,388 字节（11.12 MB）；Windows x64 MSI 为 53,895,168 字节（53.90 MB），便携 ZIP 为 65,251,740 字节（65.25 MB）。这些是发布附件大小，不是安装后体积。
- 成熟度：README 明确标注 early alpha，尚不能替代日常专业工作中的 Photoshop。v0.3.0 自评表列出工具项完成 3、部分完成 14、缺失 13，以及 133 个设置中 60 个尚无效果。菜单接通不等于功能完整。
- 判断：现有材料支持“开源重实现项目”的描述，不能据此推断 Adobe 源码被破解或泄露，也不能认定与 Photoshop 完全等价。
- 核验范围：2026-10-07（Pacific/Honolulu）读取 GitHub README、发布附件元数据、v0.3.0 Cargo.toml 和自评表摘要；未安装、编译或运行测试，未定位 X 原帖，未核实 AI 生成代码的比例。

证据：[v0.3.0 发布页](https://github.com/storytold/photocraft/releases/tag/v0.3.0) · [自评表](https://github.com/storytold/photocraft/blob/v0.3.0/docs/scorecard.md) · [Cargo.toml](https://github.com/storytold/photocraft/blob/v0.3.0/Cargo.toml)
