package com.bossbayu.aiteam.terminal

import android.util.Log
import com.bossbayu.aiteam.runtime.PRootManager
import com.bossbayu.aiteam.runtime.WorkstationManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import java.io.BufferedWriter
import java.io.InputStream
import java.io.OutputStreamWriter

/**
 * Manages a shell process inside the active app-private workstation.
 *
 * This is a pipe-backed command session, not a PTY emulator. In particular,
 * sending input is supported but interactive full-screen programs are not.
 */
class TerminalSession(
    private val workstationManager: WorkstationManager,
    private val prootManager: PRootManager,
    private val feedbackManager: TerminalFeedbackManager? = null,
    private val onOutput: (String) -> Unit
) {
    private val sessionScope = CoroutineScope(Dispatchers.IO + Job())
    private val processLock = Any()
    private var process: Process? = null
    private var writer: BufferedWriter? = null

    companion object {
        private const val TAG = "TerminalSession"
    }

    fun start() {
        sessionScope.launch {
            try {
                check(prootManager.isPRootInstalled()) {
                    "PRoot belum tersedia untuk ABI perangkat ini."
                }
                val rootfs = workstationManager.getActiveRootfs()
                val shellCmd = prootManager.buildCommand(
                    rootfsDir = rootfs,
                    command = listOf("/bin/sh"),
                    budiWorkspace = workstationManager.budiWorkspace,
                    rianWorkspace = workstationManager.rianWorkspace
                )

                val pb = ProcessBuilder(shellCmd)
                pb.directory(workstationManager.budiWorkspace)
                pb.environment().putAll(prootManager.runtimeEnvironment())
                pb.environment()["TERM"] = "dumb"
                pb.environment()["PS1"] = "$ "
                pb.redirectErrorStream(true)

                val proc = pb.start()
                synchronized(processLock) {
                    process = proc
                    writer = BufferedWriter(OutputStreamWriter(proc.outputStream))
                }

                // Do not claim readiness until the guest shell responds.
                sendCommand("printf '\\nCP16_TERMINAL_SHELL_STARTED\\n'")
                readStream(proc.inputStream)
                val exitCode = proc.waitFor()
                onOutput("\n[Terminal selesai (exit=$exitCode)]\n")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to start terminal session: ${e.message}", e)
                onOutput("\n[Gagal membuka terminal: ${e.message}]\n")
            } finally {
                synchronized(processLock) {
                    writer = null
                    process = null
                }
            }
        }
    }

    fun sendCommand(cmd: String) {
        feedbackManager?.onCommandStarted(cmd)
        sessionScope.launch {
            try {
                synchronized(processLock) {
                    val activeWriter = writer ?: throw IllegalStateException("Shell belum siap atau sudah berhenti.")
                    activeWriter.write(cmd)
                    activeWriter.newLine()
                    activeWriter.flush()
                }
            } catch (e: Exception) {
                Log.w(TAG, "Cannot write terminal command: ${e.message}")
                onOutput("\n[Perintah tidak terkirim: ${e.message}]\n")
            }
        }
    }

    private fun readStream(stream: InputStream) {
        val buffer = ByteArray(2048)
        while (true) {
            val count = stream.read(buffer)
            if (count == -1) break
            val text = String(buffer, 0, count)
            feedbackManager?.onOutputReceived(text)
            onOutput(text)
        }
    }

    fun close() {
        synchronized(processLock) {
            try {
                writer?.close()
            } catch (e: Exception) {
                Log.w(TAG, "Terminal writer close failed: ${e.message}")
            } finally {
                process?.destroy()
                process = null
                writer = null
            }
        }
        sessionScope.cancel()
    }
}
