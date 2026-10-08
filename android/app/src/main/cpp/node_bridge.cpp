#include <jni.h>
#include <node.h>

#include <cstring>
#include <string>
#include <vector>

extern "C"
JNIEXPORT jint JNICALL
Java_com_bossbayu_aiteam_runtime_NodeBridge_startNodeWithArguments(
        JNIEnv* env,
        jobject,
        jobjectArray arguments) {
    const jsize argc = env->GetArrayLength(arguments);
    if (argc <= 0) {
        return -1;
    }

    std::vector<std::string> values;
    values.reserve(static_cast<size_t>(argc));

    size_t total_bytes = 0;
    for (jsize i = 0; i < argc; ++i) {
        auto value = static_cast<jstring>(env->GetObjectArrayElement(arguments, i));
        if (value == nullptr) {
            values.emplace_back("");
            total_bytes += 1;
            continue;
        }

        const char* utf = env->GetStringUTFChars(value, nullptr);
        if (utf == nullptr) {
            env->DeleteLocalRef(value);
            return -2;
        }

        values.emplace_back(utf);
        total_bytes += values.back().size() + 1;
        env->ReleaseStringUTFChars(value, utf);
        env->DeleteLocalRef(value);
    }

    std::vector<char> buffer(total_bytes);
    std::vector<char*> argv(static_cast<size_t>(argc));
    char* cursor = buffer.data();

    for (jsize i = 0; i < argc; ++i) {
        const auto& value = values[static_cast<size_t>(i)];
        std::memcpy(cursor, value.c_str(), value.size() + 1);
        argv[static_cast<size_t>(i)] = cursor;
        cursor += value.size() + 1;
    }

    return static_cast<jint>(node::Start(argc, argv.data()));
}
