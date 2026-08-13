# dsh-superpowers

[English](README.md) | 中文

![dsh-superpowers banner](assets/banner.png)

[![npm 版本](https://img.shields.io/npm/v/dsh-superpowers?style=flat-square&logo=npm)](https://www.npmjs.com/package/dsh-superpowers)
[![npm 下载量](https://img.shields.io/npm/dm/dsh-superpowers?style=flat-square&logo=npm)](https://www.npmjs.com/package/dsh-superpowers)
[![许可](https://img.shields.io/npm/l/dsh-superpowers?style=flat-square)](LICENSE)
[![Node.js](https://img.shields.io/node/v/dsh-superpowers?style=flat-square&logo=node.js)](https://nodejs.org/)

[dsh-superpowers](https://github.com/codeAnqiang-ma/dsh-superpowers) 为 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 提供 [obra/superpowers](https://github.com/obra/superpowers) 适配。它注册 14 个覆盖需求澄清、任务规划、TDD、调试与代码审查的技能，并让 `using-superpowers` bootstrap 在整个会话中保持生效。

## 目录

- [安装](#安装)
- [它做了什么](#它做了什么)
- [验证](#验证)
- [配置](#配置)
- [开销](#开销)
- [环境要求](#环境要求)
- [上游与许可](#上游与许可)

## 安装

### 从 npm 安装（推荐）

```sh
dsh plugin --profile web add dsh-superpowers
```

### 从 GitHub 安装

```sh
dsh plugin --profile web add "github:codeAnqiang-ma/dsh-superpowers#master"
```

执行任一命令后，先停止再重启 `dsh web`。如果要安装到其他形态，可把 `web` 换成 `headless` 或自定义 profile 名，并重启对应形态。

## 它做了什么

- 在 `ctx.skills` 注册全部 14 个 Superpowers 技能。它们会出现在技能目录中，并通过原生 `skill` 工具加载；不会往 `~/.dsh/skills` 复制任何文件。
- 把 `using-superpowers` bootstrap 注册为 `superpowers:bootstrap` 提示词段落，order 为 50。它在第一条请求中生效，并能在上下文压缩后继续存在，因为它属于系统提示词，不是一次性会话消息。
- 将 `Task`、`TodoWrite`、`Bash`/`Read`/`Write`/`Edit` 等 Claude Code 风格工具名映射到 DeepSeek Harness 对应工具。映射中也会说明当前环境不提供 hooks 与斜杠命令。

## 验证

先确认插件已挂载到 profile：

```sh
dsh --profile web --dump-config
```

输出中应包含 `id: superpowers`，其后是 `name: dsh-superpowers`。

然后新建会话并提出一个功能需求。Agent 应先探查，再给出问题或设计，不会立即开始写代码。工具调用中应出现 `skill`。

## 配置

所有字段均为可选项，可在 profile 自己的 `cordis.patch.yml` 中覆盖：

```yaml
- id: superpowers
  config:
    bootstrap: false
```

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `skills` | `true` | 把内置技能注册到 `ctx.skills`。 |
| `bootstrap` | `true` | 注册 `using-superpowers` 提示词段落。 |
| `toolMapping` | `true` | 在 bootstrap 段落中追加 DeepSeek Harness 工具映射。 |
| `order` | `50` | 把 bootstrap 放在 persona（0）之后、工具指导（100–199）之前。 |

设置 `bootstrap: false` 后，技能仍可被发现，但不会再自动触发；模型只会在自己决定查询技能目录时使用它们。

## 开销

bootstrap 会给每次请求的系统提示词增加约 1.1k token（4,465 字符）。这段内容是静态的，位于缓存前缀内，不会在每一轮作为新的聊天消息追加。设置 `bootstrap: false` 可以保留技能，同时去掉这份固定提示词开销。

## 环境要求

- DeepSeek Harness `0.1.0-rc.6` 及以上
- Node.js 22.19+ 或 24+
- 零运行时依赖；插件只通过 `ctx` 访问提示词与技能注册表

## 上游与许可

`skills/` 下的技能原样取自 [obra/superpowers](https://github.com/obra/superpowers) v6.3.0，对应 commit [`b36e082`](https://github.com/obra/superpowers/commit/b36e0829c6d0140e93cfef2ca599b1b07d4a7797)，未做修改；`package.json` 记录了确切的上游版本与 commit。技能行为问题请提交到[上游仓库](https://github.com/obra/superpowers/issues)，打包问题请提交到[本仓库](https://github.com/codeAnqiang-ma/dsh-superpowers/issues)。

`brainstorming` 的可选视觉组件会从上游网站加载带 Superpowers 版本号的 logo，不包含项目或提示词内容。把 `SUPERPOWERS_DISABLE_TELEMETRY` 设为任一 true 值即可关闭。

这里同时适用两份 MIT 许可声明：适配器版权归其贡献者所有，依据 [LICENSE](LICENSE) 许可；内置技能版权归 Jesse Vincent 与 Superpowers 贡献者所有，依据 [LICENSE.superpowers](LICENSE.superpowers) 许可。
