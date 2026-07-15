import React, { useState, useEffect, useCallback } from 'react';
import ApiConfigModal from './ApiConfigModal';
import TransactionLedger from './TransactionLedger';
import CompanyAnalysis from './CompanyAnalysis';
import MarketIntel from './MarketIntel';
import { fetchWarera } from '../api/apiClient';

async function fetchTransactions(userId, token, limit, cursor = null) {
  const input = { limit, userId };
  if (cursor) input.cursor = cursor;

  // fetchWarera mengirim ke backend kita (/api/players/:procedure) dengan
  // body { input: {...} } dan header X-API-Key. Backend (playerController.js)
  // yang membongkar wrapper ini sebelum meneruskannya ke WarEra sebagai POST.
  const result = await fetchWarera('transaction.getPaginatedTransactions', input, token);

  if (!result.success) throw new Error(result.error);
  return result.data ?? {};
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('economy');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [config, setConfig] = useState(null); // { username, userId, token, user }

  // State transaksi
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [pageLimit, setPageLimit] = useState(10);
  const [loadingProgress, setLoadingProgress] = useState(null); // null | { loaded: number }

  // Baca config dari localStorage
  const loadConfig = useCallback(() => {
    const saved = JSON.parse(localStorage.getItem('warera_config') || '{}');
    if (saved.userId) {
      setConfig(saved);
    } else {
      setConfig(null);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Load transaksi saat config atau pageLimit berubah dan ada token
  useEffect(() => {
    if (!config?.userId || !config?.token) {
      setTransactions([]);
      setError(null);
      return;
    }
    loadTransactions(true);
  }, [config, pageLimit]);

  const loadTransactions = async (reset = false) => {
    if (!config?.userId || !config?.token) return;

    // MODE UNLIMITED: auto-fetch semua halaman berurutan sampai nextCursor habis.
    // WarEra tetap membatasi jumlah per request (paginated by design), jadi kita
    // loop manggil cursor berikutnya sendiri, bukan kirim limit raksasa sekaligus.
    if (pageLimit === 'all') {
      setIsLoading(true);
      setError(null);
      setLoadingProgress({ loaded: 0 });

      try {
        let all = [];
        let cursor = null;
        const FETCH_CHUNK = 100; // per-request limit aman, WarEra tetap paginated

        while (true) {
          const result = await fetchTransactions(config.userId, config.token, FETCH_CHUNK, cursor);
          const chunk = result.items || result.transactions || result.data || [];
          all = [...all, ...chunk];
          setLoadingProgress({ loaded: all.length });

          cursor = result.nextCursor || null;
          if (!cursor || chunk.length === 0) break;
        }

        setTransactions(all);
        setNextCursor(null);
        setHasMore(false);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
        setLoadingProgress(null);
      }
      return;
    }

    // MODE NORMAL: satu halaman sesuai pageLimit
    setIsLoading(true);
    setError(null);

    try {
      const cursor = reset ? null : nextCursor;
      const result = await fetchTransactions(config.userId, config.token, pageLimit, cursor);

      // WarEra mengembalikan { items: [...], nextCursor }, bukan { transactions: [...] }
      const newTxs = result.items || result.transactions || result.data || [];
      const nc = result.nextCursor || null;

      setTransactions(prev => reset ? newTxs : [...prev, ...newTxs]);
      setNextCursor(nc);
      setHasMore(!!nc);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Dipanggil setelah modal ditutup — reload config
  const handleModalClose = () => {
    setIsConfigOpen(false);
    loadConfig();
  };

  const getTabStyle = (tabName) => ({
    padding: '10px 20px',
    cursor: 'pointer',
    background: activeTab === tabName ? 'rgba(76,175,80,0.2)' : 'transparent',
    color: activeTab === tabName ? '#4caf50' : '#888',
    border: 'none',
    borderBottom: activeTab === tabName ? '2px solid #4caf50' : '2px solid transparent',
    fontWeight: 'bold',
    transition: 'all 0.2s ease',
    fontSize: '13px',
  });

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d12', fontFamily: 'sans-serif', padding: '20px' }}>

      {/* HEADER */}
      <div style={{
        maxWidth: '900px', margin: '0 auto 20px',
        background: 'rgba(20,20,25,0.6)',
        backdropFilter: 'blur(10px)',
        borderRadius: '12px', padding: '15px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        border: '1px solid #222',
      }}>
        {/* TABS */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button style={getTabStyle('economy')} onClick={() => setActiveTab('economy')}>
            📊 Dompet Ekonomi
          </button>
          <button style={getTabStyle('company')} onClick={() => setActiveTab('company')}>
            🏭 Company Analysis
          </button>
          <button style={getTabStyle('market')} onClick={() => setActiveTab('market')}>
            📈 Market Intel
          </button>
        </div>

        {/* USER INFO + CONFIG */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {config?.user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {config.user.avatarUrl && (
                <img src={config.user.avatarUrl} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} />
              )}
              <span style={{ fontSize: '13px', color: '#aaa' }}>{config.username}</span>
              {config.token && <span style={{ fontSize: '10px', color: '#4caf50' }}>● token</span>}
            </div>
          )}
          <button
            onClick={() => setIsConfigOpen(true)}
            style={{
              background: 'transparent', border: '1px solid #444', color: '#fff',
              padding: '7px 12px', borderRadius: '6px', cursor: 'pointer',
              fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            🔑 {config ? 'Config' : 'Setup'}
          </button>
        </div>
      </div>

      {/* KONTEN */}
      <div style={{ maxWidth: '900px', margin: '0 auto', color: '#fff' }}>

        {/* TAB: DOMPET EKONOMI */}
        {activeTab === 'economy' && (
          <div>
            {/* Belum setup */}
            {!config && (
              <EmptyState
                icon="🔑"
                title="Belum ada konfigurasi"
                desc="Klik Setup untuk input username dan token API."
                action={{ label: 'Buka Setup', onClick: () => setIsConfigOpen(true) }}
              />
            )}

            {/* Sudah username tapi belum token */}
            {config && !config.token && (
              <EmptyState
                icon="🔒"
                title="Token diperlukan"
                desc={`Login sebagai ${config.username}. Tambahkan API token untuk melihat transaksi.`}
                action={{ label: 'Tambah Token', onClick: () => setIsConfigOpen(true) }}
              />
            )}

            {/* Ada token, loading */}
            {config?.token && isLoading && transactions.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px', color: '#888' }}>
                <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
                {loadingProgress
                  ? `Memuat semua transaksi... (${loadingProgress.loaded} dimuat)`
                  : 'Memuat transaksi...'}
              </div>
            )}

            {/* Error */}
            {config?.token && error && (
              <EmptyState
                icon="⚠️"
                title="Gagal memuat transaksi"
                desc={error}
                action={{ label: 'Coba Lagi', onClick: () => loadTransactions(true) }}
              />
            )}

            {/* Ada data */}
            {config?.token && !error && transactions.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '12px', color: '#888' }}>Tampilkan per halaman:</span>
                  <select
                    value={pageLimit}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPageLimit(v === 'all' ? 'all' : Number(v));
                    }}
                    style={{
                      background: '#1a1a1a', color: '#fff', border: '1px solid #444',
                      borderRadius: '6px', padding: '6px 10px', fontSize: '13px', cursor: 'pointer',
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={30}>30</option>
                    <option value="all">Unlimited (semua data)</option>
                  </select>
                </div>

                {loadingProgress && (
                  <p style={{ fontSize: '12px', color: '#888', marginBottom: '10px' }}>
                    ⏳ Memuat semua transaksi... ({loadingProgress.loaded} dimuat sejauh ini)
                  </p>
                )}

                <TransactionLedger transactions={transactions} userId={config.userId} />

                {/* Load More */}
                {hasMore && (
                  <div style={{ textAlign: 'center', marginTop: '16px' }}>
                    <button
                      onClick={() => loadTransactions(false)}
                      disabled={isLoading}
                      style={{
                        background: 'transparent', border: '1px solid #444',
                        color: '#aaa', padding: '8px 20px', borderRadius: '6px',
                        cursor: isLoading ? 'not-allowed' : 'pointer', fontSize: '13px',
                      }}
                    >
                      {isLoading ? '⏳ Memuat...' : `⬇ Load More`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB: COMPANY ANALYSIS */}
        {activeTab === 'company' && (
          <div>
            {!config && (
              <EmptyState
                icon="🔑"
                title="Belum ada konfigurasi"
                desc="Klik Setup untuk input username dan token API."
                action={{ label: 'Buka Setup', onClick: () => setIsConfigOpen(true) }}
              />
            )}

            {config?.userId && (
              <CompanyAnalysis userId={config.userId} token={config.token} />
            )}
          </div>
        )}

        {/* TAB: MARKET INTEL */}
        {activeTab === 'market' && (
          <div style={cardStyle}>
            <h2 style={{ margin: '0 0 10px 0', color: '#3498db' }}>📈 Market Chronicle</h2>
            <p style={{ color: '#aaa', fontSize: '12px', marginBottom: '15px' }}>
              Harga pasar global terkini (Global average prices).
            </p>
            <MarketIntel token={config.token} />
          </div>
        )}
      </div>

      <ApiConfigModal isOpen={isConfigOpen} onClose={handleModalClose} />
    </div>
  );
}

// Komponen empty state reusable
function EmptyState({ icon, title, desc, action }) {
  return (
    <div style={{
      textAlign: 'center', padding: '60px 20px',
      background: 'rgba(20,20,25,0.4)', borderRadius: '12px', border: '1px solid #222',
    }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>{icon}</div>
      <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>{title}</div>
      <div style={{ fontSize: '13px', color: '#888', marginBottom: '20px' }}>{desc}</div>
      {action && (
        <button onClick={action.onClick} style={{
          background: '#4caf50', color: '#000', border: 'none',
          padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold',
        }}>
          {action.label}
        </button>
      )}
    </div>
  );
}

const cardStyle = {
  padding: '20px', background: 'rgba(20,20,25,0.4)',
  borderRadius: '12px', border: '1px solid #222',
};