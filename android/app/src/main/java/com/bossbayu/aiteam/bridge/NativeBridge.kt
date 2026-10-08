package com.bossbayu.aiteam.bridge

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.BatteryManager
import android.os.Build
import android.os.Environment
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Base64
import android.webkit.JavascriptInterface
import androidx.core.app.NotificationCompat
import androidx.core.app.RemoteInput
import com.bossbayu.aiteam.MainActivity
import com.bossbayu.aiteam.service.QuickReplyReceiver
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream

/**
 * NativeBridge — Jembatan Komunikasi Dua Arah Antara WebView (WhatsApp Web v3.2)
 * dan Perangkat Keras Android (Kotlin).
 */
class NativeBridge(
    private val context: Context,
    private val activity: MainActivity
) {
    private val kadbManager = com.bossbayu.aiteam.kadb.KadbManager(context)

    companion object {
        const val NOTIFICATION_CHANNEL_MESSAGES = "wa_ai_messages_channel"
        const val KEY_TEXT_REPLY = "key_text_reply"
    }

    init {
        createNotificationChannel()
    }

    /**
     * 1. Haptic Feedback Dinamis
     */
    @JavascriptInterface
    fun triggerHaptic(type: String) {
        activity.runOnUiThread {
            try {
                val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    val manager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                    manager?.defaultVibrator
                } else {
                    @Suppress("DEPRECATION")
                    context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                }

                val effect = when (type.lowercase()) {
                    "light", "click" -> VibrationEffect.createOneShot(20, VibrationEffect.DEFAULT_AMPLITUDE)
                    "medium" -> VibrationEffect.createOneShot(50, VibrationEffect.DEFAULT_AMPLITUDE)
                    "success" -> VibrationEffect.createWaveform(longArrayOf(0, 40, 50, 70), -1)
                    "error" -> VibrationEffect.createWaveform(longArrayOf(0, 80, 60, 90), -1)
                    else -> VibrationEffect.createOneShot(30, VibrationEffect.DEFAULT_AMPLITUDE)
                }
                vibrator?.vibrate(effect)
            } catch (_: Exception) {}
        }
    }

    /**
     * 2. Notifikasi Android Asli dengan Dukungan Balas Cepat (Quick Reply)
     */
    @JavascriptInterface
    fun showDeviceNotification(title: String, message: String, sender: String, chatId: String = "group") {
        activity.runOnUiThread {
            try {
                val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

                // RemoteInput untuk mengetik balasan langsung dari bar notifikasi HP
                val remoteInput = RemoteInput.Builder(KEY_TEXT_REPLY)
                    .setLabel("Balas ke $sender...")
                    .build()

                val replyIntent = Intent(context, QuickReplyReceiver::class.java).apply {
                    putExtra("chatId", chatId)
                    putExtra("sender", sender)
                }
                val replyPendingIntent = PendingIntent.getBroadcast(
                    context,
                    chatId.hashCode(),
                    replyIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
                )

                val replyAction = NotificationCompat.Action.Builder(
                    android.R.drawable.ic_menu_send,
                    "Balas Cepat",
                    replyPendingIntent
                ).addRemoteInput(remoteInput).build()

                // Intent klik untuk membuka aplikasi
                val contentIntent = Intent(context, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
                }
                val contentPendingIntent = PendingIntent.getActivity(
                    context,
                    0,
                    contentIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )

                val notification = NotificationCompat.Builder(context, NOTIFICATION_CHANNEL_MESSAGES)
                    .setSmallIcon(android.R.drawable.stat_notify_chat)
                    .setContentTitle(title)
                    .setContentText(message)
                    .setStyle(NotificationCompat.BigTextStyle().bigText(message))
                    .setContentIntent(contentPendingIntent)
                    .addAction(replyAction)
                    .setAutoCancel(true)
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setDefaults(NotificationCompat.DEFAULT_ALL)
                    .build()

                notificationManager.notify(sender.hashCode(), notification)
            } catch (_: Exception) {}
        }
    }

    /**
     * 3. Telemetri Perangkat HP (Baterai, Pengisian Daya, Suhu)
     */
    @JavascriptInterface
    fun getDeviceStatus(): String {
        val result = JSONObject()
        try {
            val batteryIntent = context.registerReceiver(null, android.content.IntentFilter(Intent.ACTION_BATTERY_CHANGED))
            val level = batteryIntent?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
            val scale = batteryIntent?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
            val status = batteryIntent?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
            val isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL

            val batteryPct = if (level >= 0 && scale > 0) (level * 100 / scale) else 100

            result.put("batteryPercent", batteryPct)
            result.put("isCharging", isCharging)
            result.put("deviceModel", Build.MODEL)
            result.put("androidVersion", Build.VERSION.RELEASE)
        } catch (e: Exception) {
            result.put("error", e.message)
        }
        return result.toString()
    }

    /**
     * 4. Buka / Tutup Terminal Console Overlay
     */
    @JavascriptInterface
    fun toggleTerminal(sessionType: String) {
        activity.runOnUiThread {
            activity.showTerminalOverlay(sessionType)
        }
    }

    /**
     * 5. Ekspor File Proyek Langsung ke Folder Unduhan Publik HP (/sdcard/Download/AITeam)
     */
    @JavascriptInterface
    fun exportToPublicDownloads(fileName: String, base64Content: String): String {
        return try {
            val downloadDir = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "AITeam")
            if (!downloadDir.exists()) downloadDir.mkdirs()

            val targetFile = File(downloadDir, fileName)
            val bytes = Base64.decode(base64Content, Base64.DEFAULT)
            FileOutputStream(targetFile).use { it.write(bytes) }

            JSONObject().apply {
                put("success", true)
                put("path", targetFile.absolutePath)
            }.toString()
        } catch (e: Exception) {
            JSONObject().apply {
                put("success", false)
                put("error", e.message)
            }.toString()
        }
    }

    /**
     * 6. Status & Kendali Droide Wireless ADB (KADB)
     */
    @JavascriptInterface
    fun getKadbStatus(): String {
        return kadbManager.getStatusJson()
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            NOTIFICATION_CHANNEL_MESSAGES,
            "Pesan WhatsApp Tim AI",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Notifikasi pesan masuk dan update tugas dari Budi & Rian"
            enableVibration(true)
            enableLights(true)
        }
        val manager = context.getSystemService(NotificationManager::class.java)
        manager?.createNotificationChannel(channel)
    }
}
