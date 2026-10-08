package com.bossbayu.aiteam.runtime

import android.content.Context
import android.net.ConnectivityManager
import android.os.Build
import android.system.Os
import android.util.Log
import org.apache.commons.compress.archivers.tar.TarArchiveEntry
import org.apache.commons.compress.archivers.tar.TarArchiveInputStream
import org.apache.commons.compress.compressors.gzip.GzipCompressorInputStream
import java.io.File
import java.io.FileOutputStream
import java.io.FileInputStream
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.Base64

/**
 * Manages the app-private Alpine workstation and verified AI engine pack.
 *
 * Alpine is checksum-verified by Gradle before APK packaging. AI engine
 * archives are downloaded on demand from pinned HTTPS sources, verified with
 * SHA-512 before extraction, and installed inside the app-private rootfs.
 * Extraction is staged and path-safe.
 */
class WorkstationManager(private val context: Context) {

    companion object {
        private const val TAG = "WorkstationManager"
        const val WS_ALPINE = "alpine"
        const val WS_UBUNTU = "ubuntu"

        private const val PREFS_NAME = "workstation_prefs"
        private const val KEY_ACTIVE_WS = "active_workstation"

        private const val ALPINE_VERSION = "3.24.2"
        private const val ROOTFS_MARKER = ".rootfs-version"

        private const val CODEX_VERSION = "0.160.1"
        private const val OPENCODE_VERSION = "2.0.24"
        private const val ANTIGRAVITY_VERSION = "1.3.1"
        private const val ENGINE_MARKER = ".engine-pack-version"
        private const val DEPS_MARKER = ".engine-deps-v1"
        private const val MAX_ENGINE_ARCHIVE_BYTES = 512L * 1024L * 1024L
    }


    private enum class DigestEncoding {
        BASE64
    }

    private data class EngineArtifact(
        val label: String,
        val filename: String,
        val url: String,
        val sha512: String,
        val encoding: DigestEncoding
    )

    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    val workstationsBaseDir: File
        get() = File(context.filesDir, "workstations").apply { mkdirs() }

    val alpineDir: File
        get() = File(workstationsBaseDir, WS_ALPINE)

    val ubuntuDir: File
        get() = File(workstationsBaseDir, WS_UBUNTU)

    val budiWorkspace: File
        get() = File(context.filesDir, "shared_workspaces/budi").apply { mkdirs() }

    val rianWorkspace: File
        get() = File(context.filesDir, "shared_workspaces/rian").apply { mkdirs() }

    var currentWorkstation: String
        get() = prefs.getString(KEY_ACTIVE_WS, WS_ALPINE) ?: WS_ALPINE
        set(value) {
            prefs.edit().putString(KEY_ACTIVE_WS, value).apply()
            Log.d(TAG, "Active workstation switched to: $value")
        }

    private fun alpineArch(): String {
        return when {
            Build.SUPPORTED_ABIS.contains("arm64-v8a") -> "aarch64"
            Build.SUPPORTED_ABIS.contains("x86_64") -> "x86_64"
            else -> throw IllegalStateException(
                "ABI perangkat tidak didukung oleh runtime v2: ${Build.SUPPORTED_ABIS.joinToString()}"
            )
        }
    }

    private fun codexTriple(arch: String): String = when (arch) {
        "aarch64" -> "aarch64-unknown-linux-musl"
        "x86_64" -> "x86_64-unknown-linux-musl"
        else -> error("Unsupported Codex arch: $arch")
    }

    private fun expectedAlpineMarker(): String = "alpine-$ALPINE_VERSION-${alpineArch()}"

    private fun expectedEngineMarker(): String =
        "codex=$CODEX_VERSION;opencode=$OPENCODE_VERSION;antigravity=$ANTIGRAVITY_VERSION;arch=${alpineArch()}"

    fun isAlpineInstalled(): Boolean {
        return File(alpineDir, "bin/sh").isFile &&
            File(alpineDir, ROOTFS_MARKER).readTextOrNull()?.trim() == expectedAlpineMarker()
    }

