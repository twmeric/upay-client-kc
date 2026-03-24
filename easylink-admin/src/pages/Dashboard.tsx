import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  CreditCard, 
  CheckCircle, 
  // XCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Users
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const API_BASE = 'https://payment-api.jimsbond007.workers.dev';

// Mock data for demo
const chartData = [
  { name: '00:00', amount: 1200 },
  { name: '04:00', amount: 800 },
  { name: '08:00', amount: 2400 },
  { name: '12:00', amount: 3600 },
  { name: '16:00', amount: 2800 },
  { name: '20:00', amount: 4200 },
  { name: '23:59', amount: 1800 },
];

const paymentMethodData = [
  { name: '銀聯', value: 45, color: '#FF6B00' },
  { name: '支付寶', value: 35, color: '#1677FF' },
  { name: '微信支付', value: 20, color: '#07C160' },
];

export default function Dashboard() {
  const [stats, setStats] = useState({
    todayAmount: 12580.00,
    todayCount: 48,
    successRate: 94.5,
    yesterdayAmount: 11200.00,
    pendingCount: 5
  });
  useState(false); // loading state placeholder

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/dashboard/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.log('Using demo data');
    }
  };

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
          {trend > 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
          <span>{Math.abs(trend)}% 較昨日</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="animate-fade-in">
      {/* Stats Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', 
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <StatCard
          title="今日交易額"
          value={`HK$ ${stats.todayAmount.toLocaleString()}`}
          subValue={`${stats.todayCount} 筆交易`}
          icon={DollarSign}
          trend={12.3}
          color="#FF6B00"
        />
        
        <StatCard
          title="成功率"
          value={`${stats.successRate}%`}
          subValue="過去24小時"
          icon={CheckCircle}
          trend={2.1}
          color="#10b981"
        />
        
        <StatCard
          title="待處理訂單"
          value={stats.pendingCount}
          subValue="需要關注"
          icon={Clock}
          color="#f59e0b"
        />
        
        <StatCard
          title="活躍商戶"
          value="3"
          subValue="全部正常運作"
          icon={Users}
          color="#3b82f6"
        />
      </div>

      {/* Charts Row */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {/* Transaction Trend */}
        <div className="card">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>今日交易趨勢</h3>
            <select style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '0.375rem',
              padding: '0.5rem 0.75rem',
              color: 'white',
              fontSize: '0.875rem'
            }}>
              <option>今日</option>
              <option>昨日</option>
              <option>近7天</option>
            </select>
          </div>
          
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#FF6B00" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="name" 
                  stroke="var(--gray-500)"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis 
                  stroke="var(--gray-500)"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(value) => `HK$${value}`}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--dark-light)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.5rem'
                  }}
                  formatter={(value: any) => [`HK$ ${value}`, '交易額']}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#FF6B00"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorAmount)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="card">
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem' }}>
            支付方式佔比
          </h3>
          
          <div style={{ height: 300, display: 'flex', alignItems: 'center' }}>
            <ResponsiveContainer width="60%" height="100%">
              <PieChart>
                <Pie
                  data={paymentMethodData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {paymentMethodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--dark-light)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.5rem'
                  }}
                  formatter={(value: any) => [`${value}%`, '佔比']}
                />
              </PieChart>
            </ResponsiveContainer>
            
            <div style={{ width: '40%' }}>
              {paymentMethodData.map((item) => (
                <div key={item.name} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: item.color
                  }} />
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>{item.name}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{item.value}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem' }}>
          快捷操作
        </h3>
        
        <div style={{ 
          display: 'flex', 
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          {[
            { label: '發送 Boss 報告', icon: TrendingUp, color: '#FF6B00' },
            { label: '查看待處理', icon: Clock, color: '#f59e0b' },
            { label: '導出對賬單', icon: CreditCard, color: '#3b82f6' },
            { label: 'WhatsApp 發送', icon: Users, color: '#10b981' },
          ].map((action) => (
            <button
              key={action.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem 1.5rem',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '0.75rem',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.3s',
                fontSize: '0.875rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = action.color;
                e.currentTarget.style.background = `${action.color}10`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              }}
            >
              <action.icon size={20} style={{ color: action.color }} />
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
