# 📚 EasyLink 對接經驗教訓 (復盤)

> 專案: Power King Road Union Limited (勁達路盟有限公司)  
> 時間: 2026-03-19  
> 架構師: Payment Gateway 接駁專家

---

## 🎯 專案概覽

### 客戶需求
- 線上收款 Portal
- 支持三種支付方式：銀聯/支付寶/微信
- 管理後台查看交易
- 完全自主可控

### 最終架構
```
Frontend: Cloudflare Pages (React + Tailwind)
Backend:  Cloudflare Worker (JavaScript)
Database: D1 (SQLite)
Secrets:  Workers Secrets
```

---

## ⚠️ 踩過的坑 (按嚴重程度排序)

### 1. 🔴 URL 構建錯誤 (最致命)

**問題**: 簽名驗證一直失敗 (errorCode: 9999)

**錯誤代碼**:
```javascript
// ❌ 錯誤！protocol 包含冒號
const url = new URL(request.url);
const notifyUrl = `${url.protocol}//${url.host}/api/webhooks/notify`;
// 結果: https:://payment-api.xxx.workers.dev (雙冒號！)
```

**正確做法**:
```javascript
// ✅ 正確！手動指定 https
const host = url.host;
const notifyUrl = `https://${host}/api/webhooks/notify`;
// 結果: https://payment-api.xxx.workers.dev
```

**教訓**: 
- `url.protocol` 返回 `"https:"` (帶冒號)
- 永遠不要直接使用 `url.protocol` 構建 URL
- 始終使用硬編碼 `"https://"` 或 `url.origin`

**檢查方法**:
```javascript
console.log(url.protocol);  // "https:"
console.log(url.host);      // "payment-api.xxx.workers.dev"
console.log(url.origin);    // "https://payment-api.xxx.workers.dev"
```

---

### 2. 🟡 AppSecret 格式問題

**問題**: 簽名驗證失敗

**原因**: AppSecret 從圖片複製時
- 第一版: 多了一個字符或少了字符
- 第二版: 正確的 128 字符

**教訓**:
- 複製長字符串時要特別小心
- 建議客戶提供電子版而非圖片
- 驗證 Secret 長度 (通常是 128 字符)

**檢查命令**:
```javascript
console.log(secret.length); // 應該是 128
```

---

### 3. 🟡 環境切換問題

**問題**: Test 環境和 Production 環境混淆

| 環境 | API URL | 商戶資料 |
|------|---------|---------|
| Test | https://ts-api-pay.gnete.com.hk | 測試帳戶 |
| Production | https://api-pay.gnete.com.hk | 正式帳戶 |

**教訓**:
- 確認客戶帳戶類型 (Test/Production)
- Test 帳戶無法在 Production API 使用
- 客戶提供的資料必須與環境匹配

---

### 4. 🟢 參數排序問題 (未發生但需注意)

**EasyLink 簽名規則**:
1. 排除 `sign` 參數
2. 排除空值參數
3. **按 ASCII 排序參數名**
4. `key=value` 用 `&` 連接
5. 最後加上 `&key=AppSecret`

**正確排序示例**:
```
amount=100&appId=xxx&body=Test&currency=HKD&mchNo=xxx&mchOrderNo=xxx&...
```

**JavaScript 排序代碼**:
```javascript
const sorted = Object.keys(params)
  .filter(k => params[k] !== '' && k !== 'sign')
  .sort(); // ASCII 排序
```

---

## ✅ 成功的關鍵因素

### 1. 調試端點
創建 `/api/debug/sign` 端點，顯示完整簽名過程，快速定位問題。

### 2. 分離環境配置
使用 `wrangler.toml` + Secrets，環境變量清晰分離。

### 3. D1 數據庫
交易記錄持久化，便於後續查詢和對賬。

### 4. 完整的錯誤處理
每個 API 調用都有錯誤記錄，便於排查。

---

## 📋 客戶資料標準模板

收到客戶資料時，確保有以下信息：

```yaml
客戶名稱: Power King Road Union Limited
帳戶類型: Production

EasyLink 配置:
  Merchant ID: "80403445499539"
  AppId: "6763e0a175249c805471328d"
  AppSecret: "8DsrsUZH9FPHEtLO9k3SYh9decnsYMbfDcjE8r5BaCIHGxbKgjucyHxRRPVfuwZgULBiPvVS5bHWTvvghdqCYWTBOpr7t6qahTe6AspingMJcg7jkzPxY3OnsvJJJz5G"
  
API 環境: Production
API URL: https://api-pay.gnete.com.hk

支付方式:
  - 銀聯在線 (UP_OP)
  - 支付寶 H5 (ALI_H5)
  - 微信 H5 (WX_H5)

收款設置:
  貨幣: HKD
  預設金額: [50, 100, 250, 500]
  訂單過期: 30 分鐘
```

---

## 🔧 快速診斷檢查清單

### 簽名驗證失敗 (errorCode: 9999)
1. ✅ 檢查 URL 構建 (不能有雙冒號)
2. ✅ 檢查 AppSecret 長度 (128 字符)
3. ✅ 檢查參數排序 (ASCII 排序)
4. ✅ 檢查環境匹配 (Test/Production)
5. ✅ 檢查時間戳 (13 位毫秒)

### API 無響應
1. ✅ Worker 是否部署成功
2. ✅ Secrets 是否設置正確
3. ✅ D1 數據庫是否綁定
4. ✅ 路由是否正確

---

## 🎯 後續改進建議

1. **自動化測試**: 創建自動化測試腳本，驗證每個支付方式
2. **監控告警**: 設置支付成功率監控
3. **文檔生成**: 自動生成客戶專屬 API 文檔
4. **一鍵部署**: 完善一鍵部署腳本

---

**記住這些教訓，後續對接將事半功倍！** 🚀
