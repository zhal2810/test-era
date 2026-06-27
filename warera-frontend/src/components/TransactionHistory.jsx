export default function TransactionHistory({ transactions }) {
  return (
    <div className="card transaction-history">
      <h3>Transaction Log</h3>
      <div className="scroll-list">
        {transactions && transactions.length > 0 ? (
          transactions.map((tx, index) => (
            <div key={index} className="tx-item">
              {/* Field ini mungkin perlu disesuaikan dengan respon asli API WarEra (misal: tx.id) */}
              <span>{tx.transactionType || 'Transaksi'}</span>
              <strong>{tx.amount || '-'} cc</strong>
            </div>
          ))
        ) : (
          <p style={{ fontSize: '14px', color: '#888' }}>Belum ada data transaksi.</p>
        )}
      </div>
    </div>
  );
}