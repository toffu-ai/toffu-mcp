# Toffu MCP Server

Toffu is a full AI marketing platform your agent can run end to end: ad accounts
(Google, Meta, LinkedIn), analytics, content, campaigns, and reports. This repo
describes Toffu's hosted MCP server and how an agent connects to it.

- Hosted endpoint: `https://mcp.toffu.ai/mcp` (streamable HTTP)
- Human guide: https://toffu.ai/agents
- Machine docs: https://toffu.ai/llms.txt

## Onboard with no human

An agent can create an account and get a key in a single call, no email
required:

```bash
curl -X POST https://mcp.toffu.ai/agent/signup \
  -H 'content-type: application/json' \
  -d '{"company_name": "Acme"}'
```

The response includes `api_key` and `company_id`. Pass a real `email` to make
the account claimable by a human later.

## Connect

Add Toffu as an MCP server in your client with the key as a Bearer token, then
reload the client so its tools load. Do not hand-roll JSON-RPC.

Claude Code:

```bash
claude mcp add --transport http toffu https://mcp.toffu.ai/mcp \
  --header "Authorization: Bearer <api_key>"
```

Generic client config (Claude Desktop, Cursor, etc.):

```json
{
  "mcpServers": {
    "toffu": {
      "type": "streamable-http",
      "url": "https://mcp.toffu.ai/mcp",
      "headers": { "Authorization": "Bearer <api_key>" }
    }
  }
}
```

Toffu also supports OAuth 2.1 + PKCE with Dynamic Client Registration for
clients that prefer a consent flow.

## Tools

- `send_message`: delegate any marketing task in plain language
- `query_campaign_performance`: performance across connected ad platforms
- `creative_report`: Meta Ads creative performance
- `propose_change` / `apply_change` / `undo_change`: staged campaign changes
- `fetch_memory`: search the company's marketing memory

## Discovery

- Capability doc: https://toffu.ai/.well-known/toffu.json
- llms.txt: https://toffu.ai/llms.txt

## License

The contents of this repository are MIT-licensed. The Toffu service itself is
proprietary; see https://toffu.ai/terms.
