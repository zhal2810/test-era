import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api/players', // Sesuaikan dengan endpoint backend Anda
});

export const fetchWarera = async (procedure, input, explicitToken = null) => {
  const token = explicitToken ?? localStorage.getItem('warera_api_token');
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['X-API-Key'] = token;
    }

    const response = await api.post(`/${procedure}`, { input }, { headers });
    return { success: true, data: response.data?.result?.data };
  } catch (error) {
    return { success: false, error: error.message, data: null };
  }
};

// Logika Pro dari GitHub Anda
export const searchPlayerCompanies = async (username) => {
  try {
    const searchResult = await fetchWarera('search.searchAnything', { searchText: username });
    if (!searchResult.success) throw new Error(searchResult.error);
    const userId = searchResult.data?.userIds?.[0];
    if (!userId) throw new Error('Pemain tidak ditemukan');

    const [profileRes, companiesListRes] = await Promise.all([
      fetchWarera('user.getUserById', { userId }),
      fetchWarera('company.getCompanies', { userId, perPage: 10 })
    ]);

    let detailedCompanies = [];
    if (companiesListRes.success) {
      const details = await Promise.all(
        (companiesListRes.data?.items || []).map(id => fetchWarera('company.getById', { companyId: id }))
      );
      detailedCompanies = details.map(res => res?.data).filter(Boolean);
    }
    return { success: true, playerData: profileRes.data, companies: detailedCompanies };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// Versi untuk user yang sudah login (sudah punya userId dari config),
// jadi tidak perlu search.searchAnything lagi.
export const getCompaniesByUserId = async (userId, token = null) => {
  try {
    const [profileRes, companiesListRes] = await Promise.all([
      fetchWarera('user.getUserById', { userId }, token),
      fetchWarera('company.getCompanies', { userId, perPage: 10 }, token)
    ]);

    if (!profileRes.success) throw new Error(profileRes.error);

    let detailedCompanies = [];
    if (companiesListRes.success) {
      const details = await Promise.all(
        (companiesListRes.data?.items || []).map(id => fetchWarera('company.getById', { companyId: id }, token))
      );
      detailedCompanies = details.map(res => res?.data).filter(Boolean);
    }
    return { success: true, playerData: profileRes.data, companies: detailedCompanies };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const getItemOfferById = async (itemOfferId, token = null) => {
  try {
    const result = await fetchWarera('itemOffer.getById', { itemOfferId }, token);
    if (!result.success) throw new Error(result.error);
    return { success: true, data: result.data };
  } catch (err) {
    return { success: false, error: err.message, data: null };
  }
};

// Endpoint resmi server-side untuk production bonus sebuah company.
// Return shape: { strategicBonus, depositBonus, ethicSpecializationBonus, ethicDepositBonus, total }
export const getProductionBonus = async (companyId, token = null) => {
  try {
    const result = await fetchWarera('company.getProductionBonus', { companyId }, token);
    if (!result.success) throw new Error(result.error);
    return { success: true, data: result.data };
  } catch (err) {
    return { success: false, error: err.message, data: null };
  }
};