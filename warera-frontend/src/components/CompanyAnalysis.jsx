import React, { useState, useEffect } from 'react';
import { getCompaniesByUserId, fetchWarera } from '../api/apiClient';
import { AE_PP_PER_DAY, calculateCompanyProduction } from './production';


export default function CompanyAnalysis({ userId, token }) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [data, setData] = useState(null);

  // STATE UNTUK KAMUS
  const [regionsDict, setRegionsDict] = useState({});
  const [countriesDict, setCountriesDict] = useState({});
  const [expandedId, setExpandedId] = useState(null);

useEffect(() => {
    const initData = async () => {

      // Ambil data dari kedua endpoint secara bersamaan (lebih cepat)
      const [countriesRes, regionsRes] = await Promise.all([
        fetchWarera('country.getAllCountries', {}, token),

        fetchWarera('region.getRegionsObject', {}, token)
      ]);

      if (countriesRes.success && regionsRes.success) {
        const countries = countriesRes.data;
        const regionsObj = regionsRes.data; // Ini adalah raw object dari API

        // 2b. Ambil data pemerintahan (partai berkuasa) untuk tiap negara secara paralel
        const governmentResults = await Promise.all(
          countries.map(c => fetchWarera('government.getByCountryId', { countryId: c._id }, token))
        );

        countries.forEach((country, idx) => {
          const govRes = governmentResults[idx];
          if (govRes?.success) {
            country.government = govRes.data;
            // DEBUG: cek struktur asli response government di sini dulu,
            // supaya kita tahu field pasti untuk ethnic bonus / nama partai.
            // Hapus/comment log ini setelah field-nya dikonfirmasi.
            console.log(`[government.getByCountryId] ${country.name}:`, govRes.data);
          }
        });

        // 1. Simpan dictionary Negara
        setCountriesDict(countries.reduce((acc, c) => ({ ...acc, [c._id]: c }), {}));

        // 2. Gabungkan data: Masukkan info Negara langsung ke dalam tiap objek Region
        // Supaya satu tempat (regionsDict) punya data "code", "deposit", sekaligus data "country"
        const combinedRegions = { ...regionsObj };

        countries.forEach(country => {
          if (Array.isArray(country.regions)) {
            country.regions.forEach(rId => {
              // Jika ID region ini ada di dalam data regionsObj dari server
              if (combinedRegions[rId]) {
                // Tempelkan data negara utuh (atau cukup ID negaranya) ke dalam region tersebut
                combinedRegions[rId].countryData = country;
              } else {
                // DEBUG: region ID dari country.regions tidak ketemu di regionsObj.
                // Kalau ini muncul terus untuk region tempat company kamu berada,
                // itu sebabnya "Lokasi Negara" muncul "Unknown".
                console.warn(`[region mismatch] Region ID "${rId}" dari negara "${country.name}" tidak ditemukan di regionsObj`);
              }
            });
          }
        });

        // Simpan hasil penggabungan yang super lengkap ini ke dalam state
        setRegionsDict(combinedRegions);

      }
    };

    if (token) {
      initData();

    }
  }, [token]);
 

  useEffect(() => {
    if (!userId) {
      setData(null);
      return;
    }
    handleAnalyse();
  }, [userId, token]);

  const handleAnalyse = async () => {
    setIsLoading(true);
    setErrorMsg('');
    const result = await getCompaniesByUserId(userId, token);
    if (result.success) {
      setData(result);
    } else {
      setErrorMsg(result.error);
    }
    setIsLoading(false);
  };

  const companies = data?.companies || [];
  const totalProduction = companies.reduce((sum, c) => {
    const val = typeof c?.production === 'number' ? c.production : 0;
    return sum + val;
  }, 0);

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>

      {/* HEADER + REFRESH */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '1px' }}>
          {data?.playerData?.username ? `Pemain: ${data.playerData.username}` : 'Company Analysis'}
        </div>
        <button
          onClick={handleAnalyse}
          disabled={isLoading || !userId}
          style={{
            background: isLoading ? '#555' : 'transparent',
            color: '#e67e22', border: '1px solid #e67e22', padding: '6px 14px',
            borderRadius: '6px', cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '12px', fontWeight: 'bold',
          }}
        >
          {isLoading ? 'MEMUAT...' : '🔄 Refresh'}
        </button>
      </div>

      {errorMsg && (
        <div style={{ background: 'rgba(231, 76, 60, 0.2)', border: '1px solid #e74c3c', color: '#e74c3c', padding: '10px', borderRadius: '6px', marginBottom: '20px' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {isLoading && companies.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>⏳ Memuat data company...</div>
      )}

      {!isLoading && !errorMsg && companies.length > 0 && (
        <>
          {/* SUMMARY PANEL */}
          <div style={{
            background: 'rgba(20, 20, 25, 0.6)', backdropFilter: 'blur(10px)',
            border: '1px solid #333', borderRadius: '12px', padding: '20px',
            marginBottom: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              {data.playerData?.avatarUrl && (
                <img
                  src={data.playerData.avatarUrl}
                  alt=""
                  style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid #e67e22' }}
                />
              )}

              <SummaryStat label="Companies" value={companies.length} />
              <SummaryStat label="Total Produksi" value={`${totalProduction.toFixed(0)} u/hari`} />
              <SummaryStat label="Pendapatan Harian" value="TBA" color="#4caf50" />
              <SummaryStat label="Biaya Harian" value="TBA" color="#e74c3c" />

              <div style={{
                marginLeft: 'auto', textAlign: 'center', background: 'rgba(0,0,0,0.4)',
                padding: '10px 24px', borderRadius: '10px', border: '1px solid #333',
              }}>
                <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Profit Harian
                </div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3498db' }}>TBA</div>
              </div>
            </div>
          </div>

          {/* LIST COMPANIES */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {companies.map((comp, index) => (
              <CompanyListItem
                key={comp?._id || index}
                comp={comp}
                regionsDict={regionsDict}
                isExpanded={expandedId === (comp?._id || index)}
                onToggle={() => setExpandedId(prev => prev === (comp?._id || index) ? null : (comp?._id || index))}
              />
            ))}
          </div>
        </>
      )}

      {!isLoading && !errorMsg && companies.length === 0 && (
        <p style={{ fontSize: '13px', color: '#888' }}>Pemain ini belum punya company.</p>
      )}

    </div>
  );
}

function SummaryStat({ label, value, color = '#fff' }) {
  return (
    <div style={{ textAlign: 'left' }}>
      <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ fontSize: '18px', fontWeight: 'bold', color }}>{value}</div>
    </div>
  );
}

function CompanyListItem({ comp, regionsDict, isExpanded, onToggle }) {
  const aeLevel = comp?.activeUpgradeLevels?.automatedEngine ?? 0;
  const ppPerDay = AE_PP_PER_DAY[aeLevel];

  // Identifikasi regional lewat field asli API ("region")
  const regionId = comp?.region;
  const regionData = regionsDict[regionId];
  const countryData = regionData?.countryData;

  // Data partai berkuasa (untuk ethnic bonus) — field asli belum 100% dikonfirmasi,
  // jadi kita coba beberapa kemungkinan nama field dari response government.getByCountryId.
  // Cek console log "[government.getByCountryId]" untuk memastikan struktur asli,
  // lalu sesuaikan path di bawah ini kalau perlu.
  const government = countryData?.government;
  const partyData = government?.rulingParty || government?.party || government?.president?.party || null;

  // Hitung efisiensi tunggal menggunakan data hasil analisis geopolitik baru
  // (pajak, bonus strategis, bonus partai/etnis, dan bonus deposit wilayah)
  const { totalEfficiency, breakdownNotes } = calculateCompanyProduction(comp, regionData, countryData, partyData);

  const locationText = countryData ? `${countryData.name} (${countryData.code?.toUpperCase()})` : 'Mencari data / Unknown';

  return (
    <div style={{ background: 'rgba(20, 20, 25, 0.5)', border: '1px solid #333', borderRadius: '10px', overflow: 'hidden' }}>
      
      {/* HEADER BAR */}
      <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', cursor: 'pointer' }}>
        {comp?.itemCode && (
          <img
            src={`/images/items/${comp.itemCode}.png`}
            alt={comp.itemCode}
            width={32}
            height={32}
            style={{ objectFit: 'contain', flexShrink: 0 }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        )}

        <div style={{ flexGrow: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '10px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#fff' }}>
              {comp?.name || 'Unnamed Company'}
            </span>
            {/* Total efisiensi dijadikan satu angka di kanan atas row */}
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: totalEfficiency >= 100 ? '#4caf50' : '#e74c3c' }}>
              Prod: {totalEfficiency}%
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
            {comp?.itemCode ? `${comp.itemCode.toUpperCase()} · ` : ''}Engine Lv{aeLevel}
            {ppPerDay !== undefined ? ` (${ppPerDay} PP)` : ''}
            {typeof comp?.production === 'number' ? ` · ${comp.production.toFixed(0)} u/hari` : ''}
          </div>
        </div>

        {comp?.isFull && (
          <span style={{ fontSize: '11px', color: '#e67e22', whiteSpace: 'nowrap' }}>
            Storage Full
          </span>
        )}

        <span style={{ color: '#666', fontSize: '12px', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          ▼
        </span>
      </div>

      {/* DETAIL DROPDOWN PANEL */}
      {isExpanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid #2a2a2a' }}>
          <div style={{ fontSize: '12px', color: '#aaa', marginTop: '12px', lineHeight: '1.6' }}>

            <DetailRow label="Lokasi Negara" value={locationText} />
            <DetailRow label="Pekerja Aktif" value={comp?.workerCount !== undefined ? `${comp.workerCount} Orang` : '—'} />
            <DetailRow label="Engine Level" value={`Lv ${aeLevel}${ppPerDay !== undefined ? ` (${ppPerDay} PP/hari)` : ''}`} />
            <DetailRow label="Produksi Harian" value={typeof comp?.production === 'number' ? `${comp.production.toFixed(2)} ${comp?.itemCode || ''}/hari` : '—'} />

            {/* PANEL EDUKASI STRATEGI GEOPOLITIK */}
            <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(0, 0, 0, 0.4)', borderRadius: '8px', border: '1px solid rgba(0, 212, 255, 0.15)' }}>
              <div style={{ fontSize: '10px', color: '#00d4ff', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', fontWeight: 'bold' }}>
                📡 ANALISIS MAKRO EKONOMI WILAYAH
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontFamily: 'monospace', fontSize: '11px' }}>
                {breakdownNotes.map((note, idx) => (
                  <div key={idx} style={{ color: note.startsWith('-') ? '#e74c3c' : note.startsWith('0%') ? '#888' : '#4caf50' }}>
                    ‹ {note}
                  </div>
                ))}
              </div>
            </div>

            {/* STORAGE PROGRESS BAR */}
            <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', border: '1px solid #333' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#aaa', marginBottom: '6px' }}>
                <span>Kapasitas Storage</span>
                <span style={{ color: comp?.storageUsed >= (comp?.storageMax || 800) ? '#e74c3c' : '#4caf50', fontWeight: 'bold' }}>
                  {comp?.storageUsed || 0} / {comp?.storageMax || 800}
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', background: '#222', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(((comp?.storageUsed || 0) / (comp?.storageMax || 800)) * 100, 100)}%`,
                  height: '100%',
                  background: comp?.storageUsed >= (comp?.storageMax || 800) ? '#e74c3c' : '#4caf50',
                  transition: 'width 0.4s ease'
                }} />
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
      <span style={{ color: '#777' }}>{label}</span>
      <span style={{ color: '#fff', fontWeight: '500' }}>{value}</span>
    </div>
  );
}