    fun isEnginePackInstalled(): Boolean {
        return File(alpineDir, "opt/aiteam/engines/$ENGINE_MARKER")
            .readTextOrNull()
            ?.trim() == expectedEngineMarker()
    }

    fun isUbuntuInstalled(): Boolean {
        return ubuntuDir.isDirectory && File(ubuntuDir, "bin/sh").isFile
    }

    fun getActiveRootfs(): File {
        return if (currentWorkstation == WS_UBUNTU && isUbuntuInstalled()) {
            ubuntuDir
        } else {
            alpineDir
        }
    }

    /**
     * Installs/verifies Alpine and creates persistent workspace directories.
     * All workstation mutations are serialized across Android processes.
     */
    fun ensureWorkstationsReady() {
        withRuntimeMutationLock {
            ensureWorkstationsReadyUnlocked()
        }
    }

    private fun ensureWorkstationsReadyUnlocked() {
        if (!isAlpineInstalled()) {
            Log.i(TAG, "Installing verified Alpine $ALPINE_VERSION rootfs...")
            extractAlpineFromAssets()
        }

        check(isAlpineInstalled()) {
            "Alpine rootfs gagal diverifikasi setelah instalasi."
        }

        configureGuestDns(alpineDir)
        budiWorkspace
        rianWorkspace
    }

    fun ensureEnginePackReady(
        onProgress: (String) -> Unit = {}
    ): Boolean = withRuntimeMutationLock {
        ensureWorkstationsReadyUnlocked()
        if (isEnginePackInstalled()) {
            true
        } else {
            try {
                installEnginePackFromNetwork(alpineDir, alpineArch(), onProgress)
                isEnginePackInstalled()
            } catch (e: Exception) {
                Log.e(TAG, "Engine provisioning failed: ${e.message}", e)
                false
            }
        }
    }

    /**
     * Installs small Alpine-native runtime dependencies needed by OpenCode and
     * by Codex search/shell helpers. Failure is recoverable and may be retried.
     */
    fun provisionEngineDependencies(prootManager: PRootManager): Boolean = withRuntimeMutationLock {
        ensureWorkstationsReadyUnlocked()

        val marker = File(alpineDir, "opt/aiteam/$DEPS_MARKER")
        if (marker.isFile) return@withRuntimeMutationLock true

        configureGuestDns(alpineDir)

        val result = prootManager.execute(
            rootfsDir = alpineDir,
            command = listOf(
                "/sbin/apk",
                "add",
                "--no-cache",
                "ca-certificates",
                "libstdc++",
                "ripgrep",
                "zsh",
                "git",
                "bash",
                "curl"
            ),
            budiWorkspace = budiWorkspace,
            rianWorkspace = rianWorkspace,
            environment = mapOf(
                "HOME" to "/root",
                "PATH" to "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
                "LANG" to "C.UTF-8"
            )
        )

        if (!result.isSuccess) {
            Log.w(TAG, "Alpine dependency provisioning failed: ${result.stderr.takeLast(1000)}")
            return@withRuntimeMutationLock false
        }

        marker.parentFile?.mkdirs()
        marker.writeText("ok\n")
        true
    }

    private fun <T> withRuntimeMutationLock(block: () -> T): T {
        val lockFile = File(workstationsBaseDir, ".runtime-mutation.lock")
        lockFile.parentFile?.mkdirs()

        FileOutputStream(lockFile, true).channel.use { channel ->
            channel.lock().use {
                return block()
            }
        }
    }

