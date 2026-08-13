# dsh-superpowers

English | [中文](README.zh.md)

![dsh-superpowers banner](assets/banner.png)

[![npm version](https://img.shields.io/npm/v/dsh-superpowers?style=flat-square&logo=npm)](https://www.npmjs.com/package/dsh-superpowers)
[![npm downloads](https://img.shields.io/npm/dm/dsh-superpowers?style=flat-square&logo=npm)](https://www.npmjs.com/package/dsh-superpowers)
[![license](https://img.shields.io/npm/l/dsh-superpowers?style=flat-square)](LICENSE)
[![Node.js](https://img.shields.io/node/v/dsh-superpowers?style=flat-square&logo=node.js)](https://nodejs.org/)

**Bring [obra/superpowers](https://github.com/obra/superpowers) to [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness): 14 software-development skills for brainstorming, planning, TDD, debugging, and code review, kept active throughout the session by a native bootstrap.**

## Contents

- [Installation](#installation)
- [What it does](#what-it-does)
- [Verification](#verification)
- [Configuration](#configuration)
- [Overhead](#overhead)
- [Requirements](#requirements)
- [Upstream and license](#upstream-and-license)

## Installation

### From npm (recommended)

```sh
dsh plugin --profile web add dsh-superpowers
```

### From GitHub

```sh
dsh plugin --profile web add "github:codeAnqiang-ma/dsh-superpowers#master"
```

After either command, stop and restart `dsh web`. Replace `web` with `headless` or a custom profile name when installing for a different surface, then restart that surface instead.

## What it does

- **Registers all 14 Superpowers skills.** The bundled skills are registered on `ctx.skills`, appear in the skill catalog, and load through the native `skill` tool. Nothing is copied into `~/.dsh/skills`.
- **Installs a compaction-safe bootstrap.** The `using-superpowers` bootstrap is registered as the `superpowers:bootstrap` prompt section at order 50. It is present on the first request and survives context compaction because it is part of the system prompt rather than a one-off session message.
- **Maps Superpowers tools to DeepSeek Harness.** The bootstrap maps Claude Code-style names such as `Task`, `TodoWrite`, and `Bash`/`Read`/`Write`/`Edit` to their DeepSeek Harness equivalents and explains that hooks and slash commands are not available.

## Verification

Check that the plugin is present in the profile:

```sh
dsh --profile web --dump-config
```

The output should contain `id: superpowers` followed by `name: dsh-superpowers`.

Then start a new session and ask for a feature. A working installation makes the agent explore first and return with questions or a design instead of immediately writing code; `skill` should also appear in its tool calls.

## Configuration

Every field is optional. Override fields in the profile's own `cordis.patch.yml`:

```yaml
- id: superpowers
  config:
    bootstrap: false
```

| Field | Default | Description |
| --- | --- | --- |
| `skills` | `true` | Register the bundled skills on `ctx.skills`. |
| `bootstrap` | `true` | Register the `using-superpowers` prompt section. |
| `toolMapping` | `true` | Append the DeepSeek Harness tool mapping to the bootstrap section. |
| `order` | `50` | Place the bootstrap after the persona (0) and before tool guidance (100–199). |

Setting `bootstrap: false` keeps the skills discoverable but stops them from self-triggering; the model will use them only when it decides to consult the catalog.

## Overhead

The bootstrap adds roughly 1.1k tokens (4,465 characters) to the system prompt of each request. The section is static and stays within the cached prefix, rather than being appended as a new chat message on every turn. To keep the skills without this fixed prompt overhead, set `bootstrap: false`.

## Requirements

- DeepSeek Harness `0.1.0-rc.6` or newer
- Node.js 22.19+ or 24+
- Zero runtime dependencies; the plugin reaches the prompt and skill registries through `ctx`

## Upstream and license

The skills under `skills/` are vendored unmodified from [obra/superpowers](https://github.com/obra/superpowers) v6.3.0 at commit [`b36e082`](https://github.com/obra/superpowers/commit/b36e0829c6d0140e93cfef2ca599b1b07d4a7797). The exact upstream version and commit are recorded in `package.json`. Report skill-behavior issues to the [upstream repository](https://github.com/obra/superpowers/issues) and packaging issues to [this repository](https://github.com/codeAnqiang-ma/dsh-superpowers/issues).

The optional visual companion in `brainstorming` loads an upstream-hosted logo containing the Superpowers version. It sends no project or prompt content. Set `SUPERPOWERS_DISABLE_TELEMETRY` to a true value to disable it.

Two MIT license notices apply: the adapter is © its contributors under [LICENSE](LICENSE), while the bundled skills are © Jesse Vincent and the Superpowers contributors under [LICENSE.superpowers](LICENSE.superpowers).
