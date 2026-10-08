plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
}

val nodeMobileVersion = "24.20.0-0"
val nodeMobileSha256 = "f5ffbaf4f2679fa9180b0758c637c2f8fc8828300f95129badf213a028fb37bb"
val nodeMobileUrl = "https://github.com/digidem/nodejs-mobile/releases/download/v$nodeMobileVersion/nodejs-mobile-android-$nodeMobileVersion.zip"
val nodeMobileRoot = layout.buildDirectory.dir("node-mobile")
val nodeMobileZip = layout.buildDirectory.file("downloads/nodejs-mobile-android-$nodeMobileVersion.zip")

fun sha256(file: File): String {
    val digest = java.security.MessageDigest.getInstance("SHA-256")
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
            java.net.URI(nodeMobileUrl).toURL().openStream().use { input ->
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

val generatedRuntimeAssets = layout.buildDirectory.dir("generated/runtimeAssets")

val syncRuntimeAssets by tasks.registering(Sync::class) {
    val repoRoot = rootProject.projectDir.parentFile
    into(generatedRuntimeAssets)

    from(repoRoot.resolve("server.js")) { into("server") }
    from(repoRoot.resolve("cli.js")) { into("server") }
    from(repoRoot.resolve("package.json")) { into("server") }
    from(repoRoot.resolve("personas")) { into("server/personas") }
    from(repoRoot.resolve("web")) { into("web") }
}

android {
    namespace = "com.bossbayu.aiteam"
    compileSdk = 36

    ndkVersion = "27.0.12077973"

    defaultConfig {
        applicationId = "com.bossbayu.aiteam"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        ndk {
            abiFilters.addAll(listOf("arm64-v8a", "x86_64"))
        }

        externalNativeBuild {
            cmake {
                cppFlags += "-std=c++17"
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
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.material)
    implementation(libs.androidx.webkit)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.kotlinx.coroutines.android)
}


tasks.named("preBuild").configure {
    dependsOn(syncRuntimeAssets, prepareNodeMobile)
}

tasks.configureEach {
    if (name.contains("CMake", ignoreCase = true) || name.contains("NativeLibs", ignoreCase = true)) {
        dependsOn(prepareNodeMobile)
    }
}
