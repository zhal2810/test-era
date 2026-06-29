import React, { useState, useEffect } from 'react';
import { fetchWarera } from '../api/apiClient';

async function searchUser(username, token) {
  // search.searchAnything hanya mengembalikan { userIds: [...] } — array ID,
  // bukan object user lengkap. Jadi kita ambil ID pertama (match terbaik),
  // lalu fetch profil lengkapnya lewat user.getUserById.
  const searchResult = await fetchWarera('search.searchAnything', { searchText: username }, token || null);
  if (!searchResult.success) throw new Error(searchResult.error);

  const userId = searchResult.data?.userIds?.[0];
  if (!userId) throw new Error('User tidak ditemukan');

  const profileResult = await fetchWarera('user.getUserById', { userId }, token || null);
  if (!profileResult.success) throw new Error(profileResult.error);

  const user = profileResult.data;
  if (!user) throw new Error('Gagal memuat profil user');

  return user; // { _id, username, avatarUrl, ... }
}

export default function ApiConfigModal({ isOpen, onClose }) {
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [status, setStatus] = useState(null); // null | 'loading' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const [foundUser, setFoundUser] = useState(null);

  useEffect(() => {
    if (isOpen) {
      // Load data tersimpan
      const saved = JSON.parse(localStorage.getItem('warera_config') || '{}');
      setUsername(saved.username || '');
      setToken(saved.token || '');
      setFoundUser(saved.user || null);
      setStatus(null);
      setErrorMsg('');
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!username.trim()) {
      setErrorMsg('Username wajib diisi');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMsg('');
    setFoundUser(null);

    try {
      const user = await searchUser(username.trim(), token.trim());
      setFoundUser(user);

      // Simpan semua ke satu key
      localStorage.setItem('warera_config', JSON.stringify({
        username: user.username,
        userId: user._id,
        token: token.trim() || null,
        user,
      }));

      setStatus('success');
      setTimeout(() => onClose(), 1200);

    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'Gagal mencari user');
    }
  };

  const handleClear = () => {
    localStorage.removeItem('warera_config');
    setUsername('');
    setToken('');
    setFoundUser(null);
    setStatus(null);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(5px)',
      display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
      paddingTop: '10vh', zIndex: 9999,
    }}>
      <div style={{
        background: 'rgba(20,20,25,0.95)',
        border: '1px solid #4caf50',
        borderRadius: '12px',
        padding: '24px',
        width: '420px',
        color: '#fff',
        position: 'relative',
      }}>
        {/* HEADER */}
        <h3 style={{ margin: '0 0 20px 0', borderBottom: '1px solid #333', paddingBottom: '10px', color: '#4caf50' }}>
          ⚙️ Configuration
        </h3>

        {/* USERNAME */}
        <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '6px' }}>
          Username <span style={{ color: '#4caf50' }}>*</span>
          <span style={{ color: '#555', marginLeft: '8px' }}>— public, untuk load profil & company</span>
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => { setUsername(e.target.value); setStatus(null); }}
          placeholder="e.g. zxz"
          style={inputStyle}
        />

        {/* TOKEN */}
        <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '6px', marginTop: '14px' }}>
          API Token <span style={{ color: '#555' }}>— opsional, wajib untuk melihat transaksi</span>
        </label>
        <input
          type="password"
          value={token}
          onChange={(e) => { setToken(e.target.value); setStatus(null); }}
          placeholder="Paste token dari ingame settings..."
          style={inputStyle}
        />

        {/* FOUND USER PREVIEW */}
        {foundUser && status === 'success' && (
          <div style={{
            marginTop: '14px', padding: '10px 12px',
            background: 'rgba(76,175,80,0.1)', border: '1px solid #4caf5044',
            borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            {foundUser.avatarUrl && (
              <img src={foundUser.avatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} />
            )}
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{foundUser.username}</div>
              <div style={{ fontSize: '11px', color: '#888' }}>ID: {foundUser._id}</div>
            </div>
            <span style={{ marginLeft: 'auto', color: '#4caf50', fontSize: '13px' }}>✓ Ditemukan</span>
          </div>
        )}

        {/* ERROR */}
        {status === 'error' && (
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#e74c3c' }}>
            ⚠ {errorMsg}
          </div>
        )}

        {/* ACTIONS */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
          <button onClick={handleClear} style={ghostBtnStyle}>
            🗑 Reset
          </button>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onClose} style={ghostBtnStyle}>Cancel</button>
            <button
              onClick={handleSave}
              disabled={status === 'loading'}
              style={{
                background: status === 'loading' ? '#2e7d32' : '#4caf50',
                color: '#000', border: 'none',
                padding: '8px 18px', borderRadius: '6px',
                cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                fontWeight: 'bold', fontSize: '13px',
              }}
            >
              {status === 'loading' ? '🔍 Mencari...' : '💾 Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '10px', boxSizing: 'border-box',
  background: 'rgba(0,0,0,0.5)', border: '1px solid #444',
  borderRadius: '6px', color: '#fff', outline: 'none',
  fontSize: '13px',
};

const ghostBtnStyle = {
  background: 'transparent', border: '1px solid #444',
  color: '#aaa', padding: '8px 14px', borderRadius: '6px',
  cursor: 'pointer', fontSize: '13px',
};