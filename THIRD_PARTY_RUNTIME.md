# Third-Party Runtime Provenance

This file records the exact third-party runtime inputs used by WhatsApp AI Team v2.
It is a build/provenance record, not a replacement for upstream license texts.

## Managed AI engines

### OpenAI Codex CLI

- Project version: `0.160.1`
- Upstream package: `@openai/codex`
- Android ARM64 package: `@openai/codex@0.160.1-linux-arm64`
- Android x86_64 package: `@openai/codex@0.160.1-linux-x64`
- ARM64 npm integrity SHA-512 (base64):
  `JLyjBlmjPvwTaicHemw+y5xQSz3Uja2r7F/xkvS8gFufTA2g132Ak+0fo35xnJ/k2uc9fTtjm0LrsEGI78L6Ng==`
- x86_64 npm integrity SHA-512 (base64):
  `sIDhqV+bsZKKVaVFVY5iB+pAzyOz2XRm3H1KXCsSJwGj5p98qnrT0Fweo1Hfe7WnyTp8mfBNdbVzUeO+mHYugA==`
- Package metadata license: Apache-2.0
- Android provisioning downloads the pinned archive on demand, verifies SHA-512,
  then keeps the musl Codex core and required static helpers inside the app-private
  Alpine rootfs. glibc-only bundled `rg` / `zsh` payloads are not used;
  Alpine-native packages provide those tools instead.

### OpenCode CLI

- Project version: `2.0.24`
- Android ARM64 package: `@opencode/cli-linux-arm64-musl@2.0.24`
- Android x86_64 package: `@opencode/cli-linux-x64-musl@2.0.24`
- ARM64 npm integrity SHA-512 (base64):
  `DfL6bISz9udxWU5AIEocMjDLnpgtWGfx5sw7fXKpLUhBFhsjdBOkCrBYuDBFuPwJoe5VJPdF+A/OoTfe+Wi6XA==`
- x86_64 npm integrity SHA-512 (base64):
  `PK2cEuioc9181iPYtwzLC4XqBjKMTjcO/5PNOvpM41mEgsyPTYfhX+IqgYcgvNEK1BPp/8oAl62xkMgBSxlupg==`
- Package metadata license: MIT
- Android provisioning downloads the pinned archive on demand, verifies SHA-512,
  and installs only the device ABI inside the app-private Alpine rootfs.

### Antigravity

Antigravity is intentionally **not** a managed v2 engine and is not bundled in
the Android runtime. v2 does not provide Antigravity authentication, automatic
execution, or an Antigravity API surface.

The application's terminal is general-purpose and user-controlled; that does
not make Antigravity part of the managed runtime.

## Embedded Node.js runtime

### nodejs-mobile

- Runtime release: `digidem/nodejs-mobile 24.20.0-0`
- Embedded Node.js: `24.20.0`
- Android release archive SHA-256:
  `f5ffbaf4f2679fa9180b0758c637c2f8fc8828300f95129badf213a028fb37bb`
- ABIs packaged by v2: `arm64-v8a`, `x86_64`
- v2 independently checks that packaged `libnode.so` LOAD segments are
  compatible with 16 KB pages.
- Node is loaded from APK native libraries through `NodeBridge` / JNI; no Node
  executable is copied to writable app storage.

## Linux workstation

### Alpine Linux minirootfs

- Alpine version: `3.24.2`
- aarch64 official minirootfs SHA-256:
  `9bf70a7f18ea44094cbb5f70c58f9af129c8214745743db0e68e5502cc2ce773`
- x86_64 official minirootfs SHA-256:
  `c5ca053cfe1d85c5b96dff8b9bc57045f7f184a30ffb6b65776409ca90388677`
- The Gradle build verifies these digests before packaging.
- The app extracts the rootfs with Commons Compress into a staging directory,
  validates paths, handles links, verifies `/bin/sh`, and only then activates it.
- First-boot guest packages may include `ca-certificates`, `libstdc++`,
  `ripgrep`, `zsh`, `git`, `bash`, and `curl`. Those packages retain
  their own Alpine/upstream licenses.

### PRoot

- PRoot version: `5.1.107.96`
- Source/recipe family: Termux PRoot / termux-packages
- Source archive SHA-256:
  `75f654fe60dea92dabff2bf083ae8bfe4f91baa6a1a374786a6bf391015eebaa`
- Built specifically with Android package prefix:
  `/data/data/com.bossbayu.aiteam/files/usr`
- ABIs: `arm64-v8a`, `x86_64`
- PRoot executable and loader are stored in the APK native-library area.
- Runtime is dynamically linked to private `libtalloc_v2.so` and
  `libandroid-shmem.so` rather than statically absorbing those libraries.
- The private talloc SONAME is rewritten to `libtalloc_v2.so` and PRoot's
  NEEDED entry is rewritten accordingly to avoid versioned-SO packaging issues.
- PRoot and its native payloads were checked for 16 KB-compatible LOAD alignment.
- Termux package metadata identifies its PRoot package as GPL-2.0. Review the
  exact upstream source license notices before redistribution.

### talloc

- Version: `2.5.0`
- Source archive SHA-256:
  `912afa237510ae542a7733998eb18a12bcda35ab6729c8e2ddb43e8d0ebab007`
- Packaged as private dynamic library `libtalloc_v2.so`.
- License obligations are governed by the exact upstream talloc source notices
  used for this build. The Termux package recipe metadata should also be
  reviewed as part of release compliance.

### libandroid-shmem

- Version: `0.7`
- Source archive SHA-256:
  `1e5ff8459bc0a8c229dd8a94b27d119987e09ef3414331c2b5ebfff20b98e867`
- Packaged as private dynamic library `libandroid-shmem.so`.
- Termux package metadata identifies the package as BSD-3-Clause.

## Archive extraction

### Apache Commons Compress

- Version: `1.28.0`
- Used by the Android app to extract verified tar/gzip runtime archives safely.
- License: Apache-2.0.

## Android build baseline

- Android app version: `2.0.0`
- minSdk: `26`
- compileSdk: `36`
- targetSdk: `36`
- JDK: `17`
- Android Gradle Plugin: `8.13.2`
- Gradle: `8.13`
- NDK: `27.0.12077973`
- CMake: `3.22.1`
- Supported packaged ABIs: `arm64-v8a`, `x86_64`
- `runtimeAbi` selects one ABI per APK and defaults to `arm64-v8a`.
- Use `-PruntimeAbi=x86_64` for an x86_64 APK.
- Managed AI engine archives are provisioned on device and are not embedded in the base APK.
- CI verifies `lintDebug`, `assembleDebug`, and APK `zipalign -P 16`.

## Distribution rule

The repository's Apache-2.0 license covers original project code only where
applicable. It does not relicense bundled third-party runtime components.
Before a public or commercial release, preserve required license texts/notices
and satisfy the redistribution/source obligations for the exact packaged
third-party versions.
