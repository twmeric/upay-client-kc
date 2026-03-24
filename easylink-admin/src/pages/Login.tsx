import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onLogin: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await onLogin(username, password);
    
    if (!result.success) {
      setError(result.error || '登入失敗');
    }
    
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0A0A0F 0%, #1a1a24 100%)',
      padding: '1rem'
    }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '1.5rem',
        padding: '2.5rem'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 70,
            height: 70,
            borderRadius: 20,
            background: 'linear-gradient(135deg, #FF6B00, #E55A00)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            fontSize: 32,
            fontWeight: 'bold',
            boxShadow: '0 10px 30px rgba(255,107,0,0.3)'
          }}>E</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            EasyLink 運營指揮中心
          </h1>
          <p style={{ color: 'var(--gray-400)', fontSize: '0.875rem' }}>
            請登入以繼續
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#ef4444',
            padding: '0.875rem 1rem',
            borderRadius: '0.5rem',
            marginBottom: '1.5rem',
            fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              color: 'var(--gray-300)',
              marginBottom: '0.5rem'
            }}>
              用戶名
            </label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--gray-500)'
              }} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="輸入用戶名"
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem 0.875rem 2.75rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '0.5rem',
                  color: 'white',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              color: 'var(--gray-300)',
              marginBottom: '0.5rem'
            }}>
              密碼
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--gray-500)'
              }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="輸入密碼"
                style={{
                  width: '100%',
                  padding: '0.875rem 3rem 0.875rem 2.75rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '0.5rem',
                  color: 'white',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--gray-500)',
                  cursor: 'pointer'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '1rem',
              background: 'linear-gradient(135deg, #FF6B00, #E55A00)',
              border: 'none',
              borderRadius: '0.5rem',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? '登入中...' : '登入'}
          </button>
        </form>

        <p style={{
          textAlign: 'center',
          marginTop: '1.5rem',
          fontSize: '0.75rem',
          color: 'var(--gray-500)'
        }}>
          © 2026 EasyLink. All rights reserved.
        </p>
      </div>
    </div>
  );
}
