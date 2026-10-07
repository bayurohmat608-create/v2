package com.bossbayu.aiteam.runtime

import android.content.Context
import android.util.Log
import java.io.File

/**
 * Manages user-space Linux containerization using PRoot.
 * Allows running standard GNU/Linux and Musl/Alpine binaries on unrooted Android devices.
 */
class PRootManager(private val context: Context) {

    companion object {
        private const val TAG = "PRootManager"
    }

    val prootBinary: File
        get() = File(context.filesDir, "bin/proot")

    fun isPRootInstalled(): Boolean {
        return prootBinary.exists() && prootBinary.canExecute()
    }

    /**
     * Constructs a PRoot command to execute a command within a specified rootfs.
     * Automatically binds the shared persistent workspaces for Budi and Rian.
     */
    fun buildCommand(
        rootfsDir: File,
        command: List<String>,
        budiWorkspace: File,
        rianWorkspace: File,
        extraBinds: List<Pair<File, String>> = emptyList()
    ): List<String> {
        val cmd = mutableListOf<String>()

        if (isPRootInstalled()) {
            cmd.add(prootBinary.absolutePath)
            cmd.add("-0") // Fake root (UID 0) inside container
            cmd.add("-r")
            cmd.add(rootfsDir.absolutePath)

            // Mount shared persistent workspaces
            cmd.add("-b")
            cmd.add("${budiWorkspace.absolutePath}:/opt/workspaces/budi")

            cmd.add("-b")
            cmd.add("${rianWorkspace.absolutePath}:/opt/workspaces/rian")

            // Mount internal device dev/proc/sys pseudo filesystems
            cmd.add("-b")
            cmd.add("/dev")
            cmd.add("-b")
            cmd.add("/proc")
            cmd.add("-b")
            cmd.add("/sys")

            // Mount Public Shared Storage (/sdcard/Download/AITeam)
            val publicAITeam = android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_DOWNLOADS)?.let {
                File(it, "AITeam")
            }
            if (publicAITeam != null) {
                if (!publicAITeam.exists()) publicAITeam.mkdirs()
                if (publicAITeam.exists()) {
                    cmd.add("-b")
                    cmd.add("${publicAITeam.absolutePath}:/sdcard/AITeam")
                }
            }

            // Mount extra directories if provided
            for ((hostDir, containerPath) in extraBinds) {
                if (hostDir.exists()) {
                    cmd.add("-b")
                    cmd.add("${hostDir.absolutePath}:$containerPath")
                }
            }

            // Target shell or command
            cmd.addAll(command)
        } else {
            // Fallback for native testing without proot (direct execution)
            Log.w(TAG, "PRoot binary not found, falling back to direct host execution.")
            cmd.addAll(command)
        }

        return cmd
    }

    /**
     * Executes a command inside the PRoot environment synchronously.
     */
    fun execute(
        rootfsDir: File,
        command: List<String>,
        budiWorkspace: File,
        rianWorkspace: File,
        workingDir: File = budiWorkspace,
        environment: Map<String, String> = emptyMap()
    ): ProcessResult {
        val fullCmd = buildCommand(rootfsDir, command, budiWorkspace, rianWorkspace)
        Log.d(TAG, "Executing in PRoot: ${fullCmd.joinToString(" ")}")

        val processBuilder = ProcessBuilder(fullCmd)
        processBuilder.directory(workingDir)
        processBuilder.environment().putAll(environment)

        return try {
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