    private fun extractAlpineFromAssets() {
        val arch = alpineArch()
        val assetName = "alpine-minirootfs-$ALPINE_VERSION-$arch.tgz"
        val base = workstationsBaseDir
        val staging = File(base, ".alpine-staging-${System.nanoTime()}")
        val backup = File(base, ".alpine-backup")

        staging.deleteRecursively()
        staging.mkdirs()
        backup.deleteRecursively()

        try {
            extractTarGzAsset(
                assetPath = "rootfs/$assetName",
                targetRoot = staging
            ) { entryName, _ -> entryName }

            File(staging, "tmp").apply {
                mkdirs()
                chmodQuietly(this, 0x3FF) // 01777
            }

            File(staging, "opt/workspaces/budi").mkdirs()
            File(staging, "opt/workspaces/rian").mkdirs()
            File(staging, "opt/aiteam/runtime").mkdirs()

            val shell = File(staging, "bin/sh")
            check(shell.exists()) {
                "Rootfs Alpine hasil ekstraksi tidak memiliki /bin/sh."
            }

            File(staging, ROOTFS_MARKER).writeText(expectedAlpineMarker() + "\n")
            configureGuestDns(staging)

            if (alpineDir.exists()) {
                check(alpineDir.renameTo(backup)) {
                    "Gagal memindahkan rootfs lama ke backup."
                }
            }

            if (!staging.renameTo(alpineDir)) {
                if (backup.exists()) backup.renameTo(alpineDir)
                error("Gagal mengaktifkan rootfs Alpine baru.")
            }

            backup.deleteRecursively()
            Log.i(TAG, "Alpine $ALPINE_VERSION ($arch) rootfs ready.")
        } catch (e: Exception) {
            staging.deleteRecursively()
            if (!alpineDir.exists() && backup.exists()) {
                backup.renameTo(alpineDir)
            }
            Log.e(TAG, "Failed to install Alpine rootfs: ${e.message}", e)
            throw e
        }
    }


    private fun engineArtifacts(arch: String): List<EngineArtifact> {
        return when (arch) {
            "aarch64" -> listOf(
                EngineArtifact(
                    "OpenAI Codex",
                    "codex-$CODEX_VERSION.tgz",
                    "https://registry.npmjs.org/@openai/codex/-/codex-$CODEX_VERSION-linux-arm64.tgz",
                    "JLyjBlmjPvwTaicHemw+y5xQSz3Uja2r7F/xkvS8gFufTA2g132Ak+0fo35xnJ/k2uc9fTtjm0LrsEGI78L6Ng==",
                    DigestEncoding.BASE64
                ),
                EngineArtifact(
                    "OpenCode",
                    "opencode-$OPENCODE_VERSION.tgz",
                    "https://registry.npmjs.org/@opencode/cli-linux-arm64-musl/-/cli-linux-arm64-musl-$OPENCODE_VERSION.tgz",
                    "DfL6bISz9udxWU5AIEocMjDLnpgtWGfx5sw7fXKpLUhBFhsjdBOkCrBYuDBFuPwJoe5VJPdF+A/OoTfe+Wi6XA==",
                    DigestEncoding.BASE64
                ),
                EngineArtifact(
                    "Google Antigravity",
                    "antigravity-$ANTIGRAVITY_VERSION.tgz",
                    "https://storage.googleapis.com/antigravity-public/antigravity-cli/1.3.1-4582356770750464/linux-arm-musl/cli_linux_arm64_musl.tar.gz",
                    "iU+OmAAgZ2lm8GEBIqPxUgfizYLrc7/oVkGMMmI+U8fodi3zdT+rN07pXZL7jrQuISYOLHeT4Z5/HFWQXz9qXA==",
                    DigestEncoding.BASE64
                )
            )

            "x86_64" -> listOf(
                EngineArtifact(
                    "OpenAI Codex",
                    "codex-$CODEX_VERSION.tgz",
                    "https://registry.npmjs.org/@openai/codex/-/codex-$CODEX_VERSION-linux-x64.tgz",
                    "sIDhqV+bsZKKVaVFVY5iB+pAzyOz2XRm3H1KXCsSJwGj5p98qnrT0Fweo1Hfe7WnyTp8mfBNdbVzUeO+mHYugA==",
                    DigestEncoding.BASE64
                ),
                EngineArtifact(
                    "OpenCode",
                    "opencode-$OPENCODE_VERSION.tgz",
                    "https://registry.npmjs.org/@opencode/cli-linux-x64-musl/-/cli-linux-x64-musl-$OPENCODE_VERSION.tgz",
                    "PK2cEuioc9181iPYtwzLC4XqBjKMTjcO/5PNOvpM41mEgsyPTYfhX+IqgYcgvNEK1BPp/8oAl62xkMgBSxlupg==",
                    DigestEncoding.BASE64
                ),
                EngineArtifact(
                    "Google Antigravity",
                    "antigravity-$ANTIGRAVITY_VERSION.tgz",
                    "https://storage.googleapis.com/antigravity-public/antigravity-cli/1.3.1-4582356770750464/linux-x64-musl/cli_linux_x64_musl.tar.gz",
                    "AntxabKdnRqoC9KNjS3vqe9QNTvMGUxeRtExX6/inPdGJOjiTorQ1+qj4mUfXHCuj0DRSgoE22jwJ/6sHtzOHQ==",
                    DigestEncoding.BASE64
                )
            )

            else -> error("Unsupported engine architecture: $arch")
        }
    }

