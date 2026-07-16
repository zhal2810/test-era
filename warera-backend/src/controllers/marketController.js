const axios = require('axios');
const fs = require('fs');
const path = require('path');

const WARERA_BASE_URL = 'https://api2.warera.io/trpc';

/**
 * GET /api/market/items
 * Mengambil daftar harga item dari WarEra (endpoint publik, tidak butuh token).
 * Terverifikasi: procedure resmi WarEra adalah 'itemTrading.getPrices', method POST.
 */
const getMarketItems = async (req, res) => {
  const procedure = 'itemTrading.getPrices';

  try {
    const response = await axios.post(
      `${WARERA_BASE_URL}/${procedure}`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error(
      `[WarEra Proxy Error] ${procedure}:`,
      error.response?.data || error.message
    );
    res.status(error.response?.status || 500).json({
      error: 'Gagal mengambil data market',
      detail: error.response?.data || error.message,
    });
  }
};

/**
 * GET /api/market/stats
 * Membaca data statistik harga historis dari file lokal temp_warera_stats.json.
 */
const getMarketStats = (req, res) => {
  try {
    const filePath = path.join(__dirname, '../../../temp_warera_stats.json');
    if (fs.existsSync(filePath)) {
      const rawData = fs.readFileSync(filePath, 'utf-8');
      const stats = JSON.parse(rawData);
      res.json({ success: true, data: stats });
    } else {
      res.status(404).json({ success: false, error: 'File temp_warera_stats.json tidak ditemukan' });
    }
  } catch (error) {
    console.error('[Market Proxy Error] getMarketStats:', error.message);
    res.status(500).json({
      success: false,
      error: 'Gagal membaca statistik pasar',
      detail: error.message,
    });
  }
};

module.exports = { getMarketItems, getMarketStats };