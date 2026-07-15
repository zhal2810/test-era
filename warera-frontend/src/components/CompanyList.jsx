import React from 'react';
import { AE_PP_PER_DAY, MAX_AE_LEVEL, calculateCompanyProduction } from './production';

function AeProgressBar({ level }) {
  const filled = '█'.repeat(level);
  const empty = '░'.repeat(Math.max(0, MAX_AE_LEVEL - level));
  return (
    <span style={{ fontFamily: 'monospace', letterSpacing: '1px', color: '#00ffcc' }}>
      {filled }
      <span style={{ color: '#333' }}>{empty}</span>
    </span>
  );
}

export default function CompanyList({ companies, regionsDict }) {
  if (!companies || companies.length === 0) return null;

  return (
    <div className="card company-list" style={{ background: 'rgba(20, 20, 25, 0.8)', padding: '16px', borderRadius: '12px' }}>
      <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', color: '#fff' }}>Your Companies</h3>

      {companies.map((comp, index) => {
        const aeLevel = comp?.activeUpgradeLevels?.automatedEngine ?? 0;
        const ppPerDay = AE_PP_PER_DAY[aeLevel];

        // Ekstraksi Regional lewat peta regionsDict
        const regionId = comp?.region;
        const regionData = regionsDict ? regionsDict[regionId] : null;
        const countryData = regionData?.countryData; // Data negara yang ditempel di region
        const locationText = regionData ? `${regionData.code}` : 'Unknown';

        // Hitung efisiensi tunggal menggunakan analisis geopolitik terpadu
        const { totalEfficiency, breakdownNotes } = calculateCompanyProduction(comp, regionData, countryData);

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
            {/* HEADER PERUSAHAAN + TOTAL PROD */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
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
                {comp?.name || 'Unnamed Company'}
              </h4>
              
              {/* Output Efisiensi Tunggal Geopolitik */}
              <span style={{ fontSize: '14px', fontWeight: 'bold', fontFamily: 'monospace', color: totalEfficiency >= 100 ? '#00ffcc' : '#ff4444' }}>
                Prod: {totalEfficiency}%
              </span>
            </div>

            {/* GRID STATISTIK BASE */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              {/* Lokasi */}
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '6px' }}>
                <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>Lokasi Negara</div>
                <div style={{ fontSize: '13px', color: '#ddd', marginTop: '2px' }}>{locationText}</div>
              </div>

              {/* Engine Stats */}
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '6px' }}>
                <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>Automated Engine</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', marginTop: '2px' }}>
                  <span style={{ color: '#fff' }}>Lv {aeLevel}</span>
                  <AeProgressBar level={aeLevel} />
                </div>
              </div>
            </div>

            {/* PANEL EDUKASI MAKRO EKONOMI / GEOPOLITIK WILAYAH */}
            <div style={{ 
              marginBottom: '12px', 
              padding: '10px', 
              background: 'rgba(0, 0, 0, 0.4)', 
              borderRadius: '6px', 
              border: '1px solid rgba(0, 255, 204, 0.15)' 
            }}>
              <div style={{ fontSize: '10px', color: '#00ffcc', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', fontWeight: 'bold' }}>
                📡 Analisis Makro Ekonomi Wilayah
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontFamily: 'monospace', fontSize: '11px' }}>
                {breakdownNotes.map((note, idx) => (
                  <div key={idx} style={{ color: note.startsWith('-') ? '#ff4444' : note.startsWith('0%') ? '#666' : '#00ffcc' }}>
                    ‹ {note}
                  </div>
                ))}
              </div>
            </div>
            
            {/* PRODUKSI & STORAGE */}
            <div className="production-data" style={{
              display: 'flex',
              justify: 'space-between',
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
                  <span style={{ color: '#ccc' }}>Produksi Harian:</span>
                  <strong style={{ color: '#fff' }}>
                    {typeof comp.production === 'number' ? comp.production.toFixed(2) : comp.production} {comp.itemCode.toUpperCase()}/day
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