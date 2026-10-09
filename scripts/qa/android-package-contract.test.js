"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync, existsSync } = require("node:fs");
const { join, resolve } = require("node:path");

const root = resolve(__dirname, "../..");
const build = readFileSync(join(root, "android/app/build.gradle.kts"), "utf8");
const server = readFileSync(join(root, "server.js"), "utf8");

test("CP16 Android package includes every source-owned backend JavaScript import", () => {
  const localImports = [...server.matchAll(/require\(\s*["'](\.[^"']+)["']\s*\)/g)]
    .map((match) => match[1]);
  assert.ok(localImports.length > 0, "no local imports discovered");
  for (const localImport of localImports) {
    const full = resolve(root, localImport);
    assert.ok([full, full + ".js", join(full, "index.js")].some(existsSync), `missing source: ${localImport}`);
    const folder = localImport.split("/")[1];
    const expected = `from(repoRoot.resolve("${folder}")) { into("server/${folder}") }`;
    assert.ok(build.includes(expected), `missing APK asset mapping for ${localImport}`);
  }
});

test("CP16 backend entrypoints and web assets are packaged", () => {
  for (const asset of [
    'from(repoRoot.resolve("server.js")) { into("server") }',
    'from(repoRoot.resolve("cli.js")) { into("server") }',
    'from(repoRoot.resolve("web")) { into("web") }',
  ]) assert.ok(build.includes(asset), `missing asset mapping: ${asset}`);
});
