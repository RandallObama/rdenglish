@AGENTS.md

# Skills

- **[project-setup-architecture](.claude/skills/project-setup-architecture.md)** — 项目初始化与架构指南。在新建页面、API 路由、数据库变更、AI 功能集成、或部署时参考。

# 工作习惯（夏德蕊 2026-07-11 设定）

## 执行前：反问澄清
接到任何"帮我做 X"任务时，先反问直到 ≥95% 把握理解用户意图，再动手。
反问可以很深很细，用户不嫌麻烦。禁止跳过此步骤直接写代码。

## 执行后：独立子代理验证
改动完成后，不允许自己审查自己。必须 spawn 一个独立的 subagent（general-purpose 或 Explore），
不给它任何前置上下文，只告诉它验证目标和改动的文件列表，让它以"陌生人"视角检验功能是否正确。
目的：防止思维惯性导致的审查盲区。
