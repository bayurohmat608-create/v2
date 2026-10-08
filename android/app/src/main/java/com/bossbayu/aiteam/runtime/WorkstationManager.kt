package com.bossbayu.aiteam.runtime

import android.content.Context
import android.net.ConnectivityManager
import android.os.Build
import android.system.Os
import android.util.Log
import org.apache.commons.compress.archivers.tar.TarArchiveEntry
import org.apache.commons.compress.archivers.tar.TarArchiveInputStream
import org.apache.commons.compress.compressors.gzip.GzipCompressorInputStream
import java.io.File
import java.io.FileOutputStream

/**
 * Manages app-private Linux workstations and the bundled AI engine pack.
 *
 * Alpine and engine archives are checksum-verified by Gradle before packaging.
 * Extraction is staged, path-safe, and never relies on executable files copied
 * from Android writable storage.
 */
class WorkstationManager(private val context: Context) {

    companion object {
        private const val TAG = "WorkstationManager"
        const val WS_ALPINE = "alpine"
        const val WS_UBUNTU = "ubuntu"

        private const val PREFS_NAME = "workstation_prefs"
        private const val KEY_ACTIVE_WS = "active_workstation"

        private const val ALPINE_VERSION = "3.24.2"
        private const val ROOTFS_MARKER = ".rootfs-version"

        private const val CODEX_VERSION = "0.160.1"
        private const val OPENCODE_VERSION = "2.0.24"
        private const val ANTIGRAVITY_VERSION = "1.3.1"
        private const val ENGINE_MARKER = ".engine-pack-version"
        private const val DEPS_MARKER = ".engine-deps-v1"
    }

    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    val workstationsBaseDir: File
        get() = File(context.filesDir, "workstations").apply { mkdirs() }

    val alpineDir: File
        get() = File(workstationsBaseDir, WS_ALPINE)

    val ubuntuDir: File
        get() = File(workstationsBaseDir, WS_UBUNTU)

    val budiWorkspace: File
        get() = File(context.filesDir, "shared_workspaces/budi").apply { mkdirs() }

    val rianWorkspace: File
        get() = File(context.filesDir, "shared_workspaces/rian").apply { mkdirs() }

    var currentWorkstation: String
        get() = prefs.getString(KEY_ACTIVE_WS, WS_ALPINE) ?: WS_ALPINE
        set(value) {
            prefs.edit().putString(KEY_ACTIVE_WS, value).apply()
            Log.d(TAG, "Active workstation switched to: $value")
        }

    private fun alpineArch(): String {
        return when {
            Build.SUPPORTED_ABIS.contains("arm64-v8a") -> "aarch64"
            Build.SUPPORTED_ABIS.contains("x86_64") -> "x86_64"
            else -> throw IllegalStateException(
                "ABI perangkat tidak didukung oleh runtime v2: ${Build.SUPPORTED_ABIS.joinToString()}"
            )
        }
    }

    private fun codexTriple(arch: String): String = when (arch) {
        "aarch64" -> "aarch64-unknown-linux-musl"
        "x86_64" -> "x86_64-unknown-linux-musl"
        else -> error("Unsupported Codex arch: $arch")
    }

    private fun expectedAlpineMarker(): String = "alpine-$ALPINE_VERSION-${alpineArch()}"

    private fun expectedEngineMarker(): String =
        "codex=$CODEX_VERSION;opencode=$OPENCODE_VERSION;antigravity=$ANTIGRAVITY_VERSION;arch=${alpineArch()}"

    fun isAlpineInstalled(): Boolean {
        return File(alpineDir, "bin/sh").isFile &&
            File(alpineDir, ROOTFS_MARKER).readTextOrNull()?.trim() == expectedAlpineMarker()
    }

    fun isEnginePackInstalled(): Boolean {
        return File(alpineDir, "opt/aiteam/engines/$ENGINE_MARKER")
            .readTextOrNull()
            ?.trim() == expectedEngineMarker()
    }

    fun isUbuntuInstalled(): Boolean {
        return ubuntuDir.isDirectory && File(ubuntuDir, "bin/sh").isFile
    }

