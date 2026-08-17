# Master Implementation Plan: DeepSeek Harness to Const Harness Transformation

Dokumen ini adalah cetak biru (*master blueprint*) arsitektur dan rencana implementasi lengkap untuk mentransformasi **DeepSeek Harness** (`dsh`) menjadi **Const Harness** (`const`) — sebuah AI Agent IDE, Desktop App mandiri, Creative Design Studio, Local & Cloud Model Hub, serta Multi-Channel Automation Platform tingkat lanjut.

---

## I. Ringkasan Eksekutif & Fondasi Arsitektur

### 1. Prinsip Dasar & Filosofi Sistem
* **"Everything is a Plugin" (Cordis Micro-Kernel):** Seluruh subsystem (LLM provider, tool execution, session persistence, approval dialog, hingga loop agent) adalah plugin independen yang dapat diganti atau diperluas melalui `ctx.effect()`, `ctx.on()`, atau `ctx.waterfall()` tanpa merombak core engine.
* **"Model-Visible ⟺ Logged" (Event-Sourced Determinism):** Semua input/output yang dilihat model tercatat secara persisten dalam append-only event stream (SQLite WAL), menjamin *deterministic replay*, auditabilitas, dan *time-travel rollback*.
* **"Zero Repository Pollution":** Folder proyek pengguna (`cwd`) tetap 100% bersih dari skrip temporer dan file sampah berkat subsystem *Dedicated Agent Scratchpad* di `~/.const/sessions/<id>/scratch/` dan *Default Workspace* di `~/.const/workspace/default/`.
* **"Dual-Track UI & CLI Parity" (Diadopsi dari OpenDesign):** Setiap kemampuan yang dapat diakses pengguna di Web UI / Desktop App memiliki padanan perintah CLI `const <subcommand> --json` untuk integrasi otomasi eksternal.
* **"Universal Local & Cloud Model Freedom" (Diadopsi dari Jan AI & Pi):** Mendukung 80+ cloud LLM provider dengan auto-fallback chain, serta model lokal (Ollama / Hugging Face GGUF via `llama.cpp`) dengan manajemen Model Hub 1-klik di settings.
* **"Total Transparency & Cost Optimization" (Diadopsi dari Pi & Jan AI):** Analisis token, kecepatan generasi (tokens/s), Time to First Token (TTFT), dan Prompt Cache hit/miss/waste cost tersedia secara real-time langsung di setiap turn chat dan dashboard settings.
* **"Creative AI Design Studio" (Diadopsi dari OpenDesign):** Transformasi dari sekadar coding CLI menjadi Design Studio interaktif dengan sandboxed live canvas, slide deck generator, dan 160+ modular design skills.

---

## II. Arsitektur Penyimpanan Terpadu (`~/.const/`)

Menggabungkan keunggulan terbaik dari **Antigravity (Google)**, **ZCode (Z.ai)**, **OpenCode**, **OpenDesign**, **Jan AI**, **Pi**, dan **DeepSeek Harness**:

```
~/.const/  (atau %USERPROFILE%\.const\)
│
├── index/                                     <-- [Diadopsi dari ZCode]
│   └── tasks-index.sqlite / .sqlite-wal       <-- Global FTS5 Index untuk pencarian kilat (Ctrl+K) & sidebar
│
├── conversations/                             <-- [Diadopsi dari Antigravity & DeepSeek]
│   ├── <session-uuid-1>.db                    <-- SQLite ACID + WAL per percakapan (cepat & tahan korupsi)
│   └── <session-uuid-2>.db
│
├── sessions/                                  <-- [Diadopsi dari Antigravity, OpenDesign & DeepSeek]
│   └── <session-uuid>/
│       ├── artifacts/                         <-- File hasil generate (HTML Canvas, PDF, PPTX, Charts)
│       ├── scratch/                           <-- Sandbox temporer per-sesi (Python `uv` / Node.js)
│       └── snapshots/                         <-- Checkpoint shadow git per-turn untuk Undo/Rollback
│
├── snapshots/                                 <-- [Diadopsi dari OpenCode packages/core/src/snapshot.ts]
│   └── <project-id>/<worktree-hash>/          <-- Shadow Git Repository untuk file disk fisik
│
├── workspace/                                 <-- [Diadopsi dari ZCode]
│   └── default/                               <-- Global default workspace untuk No-Workspace Chat mode
│
├── models/                                    <-- [Diadopsi dari Jan AI & Hugging Face GGUF Hub]
│   ├── gguf/                                  <-- Model GGUF lokal (DeepSeek-R1, Qwen 2.5, Llama 3, Mistral)
│   └── registry.json                          <-- Metadata model lokal, kuantisasi, & status GPU offload
│
├── config/                                    <-- [Konfigurasi Sistem & Keamanan]
│   ├── settings.yaml                          <-- Konfigurasi tema, active provider, samplers, approvals
│   ├── .credentials.vault                     <-- [Diadopsi dari Pi auth-storage.ts] Atomic file-locked vault (0600)
│   ├── bot-state.json                         <-- State pairing Telegram & Cloudflare Tunnel (Dari ZCode)
│   ├── certs/                                 <-- [Diadopsi dari ZCode] Local TLS/HTTPS Certs untuk Mobile PWA
│   └── rules/                                 <-- Global system instructions (global_rules.md)
│
├── profiles/                                  <-- [Diadopsi dari DeepSeek Harness]
│   ├── default/                               <-- Profile Cordis utama (cordis.patch.yml)
│   ├── headless/                              <-- Profile CLI otomatis
│   └── studio/                                <-- Profile OpenDesign Canvas Studio
│
└── runtime/                                   <-- [Environment Eksekusi]
    ├── venv/                                  <-- Isolated Python `uv` virtualenv (auto-pip dependencies)
    ├── browser-profiles/                      <-- Persistent cookies & session auth untuk browser automation
    ├── mcp/                                   <-- Schemas & registrasi MCP Servers eksternal
    └── logs/ & crashes/                       <-- Error tracking & telemetry lokal
```

