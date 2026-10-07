# 💬 WhatsApp AI Team — Budi & Rian
**Sistem Tim AI Otonom Berbasis Antarmuka Asli WhatsApp Web & Terminal TUI**

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![Engines](https://img.shields.io/badge/Engines-Antigravity_|_Codex_|_Opencode-teal.svg)](#arsitektur-engine)
[![Platform](https://img.shields.io/badge/Platform-Linux_|_Android_|_macOS-orange.svg)](#instalasi-cepat)

Aplikasi kolaborasi tim AI mandiri dengan antarmuka **WhatsApp Web v3.2** dan **Terminal TUI Konsol**. Menghadirkan dua persona AI setia yang siap mengeksekusi proyek coding dan tugas teknis di bawah arahan **Boss Bayu**:
- **Budi (Tech Lead)**: Kritis, berorientasi arsitektur, disiplin tinggi, mengawasi kode dan standar teknis.
- **Rian (Developer Lapangan)**: Cepat, santai gaya tongkrongan, praktis, langsung eksekusi tanpa bertele-tele.

---

## ⚡ Instalasi Cepat (Terminal & Web)

Cukup satu perintah di terminal Linux / Android Termux / macOS:

```bash
git clone https://github.com/bayurohmat608-create/chat-your-agent-partner-like-human-partner.git whatsapp-ai-team
cd whatsapp-ai-team
./install.sh
```

### 1. Mode Terminal TUI (Langsung Chat di Konsol):
```bash
./start.sh --terminal
# atau langsung:
node cli.js
```

### 2. Mode Web App (Tampilan WhatsApp Web Lengkap):
```bash
./start.sh
```
Lalu buka browser Anda di: **`http://localhost:3000`**

---

## 🚀 Fitur Unggulan

1. **Antarmuka Asli WhatsApp Web v3.2**:
   - Tampilan gelap (*Dark*) & terang (*Light*), gelembung obrolan autentik dengan tanda centang biru ganda dan tail.
   - Panggilan suara & video WhatsApp terintegrasi.
   - Perekaman Voice Note langsung dengan visualisasi gelombang suara (*waveform*).
   - Pengiriman snippet kode dengan syntax highlighting dan tombol salin/lipat.
   - Status cerita WhatsApp (Stories) untuk update status perkembangan proyek oleh Budi & Rian.

2. **Dual-Engine Simultan & Multi-Profile Auth Vault**:
   - **Login Asli Google OAuth 2.0**: Menggunakan kuota langganan Gemini Pro / Ultra bawaan akun Google Anda.
   - **Login Asli OpenAI Device Auth**: Menggunakan kuota langganan ChatGPT Plus / Pro bawaan akun OpenAI Anda.
   - **Opencode Engine**: Menjalankan model komunitas lokal dan open-source secara mandiri tanpa token berbayar.
   - Budi dan Rian dapat menggunakan provider model berbeda secara serentak di workspace terpisah (`.runtime/workspaces/budi` dan `.runtime/workspaces/rian`) tanpa bentrok.

3. **Workstation Mandiri & Android Blueprint**:
   - Dilengkapi cetak biru arsitektur mandiri Android (Kotlin + PRoot Dual Workstation).
   - Workstation bawaan: **Alpine Linux (musl)** super ringan (~15 MB RAM).
   - Workstation on-demand: **Ubuntu 24.04 (glibc)** yang bisa dipasang dan diganti kapan saja via perintah chat.
   - In-app terminal overlay untuk memantau log eksekusi dan mengeksekusi perintah shell langsung di perangkat.

---

## 📁 Struktur Direktori

```text
.
├── server.js               # Backend HTTP & Realtime SSE Server (3.6k baris)
├── cli.js                  # WhatsApp Terminal TUI Client
├── start.sh                # Skrip peluncur mode web atau terminal
├── install.sh              # Skrip installer otomatis
├── web/                    # Frontend WhatsApp Web v3.2 (HTML, CSS, JS, SVG Doodle)
├── auth_vault/             # Penyimpanan multi-profil token resmi (Google & OpenAI)
├── personas/               # Konfigurasi sistem prompt Budi & Rian
├── android/                # Proyek Android Native (Kotlin, Foreground Service, PRoot)
├── LICENSE                 # Lisensi Resmi Apache 2.0
└── README.md
```

---

## 📄 Lisensi & Komponen Pihak Ketiga (Third-Party Notices)

Proyek ini dilisensikan di bawah **[Apache License 2.0](LICENSE)**. Anda bebas menggunakan, memodifikasi, dan mendistribusikan perangkat lunak ini sesuai dengan ketentuan lisensi Apache 2.0.

Semua komponen pihak ketiga (*third-party*) yang digunakan atau diintegrasikan bersifat lisensi permisif (*permissive open-source*) yang kompatibel 100% dengan Apache 2.0:

| Komponen | Lisensi | Pemilik / Pengembang | Deskripsi |
| :--- | :--- | :--- | :--- |
| **OpenAI Codex CLI** (`@openai/codex`) | **Apache-2.0** | OpenAI | Driver eksekusi AI coding untuk Rian |
| **OpenCode CLI** (`opencode`) | **MIT** | Tim OpenCode | Engine AI lokal / model komunitas gratis |
| **Highlight.js** | **BSD-3-Clause** | Ivan Sagalaev & Kontributor | Syntax highlighting pada Web UI WhatsApp |
| **Android Jetpack & AndroidX** | **Apache-2.0** | Android Open Source Project | Fondasi UI & Service aplikasi Android Native |
| **Google Antigravity CLI** (`agy`) | **Developer Preview** | Google | Engine AI orchestration untuk Budi |

Dokumentasi atribusi resmi lengkap dapat dilihat pada file **[NOTICE](NOTICE)**.\n\n### 3. Diagnostik & Smoke Test\n\n    npm run doctor\n    npm test\n\nInstaller sekarang memvalidasi binary engine sesuai OS/arsitektur host. Instalasi gagal dengan jelas bila engine wajib tidak executable.\n
