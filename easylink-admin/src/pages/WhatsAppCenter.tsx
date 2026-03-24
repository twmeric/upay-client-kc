import { useState } from 'react';
import { 
  MessageCircle, 
  Send, 
  Users, 
  Clock, 
  CheckCircle,
  Settings,
  Plus,
  Trash2,
  FileText,
  Bell
} from 'lucide-react';

type Tab = 'boss' | 'send' | 'contacts';

const mockRecipients = [
  { id: 1, name: '咪咪姐', phone: '85298113210', enabled: true },
  { id: 2, name: 'Michelle', phone: '85292404878', enabled: true },
  { id: 3, name: '測試號碼', phone: '85261234567', enabled: false },
];

const mockHistory = [
  { id: 1, date: '2026-03-20 10:30', recipients: 2, status: 'success', message: '每日報告發送成功' },
  { id: 2, date: '2026-03-19 10:30', recipients: 2, status: 'success', message: '每日報告發送成功' },
  { id: 3, date: '2026-03-18 10:30', recipients: 2, status: 'failed', message: 'API 錯誤' },
];

export default function WhatsAppCenter() {
  const [activeTab, setActiveTab] = useState<Tab>('boss');
  const [recipients, setRecipients] = useState(mockRecipients);
  const [bossTime, setBossTime] = useState('10:30');
  const [bossEnabled, setBossEnabled] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [sendLoading, setSendLoading] = useState(false);

  const tabs = [
    { id: 'boss', label: 'Boss 報告', icon: FileText },
    { id: 'send', label: '快速發送', icon: Send },
    { id: 'contacts', label: '通訊錄', icon: Users },
  ];

  const handleSendTest = async () => {
    setSendLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setSendLoading(false);
    alert('測試消息已發送！');
  };

  const handleQuickSend = async () => {
    if (!messageText.trim()) return;
    setSendLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSendLoading(false);
    setMessageText('');
    alert('消息發送成功！');
  };

  return (
    <div className="animate-fade-in">
      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        marginBottom: '1.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        paddingBottom: '1rem'
      }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.25rem',
                borderRadius: '0.5rem',
                border: 'none',
                background: isActive ? 'rgba(255,107,0,0.15)' : 'transparent',
                color: isActive ? '#FF6B00' : 'var(--gray-400)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500
              }}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Boss Report Tab */}
      {activeTab === 'boss' && (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {/* Configuration Card */}
          <div className="card">
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(255,107,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FF6B00'
              }}>
                <Settings size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Boss 報告設置</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--gray-400)' }}>
                  每日自動發送交易報告
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Enable Switch */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '1rem',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Bell size={20} color="#FF6B00" />
                  <span>啟用自動發送</span>
                </div>
                <button
                  onClick={() => setBossEnabled(!bossEnabled)}
                  style={{
                    width: 48,
                    height: 26,
                    borderRadius: 13,
                    border: 'none',
                    background: bossEnabled ? '#FF6B00' : 'var(--gray-600)',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background 0.3s'
                  }}
                >
                  <div style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: 'white',
                    position: 'absolute',
                    top: 2,
                    left: bossEnabled ? 24 : 2,
                    transition: 'left 0.3s'
                  }} />
                </button>
              </div>

              {/* Time Setting */}
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '0.875rem', 
                  color: 'var(--gray-400)',
                  marginBottom: '0.5rem'
                }}>
                  每日發送時間
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Clock size={18} color="var(--gray-500)" />
                  <input
                    type="time"
                    value={bossTime}
                    onChange={(e) => setBossTime(e.target.value)}
                    style={{
                      padding: '0.75rem 1rem',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '0.5rem',
                      color: 'white',
                      fontSize: '0.875rem'
                    }}
                  />
                  <span style={{ fontSize: '0.875rem', color: 'var(--gray-400)' }}>
                    (香港時間)
                  </span>
                </div>
              </div>

              {/* Recipients */}
              <div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.75rem'
                }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--gray-400)' }}>
                    收件人列表 ({recipients.filter(r => r.enabled).length} 位啟用)
                  </label>
                  <button style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '0.375rem 0.75rem',
                    background: 'rgba(255,107,0,0.15)',
                    border: 'none',
                    borderRadius: '0.375rem',
                    color: '#FF6B00',
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}>
                    <Plus size={14} />
                    添加
                  </button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {recipients.map(recipient => (
                    <div
                      key={recipient.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.875rem 1rem',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '0.5rem',
                        border: recipient.enabled 
                          ? '1px solid rgba(255,107,0,0.3)' 
                          : '1px solid transparent'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: 'rgba(255,107,0,0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          color: '#FF6B00'
                        }}>
                          {recipient.name[0]}
                        </div>
                        <div>
                          <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>{recipient.name}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{recipient.phone}</p>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          onClick={() => {
                            setRecipients(recipients.map(r => 
                              r.id === recipient.id ? { ...r, enabled: !r.enabled } : r
                            ));
                          }}
                          style={{
                            padding: '0.375rem 0.75rem',
                            background: recipient.enabled ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                            border: 'none',
                            borderRadius: '0.375rem',
                            color: recipient.enabled ? '#10b981' : 'var(--gray-400)',
                            fontSize: '0.75rem',
                            cursor: 'pointer'
                          }}
                        >
                          {recipient.enabled ? '啟用' : '停用'}
                        </button>
                        <button style={{
                          padding: '0.375rem',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--error)',
                          cursor: 'pointer'
                        }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button className="btn-primary" onClick={handleSendTest} disabled={sendLoading}>
                  <Send size={16} style={{ marginRight: '0.5rem' }} />
                  {sendLoading ? '發送中...' : '立即測試發送'}
                </button>
                <button className="btn-secondary">
                  保存設置
                </button>
              </div>
            </div>
          </div>

          {/* History */}
          <div className="card">
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
              發送記錄
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {mockHistory.map(item => (
                <div
                  key={item.id}
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
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: item.status === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: item.status === 'success' ? '#10b981' : '#ef4444'
                    }}>
                      {item.status === 'success' ? <CheckCircle size={16} /> : <MessageCircle size={16} />}
                    </div>
                    <div>
                      <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>{item.message}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{item.date}</p>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                    {item.recipients} 位收件人
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Send Tab */}
      {activeTab === 'send' && (
        <div className="card">
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem' }}>
            快速發送消息
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '0.875rem', 
                color: 'var(--gray-400)',
                marginBottom: '0.5rem'
              }}>
                選擇收件人
              </label>
              <select style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '0.5rem',
                color: 'white',
                fontSize: '0.875rem'
              }}>
                <option value="">選擇聯繫人...</option>
                {recipients.map(r => (
                  <option key={r.id} value={r.phone}>{r.name} ({r.phone})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '0.875rem', 
                color: 'var(--gray-400)',
                marginBottom: '0.5rem'
              }}>
                消息內容
              </label>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="輸入要發送的消息..."
                rows={6}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '0.5rem',
                  color: 'white',
                  fontSize: '0.875rem',
                  resize: 'vertical',
                  minHeight: 120
                }}
              />
              <p style={{ 
                fontSize: '0.75rem', 
                color: 'var(--gray-500)', 
                marginTop: '0.5rem',
                textAlign: 'right'
              }}>
                {messageText.length} 字符
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                className="btn-primary" 
                onClick={handleQuickSend}
                disabled={sendLoading || !messageText.trim()}
                style={{ flex: 1 }}
              >
                <Send size={16} style={{ marginRight: '0.5rem' }} />
                {sendLoading ? '發送中...' : '發送消息'}
              </button>
              <button 
                className="btn-secondary"
                onClick={() => setMessageText('')}
              >
                清空
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contacts Tab */}
      {activeTab === 'contacts' && (
        <div className="card">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>通訊錄</h3>
            <button className="btn-primary">
              <Plus size={16} style={{ marginRight: '0.5rem' }} />
              添加聯繫人
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recipients.map(recipient => (
              <div
                key={recipient.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '0.75rem',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #FF6B00, #E55A00)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    fontWeight: 600
                  }}>
                    {recipient.name[0]}
                  </div>
                  <div>
                    <p style={{ fontSize: '1rem', fontWeight: 600 }}>{recipient.name}</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--gray-400)' }}>{recipient.phone}</p>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button style={{
                    padding: '0.5rem 1rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.375rem',
                    color: 'white',
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                  }}>
                    編輯
                  </button>
                  <button style={{
                    padding: '0.5rem',
                    background: 'transparent',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer'
                  }}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
