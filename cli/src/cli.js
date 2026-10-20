import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const BASE_URL = (process.env.TOFFU_BASE_URL || "https://mcp.toffu.ai").replace(/\/$/, "");
const CONFIG_PATH = process.env.TOFFU_CONFIG || join(homedir(), ".config", "toffu", "config.json");
const POLL_MS = Number(process.env.TOFFU_POLL_MS || 15000);

const USAGE = `toffu: run your ads and marketing through Toffu, the AI marketing agent.

Usage:
  toffu signup [--company <name>] [--email <new email>]   create an account, save the key
  toffu login <api_key>                                    save an existing key
  toffu ask "<task>" [--session <id>]                      delegate any marketing task, wait for the answer
  toffu tools                                              list tools
  toffu help <tool>                                        show a tool's arguments
  toffu call <tool> [--arg value ...] [--json '<object>']  call a tool directly

Start with:  toffu call get_account_context
Examples:
  toffu ask "Which Google campaigns spent over $500 in 14 days with zero conversions?"
  toffu call query_campaign_performance --json '{"date_range":"last_7d"}'

Key: TOFFU_API_KEY, or the one saved by signup/login in ${CONFIG_PATH}
Docs: https://toffu.ai/agents`;

export function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) { positional.push(a); continue; }
    const eq = a.indexOf("=");
    const key = eq > 2 ? a.slice(2, eq) : a.slice(2);
    let value;
    if (eq > 2) value = a.slice(eq + 1);
    else if (i + 1 < argv.length && !argv[i + 1].startsWith("--")) value = argv[++i];
    else value = true;
    flags[key] = value;
  }
  return { positional, flags };
}

// Flag values are strings; coerce each to the type the tool's schema declares.
export function buildToolArgs(flags, schema = {}) {
  const props = schema.properties || {};
  const args = flags.json ? JSON.parse(flags.json) : {};
  for (const [key, raw] of Object.entries(flags)) {
    if (key === "json") continue;
    const type = props[key]?.type;
    const types = Array.isArray(type) ? type : [type];
    if (raw === true) args[key] = true;
    else if (types.includes("integer") || types.includes("number")) args[key] = Number(raw);
    else if (types.includes("boolean")) args[key] = raw === "true";
    else if (types.includes("array") || types.includes("object")) args[key] = JSON.parse(raw);
    else args[key] = raw;
  }
  return args;
}

async function loadKey() {
  if (process.env.TOFFU_API_KEY) return process.env.TOFFU_API_KEY;
  try {
    return JSON.parse(await readFile(CONFIG_PATH, "utf8")).api_key;
  } catch {
    return undefined;
  }
}

async function saveKey(apiKey, extra = {}) {
  await mkdir(dirname(CONFIG_PATH), { recursive: true, mode: 0o700 });
  await writeFile(CONFIG_PATH, JSON.stringify({ api_key: apiKey, ...extra }, null, 2), { mode: 0o600 });
}

async function connect() {
  const key = await loadKey();
  if (!key) throw new Error("No API key. Run `toffu signup` or `toffu login <api_key>`, or set TOFFU_API_KEY.");
  const transport = new StreamableHTTPClientTransport(new URL(`${BASE_URL}/mcp`), {
    requestInit: { headers: { Authorization: `Bearer ${key}` } },
  });
  const client = new Client({ name: "toffu-cli", version: "0.1.0" });
  await client.connect(transport);
  return client;
}

function resultText(result) {
  const text = (result.content || [])
    .map((c) => (c.type === "text" ? c.text : `[${c.type}]`))
    .join("\n");
  return text || JSON.stringify(result.structuredContent ?? result, null, 2);
}

function parseJson(text) {
  try { return JSON.parse(text); } catch { return undefined; }
}

async function findTool(client, name) {
  const { tools } = await client.listTools();
  const tool = tools.find((t) => t.name === name);
  if (!tool) throw new Error(`Unknown tool "${name}". Run \`toffu tools\`.`);
  return tool;
}

