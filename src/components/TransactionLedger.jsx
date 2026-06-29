import React from 'react';

function formatMoney(value) {
  if (value === null || value === undefined || isNaN(value)) return "0";

  const absValue = Math.abs(value);

  // Jika 1.000 atau lebih, format ke "K"
  if (absValue >= 1000) {
    return (value / 1000).toFixed(1).replace(/\.0$/, '') + "K";
  }

  // Jika di bawah 1.000, tampilkan hingga 2 angka di belakang titik
  // Contoh: 23.86, 0.08
  return parseFloat(value.toFixed(2)).toString();
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }); // Hasil: "27 Jun, 18:17"
}

// --- LOGIKA AKUNTANSI (SMART LEDGER) ---
function calculateLedger(transactions, userId) {
  // Urutkan dari terlama ke terbaru agar HPP (Harga Pokok) akurat
  const sortedTx = [...transactions].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const itemState = {};
  const itemSummary = {};
  const enrichedRows = [];

  let totalWagePaid = 0;
  let totalWageReceived = 0;
  let totalBoughtMoney = 0;
  let totalSoldMoney = 0;

  for (const tx of sortedTx) {
    // SAFE MONEY GETTER
    const moneySafe = tx.money || tx.amount || tx.price || 0;

    // Siapkan objek baris untuk UI Tabel
    let enrichedTx = {
      ...tx,
      moneySafe,
      profitThisTx: null,
      displayLabel: tx.transactionType // Default label
    };

    // 1. CEK JIKA INI TRANSAKSI GAJI (WAGE)
    if (tx.transactionType === 'wage') {
      if (tx.sellerId === userId) {
        totalWageReceived += moneySafe;
        enrichedTx.direction = 'income';
        enrichedTx.displayLabel = '💰 Gaji Saya (Kerja)';
      } else if (tx.buyerId === userId) {
        totalWagePaid += moneySafe;
        enrichedTx.direction = 'expense';
        enrichedTx.displayLabel = '💸 Bayar Karyawan';
      }
    }
    // 2. CEK JIKA INI JUAL/BELI (TRADING & ITEM MARKET)
    else if (['trading', 'itemMarket'].includes(tx.transactionType)) {
      const itemCode = tx.itemCode; // AMAN: Hanya diproses jika bukan gaji
      const qty = tx.quantity || 0;

      if (!itemSummary[itemCode]) {
        itemSummary[itemCode] = {
          itemCode, totalBoughtQty: 0, totalSoldQty: 0,
          totalBoughtMoney: 0, totalSoldMoney: 0, profit: 0, hasUnknownCost: false
        };
      }
      const summary = itemSummary[itemCode];
      const isBuy = tx.buyerId === userId;
      const isSell = tx.sellerId === userId;

      if (isBuy) {
        summary.totalBoughtQty += qty;
        summary.totalBoughtMoney += moneySafe;
        totalBoughtMoney += moneySafe;
        summary.profit -= moneySafe;

        if (!itemState[itemCode]) itemState[itemCode] = { avgCost: 0, qtyHeld: 0 };
        const state = itemState[itemCode];

        const newQtyHeld = state.qtyHeld + qty;
        const newTotalCost = state.avgCost * state.qtyHeld + moneySafe;
        state.avgCost = newQtyHeld > 0 ? newTotalCost / newQtyHeld : (moneySafe / qty);
        state.qtyHeld = newQtyHeld;

        enrichedTx.direction = 'buy';
        enrichedTx.displayLabel = `🔻 Beli ${itemCode}`;
      } else if (isSell) {
        summary.totalSoldQty += qty;
        summary.totalSoldMoney += moneySafe;
        totalSoldMoney += moneySafe;

        const state = itemState[itemCode];
        if (!state || state.qtyHeld < qty) {
          summary.hasUnknownCost = true;
          summary.profit += moneySafe;
          enrichedTx.profitThisTx = moneySafe;
        } else {
          const costBasis = state.avgCost * qty;
          enrichedTx.profitThisTx = moneySafe - costBasis;
          summary.profit += enrichedTx.profitThisTx;
          state.qtyHeld -= qty;
        }

        enrichedTx.direction = 'sell';
        enrichedTx.displayLabel = `🔺 Jual ${itemCode}`;
      }
    }
    // 3. TIPE LAINNYA (Tip, Donasi, Open Case, dll)
    else {
      if (tx.buyerId === userId) {
        enrichedTx.direction = 'expense';
        enrichedTx.displayLabel = `➖ ${tx.transactionType}`;
      } else if (tx.sellerId === userId) {
        enrichedTx.direction = 'income';
        enrichedTx.displayLabel = `➕ ${tx.transactionType}`;
      } else {
        enrichedTx.direction = 'neutral';
        enrichedTx.displayLabel = `📌 ${tx.transactionType}`;
      }
    }

    enrichedRows.push(enrichedTx);
  }

  // REKAP KEKAYAAN BERSIH
  const totalIncome = totalSoldMoney + totalWageReceived;
  const totalExpense = totalBoughtMoney + totalWagePaid;
  const netWealth = totalIncome - totalExpense;

  return {
    rows: enrichedRows.reverse(),
    itemBreakdown: Object.values(itemSummary),
    totalIncome,
    totalExpense,
    netWealth,
    totalBoughtMoney,
    totalSoldMoney,
    totalWagePaid,
    totalWageReceived
  };
}