    private fun installEnginePackFromNetwork(
        rootfs: File,
        arch: String,
        onProgress: (String) -> Unit
    ) {
        val aiteamDir = File(rootfs, "opt/aiteam").apply { mkdirs() }
        val staging = File(aiteamDir, ".engines-staging-${System.nanoTime()}")
        val target = File(aiteamDir, "engines")
        val backup = File(aiteamDir, ".engines-backup")
        val binDir = File(aiteamDir, "bin")
        val cacheDir = File(context.cacheDir, "engine-downloads/$arch").apply { mkdirs() }

        staging.deleteRecursively()
        staging.mkdirs()
        backup.deleteRecursively()

        val artifacts = engineArtifacts(arch)
        val archives = artifacts.associateWith {
            downloadVerifiedArtifact(it, cacheDir, onProgress)
        }

        try {
            val triple = codexTriple(arch)
            val codexRoot = File(staging, "codex/vendor/$triple")

            extractTarGzFile(
                archives.getValue(artifacts[0]),
                codexRoot
            ) { entryName, entry ->
                val prefix = "package/vendor/$triple/"
                if (!entryName.startsWith(prefix)) {
                    return@extractTarGzFile null
                }
                val relative = entryName.removePrefix(prefix)
                when {
                    relative == "bin/codex" -> relative
                    relative == "bin/codex-code-mode-host" -> relative
                    relative == "codex-resources/bwrap" -> relative
                    relative == "codex-package.json" -> relative
                    relative.startsWith("codex-path/") -> null
                    relative.startsWith("codex-resources/zsh/") -> null
                    relative.startsWith("codex-resources/voice/") -> null
                    else -> if (entry.isDirectory) relative else null
                }
            }

            extractTarGzFile(
                archives.getValue(artifacts[1]),
                File(staging, "opencode")
            ) { entryName, _ ->
                if (entryName == "package/bin/opencode") "bin/opencode" else null
            }

            extractTarGzFile(
                archives.getValue(artifacts[2]),
                File(staging, "antigravity")
            ) { entryName, _ ->
                if (entryName == "antigravity") "bin/agy" else null
            }

            listOf(
                File(staging, "codex/vendor/$triple/bin/codex"),
                File(staging, "codex/vendor/$triple/bin/codex-code-mode-host"),
                File(staging, "codex/vendor/$triple/codex-resources/bwrap"),
                File(staging, "opencode/bin/opencode"),
                File(staging, "antigravity/bin/agy")
            ).forEach { executable ->
                check(executable.isFile) {
                    "Engine payload tidak lengkap: ${executable.absolutePath}"
                }
                chmodQuietly(executable, 0x1ED)
            }

            File(staging, ENGINE_MARKER).writeText(expectedEngineMarker() + "\n")

            if (target.exists()) {
                check(target.renameTo(backup)) { "Gagal membuat backup engine pack." }
            }
            if (!staging.renameTo(target)) {
                if (backup.exists()) backup.renameTo(target)
                error("Gagal mengaktifkan engine pack.")
            }
            backup.deleteRecursively()

            binDir.deleteRecursively()
            binDir.mkdirs()
            createRelativeSymlink(
                File(binDir, "codex"),
                "../engines/codex/vendor/$triple/bin/codex"
            )
            createRelativeSymlink(
                File(binDir, "opencode"),
                "../engines/opencode/bin/opencode"
            )
            createRelativeSymlink(
                File(binDir, "agy"),
                "../engines/antigravity/bin/agy"
            )
            cacheDir.deleteRecursively()
            onProgress("Engine AI siap.")
            Log.i(TAG, "Verified AI engine pack ready for $arch.")
        } catch (e: Exception) {
            staging.deleteRecursively()
            if (!target.exists() && backup.exists()) backup.renameTo(target)
            throw e
        }
    }