---

## III. Taksonomi Lengkap 21 Fitur Inti Const Harness

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        TAKSONOMI FITUR UTAMA CONST HARNESS                             │
├────────────────────────────┬───────────────────────────────────────────────────────────┤
│ Kategori                   │ Fitur                                                     │
├────────────────────────────┼───────────────────────────────────────────────────────────┤
│ A. Core Agent & Storage    │ #1 No-Workspace Chat, #8 Smart & Dream Memory,            │
│                            │ #9 Custom Instructions, #11 Undo & File Rollback,         │
│                            │ #15 Safe Git Worktree Sandbox                             │
├────────────────────────────┼───────────────────────────────────────────────────────────┤
│ B. UI, Desktop & Remote    │ #3 QR/Cloudflare Tunnel & Telegram Remote Modal,          │
│                            │ #4 Desktop Electron/Tauri App, #6 Global CLI & Theme,     │
│                            │ #17 Mobile-Responsive PWA Layout                          │
├────────────────────────────┼───────────────────────────────────────────────────────────┤
│ C. Design Studio & Media   │ #10 File & Media Attachments,                             │
│                            │ #12 Voice Input STT & Supertonic 3 TTS,                   │
│                            │ #14 OpenDesign Studio (Tab "Design", Canvas, 160+ Skills),│
│                            │ #20 Standalone HTML Session Export & Share Report         │
├────────────────────────────┼───────────────────────────────────────────────────────────┤
│ D. Tooling, AI Hub,        │ #2 Ask Before Changes & Pierre Diff Approval Modal,       │
│    Security & Analytics    │ #5 Browser Automation (`browser-use` + Playwright),       │
│                            │ #7 Cron Jobs Engine & Automations View (Visual Dashboard),│
│                            │ #13 Universal 80+ Provider LLM Hub & Auto-Fallback,       │
│                            │ #16 In-Chat & Dashboard Real-Time Token Analytics,        │
│                            │ #18 Dedicated Scratchpad & Python `uv` Runtime,           │
│                            │ #19 Web Intelligence Suite (Local Firecrawl Transformer), │
│                            │ #21 Local Model Hub (Hugging Face GGUF & Ollama Engine)   │
└────────────────────────────┴───────────────────────────────────────────────────────────┘
```

---

### Kategori A: Core Agent, Memory, Storage & Snapshots

#### 1. No-Workspace Chat (Global / Scratch Chat Mode)
* **Tujuan:** User dapat langsung berinteraksi dengan agent tanpa harus memilih direktori proyek terlebih dahulu.
* **Komponen:** `packages/workspace/workspace/`, `packages/core/agent/`, `packages/client/ui-workspace/`
* **Implementasi:**
  * Jadikan `workspaceId` opsional pada lifecycle sesi.
  * Buat default fallback otomatis ke *ephemeral directory* di `~/.const/sessions/<id>/scratch/` atau global default di `~/.const/workspace/default/` saat tool filesystem/bash dipanggil tanpa workspace fisik.

#### 8. Smart Memory, Dream Memory & Hierarchical Compaction
* **Tujuan:** Memori jangka panjang semantik lintas sesi, konsolidasi memori otomatis saat sistem dalam kondisi idle, dan pemadatan context window tanpa kehilangan informasi penting.
* **Referensi Arsitektur:** Mengadopsi algoritma pemadatan dari **Pi** ([`pi/packages/coding-agent/src/core/compaction/`](file:///d:/Code/Clone/pi/packages/coding-agent/src/core/compaction/)) dan vector memory dari **Jan AI** (`jan/extensions/vector-db-extension/`).
* **Komponen:** `packages/const-memory-smart/` (baru), `packages/compaction/`, `packages/session/`
* **Implementasi:**
  * **Smart Memory:** Vector database lokal (SQLite-vec / LanceDB) untuk menyimpan fakta pengguna, preferensi koding, dan aturan proyek, lalu di-inject via RAG ke system prompt.
  * **Dream Memory:** Background worker yang membaca kembali log percakapan saat malam hari/idle (*sleep cycle*), mengekstrak ringkasan pembelajaran baru, dan memperbarui knowledge base.
  * **Intelligent Compaction:** Meringkas percakapan lama secara bertingkat saat mendekati context limit tanpa menghilangkan instruksi sistem, state modifikasi file, atau intent user.

#### 9. Custom System Instructions (Global, Per-Workspace & Assistant Presets)
* **Tujuan:** Instruksi khusus pengguna yang berlaku global (`~/.const/rules/global_rules.md`), lokal (`.const/rules.md`, `AGENTS.md`, `CLAUDE.md`, `.cursorrules`), atau per Assistant Preset.
* **Referensi Arsitektur:** Mengadopsi scanner hierarki dari **Pi** ([`pi/packages/coding-agent/src/core/resource-loader.ts`](file:///d:/Code/Clone/pi/packages/coding-agent/src/core/resource-loader.ts)) dan Visual Assistant Presets dari **Jan AI** ([`AssistantSwitcher.tsx`](file:///d:/Code/Clone/jan/web-app/src/containers/AssistantSwitcher.tsx)).
* **Komponen:** `packages/context/agent-instructions/`, `packages/client/ui-settings/`
* **Implementasi:**
  * Memperluas pemindai `dsh-agent-instructions` untuk membaca `~/.const/rules/global_rules.md` secara default.
  * Sediakan UI Editor di menu Settings Web/Desktop agar pengguna bisa mengedit instruksi dan mengonfigurasi persona agent (Developer, Code Reviewer, UI Designer, Data Analyst).

#### 11. Undo & Chat Edit with Shadow Git File Snapshot Rollback
* **Tujuan:** Mengedit pesan chat sebelumnya dan otomatis mengembalikan (*rollback*) perubahan file fisik di disk yang terjadi setelah pesan tersebut.
* **Referensi Arsitektur:** Diadopsi langsung dari modul snapshot git terisolasi di **OpenCode** ([`opencode/packages/core/src/snapshot.ts`](file:///d:/Code/Clone/opencode/packages/core/src/snapshot.ts)).
* **Komponen:** `packages/core/session/`, `packages/const-snapshot/` (baru)
* **Implementasi:**
  * **Shadow Git Repository:** Menginisialisasi shadow git di `~/.const/snapshots/<projectId>/<worktreeHash>/` yang terisolasi dari git utama pengguna.
  * **Operasi Snapshot Terpadu:** `capture()`, `diff({ from, to })`, `preview({ files })`, `restore({ files })`, dan `checkout(snapshotId)`.
  * **Atomik Rollback pada Chat Edit:** Saat user mengedit chat masa lalu, session event stream melakukan branching/forking dan file system di-rollback ke snapshot yang berkorespondensi dengan turn ID tersebut.

#### 15. Safe Git Worktree Sandbox
* **Tujuan:** Menjalankan refactoring besar atau eksperimen multi-file di branch/worktree terisolasi agar branch utama pengguna tidak rusak jika terjadi kegagalan.
* **Komponen:** `packages/fs/fs-worktree/` (baru), `packages/shell/`

---

### Kategori B: UI, Desktop Packaging & Remote Control

#### 3. Universal Multi-Channel Mobile Remote Control (QR/Cloudflare Tunnel & Telegram)
* **Tujuan:** Mengontrol dan memantau sesi agent secara real-time dari smartphone melalui modal visual terpadu di Desktop App & WebApp.
* **Komponen:** `packages/host/remote-tunnel/` (baru), `packages/client/ui-remote-modal/` (baru), `packages/api/`, `@const-ai/telegram-bridge` (baru)
* **Implementasi Modal "Mobile Remote Control":**
  * **Trigger:** Diakses kapan saja via tombol `[📱 Connect Mobile]` di bottom bar sidebar dan header bar.
  * **Kolom Kiri — "Scan from phone" (Instant QR & Magic Link):**
    * Membuat ephemeral token & secure HTTPS/WSS tunnel otomatis (Cloudflare Quick Tunnel / Local LAN menggunakan sertifikat di `~/.const/config/certs/`).
    * Menampilkan QR Code visual interaktif, tombol `[Refresh QR]`, `[Copy link]`, `[Stop]`, dan status live (*"Waiting for phone • Ready"* ➔ *"🟢 Phone Connected"*).
    * Di HP membuka Mobile Web PWA responsif (live chat streaming, terminal viewer, approval dialog `[Approve]`/`[Reject]`).
  * **Kolom Kanan — "Telegram Bot" (Long-running Mobile Access):**
    * Konfigurasi bot Telegram (via library `grammy`) untuk notifikasi push asinkron dan tombol approval inline langsung dari chat Telegram.

#### 4. Desktop App Packaging (Electron / Tauri)
* **Tujuan:** Aplikasi desktop mandiri siap pakai (Windows `.exe`, macOS `.dmg`, Linux `.AppImage`).
* **Referensi Arsitektur:** Menggabungkan struktur Electron dari **OpenCode** ([`opencode/packages/desktop/`](file:///d:/Code/Clone/opencode/packages/desktop)), Sidecar Lifecycle dari **OpenDesign** ([`open-design/apps/desktop/`](file:///d:/Code/Clone/open-design/apps/desktop)), dan Native Tray/Capabilities dari **Jan AI** ([`jan/src-tauri/`](file:///d:/Code/Clone/jan/src-tauri/)).
* **Komponen:** `apps/desktop/` (baru), `apps/web/`
* **Implementasi:**
  * **Process Separation:** `main` (Desktop lifecycle, window state, tray, native menus), `preload` (contextBridge API aman), `renderer` (React UI).
  * **Sidecar Daemon Discovery:** Aplikasi Desktop menyalakan daemon Cordis lokal di background dan berkomunikasi melalui local IPC socket / HTTP port terproteksi token.

#### 6. Global CLI Binary `const` (`npm i -g`), UI/UX Overhaul, Multi-Theme & Custom Color Palette
* **Tujuan:** Mengubah seluruh branding menjadi Const Harness, menyediakan perintah CLI global `const`, memoles UI/UX secara modern, serta menyediakan sistem multi-tema dengan kustomisasi palet warna mandiri.
* **Referensi Arsitektur:**
  * **Dual-Track CLI Parity:** Mengadopsi pola dari **OpenDesign** ([`open-design/apps/daemon/src/cli.ts`](file:///d:/Code/Clone/open-design/apps/daemon/src/cli.ts)).
  * **Interactive Accent Color Picker:** Mengadopsi pola dari **Jan AI** ([`jan/web-app/src/containers/AccentColorPicker.tsx`](file:///d:/Code/Clone/jan/web-app/src/containers/AccentColorPicker.tsx)).
* **Komponen:** `apps/cli/bin/const.js`, `packages/client/ui-theme/`, `packages/client/ui-layout/`, `packages/client/ui-settings/`
* **Implementasi:**
  * **Global CLI (`npm i -g @const-ai/const`):**
    * Mengetik `const` di terminal otomatis menyalakan server lokal dan **langsung membuka browser ke `http://localhost:XXXX`**.
    * Subcommands: `const` (WebApp), `const desktop` (Desktop App), `const --headless "<task>"` (CLI murni).
  * **Sistem Multi-Theme & Interactive Custom Color Palette Builder:**
    * Preset tema (*Const Dark/OLED*, *Nordic Slate*, *Cyberpunk Neon*, *Minimal Light*, *Tokyo Night*, *Dracula*).
    * Custom Color Palette Builder di Settings Appearance dengan color picker real-time untuk Primary/Accent, Surface, Background, Text, dan Code Block.
    * Dynamic CSS Variable Injection ke `:root` tanpa reload aplikasi.

