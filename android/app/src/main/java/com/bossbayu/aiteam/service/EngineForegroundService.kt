package com.bossbayu.aiteam.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.Process
import android.util.Log
import androidx.core.app.NotificationCompat
import com.bossbayu.aiteam.MainActivity
import com.bossbayu.aiteam.R
import com.bossbayu.aiteam.runtime.NodeRuntimeManager
import com.bossbayu.aiteam.runtime.PRootManager
import com.bossbayu.aiteam.runtime.WorkstationManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

/**
 * Dedicated foreground service process that owns the embedded Node runtime.
 *
 * Running it in :engine isolates Node/V8 from the UI process and guarantees
 * one Node instance per process.
 */
class EngineForegroundService : Service() {

    private val serviceScope = CoroutineScope(Dispatchers.IO + Job())
    private lateinit var wakeLockManager: WakeLockManager
    private lateinit var nodeRuntimeManager: NodeRuntimeManager
    private lateinit var prootManager: PRootManager
    private lateinit var workstationManager: WorkstationManager

    companion object {
        private const val TAG = "EngineForegroundService"
        const val CHANNEL_ID = "ai_engine_service_channel"
        const val NOTIFICATION_ID = 1001

        const val ACTION_START = "com.bossbayu.aiteam.ACTION_START"
        const val ACTION_STOP = "com.bossbayu.aiteam.ACTION_STOP"

        fun startService(context: Context) {
            val intent = Intent(context, EngineForegroundService::class.java).apply {
                action = ACTION_START
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stopService(context: Context) {
            val intent = Intent(context, EngineForegroundService::class.java).apply {
                action = ACTION_STOP
            }
            context.startService(intent)
        }
    }

    override fun onCreate() {
        super.onCreate()
        wakeLockManager = WakeLockManager(this)
        workstationManager = WorkstationManager(this)
        prootManager = PRootManager(this)
        nodeRuntimeManager = NodeRuntimeManager(this, workstationManager)
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                Log.i(TAG, "Explicit engine stop requested.")
                nodeRuntimeManager.stopServer()
                wakeLockManager.release()
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()

                Thread {
                    try {
                        Thread.sleep(150)
                    } catch (_: InterruptedException) {
                        Thread.currentThread().interrupt()
                    }
                    Process.killProcess(Process.myPid())
                }.start()

                return START_NOT_STICKY
            }

            ACTION_START, null -> {
                startForeground(
                    NOTIFICATION_ID,
                    createNotification("Memulai embedded Node.js...")
                )
                startEngine()
            }
        }
        return START_STICKY
    }

    private fun startEngine() {
        wakeLockManager.acquire()

        serviceScope.launch {
            try {
                updateNotification("Menyiapkan Alpine + engine pack...")
                workstationManager.ensureWorkstationsReady()

                updateNotification("Menyiapkan dependency engine Linux...")
                val depsReady = workstationManager.provisionEngineDependencies(prootManager)
                if (!depsReady) {
                    Log.w(TAG, "Engine dependencies are incomplete; backend will expose degraded health.")
                }

                updateNotification("Memulai embedded Node.js...")
                val port = nodeRuntimeManager.startServer()
                val suffix = if (depsReady) "" else " · engine deps perlu retry"
                updateNotification("Server lokal aktif di 127.0.0.1:$port$suffix")
            } catch (e: Exception) {
                Log.e(TAG, "Engine start failed: ${e.message}", e)
                updateNotification("Runtime error: ${e.message ?: "unknown"}")
            }
        }
    }

    private fun createNotification(content: String): Notification {
        val launchIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.service_notification_title))
            .setContentText(content)
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
    }

    private fun updateNotification(content: String) {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(NOTIFICATION_ID, createNotification(content))
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                getString(R.string.channel_name),
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = getString(R.string.channel_desc)
                setShowBadge(false)
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        wakeLockManager.release()
        serviceScope.cancel()
        super.onDestroy()
    }
}
