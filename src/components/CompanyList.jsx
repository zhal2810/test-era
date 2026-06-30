import React from 'react';

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

const MAX_AE_LEVEL = 7;

function AeProgressBar({ level }) {
  const filled = '█'.repeat(level);
  const empty = '░'.repeat(Math.max(0, MAX_AE_LEVEL - level));
  return (
    <span style={{ fontFamily: 'monospace', letterSpacing: '1px', color: '#00ffcc' }}>
      {filled}
      <span style={{ color: '#333' }}>{empty}</span>
    </span>
  );
}

export default function CompanyList({ companies, regionsDict }) {
  if (!companies || companies.length === 0) return null;

  return (
    <div className="card company-list" style={{ background: 'rgba(20, 20, 25, 0.8)', padding: '16px', borderRadius: '12px' }}>
      <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>Your Companies</h3>

      {companies.map((comp, index) => {
        const aeLevel = comp?.activeUpgradeLevels?.automatedEngine ?? 0;
        const ppPerDay = AE_PP_PER_DAY[aeLevel];

        // Ekstraksi Data Region & Bonus
        const regionData = regionsDict ? regionsDict[comp?.region] : null;
        const regionName = regionData?.name || comp?.location || 'Unknown Region';


        // Membaca path JSON bonus (mendukung strategicResources.bonuses atau bonuses langsung)
        const bonuses = regionData?.strategicResources?.bonuses || regionData?.bonuses || {};
        const prodBonus = bonuses.productionPercent || 0;
        const devBonus = bonuses.developmentPercent || 0;


        return (
          <div
            key={comp?._id || index}
            className="company-item"
            style={{
              marginBottom: '16px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.02)',
              backdropFilter: 'blur(5px)'
            }}
          >
            {/* HEADER PERUSAHAAN */}
            <h4 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
              {comp?.itemCode && (
                <img
                  src={`/images/items/${comp.itemCode}.png`}
                  alt={comp.itemCode}
                  width={24}
                  height={24}
                  style={{ objectFit: 'contain', filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.2))' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
              {comp?.name}
            </h4>

            {/* GRID STATISTIK (Bonus & Info Dasar) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>

              {/* Lokasi */}
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '6px' }}>
                <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>Lokasi</div>
                <div style={{ fontSize: '13px', color: '#ddd' }}>{regionName}</div>
              </div>

              {/* Engine Stats */}
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '6px' }}>
                <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>Automated Engine</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                  <span>Lv {aeLevel}</span>
                  <AeProgressBar level={aeLevel} />
                </div>
              </div>

              {/* Bonus Produksi */}
              <div style={{ background: 'rgba(0,255,204,0.05)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(0,255,204,0.1)' }}>
                <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>Bonus Produksi</div>
                <div style={{ fontSize: '14px', color: '#00ffcc', fontWeight: 'bold', textShadow: '0 0 8px rgba(0,255,204,0.4)' }}>
                  +{prodBonus}%
                </div>
              </div>

              {/* Bonus Development */}
              <div style={{ background: 'rgba(0,204,255,0.05)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(0,204,255,0.1)' }}>
                <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>Bonus Development</div>
                <div style={{ fontSize: '14px', color: '#00ccff', fontWeight: 'bold', textShadow: '0 0 8px rgba(0,204,255,0.4)' }}>
                  +{devBonus}%
                </div>
              </div>
            </div>
            
            {/* PRODUKSI & STORAGE */}
            <div className="production-data" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '13px',
              background: 'rgba(0,0,0,0.4)',
              padding: '10px',
              borderRadius: '6px'
            }}>
              {comp?.itemCode ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <img
                    src={`/images/items/${comp.itemCode}.png`}
                    alt={comp.itemCode}
                    width={18}
                    height={18}
                    style={{ objectFit: 'contain' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <span style={{ color: '#ccc' }}>Produksi:</span>
                  <strong style={{ color: '#fff' }}>
                    {typeof comp.production === 'number' ? comp.production.toFixed(2) : comp.production} /day
                  </strong>
                </div>
              ) : (
                <span style={{ color: '#666' }}>Tidak ada data produksi</span>
              )}

              {comp.isFull && (
                <span style={{
                  color: '#ff4444',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  padding: '2px 6px',
                  background: 'rgba(255,68,68,0.1)',
                  borderRadius: '4px'
                }}>
                  STORAGE FULL
                </span>
              )}
            </div>

          </div>
        );
      })}
    </div>
  );
}