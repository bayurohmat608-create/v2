package com.bossbayu.aiteam.runtime

import android.content.Context
import android.os.Environment
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream

/**
 * BootstrapInstaller — Mengelola ekstraksi pertama kali dari aset APK ke
 * sandbox data internal aplikasi Android (/data/data/com.bossbayu.aiteam/files/).
 */
class BootstrapInstaller(private val context: Context) {

    interface InstallCallback {
        fun onProgress(percent: Int, message: String)
        fun onComplete()
        fun onError(error: String)
    }

    val baseFilesDir: File = context.filesDir
    val serverDir: File = File(baseFilesDir, "server")
    val webDir: File = File(baseFilesDir, "web")
    val enginesDir: File = File(baseFilesDir, "engines")
    val workspacesDir: File = File(baseFilesDir, "shared_workspaces")
    val budiWorkspace: File = File(workspacesDir, "budi")
    val rianWorkspace: File = File(workspacesDir, "rian")
    val publicDownloadsDir: File = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "AITeam")

    fun isInstalled(): Boolean {
        val serverJs = File(serverDir, "server.js")
        val indexHtml = File(webDir, "index.html")
        return serverJs.exists() && indexHtml.exists()
    }

    fun installAsync(callback: InstallCallback) {
        Thread {
            try {
                callback.onProgress(10, "Menyiapkan direktori penyimpanan lokal...")
                serverDir.mkdirs()
                webDir.mkdirs()
                enginesDir.mkdirs()
                budiWorkspace.mkdirs()
                rianWorkspace.mkdirs()
                if (!publicDownloadsDir.exists()) publicDownloadsDir.mkdirs()

                callback.onProgress(30, "Mengekstrak aset Web App WhatsApp v3.2...")
                copyAssetFolder("web", webDir)

                callback.onProgress(60, "Mengekstrak file server backend & konfigurasi...")
                copyAssetFolder("server", serverDir)

                callback.onProgress(85, "Menyiapkan perizinan biner AI engine...")
                copyAssetFolder("engines", enginesDir)
                enginesDir.listFiles()?.forEach { file ->
                    file.setExecutable(true, false)
                    file.setReadable(true, false)
                }

                callback.onProgress(100, "Instalasi selesai!")
                callback.onComplete()
            } catch (e: Exception) {
                callback.onError(e.message ?: "Gagal melakukan bootstrap instalasi")
            }
        }.start()
    }

    private fun copyAssetFolder(assetPath: String, targetDir: File) {
        val assetManager = context.assets
        val files = assetManager.list(assetPath) ?: return

        if (files.isEmpty()) {
            // Leaf file
            copyAssetFile(assetPath, File(targetDir.parentFile, File(assetPath).name))
        } else {
            if (!targetDir.exists()) targetDir.mkdirs()
            for (filename in files) {
                val subAsset = if (assetPath.isEmpty()) filename else "$assetPath/$filename"
                val subTarget = File(targetDir, filename)
                val subFiles = assetManager.list(subAsset)
                if (subFiles != null && subFiles.isNotEmpty()) {
                    copyAssetFolder(subAsset, subTarget)
                } else {
                    copyAssetFile(subAsset, subTarget)
                }
            }
        }
    }

    private fun copyAssetFile(assetPath: String, targetFile: File) {
        var input: InputStream? = null
        var output: FileOutputStream? = null
        try {
            input = context.assets.open(assetPath)
            targetFile.parentFile?.mkdirs()
            output = FileOutputStream(targetFile)
            val buffer = ByteArray(8192)
            var read: Int
            while (input.read(buffer).also { read = it } != -1) {
                output.write(buffer, 0, read)
            }
        } catch (_: Exception) {
            // Fail gracefully if asset not found in bundle
        } finally {
            input?.close()
            output?.close()
        }
    }
}
