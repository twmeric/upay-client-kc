/**
 * King-Chicken Configuration
 * Orange Theme Merchant Dashboard
 */

const CONFIG = {
  // Client Identity
  CLIENT_CODE: 'KC',
  CLIENT_NAME: 'King-Chicken',
  
  // Theme Settings - Orange Theme
  THEME: {
    primary: '#FF6B00',        // Orange primary
    primaryDark: '#E55A00',    // Darker orange
    secondary: '#FF8533',      // Light orange
    background: '#FAF8F5',     // Warm white
    cardBg: '#ffffff',
    text: '#1A1A1A',
    textMuted: '#666666',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    border: '#E8E4E0'
  },
  
  // API Configuration
  API_BASE_URL: 'https://easylink-api.jimsbond007.workers.dev/api/v1',
  
  // Features
  FEATURES: {
    dashboard: true,
    transactions: true,
    filters: true,
    bossConfig: true,
    export: true
  },
  
  // Pagination
  PAGE_SIZE: 15,
  
  // Pay Types
  PAY_TYPES: [
    { value: 'UP_OP', label: '銀聯', icon: '💳' },
    { value: 'ALI_H5', label: '支付寶', icon: '💰' },
    { value: 'WX_H5', label: '微信支付', icon: '💚' }
  ],
  
  // Status Map
  STATUS_MAP: {
    0: { label: '訂單生成', color: '#666666', bg: '#F3F4F6' },
    1: { label: '支付中', color: '#F59E0B', bg: '#FEF3C7' },
    2: { label: '支付成功', color: '#10B981', bg: '#D1FAE5' },
    3: { label: '支付失敗', color: '#EF4444', bg: '#FEE2E2' },
    4: { label: '已撤銷', color: '#6B7280', bg: '#F3F4F6' },
    5: { label: '已退款', color: '#3B82F6', bg: '#DBEAFE' },
    6: { label: '訂單關閉', color: '#666666', bg: '#F3F4F6' }
  },
  
  // Auth Users
  USERS: [
    { username: 'admin', password: 'kingchicken123' },
    { username: 'mimichu', password: '98113210' }
  ]
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
