import { useState } from 'react';
import { 
  TrendingUp, 
  Store, 
  CreditCard, 
  ArrowUpRight,
  DollarSign,
  // Users,
  ChevronRight
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

interface PlatformDashboardProps {
  merchants: any[];
  onMerchantClick: (merchant: any) => void;
}

// Mock platform-wide data
const platformTrendData = [
  { date: '03/14', gmv: 45000 },
  { date: '03/15', gmv: 52000 },
  { date: '03/16', gmv: 48000 },
  { date: '03/17', gmv: 61000 },
  { date: '03/18', gmv: 55000 },
  { date: '03/19', gmv: 58000 },
  { date: '03/20', gmv: 67500 },
];

const merchantPerformanceData = [
  { name: 'King-Chicken', gmv: 380000, transactions: 1240 },
  { name: 'Merchant B', gmv: 250000, transactions: 890 },
  { name: 'Merchant C', gmv: 45000, transactions: 180 },
];

export default function PlatformDashboard({ merchants, onMerchantClick }: PlatformDashboardProps) {
  const [timeRange, setTimeRange] = useState('7d');

  // Calculate platform totals
  const totalGMV = merchants.reduce((sum, m) => sum + m.gmv, 0);
  const totalTransactions = merchants.reduce((sum, m) => sum + m.transactions, 0);
  const activeMerchants = merchants.filter(m => m.status === 'active').length;
  const avgSuccessRate = merchants.reduce((sum, m) => sum + m.successRate, 0) / merchants.length;

  const StatCard = ({ 
    title, 
    value, 
    subValue, 
    icon: Icon, 
    trend,
    color = '#FF6B00'
  }: any) => (
    <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: 100,
        height: 100,
        background: `radial-gradient(circle at top right, ${color}15, transparent 70%)`,
      }} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: '0.875rem', color: 'var(--gray-400)', marginBottom: '0.5rem' }}>
            {title}
          </p>
          <h3 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            {value}
          </h3>
          {subValue && (
            <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
              {subValue}
            </p>
          )}
        </div>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color
        }}>
          <Icon size={24} />
        </div>
      </div>
      
      {trend && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.25rem',
          marginTop: '1rem',
          color: trend > 0 ? '#10b981' : '#ef4444',
          fontSize: '0.875rem'
        }}>
          <ArrowUpRight size={16} />
          <span>{Math.abs(trend)}% 較上週</span>
        </div>
      )}
    </div>
  );

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
            平台總覽
          </h2>
          <p style={{ color: 'var(--gray-400)' }}>
            查看所有商戶的聚合數據和平台健康度
          </p>
        </div>
        
        <select 
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          style={{
            padding: '0.75rem 1rem',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '0.5rem',
            color: 'white',
            fontSize: '0.875rem'
          }}
        >
          <option value="24h">過去24小時</option>
          <option value="7d">過去7天</option>
          <option value="30d">過去30天</option>
          <option value="90d">過去90天</option>
        </select>
      </div>

      {/* Platform Stats Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', 
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <StatCard
          title="平台總 GMV"
          value={`HK$ ${(totalGMV / 1000000).toFixed(2)}M`}
          subValue={`本月累計交易額`}
          icon={DollarSign}
          trend={12.5}
          color="#FF6B00"
        />
        
        <StatCard
          title="總交易筆數"
          value={totalTransactions.toLocaleString()}
          subValue="本月累計"
          icon={CreditCard}
          trend={8.3}
          color="#3b82f6"
        />
        
        <StatCard
          title="活躍商戶"
          value={`${activeMerchants} 家`}
          subValue={`共 ${merchants.length} 家入駐`}
          icon={Store}
          trend={20}
          color="#10b981"
        />
        
        <StatCard
          title="平均成功率"
          value={`${avgSuccessRate.toFixed(1)}%`}
          subValue="平台整體"
          icon={TrendingUp}
          trend={2.1}
          color="#8b5cf6"
        />
      </div>

      {/* Charts Row */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {/* GMV Trend */}
        <div className="card">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>平台 GMV 趨勢</h3>
            <span style={{ fontSize: '0.875rem', color: 'var(--gray-400)' }}>
              過去7天
            </span>
          </div>
          
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={platformTrendData}>
                <defs>
                  <linearGradient id="colorGMV" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#FF6B00" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="date" 
                  stroke="var(--gray-500)"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis 
                  stroke="var(--gray-500)"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(value) => `HK$${value/1000}K`}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--dark-light)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.5rem'
                  }}
                  formatter={(value: any) => [`HK$ ${value.toLocaleString()}`, 'GMV']}
                />
                <Area
                  type="monotone"
                  dataKey="gmv"
                  stroke="#FF6B00"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorGMV)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Merchant Performance */}
        <div className="card">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>商戶業績排名</h3>
            <span style={{ fontSize: '0.875rem', color: 'var(--gray-400)' }}>
              本月 GMV
            </span>
          </div>
          
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={merchantPerformanceData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis 
                  type="number" 
                  stroke="var(--gray-500)"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(value) => `HK$${value/1000}K`}
                />
                <YAxis 
                  type="category" 
                  dataKey="name"
                  stroke="var(--gray-500)"
                  fontSize={12}
                  tickLine={false}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--dark-light)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.5rem'
                  }}
                  formatter={(value: any) => [`HK$ ${value.toLocaleString()}`, 'GMV']}
                />
                <Bar dataKey="gmv" radius={[0, 4, 4, 0]}>
                  {merchantPerformanceData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#FF6B00' : index === 1 ? '#3b82f6' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Merchants Table */}
      <div className="card">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>TOP 商戶</h3>
          <button 
            onClick={() => {}}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.5rem 1rem',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '0.375rem',
              color: 'var(--gray-400)',
              fontSize: '0.875rem',
              cursor: 'pointer'
            }}
          >
            查看全部 <ChevronRight size={16} />
          </button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 500 }}>排名</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 500 }}>商戶</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 500 }}>狀態</th>
              <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 500 }}>本月 GMV</th>
              <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 500 }}>交易筆數</th>
              <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 500 }}>成功率</th>
            </tr>
          </thead>
          <tbody>
            {merchants
              .sort((a, b) => b.gmv - a.gmv)
              .slice(0, 5)
              .map((merchant, index) => (
                <tr 
                  key={merchant.id}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}
                  onClick={() => onMerchantClick(merchant)}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: index < 3 ? 'rgba(255,107,0,0.15)' : 'rgba(255,255,255,0.05)',
                      color: index < 3 ? '#FF6B00' : 'var(--gray-400)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.875rem',
                      fontWeight: 600
                    }}>
                      {index + 1}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: 'linear-gradient(135deg, #FF6B00, #E55A00)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.875rem',
                        fontWeight: 600
                      }}>
                        {merchant.name[0]}
                      </div>
                      <div>
                        <p style={{ fontWeight: 500 }}>{merchant.name}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{merchant.domain}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
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
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>
                    HK$ {merchant.gmv.toLocaleString()}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    {merchant.transactions}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <span style={{ color: merchant.successRate >= 95 ? '#10b981' : merchant.successRate >= 90 ? '#f59e0b' : '#ef4444' }}>
                      {merchant.successRate}%
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
