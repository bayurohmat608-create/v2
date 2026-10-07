package com.bossbayu.aiteam.terminal

import android.util.Log
import com.bossbayu.aiteam.runtime.PRootManager
import com.bossbayu.aiteam.runtime.WorkstationManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import java.io.BufferedWriter
import java.io.InputStream
import java.io.OutputStreamWriter

/**
 * Manages an interactive shell session running inside the active workstation (PRoot).
 */
class TerminalSession(
    private val workstationManager: WorkstationManager,
    private val prootManager: PRootManager,
    private val feedbackManager: TerminalFeedbackManager? = null,
    private val onOutput: (String) -> Unit
) {

    private val sessionScope = CoroutineScope(Dispatchers.IO + Job())
    private var process: Process? = null
    private var writer: BufferedWriter? = null

    companion object {
        private const val TAG = "TerminalSession"
    }

    fun start() {
        sessionScope.launch {
            try {
                val rootfs = workstationManager.getActiveRootfs()
                val shellCmd = prootManager.buildCommand(
                    rootfsDir = rootfs,
                    command = listOf("/bin/sh"),
                    budiWorkspace = workstationManager.budiWorkspace,
                    rianWorkspace = workstationManager.rianWorkspace
                )

                val pb = ProcessBuilder(shellCmd)
                pb.directory(workstationManager.budiWorkspace)
                pb.environment()["TERM"] = "xterm-256color"
                pb.environment()["PS1"] = "\\u@\\h:\\w\\$ "
                pb.redirectErrorStream(true)

                val proc = pb.start()
                process = proc
                writer = BufferedWriter(OutputStreamWriter(proc.outputStream))

                onOutput("=== Terminal Tim AI (${workstationManager.currentWorkstation.uppercase()}) Siap ===\n")

                readStream(proc.inputStream)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to start terminal session: ${e.message}", e)
                onOutput("\n[Gagal membuka terminal: ${e.message}]\n")
            }
        }
    }

    fun sendCommand(cmd: String) {
        feedbackManager?.onCommandStarted(cmd)
        sessionScope.launch {
            try {
                writer?.apply {
                    write(cmd)
                    newLine()
                    flush()
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error writing command: ${e.message}", e)
            }
        }
    }

    private fun readStream(stream: InputStream) {
        val buffer = ByteArray(2048)
        var read: Int
        while (stream.read(buffer).also { read = it } != -1) {
            val text = String(buffer, 0, read)
            feedbackManager?.onOutputReceived(text)
            onOutput(text)
        }
    }

    fun close() {
        try {
            process?.destroy()
            process = null
            writer = null
        } catch (e: Exception) {
            Log.e(TAG, "Error closing terminal session: ${e.message}", e)
        }
    }
}
