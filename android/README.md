# WhatsApp AI Team IDE — Standalone Native Android Application
**Arsitektur Standalone Native Android Supercharged oleh Droide (Bay Studio)**  
*Dibuat khusus untuk Boss Bayu (@baystudio / Bay Studio)*

---

## 🌟 Ringkasan Arsitektur

WhatsApp AI Team IDE bukan sekadar wrapper WebView biasa; ini adalah **Mobile IDE Native Penuh** yang menggabungkan:
1. **Frontend WhatsApp Web v3.2 Identik**: Antarmuka obrolan WhatsApp yang sangat familiar, responsif, mendukung Dark Mode, panggilan suara AI (WebRTC/Audio), Voice Notes, file preview, dan multi-persona chat.
2. **Embedded Node.js Core**: Menjalankan engine backend lokal di `127.0.0.1:3000` secara mandiri di dalam sandbox Android tanpa memerlukan server cloud atau koneksi pihak ketiga untuk logika orkestrasi.
3. **PRoot Dual-Workstation (Alpine & Ubuntu)**: Virtualisasi Linux rootless di Android (`arm64-v8a`) dengan persistensi folder proyek antara Budi (`/opt/workspaces/budi`) dan Rian (`/opt/workspaces/rian`), otomatis terhubung ke penyimpanan publik HP di `/sdcard/Download/AITeam`.
4. **Terminal Feedback Loop (Inovasi Droide Bay Studio)**: Terminal console internal yang mencegat output stderr, compiler error, dan crash stack traces lalu mengirimkannya ke Budi & Rian untuk perbaikan kode mandiri (*self-healing code*).
5. **Droide KADB (Wireless ADB)**: Eksekusi shell tingkat lanjut (UID 2000) pada Android 11+ via Wireless Debugging tanpa perlu root atau kabel PC.
6. **Native Hardware Bridge**: Haptic vibration feedback, telemetri status baterai/pengisian daya, dan notifikasi Android dengan fitur **Balas Cepat (Quick Reply)** langsung dari Notification Bar.

---

## 📂 Struktur Paket Kotlin (`com.bossbayu.aiteam`)

```
android/app/src/main/java/com/bossbayu/aiteam/
├── MainActivity.kt                  # Entry point, WebView container, splash & bootstrap loader
├── bridge/
│   └── NativeBridge.kt              # JavascriptInterface dua arah (Haptics, Battery, Storage, KADB)
├── kadb/
│   └── KadbManager.kt               # Wireless ADB integration (Droide Architecture)
├── runtime/
│   ├── BootstrapInstaller.kt        # Ekstraksi otomatis aset web & engine pada first-boot
│   ├── NodeRuntimeManager.kt        # Daemon process manager untuk Node.js server lokal
│   ├── PRootManager.kt              # Virtualisasi PRoot container Linux rootless & storage binding
│   └── WorkstationManager.kt        # Hot-swapping Alpine (ringan ~15MB) & Ubuntu (glibc penuh)
├── service/
│   ├── EngineForegroundService.kt   # Android Foreground Service anti-kill dengan WakeLock
│   ├── QuickReplyReceiver.kt        # RemoteInput notification receiver untuk membalas chat
│   └── WakeLockManager.kt           # Manajemen PowerManager & CPU wakelock hemat baterai
└── terminal/
    ├── TerminalFeedbackManager.kt   # Parser compiler error & auto-diagnostic feedback ke AI
    ├── TerminalOverlayDialog.kt     # In-app floating terminal console
    ├── TerminalSession.kt           # Sesi interaktif PTY/PRoot shell
    └── TerminalToolbar.kt           # Keyboard aksesori virtual (ESC, CTRL, ALT, TAB, |, ~)
```

---

## 🛠️ Cara Kompilasi APK

### 1. Menggunakan Android Studio (Rekomendasi)
1. Buka **Android Studio Hedgehog (2023.1.1) atau versi lebih baru**.
2. Pilih **File -> Open...** lalu arahkan ke direktori `/public/android`.
3. Tunggu Gradle Sync selesai (memerlukan JDK 17).
4. Klik **Build -> Build Bundle(s) / APK(s) -> Build APK(s)**.
5. APK siap di: `android/app/build/outputs/apk/debug/app-debug.apk`.

### 2. Menggunakan Baris Perintah (Terminal / CI / CD)
```bash
cd android
chmod +x gradlew
./gradlew assembleDebug
```
Untuk build versi Release teroptimasi ProGuard:
```bash
./gradlew assembleRelease
```

---

## 🔐 Keamanan, Privasi & Lisensi
- **Apache-2.0 License**: Bebas dipakai dan dikembangkan dengan mematuhi hak cipta Bay Studio dan Google DeepMind.
- **Penyimpanan Kredensial Terisolasi**: Token OAuth Google dan API key OpenAI disimpan dalam sandbox internal (`files/auth_vault/`), tidak pernah dibagikan atau terekspos ke repositori publik.
- **Zero Cloud Leakage**: Seluruh perintah terminal, file proyek, dan riwayat obrolan dieksekusi secara lokal di perangkat.