    fun getActiveRootfs(): File {
        return if (currentWorkstation == WS_UBUNTU && isUbuntuInstalled()) {
            ubuntuDir
        } else {
            alpineDir
        }
    }

    /**
     * Installs/verifies Alpine + bundled engine payloads.
     */
    fun ensureWorkstationsReady() {
        if (!isAlpineInstalled()) {
            Log.i(TAG, "Installing verified Alpine $ALPINE_VERSION rootfs...")
            extractAlpineFromAssets()
        }

        check(isAlpineInstalled()) {
            "Alpine rootfs gagal diverifikasi setelah instalasi."
        }

        if (!isEnginePackInstalled()) {
            installBundledEnginePack(alpineDir, alpineArch())
        }

        configureGuestDns(alpineDir)
        budiWorkspace
        rianWorkspace
    }

    /**
     * Installs small Alpine-native runtime dependencies needed by OpenCode and
     * by Codex search/shell helpers. Failure is recoverable and may be retried.
     */
    fun provisionEngineDependencies(prootManager: PRootManager): Boolean {
        ensureWorkstationsReady()

        val marker = File(alpineDir, "opt/aiteam/$DEPS_MARKER")
        if (marker.isFile) return true

        configureGuestDns(alpineDir)

        val result = prootManager.execute(
            rootfsDir = alpineDir,
            command = listOf(
                "/sbin/apk",
                "add",
                "--no-cache",
                "ca-certificates",
                "libstdc++",
                "ripgrep",
                "zsh",
                "git",
                "bash",
                "curl"
            ),
            budiWorkspace = budiWorkspace,
            rianWorkspace = rianWorkspace,
            environment = mapOf(
                "HOME" to "/root",
                "PATH" to "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
                "LANG" to "C.UTF-8"
            )
        )

        if (!result.isSuccess) {
            Log.w(TAG, "Alpine dependency provisioning failed: ${result.stderr.takeLast(1000)}")
            return false
        }

        marker.parentFile?.mkdirs()
        marker.writeText("ok\n")
        return true
    }

    private fun extractAlpineFromAssets() {
        val arch = alpineArch()
        val assetName = "alpine-minirootfs-$ALPINE_VERSION-$arch.tgz"
        val base = workstationsBaseDir
        val staging = File(base, ".alpine-staging-${System.nanoTime()}")
        val backup = File(base, ".alpine-backup")

        staging.deleteRecursively()
        staging.mkdirs()
        backup.deleteRecursively()

        try {
            extractTarGzAsset(
                assetPath = "rootfs/$assetName",
                targetRoot = staging
            ) { entryName, _ -> entryName }

            File(staging, "tmp").apply {
                mkdirs()
                chmodQuietly(this, 0x3FF) // 01777
            }

            File(staging, "opt/workspaces/budi").mkdirs()
            File(staging, "opt/workspaces/rian").mkdirs()
            File(staging, "opt/aiteam/runtime").mkdirs()

            val shell = File(staging, "bin/sh")
            check(shell.exists()) {
                "Rootfs Alpine hasil ekstraksi tidak memiliki /bin/sh."
            }

            File(staging, ROOTFS_MARKER).writeText(expectedAlpineMarker() + "\n")
            installBundledEnginePack(staging, arch)
            configureGuestDns(staging)

            if (alpineDir.exists()) {
                check(alpineDir.renameTo(backup)) {
                    "Gagal memindahkan rootfs lama ke backup."
                }
            }

            if (!staging.renameTo(alpineDir)) {
                if (backup.exists()) backup.renameTo(alpineDir)
                error("Gagal mengaktifkan rootfs Alpine baru.")
            }

            backup.deleteRecursively()
            Log.i(TAG, "Alpine $ALPINE_VERSION ($arch) rootfs ready.")
        } catch (e: Exception) {
            staging.deleteRecursively()
            if (!alpineDir.exists() && backup.exists()) {
                backup.renameTo(alpineDir)
            }
            Log.e(TAG, "Failed to install Alpine rootfs: ${e.message}", e)
            throw e
        }
    }

