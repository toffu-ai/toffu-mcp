#!/usr/bin/env node
import { main } from "../src/cli.js";

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (e) => { console.error(`toffu: ${e.message}`); process.exit(1); },
);
