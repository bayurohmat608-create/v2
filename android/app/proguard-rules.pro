# ProGuard / R8 Rules for WhatsApp AI Team IDE
# Menjaga JavaScript Interface agar tidak diobfuscate/dihapus oleh R8

-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep classes used by Reflection, WebView Bridge, and Native bindings
-keep class com.bossbayu.aiteam.bridge.** { *; }
-keep class com.bossbayu.aiteam.kadb.** { *; }
-keep class com.bossbayu.aiteam.runtime.** { *; }
-keep class com.bossbayu.aiteam.terminal.** { *; }
-keep class com.bossbayu.aiteam.service.** { *; }
