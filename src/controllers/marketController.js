const axios = require('axios');

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

module.exports = { getMarketItems };