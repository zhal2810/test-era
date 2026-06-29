const axios = require('axios');

const WARERA_BASE_URL = 'https://api2.warera.io/trpc';

/**
 * Menangani semua request dinamis ke WarEra lewat satu handler:
 * POST /api/players/:procedure
 *
 * PENTING (terverifikasi langsung dari docs resmi via Swagger "Try it out"):
 * - Method ke WarEra adalah POST.
 * - Body dikirim LANGSUNG sebagai object input, TANPA dibungkus { input: ... }.
 *   Contoh: POST /trpc/user.getUserById  body: { "userId": "..." }
 *
 * Endpoint publik (search.searchAnything, user.getUserById) tidak butuh token.
 * Endpoint yang butuh data milik user (company.getCompanies, company.getById,
 * inventory.fetchCurrentEquipment, dll) butuh header X-API-Key.
 * Frontend kita selalu menyertakan token kalau ada; kalau endpointnya publik,
 * header ini diabaikan oleh WarEra dan tidak masalah.
 */
const handleWareraRequest = async (req, res) => {
  const { procedure } = req.params;
  const { input } = req.body; // dikirim dari frontend sebagai { input: {...} }

  const apiKey = req.headers['x-api-key'];

  try {
    const response = await axios.post(
      `${WARERA_BASE_URL}/${procedure}`,
      input ?? {}, // body ke WarEra = input itu sendiri, tidak dibungkus lagi
      {
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'X-API-Key': apiKey } : {}),
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
      error: 'Gagal memanggil API WarEra',
      detail: error.response?.data || error.message,
    });
  }
};

module.exports = { handleWareraRequest };