const express = require('express');
const cors = require('cors');
require('dotenv').config();

const playerRoutes = require('./src/routes/playerRoutes');
const marketRoutes = require('./src/routes/marketRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Sambungkan router ke path masing-masing.
// Sebelumnya bagian ini TIDAK ADA -> playerRoutes.js & marketRoutes.js
// yang sudah dibuat tidak pernah benar-benar terpanggil.
app.use('/api/players', playerRoutes);
app.use('/api/market', marketRoutes);

// Endpoint kecil untuk cek backend hidup (opsional, enak buat debugging)
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// Jalankan Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 WarEra Backend Proxy berjalan di http://localhost:${PORT}`);
});