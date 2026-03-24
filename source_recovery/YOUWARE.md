# EasyLink 支付收款系統

## 項目概述
EasyLink 線上收款系統，整合 EasyLink 支付網關（ts-api-pay.gnete.com.hk），支持多種支付方式。

## 技術棧
- **前端**: React 18 + TypeScript + Vite + Tailwind CSS + Recharts
- **後端**: Youbase (Hono + Drizzle ORM)
- **支付網關**: EasyLink (測試環境)
- **Worker URL**: staging--55cdi3nfi9dh4f92yskx.youbase.cloud

## 功能模組

### 收款頁面 (/)
- 預設金額按鈕：HK$5,000 / HK$10,000 / HK$25,000 / HK$50,000
- 自定義金額輸入
- 支持支付方式：信用卡(Visa/MC)、微信、支付寶、銀聯、Google Pay、Apple Pay

### 支付結果頁 (/payment/result)
- 自動查詢訂單狀態
- 支付中狀態輪詢

### 管理後台 (/admin)
- 需登入認證
- **儀表板**: 當日交易總額、訂單量、成功率；近7天交易額柱狀圖 + 訂單量折線圖
- **交易流水**: 可按狀態/商戶號/日期篩選；分頁瀏覽
- **對賬單下載**: CSV 格式
- **商戶管理**: 啟停商戶、設置結算權限和結算比例

## 數據庫表
- `transactions` - 交易記錄 (訂單號、金額、狀態、支付方式等)
- `merchants` - 商戶設定 (啟用狀態、結算權限、結算比例)

## API 端點
### 公開 (免登入)
- `POST /api/public/payment/create` - 建立支付訂單
- `GET /api/public/payment/query/:orderNo` - 查詢訂單狀態

### Webhook
- `POST /api/webhooks/easylink/notify` - EasyLink 支付通知回調

### 管理 (需登入)
- `GET /api/transactions` - 交易列表 (支持過濾)
- `GET /api/transactions/export` - 下載對賬單 CSV
- `GET /api/dashboard/stats` - 儀表板統計
- `GET /api/merchants` - 商戶列表
- `PUT /api/merchants/:id` - 更新商戶設定
- `POST /api/merchants` - 新增商戶

## EasyLink 配置
- 商戶號 (mchNo): 通過 secret 管理
- 應用ID (appId): 通過 secret 管理
- 應用密鑰 (appSecret): 通過 secret 管理
- 簽名方式: MD5
- 金額單位: 分 (cents)
- 貨幣: HKD

## EasyLink 簽名算法（重要）
根據官方文檔 https://ts-api-pay.gnete.com.hk/guide/rule/InterfaceRule.html：
1. 只有 `sign` 不參與簽名計算（signType 參與簽名）
2. 空值不參與簽名
3. 按參數名 ASCII 碼從小到大排序
4. 拼接 key1=value1&key2=value2&...&key=AppSecret
5. MD5 後轉大寫

### API 返回數據
- `code`: int, 0=成功
- `data.payData`: 支付URL/數據
- `data.payDataType`: payUrl/form/codeUrl 等
- `data.orderState`: 訂單狀態 (0-6)
- 查詢接口用 `state` 表示狀態

### 重要調試紀錄
- 簽名字串中 signType **必須參與** 簽名計算（官方文檔只排除 sign）
- 商戶帳號註冊在測試環境，必須使用 ts-api-pay.gnete.com.hk
- subject/body 使用純 ASCII 文本避免編碼問題
- reqTime 在 JSON body 中以數字類型發送（long），簽名中以字符串參與

### 支付方式 (僅開通)
- UP_OP: 銀聯
- ALI_H5: 支付寶H5
- WX_H5: 微信H5

## 訂單狀態碼
- 0: 訂單生成
- 1: 支付中
- 2: 支付成功
- 3: 支付失敗
- 4: 已撤銷
- 5: 已退款
- 6: 訂單關閉
