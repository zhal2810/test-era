import { useState } from 'react'
import { fetchWarera } from './api/apiClient'
import PlayerCard from './components/PlayerCard'
import StatsCard from './components/StatsCard'
import SimulatorPanel from './components/SimulatorPanel'
import CompanyList from './components/CompanyList'
import './App.css'

function App() {
  const [apiToken, setApiToken] = useState(localStorage.getItem('warera_api_token') || '');
  const [searchId, setSearchId] = useState('69b6e417eb350ea7e6ec9bc6');
  const [playerData, setPlayerData] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const saveToken = () => {
    localStorage.setItem('warera_api_token', apiToken);
    alert("Token tersimpan!");
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const searchResult = await fetchWarera('search.searchAnything', { searchText: searchId });

      if (!searchResult.success) {
        setErrorMsg(`Gagal mencari: ${searchResult.error}`);
        return;
      }

      const userIds = searchResult.data?.userIds;
      if (Array.isArray(userIds) && userIds.length > 0) {
        const firstId = userIds[0];

        // 1. Ambil Profil & Daftar Perusahaan
        const [profileRes, companiesListRes] = await Promise.all([
          fetchWarera('user.getUserById', { userId: firstId }),
          fetchWarera('company.getCompanies', { userId: firstId, perPage: 10 })
        ]);

        if (profileRes.success) {
          setPlayerData(profileRes.data);
        } else {
          setErrorMsg(`Gagal mengambil profil: ${profileRes.error}`);
        }

        // 2. Ambil detail perusahaan
        // PENTING: company.getCompanies membungkus hasilnya di field "items"
        // (struktur cursor-pagination resmi WarEra), BUKAN "companies".
        // Field ini sebelumnya salah dibaca sehingga companyList selalu
        // undefined dan companies selalu kosong tanpa ada error apa pun.
        if (!companiesListRes.success) {
          console.error("Gagal mengambil daftar perusahaan:", companiesListRes.error);
          setCompanies([]);
        } else {
          const companyList = companiesListRes?.data?.items;

          if (Array.isArray(companyList) && companyList.length > 0) {
            try {
              // PENTING: items di sini adalah array of ID string langsung
              // (contoh: ["69beaf...", "69ba89..."]), BUKAN array of object
              // dengan properti _id. Sebelumnya kode mengasumsikan object
              // (c._id) sehingga selalu menghasilkan undefined -> body
              // request ke company.getById jadi kosong {} -> 400 Bad Request.
              const companyIds = companyList;
              const details = await Promise.all(
                companyIds.map(id => fetchWarera('company.getById', { companyId: id }))
              );
              setCompanies(details.map(res => res?.data).filter(Boolean));
            } catch (detailErr) {
              console.error("Gagal mengambil detail perusahaan:", detailErr);
              setCompanies([]);
            }
          } else {
            setCompanies([]);
          }
        }
      } else {
        setErrorMsg('Pemain tidak ditemukan.');
        setPlayerData(null);
        setCompanies([]);
      }
    } catch (err) {
      console.error("Gagal menarik data:", err);
      setErrorMsg('Terjadi kesalahan saat menarik data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="root">
      <div className="search-row">
        <input
          type="text"
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          placeholder="Masukkan ID/Username Pemain..."
        />
        <button onClick={handleSearch} disabled={loading}>
          {loading ? 'Mencari...' : 'Cari Pemain'}
        </button>
      </div>

      <div className="settings-panel">
        <input
          type="password"
          placeholder="Masukkan API Token..."
          value={apiToken}
          onChange={(e) => setApiToken(e.target.value)}
        />
        <button onClick={saveToken}>Save Token</button>
        <span className="token-status">
          {apiToken ? '🔑 Token aktif' : '⚠️ Belum ada token'}
        </span>
      </div>

      {errorMsg && <div className="error-banner">{errorMsg}</div>}

      <div className="content">
        {playerData ? (
          <div className="dashboard-grid">
            <div className="left-panel">
              <PlayerCard data={playerData} />
              <StatsCard wealth={playerData.stats?.wealth} />
            </div>
            <div className="right-panel">
              <SimulatorPanel
                skills={playerData.skills}
                level={playerData.leveling?.level}
              />
              <CompanyList companies={companies} />
            </div>
          </div>
        ) : (
          <div className="empty-state">Silakan cari pemain untuk memulai.</div>
        )}
      </div>
    </div>
  )
}

export default App