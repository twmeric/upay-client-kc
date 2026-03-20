import { useState } from 'react';
import { Settings, Save, CheckCircle, Key, Mail } from 'lucide-react';

export default function PlatformSettings() {
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  const handleSave = async () => {
    await new Promise(r => setTimeout(r, 1000));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const tabs = [
    { id: 'general', label: '基本設置', icon: Settings },
    { id: 'api', label: 'API 配置', icon: Key },
    { id: 'notifications', label: '通知設置', icon: Mail },
  ];

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          平台設置
        </h2>
        <p style={{ color: 'var(--gray-400)' }}>
          配置 EasyLink 平台全局參數
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '1.5rem' }}>
        {/* Tabs */}
        <div className="card" style={{ height: 'fit-content' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.875rem 1rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    background: activeTab === tab.id ? 'rgba(255,107,0,0.15)' : 'transparent',
                    color: activeTab === tab.id ? '#FF6B00' : 'var(--gray-400)',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    textAlign: 'left'
                  }}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="card">
          {activeTab === 'general' && (
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem' }}>基本設置</h3>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--gray-400)', marginBottom: '0.5rem' }}>
                  平台名稱
                </label>
                <input
                  type="text"
                  defaultValue="EasyLink Pay"
                  style={{
                    width: '100%',
                    maxWidth: 400,
                    padding: '0.75rem 1rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.5rem',
                    color: 'white',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--gray-400)', marginBottom: '0.5rem' }}>
                  默認結算週期
                </label>
                <select style={{
                  padding: '0.75rem 1rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '0.5rem',
                  color: 'white',
                  fontSize: '0.875rem'
                }}>
                  <option>T+1 (工作日)</option>
                  <option>T+3 (工作日)</option>
                  <option>T+7 (工作日)</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--gray-400)', marginBottom: '0.5rem' }}>
                  平台手續費率 (%)
                </label>
                <input
                  type="number"
                  defaultValue="2.5"
                  step="0.1"
                  style={{
                    width: 150,
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
          )}

          {activeTab === 'api' && (
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem' }}>API 配置</h3>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--gray-400)', marginBottom: '0.5rem' }}>
                  EasyLink 平台商戶號
                </label>
                <input
                  type="text"
                  defaultValue="80403445499539"
                  readOnly
                  style={{
                    width: '100%',
                    maxWidth: 400,
                    padding: '0.75rem 1rem',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.5rem',
                    color: 'var(--gray-500)',
                    fontSize: '0.875rem',
                    fontFamily: 'monospace'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--gray-400)', marginBottom: '0.5rem' }}>
                  Webhook 密鑰
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="password"
                    defaultValue="whsec_xxxxxxxxxxxxxxxx"
                    style={{
                      flex: 1,
                      maxWidth: 400,
                      padding: '0.75rem 1rem',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '0.5rem',
                      color: 'white',
                      fontSize: '0.875rem'
                    }}
                  />
                  <button className="btn-secondary" style={{ padding: '0.75rem 1rem' }}>
                    重新生成
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem' }}>通知設置</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[
                  { label: '新商戶入駐通知', default: true },
                  { label: '大額交易提醒 (>HK$10,000)', default: true },
                  { label: '系統異常通知', default: true },
                  { label: '每日平台報告', default: false }
                ].map((item, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem' }}>
                    <span>{item.label}</span>
                    <button style={{
                      width: 48,
                      height: 26,
                      borderRadius: 13,
                      border: 'none',
                      background: item.default ? '#10b981' : 'var(--gray-600)',
                      cursor: 'pointer',
                      position: 'relative'
                    }}>
                      <div style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: 'white',
                        position: 'absolute',
                        top: 2,
                        left: item.default ? 24 : 2
                      }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <button 
              onClick={handleSave}
              className="btn-primary"
              style={{
                background: saved ? '#10b981' : undefined
              }}
            >
              {saved ? (
                <><CheckCircle size={18} style={{ marginRight: '0.5rem' }} /> 已保存</>
              ) : (
                <><Save size={18} style={{ marginRight: '0.5rem' }} /> 保存設置</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
