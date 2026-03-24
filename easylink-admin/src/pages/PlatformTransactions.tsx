import { useState } from 'react';
import { Search, Download } from 'lucide-react';

interface PlatformTransactionsProps {
  merchants: any[];
}

const mockTransactions = [
  { id: 1, orderNo: 'ORD202603200001', merchant: 'King-Chicken', amount: 1000, payType: 'UP_OP', status: 'success', time: '2026-03-20 14:30:00' },
  { id: 2, orderNo: 'ORD202603200002', merchant: 'Merchant B', amount: 500, payType: 'ALI_H5', status: 'success', time: '2026-03-20 14:25:00' },
  { id: 3, orderNo: 'ORD202603200003', merchant: 'King-Chicken', amount: 2000, payType: 'WX_H5', status: 'pending', time: '2026-03-20 14:20:00' },
  { id: 4, orderNo: 'ORD202603200004', merchant: 'Merchant C', amount: 100, payType: 'UP_OP', status: 'failed', time: '2026-03-20 14:15:00' },
  { id: 5, orderNo: 'ORD202603200005', merchant: 'Merchant B', amount: 1500, payType: 'ALI_H5', status: 'success', time: '2026-03-20 14:10:00' },
];

const statusColors: Record<string, { bg: string; color: string; label: string }> = {
  success: { bg: 'rgba(16,185,129,0.15)', color: '#10b981', label: '成功' },
  pending: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', label: '處理中' },
  failed: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', label: '失敗' }
};

const payTypeLabels: Record<string, string> = {
  UP_OP: '銀聯',
  ALI_H5: '支付寶',
  WX_H5: '微信支付'
};

export default function PlatformTransactions({ merchants }: PlatformTransactionsProps) {
  const [search, setSearch] = useState('');
  const [merchantFilter, setMerchantFilter] = useState('all');

  const filteredTransactions = mockTransactions.filter(t => {
    const matchesSearch = t.orderNo.toLowerCase().includes(search.toLowerCase());
    const matchesMerchant = merchantFilter === 'all' || t.merchant === merchantFilter;
    return matchesSearch && matchesMerchant;
  });

  return (
    <div className="animate-fade-in">
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            平台交易流水
          </h2>
          <p style={{ color: 'var(--gray-400)' }}>
            查看所有商戶的交易記錄
          </p>
        </div>
        
        <button className="btn-secondary">
          <Download size={18} style={{ marginRight: '0.5rem' }} />
          導出報表
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 250 }}>
            <Search size={18} style={{
              position: 'absolute',
              left: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--gray-500)'
            }} />
            <input
              type="text"
              placeholder="搜索訂單號..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 2.5rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '0.5rem',
                color: 'white',
                fontSize: '0.875rem'
              }}
            />
          </div>

          <select
            value={merchantFilter}
            onChange={(e) => setMerchantFilter(e.target.value)}
            style={{
              padding: '0.75rem 1rem',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '0.5rem',
              color: 'white',
              fontSize: '0.875rem'
            }}
          >
            <option value="all">全部商戶</option>
            {merchants.map(m => (
              <option key={m.id} value={m.name}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--gray-400)' }}>訂單號</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--gray-400)' }}>商戶</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--gray-400)' }}>支付方式</th>
              <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.75rem', color: 'var(--gray-400)' }}>金額</th>
              <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--gray-400)' }}>狀態</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--gray-400)' }}>時間</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map(t => (
              <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.875rem' }}>{t.orderNo}</td>
                <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{t.merchant}</td>
                <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{payTypeLabels[t.payType]}</td>
                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>HK$ {t.amount}</td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    background: statusColors[t.status].bg,
                    color: statusColors[t.status].color
                  }}>
                    {statusColors[t.status].label}
                  </span>
                </td>
                <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--gray-500)' }}>{t.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
