import React, { useState, useEffect } from 'react';
import { fetchWarera } from '../api/apiClient';

const fallbackPrices = {
  coal: 18,
  iron: 22,
  wood: 12,
  food: 9,
  gold: 1,
};

export default function MarketIntel({ token }) {
    const [prices, setPrices] = useState(fallbackPrices);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!token) {
            setPrices(fallbackPrices);
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);

        fetchWarera('itemTrading.getPrices', {}, token).then(res => {
            if (!cancelled) {
                if (res.success && res.data) {
                    setPrices(res.data);
                } else {
                    setPrices(fallbackPrices);
                }
                setLoading(false);
            }
        }).catch(() => {
            if (!cancelled) {
                setPrices(fallbackPrices);
                setLoading(false);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [token]);

    const priceEntries = prices ? Object.entries(prices) : [];

    return (
        <div style={{
            background: 'rgba(20, 20, 25, 0.9)',
            border: '1px solid #3498db',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 0 20px rgba(52, 152, 219, 0.2)'
        }}>
            <h3 style={{ color: '#3498db', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                📈 Market Intel
            </h3>
            <p style={{ color: '#888', fontSize: '12px', marginBottom: '16px' }}>
                Intel pasar umum untuk referensi cepat dan estimasi harga global.
            </p>

            {loading && !prices ? (
                <div style={{ color: '#888', fontSize: '13px' }}>Loading market data...</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {priceEntries.map(([item, price]) => (
                        <div key={item} style={{
                            background: 'rgba(52, 152, 219, 0.1)',
                            padding: '10px',
                            borderRadius: '6px',
                            border: '1px solid rgba(52, 152, 219, 0.3)',
                            display: 'flex',
                            alignItems: 'center'
                        }}>
                            <img
                                src={`/images/items/${item}.png`}
                                alt={item}
                                width={24}
                                height={24}
                                style={{ objectFit: 'contain', marginRight: '10px' }}
                                onError={(e) => { e.target.style.display = 'none'; }}
                            />

                            <div>
                                <div style={{ fontSize: '10px', color: '#aaa', textTransform: 'uppercase' }}>{item}</div>
                                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff' }}>
                                    {typeof price === 'number' ? price.toFixed(4) : price} <span style={{ fontSize: '10px', color: '#3498db' }}>Gold</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}