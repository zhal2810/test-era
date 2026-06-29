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
    <span style={{ fontFamily: 'monospace', letterSpacing: '1px' }}>
      {filled}
      {empty}
    </span>
  );
}

export default function CompanyList({ companies }) {
  if (!companies || companies.length === 0) return null;

  return (
    <div className="card company-list">
      <h3>Your Companies</h3>
      {companies.map((comp, index) => {
        const aeLevel = comp?.activeUpgradeLevels?.automatedEngine ?? 0;
        const ppPerDay = AE_PP_PER_DAY[aeLevel];

        return (
          <div
            key={comp?._id || index}
            className="company-item"
            style={{ marginBottom: '12px', borderBottom: '1px solid #333', paddingBottom: '8px' }}
          >
            <h4 style={{ marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {comp?.itemCode && (
                <img
                  src={`/images/items/${comp.itemCode}.png`}
                  alt={comp.itemCode}
                  width={24}
                  height={24}
                  style={{ objectFit: 'contain' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
              {comp?.name}
            </h4>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
              <span>Level {aeLevel}</span>
              <AeProgressBar level={aeLevel} />
            </div>

            <div style={{ fontSize: '13px', color: '#ccc' }}>
              {ppPerDay !== undefined ? `${ppPerDay} pp/day` : '— pp/day'}
            </div>

            <p style={{ fontSize: '12px', color: '#aaa', margin: '4px 0 0' }}>{comp?.location}</p>

            {/* Produksi item mentah (limestone, iron, dll), terpisah dari pp/day AE */}
            <div className="production-data" style={{ fontSize: '12px', marginTop: '2px' }}>
              {comp?.itemCode ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <img
                    src={`/images/items/${comp.itemCode}.png`}
                    alt={comp.itemCode}
                    width={16}
                    height={16}
                    style={{ objectFit: 'contain' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  {comp.itemCode}:{' '}
                  <strong>
                    {typeof comp.production === 'number'
                      ? comp.production.toFixed(2)
                      : comp.production}
                    /day
                  </strong>
                  {comp.isFull && (
                    <span style={{ marginLeft: '8px', color: '#e67e22' }}>
                      (Storage Full)
                    </span>
                  )}
                </span>
              ) : (
                <span style={{ color: '#666' }}>Tidak ada data produksi</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}