#### 17. Mobile-Responsive PWA Layout
* **Tujuan:** Antarmuka Web UI yang dioptimalkan untuk layar smartphone dengan navigasi *touch-friendly*, swipeable terminal drawer, dan mobile floating action buttons.
* **Komponen:** `packages/client/ui-layout/`, `packages/client/ui-theme/`

---

### Kategori C: Creative Design Studio, Media, Audio & Sharing

#### 10. File & Media Attachments (PDF, Docs, Audio, Image)
* **Tujuan:** Mengunggah dan memproses berbagai jenis file lampiran langsung dalam chat.
* **Referensi Arsitektur:** Mengadopsi parser & viewer dari **OpenDesign** (`open-design/apps/daemon/src/media/`), **OpenCode** ([`opencode/packages/session-ui/src/components/file-media.tsx`](file:///d:/Code/Clone/opencode/packages/session-ui/src/components/file-media.tsx)), dan **Jan AI** ([`ProjectFiles.tsx`](file:///d:/Code/Clone/jan/web-app/src/containers/ProjectFiles.tsx)).
* **Komponen:** `packages/attachment/`, `packages/client/ui-attachment/`
* **Implementasi:**
  * Parser teks PDF (`pdf-parse`), parser dokumen Word/Excel/CSV, OCR/Vision untuk gambar, dan integrasi drag-and-drop uploader.

#### 12. Voice Input (STT) & Local Supertonic 3 TTS
* **Tujuan:** Interaksi suara dua arah (Speech-to-Text dan Text-to-Speech).
* **Komponen:** `packages/const-audio/` (baru), `packages/client/`
* **Implementasi:**
  * **STT:** Perekaman audio Web Audio API -> transkripsi via Local Whisper (ONNX) dengan fallback API (Groq/OpenAI Whisper).
  * **TTS:** Integrasi engine **Supertonic 3** lokal (ONNX / Python runner) dengan fallback ke Web Speech API / Edge-TTS.

#### 14. OpenDesign Studio & Interactive Canvas (Tab "Design" di Sidebar)
* **Tujuan:** Mengadopsi arsitektur `nexu-io/open-design` untuk mentransformasi Const Harness menjadi AI Design Studio & UI Prototype Engine terpadu dengan 2 tampilan utama (Home Design Hub & Studio Workspace).
* **Referensi Arsitektur:** Diadopsi secara menyeluruh dari **OpenDesign** ([`d:/Code/Clone/open-design`](file:///d:/Code/Clone/open-design)):

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                   ARSITEKTUR LENGKAP OPEN DESIGN STUDIO DI CONST                       │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│ 1. SCREENSHOT 1: DESIGN HUB / HOME VIEW (Menu Utama Tab "Design" di Sidebar)           │
│    ├── Komponen: `HomeHero.tsx`, `ComposerModePicker.tsx`, `RecentProjectsStrip.tsx`   │
│    ├── Category Chips: [UI Mockup] [Slide deck] [Wireframe] [Mobile app] [Document]    │
│    ├── Design System Selector Dropdown: Apple HIG, Shopify, Stripe, Tailwind, Custom   │
│    ├── Inspiration Carousel: Template Pitch Deck, B2B SaaS, Thesis Defense, Brand Story│
│    └── Recent Projects Grid: Thumbnail kartu proyek desain sebelumnya dengan filter    │
│                                                                                        │
│ 2. SCREENSHOT 2: DESIGN STUDIO WORKSPACE (Split Pane: Chat & Live Canvas)              │
│    ├── Left Pane (Agent Chat & Actions):                                               │
│    │   ├── History chat terisolasi untuk project desain                                │
│    │   ├── Deliverable Chip: `cs-capstone-defense-deck.html` (Open, Download)          │
│    │   ├── Suggestion Action Buttons: [Match next step >] [Design polish / ready ship >]│
│    │   ├── TODOs Progress Checklist (e.g. "TODOS 2/2 Done")                            │
│    │   └── Chat Composer dengan prompt chips                                           │
│    │                                                                                   │
│    └── Right Pane (Live Deck Canvas & Slide Studio):                                   │
│        ├── Top Tabs: [# Design Files] [deck-name.html x] [+]                           │
│        ├── Toolbar: [Preview | Code] [Desktop v] [Zoom 100%] [Export v] [Share] [VSCode]│
│        ├── Deck Slide Thumbnail Rail: Panel thumbnail live slide 1 s.d. N di sisi kiri │
│        ├── Center Canvas: Sandboxed `<iframe>` live preview dengan hot-reloading       │
│        └── Bottom Panel: SPEAKER NOTES drawer yang tersinkronisasi per-slide           │
│                                                                                        │
│ 3. 160+ MODULAR DESIGN SKILLS CATALOG (`open-design/skills/`):                         │
│    ├── Frontend: `frontend-design`, `shadcn-ui`, `swiftui-design`, `tailwind`          │
│    ├── Animation & Video: `gsap-core`, `emilkowalski-motion`, `remotion`               │
│    ├── Presentation: `pptx-generator`, `nanobanana-ppt`, `deck-open-slide-canvas`      │
│    ├── Brand: `brandkit`, `brand-extract` (ekstraksi logo & palet warna dari URL)      │
│    └── Figma: `figma-use`, `figma-code-connect-components`, `figma-generate-library`   │
│                                                                                        │
│ 4. NATIVE HARNESS CONNECTOR:                                                           │
│    └── `@open-design/dsh-runtime`: Protokol resmi DeepSeek Harness berbasis Cordis     │
│        JSON-RPC / NDJSON stdio untuk integrasi dua arah tanpa latensi.                 │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

* **Komponen:** `packages/client/ui-design-studio/` (baru), `packages/client/ui-sidebar/`, `packages/skills/`

#### 20. Standalone Interactive HTML Session Export & Share Report
* **Tujuan:** Mengekspor riwayat percakapan sesi dan eksekusi coding agent menjadi file `.html` interaktif mandiri (zero-dependency) yang dapat dibagikan kepada tim atau disimpan sebagai dokumentasi.
* **Referensi Arsitektur:** Diadopsi langsung dari modul export HTML di **Pi** ([`pi/packages/coding-agent/src/core/export-html/`](file:///d:/Code/Clone/pi/packages/coding-agent/src/core/export-html/)).
* **Komponen:** `packages/artifacts/`, `packages/client/ui-session-export/` (baru)
* **Implementasi:**
  * Template HTML + CSS + JS mandiri yang membungkus riwayat percakapan.
  * Fitur: Collapsible tool execution cards, syntax highlighting, ANSI-to-HTML terminal coloring, dark/light theme toggle, dan export button di header chat.

---

### Kategori D: Tooling, AI Hub, Security & Analytics

#### 2. Ask Before Changes, Pierre Diff Modal & Atomic Credential Vault
* **Tujuan:** Memberikan perlindungan keamanan berlapis: konfirmasi sebelum perubahan file/terminal, aturan izin persisten, serta penyimpanan kredensial yang aman dan anti-race condition.
* **Referensi Arsitektur:**
  * **Permission & Review Engine:** Diadopsi dari **OpenCode** ([`opencode/packages/core/src/permission/`](file:///d:/Code/Clone/opencode/packages/core/src/permission) dan [`session-review.tsx`](file:///d:/Code/Clone/opencode/packages/session-ui/src/components/session-review.tsx)).
  * **Atomic File-Locked Credential Vault:** Diadopsi dari **Pi** ([`pi/packages/coding-agent/src/core/auth-storage.ts`](file:///d:/Code/Clone/pi/packages/coding-agent/src/core/auth-storage.ts)).
* **Komponen:** `packages/interaction/permission-presets/`, `packages/interaction/user-approval/`, `packages/credentials/credential-vault/` (baru)
* **Implementasi:**
  * **Pre-execution Interceptor:** Menangkap event `tools/pre-execute` untuk operasi sensitif (`bash`, `pwsh`, `write`, `edit`, `delete`).
  * **Pierre-based Diff Modal:** Menampilkan diff visual multi-file dengan syntax highlighting sebelum file disimpan ke disk.
  * **Atomic File-Locking Vault (`~/.const/config/.credentials.vault`):** Menggunakan `proper-lockfile` dengan retry mechanism dan permission ketat `0o600` untuk mencegah race condition antar subagent/worker.

#### 5. Web Browser Automation Tool & `browser-use` Engine (`/browser` Slash Command)
* **Tujuan:** Memberi kemampuan kepada agent untuk bernavigasi secara interaktif di situs web dinamis, mengklik tombol, mengisi form, login, testing web aplikasi lokal pengguna, bypass interaksi kompleks, dan mengambil tangkapan layar visual berlabel.
* **Referensi Arsitektur:** Diadopsi secara menyeluruh dari **Browser-Use** ([`d:/Code/Clone/browser-use`](file:///d:/Code/Clone/browser-use)):
  * **DOM Tree Accessibility & Numeric Indexing:** Serialisasi elemen interaktif viewport menjadi indeks numerik hemat token (`[12] <button>Submit</button>`) sehingga LLM cukup mengeksekusi `click(12)` tanpa selector CSS/XPath yang rapuh.
  * **Vision Bounding-Box Overlay:** Menghasilkan screenshot dengan highlight bounding-box bernomor untuk model multimodal (Claude 3.7 / GPT-4o).
  * **Session Profile & Storage State Persistence:** Menyimpan session cookies dan token di `~/.const/runtime/browser-profiles/` agar tidak perlu re-login berulang.
  * **Interactive Command Trigger:** Dapat dipanggil secara on-demand via slash command `/browser` atau otomatis oleh agent saat mendeteksi task yang butuh interaksi web nyata.
* **Komponen:** `packages/tool-browser/` (baru), `packages/web/`, `~/.const/runtime/venv/`
* **Implementasi:**
  * **Level 1 (Direct Playwright Tools - Node.js):** Fast in-process tools untuk aksi ringan: `browser_open`, `browser_navigate`, `browser_click`, `browser_fill_form`, `browser_screenshot`, `browser_extract_content`.
  * **Level 2 (Autonomous Web Agent via `browser-use` - Python Subprocess):** Integrasi controller Python `browser-use` yang berjalan di sandbox virtualenv (`~/.const/runtime/venv/`) untuk alur multi-step kompleks dan vision task otonom.

#### 7. Cron Jobs Engine & Automations View (Visual Dashboard)
* **Tujuan:** Menampilkan dan mengelola tugas atau prompt otomatis berkala (misal: review kode harian, pembersihan repo tiap jam).
* **Komponen:** `packages/schedule/schedule/`, `packages/client/ui-automations/` (baru)
* **Implementasi:**
  * Backend engine `packages/schedule` sudah lengkap dengan parser cron dan persistent transaction.
  * Bangun antarmuka visual **Tab "Automations" di Sidebar** untuk membuat jadwal baru, melihat daftar cron aktif, log eksekusi, dan tombol *Run Now / Pause*.

#### 13. Universal 80+ Multi-Provider LLM Hub & Auto-Fallback Load Balancer
* **Tujuan:** Membuka potensi penuh modul `packages/llm/llm-pi-ai` yang sudah ada untuk menghubungkan Const Harness ke lebih dari 80 provider LLM cloud dan lokal dengan fitur load balancing, auto-retry, dan auto-fallback otomatis saat terjadi rate limit atau outage.
* **Referensi Arsitektur:** Diadopsi dari **Pi** ([`pi/packages/ai/src/providers/`](file:///d:/Code/Clone/pi/packages/ai/src/providers/)):
  * *Global Providers:* Anthropic (Claude 3.7 Sonnet / Opus), OpenAI (GPT-4o, o3-mini), Google Gemini / Vertex AI, Amazon Bedrock, Groq (LPU Ultra-Fast), Cerebras, Together AI, Fireworks AI, OpenRouter, Vercel AI Gateway, Cloudflare Workers AI, Mistral, xAI (Grok).
  * *Asian / Specialized Providers:* DeepSeek (V3, R1), Kimi / Moonshot AI, Qwen / DashScope, MiniMax, Zhipu AI / GLM (Z.ai), Xiaomi.
  * *Local Providers:* Ollama (`localhost:11434`), Local `llama.cpp` Engine, LM Studio.
* **Komponen:** `packages/llm/llm-pi-ai/`, `packages/llm/`
* **Implementasi:**
  * **Un-zeroing Cost Metadata:** Mengaktifkan kalkulasi biaya per token di `catalog.ts` dan `stream.ts`.
  * **Auto-Fallback Chain:** Jika Provider A mengembalikan status error 429/500/503, sistem otomatis mengalihkan request ke Provider cadangan (Provider B) tanpa memutus percakapan user.

#### 16. In-Chat & Dashboard Real-Time Token Analytics & Prompt Cache Waste Detection
* **Tujuan:** Menyediakan metrik transparansi biaya dan kinerja model yang tersedia secara live langsung di setiap turn chat & bottom status bar.
* **Referensi Arsitektur:** Menggabungkan Token Speed Indicator dari **Jan AI** ([`TokenSpeedIndicator.tsx`](file:///d:/Code/Clone/jan/web-app/src/containers/TokenSpeedIndicator.tsx)) dan Prompt Cache Analytics dari **Pi** ([`cache-stats.ts`](file:///d:/Code/Clone/pi/packages/coding-agent/src/core/cache-stats.ts)).
* **Komponen:** `packages/client/ui-chat/`, `packages/client/ui-settings/`, `packages/session/session-analytics/`
* **Implementasi:**
  * **In-Chat Message Bubble Stats:**
    * Kecepatan generasi: `⚡ 48.2 tokens/s` | `⏱️ TTFT: 240ms` | `📊 1,450 tokens ($0.0021)`.
    * Indikator Prompt Caching: `🟢 Cache Hit: 88%` atau `🟡 Cache Miss: 1.2k tokens (Idle > 5m)`.
  * **Dashboard Settings:**
    * Grafik akumulasi penggunaan token harian/bulanan, rincian biaya per model, dan kalkulasi uang yang dihemat berkat prompt caching.
  * **Hardware Telemetry Monitor:**
    * CPU, RAM, GPU, dan VRAM gauge di status bar bawah (diadopsi dari Jan AI).

#### 18. Dedicated Agent Scratchpad & Ephemeral Code Runtime
* **Tujuan:** Memberikan folder sandbox terisolasi bagi agent untuk menulis skrip temporer (Python / Node.js), memproses dokumen (PDF, Docx, Excel, Chart, scraping), dan mengeksekusinya tanpa mengotori workspace proyek pengguna.
* **Komponen:** `packages/scratch/` (baru), `packages/fs/`, `packages/code-runtime/`, `packages/client/ui-artifacts/`

#### 19. Web Intelligence Suite (4-Tier Web Hierarchy & Local Firecrawl Transformer Engine)
* **Tujuan:** Sistem penjelajahan, riset, dan ekstraksi web 4-tingkat yang adaptif, instan, hemat token, dan 100% lokal:
  * **Tier 1 (Web Search & Sitemap Discovery):**
    * Multi-Provider Web Search: Brave Search, Tavily, Exa, Perplexity, DeepSeek Search.
    * Zero-Key Free Fallback: Dukungan keyless gratis via DuckDuckGo HTML Search / SearXNG.
    * Instant Sitemap Mapping (`web_map` diadopsi dari Firecrawl `/map`): Menemukan seluruh URL resmi dari suatu domain tanpa menebak-nebak slug (anti-404).
  * **Tier 2 (Fast Web Fetch - Local In-Process Firecrawl Transformer Engine):**
    * Ekstraksi konten URL kilat (< 500ms) menggunakan pipeline transformer murni Node.js (diadopsi dari Firecrawl `removeUnwantedElements.ts` & `html-to-markdown.ts`).
    * Membuang secara agresif 50+ elemen pengotor (cookie banner, modal popup, navbar, footer, sidebar, ads, script tracking, dan base64 image strings).
    * Mengonversi HTML bersih menjadi Markdown terstruktur rapi (`turndown` + GFM) sehingga hemat token context window dan 100% lokal tanpa setup Docker/Redis.
  * **Tier 3 (Deep Scrape & Structured Extraction):**
    * Playwright headless renderer untuk situs Client-Side Rendered (CSR / React / Vue SPA).
    * Ekstraksi dokumen web langsung (PDF-to-Markdown, DOCX, CSV).
    * LLM Schema Extraction: Ekstraksi JSON terstruktur sesuai schema permintaan pengguna (`llmExtract`).
  * **Tier 4 (Interactive Browser Agent):**
    * Aksi interaktif lengkap, klik form, input teks, testing UI lokal, dan visual navigation via Level 1 Playwright / Level 2 `browser-use` (`/browser`).
* **Referensi Arsitektur:** Diadopsi dari **Firecrawl** ([`d:/Code/Clone/firecrawl`](file:///d:/Code/Clone/firecrawl)) dan **Browser-Use** ([`d:/Code/Clone/browser-use`](file:///d:/Code/Clone/browser-use)).
* **Komponen:** `packages/web/web/`, `packages/web/web-fetch-http/`, `packages/web/web-search-*`, `packages/web/tool-web/`, `packages/tool-browser/` (baru)

#### 21. Local Model Hub (Hugging Face GGUF & Ollama Integration)
* **Tujuan:** Menyediakan antarmuka manajemen model AI lokal yang lengkap di menu Settings (`sidebar.hub` dan `settings.hub`).
* **Referensi Arsitektur:** Diadopsi secara menyeluruh dari **Jan AI** ([`DownloadManegement.tsx`](file:///d:/Code/Clone/jan/web-app/src/containers/DownloadManegement.tsx) dan [`jan/extensions/llamacpp-extension/`](file:///d:/Code/Clone/jan/extensions/llamacpp-extension/)):
  * **Hugging Face Search & Download:** Pencarian model GGUF langsung dari UI dengan filter kuantisasi (Q4_K_M, Q8_0, FP16) dan auto-download ke `~/.const/models/gguf/`.
  * **Ollama Auto-Discovery:** Mendeteksi instance Ollama lokal yang sedang berjalan di `localhost:11434` dan menyinkronkan daftar model yang sudah terpasang.
  * **Hardware Layer Offloading:** Pengaturan GPU layers offload (Metal untuk Mac, CUDA untuk NVIDIA, ROCm untuk AMD, Vulkan untuk Intel) dan thread CPU.
  * **Granular Sampler Controls:** Pengaturan visual untuk Temperature, Top-P, Min-P, Top-K, Repetition Penalty, dan Context Window Size ([`SamplerPopover.tsx`](file:///d:/Code/Clone/jan/web-app/src/containers/SamplerPopover.tsx)).
  * **Embedded Local OpenAI API Server:** Mengaktifkan server lokal di port `1337` agar tools luar (VS Code, Cursor, terminal scripts) bisa memakai model lokal Const Harness.
* **Komponen:** `packages/llm/llm-local-hub/` (baru), `packages/client/ui-model-hub/` (baru), `packages/client/ui-settings/`

---

## IV. Roadmap & Urutan 4 Fase Eksekusi

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              ROADMAP 4 FASE EKSEKUSI                                   │
└────────────────────────────────────────────────────────────────────────────────────────┘

  FASE 1: Fondasi, Identitas, Hybrid Storage & Quick Wins
  ├── 1. Rebranding ke Const Harness (`@const-ai/const-*`) & Default Model Setup (#6)
  ├── 2. Implementasi Struktur Hybrid Storage `~/.const/` & Default Workspace `~/.const/workspace/default/` (#1)
  ├── 3. Unlocking `llm-pi-ai` Token Metering, Pricing Metadata & Auto-Fallback (#13)
  ├── 4. Global CLI Binary `const` (`npm i -g`) dengan auto-open browser (#6)
  ├── 5. Custom Instructions Hierarchy (`~/.const/rules/global_rules.md`, `AGENTS.md`) (#9)
  └── 6. Dedicated Agent Scratchpad (`~/.const/sessions/<id>/scratch/`) (#18)

  FASE 2: Keamanan, Snapshot Rollback, Web Intelligence & Automations UI
  ├── 7. Shadow Git Snapshot Engine & Undo File Rollback (`packages/const-snapshot`) (#11) [Ref: opencode]
  ├── 8. Ask Before Changes & Pierre-based Visual Diff Modal (#2) [Ref: opencode]
  ├── 9. Atomic File-Locked Credential Vault (`.credentials.vault` 0600) & Certs (`~/.const/config/certs/`) (#2) [Ref: pi & zcode]
  ├── 10. Web Intelligence Suite (DuckDuckGo Fallback + Local Firecrawl Transformer & Sitemap Map) (#19) [Ref: firecrawl]
  ├── 11. Browser Automation Tool (Playwright Node.js + `browser-use` Python Vision Agent & `/browser`) (#5) [Ref: browser-use]
  ├── 12. File & Media Attachments (PDF/Docs/OCR Parser) (#10) [Ref: open-design & jan]
  └── 13. UI Automations Dashboard di Sidebar (Visual Manager untuk `ctx.schedule`) (#7)

  FASE 3: Creative Design Studio, Local Model Hub & Sharing
  ├── 14. Tab "Design" di Sidebar: Home Hub (Hero, Category Chips, Inspiration Carousel, Recent Projects) (#14) [Ref: open-design Image 1]
  ├── 15. Design Studio Workspace: Split Pane Chat & Live Canvas (`<iframe>`), Deck Thumbnail Rail, Speaker Notes (#14) [Ref: open-design Image 2]
  ├── 16. Integrasi 160+ Modular Design Skills & Standar `DESIGN.md` (#14) [Ref: open-design]
  ├── 17. Local Model Hub (Hugging Face 1-Click GGUF Downloader & Ollama Auto-Discovery) (#21) [Ref: jan]
  ├── 18. In-Chat Real-Time Token Speed (`tokens/s`), TTFT & Prompt Cache Hit/Miss Meter (#16) [Ref: jan & pi]
  ├── 19. Intelligent Compaction & Branch Summarization (#8) [Ref: pi/compaction]
  ├── 20. Smart Memory & Dream Memory Background Worker (#8)
  └── 21. Standalone Interactive HTML Session Exporter (#20) [Ref: pi/export-html]

  FASE 4: Desktop Packaging, Remote Mobile Control & UI Polish
  ├── 22. Universal Mobile Remote Modal (Instant QR/Cloudflare Tunnel & Telegram Bot Bridge) (#3)
  ├── 23. Interactive Custom Color Palette Builder & Multi-Theme System (#6) [Ref: jan]
  ├── 24. Granular Samplers Popover (Temp, Top-P, Min-P) & Hardware Telemetry di Status Bar (#16, #21) [Ref: jan]
  ├── 25. Desktop App Packaging (Electron / Tauri) dengan Sidecar Daemon (#4) [Ref: opencode & jan]
  ├── 26. Safe Git Worktree Sandbox (#15)
  ├── 27. Voice Input STT & Supertonic 3 Local TTS (#12)
  └── 28. Mobile-Responsive PWA Layout (#17) & Pengujian Menyeluruh (Pre-push Gates)
```
