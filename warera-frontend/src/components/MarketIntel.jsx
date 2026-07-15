import React, { useState, useEffect } from 'react';
import { fetchWarera } from '../api/apiClient';

export default function MarketIntel({ token }) {
    const [prices, setPrices] = useState(null);

    useEffect(() => {
        if (token) {
            fetchWarera('itemTrading.getPrices', {}, token).then(res => {
                if (res.success) setPrices(res.data);
            });
        }
    }, [token]);

    if (!prices) return <div style={{ color: '#888', fontSize: '13px' }}>Loading market data...</div>;

    return (
        <div style={{
            background: 'rgba(20, 20, 25, 0.9)',
            border: '1px solid #3498db',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 0 20px rgba(52, 152, 219, 0.2)'
        }}>
            <h3 style={{ color: '#3498db', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                📈 Market Intel
            </h3>

            {/* Tampilan Grid Harga */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {Object.entries(prices).map(([item, price]) => (

                    <div key={item} style={{
                        background: 'rgba(52, 152, 219, 0.1)',
                        padding: '10px',
                        borderRadius: '6px',
                        border: '1px solid rgba(52, 152, 219, 0.3)',
                        display: 'flex',            // Ditambahkan agar gambar dan teks berjajar
                        alignItems: 'center'        // Menjaga agar sejajar vertikal
                    }}>
                        <img
                            src={`/images/items/${item}.png`} // Menggunakan 'item' sesuai map
                            alt={item}
                            width={24}
                            height={24}
                            style={{ objectFit: 'contain', marginRight: '10px' }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />

                        <div>
                            <div style={{ fontSize: '10px', color: '#aaa', textTransform: 'uppercase' }}>{item}</div>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff' }}>
                                {price.toFixed(4)} <span style={{ fontSize: '10px', color: '#3498db' }}>Gold</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}