// --- KOMPONEN UTAMA (UI) ---
export default function TransactionLedger({ transactions, userId }) {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="card transaction-ledger">
        <h3>📊 DOMPET EKONOMI</h3>
        <p style={{ fontSize: '14px', color: '#888' }}>
          Belum ada data transaksi. Coba cari pemain.
        </p>
      </div>
    );
  }

  const { rows, itemBreakdown, totalIncome, totalExpense, netWealth, totalBoughtMoney, totalSoldMoney } = calculateLedger(transactions, userId);

  return (
    <div className="card transaction-ledger">
      <h3>📊 DOMPET EKONOMI</h3>

      {/* 1. TOP BAR (RINGKASAN KEKAYAAN) */}
      <div
        className="ledger-summary"
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        <SummaryBox label="Total Pemasukan" value={`+${formatMoney(totalIncome)} cc`} highlight="positive" />
        <SummaryBox label="Total Pengeluaran" value={`-${formatMoney(totalExpense)} cc`} highlight="negative" />
        <SummaryBox
          label="Kekayaan Bersih"
          value={`${netWealth >= 0 ? '+' : ''}${formatMoney(netWealth)} cc`}
          highlight={netWealth >= 0 ? 'positive' : 'negative'}
        />
      </div>

      {/* 2. RIWAYAT TRADING (Grid Layout) */}
      <h4 style={{ fontSize: '13px', color: '#aaa', marginBottom: '8px', borderBottom: '1px solid #444', paddingBottom: '4px' }}>
        RIWAYAT TRADING
      </h4>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.5fr 1fr 1fr 1fr',
        fontSize: '11px',
        fontWeight: 'bold',
        color: '#888',
        marginBottom: '6px',
        textTransform: 'uppercase'
      }}>
        <span>Item</span>
        <span>Beli/Jual</span>
        <span style={{ textAlign: 'right' }}>Harga/Unit</span>
        <span style={{ textAlign: 'right' }}>Total</span>
      </div>

      {itemBreakdown.length === 0 ? (
        <p style={{ fontSize: '12px', color: '#666', padding: '8px 0' }}>
          Belum ada transaksi trading di data yang ditampilkan. Coba naikkan jumlah "Tampilkan per halaman" atau klik "Load More" untuk memuat riwayat lebih lama.
        </p>
      ) : (
        <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
          {itemBreakdown.map((item) => (
            <div key={item.itemCode} style={{
              display: 'grid',
              gridTemplateColumns: '1.5fr 1fr 1fr 1fr',
              fontSize: '12px',
              padding: '4px 0',
              borderBottom: '1px solid #2a2a2a',
              alignItems: 'center'
            }}>
              <span style={{ color: '#fff' }}>{item.itemCode}</span>
              <span style={{ color: '#aaa' }}>{item.totalBoughtQty > 0 ? 'Beli' : 'Jual'}</span>
              <span style={{ textAlign: 'right', color: '#fff' }}>
                {formatMoney(item.totalBoughtQty > 0 ? (item.totalBoughtMoney / item.totalBoughtQty) : (item.totalSoldMoney / item.totalSoldQty))}
              </span>
              <span style={{ textAlign: 'right', color: '#fff', fontWeight: 'bold' }}>
                {formatMoney(item.totalBoughtQty > 0 ? item.totalBoughtMoney : item.totalSoldMoney)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Footer Total Kumulatif */}
      <div style={{ marginTop: '12px', padding: '8px', background: '#1a1a1a', borderRadius: '4px', textAlign: 'right', fontSize: '12px' }}>
        Total Modal Beli: <span style={{ color: '#e67e22' }}>{formatMoney(totalBoughtMoney)} cc</span>
        &nbsp; | &nbsp;
        Total Jual: <span style={{ color: '#3498db' }}>{formatMoney(totalSoldMoney)} cc</span>
      </div>
      {/* 3. RIWAYAT TRANSAKSI (SEMUA TIPE) */}
      <h4 style={{ fontSize: '13px', color: '#aaa', marginBottom: '8px', marginTop: '16px' }}>
        RIWAYAT TRANSAKSI
      </h4>

      {/* Header Tabel */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 2fr 1fr 1fr',
        fontSize: '11px',
        fontWeight: 'bold',
        color: '#888',
        paddingBottom: '6px',
        borderBottom: '1px solid #444',
        marginBottom: '6px',
        textTransform: 'uppercase'
      }}>
        <span>Tanggal</span>
        <span>Aktivitas</span>
        <span style={{ textAlign: 'right' }}>Nilai (cc)</span>
        <span style={{ textAlign: 'right' }}>Profit</span>
      </div>

      {/* Isi Baris Tabel */}
      <div className="ledger-rows" style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
        {rows.map((tx) => (
          <div
            key={tx._id}
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 2fr 1fr 1fr',
              fontSize: '12px',
              padding: '6px 0',
              borderBottom: '1px solid #2a2a2a',
              alignItems: 'center',
              color: tx.direction === 'buy' || tx.direction === 'expense' ? '#e67e22' : '#3498db',
            }}
          >
            {/* Tanggal */}
            <span style={{ color: '#aaa', fontSize: '11px' }}>
              {formatDate(tx.createdAt)}
            </span>

            {/* Aktivitas */}
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {tx.displayLabel} {tx.quantity ? <span style={{ color: '#666' }}>(x{tx.quantity})</span> : ''}
            </span>

            {/* Nilai Transaksi */}
            <span style={{ textAlign: 'right', color: '#fff' }}>
              {formatMoney(tx.moneySafe)}
            </span>

            {/* Profit (Khusus Jual Barang) */}
            <span style={{ textAlign: 'right' }}>
              {tx.profitThisTx !== null
                ? <span style={{ color: tx.profitThisTx >= 0 ? '#4caf50' : '#e74c3c', fontWeight: 'bold' }}>
                  {tx.profitThisTx >= 0 ? '+' : ''}{formatMoney(tx.profitThisTx)}
                </span>
                : <span style={{ color: '#444' }}>-</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Komponen Kotak Ringkasan
function SummaryBox({ label, value, highlight }) {
  const color = highlight === 'positive' ? '#4caf50' : highlight === 'negative' ? '#e74c3c' : '#fff';
  return (
    <div
      style={{
        background: '#1a1a1a',
        padding: '10px 14px',
        borderRadius: '8px',
        flex: '1 1 110px',
        border: `1px solid ${highlight === 'positive' ? '#2ecc7133' : highlight === 'negative' ? '#e74c3c33' : '#333'}`,
      }}
    >
      <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '16px', fontWeight: 'bold', color }}>{value}</div>
    </div>
  );
}