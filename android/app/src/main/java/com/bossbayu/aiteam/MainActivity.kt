package com.bossbayu.aiteam

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.bossbayu.aiteam.runtime.BootstrapInstaller
import com.bossbayu.aiteam.runtime.PRootManager
import com.bossbayu.aiteam.runtime.WorkstationManager
import com.bossbayu.aiteam.service.EngineForegroundService
import com.bossbayu.aiteam.terminal.TerminalOverlayDialog
import com.google.android.material.floatingactionbutton.FloatingActionButton
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.net.HttpURLConnection
import java.net.URL

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var loadingOverlay: LinearLayout
    private lateinit var tvLoadingStatus: TextView
    private lateinit var fabTerminal: FloatingActionButton

    private lateinit var workstationManager: WorkstationManager
    private lateinit var prootManager: PRootManager

    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null

    private val filePickerLauncher = registerForActivityResult(
        ActivityResultContracts.GetMultipleContents()
    ) { uris ->
        fileUploadCallback?.onReceiveValue(uris?.toTypedArray())
        fileUploadCallback = null
    }

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { _ ->
        // Permissions evaluated by WebView callbacks when needed.
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        loadingOverlay = findViewById(R.id.loadingOverlay)
        tvLoadingStatus = findViewById(R.id.tvLoadingStatus)
        fabTerminal = findViewById(R.id.fabTerminal)

        workstationManager = WorkstationManager(this)
        prootManager = PRootManager(this)

        requestRequiredPermissions()
        setupWebView()
        setupTerminalFab()
        setupBackHandler()

        val bootstrapInstaller = BootstrapInstaller(this)
        if (!bootstrapInstaller.isInstalled()) {
            tvLoadingStatus.text = "Mempersiapkan sistem untuk pertama kali..."
            bootstrapInstaller.installAsync(object : BootstrapInstaller.InstallCallback {
                override fun onProgress(percent: Int, message: String) {
                    runOnUiThread {
                        tvLoadingStatus.text = "$percent% - $message"
                    }
                }

                override fun onComplete() {
                    runOnUiThread {
                        startEngineService()
                        waitForServerAndLoad()
                    }
                }

                override fun onError(error: String) {
                    runOnUiThread {
                        tvLoadingStatus.text = "Gagal ekstraksi aset: $error"
                    }
                }
            })
        } else {
            startEngineService()
            waitForServerAndLoad()
        }
    }

    private fun requestRequiredPermissions() {
        val permissions = mutableListOf(
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.CAMERA,
            Manifest.permission.MODIFY_AUDIO_SETTINGS
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }
        requestPermissionLauncher.launch(permissions.toTypedArray())
    }

    private fun startEngineService() {
        EngineForegroundService.startService(this)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            allowFileAccess = true
            allowContentAccess = true
            useWideViewPort = true
            loadWithOverviewMode = true
            cacheMode = WebSettings.LOAD_DEFAULT
        }

        webView.webChromeClient = object : WebChromeClient() {
            // Auto-grant microphone for Voice Notes & WhatsApp Calls
            override fun onPermissionRequest(request: PermissionRequest?) {
                request ?: return
                runOnUiThread {
                    val allowed = request.resources.filter { resource ->
                        when (resource) {
                            PermissionRequest.RESOURCE_AUDIO_CAPTURE ->
                                ContextCompat.checkSelfPermission(
                                    this@MainActivity,
                                    Manifest.permission.RECORD_AUDIO
                                ) == PackageManager.PERMISSION_GRANTED

                            PermissionRequest.RESOURCE_VIDEO_CAPTURE ->
                                ContextCompat.checkSelfPermission(
                                    this@MainActivity,
                                    Manifest.permission.CAMERA
                                ) == PackageManager.PERMISSION_GRANTED

                            else -> false
                        }
                    }

                    if (allowed.isNotEmpty()) {
                        request.grant(allowed.toTypedArray())
                    } else {
                        request.deny()
                    }
                }
            }

            // File upload intent for chat attachments
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                fileUploadCallback?.onReceiveValue(null)
                fileUploadCallback = filePathCallback
                filePickerLauncher.launch("*/*")
                return true
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                // Hide splash overlay once loaded
                loadingOverlay.visibility = View.GONE
            }

            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: ""
                if (url.startsWith("http://127.0.0.1:3000") || url.startsWith("http://localhost:3000")) {
                    return false
                }
                // Open external links (e.g. OpenAI / Google device auth) in external browser
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                startActivity(intent)
                return true
            }
        }
        // Inisialisasi NativeBridge dua arah
        webView.addJavascriptInterface(com.bossbayu.aiteam.bridge.NativeBridge(this, this), "AndroidBridge")
    }

    fun showTerminalOverlay(sessionType: String = "alpine") {
        workstationManager.switchWorkstation(sessionType)
        val dialog = TerminalOverlayDialog(this, workstationManager, prootManager)
        dialog.show()
    }

    private fun setupTerminalFab() {
        fabTerminal.setOnClickListener {
            showTerminalOverlay("alpine")
        }
    }

    private fun setupBackHandler() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    // Send to background instead of destroying so service stays active
                    moveTaskToBack(true)
                }
            }
        })
    }

    private fun waitForServerAndLoad() {
        CoroutineScope(Dispatchers.Main).launch {
            tvLoadingStatus.text = "Menunggu server lokal siap..."
            var isUp = false
            var attempts = 0

            while (!isUp && attempts < 40) {
                isUp = kotlinx.coroutines.withContext(Dispatchers.IO) {
                    try {
                        val conn = URL("http://127.0.0.1:3000/api/status").openConnection() as HttpURLConnection
                        conn.connectTimeout = 800
                        conn.readTimeout = 800
                        conn.responseCode == 200
                    } catch (e: Exception) {
                        false
                    }
                }
                if (!isUp) {
                    delay(500)
                    attempts++
                }
            }

            tvLoadingStatus.text = "Memuat antarmuka Tim AI..."
            webView.loadUrl("http://127.0.0.1:3000")
        }
    }
}