    private fun downloadVerifiedArtifact(
        artifact: EngineArtifact,
        cacheDir: File,
        onProgress: (String) -> Unit
    ): File {
        val destination = File(cacheDir, artifact.filename)
        if (destination.isFile && verifySha512(destination, artifact)) {
            onProgress("${artifact.label}: cache terverifikasi.")
            return destination
        }

        destination.delete()
        var lastError: Throwable? = null

        for (attempt in 1..3) {
            val partial = File(cacheDir, artifact.filename + ".part")
            partial.delete()

            onProgress(
                if (attempt == 1) "Mengunduh ${artifact.label}..."
                else "Mengulang ${artifact.label} (percobaan $attempt/3)..."
            )

            var connection: HttpURLConnection? = null
            try {
                connection = openHttpsConnection(artifact.url)

                val code = connection.responseCode
                check(code in 200..299) {
                    "${artifact.label}: HTTP $code"
                }

                val expectedLength = connection.contentLengthLong
                check(expectedLength <= 0 || expectedLength <= MAX_ENGINE_ARCHIVE_BYTES) {
                    "${artifact.label}: archive terlalu besar ($expectedLength bytes)"
                }

                var downloadedBytes = 0L
                var nextProgressAt = 8L * 1024L * 1024L

                connection.inputStream.use { input ->
                    FileOutputStream(partial).use { output ->
                        val buffer = ByteArray(128 * 1024)
                        while (true) {
                            val read = input.read(buffer)
                            if (read <= 0) break

                            downloadedBytes += read
                            check(downloadedBytes <= MAX_ENGINE_ARCHIVE_BYTES) {
                                "${artifact.label}: download melewati batas ukuran."
                            }

                            output.write(buffer, 0, read)

                            if (downloadedBytes >= nextProgressAt) {
                                val mib = downloadedBytes / (1024L * 1024L)
                                onProgress("Mengunduh ${artifact.label}: $mib MiB")
                                nextProgressAt += 8L * 1024L * 1024L
                            }
                        }
                        output.fd.sync()
                    }
                }

                check(expectedLength <= 0 || downloadedBytes == expectedLength) {
                    "${artifact.label}: download terpotong ($downloadedBytes/$expectedLength bytes)."
                }

                check(verifySha512(partial, artifact)) {
                    "${artifact.label}: SHA-512 tidak cocok."
                }

                if (!partial.renameTo(destination)) {
                    partial.copyTo(destination, overwrite = true)
                    partial.delete()
                }

                check(verifySha512(destination, artifact)) {
                    "${artifact.label}: verifikasi pasca-pindah gagal."
                }

                return destination
            } catch (e: Throwable) {
                lastError = e
                partial.delete()

                if (attempt < 3) {
                    Log.w(
                        TAG,
                        "${artifact.label} download attempt $attempt failed: ${e.message}"
                    )
                    Thread.sleep(attempt * 1_500L)
                }
            } finally {
                connection?.disconnect()
            }
        }

        destination.delete()
        throw IllegalStateException(
            "${artifact.label}: gagal diunduh dan diverifikasi setelah 3 percobaan.",
            lastError
        )
    }

