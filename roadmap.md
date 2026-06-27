# Roadmap

Catatan rencana fitur dan ide pengembangan untuk WarEra Dashboard. Berbeda dari `README.md` yang hanya mencantumkan fitur yang sudah benar-benar jalan, file ini bebas berisi ide, draft, dan progres yang masih berjalan — termasuk yang belum ada kodenya sama sekali.

Status:
- ✅ Selesai & terhubung ke UI
- 🚧 Sedang dikerjakan / sebagian sudah ada kode tapi belum terhubung
- 💡 Ide / belum mulai dikerjakan

---

## 🛡️ Mode Safe Play (Anti-Stunting Wealth)

- 💡 **Job Market Radar** — Membaca sisa energi pemain dan otomatis merekomendasikan lowongan kerja dengan gaji bersih terbaik untuk mengakumulasi Cash tunai.
  - Perlu cek endpoint job listing WarEra (`job.getX` atau semacamnya — belum diverifikasi).

## ⚠️ Mode High Risk (Trading & Geopolitik)

- 🚧 **Transaction & Flipping Ledger** — Kalkulator pencatat aktivitas trading market dengan perhitungan cuan bersih.
  - `TransactionHistory.jsx` sudah ada sebagai draft tampilan log transaksi, tapi belum:
    - Terhubung ke `App.jsx`
    - Punya logic kalkulasi cuan/flipping
    - Terhubung ke data transaksi asli dari API
  - Catatan: perlu verifikasi apakah transaksi market benar-benar bebas pajak (0%) — baru asumsi, belum dicek langsung dari API/in-game.

- 💡 **Geopolitical & Tax Radar** — Memantau korelasi Bonus Produksi vs Pajak Kerja antar negara, serta mendeteksi anomali "Jebakan Bandar" (negara dengan bonus produksi tinggi tapi militer lemah, rawan dibombardir).
  - Belum ada file/komponen sama sekali.
  - Perlu cari endpoint data negara (region/country stats, military strength) di WarEra API.

## 🎒 Inventory

- 🚧 **Inventory Panel** — Menampilkan equipment yang dipakai pemain.
  - `InventoryPanel.jsx` sudah ada tapi baru berupa cuplikan fungsi `fetchInventory`, belum jadi komponen React lengkap (belum ada `import`, state, atau `return` JSX).
  - Endpoint yang relevan: `inventory.fetchCurrentEquipment`.

## 📈 Market

- 🚧 Endpoint `itemTrading.getPrices` sudah tersedia di backend (`marketController.js`), tapi:
  - Belum ada UI untuk menampilkannya di frontend
  - Belum ada indikator overpriced/underpriced (perlu data historis atau perbandingan harga dasar item)

## Perbaikan Teknis Umum

- [ ] Penanganan rate limit WarEra API (saat ini belum ada retry/backoff)
- [ ] Dukungan multi-halaman untuk pemain dengan company > 10 (saat ini `perPage` di-hardcode jadi 10)
- [ ] Loading state per-company saat fetch detail (saat ini loading global, semua company nunggu bareng)
- [ ] Unit test untuk komponen dan controller
- [ ] Error handling untuk username/ID yang tidak ditemukan masih sederhana (cuma alert sederhana)
- [ ] Validasi ulang tabel PP/day — apakah konsisten untuk semua jenis item, atau ada variasi berdasarkan jenis company?

## Ide Mentah (belum dipikirkan matang)

> Bagian ini sengaja dibiarkan tidak rapi — tempat coret-coret ide sebelum jadi item roadmap resmi.

- Bandingkan harga jual vs biaya produksi otomatis per company?
- Notifikasi kalau storage company mendekati penuh?
- Export data company ke CSV/Excel buat tracking manual?
