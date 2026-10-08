package com.bossbayu.aiteam.runtime

import android.content.Context
import android.os.Build
import android.system.Os
import android.util.Log
import org.apache.commons.compress.archivers.tar.TarArchiveEntry
import org.apache.commons.compress.archivers.tar.TarArchiveInputStream
import org.apache.commons.compress.compressors.gzip.GzipCompressorInputStream
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL

/**
 * Manages app-private Linux workstations.
 *
 * Alpine is bundled as an official verified minirootfs and extracted without
 * relying on a host "tar" executable. Extraction is staged and validated
 * before replacing the active rootfs.
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

        const val UBUNTU_ARM64_ROOTFS_URL =
            "https://cloud-images.ubuntu.com/minimal/releases/noble/release/ubuntu-24.04-minimal-cloudimg-arm64-root.tar.xz"
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

    private fun expectedAlpineMarker(): String = "alpine-$ALPINE_VERSION-${alpineArch()}"

    fun isAlpineInstalled(): Boolean {
        return File(alpineDir, "bin/sh").isFile &&
            File(alpineDir, ROOTFS_MARKER).readTextOrNull()?.trim() == expectedAlpineMarker()
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
     * Ensures the default Alpine rootfs and persistent workspaces exist.
     */
    fun ensureWorkstationsReady() {
        if (!isAlpineInstalled()) {
            Log.i(TAG, "Installing verified Alpine $ALPINE_VERSION rootfs...")
            extractAlpineFromAssets()
        }

        check(isAlpineInstalled()) {
            "Alpine rootfs gagal diverifikasi setelah instalasi."
        }

        budiWorkspace
        rianWorkspace
    }

    private fun extractAlpineFromAssets() {
        val arch = alpineArch()
        val assetName = "alpine-minirootfs-$ALPINE_VERSION-$arch.tgz"
        val assetPath = "rootfs/$assetName"
        val base = workstationsBaseDir
        val staging = File(base, ".alpine-staging-${System.nanoTime()}")
        val backup = File(base, ".alpine-backup")

        staging.deleteRecursively()
        staging.mkdirs()
        backup.deleteRecursively()

        val symlinks = mutableListOf<Pair<File, String>>()
        val hardLinks = mutableListOf<Pair<File, String>>()

        try {
            context.assets.open(assetPath).use { raw ->
                GzipCompressorInputStream(raw).use { gzip ->
                    TarArchiveInputStream(gzip).use { tar ->
                        var entry: TarArchiveEntry? = tar.nextEntry as? TarArchiveEntry
                        while (entry != null) {
                            val name = entry.name.removePrefix("./")
                            if (name.isNotBlank()) {
                                val target = safeTarget(staging, name)

                                when {
                                    entry.isDirectory -> {
                                        target.mkdirs()
                                        chmodQuietly(target, entry.mode)
                                    }

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
                val source = safeTarget(staging, linkName.removePrefix("./"))
                check(source.exists()) {
                    "Hardlink source tidak ditemukan: $linkName"
                }
                target.delete()
                Os.link(source.absolutePath, target.absolutePath)
            }

            for ((target, linkName) in symlinks) {
                target.delete()
                Os.symlink(linkName, target.absolutePath)
            }

            File(staging, "tmp").apply {
                mkdirs()
                chmodQuietly(this, 0x3FF) // 01777: world-writable temp with sticky bit.
            }

            val shell = File(staging, "bin/sh")
            check(shell.exists()) {
                "Rootfs Alpine hasil ekstraksi tidak memiliki /bin/sh."
            }

            File(staging, ROOTFS_MARKER).writeText(expectedAlpineMarker() + "\n")

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
            "Entry keluar dari rootfs staging: $archivePath"
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
            Log.w(TAG, "Cannot switch to Ubuntu: not installed yet.")
            return false
        }

        if (target == WS_ALPINE) {
            ensureWorkstationsReady()
        }

        currentWorkstation = if (target == WS_UBUNTU) WS_UBUNTU else WS_ALPINE
        return true
    }

    /**
     * Ubuntu remains opt-in. It is intentionally not used as the default v2
     * runtime until the architecture-specific rootfs path is hardened equally.
     */
    fun installUbuntuWorkstation(onProgress: (percent: Int, status: String) -> Unit): Boolean {
        if (!Build.SUPPORTED_ABIS.contains("arm64-v8a")) {
            onProgress(-1, "Ubuntu on-demand saat ini hanya diverifikasi untuk ARM64.")
            return false
        }

        return try {
            onProgress(0, "Mempersiapkan unduhan Ubuntu 24.04 ARM64...")
            val downloadDest = File(context.cacheDir, "ubuntu-rootfs.tar.xz")

            val connection = URL(UBUNTU_ARM64_ROOTFS_URL)
                .openConnection() as HttpURLConnection
            connection.connectTimeout = 15000
            connection.readTimeout = 30000
            val totalBytes = connection.contentLengthLong

            var downloadedBytes = 0L
            connection.inputStream.use { input ->
                FileOutputStream(downloadDest).use { output ->
                    val buffer = ByteArray(64 * 1024)
                    var bytesRead: Int
                    while (input.read(buffer).also { bytesRead = it } != -1) {
                        output.write(buffer, 0, bytesRead)
                        downloadedBytes += bytesRead
                        if (totalBytes > 0) {
                            val percent = (downloadedBytes * 80 / totalBytes).toInt()
                            onProgress(
                                percent,
                                "Mengunduh Ubuntu: ${downloadedBytes / (1024 * 1024)}MB / ${totalBytes / (1024 * 1024)}MB"
                            )
                        }
                    }
                }
            }

            // Hardened v2 does not execute a host tar binary from app storage.
            // Keep the download for a future verified XZ extractor path.
            downloadDest.delete()
            onProgress(
                -1,
                "Installer Ubuntu belum diaktifkan di hardened v2. Alpine adalah workstation default yang tervalidasi."
            )
            false
        } catch (e: Exception) {
            downloadDestCleanup()
            Log.e(TAG, "Failed to prepare Ubuntu workstation: ${e.message}", e)
            onProgress(-1, "Gagal menyiapkan Ubuntu: ${e.message}")
            false
        }
    }

    private fun downloadDestCleanup() {
        File(context.cacheDir, "ubuntu-rootfs.tar.xz").delete()
    }
}
