package com.bossbayu.aiteam.runtime

/**
 * JNI bridge for the embedded Node.js Mobile runtime.
 *
 * Node is loaded from the APK's native library directory, so Android's
 * executable-code policy is respected and no writable binary needs exec().
 */
object NodeBridge {

    init {
        System.loadLibrary("node")
        System.loadLibrary("node_bridge")
    }

    external fun startNodeWithArguments(arguments: Array<String>): Int
}
