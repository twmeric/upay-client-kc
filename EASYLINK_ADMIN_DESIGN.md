# EasyLink 運營指揮中心設計

## 🎯 核心理念

一個人、一個界面、掌控全局

## 📊 後台架構

```
easylink-admin.jkdcoding.com (或 /admin 路徑)
├── 🏠 儀表板 Dashboard
│   ├── 今日交易總覽
│   ├── 支付方式佔比圖
│   ├── 成功率趨勢
│   └── 快捷操作入口
│
├── 💰 交易管理 Transactions
│   ├── 交易列表 (篩選、排序、導出)
│   ├── 交易詳情
│   ├── 退款操作
│   └── 對賬功能
│
├── 📱 WhatsApp 指揮中心
│   ├── 📊 Boss 報告設置
│   │   ├── 多收件人管理
│   │   ├── 發送時間設置
│   │   ├── 報告內容配置
│   │   └── 手動發送測試
│   │
│   ├── 💬 快速發送
│   │   ├── 單條消息發送
│   │   ├── 模板消息
│   │   └── 發送記錄
│   │
│   └── 📞 通訊錄管理
│       ├── 聯繫人分組
│       └── 標籤管理
│
├── 🏪 商戶管理 Merchants
│   ├── EasyLink 配置
│   ├── API 密鑰管理
│   ├── 支付渠道設置
│   └── 多商戶切換
│
├── 🔌 對外集成 Integrations
│   ├── CloudWAPI 配置
│   ├── Webhook 日誌
│   ├── API 調用記錄
│   └── 系統健康檢查
│
└── ⚙️ 系統設置 Settings
    ├── 管理員帳號
    ├── 通知偏好
    └── 日誌審計
```

## 🎨 界面設計

### 風格
- **主色調**: Hermès 橙 (#FF6B00) + 深色專業感
- **佈局**: 左側導航 + 右側內容區
- **響應式**: 支持桌面、平板、手機

### 特色功能
1. **Dark Mode 切換** - 夜間操作更舒適
2. **實時數據更新** - WebSocket 或輪詢
3. **快捷鍵支持** - 鍵盤操作提升效率
4. **通知中心** - 重要事件彈窗提醒

## 🔧 技術實現

### 部署方式
```
選項 A: 獨立域名
├── easylink-admin.jkdcoding.com
└── 優點: 獨立管理，更安全

選項 B: 子路徑
├── easylink.jkdcoding.com/admin
└── 優點: 統一域名，簡單

推薦: 選項 A (獨立後台域名)
```

### 技術棧
- 前端: React + TypeScript + Tailwind
- 後端: Cloudflare Worker (payment-api)
- 數據庫: D1 (已存在)
- 部署: Cloudflare Pages

## 📱 WhatsApp 指揮中心詳細設計

### Boss 報告升級
```
現有: 單一收件人、固定時間
升級: 
  ✓ 多收件人管理
  ✓ 自定義發送時間
  ✓ 報告模板編輯器
  ✓ 即時預覽功能
  ✓ 發送失敗重試
  ✓ 發送記錄追蹤
```

### 快速發送工具
```
類似郵件客戶端的界面:
├── 收件人輸入 (支持多選)
├── 消息編輯區
├── 模板選擇器
├── 附件上傳 (PDF 報告等)
└── 發送按鈕 + 定時發送
```

## 🚀 實施計劃

### Phase 1: 核心功能 (1-2 天)
- [ ] 後台框架搭建
- [ ] 登入認證
- [ ] 儀表板
- [ ] 交易管理

### Phase 2: WhatsApp 中心 (1 天)
- [ ] Boss 報告升級
- [ ] 快速發送工具
- [ ] 通訊錄管理

### Phase 3: 系統整合 (1 天)
- [ ] 商戶管理
- [ ] 對外集成
- [ ] 設置中心

### Phase 4: 部署 (半天)
- [ ] 部署到 Pages
- [ ] 綁定自定義域名
- [ ] SSL 配置

## 📝 API 擴展需求

需要在現有 payment-api 中添加:

```javascript
// 管理員認證
POST /api/admin/auth/login
POST /api/admin/auth/logout

// 儀表板數據
GET /api/admin/dashboard/stats
GET /api/admin/dashboard/chart

// 交易管理 (增強)
GET /api/admin/transactions (篩選、分頁)
POST /api/admin/transactions/:id/refund
GET /api/admin/transactions/export

// WhatsApp 管理
GET /api/admin/whatsapp/recipients
POST /api/admin/whatsapp/recipients
DELETE /api/admin/whatsapp/recipients/:id
POST /api/admin/whatsapp/send
GET /api/admin/whatsapp/templates

// Boss 報告
GET /api/admin/boss/config
POST /api/admin/boss/config
POST /api/admin/boss/send-now
GET /api/admin/boss/history

// 商戶管理
GET /api/admin/merchants
POST /api/admin/merchants
PUT /api/admin/merchants/:id
```

## 🔐 安全考慮

1. **雙重認證** - 管理員登入可選 2FA
2. **操作日誌** - 所有管理操作記錄
3. **IP 白名單** - 可限制訪問 IP
4. **會話管理** - Token 過期、單點登入
5. **權限分級** - 管理員、運營、只讀

## 🎁 增值功能 (未來)

- AI 智能分析交易趨勢
- 自動異常預警
- 客戶畫像分析
- 競品監控
- 自動報表郵件

---

請確認這個設計方向，我將開始實施 Phase 1！
