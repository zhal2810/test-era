import React, { useState, useEffect, useRef } from 'react';
import { getCompaniesByUserId, getProductionBonus, fetchWarera } from '../api/apiClient';
import { AE_PP_PER_DAY } from './production';


export default function CompanyAnalysis({ userId, token }) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [data, setData] = useState(null);

  // STATE UNTUK KAMUS
  const [regionsDict, setRegionsDict] = useState({});
  const [countriesDict, setCountriesDict] = useState({});
  const [productionBonusDict, setProductionBonusDict] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const pendingGeoLookupsRef = useRef(new Set());

  const loadProductionBonuses = async (companies = []) => {
    if (!token) return;
    const ids = companies.map((c) => c?._id).filter(Boolean);
    if (ids.length === 0) return;

    const results = await Promise.all(
      ids.map((companyId) => getProductionBonus(companyId, token))
    );

    setProductionBonusDict((prev) => {
      const next = { ...prev };
      ids.forEach((companyId, index) => {
        if (results[index]?.success) {
          next[companyId] = results[index].data;
        }
      });
      return next;
    });
  };

  const loadGeographyContext = async (companies = []) => {
    if (!token) return;

    const [countriesRes, regionsRes] = await Promise.all([
      fetchWarera('country.getAllCountries', {}, token),
      fetchWarera('region.getRegionsObject', {}, token),
    ]);

    const countries = Array.isArray(countriesRes?.data) ? countriesRes.data : [];
    const regionsObj = regionsRes?.success && regionsRes.data && typeof regionsRes.data === 'object'
      ? regionsRes.data
      : {};

    const governmentResults = await Promise.all(
      countries.map((country) => fetchWarera('government.getByCountryId', { countryId: country._id }, token))
    );

    const enrichedCountries = countries.map((country, index) => {
      const govRes = governmentResults[index];
      return {
        ...country,
        ...(govRes?.success ? { government: govRes.data } : {}),
      };
    });

    const combinedRegions = { ...regionsObj };

    enrichedCountries.forEach((country) => {
      if (Array.isArray(country.regions)) {
        country.regions.forEach((regionId) => {
          if (combinedRegions[regionId]) {
            combinedRegions[regionId] = {
              ...combinedRegions[regionId],
              countryData: country,
            };
          }
        });
      }
    });

    setCountriesDict(enrichedCountries.reduce((acc, country) => ({ ...acc, [country._id]: country }), {}));
    setRegionsDict(combinedRegions);
  };

  const resolveGeoDetails = async (regionId, countryId) => {
    if (!token || !regionId || pendingGeoLookupsRef.current.has(regionId)) return;

    pendingGeoLookupsRef.current.add(regionId);

    try {
      const [regionRes, countryRes] = await Promise.all([
        fetchWarera('region.getById', { regionId }, token),
        countryId ? fetchWarera('country.getCountryById', { countryId }, token) : Promise.resolve({ success: false }),
      ]);

      setRegionsDict((prev) => {
        const next = { ...prev };
        if (regionRes?.success && regionRes.data) {
          next[regionId] = { ...(next[regionId] || {}), ...regionRes.data };
        }
        if (countryRes?.success && countryRes.data && countryId) {
          const currentCountryData = next[regionId]?.countryData || {};
          next[regionId] = {
            ...(next[regionId] || {}),
            countryData: {
              ...currentCountryData,
              ...countryRes.data,
              _id: countryId,
            },
          };
        }
        return next;
      });

      if (countryRes?.success && countryId) {
        setCountriesDict((prev) => ({
          ...prev,
          [countryId]: {
            ...(prev[countryId] || {}),
            ...countryRes.data,
            _id: countryId,
          },
        }));
      }
    } catch {
      // ignore lookup errors to keep the UI responsive
    } finally {
      pendingGeoLookupsRef.current.delete(regionId);
    }
  };

  useEffect(() => {
    if (token) {
      loadGeographyContext();
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
      await Promise.all([
        loadGeographyContext(result.companies || []),
        loadProductionBonuses(result.companies || []),
      ]);
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

  const totalEstimatedValue = companies.reduce((sum, comp) => {
    const val = typeof comp?.estimatedValue === 'number' ? comp.estimatedValue : 0;
    return sum + val;
  }, 0);

  const totalProductionValue = companies.reduce((sum, comp) => {
    const production = typeof comp?.production === 'number' ? comp.production : 0;
    return sum + production;
  }, 0);

  const totalRevenueEstimate = companies.reduce((sum, comp) => {
    const production = typeof comp?.production === 'number' ? comp.production : 0;
    const estimatedValue = typeof comp?.estimatedValue === 'number' ? comp.estimatedValue : 0;
    const fallbackPrice = estimatedValue > 0 ? estimatedValue / Math.max(production, 1) : 0;
    const itemPrice = fallbackPrice;
    return sum + (production * itemPrice);
  }, 0);

  const totalCostEstimate = companies.reduce((sum, comp) => {
    const production = typeof comp?.production === 'number' ? comp.production : 0;
    const concreteInvested = typeof comp?.concreteInvested === 'number' ? comp.concreteInvested : 0;
    const storageLevel = comp?.activeUpgradeLevels?.storage ?? 0;
    const engineLevel = comp?.activeUpgradeLevels?.automatedEngine ?? 0;
    const upkeep = (concreteInvested * 0.05) + (storageLevel * 3) + (engineLevel * 2);
    return sum + (production > 0 ? upkeep : 0);
  }, 0);

  const totalProfitEstimate = totalRevenueEstimate - totalCostEstimate;

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
              <SummaryStat label="Nilai Estimasi" value={`${totalEstimatedValue.toFixed(2)}`} color="#8ab4f8" />
              <SummaryStat label="Pendapatan Harian" value={`${totalRevenueEstimate.toFixed(2)} /hari`} color="#4caf50" />
              <SummaryStat label="Biaya Harian" value={`${totalCostEstimate.toFixed(2)} /hari`} color="#e74c3c" />

              <div style={{
                marginLeft: 'auto', textAlign: 'center', background: 'rgba(0,0,0,0.4)',
                padding: '10px 24px', borderRadius: '10px', border: '1px solid #333',
              }}>
                <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Profit Harian
                </div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: totalProfitEstimate >= 0 ? '#4caf50' : '#e74c3c' }}>{totalProfitEstimate.toFixed(2)}</div>
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
                resolveGeoDetails={resolveGeoDetails}
                productionBonus={comp?._id ? productionBonusDict[comp._id] : undefined}
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

function CompanyListItem({ comp, regionsDict, resolveGeoDetails, productionBonus, isExpanded, onToggle }) {
  const aeLevel = comp?.activeUpgradeLevels?.automatedEngine ?? 0;
  const ppPerDay = AE_PP_PER_DAY[aeLevel];

  // Identifikasi regional lewat field asli API ("region")
  const regionId = comp?.region;
  const regionData = regionsDict[regionId];
  const countryData = regionData?.countryData;

  // Catatan: rulingParty di API asli ada di countryData.rulingParty (string ID).
  // Ini cuma info partai berkuasa untuk ditampilkan.
  const rulingPartyId = countryData?.rulingParty || null;

  // Production bonus SEKARANG diambil langsung dari endpoint resmi server
  // company.getProductionBonus, bukan dihitung ulang manual di frontend.
  // Shape: { strategicBonus, depositBonus, ethicSpecializationBonus, ethicDepositBonus, total }
  const totalEfficiency = productionBonus ? 100 + (productionBonus.total || 0) : null;

  const breakdownNotes = (() => {
    if (!productionBonus) {
      return ['⏳ Memuat data production bonus dari server...'];
    }
    const notes = [];
    const { strategicBonus = 0, depositBonus = 0, ethicSpecializationBonus = 0, ethicDepositBonus = 0, total = 0 } = productionBonus;

    notes.push(strategicBonus !== 0
      ? `${strategicBonus > 0 ? '+' : ''}${strategicBonus}% Bonus Strategis Negara`
      : `0% Tidak ada Bonus Strategis`);

    notes.push(depositBonus !== 0
      ? `+${depositBonus}% Bonus Deposit Wilayah`
      : `0% Tidak ada Bonus Deposit`);

    notes.push(ethicSpecializationBonus !== 0
      ? `+${ethicSpecializationBonus}% Bonus Spesialisasi Etnis/Partai`
      : `0% Tidak ada Bonus Spesialisasi Etnis`);

    notes.push(ethicDepositBonus !== 0
      ? `+${ethicDepositBonus}% Bonus Deposit Etnis/Partai`
      : `0% Tidak ada Bonus Deposit Etnis`);

    if (countryData?.taxes?.market !== undefined && countryData?.taxes?.market !== null) {
      notes.push(`ℹ️ ${countryData.taxes.market}% Pajak Pasar Negara (tidak memotong production, hanya berlaku saat jual/beli)`);
    }

    if (rulingPartyId) {
      notes.push(`ℹ️ Partai berkuasa: ${rulingPartyId}`);
    }

    notes.push(`= ${total}% Total Production Bonus`);
    return notes;
  })();

  const productionDisplay = typeof comp?.production === 'number' ? `${comp.production.toFixed(0)} u/hari` : '—';
  const storageUsed = typeof comp?.storageUsed === 'number' ? comp.storageUsed : 0;
  const storageMax = typeof comp?.storageMax === 'number' ? comp.storageMax : null;
  const storageCapacityText = storageMax !== null ? `${storageUsed} / ${storageMax}` : `${storageUsed} / —`;
  const storagePercent = storageMax !== null && storageMax > 0 ? Math.min((storageUsed / storageMax) * 100, 100) : 0;

  useEffect(() => {
    if (!resolveGeoDetails || !comp?.region) return;

    const regionHasReadableName = Boolean(regionData?.name || regionData?.code || regionData?.displayName);
    const countryHasReadableName = Boolean(countryData?.name || countryData?.code || countryData?.taxes?.market);

    if (regionHasReadableName && countryHasReadableName) return;

    resolveGeoDetails(comp.region, countryData?._id || countryData?.id || null);
  }, [comp?.region, countryData?._id, countryData?.id, regionData?.name, regionData?.code, regionData?.displayName, countryData?.name, countryData?.code, countryData?.taxes?.market, resolveGeoDetails]);

  const locationText = (() => {
    const regionCode = regionData?.code || regionData?.name || comp?.region || null;
    const countryName = countryData?.name || null;
    const countryCode = countryData?.code?.toUpperCase?.() || null;
    const depositType = regionData?.deposit?.type || null;
    const depositBonus = regionData?.deposit?.bonusPercent;
    const taxRate = countryData?.taxes?.market;

    const parts = [];
    if (regionCode) parts.push(regionCode);
    if (countryName) parts.push(countryName);
    if (countryCode) parts.push(`(${countryCode})`);

    const summary = parts.join(' · ');
    const detailParts = [];
    if (taxRate !== undefined && taxRate !== null) detailParts.push(`${Number(taxRate).toFixed(0)}% Income tax`);
    if (depositType) {
      const bonusText = depositBonus !== undefined && depositBonus !== null ? `${Number(depositBonus).toFixed(0)}%` : 'bonus';
      detailParts.push(`Bonus +${bonusText} deposit (${depositType})`);
    }

    if (summary) {
      return detailParts.length ? `${summary}\n${detailParts.join(' · ')}` : summary;
    }

    return comp?.region ? 'Data lokasi belum tersedia' : '—';
  })();

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
            {/* Nilai produksi sekarang diambil dari data perusahaan, bukan persentase hardcoded */}
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: totalEfficiency === null ? '#888' : totalEfficiency >= 100 ? '#4caf50' : '#e74c3c' }}>
              {productionDisplay}
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

            <div style={{ padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
              <div style={{ color: '#777', fontSize: '11px', marginBottom: '3px' }}>Lokasi Negara</div>
              <div style={{ color: '#fff', fontWeight: '500', whiteSpace: 'pre-line', lineHeight: 1.45 }}>{locationText}</div>
            </div>
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
                <span style={{ color: storageMax !== null && storageUsed >= storageMax ? '#e74c3c' : '#4caf50', fontWeight: 'bold' }}>
                  {storageCapacityText}
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', background: '#222', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  width: `${storagePercent}%`,
                  height: '100%',
                  background: storageMax !== null && storageUsed >= storageMax ? '#e74c3c' : '#4caf50',
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