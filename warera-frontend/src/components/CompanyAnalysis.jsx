import React, { useState, useEffect, useRef } from 'react';
import { getCompaniesByUserId, getProductionBonus, getWorkersByUserId, getUserEcoSkills, getGameConfig, fetchWarera } from '../api/apiClient';
import { AE_PP_PER_DAY, calculateWorkerDailyOutput } from './production';

export default function CompanyAnalysis({ userId, token }) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [data, setData] = useState(null);

  const [regionsDict, setRegionsDict] = useState({});
  const [productionBonusDict, setProductionBonusDict] = useState({});
  const [workersByCompanyId, setWorkersByCompanyId] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [marketPrices, setMarketPrices] = useState({});
  // Map itemCode -> { productionPoints, ... } dari gameConfig.getGameConfig.
  // Statis per sesi game, jadi cukup di-fetch sekali (bukan per company).
  const [itemsConfig, setItemsConfig] = useState({});

  const loadProductionBonuses = async (companies = []) => {
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

  const loadGeographyContext = async () => {
    const regionsRes = await fetchWarera('region.getRegionsObject', {}, token);
    const regionsPayload = regionsRes?.data ?? regionsRes?.result?.data ?? regionsRes;

    const normalizeRegions = (payload) => {
      if (Array.isArray(payload)) return payload.filter(Boolean);
      if (!payload || typeof payload !== 'object') return [];
      if (Array.isArray(payload.regions)) return payload.regions.filter(Boolean);
      return Object.entries(payload)
        .map(([key, value]) => (!value || typeof value !== 'object' || Array.isArray(value)) ? null : { ...value, __fallbackKey: key })
        .filter(Boolean);
    };

    const regionalRecords = normalizeRegions(regionsPayload);
    const combinedRegions = regionalRecords.reduce((acc, region) => {
      const regionId = region?._id || region?.id || region?.regionId || region?.__fallbackKey;
      if (regionId) acc[regionId] = { ...region, _id: regionId };
      return acc;
    }, {});

    setRegionsDict(combinedRegions);
  };

  useEffect(() => {
    loadGeographyContext();
  }, []);

  useEffect(() => {
    // gameConfig statis (termasuk map itemCode -> productionPoints) — cukup
    // sekali per mount, tidak perlu diulang tiap handleAnalyse/per-company.
    (async () => {
      const cfgRes = await getGameConfig(token);
      if (cfgRes.success && cfgRes.data?.items) {
        setItemsConfig(cfgRes.data.items);
      }
    })();
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
    const result = await getCompaniesByUserId(userId, token);
    if (result.success) {
      setData(result);
      const priceRes = await fetchWarera('itemTrading.getPrices', {}, token);
      if (priceRes.success && priceRes.data) setMarketPrices(priceRes.data);
      await loadProductionBonuses(result.companies || []);

      // 1x panggilan untuk SEMUA company sekaligus (bukan per-company)
      const workersRes = await getWorkersByUserId(userId, token);
      if (workersRes.success) {
        const workersByCompany = workersRes.data;

        // Kumpulkan userId unik semua worker (across semua company),
        // biar tiap worker cuma di-fetch skill-nya sekali walau kerja di >1 company.
        const uniqueUserIds = [...new Set(
          Object.values(workersByCompany).flat().map((w) => w?.user).filter(Boolean)
        )];

        const skillsResults = await Promise.all(
          uniqueUserIds.map((uid) => getUserEcoSkills(uid, token))
        );
        const skillsByUserId = uniqueUserIds.reduce((acc, uid, index) => {
          acc[uid] = skillsResults[index]?.data || { energyValue: 0, productionValue: 0 };
          return acc;
        }, {});

        // Tempel skill ke tiap worker
        const enrichedWorkersByCompany = Object.fromEntries(
          Object.entries(workersByCompany).map(([companyId, workerList]) => [
            companyId,
            workerList.map((w) => ({ ...w, ...(skillsByUserId[w?.user] || {}) })),
          ])
        );

        setWorkersByCompanyId(enrichedWorkersByCompany);
      }
    } else {
      setErrorMsg(result.error);
    }
    setIsLoading(false);
  };

  const companies = data?.companies || [];
  // Kalkulasi statistik sederhana...
  const totalProduction = companies.reduce((sum, c) => sum + (typeof c?.production === 'number' ? c.production : 0), 0);
  const totalEstimatedValue = companies.reduce((sum, c) => sum + (typeof c?.estimatedValue === 'number' ? c.estimatedValue : 0), 0);

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', color: '#aaa', textTransform: 'uppercase' }}>
          {data?.playerData?.username ? `Pemain: ${data.playerData.username}` : 'Company Analysis'}
        </div>
        <button onClick={handleAnalyse} disabled={isLoading} style={{ background: 'transparent', color: '#e67e22', border: '1px solid #e67e22', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer' }}>
          {isLoading ? 'MEMUAT...' : '🔄 Refresh'}
        </button>
      </div>

      {!isLoading && companies.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {companies.map((comp, index) => (
            <CompanyListItem
              key={comp?._id || index}
              comp={comp}
              regionsDict={regionsDict}
              productionBonus={comp?._id ? productionBonusDict[comp._id] : undefined}
              workers={comp?._id ? (workersByCompanyId[comp._id] || []) : []}
              isExpanded={expandedId === (comp?._id || index)}
              onToggle={() => setExpandedId(prev => prev === (comp?._id || index) ? null : (comp?._id || index))}
              marketPrices={marketPrices}
              itemsConfig={itemsConfig}
            />
          ))}
        </div>
      )}
    </div>
  );
}
function CompanyListItem({ comp, regionsDict, resolveGeoDetails, productionBonus, isExpanded, onToggle, marketPrices, workers = [], itemsConfig = {} }) {
  // 1. DEFINISI LEVEL DULU (Paling atas)
  const aeLevel = Number(comp?.activeUpgradeLevels?.automatedEngine ?? comp?.automatedEngine ?? 0);
  const ppPerDay = AE_PP_PER_DAY?.[aeLevel] ?? 0;
  
  // 2. DEFINISI STORAGE (Wajib di atas sebelum digunakan)
  const storageLevel = Number(comp?.activeUpgradeLevels?.storage ?? comp?.storageLevel ?? comp?.storage?.level ?? 0);
  const maxStorage = storageLevel * 200;

  // 3. DEFINISI PRODUKSI & KALKULASI PROGRESS
  const pickNumeric = (source, keys) => {
    for (const key of keys) {
      const value = key.split('.').reduce((acc, part) => acc?.[part], source);
      if (typeof value === 'number' && Number.isFinite(value)) return value;
    }
    return null;
  };

  const productionValue = pickNumeric(comp, ['production', 'dailyProduction', 'output', 'generatedProduction']);
  const storageUsed = pickNumeric(comp, ['storageUsed', 'usedStorage', 'storage.used', 'inventoryUsed']);
  const productionBonusValue = pickNumeric(productionBonus, ['total', 'efficiency', 'productionBonus', 'bonus']);
  const currentProduction = Number(comp?.production ?? 0);

  // 4. KALKULASI BAR (maxStorage sekarang sudah pasti ada nilainya)
  const progressPercent = maxStorage > 0 ? Math.min((currentProduction / maxStorage) * 100, 100) : 0;
  const barColor = progressPercent >= 90 ? '#ef4444' : '#10b981';
  // Identifikasi regional lewat field asli API ("region")
  const regionId = comp?.region;
  const regionData = regionsDict[regionId];
  const countryData = regionData?.countryData;


  const rulingPartyId = countryData?.rulingParty || null;


  const totalEfficiency = productionBonusValue !== null ? 100 + productionBonusValue : null;

  const breakdownNotes = (() => {
    if (!productionBonus) {
      return ['⏳ Memuat data production bonus dari server...'];
    }
    const notes = [];
    const { strategicBonus = 0, depositBonus = 0, ethicSpecializationBonus = 0, ethicDepositBonus = 0, total = 0 } = productionBonus;


    const nationBonus = strategicBonus + depositBonus;
    const partyBonus = ethicSpecializationBonus + ethicDepositBonus;


    notes.push(`+${total.toFixed(2)}% Total Bonus`);


    if (nationBonus !== 0 || partyBonus !== 0) {
      notes.push(` ${nationBonus.toFixed(2)}% Nation + ${partyBonus.toFixed(2)}% Party`);
    }


    if (countryData?.taxes?.income !== undefined && countryData?.taxes?.income !== null) {
      notes.push(`ℹ️ ${countryData.taxes.income}% Income tax`);
    }

    return notes;
  })();

  // PENTING: comp.production adalah STOK SAAT INI di gudang (sama persis dengan
  // angka yang dipakai progress bar storage), BUKAN laju produksi per hari.
  // Label diganti dari "u/hari" -> "di gudang" supaya tidak menyesatkan.
  // Laju produksi harian yang benar (dari Engine+Worker) ada di panel
  // "Daily Summary" saat card di-expand.
  const productionDisplay = productionValue !== null ? `${productionValue.toFixed(2)} di gudang` : '—';
  const effectiveStorageUsed = storageUsed ?? 0;
  const effectiveStorageMax = maxStorage ?? null;
  const storageCapacityText = effectiveStorageMax !== null
    ? `${effectiveStorageUsed} / ${effectiveStorageMax}`
    : storageLevel > 0
      ? `Lv ${storageLevel}`
      : `${effectiveStorageUsed} / —`;
  const storagePercent = effectiveStorageMax !== null && effectiveStorageMax > 0
    ? Math.min((effectiveStorageUsed / effectiveStorageMax) * 100, 100)
    : 0;

  useEffect(() => {
    if (!resolveGeoDetails || !comp?.region) return;

    const regionHasReadableName = Boolean(regionData?.name || regionData?.code || regionData?.displayName);
    const countryHasReadableName = Boolean(countryData?.name || countryData?.code || countryData?.taxes?.market);

    if (regionHasReadableName && countryHasReadableName) return;

    resolveGeoDetails(comp.region, countryData?._id || countryData?.id || null);
  }, [comp?.region, countryData?._id, countryData?.id, regionData?.name, regionData?.code, regionData?.displayName, countryData?.name, countryData?.code, countryData?.taxes?.market, resolveGeoDetails]);

  const locationText = (() => {
    const regionLabel = regionData?.displayName || regionData?.name || regionData?.code || regionData?.regionName || null;
    const regionCode = regionData?.code || regionLabel || comp?.region || null;
    const countryName = countryData?.name || regionData?.countryData?.name || regionData?.countryName || null;
    const countryCode = countryData?.code?.toUpperCase?.() || regionData?.countryData?.code?.toUpperCase?.() || null;
    const depositType = regionData?.deposit?.type || regionData?.depositType || null;
    const depositBonus = regionData?.deposit?.bonusPercent ?? regionData?.bonusPercent ?? null;
    const taxRate = countryData?.taxes?.income ?? countryData?.incomeTax ?? null;

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
            {typeof comp?.production === 'number' ? ` · ${comp.production.toFixed(0)} di gudang` : ''}
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
  <div style={{ padding: '0 16px 16px', borderTop: '1px solid #334155' }}>

    {/* KOTAK LOKASI & STORAGE */}
    <div style={{ 
      background: '#0f172a', 
      padding: '16px', 
      borderRadius: '8px', 
      border: '1px solid #334155', 
      marginTop: '16px', 
      display: 'flex', 
      justifyContent: 'space-between',
      fontSize: '12px' 
    }}>
      
      {/* Sisi Kiri: Lokasi */}
      <div>
        <div style={{ color: '#94a3b8', marginBottom: '4px' }}>Lokasi</div>
        <div style={{ color: '#fff', whiteSpace: 'pre-line' }}>{locationText}</div>
        {productionBonus && (
          <div style={{ color: '#3b82f6', marginTop: '4px', lineHeight: '1.4' }}>
            {breakdownNotes.map((note, i) => <div key={i}>{note}</div>)}
          </div>
        )}
      </div>

      {/* Sisi Kanan: Storage */}
      <div style={{ width: '40%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px', color: '#94a3b8' }}>
          <span>Storage Status (Lv {storageLevel})</span>
          <span>{currentProduction.toFixed(2)} / {maxStorage}</span>
        </div>

        {/* Container Bar */}
        <div style={{ width: '100%', height: '8px', background: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{
            width: `${progressPercent}%`,
            height: '100%',
            background: barColor,
            transition: 'width 0.3s ease'
                }}></div>
              </div>
            </div>
          </div>

          {/* GRID: ENGINE & SUMMARY (Ala Arcana dengan Harga Asli) */}
          {(() => {
            // 1. Ambil Harga Asli dari marketPrices
            const rawMarketData = marketPrices[comp?.itemCode];
            const realPrice = typeof rawMarketData === 'number'
              ? rawMarketData
              : (rawMarketData?.avg ?? rawMarketData?.price ?? rawMarketData?.value ?? 0);

            // 2. Kalkulasi PP
            const basePP = ppPerDay || 0;
            const bonusPercent = productionBonus?.total || 0;
            const enginePPWithBonus = basePP * (1 + (bonusPercent / 100));
            // Data worker ASLI (worker.getWorkers + skill dari user.getUserById),
            // dihitung pakai konstanta resmi dari gameConfig.getGameConfig.
            const activeWorkers = Array.isArray(workers) ? workers : [];
            const workerCount = activeWorkers.length || comp?.workerCount || 0;
            const workerBreakdowns = activeWorkers.map((w) => ({
              ...w,
              ...calculateWorkerDailyOutput({
                energyMax: w?.energyValue || 0,
                productionValue: w?.productionValue || 0,
                wagePerPP: w?.wage || 0,
                fidelity: w?.fidelity || 0,
                companyBonusPercent: bonusPercent,
              }),
            }));
            const workersBoostedPPPerDay = workerBreakdowns.reduce((sum, w) => sum + w.boostedPPPerDay, 0);
            const workersWagePerDay = workerBreakdowns.reduce((sum, w) => sum + w.wagePerDay, 0);
            const totalPP = enginePPWithBonus + workersBoostedPPPerDay;

            // 3. Estimasi Produksi & Harga
            // PENTING: dailyProduction HARUS dari totalPP (hasil kalkulasi Engine+Worker),
            // BUKAN dari `productionValue`/comp.production — itu field stok gudang saat ini
            // (dipakai buat progress bar storage), bukan laju produksi harian.
            //
            // Konversi PP -> unit item TIDAK 1:1. Tiap item butuh sejumlah PP
            // tertentu untuk hasilkan 1 unit (field `productionPoints` di
            // gameConfig.getGameConfig -> items). Contoh: fish butuh 40 PP/unit,
            // limestone cuma 1 PP/unit. Fallback ke 1 kalau data belum ke-load
            // supaya tidak divide-by-zero / NaN.
            const ppPerUnit = itemsConfig?.[comp?.itemCode]?.productionPoints || 1;
            const dailyProduction = ppPerUnit > 0 ? (totalPP || 0) / ppPerUnit : 0;

            // Gunakan harga asli dari API jika ada. Jika belum di-load, fallback ke estimasi.
            const itemPrice = realPrice > 0
              ? realPrice
              : (comp?.estimatedValue > 0 && dailyProduction > 0 ? (comp.estimatedValue / dailyProduction) : 0);

            const grossRevenue = dailyProduction * itemPrice;

            // 4. Upkeep & Profit
            // Upkeep SEBELUMNYA pakai formula karangan: (concreteInvested*0.05)
            // + (storageLevel*3) + (aeLevel*2) — angka2 itu tidak ada sumbernya
            // dari API/gameConfig manapun. Dicek di gameConfig.getGameConfig ->
            // "company": tidak ada field maintenanceCost/upkeep sama sekali
            // (beda dengan headquarters/bunker/base yang eksplisit punya
            // maintenanceCost). Jadi company kemungkinan besar TIDAK punya
            // biaya perawatan rutin — satu-satunya biaya real yang terverifikasi
            // adalah wage ke worker.
            const upkeep = workersWagePerDay;
            const netProfit = grossRevenue - upkeep;

            return (
              <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>

                {/* KOTAK 1: AUTOMATED ENGINE */}
                <div style={{ background: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
                  <div style={{ fontWeight: '600', color: '#f8fafc', marginBottom: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    ⚙️ Automated Engine — Lv {aeLevel}
                  </div>
                  <DetailRow label="Base PP / day" value={`${basePP.toFixed(2)} PP`} />
                  <DetailRow label="Production bonus" value={`+${bonusPercent.toFixed(2)}%`} valueColor="#10b981" />
                  <div style={{ borderTop: '1px dashed #334155', margin: '8px 0' }}></div>
                  <DetailRow label="Engine PP (with bonus)" value={`${enginePPWithBonus.toFixed(2)} PP`} />
                </div>

               
                <div style={{ background: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
                  <div style={{ fontWeight: '600', color: '#f8fafc', marginBottom: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    👷 Workers ({workerCount})
                  </div>
                  {workerBreakdowns.length === 0 ? (
                    <div style={{ color: '#64748b', fontSize: '12px' }}>Butuh Token Untuk Menggunakan Workers</div>
                  ) : (
                    <>
                      {workerBreakdowns.map((w) => (
                        <div key={w._id || w.user} style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px dashed #334155' }}>
                          <DetailRow label={`PP/hari (fidelity +${w.fidelityBonusPercent.toFixed(0)}%)`} value={`${w.boostedPPPerDay.toFixed(2)} PP`} valueColor="#10b981" />
                          <DetailRow label="Wage/hari" value={`-${w.wagePerDay.toFixed(3)}`} valueColor="#ef4444" />
                        </div>
                      ))}
                      <DetailRow label="Total PP worker/hari" value={`${workersBoostedPPPerDay.toFixed(2)} PP`} isBold={true} />
                      <div style={{ color: '#64748b', fontSize: '10.5px', marginTop: '6px', lineHeight: '1.4' }}>
                      </div>
                    </>
                  )}
                </div>

                {/* KOTAK 2: DAILY SUMMARY */}
                <div style={{ background: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
                  <div style={{ fontWeight: '600', color: '#f8fafc', marginBottom: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    📊 Daily Summary
                  </div>
                  <DetailRow label="Total PP / day" value={`${totalPP.toFixed(2)} PP`} />
                  <DetailRow label="Production" value={`${dailyProduction.toFixed(2)} ${comp?.itemCode || ''} / hari`} />
                  <DetailRow label="Market price / unit" value={itemPrice > 0 ? itemPrice.toFixed(3) : '—'} />
                  <DetailRow label="Market revenue" value={`+${grossRevenue.toFixed(3)}`} valueColor="#10b981" />
                  <DetailRow label="Upkeep / Wage costs" value={`-${upkeep.toFixed(3)}`} valueColor="#ef4444" />
                  <div style={{ borderTop: '1px dashed #334155', margin: '8px 0' }}></div>
                  <DetailRow
                    label="Net Profit / day"
                    value={`${netProfit > 0 ? '+' : ''}${netProfit.toFixed(3)}`}
                    valueColor={netProfit > 0 ? '#10b981' : '#ef4444'}
                    isBold={true}
                  />
                </div>

              </div>
            );
          })()}

        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, valueColor = '#f8fafc', isBold = false }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12.5px', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
      <span style={{ color: '#94a3b8' }}>{label}</span>
      <span style={{ color: valueColor, fontWeight: isBold ? '700' : '500' }}>{value}</span>
    </div>
  );
}