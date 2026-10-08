import java.io.File
import java.net.URI
import java.security.MessageDigest
import java.util.Base64

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
}

val nodeMobileVersion = "24.20.0-0"
val nodeMobileSha256 = "f5ffbaf4f2679fa9180b0758c637c2f8fc8828300f95129badf213a028fb37bb"
val nodeMobileUrl = "https://github.com/digidem/nodejs-mobile/releases/download/v$nodeMobileVersion/nodejs-mobile-android-$nodeMobileVersion.zip"
val nodeMobileRoot = layout.buildDirectory.dir("node-mobile")
val nodeMobileZip = layout.buildDirectory.file("downloads/nodejs-mobile-android-$nodeMobileVersion.zip")

val supportedRuntimeAbis = mapOf(
    "arm64-v8a" to "aarch64",
    "x86_64" to "x86_64"
)
val runtimeAbi = providers.gradleProperty("runtimeAbi").orElse("arm64-v8a").get()
require(runtimeAbi in supportedRuntimeAbis) {
    "Unsupported runtimeAbi=$runtimeAbi. Supported: ${supportedRuntimeAbis.keys.joinToString()}"
}
val runtimeArch = supportedRuntimeAbis.getValue(runtimeAbi)

val alpineVersion = "3.24.2"
val alpineRootfsSha256 = mapOf(
    "aarch64" to "9bf70a7f18ea44094cbb5f70c58f9af129c8214745743db0e68e5502cc2ce773",
    "x86_64" to "c5ca053cfe1d85c5b96dff8b9bc57045f7f184a30ffb6b65776409ca90388677"
)
val alpineRootfsDir = layout.buildDirectory.dir("alpine-rootfs")
val androidEngineDir = layout.buildDirectory.dir("android-engines")

data class AndroidEngineArtifact(
    val arch: String,
    val filename: String,
    val url: String,
    val sha512: String,
    val sha512Encoding: String
)

val androidEngineArtifacts = listOf(
    AndroidEngineArtifact(
        arch = "aarch64",
        filename = "codex-0.160.1.tgz",
        url = "https://registry.npmjs.org/@openai/codex/-/codex-0.160.1-linux-arm64.tgz",
        sha512 = "JLyjBlmjPvwTaicHemw+y5xQSz3Uja2r7F/xkvS8gFufTA2g132Ak+0fo35xnJ/k2uc9fTtjm0LrsEGI78L6Ng==",
        sha512Encoding = "base64"
    ),
    AndroidEngineArtifact(
        arch = "x86_64",
        filename = "codex-0.160.1.tgz",
        url = "https://registry.npmjs.org/@openai/codex/-/codex-0.160.1-linux-x64.tgz",
        sha512 = "sIDhqV+bsZKKVaVFVY5iB+pAzyOz2XRm3H1KXCsSJwGj5p98qnrT0Fweo1Hfe7WnyTp8mfBNdbVzUeO+mHYugA==",
        sha512Encoding = "base64"
    ),
    AndroidEngineArtifact(
        arch = "aarch64",
        filename = "opencode-2.0.24.tgz",
        url = "https://registry.npmjs.org/@opencode/cli-linux-arm64-musl/-/cli-linux-arm64-musl-2.0.24.tgz",
        sha512 = "DfL6bISz9udxWU5AIEocMjDLnpgtWGfx5sw7fXKpLUhBFhsjdBOkCrBYuDBFuPwJoe5VJPdF+A/OoTfe+Wi6XA==",
        sha512Encoding = "base64"
    ),
    AndroidEngineArtifact(
        arch = "x86_64",
        filename = "opencode-2.0.24.tgz",
        url = "https://registry.npmjs.org/@opencode/cli-linux-x64-musl/-/cli-linux-x64-musl-2.0.24.tgz",
        sha512 = "PK2cEuioc9181iPYtwzLC4XqBjKMTjcO/5PNOvpM41mEgsyPTYfhX+IqgYcgvNEK1BPp/8oAl62xkMgBSxlupg==",
        sha512Encoding = "base64"
    ),
    AndroidEngineArtifact(
        arch = "aarch64",
        filename = "antigravity-1.3.1.tgz",
        url = "https://storage.googleapis.com/antigravity-public/antigravity-cli/1.3.1-4582356770750464/linux-arm-musl/cli_linux_arm64_musl.tar.gz",
        sha512 = "894f8e980020676966f0610122a3f15207e2cd82eb73bfe856418c32623e53c7e8762df3753fab374ee95d92fb8eb42e21260e2c7793e19e7f1c55905f3f6a5c",
        sha512Encoding = "hex"
    ),
    AndroidEngineArtifact(
        arch = "x86_64",
        filename = "antigravity-1.3.1.tgz",
        url = "https://storage.googleapis.com/antigravity-public/antigravity-cli/1.3.1-4582356770750464/linux-x64-musl/cli_linux_x64_musl.tar.gz",
        sha512 = "027b7169b29d9d1aa80bd28d8d2defa9ef50353bcc194c5e46d1315fafe29cf74624e8e24e8ad0d7eaa3e2651f5c70ae8f40d14a0a04db68f027feac1edcce1d",
        sha512Encoding = "hex"
    )
)

