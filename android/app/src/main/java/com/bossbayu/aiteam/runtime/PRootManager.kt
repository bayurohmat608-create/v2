package com.bossbayu.aiteam.runtime

import android.content.Context
import android.os.Environment
import android.util.Log
import java.io.File

/**
 * Owns the app-private PRoot launcher.
 *
 * Executable code is shipped from the APK native library area. No executable
 * is copied into filesDir/cache, which keeps the runtime compatible with
 * modern Android executable-code restrictions.
 */
class PRootManager(private val context: Context) {

    companion object {
        private const val TAG = "PRootManager"
    }

    private val nativeLibraryDir: File
        get() = File(context.applicationInfo.nativeLibraryDir)

    val prootBinary: File
        get() = File(nativeLibraryDir, "libproot_exec.so")

    val prootLoader: File
        get() = File(nativeLibraryDir, "libproot_loader.so")

    private val prootTempDir: File
        get() = File(context.cacheDir, "proot-tmp").apply { mkdirs() }

    fun isPRootInstalled(): Boolean {
        return prootBinary.isFile &&
            prootLoader.isFile &&
            prootBinary.canExecute() &&
            prootLoader.canExecute()
    }

    fun runtimeEnvironment(extra: Map<String, String> = emptyMap()): Map<String, String> {
        val env = mutableMapOf(
            "PROOT_LOADER" to prootLoader.absolutePath,
            "PROOT_TMP_DIR" to prootTempDir.absolutePath,
            "TMPDIR" to prootTempDir.absolutePath,
            "LD_LIBRARY_PATH" to nativeLibraryDir.absolutePath
        )
        env.putAll(extra)
        return env
    }

    /**
     * Constructs a PRoot command to execute a command within a specified rootfs.
     * Shared workspaces stay outside the rootfs and are bind-mounted in.
     */
    fun buildCommand(
        rootfsDir: File,
        command: List<String>,
        budiWorkspace: File,
        rianWorkspace: File,
        extraBinds: List<Pair<File, String>> = emptyList()
    ): List<String> {
        require(isPRootInstalled()) {
            "PRoot runtime native belum tersedia untuk ABI perangkat ini."
        }
        require(File(rootfsDir, "bin/sh").isFile) {
            "Rootfs Linux belum terpasang atau tidak lengkap: ${rootfsDir.absolutePath}"
        }

        val cmd = mutableListOf(
            prootBinary.absolutePath,
            "-0",
            "-r", rootfsDir.absolutePath,
            "-b", "${budiWorkspace.absolutePath}:/opt/workspaces/budi",
            "-b", "${rianWorkspace.absolutePath}:/opt/workspaces/rian",
            "-b", "/dev",
            "-b", "/proc",
            "-b", "/sys"
        )

        val publicAITeam = Environment
            .getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
            ?.let { File(it, "AITeam") }

        if (publicAITeam != null) {
            if (!publicAITeam.exists()) publicAITeam.mkdirs()
            if (publicAITeam.isDirectory) {
                cmd += listOf("-b", "${publicAITeam.absolutePath}:/sdcard/AITeam")
            }
        }

        for ((hostDir, containerPath) in extraBinds) {
            if (hostDir.exists()) {
                cmd += listOf("-b", "${hostDir.absolutePath}:$containerPath")
            }
        }

        cmd.addAll(command)
        return cmd
    }

    fun execute(
        rootfsDir: File,
        command: List<String>,
        budiWorkspace: File,
        rianWorkspace: File,
        workingDir: File = budiWorkspace,
        environment: Map<String, String> = emptyMap()
    ): ProcessResult {
        val fullCmd = buildCommand(
            rootfsDir,
            command,
            budiWorkspace,
            rianWorkspace
        )
        Log.d(TAG, "Executing in PRoot: ${fullCmd.joinToString(" ")}")

        return try {
            val processBuilder = ProcessBuilder(fullCmd)
                .directory(workingDir)
                .redirectErrorStream(false)

            processBuilder.environment().putAll(runtimeEnvironment(environment))

            val process = processBuilder.start()
            val stdout = process.inputStream.bufferedReader().use { it.readText() }
            val stderr = process.errorStream.bufferedReader().use { it.readText() }
            val exitCode = process.waitFor()

            ProcessResult(exitCode, stdout, stderr)
        } catch (e: Exception) {
            Log.e(TAG, "PRoot execution failed: ${e.message}", e)
            ProcessResult(-1, "", e.message ?: "Unknown error")
        }
    }

    data class ProcessResult(
        val exitCode: Int,
        val stdout: String,
        val stderr: String
    ) {
        val isSuccess: Boolean get() = exitCode == 0
    }
}