    private fun openHttpsConnection(rawUrl: String): HttpURLConnection {
        var current = URL(rawUrl)

        repeat(6) { hop ->
            require(current.protocol.equals("https", ignoreCase = true)) {
                "Engine URL/redirect wajib HTTPS: $current"
            }

            val connection = current.openConnection() as HttpURLConnection
            connection.instanceFollowRedirects = false
            connection.connectTimeout = 20_000
            connection.readTimeout = 60_000
            connection.useCaches = false

            val code = connection.responseCode
            if (code !in setOf(301, 302, 303, 307, 308)) {
                return connection
            }

            val location = connection.getHeaderField("Location")
                ?: run {
                    connection.disconnect()
                    error("Redirect engine tanpa Location header.")
                }
            val next = URL(current, location)
            connection.disconnect()

            require(next.protocol.equals("https", ignoreCase = true)) {
                "Redirect engine ke non-HTTPS ditolak: $next"
            }
            current = next

            if (hop == 5) {
                error("Terlalu banyak redirect saat mengunduh engine.")
            }
        }

        error("Gagal membuka koneksi HTTPS engine.")
    }

    private fun verifySha512(file: File, artifact: EngineArtifact): Boolean {
        val digest = MessageDigest.getInstance("SHA-512")
        file.inputStream().use { input ->
            val buffer = ByteArray(1024 * 1024)
            while (true) {
                val read = input.read(buffer)
                if (read <= 0) break
                digest.update(buffer, 0, read)
            }
        }

        val bytes = digest.digest()
        val actual = when (artifact.encoding) {
            DigestEncoding.BASE64 -> Base64.getEncoder().encodeToString(bytes)
        }

        return MessageDigest.isEqual(
            actual.toByteArray(Charsets.US_ASCII),
            artifact.sha512.toByteArray(Charsets.US_ASCII)
        )
    }


    private fun createRelativeSymlink(link: File, target: String) {
        link.delete()
        link.parentFile?.mkdirs()
        Os.symlink(target, link.absolutePath)
    }

    /**
     * Generic gzip+tar extractor with an entry mapper. Returning null skips an
     * entry. All destination paths are checked against traversal.
     */
    private fun extractTarGzFile(
        archive: File,
        targetRoot: File,
        mapEntry: (String, TarArchiveEntry) -> String?
    ) {
        targetRoot.mkdirs()

        val symlinks = mutableListOf<Pair<File, String>>()
        val hardLinks = mutableListOf<Pair<File, String>>()

        FileInputStream(archive).use { raw ->
            GzipCompressorInputStream(raw).use { gzip ->
                TarArchiveInputStream(gzip).use { tar ->
                    var entry = tar.nextEntry as? TarArchiveEntry
                    while (entry != null) {
                        val sourceName = entry.name.removePrefix("./")
                        val mapped = mapEntry(sourceName, entry)

                        if (!mapped.isNullOrBlank()) {
                            val target = safeTarget(targetRoot, mapped)

                            when {
                                entry.isDirectory -> target.mkdirs()

                                entry.isSymbolicLink -> {
                                    target.parentFile?.mkdirs()
                                    symlinks += target to entry.linkName
                                }

                                entry.isLink -> {
                                    target.parentFile?.mkdirs()
                                    hardLinks += target to entry.linkName
                                }

                                entry.isFile -> {
                                    target.parentFile?.mkdirs()
                                    FileOutputStream(target).use { output ->
                                        tar.copyTo(output)
                                    }
                                    chmodQuietly(target, entry.mode)
                                }
                            }
                        }

                        entry = tar.nextEntry as? TarArchiveEntry
                    }
                }
            }
        }

        for ((target, linkName) in hardLinks) {
            val source = safeTarget(targetRoot, linkName.removePrefix("./"))
            check(source.exists()) { "Hardlink source tidak ditemukan: $linkName" }
            target.delete()
            Os.link(source.absolutePath, target.absolutePath)
        }

        for ((target, linkName) in symlinks) {
            target.delete()
            Os.symlink(linkName, target.absolutePath)
        }
    }

