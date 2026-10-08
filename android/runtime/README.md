# Android native runtime provenance

This directory documents how the Android PRoot runtime committed under
`app/src/main/jniLibs/` was produced. It is intentionally source-reproducible:
the APK does not depend on binaries copied from another installed Android app.

## Pinned sources

- Termux packages commit:
  `d4111603a05238b666bdcbbdb3f9c4f5c9e8d54f`
- PRoot: `5.1.107.96`
- talloc: `2.5.0`
- libandroid-shmem: `0.7`
- target Android package: `com.bossbayu.aiteam`
- build ABIs: `aarch64` and `x86_64`

The Termux build system must be configured with:

```bash
TERMUX_APP__PACKAGE_NAME="com.bossbayu.aiteam"
```

This makes the generated Termux prefix match this app instead of
`/data/data/com.termux/...`.

## Build outline

1. Check out the pinned Termux packages commit.
2. Change `TERMUX_APP__PACKAGE_NAME` in `scripts/properties.sh` to
   `com.bossbayu.aiteam`.
3. Build the PRoot package and its dependencies for each ABI:

   ```bash
   ./build-package.sh -a aarch64 -F proot
   ./build-package.sh -a x86_64 -F proot
   ```

4. Package PRoot's loader separately from the APK native library directory.
   Runtime sets `PROOT_LOADER` to that APK-resident file so PRoot does not
   execute a loader extracted into writable app storage.
5. Keep talloc and libandroid-shmem as private dynamic libraries. Do not
   statically absorb talloc into PRoot.
6. Rename the versioned talloc library for Android native packaging and patch
   the ELF references:

   ```bash
   patchelf --replace-needed libtalloc.so.2 libtalloc_v2.so libproot_exec.so
   patchelf --set-soname libtalloc_v2.so libtalloc_v2.so
   ```

7. Verify every ELF PT_LOAD segment has at least 16 KiB alignment and inspect
   `DT_NEEDED` before committing.

## Expected SHA-256

### arm64-v8a

```text
13dd6d6345d615dac996ce6442346b2d87fa0496859fc1ff378732d943e948a0  libproot_exec.so
d958623a65f7b81be76f075b7ca835fdacca012b099fae960ea34b12b95b6c86  libproot_loader.so
57248fa186289006aa30d4837b569abe1174887e018b5ac90a1abd5c173f5f1f  libtalloc_v2.so
895900c0baa360f0f5be34c9dce8f037442629884e4c8edaf3ec6a3eaaeb73d2  libandroid-shmem.so
```

### x86_64

```text
d011c921efc255dbbe1e1172740ac93ba4c7453b09aee117ce3f950fb0ca9234  libproot_exec.so
00f08f9c0600ca2e13f3cd9c6ee392744555e68ea793271f103151208e97c944  libproot_loader.so
0f966843c1d401bc5070d90ce941d5dad6f181d7fecc0e1933d09415b801eb77  libtalloc_v2.so
6386100b9b334ab371ce0372ceb8d62d78dbc09c361f9de6740110f2bfe066ab  libandroid-shmem.so
```

## Runtime contract

Android executes `libproot_exec.so` via `ProcessBuilder` from
`ApplicationInfo.nativeLibraryDir`. The process receives:

- `PROOT_LOADER=<nativeLibraryDir>/libproot_loader.so`
- `LD_LIBRARY_PATH=<nativeLibraryDir>`
- `PROOT_TMP_DIR=<app cache>/proot-tmp`

The Linux rootfs, workspaces, authentication state, and AI engine payloads may
live in app-private writable storage, but executable Android-native PRoot code
and its loader remain APK-native files.

See the repository `NOTICE` for third-party license/provenance information.
