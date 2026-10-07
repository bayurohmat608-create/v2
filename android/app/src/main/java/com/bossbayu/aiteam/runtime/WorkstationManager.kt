package com.bossbayu.aiteam.runtime

import android.content.Context
import android.util.Log
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL

/**
 * Manages dual workstations:
 * 1. Default: Alpine Linux (musl libc, lightweight ~15MB RAM)
 * 2. On-Demand: Ubuntu 24.04 (glibc, full apt repository)
 *
 * Also maintains persistent shared workspaces for Budi and Rian.
 */
class WorkstationManager(private val context: Context) {

    companion object {
        private const val TAG = "WorkstationManager"
        const val WS_ALPINE = "alpine"
        const val WS_UBUNTU = "ubuntu"
        private const val PREFS_NAME = "workstation_prefs"
        private const val KEY_ACTIVE_WS = "active_workstation"

        // Official Ubuntu 24.04 minimal rootfs mirror for ARM64
        const val UBUNTU_ARM64_ROOTFS_URL = 
            "https://cloud-images.ubuntu.com/minimal/releases/noble/release/ubuntu-24.04-minimal-cloudimg-arm64-root.tar.xz"
    }

    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    val workstationsBaseDir: File
        get() = File(context.filesDir, "workstations").apply { mkdirs() }

    val alpineDir: File
        get() = File(workstationsBaseDir, WS_ALPINE).apply { mkdirs() }

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

    fun isUbuntuInstalled(): Boolean {
        return ubuntuDir.exists() && File(ubuntuDir, "bin/sh").exists()
    }

    fun getActiveRootfs(): File {
        return if (currentWorkstation == WS_UBUNTU && isUbuntuInstalled()) {
            ubuntuDir
        } else {
            alpineDir
        }
    }

    /**
     * Ensures default Alpine rootfs and persistent workspaces are initialized.
     */
    fun ensureWorkstationsReady() {
        if (!File(alpineDir, "bin/sh").exists()) {
            Log.d(TAG, "Initializing default Alpine Linux workstation...")
            extractAlpineFromAssets()
        }
        budiWorkspace
        rianWorkspace
    }

    private fun extractAlpineFromAssets() {
        try {
            // Check if bundled alpine archive exists in assets
            val assetList = context.assets.list("rootfs") ?: emptyArray()
            val alpineArchive = assetList.firstOrNull { it.contains("alpine") }
            if (alpineArchive != null) {
                val input = context.assets.open("rootfs/$alpineArchive")
                val destFile = File(context.cacheDir, alpineArchive)
                destFile.outputStream().use { input.copyTo(it) }

                // Unpack tar archive into alpineDir
                unpackArchive(destFile, alpineDir)
                destFile.delete()
                Log.d(TAG, "Alpine Linux rootfs extracted successfully.")
            } else {
                // If not pre-bundled in assets during dev, initialize minimal directory structure
                createMinimalRootfs(alpineDir)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to extract Alpine rootfs: ${e.message}", e)
            createMinimalRootfs(alpineDir)
        }
    }

    /**
     * Switches the active workstation between Alpine and Ubuntu.
     */
    fun switchWorkstation(target: String): Boolean {
        if (target == WS_UBUNTU && !isUbuntuInstalled()) {
            Log.w(TAG, "Cannot switch to Ubuntu: not installed yet.")
            return false
        }
        currentWorkstation = if (target == WS_UBUNTU) WS_UBUNTU else WS_ALPINE
        return true
    }

    /**
     * Downloads and installs Ubuntu minimal rootfs on-demand.
     */
    fun installUbuntuWorkstation(onProgress: (percent: Int, status: String) -> Unit): Boolean {
        return try {
            onProgress(0, "Mempersiapkan unduhan Ubuntu 24.04 ARM64...")
            val downloadDest = File(context.cacheDir, "ubuntu-rootfs.tar.xz")

            val url = URL(UBUNTU_ARM64_ROOTFS_URL)
            val connection = url.openConnection() as HttpURLConnection
            connection.connectTimeout = 15000
            connection.readTimeout = 30000
            val totalBytes = connection.contentLength

            var downloadedBytes = 0
            connection.inputStream.use { input ->
                FileOutputStream(downloadDest).use { output ->
                    val buffer = ByteArray(8192)
                    var bytesRead: Int
                    while (input.read(buffer).also { bytesRead = it } != -1) {
                        output.write(buffer, 0, bytesRead)
                        downloadedBytes += bytesRead
                        if (totalBytes > 0) {
                            val percent = (downloadedBytes * 80 / totalBytes)
                            onProgress(percent, "Mengunduh Ubuntu: ${downloadedBytes / (1024 * 1024)}MB / ${totalBytes / (1024 * 1024)}MB")
                        }
                    }
                }
            }

            onProgress(85, "Mengekstrak sistem operasi Ubuntu...")
            ubuntuDir.mkdirs()
            unpackArchive(downloadDest, ubuntuDir)
            downloadDest.delete()

            onProgress(100, "Ubuntu 24.04 LTS Berhasil Terpasang!")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to install Ubuntu workstation: ${e.message}", e)
            onProgress(-1, "Gagal menginstal Ubuntu: ${e.message}")
            false
        }
    }

    private fun unpackArchive(archiveFile: File, targetDir: File) {
        // Run tar -x via local runtime or process builder
        val process = ProcessBuilder("tar", "-xf", archiveFile.absolutePath, "-C", targetDir.absolutePath)
            .start()
        process.waitFor()
    }

    private fun createMinimalRootfs(dir: File) {
        File(dir, "bin").mkdirs()
        File(dir, "usr/bin").mkdirs()
        File(dir, "etc").mkdirs()
        File(dir, "tmp").mkdirs()
    }
}
