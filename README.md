# WarEra Dashboard

Dashboard tidak resmi untuk melihat profil pemain, skill, dan perusahaan (company) di game [WarEra](https://app.warera.io), dengan data langsung dari WarEra API.

>  **Proyek pihak ketiga, tidak berafiliasi dengan WarEra.** Dibuat untuk kebutuhan komunitas eco-player.

## Fitur

- Cari pemain berdasarkan username atau User ID
- Lihat profil pemain (level, wealth, skill)
- Lihat daftar company milik pemain, lengkap dengan:
  - Item yang diproduksi (icon + jumlah/hari)
  - Level Automated Engine (AE) dan estimasi PP/day
  - Status storage (penuh/tidak)
- Dukungan API Token untuk mengakses data company (disimpan lokal di browser)
- Endpoint harga market (`itemTrading.getPrices`) tersedia di backend

> Lihat [ROADMAP.md](./ROADMAP.md) untuk daftar fitur yang sedang direncanakan/dikembangkan.

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
│   │   │   └── CompanyList.jsx
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

## Roadmap

Daftar fitur yang direncanakan dan progres pengembangan ada di [ROADMAP.md](./ROADMAP.md).

## Kontribusi

Lihat [CONTRIBUTING.md](./CONTRIBUTING.md) untuk panduan lengkap.

Singkatnya: pull request dan issue terbuka untuk siapa saja. Kalau menemukan field response API yang berbeda dari yang didokumentasikan di atas, atau endpoint baru yang berguna, tolong dibagikan — dokumentasi resmi WarEra API ([api2.warera.io/docs](https://api2.warera.io/docs/)) hanya mencantumkan nama endpoint tanpa contoh response lengkap.

## Disclaimer

Proyek ini tidak berafiliasi dengan, didukung oleh, atau terhubung secara resmi dengan WarEra atau pengembangnya. Semua data game adalah milik WarEra. Gunakan dengan tanggung jawab sendiri, terutama terkait rate limit dan Terms of Service WarEra.

## Lisensi

[MIT](./LICENSE)
