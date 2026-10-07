package com.bossbayu.aiteam.runtime

import android.content.Context
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL

/**
 * Manages the embedded Node.js process hosting server.js on 127.0.0.1:3000.
 */
class NodeRuntimeManager(
    private val context: Context,
    private val workstationManager: WorkstationManager
) {

    companion object {
        private const val TAG = "NodeRuntimeManager"
        const val DEFAULT_PORT = 3000
    }

    private var serverProcess: Process? = null
    private var isRunning = false

    val serverDir: File
        get() = File(context.filesDir, "server").apply { mkdirs() }

    val serverScriptFile: File
        get() = File(serverDir, "server.js")

    val authVaultDir: File
        get() = File(context.filesDir, "auth_vault").apply { mkdirs() }

    val enginesDir: File
        get() = File(context.filesDir, "engines").apply { mkdirs() }

    /**
     * Extracts server assets (web files, server.js) from Android assets to filesDir.
     */
    suspend fun syncAssets() = withContext(Dispatchers.IO) {
        copyAssetDirectory("server", serverDir)
        val webDir = File(serverDir, "web").apply { mkdirs() }
        copyAssetDirectory("web", webDir)
        copyAssetDirectory("engines", enginesDir)
    }

    /**
     * Starts the Node.js HTTP/SSE server.
     */
    suspend fun startServer(): Int = withContext(Dispatchers.IO) {
        if (isRunning && isServerHealthy()) {
            Log.d(TAG, "Server already running and healthy.")
            return@withContext DEFAULT_PORT
        }

        syncAssets()

        val nodeBin = findNodeExecutable()
            ?: throw IllegalStateException(
                "Node.js runtime tidak tersedia di aplikasi. V2 tidak mengeksekusi binary dari sandbox aplikasi secara diam-diam; runtime Node harus diprovisikan secara resmi."
            )
        val env = mutableMapOf(
            "PORT" to DEFAULT_PORT.toString(),
            "HOST" to "127.0.0.1",
            "NODE_ENV" to "production",
            "HOME" to context.filesDir.absolutePath,
            "AUTH_VAULT_DIR" to authVaultDir.absolutePath,
            "BUDI_WORKSPACE" to workstationManager.budiWorkspace.absolutePath,
            "RIAN_WORKSPACE" to workstationManager.rianWorkspace.absolutePath,
            "WORKSTATIONS_DIR" to workstationManager.workstationsBaseDir.absolutePath,
            "PATH" to "${enginesDir.absolutePath}:${File(context.filesDir, "bin").absolutePath}:${System.getenv("PATH") ?: ""}"
        )

        val cmd = listOf(nodeBin, serverScriptFile.absolutePath)
        Log.d(TAG, "Spawning node process: ${cmd.joinToString(" ")}")

        val processBuilder = ProcessBuilder(cmd)
        processBuilder.directory(serverDir)
        processBuilder.environment().putAll(env)
        processBuilder.redirectErrorStream(true)

        val process = processBuilder.start()
        serverProcess = process
        isRunning = true

        // Read output asynchronously for debugging
        Thread {
            process.inputStream.bufferedReader().useLines { lines ->
                lines.forEach { line ->
                    Log.d("NodeServerOutput", line)
                }
            }
        }.start()

        // Wait for server to respond on 127.0.0.1:3000
        var attempts = 0
        while (attempts < 30) {
            delay(500)
            if (isServerHealthy()) {
                Log.d(TAG, "Node.js server verified healthy on port $DEFAULT_PORT!")
                return@withContext DEFAULT_PORT
            }
            attempts++
        }

        isRunning = false
        serverProcess?.destroy()
        serverProcess = null
        throw IllegalStateException("Node.js server gagal health-check pada 127.0.0.1:$DEFAULT_PORT")
    }

    /**
     * Stops the Node.js server gracefully.
     */
    fun stopServer() {
        try {
            serverProcess?.destroy()
            serverProcess = null
            isRunning = false
            Log.d(TAG, "Node.js server stopped.")
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping server: ${e.message}", e)
        }
    }

    fun isServerHealthy(): Boolean {
        return try {
            val url = URL("http://127.0.0.1:$DEFAULT_PORT/api/status")
            val conn = url.openConnection() as HttpURLConnection
            conn.connectTimeout = 1000
            conn.readTimeout = 1000
            conn.responseCode == 200
        } catch (e: Exception) {
            false
        }
    }

    private fun findNodeExecutable(): String? {
        val candidates = mutableListOf(
            File(context.filesDir, "bin/node"),
            File(context.filesDir, "engines/node")
        )

        val pathEntries = (System.getenv("PATH") ?: "")
            .split(File.pathSeparator)
            .filter { it.isNotBlank() }
        candidates += pathEntries.map { File(it, "node") }

        return candidates
            .firstOrNull { it.exists() && it.canExecute() }
            ?.absolutePath
    }

    private fun copyAssetDirectory(assetPath: String, targetDir: File) {
        val assets = context.assets.list(assetPath) ?: return
        for (asset in assets) {
            val subAssetPath = if (assetPath.isEmpty()) asset else "$assetPath/$asset"
            val subAssets = context.assets.list(subAssetPath)
            val destFile = File(targetDir, asset)

            if (subAssets != null && subAssets.isNotEmpty()) {
                destFile.mkdirs()
                copyAssetDirectory(subAssetPath, destFile)
            } else {
                try {
                    context.assets.open(subAssetPath).use { input ->
                        FileOutputStream(destFile).use { output ->
                            input.copyTo(output)
                        }
                    }
                } catch (e: Exception) {
                    // Ignore directory open exception
                }
            }
        }
    }
}
