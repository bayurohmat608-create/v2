package com.bossbayu.aiteam.kadb

import android.content.Context
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.BufferedReader
import java.io.File
import java.io.InputStreamReader

/**
 * KadbManager — Mengadopsi arsitektur Wireless ADB dari Droide (Bay Studio).
 * Mengizinkan eksekusi shell tingkat lanjut (UID 2000 / shell privilege) pada Android 11+
 * tanpa perlu root ataupun kabel PC.
 */
class KadbManager(private val context: Context) {

    companion object {
        private const val TAG = "KadbManager"
        const val PREFS_NAME = "kadb_prefs"
        const val KEY_PORT = "adb_port"
        const val KEY_IS_CONNECTED = "is_connected"
    }

    data class CommandResult(
        val exitCode: Int,
        val stdout: String,
        val stderr: String
    )

    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    var currentPort: Int
        get() = prefs.getInt(KEY_PORT, 5555)
        set(value) = prefs.edit().putInt(KEY_PORT, value).apply()

    var isConnected: Boolean
        get() = prefs.getBoolean(KEY_IS_CONNECTED, false)
        private set(value) = prefs.edit().putBoolean(KEY_IS_CONNECTED, value).apply()

    /**
     * Memverifikasi apakah daemon ADB lokal dapat dihubungi di localhost:[port].
     */
    suspend fun checkConnection(port: Int = currentPort): Boolean = withContext(Dispatchers.IO) {
        try {
            val socket = java.net.Socket()
            socket.connect(java.net.InetSocketAddress("127.0.0.1", port), 1200)
            socket.close()
            isConnected = true
            currentPort = port
            true
        } catch (e: Exception) {
            isConnected = false
            false
        }
    }

    /**
     * Menjalankan perintah shell melalui ADB client biner (atau wrapper script).
     */
    suspend fun executeCommand(command: String): CommandResult = withContext(Dispatchers.IO) {
        try {
            val adbBin = findAdbExecutable()
            if (adbBin == null) {
                return@withContext CommandResult(
                    -1,
                    "",
                    "ADB client tidak tersedia di runtime aplikasi. Instal/provisikan ADB terlebih dahulu."
                )
            }

            val cmdList = listOf(adbBin, "-s", "127.0.0.1:$currentPort", "shell", command)

            val process = ProcessBuilder(cmdList)
                .directory(context.filesDir)
                .start()

            val stdout = process.inputStream.bufferedReader().use(BufferedReader::readText)
            val stderr = process.errorStream.bufferedReader().use(BufferedReader::readText)
            val exitCode = process.waitFor()

            CommandResult(exitCode, stdout, stderr)
        } catch (e: Exception) {
            Log.e(TAG, "Gagal menjalankan ADB command: ${e.message}", e)
            CommandResult(-1, "", e.message ?: "Unknown error")
        }
    }

    /**
     * Mencari binary executable adb di app sandbox atau environment path.
     */
    private fun findAdbExecutable(): String? {
        val candidates = mutableListOf(
            File(context.filesDir, "bin/adb"),
            File(context.filesDir, "engines/adb")
        )

        val pathEntries = (System.getenv("PATH") ?: "")
            .split(File.pathSeparator)
            .filter { it.isNotBlank() }
        candidates += pathEntries.map { File(it, "adb") }

        return candidates
            .firstOrNull { it.exists() && it.canExecute() }
            ?.absolutePath
    }

    /**
     * Mendapatkan informasi status KADB untuk konsumsi NativeBridge & Web UI.
     */
    fun getStatusJson(): String {
        return """
            {
                "supported": true,
                "connected": $isConnected,
                "port": $currentPort,
                "architecture": "Droide Wireless ADB"
            }
        """.trimIndent()
    }
}
