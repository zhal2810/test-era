import axios from 'axios';
import { normalizeWareraPayload, extractCompanyReferences, normalizeCompanyDetail } from './companyData';

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

    const response = await api.get(`/${procedure}`, {
      headers,
      params: input ?? {},
    });
    return { success: true, data: normalizeWareraPayload(response.data) };
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
      const companyReferences = extractCompanyReferences(companiesListRes.data ?? companiesListRes);
      if (companyReferences.length > 0) {
        const details = await Promise.all(
          companyReferences.map((reference) => {
            if (typeof reference === 'string' || typeof reference === 'number') {
              return fetchWarera('company.getById', { companyId: reference });
            }
            if (reference && typeof reference === 'object') {
              return Promise.resolve({ success: true, data: normalizeCompanyDetail(reference) });
            }
            return Promise.resolve({ success: true, data: null });
          })
        );
        detailedCompanies = details.map((res) => normalizeCompanyDetail(res?.data ?? res)).filter(Boolean);
      }
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
      const companyReferences = extractCompanyReferences(companiesListRes.data ?? companiesListRes);
      if (companyReferences.length > 0) {
        const details = await Promise.all(
          companyReferences.map((reference) => {
            if (typeof reference === 'string' || typeof reference === 'number') {
              return fetchWarera('company.getById', { companyId: reference }, token);
            }
            if (reference && typeof reference === 'object') {
              return Promise.resolve({ success: true, data: normalizeCompanyDetail(reference) });
            }
            return Promise.resolve({ success: true, data: null });
          })
        );
        detailedCompanies = details.map((res) => normalizeCompanyDetail(res?.data ?? res)).filter(Boolean);
      }
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