fun sha256(file: File): String {
    val digest = MessageDigest.getInstance("SHA-256")
    file.inputStream().use { input ->
        val buffer = ByteArray(1024 * 1024)
        while (true) {
            val read = input.read(buffer)
            if (read <= 0) break
            digest.update(buffer, 0, read)
        }
    }
    return digest.digest().joinToString("") { "%02x".format(it) }
}

fun sha512Hex(file: File): String {
    val digest = MessageDigest.getInstance("SHA-512")
    file.inputStream().use { input ->
        val buffer = ByteArray(1024 * 1024)
        while (true) {
            val read = input.read(buffer)
            if (read <= 0) break
            digest.update(buffer, 0, read)
        }
    }
    return digest.digest().joinToString("") { "%02x".format(it) }
}

fun sha512Base64(file: File): String {
    val digest = MessageDigest.getInstance("SHA-512")
    file.inputStream().use { input ->
        val buffer = ByteArray(1024 * 1024)
        while (true) {
            val read = input.read(buffer)
            if (read <= 0) break
            digest.update(buffer, 0, read)
        }
    }
    return Base64.getEncoder().encodeToString(digest.digest())
}



val prepareNodeMobile by tasks.registering {
    inputs.property("nodeMobileVersion", nodeMobileVersion)
    outputs.dir(nodeMobileRoot)

    doLast {
        val zipFile = nodeMobileZip.get().asFile
        zipFile.parentFile.mkdirs()

        if (!zipFile.exists() || sha256(zipFile) != nodeMobileSha256) {
            zipFile.delete()
            URI(nodeMobileUrl).toURL().openStream().use { input ->
                zipFile.outputStream().use { output -> input.copyTo(output) }
            }
        }

        val actualSha = sha256(zipFile)
        check(actualSha == nodeMobileSha256) {
            "Node Mobile checksum mismatch: expected $nodeMobileSha256, got $actualSha"
        }

        val target = nodeMobileRoot.get().asFile
        target.deleteRecursively()
        target.mkdirs()
        copy {
            from(zipTree(zipFile))
            into(target)
        }
    }
}

val prepareAlpineRootfs by tasks.registering {
    inputs.property("alpineVersion", alpineVersion)
    inputs.property("runtimeAbi", runtimeAbi)
    inputs.property("runtimeArch", runtimeArch)
    inputs.property("alpineRootfsSha256", alpineRootfsSha256.getValue(runtimeArch))
    outputs.dir(alpineRootfsDir)

    doLast {
        val targetDir = alpineRootfsDir.get().asFile
        targetDir.deleteRecursively()
        targetDir.mkdirs()

        mapOf(runtimeArch to alpineRootfsSha256.getValue(runtimeArch)).forEach { (arch, expectedSha) ->
            val remoteFilename = "alpine-minirootfs-$alpineVersion-$arch.tar.gz"
            val assetFilename = "alpine-minirootfs-$alpineVersion-$arch.tgz"
            val output = File(targetDir, assetFilename)
            val url = "https://dl-cdn.alpinelinux.org/alpine/v3.24/releases/$arch/$remoteFilename"

            if (!output.exists() || sha256(output) != expectedSha) {
                output.delete()
                URI(url).toURL().openStream().use { input ->
                    output.outputStream().use { stream -> input.copyTo(stream) }
                }
            }

            val actualSha = sha256(output)
            check(actualSha == expectedSha) {
                "Alpine rootfs checksum mismatch for $arch: expected $expectedSha, got $actualSha"
            }
        }
    }
}


