package com.bossbayu.aiteam.service

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.RemoteInput
import com.bossbayu.aiteam.bridge.NativeBridge
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

/**
 * QuickReplyReceiver — Menangani teks balasan dari bar notifikasi Android (RemoteInput)
 * dan mengirimkannya langsung ke server Node.js lokal tanpa harus membuka aplikasi.
 */
class QuickReplyReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val remoteInput = RemoteInput.getResultsFromIntent(intent) ?: return
        val replyText = remoteInput.getCharSequence(NativeBridge.KEY_TEXT_REPLY)?.toString() ?: return
        val chatId = intent.getStringExtra("chatId") ?: "group"
        val sender = intent.getStringExtra("sender") ?: "AI Team"

        // Update notifikasi untuk memberi tahu Boss Bayu bahwa pesan terkirim
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val repliedNotification = NotificationCompat.Builder(context, NativeBridge.NOTIFICATION_CHANNEL_MESSAGES)
            .setSmallIcon(android.R.drawable.stat_notify_chat)
            .setContentTitle("Terkirim ke $sender")
            .setContentText("Anda: $replyText")
            .setTimeoutAfter(3000)
            .build()
        notificationManager.notify(sender.hashCode(), repliedNotification)

        // Kirim HTTP POST ke endpoint lokal Node.js
        thread {
            try {
                val url = URL("http://127.0.0.1:3000/api/send")
                val conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("Content-Type", "application/json; utf-8")
                conn.doOutput = true

                val payload = JSONObject().apply {
                    put("chatId", chatId)
                    put("message", replyText)
                }

                OutputStreamWriter(conn.outputStream).use { writer ->
                    writer.write(payload.toString())
                    writer.flush()
                }

                conn.responseCode // execute
                conn.disconnect()
            } catch (_: Exception) {}
        }
    }
}
