package com.bossbayu.aiteam.terminal

import android.content.Context
import android.util.Log
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.regex.Pattern
import kotlin.concurrent.thread

/**
 * TerminalFeedbackManager — Diadopsi dari arsitektur Droide (Bay Studio).
 * Mengawasi aliran stdout/stderr terminal, mendeteksi error kompilasi/eksekusi secara realtime,
 * dan mengirimkan umpan balik cerdas (feedback loop) ke agen AI (Budi/Rian) di WhatsApp.
 */
class TerminalFeedbackManager(private val context: Context) {

    companion object {
        private const val TAG = "TerminalFeedback"
        private val ERROR_PATTERNS = listOf(
            Pattern.compile("Traceback \\(most recent call last\\):.*", Pattern.DOTALL),
            Pattern.compile("(?i)(SyntaxError|TypeError|ReferenceError|RangeError):.*"),
            Pattern.compile("(?i)(error: cannot find symbol|NullPointerException|ClassNotFoundException)"),
            Pattern.compile("(?i)(FATAL ERROR|Segmentation fault|Assertion failed)"),
            Pattern.compile("npm ERR!.*")
        )
    }

    private val lineBuffer = StringBuilder()
    private var lastCommand: String = ""

    fun onCommandStarted(command: String) {
        lastCommand = command
        lineBuffer.clear()
    }

    fun onOutputReceived(chunk: String) {
        lineBuffer.append(chunk)

        // Jaga ukuran buffer maksimal 8KB
        if (lineBuffer.length > 8192) {
            lineBuffer.delete(0, lineBuffer.length - 8192)
        }
    }

    fun onCommandFinished(exitCode: Int) {
        if (exitCode != 0) {
            val output = lineBuffer.toString()
            val detectedError = extractRelevantError(output)
            notifyAgentFeedback(lastCommand, exitCode, detectedError)
        }
    }

    private fun extractRelevantError(output: String): String {
        for (pattern in ERROR_PATTERNS) {
            val matcher = pattern.matcher(output)
            if (matcher.find()) {
                val match = matcher.group()
                return match.take(1000)
            }
        }
        // Fallback ke 5 baris terakhir output jika pola spesifik tidak cocok
        return output.lines().takeLast(8).joinToString("\n").take(1000)
    }

    private fun notifyAgentFeedback(command: String, exitCode: Int, errorDetails: String) {
        thread {
            try {
                val url = URL("http://127.0.0.1:3000/api/agent/feedback")
                val conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("Content-Type", "application/json; utf-8")
                conn.connectTimeout = 1500
                conn.readTimeout = 1500
                conn.doOutput = true

                val payload = JSONObject().apply {
                    put("source", "terminal")
                    put("command", command)
                    put("exitCode", exitCode)
                    put("errorDetails", errorDetails)
                    put("timestamp", System.currentTimeMillis())
                }

                OutputStreamWriter(conn.outputStream).use { writer ->
                    writer.write(payload.toString())
                    writer.flush()
                }

                val code = conn.responseCode
                Log.d(TAG, "Sent terminal feedback to AI Agent. HTTP: $code")
                conn.disconnect()
            } catch (e: Exception) {
                Log.w(TAG, "Gagal mengirim terminal feedback: ${e.message}")
            }
        }
    }
}
