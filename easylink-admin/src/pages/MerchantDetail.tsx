import { 
  ArrowLeft, 
  Store, 
  Mail, 
  Phone, 
  Globe,
  CreditCard,
  TrendingUp,
  Settings
} from 'lucide-react';

interface MerchantDetailProps {
  merchant: any;
  onBack: () => void;
}

export default function MerchantDetail({ merchant, onBack }: MerchantDetailProps) {
  return (
    <div className="animate-fade-in">
      {/* Back Button */}
      <button
        onClick={onBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          padding: '0.5rem',
          background: 'transparent',
          border: 'none',
          color: 'var(--gray-400)',
          cursor: 'pointer',
          fontSize: '0.875rem'
        }}
      >
        <ArrowLeft size={18} />
        返回商戶列表
      </button>

      {/* Merchant Header */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #FF6B00, #E55A00)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            fontWeight: 700
          }}>
            {merchant.name[0]}
          </div>
          
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{merchant.name}</h2>
              <span style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 500,
                background: merchant.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                color: merchant.status === 'active' ? '#10b981' : '#f59e0b'
              }}>
                {merchant.status === 'active' ? '活躍' : '試用'}
              </span>
            </div>
            <p style={{ color: 'var(--gray-400)', marginBottom: '0.75rem' }}>{merchant.company}</p>
            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', color: 'var(--gray-500)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Globe size={14} /> {merchant.domain}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Mail size={14} /> {merchant.email}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Phone size={14} /> {merchant.phone}
              </span>
            </div>
          </div>

          <button className="btn-primary">
            <Settings size={18} style={{ marginRight: '0.5rem' }} />
            編輯設置
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        {[
          { label: '本月 GMV', value: `HK$ ${merchant.gmv.toLocaleString()}`, icon: CreditCard },
          { label: '交易筆數', value: merchant.transactions.toLocaleString(), icon: TrendingUp },
          { label: '成功率', value: `${merchant.successRate}%`, icon: TrendingUp },
          { label: '入駐日期', value: merchant.joinDate, icon: Store },
        ].map((stat, index) => (
          <div key={index} className="card" style={{ textAlign: 'center' }}>
            <stat.icon size={24} style={{ color: '#FF6B00', margin: '0 auto 0.75rem' }} />
            <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)', marginBottom: '0.5rem' }}>
              {stat.label}
            </p>
            <p style={{ fontSize: '1.25rem', fontWeight: 600 }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
        gap: '1.5rem'
      }}>
        {/* EasyLink Config */}
        <div className="card">
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.25rem' }}>
            EasyLink 配置
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>MchNo</p>
              <p style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{merchant.mchNo}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>AppId</p>
              <p style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{merchant.appId}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>商戶ID</p>
              <p style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{merchant.id}</p>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="card">
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.25rem' }}>
            聯繫信息
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Store size={18} color="var(--gray-500)" />
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>聯繫人</p>
                <p>{merchant.contact}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Phone size={18} color="var(--gray-500)" />
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>電話</p>
                <p>{merchant.phone}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Mail size={18} color="var(--gray-500)" />
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>郵箱</p>
                <p>{merchant.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
