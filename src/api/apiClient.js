import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api/players', // Sesuaikan dengan endpoint backend Anda
});

export const fetchWarera = async (procedure, input, explicitToken = null) => {
  const token = explicitToken ?? localStorage.getItem('warera_api_token');
  try {
    const response = await api.post(`/${procedure}`, { input }, {
      headers: { 'Content-Type': 'application/json', 'X-API-Key': token || '' },
    });
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