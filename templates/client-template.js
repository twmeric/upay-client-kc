/**
 * Upay Client Configuration
 * Each client customizes this file
 */

const CONFIG = {
  // Client Identity
  CLIENT_CODE: 'TEMPLATE',
  CLIENT_NAME: 'Template Client',
  
  // Theme Settings
  THEME: {
    primary: '#667eea',        // Primary color
    primaryDark: '#5568d3',
    secondary: '#764ba2',
    background: '#f0f4f8',
    cardBg: '#ffffff',
    text: '#1a202c',
    textMuted: '#718096',
    success: '#48bb78',
    warning: '#ed8936',
    danger: '#f56565',
    border: '#e2e8f0'
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
    0: { label: '訂單生成', color: '#718096', bg: '#edf2f7' },
    1: { label: '支付中', color: '#ed8936', bg: '#fffaf0' },
    2: { label: '支付成功', color: '#48bb78', bg: '#f0fff4' },
    3: { label: '支付失敗', color: '#f56565', bg: '#fff5f5' },
    4: { label: '已撤銷', color: '#a0aec0', bg: '#f7fafc' },
    5: { label: '已退款', color: '#4299e1', bg: '#ebf8ff' },
    6: { label: '訂單關閉', color: '#718096', bg: '#edf2f7' }
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