async function signup(flags, out) {
  const body = { agent_name: "toffu-cli" };
  if (flags.company) body.company_name = flags.company;
  if (flags.email) body.email = flags.email;
  const res = await fetch(`${BASE_URL}/agent/signup`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.api_key) throw new Error(data.error || data.message || `Signup failed (HTTP ${res.status})`);
  await saveKey(data.api_key, { company_id: data.company_id });
  out(`Signed up. Company ${data.company_id}. Key saved to ${CONFIG_PATH}.`);
  if (data.claim_url) out(`A human can claim the account at ${data.claim_url}`);
  out("Next: toffu call get_account_context");
}

async function ask(client, message, flags, out, err) {
  const args = { message };
  if (flags.session) args.session_id = String(flags.session);
  let text = resultText(await client.callTool({ name: "send_message", arguments: args }));
  let data = parseJson(text);
  while (data?.status === "working" && data.session_id) {
    if (data.response) err(data.response);
    await new Promise((r) => setTimeout(r, POLL_MS));
    text = resultText(await client.callTool({ name: "get_task_result", arguments: { session_id: data.session_id } }));
    data = parseJson(text);
  }
  if (data && typeof data === "object" && "response" in data) {
    out(data.response);
    if (data.session_id) err(`\n(session ${data.session_id}: continue with --session ${data.session_id})`);
  } else {
    out(text);
  }
  if (data?.success === false) throw new Error(data.error || "Toffu returned an error");
}

export async function main(argv, { out = console.log, err = console.error } = {}) {
  const { positional, flags } = parseArgs(argv);
  const [cmd, ...rest] = positional;

  if (!cmd) { out(USAGE); return 0; }
  if (cmd === "signup") { await signup(flags, out); return 0; }
  if (cmd === "login") {
    if (!rest[0]) throw new Error("Usage: toffu login <api_key>");
    await saveKey(rest[0]);
    out(`Key saved to ${CONFIG_PATH}.`);
    return 0;
  }

  const known = ["tools", "help", "call", "ask"];
  if (!known.includes(cmd)) { err(`Unknown command "${cmd}".\n`); out(USAGE); return 1; }
  if (cmd === "help" && !rest[0]) { out(USAGE); return 0; }

  const client = await connect();
  try {
    if (cmd === "tools") {
      const { tools } = await client.listTools();
      for (const t of tools) out(`${t.name.padEnd(28)} ${(t.description || "").split("\n")[0]}`);
      out("\nDetails: toffu help <tool>");
    } else if (cmd === "help") {
      const tool = await findTool(client, rest[0]);
      out(`${tool.name}\n\n${tool.description || ""}\n\nArguments:`);
      const props = tool.inputSchema?.properties || {};
      const required = new Set(tool.inputSchema?.required || []);
      if (!Object.keys(props).length) out("  (none)");
      for (const [k, v] of Object.entries(props)) {
        const type = v.type || (v.anyOf ? v.anyOf.map((x) => x.type).filter(Boolean).join("|") : "any");
        out(`  --${k} <${type}>${required.has(k) ? " (required)" : ""}${v.description ? `  ${v.description}` : ""}`);
      }
      out(`\nPass objects or arrays as JSON, or all arguments at once with --json '{...}'.`);
    } else if (cmd === "call") {
      if (!rest[0]) throw new Error("Usage: toffu call <tool> [--arg value ...] [--json '{...}']");
      const tool = await findTool(client, rest[0]);
      const result = await client.callTool({ name: tool.name, arguments: buildToolArgs(flags, tool.inputSchema) });
      out(resultText(result));
      if (result.isError) return 1;
    } else if (cmd === "ask") {
      const message = rest.join(" ");
      if (!message) throw new Error('Usage: toffu ask "<task>"');
      await ask(client, message, flags, out, err);
    }
  } finally {
    await client.close();
  }
  return 0;
}
