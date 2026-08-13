# dsh-plugin-superpowers

[Superpowers](https://github.com/obra/superpowers) for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).

Superpowers is a software-development methodology for coding agents: instead of jumping straight into code, the agent asks what you are actually trying to build, turns it into a reviewed design, writes a plan of bite-sized tasks, and implements them under red/green TDD with code review between tasks. Upstream ships adapters for Claude Code, Codex, Cursor, Gemini CLI, Kimi Code, OpenCode, Pi, Hermes and more. This plugin is the DeepSeek Harness one.

中文说明见 [README.zh.md](README.zh.md)。

## Install

```sh
dsh plugin --profile <name> add dsh-plugin-superpowers
```

Use `web`, `headless`, or any custom profile name, then restart that surface.

## What it does

- **Registers all 14 Superpowers skills** on `ctx.skills`, so they appear in the skill catalog and load through the native `skill` tool. Nothing is copied into your `~/.dsh/skills`.
- **Registers the `using-superpowers` bootstrap as a prompt section** (`superpowers:bootstrap`, order 50). Because it is part of the system prompt rather than a one-off message, it is present on the first request and survives context compaction — no session-start hook required.
- **Adds a DeepSeek Harness tool mapping** to that section. Superpowers is written for several harnesses and names Claude Code's PascalCase tools; the mapping tells the model that `Task` is `subagent`, `TodoWrite` is `todo_write`, `Bash`/`Read`/`Write`/`Edit` are their lowercase equivalents, and that hooks and slash commands do not exist here.

## Verify

Start a session and ask for a feature. A working install makes the agent explore first and come back with questions or a design instead of writing code immediately, and `skill` appears in its tool calls.

To see the bootstrap in the request itself:

```sh
dsh --profile <name> --dump-config
```

The output should contain `id: superpowers` followed by `name: dsh-plugin-superpowers`.

## Configuration

Every field is optional. Override them in the profile's own `cordis.patch.yml`:

```yaml
- id: superpowers
  config:
    bootstrap: false
```

| Field | Default | Meaning |
|---|---|---|
| `skills` | `true` | Register the bundled skills on `ctx.skills`. |
| `bootstrap` | `true` | Register the `using-superpowers` prompt section. |
| `toolMapping` | `true` | Append the DeepSeek Harness tool mapping to that section. |
| `order` | `50` | Prompt order of the bootstrap section: after the persona (0), before tool guidance (100–199). |

Turning `bootstrap` off leaves the skills discoverable but no longer self-triggering — the model then uses them only when it decides to consult the catalog.

## Cost

The bootstrap section adds roughly 1.1k tokens (4,465 characters) to the system prompt of every request. It is static, so it stays inside the cached prefix; it is not re-sent per turn as a message. If you want the skills without that fixed cost, set `bootstrap: false`.

## Requirements

DeepSeek Harness `0.1.0-rc.6` or newer, Node 22.19+/24+. The plugin has no runtime dependencies — it reaches the prompt and skill registries through `ctx` alone.

## Upstream

Skills are vendored from [obra/superpowers](https://github.com/obra/superpowers) v6.3.0 (`b36e082`), unmodified. `package.json` records the exact upstream version and commit under the `superpowers` key. Skill content and methodology are upstream's work; report skill-behavior issues there, and packaging issues here.

The optional visual companion in `brainstorming` loads an upstream-hosted logo with the Superpowers version (no project or prompt content); set `SUPERPOWERS_DISABLE_TELEMETRY` to disable it.

## License

MIT. The adapter is © its contributors; the bundled skills under `skills/` are © Jesse Vincent and the Superpowers contributors, distributed under the MIT license in [LICENSE.superpowers](LICENSE.superpowers).
