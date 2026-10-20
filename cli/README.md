# toffu

CLI for [Toffu](https://toffu.ai), the AI marketing agent. Check ad performance,
change campaigns, build reports, or delegate any marketing task from your
terminal or from a local agent (Claude Code, Codex, OpenClaw, Hermes).

```bash
npx toffu signup --company "Acme"     # account + key, no human needed
npx toffu call get_account_context    # rules and connected accounts: call first
npx toffu ask "Which Google campaigns spent over \$500 in 14 days with zero conversions?"
```

## Commands

| Command | What it does |
|---|---|
| `toffu signup [--company <name>] [--email <new email>]` | Create an account and save the key. `--email` lets a human claim it later. |
| `toffu login <api_key>` | Save an existing key. |
| `toffu ask "<task>" [--session <id>]` | Delegate any task and wait for the answer. Pass `--session` to continue. |
| `toffu tools` | List tools. |
| `toffu help <tool>` | Show a tool's arguments. |
| `toffu call <tool> [--arg value ...] [--json '{...}']` | Call a tool directly. |

Writes are two-step: `propose_change` returns a preview, `apply_change` runs it,
`undo_change` reverts it within 24h.

## Config

- `TOFFU_API_KEY`: key (overrides the saved one).
- `TOFFU_CONFIG`: config file, default `~/.config/toffu/config.json` (mode 600).
- `TOFFU_BASE_URL`: server, default `https://mcp.toffu.ai`.

Agents without a shell (ChatGPT, Claude web) connect to the MCP endpoint
`https://mcp.toffu.ai/mcp` instead. See the [repo README](../README.md).
