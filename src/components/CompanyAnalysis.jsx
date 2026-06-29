import React, { useState, useEffect } from 'react';
import { getCompaniesByUserId } from '../api/apiClient';

// Tabel konversi Level Automated Engine (AE) -> PP/day.
// Dikonfirmasi langsung dari in-game.
const AE_PP_PER_DAY = {
  1: 24,
  2: 48,
  3: 72,
  4: 96,
  5: 120,
  6: 144,
  7: 186,
};

export default function CompanyAnalysis({ userId, token,}) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [data, setData] = useState(null);
  const [regionsDict, setRegionsDict] = useState({});
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const fetchRegionsDictionary = async () => {
      try {
        const res = await fetch("https://api2.warera.io/trpc/region.getRegionsObject", {
          method: "GET",
          headers: { "accept": "application/json" }
        });
        const json = await res.json();

        if (json?.result?.data) {
          setRegionsDict(json.result.data); // Data kamus berhasil disimpan!
        }
      } catch (err) {
        console.error("Gagal mengambil kamus region:", err);
      }
    };

    fetchRegionsDictionary();
  }, []);

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
    const result = await getCompaniesByUserId(userId, token, regionsDict,);
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
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px',
      }}>
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

      {/* TAMPILKAN PESAN ERROR JIKA ADA */}
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
          {/* SUMMARY HEADER */}
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

          {/* LIST COMPANY (COLLAPSIBLE) */}
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

  return (
    <div style={{
      background: 'rgba(20, 20, 25, 0.5)', border: '1px solid #333',
      borderRadius: '10px', overflow: 'hidden',
    }}>
      {/* HEADER (selalu terlihat, klik untuk expand) */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '14px 16px', cursor: 'pointer',
        }}
      >
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
          <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#fff' }}>
            {comp?.name || 'Unnamed Company'}
          </div>
          <div style={{ fontSize: '12px', color: '#888' }}>
            {comp?.itemCode ? `${comp.itemCode} · ` : ''}Engine Lv{aeLevel}
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

      {/* DETAIL (expand) */}
      {isExpanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid #2a2a2a' }}>
          <div style={{ fontSize: '12px', color: '#aaa', marginTop: '12px', lineHeight: '1.6' }}>

            {/* LOKASI & BONUS LANDLORD */}
            <DetailRow
              label="Lokasi (Region)"
              value={
                regionsDict[comp?.region]
                  ? regionsDict[comp?.region].name
                  : 'Mencari data... (ID: ' + (comp?.region?.slice(-5) || '—') + ')'
              }
            />
            {/* 2. BONUS PRODUKSI (Menggunakan Kamus & Path JSON Baru) */}
            <DetailRow 
              label="Bonus Produksi" 
              value={
                regionsDict && regionsDict[comp?.region]?.bonuses?.productionPercent
                  ? <span style={{ color: '#4caf50', fontWeight: 'bold' }}>
                      +{regionsDict[comp?.region].bonuses.productionPercent}%
                    </span> 
                  : <span style={{ color: '#888' }}>0%</span>
              } 
            />

            {/* PEKERJA AKTIF */}
            <DetailRow 
              label="Pekerja Aktif" 
              value={comp?.workerCount !== undefined ? `${comp.workerCount} Orang` : '—'} 
            />

            <DetailRow
              label="Engine Level"
              value={`Lv ${aeLevel}${ppPerDay !== undefined ? ` (${ppPerDay} PP/hari)` : ''}`}
            />

            <DetailRow
              label="Produksi Harian"
              value={typeof comp?.production === 'number' ? `${comp.production.toFixed(2)} ${comp?.itemCode || ''}/hari` : '—'}
            />

            {/* STORAGE PROGRESS BAR (Menggantikan teks "Tersedia") */}
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
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
      <span style={{ color: '#777' }}>{label}</span>
      <span style={{ color: '#fff' }}>{value}</span>
    </div>
  );
}