    private fun extractTarGzAsset(
        assetPath: String,
        targetRoot: File,
        mapEntry: (String, TarArchiveEntry) -> String?
    ) {
        targetRoot.mkdirs()

        val symlinks = mutableListOf<Pair<File, String>>()
        val hardLinks = mutableListOf<Pair<File, String>>()

        context.assets.open(assetPath).use { raw ->
            GzipCompressorInputStream(raw).use { gzip ->
                TarArchiveInputStream(gzip).use { tar ->
                    var entry = tar.nextEntry as? TarArchiveEntry
                    while (entry != null) {
                        val sourceName = entry.name.removePrefix("./")
                        val mapped = mapEntry(sourceName, entry)

                        if (!mapped.isNullOrBlank()) {
                            val target = safeTarget(targetRoot, mapped)

                            when {
                                entry.isDirectory -> target.mkdirs()

                                entry.isSymbolicLink -> {
                                    target.parentFile?.mkdirs()
                                    symlinks += target to entry.linkName
                                }

                                entry.isLink -> {
                                    target.parentFile?.mkdirs()
                                    hardLinks += target to entry.linkName
                                }

                                entry.isFile -> {
                                    target.parentFile?.mkdirs()
                                    FileOutputStream(target).use { output ->
                                        tar.copyTo(output)
                                    }
                                    chmodQuietly(target, entry.mode)
                                }
                            }
                        }

                        entry = tar.nextEntry as? TarArchiveEntry
                    }
                }
            }
        }

        for ((target, linkName) in hardLinks) {
            val source = safeTarget(targetRoot, linkName.removePrefix("./"))
            check(source.exists()) { "Hardlink source tidak ditemukan: $linkName" }
            target.delete()
            Os.link(source.absolutePath, target.absolutePath)
        }

        for ((target, linkName) in symlinks) {
            target.delete()
            Os.symlink(linkName, target.absolutePath)
        }
    }

    private fun configureGuestDns(rootfs: File) {
        try {
            val connectivity =
                context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            val active = connectivity.activeNetwork ?: return
            val dnsServers = connectivity.getLinkProperties(active)?.dnsServers.orEmpty()
            if (dnsServers.isEmpty()) return

            val resolv = File(rootfs, "etc/resolv.conf")
            resolv.parentFile?.mkdirs()
            resolv.writeText(
                dnsServers.joinToString(separator = "\n", postfix = "\n") {
                    "nameserver ${it.hostAddress}"
                }
            )
        } catch (e: Exception) {
            Log.w(TAG, "Tidak dapat menyinkronkan DNS Android ke rootfs: ${e.message}")
        }
    }

    private fun safeTarget(root: File, archivePath: String): File {
        val normalized = archivePath
            .replace('\\', '/')
            .trimStart('/')

        require(normalized.isNotBlank()) { "Path archive kosong." }
        require(!normalized.split('/').contains("..")) {
            "Path traversal ditolak: $archivePath"
        }

        val target = File(root, normalized)
        val rootPath = root.canonicalFile.absolutePath + File.separator
        val targetPath = target.canonicalFile.absolutePath

        require(targetPath.startsWith(rootPath)) {
            "Entry keluar dari target staging: $archivePath"
        }
        return target
    }

    private fun chmodQuietly(file: File, mode: Int) {
        try {
            Os.chmod(file.absolutePath, mode and 0xFFF)
        } catch (e: Exception) {
            Log.w(TAG, "chmod gagal untuk ${file.absolutePath}: ${e.message}")
        }
    }

    private fun File.readTextOrNull(): String? {
        return try {
            if (isFile) readText() else null
        } catch (_: Exception) {
            null
        }
    }

    fun switchWorkstation(target: String): Boolean {
        if (target == WS_UBUNTU && !isUbuntuInstalled()) {
            Log.w(TAG, "Ubuntu belum diprovisikan pada hardened v2.")
            return false
        }

        if (target == WS_ALPINE) {
            ensureWorkstationsReady()
        }

        currentWorkstation = if (target == WS_UBUNTU) WS_UBUNTU else WS_ALPINE
        return true
    }

    /**
     * Ubuntu remains intentionally disabled until its rootfs and extraction
     * path receives the same per-ABI verification guarantees as Alpine.
     */
    fun installUbuntuWorkstation(onProgress: (percent: Int, status: String) -> Unit): Boolean {
        onProgress(
            -1,
            "Installer Ubuntu belum diaktifkan di hardened v2. Alpine adalah workstation default yang tervalidasi."
        )
        return false
    }
}
