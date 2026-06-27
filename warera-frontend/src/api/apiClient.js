import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api/players', // Mengarah ke route :procedure di backend
});

/**
 * Memanggil data via backend proxy kita.
 *
 * Catatan format: di sini kita mengirim body sebagai { input: {...} } ke
 * BACKEND kita sendiri (bukan ke WarEra langsung). Backend
 * (playerController.js) yang akan "membongkar" input ini dan mengirimnya
 * langsung tanpa wrapper saat memanggil WarEra, karena WarEra mengharapkan
 * body langsung berupa object input, bukan { input: {...} }.
 *
 * @param {string} procedure - Misal: 'user.getUserById'
 * @param {object} input - Data yang dikirim (misal: { userId: '...' })
 */
export const fetchWarera = async (procedure, input) => {
  const token = localStorage.getItem('warera_api_token');

  try {
    const response = await api.post(
      `/${procedure}`,
      { input },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': token || '', // Token diteruskan ke backend proxy
        },
      }
    );

    // response.data dari backend = response.data dari WarEra (diteruskan apa adanya)
    // bentuknya: { result: { data: ... } }
    const resultData = response.data?.result?.data;

    return { success: true, data: resultData };
  } catch (error) {
    const errMsg =
      error.response?.data?.error?.message ||
      error.response?.data?.error ||
      error.message;
    console.error(`[API ERROR] ${procedure}:`, errMsg);
    return { success: false, error: errMsg, data: null };
  }
};