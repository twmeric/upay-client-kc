import { useState } from 'react';
import { 
  Search, 
  Plus,
  // Filter,
  MoreVertical,
  Store,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';

interface MerchantListProps {
  merchants: any[];
  onMerchantClick: (merchant: any) => void;
}

const statusConfig: Record<string, { label: string; color: string; icon: any; bg: string }> = {
  'active': { 
    label: '活躍', 
    color: '#10b981', 
    icon: CheckCircle,
    bg: 'rgba(16,185,129,0.15)'
  },
  'trial': { 
    label: '試用', 
    color: '#f59e0b', 
    icon: Clock,
    bg: 'rgba(245,158,11,0.15)'
  },
  'suspended': { 
    label: '停用', 
    color: '#ef4444', 
    icon: AlertCircle,
    bg: 'rgba(239,68,68,0.15)'
  }
};

export default function MerchantList({ merchants, onMerchantClick }: MerchantListProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredMerchants = merchants.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
                         m.company.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            商戶管理
          </h2>
          <p style={{ color: 'var(--gray-400)' }}>
            管理平台所有入駐商戶
          </p>
        </div>
        
        <button className="btn-primary">
          <Plus size={18} style={{ marginRight: '0.5rem' }} />
          新增商戶
        </button>
      </div>

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
              placeholder="搜索商戶名稱或公司..."
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
            <option value="active">活躍</option>
            <option value="trial">試用</option>
            <option value="suspended">停用</option>
          </select>

          <span style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>
            共 {filteredMerchants.length} 家商戶
          </span>
        </div>
      </div>

      {/* Merchant Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
        gap: '1.5rem'
      }}>
        {filteredMerchants.map(merchant => {
          const status = statusConfig[merchant.status];
          const StatusIcon = status.icon;
          
          return (
            <div
              key={merchant.id}
              className="card"
              style={{ 
                cursor: 'pointer',
                transition: 'all 0.3s',
                border: '1px solid rgba(255,255,255,0.08)'
              }}
              onClick={() => onMerchantClick(merchant)}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,107,0,0.3)';
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {/* Header */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '1.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #FF6B00, #E55A00)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    fontWeight: 600
                  }}>
                    {merchant.name[0]}
                  </div>
                  <div>
                    <h3 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{merchant.name}</h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>{merchant.company}</p>
                  </div>
                </div>
                
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.375rem 0.75rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  background: status.bg,
                  color: status.color
                }}>
                  <StatusIcon size={14} />
                  {status.label}
                </span>
              </div>

              {/* Stats */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                marginBottom: '1.25rem',
                padding: '1rem',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '0.75rem'
              }}>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>
                    本月 GMV
                  </p>
                  <p style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                    HK$ {merchant.gmv.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>
                    交易筆數
                  </p>
                  <p style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                    {merchant.transactions}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>
                    成功率
                  </p>
                  <p style={{ 
                    fontSize: '1.125rem', 
                    fontWeight: 600,
                    color: merchant.successRate >= 95 ? '#10b981' : merchant.successRate >= 90 ? '#f59e0b' : '#ef4444'
                  }}>
                    {merchant.successRate}%
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>
                    入駐時間
                  </p>
                  <p style={{ fontSize: '0.875rem' }}>
                    {merchant.joinDate}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '1rem',
                borderTop: '1px solid rgba(255,255,255,0.08)'
              }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                  {merchant.domain}
                </span>
                <button style={{
                  padding: '0.5rem',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--gray-400)',
                  cursor: 'pointer'
                }}>
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredMerchants.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '4rem 2rem',
          color: 'var(--gray-500)'
        }}>
          <Store size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <p>沒有找到符合條件的商戶</p>
        </div>
      )}
    </div>
  );
}
