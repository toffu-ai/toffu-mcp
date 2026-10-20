import assert from "node:assert/strict";
import { test } from "node:test";
import { buildToolArgs, parseArgs } from "../src/cli.js";

test("parseArgs splits positionals from --flag value and --flag=value", () => {
  const { positional, flags } = parseArgs(["call", "x", "--a", "1", "--b=two words", "--dry"]);
  assert.deepEqual(positional, ["call", "x"]);
  assert.deepEqual(flags, { a: "1", b: "two words", dry: true });
});

test("buildToolArgs coerces flag strings to the schema types", () => {
  const schema = { properties: {
    limit: { type: "integer" }, ok: { type: "boolean" },
    ids: { type: "array" }, name: { type: "string" }, n: { type: ["number", "null"] },
  } };
  const args = buildToolArgs({ limit: "5", ok: "false", ids: '["1","2"]', name: "7", n: "2.5" }, schema);
  assert.deepEqual(args, { limit: 5, ok: false, ids: ["1", "2"], name: "7", n: 2.5 });
});

test("buildToolArgs lets explicit flags override --json", () => {
  const args = buildToolArgs({ json: '{"a":"x","b":1}', a: "y" }, { properties: { a: { type: "string" } } });
  assert.deepEqual(args, { a: "y", b: 1 });
});
