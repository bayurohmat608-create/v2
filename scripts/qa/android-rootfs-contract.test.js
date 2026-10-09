"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join, resolve } = require("node:path");
const source = readFileSync(join(resolve(__dirname,"../.."), "android/app/src/main/java/com/bossbayu/aiteam/runtime/WorkstationManager.kt"), "utf8");

test("CP16 accepts Alpine guest-absolute shell link without host resolution", () => {
  assert.match(source, /private fun hasAlpineShell\(root: File\): Boolean/);
  assert.match(source, /Os\.readlink\(shell\.absolutePath\)/);
  assert.match(source, /link == "\/bin\/busybox" \|\| link == "busybox"/);
  assert.match(source, /if \(\!busybox\.isFile\) return false/);
  assert.match(source, /check\(hasAlpineShell\(staging\)\)/);
  assert.match(source, /return hasAlpineShell\(alpineDir\) &&/);
  assert.doesNotMatch(source, /check\(shell\.exists\(\)\)/);
});
