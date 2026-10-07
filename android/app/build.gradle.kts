plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
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
            }
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
    dependsOn(syncRuntimeAssets)
}
