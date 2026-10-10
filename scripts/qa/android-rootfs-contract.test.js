"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join, resolve } = require("node:path");
const runtime = join(resolve(__dirname,"../.."), "android/app/src/main/java/com/bossbayu/aiteam/runtime");
const validator = readFileSync(join(runtime, "RootfsShellValidator.kt"), "utf8");
const workstation = readFileSync(join(runtime, "WorkstationManager.kt"), "utf8");
const proot = readFileSync(join(runtime, "PRootManager.kt"), "utf8");

test("CP16 Alpine and PRoot share a host-safe guest shell validator", () => {
  assert.match(validator, /Os\.readlink\(shell\.absolutePath\)/);
  assert.match(validator, /link == "\/bin\/busybox" \|\| link == "busybox"/);
  assert.match(validator, /File\(root, "bin\/busybox"\)\.isFile/);
  assert.match(workstation, /RootfsShellValidator\.hasShell\(root\)/);
  assert.match(workstation, /check\(hasAlpineShell\(staging\)\)/);
  assert.match(workstation, /return hasAlpineShell\(alpineDir\) &&/);
  assert.match(proot, /require\(RootfsShellValidator\.hasShell\(rootfsDir\)\)/);
  assert.doesNotMatch(proot, /require\(File\(rootfsDir, "bin\/sh"\)\.isFile\)/);
});
