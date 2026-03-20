import { useState } from 'react';
import { 
  Search, 
  // Filter, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Eye
} from 'lucide-react';

// const API_BASE = 'https://payment-api.jimsbond007.workers.dev';

// Mock data
const mockTransactions = [
  { id: 1, orderNo: 'ORD202603200001', amount: 1000.00, payType: 'UP_OP', status: 'success', createdAt: '2026-03-20 14:30:00', merchant: 'Power King' },
  { id: 2, orderNo: 'ORD202603200002', amount: 500.00, payType: 'ALI_H5', status: 'pending', createdAt: '2026-03-20 14:25:00', merchant: 'Power King' },
  { id: 3, orderNo: 'ORD202603200003', amount: 2000.00, payType: 'WX_H5', status: 'success', createdAt: '2026-03-20 14:20:00', merchant: 'Power King' },
  { id: 4, orderNo: 'ORD202603200004', amount: 100.00, payType: 'UP_OP', status: 'failed', createdAt: '2026-03-20 14:15:00', merchant: 'Power King' },
  { id: 5, orderNo: 'ORD202603200005', amount: 1500.00, payType: 'ALI_H5', status: 'success', createdAt: '2026-03-20 14:10:00', merchant: 'Power King' },
];

const payTypeLabels: Record<string, string> = {
  'UP_OP': '銀聯在線',
  'ALI_H5': '支付寶',
  'WX_H5': '微信支付'
};

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  'success': { label: '成功', color: '#10b981', icon: CheckCircle },
  'pending': { label: '處理中', color: '#f59e0b', icon: Clock },
  'failed': { label: '失敗', color: '#ef4444', icon: XCircle }
};

export default function Transactions() {
  const [transactions] = useState(mockTransactions);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [payTypeFilter, setPayTypeFilter] = useState('all');
  // const [loading, setLoading] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.orderNo.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesPayType = payTypeFilter === 'all' || t.payType === payTypeFilter;
    return matchesSearch && matchesStatus && matchesPayType;
  });

  const handleExport = () => {
    // Export to CSV
    const csv = [
      ['訂單號', '金額', '支付方式', '狀態', '創建時間'].join(','),
      ...filteredTransactions.map(t => [
        t.orderNo,
        t.amount,
        payTypeLabels[t.payType],
        statusConfig[t.status].label,
        t.createdAt
      ].join(','))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="animate-fade-in">
      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ 
          display: 'flex', 
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          {/* Search */}
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
                fontSize: '0.875rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '0.75rem 1rem',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '0.5rem',
              color: 'white',
              fontSize: '0.875rem',
              minWidth: 140
            }}
          >
            <option value="all">全部狀態</option>
            <option value="success">成功</option>
            <option value="pending">處理中</option>
            <option value="failed">失敗</option>
          </select>

          {/* Pay Type Filter */}
          <select
            value={payTypeFilter}
            onChange={(e) => setPayTypeFilter(e.target.value)}
            style={{
              padding: '0.75rem 1rem',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '0.5rem',
              color: 'white',
              fontSize: '0.875rem',
              minWidth: 140
            }}
          >
            <option value="all">全部方式</option>
            <option value="UP_OP">銀聯在線</option>
            <option value="ALI_H5">支付寶</option>
            <option value="WX_H5">微信支付</option>
          </select>

          {/* Export Button */}
          <button
            onClick={handleExport}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '0.5rem',
              color: 'white',
              cursor: 'pointer',
              fontSize: '0.875rem',
              whiteSpace: 'nowrap'
            }}
          >
            <Download size={18} />
            導出 CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 500 }}>訂單號</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 500 }}>金額</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 500 }}>支付方式</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 500 }}>狀態</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 500 }}>創建時間</th>
              <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 500 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map((transaction) => {
              const status = statusConfig[transaction.status];
              const StatusIcon = status.icon;
              
              return (
                <tr 
                  key={transaction.id}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <td style={{ padding: '1rem', fontSize: '0.875rem', fontFamily: 'monospace' }}>
                    {transaction.orderNo}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: 600 }}>
                    HK$ {transaction.amount.toFixed(2)}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                    {payTypeLabels[transaction.payType]}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      padding: '0.375rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      background: `${status.color}20`,
                      color: status.color
                    }}>
                      <StatusIcon size={14} />
                      {status.label}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--gray-400)' }}>
                    {transaction.createdAt}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <button
                      onClick={() => setSelectedTransaction(transaction)}
                      style={{
                        padding: '0.5rem',
                        background: 'rgba(255,255,255,0.05)',
                        border: 'none',
                        borderRadius: '0.375rem',
                        color: 'var(--gray-400)',
                        cursor: 'pointer'
                      }}
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem',
          borderTop: '1px solid rgba(255,255,255,0.08)'
        }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--gray-400)' }}>
            共 {filteredTransactions.length} 筆交易
          </span>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button style={{
              padding: '0.5rem 0.75rem',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '0.375rem',
              color: 'var(--gray-400)',
              cursor: 'not-allowed'
            }}>
              <ChevronLeft size={16} />
            </button>
            <button style={{
              padding: '0.5rem 0.75rem',
              background: 'rgba(255,107,0,0.2)',
              border: '1px solid rgba(255,107,0,0.3)',
              borderRadius: '0.375rem',
              color: '#FF6B00',
              cursor: 'pointer'
            }}>
              1
            </button>
            <button style={{
              padding: '0.5rem 0.75rem',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '0.375rem',
              color: 'var(--gray-400)',
              cursor: 'not-allowed'
            }}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }} onClick={() => setSelectedTransaction(null)}>
          <div 
            className="card"
            style={{ 
              width: '100%', 
              maxWidth: 500,
              maxHeight: '90vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>訂單詳情</h3>
              <button
                onClick={() => setSelectedTransaction(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--gray-400)',
                  cursor: 'pointer',
                  fontSize: '1.5rem'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                padding: '0.75rem 0',
                borderBottom: '1px solid rgba(255,255,255,0.08)'
              }}>
                <span style={{ color: 'var(--gray-400)' }}>訂單號</span>
                <span style={{ fontFamily: 'monospace' }}>{selectedTransaction.orderNo}</span>
              </div>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                padding: '0.75rem 0',
                borderBottom: '1px solid rgba(255,255,255,0.08)'
              }}>
                <span style={{ color: 'var(--gray-400)' }}>金額</span>
                <span style={{ fontWeight: 600 }}>HK$ {selectedTransaction.amount.toFixed(2)}</span>
              </div>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                padding: '0.75rem 0',
                borderBottom: '1px solid rgba(255,255,255,0.08)'
              }}>
                <span style={{ color: 'var(--gray-400)' }}>支付方式</span>
                <span>{payTypeLabels[selectedTransaction.payType]}</span>
              </div>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                padding: '0.75rem 0',
                borderBottom: '1px solid rgba(255,255,255,0.08)'
              }}>
                <span style={{ color: 'var(--gray-400)' }}>狀態</span>
                <span style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  background: `${statusConfig[selectedTransaction.status].color}20`,
                  color: statusConfig[selectedTransaction.status].color
                }}>
                  {statusConfig[selectedTransaction.status].label}
                </span>
              </div>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                padding: '0.75rem 0'
              }}>
                <span style={{ color: 'var(--gray-400)' }}>創建時間</span>
                <span>{selectedTransaction.createdAt}</span>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
              <button className="btn-primary" style={{ flex: 1 }}>
                <RefreshCw size={16} style={{ marginRight: '0.5rem' }} />
                刷新狀態
              </button>
              <button className="btn-secondary" style={{ flex: 1 }}>
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
