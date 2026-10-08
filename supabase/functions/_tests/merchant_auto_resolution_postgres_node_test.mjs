import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile, readFileSync } from "node:fs";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { webcrypto } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import ts from "typescript";

// Run the same isolated SQL fixtures through Node without invoking Deno.
const sourceUrl = new URL(
  "./merchant-auto-resolution-postgres_test.ts",
  import.meta.url,
);
const root = fileURLToPath(new URL("../../../", import.meta.url));
const source = readFileSync(sourceUrl, "utf8").replaceAll(
  "import.meta.url",
  JSON.stringify(sourceUrl.href),
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const exports = {};
runInNewContext(
  compiled,
  {
    exports,
    URL,
    crypto: webcrypto,
    console,
    Error,
    require: (specifier) => {
      if (specifier === "npm:@electric-sql/pglite@0.3.14") return { PGlite };
      if (specifier.endsWith("/assert/mod.ts"))
        return {
          assertEquals: (actual, expected) =>
            assert.deepStrictEqual(
              structuredClone(actual),
              structuredClone(expected),
            ),
          assertRejects: (operation, errorClass, message) =>
            assert.rejects(operation, (error) => {
              if (errorClass) assert.ok(error instanceof errorClass);
              if (message) assert.ok(error.message.includes(message));
              return true;
            }),
        };
      throw new Error(`Unexpected SQL fixture dependency: ${specifier}`);
    },
    Deno: {
      test,
      readTextFile: async (url) => {
        assert.ok(
          fileURLToPath(url).startsWith(root),
          "SQL fixtures must remain inside this repository",
        );
        return promisify(readFile)(url, "utf8");
      },
    },
  },
  { filename: fileURLToPath(sourceUrl) },
);