    private fun installBundledEnginePack(rootfs: File, arch: String) {
        val aiteamDir = File(rootfs, "opt/aiteam").apply { mkdirs() }
        val staging = File(aiteamDir, ".engines-staging-${System.nanoTime()}")
        val target = File(aiteamDir, "engines")
        val backup = File(aiteamDir, ".engines-backup")
        val binDir = File(aiteamDir, "bin")

        staging.deleteRecursively()
        staging.mkdirs()
        backup.deleteRecursively()

        try {
            val triple = codexTriple(arch)
            val codexRoot = File(staging, "codex/vendor/$triple")

            extractTarGzAsset(
                assetPath = "engines/$arch/codex-$CODEX_VERSION.tgz",
                targetRoot = codexRoot
            ) { entryName, entry ->
                val prefix = "package/vendor/$triple/"
                if (!entryName.startsWith(prefix)) return@extractTarGzAsset null
                val relative = entryName.removePrefix(prefix)

                when {
                    relative == "bin/codex" -> relative
                    relative == "bin/codex-code-mode-host" -> relative
                    relative == "codex-resources/bwrap" -> relative
                    relative == "codex-package.json" -> relative

                    // ARM64 bundled rg/zsh are glibc builds. Both architectures
                    // intentionally use Alpine-native ripgrep/zsh for symmetry.
                    relative.startsWith("codex-path/") -> null
                    relative.startsWith("codex-resources/zsh/") -> null
                    relative.startsWith("codex-resources/voice/") -> null
                    else -> if (entry.isDirectory) relative else null
                }
            }

            extractTarGzAsset(
                assetPath = "engines/$arch/opencode-$OPENCODE_VERSION.tgz",
                targetRoot = File(staging, "opencode")
            ) { entryName, _ ->
                if (entryName == "package/bin/opencode") "bin/opencode" else null
            }

            extractTarGzAsset(
                assetPath = "engines/$arch/antigravity-$ANTIGRAVITY_VERSION.tgz",
                targetRoot = File(staging, "antigravity")
            ) { entryName, _ ->
                if (entryName == "antigravity") "bin/agy" else null
            }

            listOf(
                File(staging, "codex/vendor/$triple/bin/codex"),
                File(staging, "codex/vendor/$triple/bin/codex-code-mode-host"),
                File(staging, "codex/vendor/$triple/codex-resources/bwrap"),
                File(staging, "opencode/bin/opencode"),
                File(staging, "antigravity/bin/agy")
            ).forEach { executable ->
                check(executable.isFile) {
                    "Engine payload tidak lengkap: ${executable.absolutePath}"
                }
                chmodQuietly(executable, 0x1ED) // 0755
            }

            File(staging, ENGINE_MARKER).writeText(expectedEngineMarker() + "\n")

            if (target.exists()) {
                check(target.renameTo(backup)) { "Gagal membuat backup engine pack." }
            }
            if (!staging.renameTo(target)) {
                if (backup.exists()) backup.renameTo(target)
                error("Gagal mengaktifkan engine pack.")
            }
            backup.deleteRecursively()

            binDir.deleteRecursively()
            binDir.mkdirs()
            createRelativeSymlink(
                File(binDir, "codex"),
                "../engines/codex/vendor/$triple/bin/codex"
            )
            createRelativeSymlink(
                File(binDir, "opencode"),
                "../engines/opencode/bin/opencode"
            )
            createRelativeSymlink(
                File(binDir, "agy"),
                "../engines/antigravity/bin/agy"
            )

            Log.i(TAG, "Bundled AI engine pack ready for $arch.")
        } catch (e: Exception) {
            staging.deleteRecursively()
            if (!target.exists() && backup.exists()) backup.renameTo(target)
            throw e
        }
    }

    private fun createRelativeSymlink(link: File, target: String) {
        link.delete()
        link.parentFile?.mkdirs()
        Os.symlink(target, link.absolutePath)
    }

