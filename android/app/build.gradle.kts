import java.io.File
import java.net.URI
import java.security.MessageDigest

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


val generatedRuntimeAssets = layout.buildDirectory.dir("generated/runtimeAssets")

val syncRuntimeAssets by tasks.registering(Sync::class) {
    val repoRoot = rootProject.projectDir.parentFile
    into(generatedRuntimeAssets)

    from(repoRoot.resolve("server.js")) { into("server") }
    from(repoRoot.resolve("cli.js")) { into("server") }
    from(repoRoot.resolve("package.json")) { into("server") }
    from(repoRoot.resolve("agent")) { into("server/agent") }
    from(repoRoot.resolve("personas")) { into("server/personas") }
    from(repoRoot.resolve("web")) { into("web") }
    from(alpineRootfsDir) { into("rootfs") }
}

syncRuntimeAssets.configure {
    dependsOn(prepareAlpineRootfs)
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
            // PRoot is executed as an ELF program, not loaded through JNI.
            // Stripping it mutates verified upstream bytes and invalidates the
            // executable integrity gate after APK extraction.
            keepDebugSymbols.add("**/libproot_exec.so")
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

    // Instrumentation runs only with a separate, CI-installed test APK.
    androidTestImplementation("androidx.test:runner:1.6.2")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
}


tasks.named("preBuild").configure {
    dependsOn(syncRuntimeAssets, prepareNodeMobile, prepareAlpineRootfs)
}

tasks.configureEach {
    if (name.contains("CMake", ignoreCase = true) || name.contains("NativeLibs", ignoreCase = true)) {
        dependsOn(prepareNodeMobile)
    }
}
