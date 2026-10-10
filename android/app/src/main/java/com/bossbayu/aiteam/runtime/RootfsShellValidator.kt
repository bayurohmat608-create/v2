package com.bossbayu.aiteam.runtime

import android.system.Os
import java.io.File

/**
 * Read guest-absolute shell symlinks without following them in Android's host
 * filesystem. PRoot resolves these links inside the guest rootfs at execution.
 * Only known Alpine BusyBox targets are accepted; a normal /bin/sh file is
 * accepted for future workstations that ship a real shell executable.
 */
internal object RootfsShellValidator {
    fun hasShell(root: File): Boolean {
        val shell = File(root, "bin/sh")
        val link = try {
            Os.readlink(shell.absolutePath)
        } catch (_: Exception) {
            null
        }

        return if (link != null) {
            (link == "/bin/busybox" || link == "busybox") &&
                File(root, "bin/busybox").isFile
        } else {
            shell.isFile
        }
    }
}
