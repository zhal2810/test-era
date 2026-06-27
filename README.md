# WarEra Dashboard

Dashboard tidak resmi untuk melihat profil pemain, skill, dan perusahaan (company) di game [WarEra](https://app.warera.io), dengan data langsung dari WarEra API.

> ⚠️ **Proyek pihak ketiga, tidak berafiliasi dengan WarEra.** Dibuat untuk kebutuhan komunitas eco-player.

## Fitur

### Sudah Berjalan
- 🔍 Cari pemain berdasarkan username atau User ID
- 👤 Lihat profil pemain (level, wealth, skill)
- 🏢 Lihat daftar company milik pemain, lengkap dengan:
  - Item yang diproduksi (icon + jumlah/hari)
  - Level Automated Engine (AE) dan estimasi PP/day
  - Status storage (penuh/tidak)
- 🔑 Dukungan API Token untuk mengakses data company (disimpan lokal di browser)
- 📈 Endpoint harga market (`itemTrading.getPrices`) sudah tersedia di backend

### Dalam Pengembangan / Belum Terhubung ke UI
- 🛡️ **Mode Safe Play (Anti-Stunting Wealth)** — Job Market Radar untuk merekomendasikan lowongan kerja dengan gaji bersih terbaik
- ⚠️ **Mode High Risk (Trading & Geopolitik)**:
  - Transaction & Flipping Ledger — kalkulator pencatat trading market dengan perhitungan cuan bersih
  - Geopolitical & Tax Radar — pemantauan Bonus Produksi vs Pajak Kerja antar negara, termasuk deteksi negara "jebakan bandar" (bonus produksi tinggi tapi militer lemah, rawan bombardir)
- 🎒 Inventory Panel — menampilkan equipment yang dipakai pemain

> Beberapa komponen di atas (`InventoryPanel.jsx`, `TransactionHistory.jsx`) sudah ada filenya di `src/components/`, tapi **belum di-import ke `App.jsx`**, jadi belum tampil di UI. Lihat bagian [TODO](#yang-masih-kurang--todo).

## Screenshot

_Tambahkan screenshot di sini._

## Struktur Proyek

```text
war-era-test/
├── warera-frontend/              # Frontend - Vite + React
│   ├── public/
│   │   └── images/               # Icon item (iron.png, limestone.png, dst)
│   ├── src/
│   │   ├── api/
│   │   │   └── apiClient.js      # Pemanggil backend proxy
│   │   ├── components/
│   │   │   ├── playerCard.jsx
│   │   │   ├── StatsCard.jsx
│   │   │   ├── SimulatorPanel.jsx
│   │   │   ├── CompanyList.jsx
│   │   │   ├── InventoryPanel.jsx       # belum terhubung ke App.jsx
│   │   │   └── TransactionHistory.jsx   # belum terhubung ke App.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
└── warera-backend/                # Backend - Node.js Proxy
    ├── src/
    │   ├── routes/
    │   │   ├── playerRoutes.js
    │   │   └── marketRoutes.js
    │   ├── controllers/
    │   │   ├── playerController.js
    │   │   └── marketController.js
    │   └── services/
    │       └── apiService.js      # Wrapper axios + cache untuk panggilan tRPC
    ├── server.js                   # Entry point
    ├── .env
    └── package.json
```

## Alur Data (Data Flow)

```text
Frontend (React)
   │  POST /api/players/:procedure   (+ header X-API-Key jika ada)
   ▼
Backend Proxy (Express, localhost:5000)
   │  POST https://api2.warera.io/trpc/:procedure  (+ X-API-Key diteruskan)
   ▼
WarEra Official API
```

Backend bertindak sebagai **proxy**: frontend tidak pernah memanggil WarEra API secara langsung. Ini menghindari masalah CORS dan mencegah API key terekspos di network tab pihak ketiga.

## Cara Menjalankan

### 1. Backend

```bash
cd warera-backend
npm install
npm start
```

Backend berjalan di `http://localhost:5000`.

### 2. Frontend

```bash
cd warera-frontend
npm install
npm run dev
```

Frontend berjalan di `http://localhost:5173` (default Vite).

### 3. API Token (opsional, untuk data company)

Beberapa data — seperti daftar company milik pemain — memerlukan API Token WarEra. Masukkan token di kolom **"Masukkan API Token..."** pada dashboard, lalu klik **Save Token**. Token disimpan di `localStorage` browser dan dikirim sebagai header `X-API-Key` ke backend.

> Endpoint publik seperti pencarian pemain dan profil dasar **tidak** memerlukan token.

## Catatan Teknis Penting

Beberapa hal yang ditemukan selama pengembangan, mungkin berguna untuk kontributor lain:

- **Semua procedure WarEra (`api2.warera.io/trpc/...`) menggunakan method `POST`**, dengan body berupa object input langsung (tanpa pembungkus `{ input: {...} }`). Teks pada docs resmi yang menyebut "GET" sudah tidak akurat untuk versi API saat ini — sudah diverifikasi langsung lewat Swagger "Try it out" pada docs resmi.
- **`company.getCompanies`** mengembalikan hasil dalam field **`items`**, bukan `companies`. Isinya juga **array of ID string langsung** (`["abc123", "def456"]`), bukan array of object — jangan akses `c._id`, langsung pakai ID-nya.
- **`company.getById`** mengembalikan field `production` sebagai **angka tunggal** (total produksi/hari), bukan array. Nama item yang diproduksi ada di field **`itemCode`** (terpisah, satu company = satu item).
- **Level Automated Engine (AE)** ada di `activeUpgradeLevels.automatedEngine`. Tabel konversi level → PP/day (dikonfirmasi langsung in-game):

  | Level AE | PP/day |
  |----------|--------|
  | 1        | 24     |
  | 2        | 48     |
  | 3        | 72     |
  | 4        | 96     |
  | 5        | 120    |
  | 6        | 144    |
  | 7        | 186    |

- **Pajak market vs kerja** (belum diverifikasi langsung dari API, perlu konfirmasi lebih lanjut): transaksi jual-beli di market diduga bebas pajak, sementara potongan pajak hanya berlaku pada sistem penggajian dan dialirkan ke negara tempat company berdiri.
- **Geopolitik**: negara dengan Bonus Produksi tinggi namun kekuatan militer lemah berpotensi jadi target bombardir — analisis otomatis untuk ini belum diimplementasikan (lihat TODO).

## Yang Masih Kurang / TODO

Bantuan komunitas sangat diterima untuk:

- [ ] Validasi ulang tabel PP/day di atas — apakah konsisten untuk semua jenis item, atau ada variasi?
- [ ] Hubungkan `InventoryPanel.jsx` ke `App.jsx` (file sudah ada, baru berupa draft fungsi tanpa komponen lengkap)
- [ ] Hubungkan `TransactionHistory.jsx` ke `App.jsx` dan sambungkan ke data transaksi asli dari API
- [ ] Bangun kalkulator **Transaction & Flipping Ledger** (cuan bersih trading) — belum ada filenya
- [ ] Bangun **Geopolitical & Tax Radar** (analisis Bonus Produksi vs Defense per negara) — belum ada filenya
- [ ] Bangun **Job Market Radar** (rekomendasi kerja berdasarkan energi & gaji bersih) — belum ada filenya
- [ ] Indikator overpriced/underpriced di data market (`itemTrading.getPrices` baru menampilkan harga mentah)
- [ ] Penanganan rate limit WarEra API (saat ini belum ada retry/backoff)
- [ ] Dukungan multi-halaman untuk pemain dengan company > 10 (saat ini `perPage` di-hardcode)
- [ ] Loading state per-company saat fetch detail (saat ini loading global)
- [ ] Unit test untuk komponen dan controller
- [ ] Error handling untuk username/ID yang tidak ditemukan masih sederhana

## Kontribusi

Lihat [CONTRIBUTING.md](./CONTRIBUTING.md) untuk panduan lengkap.

Singkatnya: pull request dan issue terbuka untuk siapa saja. Kalau menemukan field response API yang berbeda dari yang didokumentasikan di atas, atau endpoint baru yang berguna, tolong dibagikan — dokumentasi resmi WarEra API ([api2.warera.io/docs](https://api2.warera.io/docs/)) hanya mencantumkan nama endpoint tanpa contoh response lengkap.

## Disclaimer

Proyek ini tidak berafiliasi dengan, didukung oleh, atau terhubung secara resmi dengan WarEra atau pengembangnya. Semua data game adalah milik WarEra. Gunakan dengan tanggung jawab sendiri, terutama terkait rate limit dan Terms of Service WarEra.

## Lisensi

[MIT](./LICENSE)
