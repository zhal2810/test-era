import React, { useState } from 'react';
import { fetchWarera } from './api/apiClient';

export default function InventoryPanel({ userId }) {
  const [inventory, setInventory] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchInventory = async () => {
    setIsLoading(true);
    setErrorMsg('');
    const res = await fetchWarera('inventory.fetchCurrentEquipment', { userId });
    if (res.success) {
      setInventory(res.data);
    } else {
      setErrorMsg(res.error);
    }
    setIsLoading(false);
  };

  return (
    <div className="card inventory-panel">
      <h3>Inventory</h3>
      <button onClick={fetchInventory} disabled={isLoading || !userId}>
        {isLoading ? 'Loading...' : 'Refresh Inventory'}
      </button>

      {errorMsg && (
        <p style={{ color: '#e74c3c', fontSize: '13px' }}>⚠️ {errorMsg}</p>
      )}

      {inventory && Array.isArray(inventory) && inventory.length > 0 ? (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {inventory.map((item, idx) => (
            <li key={item?._id || idx}>
              {item?.itemCode} {item?.quantity ? `x${item.quantity}` : ''}
            </li>
          ))}
        </ul>
      ) : (
        !isLoading && <p style={{ fontSize: '13px', color: '#888' }}>No inventory data yet.</p>
      )}
    </div>
  );
}