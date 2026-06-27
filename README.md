# war-era-test
test
# WarEra Dashboard

Dashboard tidak resmi untuk melihat profil pemain, skill, dan perusahaan (company) di game WarEra, dengan data langsung dari WarEra API.

⚠️ Proyek pihak ketiga, tidak berafiliasi dengan WarEra. Dibuat untuk kebutuhan komunitas eco-player.

## Fitur

* 🔍 **Cari pemain** berdasarkan username atau User ID
* 👤 **Lihat profil pemain** (level, wealth, skill)
* 🏢 **Lihat daftar company milik pemain**, lengkap dengan:
  * Item yang diproduksi (icon + jumlah/hari)
  * Level Automated Engine (AE) dan estimasi PP/day
  * Status storage (penuh/tidak)
* 🔑 **Dukungan API Token** untuk mengakses data company (disimpan lokal di browser)
* 🛡️ **Mode Safe Play (Anti-Stunting Wealth):** 
  * **Job Market Radar:** Membaca sisa energi pemain dan otomatis merekomendasikan lowongan kerja dengan gaji bersih terbaik untuk mengakumulasi Cash tunai.
* ⚠️ **Mode High Risk (Trading & Geopolitik):**
  * **Transaction & Flipping Ledger:** Kalkulator pencatat aktivitas trading market dengan perhitungan cuan bersih (bebas potongan pajak market).
  * **Geopolitical & Tax Radar:** Memantau korelasi Bonus Produksi vs Pajak Kerja antar negara, serta mendeteksi anomali "Jebakan Bandar" (negara dengan bonus produksi hingga 60% namun rawan bombardir karena militer lemah).

## Screenshot

*Tambahkan screenshot di sini.*

## Struktur Proyek

```text
warera-dashboard/
├── warera-frontend/          # Frontend - Vite + React
│   ├── public/
│   │   └── images/items/     # Icon item (iron.png, limestone.png, dst)
│   ├── src/
│   │   ├── api/
│   │   │   └── apiClient.js  # Pemanggil backend proxy
│   │   ├── components/
│   │   │   ├── PlayerCard.jsx
│   │   │   ├── StatsCard.jsx
│   │   │   ├── SimulatorPanel.jsx
│   │   │   ├── CompanyList.jsx
│   │   │   ├── TransactionLedger.jsx  # BARU: Pencatat trading market bebas pajak
│   │   │   └── GeopoliticalRadar.jsx  # BARU: Deteksi status negara & rawan bombardir
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
└── server/                   # Backend - Node.js Proxy
    ├── src/
    │   ├── routes/
    │   │   ├── playerRoutes.js
    │   │   └── marketRoutes.js
    │   └── controllers/
    │       ├── playerController.js
    │       └── marketController.js
    ├── server.js              # Entry point
    ├── .env
    └── package.json
Alur Data (Data Flow)
Frontend (React)
│  POST /api/players/:procedure   (+ header X-API-Key jika ada)
▼
Backend Proxy (Express, localhost:5000)
│  POST https://api2.warera.io/trpc/:procedure  (+ X-API-Key diteruskan)
▼
WarEra Official API

Backend bertindak sebagai proxy: frontend tidak pernah memanggil WarEra API secara langsung. Ini menghindari masalah CORS dan mencegah API key terekspos di network tab pihak ketiga.

Cara Menjalankan
1. Backend
Bash
cd server
npm install
npm start
Backend berjalan di http://localhost:5000.

2. Frontend
Bash
cd warera-frontend
npm install
npm run dev
Frontend berjalan di http://localhost:5173 (default Vite).

3. API Token (opsional, untuk data company)
Beberapa data — seperti daftar company milik pemain — memerlukan API Token WarEra. Masukkan token di kolom "Masukkan API Token..." pada dashboard, lalu klik Save Token. Token disimpan di localStorage browser dan dikirim sebagai header X-API-Key ke backend.

Endpoint publik seperti pencarian pemain dan profil dasar tidak memerlukan token.

Catatan Teknis Penting
Beberapa hal yang ditemukan selama pengembangan, mungkin berguna untuk kontributor lain:

Semua procedure WarEra (api2.warera.io/trpc/...) menggunakan method POST, dengan body berupa object input langsung (tanpa pembungkus { input: {...} }). Teks pada docs resmi yang menyebut "GET" sudah tidak akurat untuk versi API saat ini — sudah diverifikasi langsung lewat Swagger "Try it out" pada docs resmi.

company.getCompanies mengembalikan hasil dalam field items, bukan companies. Isinya juga array of ID string langsung (["abc123", "def456"]), bukan array of object.

company.getById mengembalikan field production sebagai angka tunggal (total produksi/hari), bukan array — nama item yang diproduksi ada di field itemCode (terpisah).

Level Automated Engine (AE) ada di activeUpgradeLevels.automatedEngine. Tabel konversi level → PP/day (dikonfirmasi in-game):

Level 1: 24 PP/day

Level 2: 48 PP/day

Level 3: 72 PP/day

Level 4: 96 PP/day

Level 5: 120 PP/day

Level 6: 144 PP/day

Level 7: 186 PP/day

Aturan Pajak Market vs Kerja: Transaksi jual-beli item di market adalah 100% bebas pajak (0% tax). Sistem pajak hanya berlaku pada sistem penggajian (kerja), dan potongan pajak tersebut dialirkan ke negara tempat pabrik/perusahaan tersebut berdiri sebagai kompensasi atas bonus produksi negara.

Geopolitik & Jebakan Bandar: Hati-hati dalam menganalisis negara. Negara dengan Bonus Produksi ekstrem (hingga 60%) namun memiliki kekuatan militer lemah sering kali menjadi "Liquidity Trap" (jebakan bandar) yang sangat rawan hancur dibombardir.

Yang Masih Kurang / TODO
Bantuan komunitas sangat diterima untuk:

[ ] Validasi ulang tabel PP/day di atas (apakah konsisten untuk semua jenis item, atau ada variasi?)

[ ] InventoryPanel.jsx — fitur menampilkan equipment yang dipakai pemain belum diimplementasikan.

[x] Fitur market (marketController.js) baru menampilkan harga item — diperbarui dengan indikator Overpriced/Underpriced.

[ ] Menyelesaikan UI komponen TransactionLedger.jsx untuk kalkulator trading bebas pajak.

[ ] Mengintegrasikan logika intelijen perang pada GeopoliticalRadar.jsx untuk membaca status negara (Bonus Produksi vs Defense).

[ ] Penanganan rate limit WarEra API (saat ini belum ada retry/backoff).

[ ] Dukungan multi-halaman untuk pemain dengan company > 10 (saat ini perPage di-hardcode).

[ ] Loading state per-company saat fetch detail (saat ini loading global).

[ ] Unit test untuk komponen dan controller.

[ ] Error handling untuk username/ID yang tidak ditemukan masih sederhana.

Kontribusi
Pull request dan issue terbuka untuk siapa saja. Kalau menemukan field response API yang berbeda dari yang didokumentasikan di atas, atau endpoint baru yang berguna, tolong dibagikan — dokumentasi resmi WarEra API (api2.warera.io/docs) hanya mencantumkan nama endpoint tanpa contoh response lengkap.

Disclaimer
Proyek ini tidak berafiliasi dengan, didukung oleh, atau terhubung secara resmi dengan WarEra atau pengembangnya. Semua data game adalah milik WarEra. Gunakan dengan tanggung jawab sendiri, terutama terkait rate limit dan Terms of Service WarEra.

Lisensi
Tentukan lisensi (misal MIT) sebelum publish.
