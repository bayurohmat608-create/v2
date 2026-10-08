package com.bossbayu.aiteam.runtime

import android.content.Context
import android.system.Os
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL

/**
 * Runs server.js inside an embedded Node.js Mobile runtime.
 *
 * The runtime itself is a native library shipped in the APK. JavaScript assets
 * remain writable data, while executable native code comes from the APK's
 * native library directory.
 */
class NodeRuntimeManager(
    private val context: Context,
    private val workstationManager: WorkstationManager
) {

    companion object {
        private const val TAG = "NodeRuntimeManager"
        const val DEFAULT_PORT = 3000

        @Volatile
        private var nodeThread: Thread? = null

        @Volatile
        private var nodeExitCode: Int? = null

        private val nodeStartLock = Any()
    }

    @Volatile
    private var isRunning = false

    val serverDir: File
        get() = File(context.filesDir, "server").apply { mkdirs() }

    val serverScriptFile: File
        get() = File(serverDir, "server.js")

    val runtimeDir: File
        get() = File(context.filesDir, ".runtime").apply { mkdirs() }

    val authVaultDir: File
        get() = File(runtimeDir, "auth_vault").apply { mkdirs() }

    val enginesDir: File
        get() = File(context.filesDir, "engines").apply { mkdirs() }

    /**
     * Synchronize canonical JS/web assets packaged by Gradle into app storage.
     */
    suspend fun syncAssets() = withContext(Dispatchers.IO) {
        copyAssetDirectory("server", serverDir)
        val webDir = File(serverDir, "web").apply { mkdirs() }
        copyAssetDirectory("web", webDir)
    }

    /**
     * Starts embedded Node and waits until the HTTP server answers.
     */
    suspend fun startServer(): Int = withContext(Dispatchers.IO) {
        if (isServerHealthy()) {
            isRunning = true
            return@withContext DEFAULT_PORT
        }

        syncAssets()
        configureEnvironment()

        synchronized(nodeStartLock) {
            if (nodeThread?.isAlive != true) {
                nodeExitCode = null
                nodeThread = Thread {
                    try {
                        Log.i(TAG, "Starting embedded Node.js Mobile runtime...")
                        val exitCode = NodeBridge.startNodeWithArguments(
                            arrayOf("node", serverScriptFile.absolutePath)
                        )
                        nodeExitCode = exitCode
                        Log.w(TAG, "Embedded Node exited with code $exitCode")
                    } catch (t: Throwable) {
                        nodeExitCode = -1
                        Log.e(TAG, "Embedded Node crashed: ${t.message}", t)
                    } finally {
                        isRunning = false
                    }
                }.apply {
                    name = "embedded-node"
                    isDaemon = false
                    start()
                }
            }
        }

        var attempts = 0
        while (attempts < 60) {
            delay(500)
            if (isServerHealthy()) {
                isRunning = true
                Log.i(TAG, "Embedded Node server healthy on 127.0.0.1:$DEFAULT_PORT")
                return@withContext DEFAULT_PORT
            }

            if (nodeThread?.isAlive != true) {
                throw IllegalStateException(
                    "Embedded Node berhenti sebelum server siap (exit=${nodeExitCode ?: "unknown"})."
                )
            }
            attempts++
        }

        throw IllegalStateException(
            "Embedded Node server gagal health-check pada 127.0.0.1:$DEFAULT_PORT"
        )
    }

    /**
     * The embedded Node lifecycle is tied to the dedicated :engine Android
     * process. EngineForegroundService terminates that process on explicit stop.
     */
    fun stopServer() {
        isRunning = false
        Log.d(TAG, "Embedded Node stop requested; service process owns final shutdown.")
    }

    fun isServerHealthy(): Boolean {
        return try {
            val conn = URL("http://127.0.0.1:$DEFAULT_PORT/api/status")
                .openConnection() as HttpURLConnection
            conn.connectTimeout = 1000
            conn.readTimeout = 1000
            conn.useCaches = false
            conn.responseCode == 200
        } catch (_: Exception) {
            false
        }
    }

    private fun configureEnvironment() {
        val nativeLibDir = File(context.applicationInfo.nativeLibraryDir)
        val antigravityHome = File(authVaultDir, "antigravity/default").apply { mkdirs() }
        val codexHome = File(authVaultDir, "codex/default").apply { mkdirs() }
        val guestHome = File(runtimeDir, "home").apply { mkdirs() }

        val env = mapOf(
            "PORT" to DEFAULT_PORT.toString(),
            "HOST" to "127.0.0.1",
            "NODE_ENV" to "production",
            "HOME" to context.filesDir.absolutePath,
            "CHAT_AI_RUNTIME_DIR" to runtimeDir.absolutePath,
            "AUTH_VAULT_DIR" to authVaultDir.absolutePath,
            "BUDI_WORKSPACE" to workstationManager.budiWorkspace.absolutePath,
            "RIAN_WORKSPACE" to workstationManager.rianWorkspace.absolutePath,
            "WORKSTATIONS_DIR" to workstationManager.workstationsBaseDir.absolutePath,
            "ANTIGRAVITY_APP_DATA_DIR" to antigravityHome.absolutePath,
            "CODEX_HOME" to codexHome.absolutePath,
            "ANDROID_RUNTIME" to "1",
            "ANDROID_NATIVE_LIB_DIR" to nativeLibDir.absolutePath,
            "ANDROID_ROOTFS_DIR" to workstationManager.alpineDir.absolutePath,
            "ANDROID_PROOT_BIN" to File(nativeLibDir, "libproot_exec.so").absolutePath,
            "ANDROID_PROOT_LOADER" to File(nativeLibDir, "libproot_loader.so").absolutePath,
            "ANDROID_GUEST_RUNTIME_DIR" to "/opt/aiteam/runtime",
            "ANDROID_GUEST_ENGINE_BIN_DIR" to "/opt/aiteam/bin",
            "ANDROID_GUEST_HOME_DIR" to "/opt/aiteam/runtime/home",
            "ANDROID_HOST_GUEST_HOME_DIR" to guestHome.absolutePath,
            "PATH" to listOf(
                enginesDir.absolutePath,
                File(context.filesDir, "bin").absolutePath,
                System.getenv("PATH") ?: ""
            ).joinToString(File.pathSeparator)
        )

        env.forEach { (key, value) ->
            Os.setenv(key, value, true)
        }
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
                context.assets.open(subAssetPath).use { input ->
                    destFile.parentFile?.mkdirs()
                    FileOutputStream(destFile).use { output ->
                        input.copyTo(output)
                    }
                }
            }
        }
    }
}
