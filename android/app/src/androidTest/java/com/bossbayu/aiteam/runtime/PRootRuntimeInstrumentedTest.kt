package com.bossbayu.aiteam.runtime

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.bossbayu.aiteam.terminal.TerminalSession
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * Runs under the APK UID on a real emulator, using production PRootManager and TerminalSession.
 * Fixed read-only commands only. Does not write workspace data or expose HTTP execution.
 */
@RunWith(AndroidJUnit4::class)
class PRootRuntimeInstrumentedTest {
    @Test
    fun productionLauncherExecutesAlpineGuestCommand() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val workstations = WorkstationManager(context)
        workstations.ensureWorkstationsReady()
        val proot = PRootManager(context)
        assertTrue("PRoot native executable and loader missing", proot.isPRootInstalled())
        val result = proot.execute(
            rootfsDir = workstations.alpineDir,
            command = listOf("/bin/sh", "-c", "printf CP18_PROOT_MANAGER_PASS"),
            budiWorkspace = workstations.budiWorkspace,
            rianWorkspace = workstations.rianWorkspace
        )
        assertEquals("PRoot failed: ${result.stderr.take(500)}", 0, result.exitCode)
        assertTrue("No guest marker: ${result.stdout.take(500)}", result.stdout.contains("CP18_PROOT_MANAGER_PASS"))
    }

    @Test
    fun terminalSessionReceivesCommandAndCloses() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val workstations = WorkstationManager(context)
        workstations.ensureWorkstationsReady()
        val marker = "CP18_TERMINAL_INPUT_PASS"
        val ready = CountDownLatch(1)
        val latch = CountDownLatch(1)
        val output = StringBuilder()
        val session = TerminalSession(workstations, PRootManager(context), null) { text ->
            synchronized(output) {
                output.append(text.take(2048))
                if (output.contains("CP16_TERMINAL_SHELL_STARTED")) ready.countDown()
                if (output.contains(marker)) latch.countDown()
            }
        }
        try {
            session.start()
            // Fixed command is queued by the same IO coroutine scope as startup.
            assertTrue("Guest shell never produced startup marker", ready.await(25, TimeUnit.SECONDS))
            session.sendCommand("printf $marker")
            assertTrue("No terminal output: ${synchronized(output) { output.toString().takeLast(700) }}",
                latch.await(25, TimeUnit.SECONDS))
        } finally {
            session.close()
        }
    }
}
