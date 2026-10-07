package com.bossbayu.aiteam.terminal

import android.app.Dialog
import android.content.Context
import android.os.Bundle
import android.view.ViewGroup
import android.view.inputmethod.EditorInfo
import android.widget.Button
import android.widget.EditText
import android.widget.ImageButton
import android.widget.ScrollView
import android.widget.TextView
import com.bossbayu.aiteam.R
import com.bossbayu.aiteam.runtime.PRootManager
import com.bossbayu.aiteam.runtime.WorkstationManager

/**
 * Floating in-app terminal console overlay.
 */
class TerminalOverlayDialog(
    context: Context,
    private val workstationManager: WorkstationManager,
    private val prootManager: PRootManager
) : Dialog(context, android.R.style.Theme_Black_NoTitleBar_Fullscreen) {

    private lateinit var tvOutput: TextView
    private lateinit var etCommand: EditText
    private lateinit var scrollTerminal: ScrollView
    private lateinit var tvTitle: TextView
    private var terminalSession: TerminalSession? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.dialog_terminal)
        window?.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)

        tvTitle = findViewById(R.id.tvTerminalTitle)
        tvOutput = findViewById(R.id.tvTerminalOutput)
        etCommand = findViewById(R.id.etTerminalCommand)
        scrollTerminal = findViewById(R.id.scrollTerminal)

        val btnClear = findViewById<Button>(R.id.btnTerminalClear)
        val btnClose = findViewById<Button>(R.id.btnTerminalClose)
        val btnSend = findViewById<ImageButton>(R.id.btnTerminalSend)

        tvTitle.text = "Terminal Workstation (${workstationManager.currentWorkstation.uppercase()})"

        btnClear.setOnClickListener {
            tvOutput.text = ""
        }

        btnClose.setOnClickListener {
            dismiss()
        }

        btnSend.setOnClickListener {
            submitCommand()
        }

        etCommand.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_SEND) {
                submitCommand()
                true
            } else {
                false
            }
        }

        val toolbar = findViewById<TerminalToolbar>(R.id.terminalToolbar)
        toolbar?.setKeyPressListener(object : TerminalToolbar.KeyPressListener {
            override fun onSpecialKeyPressed(keyName: String, sequence: ByteArray) {
                when (keyName) {
                    "ESC" -> terminalSession?.sendCommand(String(sequence))
                    "TAB" -> etCommand.append("  ")
                    "|" -> etCommand.append(" | ")
                    "/" -> etCommand.append("/")
                    "-" -> etCommand.append("-")
                    "~" -> etCommand.append("~")
                    else -> {
                        if (sequence.isNotEmpty()) {
                            terminalSession?.sendCommand(String(sequence))
                        }
                    }
                }
            }
        })

        startTerminal()
    }

    private fun startTerminal() {
        val feedbackManager = TerminalFeedbackManager(context)
        terminalSession = TerminalSession(workstationManager, prootManager, feedbackManager) { text ->
            tvOutput.post {
                tvOutput.append(text)
                scrollTerminal.fullScroll(ScrollView.FOCUS_DOWN)
            }
        }.apply {
            start()
        }
    }

    private fun submitCommand() {
        val cmd = etCommand.text.toString().trim()
        if (cmd.isNotEmpty()) {
            terminalSession?.sendCommand(cmd)
            etCommand.setText("")
        }
    }

    override fun onStop() {
        super.onStop()
        terminalSession?.close()
        terminalSession = null
    }
}