val prepareAndroidEngines by tasks.registering {
    val selectedArtifacts = androidEngineArtifacts.filter { it.arch == runtimeArch }

    inputs.property("runtimeAbi", runtimeAbi)
    inputs.property("runtimeArch", runtimeArch)
    inputs.property(
        "engineArtifacts",
        selectedArtifacts.joinToString("|") { "${it.arch}:${it.filename}:${it.sha512}" }
    )
    outputs.dir(androidEngineDir)

    doLast {
        val targetDir = androidEngineDir.get().asFile
        targetDir.deleteRecursively()
        targetDir.mkdirs()

        selectedArtifacts.forEach { artifact ->
            val output = File(targetDir, artifact.filename)

            fun verified(): Boolean {
                if (!output.isFile) return false
                val actual = if (artifact.sha512Encoding == "base64") {
                    sha512Base64(output)
                } else {
                    sha512Hex(output)
                }
                return actual == artifact.sha512
            }

            if (!verified()) {
                output.delete()
                URI(artifact.url).toURL().openStream().use { input ->
                    output.outputStream().use { stream -> input.copyTo(stream) }
                }
            }

            check(verified()) {
                "Engine checksum mismatch for ${artifact.arch}/${artifact.filename}"
            }
        }
    }
}

val generatedRuntimeAssets = layout.buildDirectory.dir("generated/runtimeAssets")

val syncRuntimeAssets by tasks.registering(Sync::class) {
    val repoRoot = rootProject.projectDir.parentFile
    into(generatedRuntimeAssets)

    from(repoRoot.resolve("server.js")) { into("server") }
    from(repoRoot.resolve("cli.js")) { into("server") }
    from(repoRoot.resolve("package.json")) { into("server") }
    from(repoRoot.resolve("personas")) { into("server/personas") }
    from(repoRoot.resolve("web")) { into("web") }
    from(alpineRootfsDir) { into("rootfs") }
    from(androidEngineDir) { into("engines/$runtimeArch") }
}

syncRuntimeAssets.configure {
    dependsOn(prepareAlpineRootfs, prepareAndroidEngines)
}

android {
    namespace = "com.bossbayu.aiteam"
    compileSdk = 36

    ndkVersion = "27.0.12077973"

    defaultConfig {
        applicationId = "com.bossbayu.aiteam"
        minSdk = 26
        targetSdk = 36
        versionCode = 2
        versionName = "2.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        ndk {
            abiFilters.add(runtimeAbi)
        }

        externalNativeBuild {
            cmake {
                cppFlags += "-std=c++20"
                arguments += listOf(
                    "-DANDROID_STL=c++_shared",
                    "-DANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON",
                    "-DNODE_MOBILE_DIR=${nodeMobileRoot.get().asFile.absolutePath}"
                )
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        viewBinding = true
    }

    sourceSets {
        getByName("main") {
            assets {
                setSrcDirs(listOf(generatedRuntimeAssets))
            }
            jniLibs {
                srcDirs("src/main/jniLibs")
                srcDir(nodeMobileRoot.map { it.dir("bin") })
            }
        }
    }

    externalNativeBuild {
        cmake {
            path = file("src/main/cpp/CMakeLists.txt")
            version = "3.22.1"
        }
    }

    packaging {
        jniLibs {
            // PRoot is packaged as libproot_exec.so but executed via ProcessBuilder.
            // It therefore must exist as a real file in nativeLibraryDir.
            useLegacyPackaging = true
        }
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.material)
    implementation(libs.androidx.webkit)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.commons.compress)
}


tasks.named("preBuild").configure {
    dependsOn(syncRuntimeAssets, prepareNodeMobile, prepareAlpineRootfs, prepareAndroidEngines)
}

tasks.configureEach {
    if (name.contains("CMake", ignoreCase = true) || name.contains("NativeLibs", ignoreCase = true)) {
        dependsOn(prepareNodeMobile)
    }
}
