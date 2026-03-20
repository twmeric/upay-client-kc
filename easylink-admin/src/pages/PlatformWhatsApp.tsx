import { useState } from 'react';
import { MessageCircle, Send, Users, Plus, Trash2 } from 'lucide-react';

interface PlatformWhatsAppProps {
  merchants: any[];
}

const mockWhatsAppConfig: Record<string, any> = {
  'King-Chicken': {
    enabled: true,
    time: '10:30',
    recipients: [
      { name: '咪咪姐', phone: '85298113210', enabled: true },
      { name: 'Michelle', phone: '85292404878', enabled: true }
    ]
  },
  'Merchant B': {
    enabled: true,
    time: '09:00',
    recipients: [
      { name: '陳先生', phone: '85291234567', enabled: true }
    ]
  },
  'Merchant C': {
    enabled: false,
    time: '10:00',
    recipients: []
  }
};

export default function PlatformWhatsApp({ merchants }: PlatformWhatsAppProps) {
  const [selectedMerchant, setSelectedMerchant] = useState(merchants[0]);
  const [config, setConfig] = useState(mockWhatsAppConfig[selectedMerchant.name] || { enabled: false, time: '10:00', recipients: [] });
  const [sending, setSending] = useState(false);

  const handleSendTest = async () => {
    setSending(true);
    await new Promise(r => setTimeout(r, 1500));
    setSending(false);
    alert('測試報告已發送！');
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          WhatsApp 平台配置
        </h2>
        <p style={{ color: 'var(--gray-400)' }}>
          為每個商戶獨立配置 Boss 報告
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem' }}>
        {/* Merchant Selector */}
        <div className="card" style={{ height: 'fit-content' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
            選擇商戶
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {merchants.map(m => (
              <button
                key={m.id}
                onClick={() => {
                  setSelectedMerchant(m);
                  setConfig(mockWhatsAppConfig[m.name] || { enabled: false, time: '10:00', recipients: [] });
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  background: selectedMerchant.id === m.id ? 'rgba(255,107,0,0.15)' : 'transparent',
                  color: selectedMerchant.id === m.id ? '#FF6B00' : 'white',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #FF6B00, #E55A00)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.875rem',
                  fontWeight: 600
                }}>
                  {m.name[0]}
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>{m.name}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                    {mockWhatsAppConfig[m.name]?.recipients.length || 0} 位收件人
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Configuration Panel */}
        <div>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'rgba(16,185,129,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981'
              }}>
                <MessageCircle size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{selectedMerchant.name}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--gray-400)' }}>Boss 報告配置</p>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span>啟用自動發送</span>
                <button
                  onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                  style={{
                    width: 48,
                    height: 26,
                    borderRadius: 13,
                    border: 'none',
                    background: config.enabled ? '#10b981' : 'var(--gray-600)',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                >
                  <div style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: 'white',
                    position: 'absolute',
                    top: 2,
                    left: config.enabled ? 24 : 2,
                    transition: 'left 0.3s'
                  }} />
                </button>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--gray-400)', marginBottom: '0.5rem' }}>
                  每日發送時間
                </label>
                <input
                  type="time"
                  value={config.time}
                  onChange={(e) => setConfig({ ...config, time: e.target.value })}
                  style={{
                    padding: '0.75rem 1rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.5rem',
                    color: 'white',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn-primary" onClick={handleSendTest} disabled={sending}>
                <Send size={16} style={{ marginRight: '0.5rem' }} />
                {sending ? '發送中...' : '立即測試發送'}
              </button>
              <button className="btn-secondary">
                保存配置
              </button>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>收件人列表</h3>
              <button className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                <Plus size={16} style={{ marginRight: '0.25rem' }} />
                添加
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {config.recipients.map((recipient: any, index: number) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: 'rgba(255,107,0,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FF6B00'
                    }}>
                      <Users size={16} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 500 }}>{recipient.name}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{recipient.phone}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      background: 'rgba(16,185,129,0.15)',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem',
                      color: '#10b981'
                    }}>
                      啟用
                    </span>
                    <button style={{ padding: '0.5rem', background: 'transparent', border: 'none', color: '#ef4444' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {config.recipients.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--gray-500)', padding: '2rem' }}>
                  尚未配置收件人
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