    /**
     * Generic gzip+tar extractor with an entry mapper. Returning null skips an
     * entry. All destination paths are checked against traversal.
     */
    private fun extractTarGzAsset(
        assetPath: String,
        targetRoot: File,
        mapEntry: (String, TarArchiveEntry) -> String?
    ) {
        targetRoot.mkdirs()

        val symlinks = mutableListOf<Pair<File, String>>()
        val hardLinks = mutableListOf<Pair<File, String>>()

        context.assets.open(assetPath).use { raw ->
            GzipCompressorInputStream(raw).use { gzip ->
                TarArchiveInputStream(gzip).use { tar ->
                    var entry = tar.nextEntry as? TarArchiveEntry
                    while (entry != null) {
                        val sourceName = entry.name.removePrefix("./")
                        val mapped = mapEntry(sourceName, entry)

                        if (!mapped.isNullOrBlank()) {
                            val target = safeTarget(targetRoot, mapped)

                            when {
                                entry.isDirectory -> target.mkdirs()

                                entry.isSymbolicLink -> {
                                    target.parentFile?.mkdirs()
                                    symlinks += target to entry.linkName
                                }

                                entry.isLink -> {
                                    target.parentFile?.mkdirs()
                                    hardLinks += target to entry.linkName
                                }

                                entry.isFile -> {
                                    target.parentFile?.mkdirs()
                                    FileOutputStream(target).use { output ->
                                        tar.copyTo(output)
                                    }
                                    chmodQuietly(target, entry.mode)
                                }
                            }
                        }

                        entry = tar.nextEntry as? TarArchiveEntry
                    }
                }
            }
        }

        for ((target, linkName) in hardLinks) {
            val source = safeTarget(targetRoot, linkName.removePrefix("./"))
            check(source.exists()) { "Hardlink source tidak ditemukan: $linkName" }
            target.delete()
            Os.link(source.absolutePath, target.absolutePath)
        }

        for ((target, linkName) in symlinks) {
            target.delete()
            Os.symlink(linkName, target.absolutePath)
        }
    }

    private fun configureGuestDns(rootfs: File) {
        try {
            val connectivity =
                context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            val active = connectivity.activeNetwork ?: return
            val dnsServers = connectivity.getLinkProperties(active)?.dnsServers.orEmpty()
            if (dnsServers.isEmpty()) return

            val resolv = File(rootfs, "etc/resolv.conf")
            resolv.parentFile?.mkdirs()
            resolv.writeText(
                dnsServers.joinToString(separator = "\n", postfix = "\n") {
                    "nameserver ${it.hostAddress}"
                }
            )
        } catch (e: Exception) {
            Log.w(TAG, "Tidak dapat menyinkronkan DNS Android ke rootfs: ${e.message}")
        }
    }

    private fun safeTarget(root: File, archivePath: String): File {
        val normalized = archivePath
            .replace('\\', '/')
            .trimStart('/')

        require(normalized.isNotBlank()) { "Path archive kosong." }
        require(!normalized.split('/').contains("..")) {
            "Path traversal ditolak: $archivePath"
        }

        val target = File(root, normalized)
        val rootPath = root.canonicalFile.absolutePath + File.separator
        val targetPath = target.canonicalFile.absolutePath

        require(targetPath.startsWith(rootPath)) {
            "Entry keluar dari target staging: $archivePath"
        }
        return target
    }

    private fun chmodQuietly(file: File, mode: Int) {
        try {
            Os.chmod(file.absolutePath, mode and 0xFFF)
        } catch (e: Exception) {
            Log.w(TAG, "chmod gagal untuk ${file.absolutePath}: ${e.message}")
        }
    }

    private fun File.readTextOrNull(): String? {
        return try {
            if (isFile) readText() else null
        } catch (_: Exception) {
            null
        }
    }

    fun switchWorkstation(target: String): Boolean {
        if (target == WS_UBUNTU && !isUbuntuInstalled()) {
            Log.w(TAG, "Ubuntu belum diprovisikan pada hardened v2.")
            return false
        }

        if (target == WS_ALPINE) {
            ensureWorkstationsReady()
        }

        currentWorkstation = if (target == WS_UBUNTU) WS_UBUNTU else WS_ALPINE
        return true
    }

    /**
     * Ubuntu remains intentionally disabled until its rootfs and extraction
     * path receives the same per-ABI verification guarantees as Alpine.
     */
    fun installUbuntuWorkstation(onProgress: (percent: Int, status: String) -> Unit): Boolean {
        onProgress(
            -1,
            "Installer Ubuntu belum diaktifkan di hardened v2. Alpine adalah workstation default yang tervalidasi."
        )
        return false
    }
}
