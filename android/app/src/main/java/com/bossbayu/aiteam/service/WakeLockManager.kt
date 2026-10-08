package com.bossbayu.aiteam.service

import android.content.Context
import android.net.wifi.WifiManager
import android.os.Build
import android.os.PowerManager
import android.util.Log

/**
 * Manages CPU and WiFi wakelocks so background Node.js and AI CLI engines
 * continue running reliably when phone is idle or locked.
 */
class WakeLockManager(private val context: Context) {

    private val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
    private val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager

    private var wakeLock: PowerManager.WakeLock? = null
    private var wifiLock: WifiManager.WifiLock? = null

    companion object {
        private const val TAG = "WakeLockManager"
        private const val WAKE_LOCK_TAG = "WhatsAppAITeam::EngineWakeLock"
        private const val WIFI_LOCK_TAG = "WhatsAppAITeam::EngineWifiLock"
        private const val WAKELOCK_TIMEOUT_MS = 8L * 60L * 60L * 1000L
    }

    @Synchronized
    fun acquire() {
        try {
            if (wakeLock == null) {
                wakeLock = powerManager?.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK,
                    WAKE_LOCK_TAG
                )?.apply {
                    setReferenceCounted(false)
                    acquire(WAKELOCK_TIMEOUT_MS)
                    Log.d(TAG, "CPU PARTIAL_WAKE_LOCK acquired with timeout.")
                }
            }

            if (wifiLock == null) {
                val wifiMode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    WifiManager.WIFI_MODE_FULL_LOW_LATENCY
                } else {
                    @Suppress("DEPRECATION")
                    WifiManager.WIFI_MODE_FULL_HIGH_PERF
                }
                wifiLock = wifiManager?.createWifiLock(
                    wifiMode,
                    WIFI_LOCK_TAG
                )?.apply {
                    setReferenceCounted(false)
                    acquire()
                    Log.d(TAG, "WiFi Lock acquired.")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error acquiring wakelocks: ${e.message}", e)
        }
    }

    @Synchronized
    fun release() {
        try {
            wakeLock?.let {
                if (it.isHeld) it.release()
                Log.d(TAG, "CPU PARTIAL_WAKE_LOCK released.")
            }
            wakeLock = null

            wifiLock?.let {
                if (it.isHeld) it.release()
                Log.d(TAG, "WiFi Lock released.")
            }
            wifiLock = null
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing wakelocks: ${e.message}", e)
        }
    }
}
