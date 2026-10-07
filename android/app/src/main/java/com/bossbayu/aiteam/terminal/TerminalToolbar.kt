package com.bossbayu.aiteam.terminal

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.util.AttributeSet
import android.view.Gravity
import android.widget.Button
import android.widget.HorizontalScrollView
import android.widget.LinearLayout

/**
 * TerminalToolbar — Bilah Tombol Virtual Cepat (Accessory Bar) untuk input terminal HP
 * (ESC, TAB, CTRL, ALT, |, /, -, ~, dan tombol panah navigasi).
 */
class TerminalToolbar @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : HorizontalScrollView(context, attrs, defStyleAttr) {

    interface KeyPressListener {
        fun onSpecialKeyPressed(keyName: String, sequence: ByteArray)
    }

    private var listener: KeyPressListener? = null
    private var isCtrlActive = false
    private var isAltActive = false

    fun setKeyPressListener(listener: KeyPressListener) {
        this.listener = listener
    }

    init {
        isHorizontalScrollBarEnabled = false
        setBackgroundColor(Color.parseColor("#1f2c34"))

        val container = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(8, 4, 8, 4)
        }

        val keys = listOf(
            "ESC" to byteArrayOf(27),
            "TAB" to byteArrayOf(9),
            "CTRL" to byteArrayOf(),
            "ALT" to byteArrayOf(),
            "|" to "|".toByteArray(),
            "/" to "/".toByteArray(),
            "-" to "-".toByteArray(),
            "~" to "~".toByteArray(),
            "HOME" to byteArrayOf(27, 91, 72),
            "END" to byteArrayOf(27, 91, 70),
            "▲" to byteArrayOf(27, 91, 65),
            "▼" to byteArrayOf(27, 91, 66),
            "◄" to byteArrayOf(27, 91, 68),
            "►" to byteArrayOf(27, 91, 67)
        )

        for ((label, seq) in keys) {
            val btn = Button(context).apply {
                text = label
                setTextColor(Color.parseColor("#e9edef"))
                textSize = 12f
                typeface = Typeface.MONOSPACE
                setBackgroundColor(Color.parseColor("#2a3942"))
                minWidth = 100
                minimumWidth = 100
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(4, 2, 4, 2)
                }

                setOnClickListener {
                    when (label) {
                        "CTRL" -> {
                            isCtrlActive = !isCtrlActive
                            setBackgroundColor(if (isCtrlActive) Color.parseColor("#00a884") else Color.parseColor("#2a3942"))
                        }
                        "ALT" -> {
                            isAltActive = !isAltActive
                            setBackgroundColor(if (isAltActive) Color.parseColor("#00a884") else Color.parseColor("#2a3942"))
                        }
                        else -> {
                            var finalSeq = seq
                            if (isCtrlActive && seq.size == 1) {
                                val charCode = seq[0].toInt()
                                if (charCode in 97..122) { // a-z
                                    finalSeq = byteArrayOf((charCode - 96).toByte())
                                }
                                isCtrlActive = false
                                findViewWithTag<Button>("CTRL")?.setBackgroundColor(Color.parseColor("#2a3942"))
                            }
                            listener?.onSpecialKeyPressed(label, finalSeq)
                        }
                    }
                }
                tag = label
            }
            container.addView(btn)
        }

        addView(container)
    }
}
