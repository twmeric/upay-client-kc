import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  CreditCard, 
  Store,
  MessageCircle, 
  // DollarSign,
  Settings, 
  LogOut,
  Menu,
  X,
  Bell,
  // User,
  // ChevronDown,
  // Plus
} from 'lucide-react';
import PlatformDashboard from './pages/PlatformDashboard';
import MerchantList from './pages/MerchantList';
import MerchantDetail from './pages/MerchantDetail';
import PlatformTransactions from './pages/PlatformTransactions';
import PlatformWhatsApp from './pages/PlatformWhatsApp';
import PlatformSettings from './pages/PlatformSettings';
import Login from './pages/Login';

export type Page = 'dashboard' | 'merchants' | 'merchant-detail' | 'transactions' | 'whatsapp' | 'settings';

// Mock merchants data
export const mockMerchants = [
  { 
    id: 'KC001', 
    name: 'King-Chicken', 
    company: 'Power King Road Union Limited',
    domain: 'king-chicken.jkdcoding.com',
    status: 'active',
    gmv: 380000,
    transactions: 1240,
    successRate: 96.5,
    contact: '咪咪姐',
    phone: '+852 9811 3210',
    email: 'kingchicken@example.com',
    joinDate: '2026-01-15',
    mchNo: '80403445499539',
    appId: '6763e0a175249c805471328d'
  },
  { 
    id: 'MB002', 
    name: 'Merchant B', 
    company: 'B Company Limited',
    domain: 'merchant-b.jkdcoding.com',
    status: 'active',
    gmv: 250000,
    transactions: 890,
    successRate: 94.2,
    contact: '陳先生',
    phone: '+852 9123 4567',
    email: 'contact@merchantb.com',
    joinDate: '2026-02-01',
    mchNo: '80403445500001',
    appId: '7763e0a175249c805471329e'
  },
  { 
    id: 'MC003', 
    name: 'Merchant C', 
    company: 'C Trading Co.',
    domain: 'merchant-c.jkdcoding.com',
    status: 'trial',
    gmv: 45000,
    transactions: 180,
    successRate: 91.8,
    contact: '李小姐',
    phone: '+852 9345 6789',
    email: 'info@merchantc.com',
    joinDate: '2026-03-10',
    mchNo: '80403445500002',
    appId: '8763e0a175249c805471330f'
  },
];

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [selectedMerchant, setSelectedMerchant] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('platform_admin_token');
    if (token) {
      const userData = JSON.parse(localStorage.getItem('platform_admin_user') || '{}');
      setUser(userData);
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLogin = async (username: string, password: string) => {
    if (username === 'admin' && password === '51164453') {
      const adminUser = { 
        id: 1, 
        username: 'admin', 
        name: '平台管理員', 
        role: 'platform_admin',
        avatar: 'A'
      };
      localStorage.setItem('platform_admin_token', 'platform_token_' + Date.now());
      localStorage.setItem('platform_admin_user', JSON.stringify(adminUser));
      setUser(adminUser);
      setIsAuthenticated(true);
      return { success: true };
    } else {
      return { success: false, error: '用戶名或密碼錯誤' };
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('platform_admin_token');
    localStorage.removeItem('platform_admin_user');
    setIsAuthenticated(false);
    setUser(null);
  };

  const handleMerchantSelect = (merchant: any) => {
    setSelectedMerchant(merchant);
    setCurrentPage('merchant-detail');
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'var(--dark)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: 60, 
            height: 60, 
            borderRadius: 16,
            background: 'linear-gradient(135deg, #FF6B00, #E55A00)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
            fontSize: 28,
            fontWeight: 'bold'
          }}>E</div>
          <p style={{ color: 'var(--gray-400)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  const navItems = [
    { id: 'dashboard', label: '平台總覽', icon: LayoutDashboard },
    { id: 'merchants', label: '商戶管理', icon: Store },
    { id: 'transactions', label: '交易流水', icon: CreditCard },
    { id: 'whatsapp', label: 'WhatsApp 中心', icon: MessageCircle },
    { id: 'settings', label: '平台設置', icon: Settings },
  ];

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <PlatformDashboard merchants={mockMerchants} onMerchantClick={handleMerchantSelect} />;
      case 'merchants':
        return <MerchantList merchants={mockMerchants} onMerchantClick={handleMerchantSelect} />;
      case 'merchant-detail':
        return selectedMerchant ? 
          <MerchantDetail merchant={selectedMerchant} onBack={() => setCurrentPage('merchants')} /> : 
          <MerchantList merchants={mockMerchants} onMerchantClick={handleMerchantSelect} />;
      case 'transactions':
        return <PlatformTransactions merchants={mockMerchants} />;
      case 'whatsapp':
        return <PlatformWhatsApp merchants={mockMerchants} />;
      case 'settings':
        return <PlatformSettings />;
      default:
        return <PlatformDashboard merchants={mockMerchants} onMerchantClick={handleMerchantSelect} />;
    }
  };

  // Calculate platform totals
  const platformGMV = mockMerchants.reduce((sum, m) => sum + m.gmv, 0);
  // const platformTransactions = mockMerchants.reduce((sum, m) => sum + m.transactions, 0);
  const activeMerchants = mockMerchants.filter(m => m.status === 'active').length;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--dark)' }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? 280 : 80,
        background: 'var(--dark-light)',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s',
        position: 'fixed',
        height: '100vh',
        zIndex: 100
      }}>
        {/* Logo */}
        <div style={{ 
          padding: '1.5rem', 
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <div style={{ 
            width: 40, 
            height: 40, 
            borderRadius: 10,
            background: 'linear-gradient(135deg, #FF6B00, #E55A00)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            fontWeight: 'bold',
            flexShrink: 0
          }}>E</div>
          {sidebarOpen && (
            <div>
              <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>EasyLink</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>平台控制台</div>
            </div>
          )}
        </div>

        {/* Platform Stats Summary */}
        {sidebarOpen && (
          <div style={{ 
            padding: '1rem 1.5rem',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,107,0,0.05)'
          }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginBottom: '0.5rem' }}>
              平台總覽
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#FF6B00' }}>
              HK$ {(platformGMV / 1000000).toFixed(2)}M
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
              {activeMerchants} 家活躍商戶
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '1rem 0.75rem' }}>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentPage === item.id || (item.id === 'merchants' && currentPage === 'merchant-detail');
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id as Page)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: sidebarOpen ? '0.875rem 1rem' : '0.875rem',
                  justifyContent: sidebarOpen ? 'flex-start' : 'center',
                  borderRadius: '0.5rem',
                  border: 'none',
                  background: isActive ? 'rgba(255,107,0,0.15)' : 'transparent',
                  color: isActive ? '#FF6B00' : 'var(--gray-400)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}
              >
                <Icon size={20} />
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div style={{ 
          padding: '1rem 0.75rem', 
          borderTop: '1px solid rgba(255,255,255,0.08)'
        }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarOpen ? 'flex-start' : 'center',
              gap: '0.75rem',
              padding: sidebarOpen ? '0.75rem 1rem' : '0.75rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: 'transparent',
              color: 'var(--gray-400)',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            {sidebarOpen && <span>收起選單</span>}
          </button>
          
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarOpen ? 'flex-start' : 'center',
              gap: '0.75rem',
              padding: sidebarOpen ? '0.75rem 1rem' : '0.75rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: 'transparent',
              color: 'var(--error)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              marginTop: '0.5rem'
            }}
          >
            <LogOut size={20} />
            {sidebarOpen && <span>登出</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ 
        flex: 1, 
        marginLeft: sidebarOpen ? 280 : 80,
        transition: 'margin-left 0.3s'
      }}>
        {/* Header */}
        <header style={{
          height: 70,
          background: 'var(--dark-light)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2rem',
          position: 'sticky',
          top: 0,
          zIndex: 50
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
              {navItems.find(n => n.id === currentPage)?.label || '商戶詳情'}
            </h1>
            {selectedMerchant && currentPage === 'merchant-detail' && (
              <span style={{
                padding: '0.25rem 0.75rem',
                background: 'rgba(255,107,0,0.15)',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                color: '#FF6B00'
              }}>
                {selectedMerchant.name}
              </span>
            )}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--gray-400)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Bell size={20} />
            </button>
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              padding: '0.5rem 1rem',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '2rem'
            }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #FF6B00, #E55A00)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.875rem',
                fontWeight: 600
              }}>
                {user?.avatar || 'A'}
              </div>
              <span style={{ fontSize: '0.875rem' }}>{user?.name || '管理員'}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div style={{ padding: '2rem' }}>
          {renderPage()}
        </div>
      </main>
    </div>
  );
}
