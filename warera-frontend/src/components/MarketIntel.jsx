import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { fetchWarera, getMarketStats } from '../api/apiClient';

function formatItemName(key) {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function formatChange(value) {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  const sign = num >= 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}%`;
}

function formatVolume(value) {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return '—';

  const rounded = Math.round(num);
  return rounded.toLocaleString('id-ID');
}

function getNumericValue(value) {
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

function buildOrderSummary(order, kind) {
  if (!order || typeof order !== 'object') return null;

  const normalizedKind = String(kind).toLowerCase();
  const side = String(order.side ?? order.type ?? order.orderType ?? order.kind ?? order.direction ?? '').toLowerCase();
  const matchesKind = !side || side.includes(normalizedKind) || (normalizedKind === 'buy' && (side.includes('bid') || side.includes('buy'))) || (normalizedKind === 'sell' && (side.includes('ask') || side.includes('sell')));

  if (!matchesKind) return null;

  const price = getNumericValue(order.price ?? order.unitPrice ?? order.avg ?? order.value ?? order.cost ?? order.buyPrice ?? order.sellPrice);
  const quantity = getNumericValue(order.quantity ?? order.amount ?? order.qty ?? order.size ?? order.count ?? order.volume ?? order.units);

  if (price === null && quantity === null) return null;

  return {
    price,
    quantity,
  };
}

function extractTopOrder(payload, kind) {
  const list = [];
  const push = (value) => {
    if (Array.isArray(value)) {
      list.push(...value);
    } else if (value && typeof value === 'object') {
      list.push(value);
    }
  };

  if (Array.isArray(payload)) {
    list.push(...payload);
  } else if (payload && typeof payload === 'object') {
    push(payload.orders);
    push(payload.buyOrders);
    push(payload.sellOrders);
    push(payload.bids);
    push(payload.asks);
    push(payload.data);
    push(payload.items);
    push(payload.results);
    if (payload[0] && typeof payload[0] === 'object') {
      Object.values(payload).forEach(push);
    }
  }

  const summaries = list
    .map((entry) => buildOrderSummary(entry, kind))
    .filter(Boolean)
    .sort((a, b) => {
      const left = a.price ?? 0;
      const right = b.price ?? 0;
      return kind === 'buy' ? right - left : left - right;
    });

  if (!summaries.length) return '—';

  const first = summaries[0];
  const priceText = first.price === null ? '—' : first.price.toFixed(2);
  const qtyText = first.quantity === null ? '—' : formatVolume(first.quantity);
  return `${priceText} × ${qtyText}`;
}

function summarizeOfferDetail(payload) {
  if (!payload || typeof payload !== 'object') return null;

  const source = payload?.data ?? payload?.result ?? payload;
  if (!source || typeof source !== 'object') return null;

  const price = getNumericValue(source.price ?? source.unitPrice ?? source.avg ?? source.value ?? source.buyPrice ?? source.sellPrice ?? source.cost);
  const quantity = getNumericValue(source.quantity ?? source.amount ?? source.qty ?? source.units ?? source.volume ?? source.count ?? source.size);
  const side = source.side ?? source.type ?? source.kind ?? source.orderType;

  if (price === null && quantity === null && !side) return null;

  return {
    price,
    quantity,
    side: side ? String(side) : null,
  };
}

function resolveChangeValue(statsEntry, candidates, fallback = null, range = 'all') {
  if (!statsEntry || typeof statsEntry !== 'object') {
    return fallback;
  }

  for (const key of candidates) {
    const raw = statsEntry[key];
    if (raw === undefined || raw === null || raw === '') continue;
    const value = Number(raw);
    if (!Number.isNaN(value)) {
      return value;
    }
  }

  const points = Array.isArray(statsEntry.points) ? statsEntry.points : null;
  if (points && points.length > 1) {
    const lastPoint = Number(points[points.length - 1]);
    const targetWindow = {
      '24h': 24,
      '7d': 24 * 7,
      '30d': 24 * 30,
      '90d': 24 * 90,
      all: 0,
    }[range] ?? 0;

    const baselineIndex = Math.max(0, points.length - 1 - targetWindow);
    const baselinePoint = Number(points[baselineIndex]);

    if (!Number.isNaN(lastPoint) && !Number.isNaN(baselinePoint) && baselinePoint !== 0) {
      return ((lastPoint - baselinePoint) / baselinePoint) * 100;
    }
  }

  return fallback;
}

function getChangeStyle(value) {
  const num = Number(value);
  if (Number.isNaN(num)) {
    return {
      color: '#9aa4b2',
      background: 'rgba(154, 164, 178, 0.14)',
      border: '1px solid rgba(154, 164, 178, 0.25)',
    };
  }

  if (num > 0) {
    return {
      color: '#4caf50',
      background: 'rgba(76, 175, 80, 0.14)',
      border: '1px solid rgba(76, 175, 80, 0.25)',
    };
  }

  if (num < 0) {
    return {
      color: '#e74c3c',
      background: 'rgba(231, 76, 60, 0.14)',
      border: '1px solid rgba(231, 76, 60, 0.25)',
    };
  }

  return {
    color: '#f1c40f',
    background: 'rgba(241, 196, 15, 0.14)',
    border: '1px solid rgba(241, 196, 15, 0.25)',
  };
}

function normalizePrices(data, previousPrices = {}, statsMap = {}) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const entries = Object.entries(data).map(([key, value]) => {
      const baseName = formatItemName(key);
      let price = 0;
      let volume = '—';
      let changeValue = 0;
      let change = '—';
      let changeByRange = {
        all: 0,
        '24h': null,
        '7d': null,
        '30d': null,
        '90d': null,
      };

      const statsEntry = statsMap[key] || statsMap[key.toLowerCase()] || null;

      if (typeof value === 'number') {
        price = value;
      } else if (value && typeof value === 'object') {
        price = value.avg ?? value.price ?? value.value ?? 0;
        volume = value.vol ?? value.volume ?? '—';
        const rawChange = value.change ?? value.trend;
        if (rawChange !== undefined && rawChange !== null && rawChange !== '') {
          changeValue = Number(rawChange) || 0;
          change = formatChange(changeValue);
        }
      }

      if (statsEntry) {
        const statsPrice = Number(statsEntry.avg ?? statsEntry.price ?? statsEntry.value ?? price) || 0;
        const statsVolume = statsEntry.vol ?? statsEntry.volume ?? volume;
        const statsChange = statsEntry.change ?? statsEntry.trend;

        if (statsPrice > 0) {
          price = statsPrice;
        }
        if (statsVolume !== undefined && statsVolume !== null && statsVolume !== '') {
          volume = statsVolume;
        }
        if (statsChange !== undefined && statsChange !== null && statsChange !== '') {
          changeValue = Number(statsChange) || 0;
          change = formatChange(changeValue);
        }
      }

      const overallChange = Number(statsEntry?.change ?? statsEntry?.trend ?? changeValue) || 0;
      changeValue = overallChange;
      change = formatChange(changeValue);

      changeByRange = {
        all: overallChange,
        '24h': resolveChangeValue(statsEntry, ['change24h', 'change24', 'change24H', 'change1d', 'changeDay'], overallChange, '24h'),
        '7d': resolveChangeValue(statsEntry, ['change7d', 'change7D', 'change7', 'changeWeek'], overallChange, '7d'),
        '30d': resolveChangeValue(statsEntry, ['change30d', 'change30D', 'change30', 'change1m', 'change1M'], overallChange, '30d'),
        '90d': resolveChangeValue(statsEntry, ['change90d', 'change90D', 'change90', 'change3m', 'change3M'], overallChange, '90d'),
      };

      const numericPrice = Number(price) || 0;
      const previousPrice = Number(previousPrices[key]) || 0;

      if (change === '—' && previousPrice > 0 && numericPrice > 0) {
        changeValue = ((numericPrice - previousPrice) / previousPrice) * 100;
        change = formatChange(changeValue);
      } else if (change === '—' && previousPrice === 0 && numericPrice > 0) {
        changeValue = 0;
        change = '—';
      }

      return {
        item: key,
        name: typeof value === 'object' && value && value.name ? value.name : baseName,
        price: numericPrice,
        changeValue,
        change,
        changeByRange,
        volumeValue: Number(volume) || 0,
        volume,
      };
    }).filter(Boolean);

    return entries;
  }
  return [];
}

export default function MarketIntel({ token }) {
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('price');
  const [sortDirection, setSortDirection] = useState('desc');
  const [changeRange, setChangeRange] = useState('24h');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const loadMarketData = async () => {
      try {
        const previousSnapshot = (() => {
          try {
            return JSON.parse(localStorage.getItem('warera_market_previous') || '{}');
          } catch {
            return {};
          }
        })();

        const [wareraRes, statsRes] = await Promise.all([
          fetchWarera('itemTrading.getPrices', {}),
          getMarketStats().catch(() => null)
        ]);


        if (!cancelled) {
          const statsMap = {};
          if (statsRes?.success && Array.isArray(statsRes.data)) {
            statsRes.data.forEach(item => {
              statsMap[item.itemCode] = item;
            });
          }

          const normalized = (wareraRes.success && wareraRes.data)
            ? normalizePrices(wareraRes.data, previousSnapshot, statsMap)
            : [];

          const enriched = await Promise.all(normalized.map(async (entry) => {
            try {
              const orderRes = await fetchWarera('tradingOrder.getTopOrders', { itemCode: entry.item, limit: 3 }, token);
              const payload = orderRes?.success ? orderRes.data : null;

              return {
                ...entry,
                topBuy: extractTopOrder(payload, 'buy'),
                topSell: extractTopOrder(payload, 'sell'),
                offerText: null,
              };
            } catch {
              return entry;
            }
          }));

          setPrices(enriched);

          try {
            const nextSnapshot = Object.fromEntries(
              enriched.map((entry) => [entry.item, Number(entry.price)])
            );
            localStorage.setItem('warera_market_previous', JSON.stringify(nextSnapshot));
          } catch {
            // ignore storage errors
          }
        }
      } catch {
        if (!cancelled) {
          setPrices([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadMarketData();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const priceEntries = Array.isArray(prices) ? [...prices] : [];

  const getDisplayChangeValue = (entry) => {
    const value = entry?.changeByRange?.[changeRange];
    return value === null || value === undefined ? entry?.changeValue ?? 0 : Number(value);
  };

  const sortedEntries = [...priceEntries].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'volume':
        comparison = (b.volumeValue || 0) - (a.volumeValue || 0);
        break;
      case 'price':
        comparison = Number(b.price) - Number(a.price);
        break;
      case 'change':
        comparison = (getDisplayChangeValue(b) || 0) - (getDisplayChangeValue(a) || 0);
        break;
      case 'name':
        comparison = String(a.name).localeCompare(String(b.name));
        break;
      default:
        comparison = 0;
    }

    return sortDirection === 'desc' ? comparison : -comparison;
  });

  return (
    <div style={{
      background: 'rgba(20, 20, 25, 0.9)',
      border: '1px solid #3498db',
      padding: '20px',
      borderRadius: '12px',
      boxShadow: '0 0 20px rgba(52, 152, 219, 0.2)'
    }}>
      <h3 style={{ color: '#3498db', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        Market
      </h3>
      <p style={{ color: '#888', fontSize: '12px', marginBottom: '16px' }}>
        Harga Pasar Hari ini untuk Referensi Cepat.
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '12px', color: '#8ab4f8' }}>Change:</div>
          <select
            value={changeRange}
            onChange={(e) => setChangeRange(e.target.value)}
            style={{
              background: 'rgba(20,20,25,0.9)',
              color: '#fff',
              border: '1px solid #3498db',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '12px',
            }}
          >
            <option value="24h">24H</option>
            <option value="7d">7D</option>
            <option value="30d">30D</option>
            <option value="90d">90D</option>
            <option value="all">All</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ fontSize: '12px', color: '#8ab4f8' }}>Sort by:</div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              background: 'rgba(20,20,25,0.9)',
              color: '#fff',
              border: '1px solid #3498db',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '12px',
            }}
          >
            <option value="volume">Volume</option>
            <option value="price">Price</option>
            <option value="change">Change</option>
            <option value="name">Name</option>
          </select>
          <select
            value={sortDirection}
            onChange={(e) => setSortDirection(e.target.value)}
            style={{
              background: 'rgba(20,20,25,0.9)',
              color: '#fff',
              border: '1px solid #3498db',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '12px',
            }}
          >
            <option value="desc">↓ Desc</option>
            <option value="asc">↑ Asc</option>
          </select>
        </div>
      </div>

      {loading && priceEntries.length === 0 ? (
        <div style={{ color: '#888', fontSize: '13px' }}>Loading market data from endpoint...</div>
      ) : priceEntries.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {sortedEntries.map((entry) => {
            const displayChangeValue = getDisplayChangeValue(entry);
            const displayChange = formatChange(displayChangeValue);

            return (
              <div key={entry.item} style={{
                background: 'rgba(52, 152, 219, 0.1)',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid rgba(52, 152, 219, 0.3)',
                display: 'flex',
                alignItems: 'center'
              }}>
                <img
                  src={`/images/items/${entry.item}.png`}
                  alt={entry.item}
                  width={24}
                  height={24}
                  style={{ objectFit: 'contain', marginRight: '10px' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: '#aaa', textTransform: 'uppercase', marginBottom: '4px' }}>
                    {entry.name}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>
                      {Number(entry.price).toFixed(2)}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '3px 7px',
                        borderRadius: '999px',
                        ...getChangeStyle(displayChangeValue),
                      }}
                    >
                      {displayChangeValue > 0 ? '▲' : displayChangeValue < 0 ? '▼' : '•'} {displayChange}
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#8ab4f8', marginBottom: '3px' }}>
                    Volume: {formatVolume(entry.volume)}
                  </div>
                  <div style={{ fontSize: '10px', color: '#7dd3fc', lineHeight: 1.4 }}>
                    Buy: {entry.topBuy || '—'}
                  </div>
                  <div style={{ fontSize: '10px', color: '#fda4af', lineHeight: 1.4 }}>
                    Sell: {entry.topSell || '—'}
                  </div>
                  {entry.offerText ? (
                    <div style={{ fontSize: '10px', color: '#fef3c7', lineHeight: 1.4, marginTop: '2px' }}>
                      Offer: {entry.offerText}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ color: '#888', fontSize: '13px' }}>Tidak ada data pasar yang diterima dari endpoint.</div>
      )}
    </div>
  );
}