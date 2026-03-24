# 🚀 快速修復指南

## 當前狀態: ⚠️ 需要修復才能上線

---

## 🔥 立即修復 (30 分鐘)

### 1. 金額 Bug (最嚴重)
**問題**: 輸入 HK$50 會變成 HK$5,000

**修復** (`backend/server/src/index.ts:90`):
```diff
- const amountInCents = Math.round(amount * 100);
+ const amountInCents = Math.round(parseFloat(amount) * 100);
```

**同時修改前端** (`src/pages/PaymentPage.tsx`):
```diff
- const PRESET_AMOUNTS = [5000, 10000, 25000, 50000];
+ const PRESET_AMOUNTS = [50, 100, 250, 500];
```

---

### 2. 添加 ChannelExtra 支持
**問題**: 三種付款方式都缺少必要的 channelExtra 參數

**修復** (`backend/server/src/index.ts`):
```typescript
// 在 signParams 構建後添加
if (channelExtra) {
  signParams.channelExtra = typeof channelExtra === 'string' 
    ? channelExtra 
    : JSON.stringify(channelExtra);
}
```

---

### 3. Webhook 安全加固
**問題**: 沒有時間戳驗證，容易受到重放攻擊

**修復** (`backend/server/src/index.ts:286+`):
```typescript
// 在 webhook handler 中添加
const reqTime = parseInt(data.reqTime || '0');
const now = Date.now();
if (Math.abs(now - reqTime) > 5 * 60 * 1000) {
  return c.text("fail");
}
```

---

## 📋 三種付款模式檢查清單

### ✅ 銀聯在線 (UP_OP)
| 項目 | 狀態 | 備註 |
|------|------|------|
| 基本支付 | ⚠️ | 需要測試 |
| 銀行卡鎖定 | ❌ | 需要添加 channelExtra.accNo |
| 快捷支付 | ❌ | 需要 customerInfo 加密 |

### ✅ 支付寶 H5 (ALI_H5)
| 項目 | 狀態 | 備註 |
|------|------|------|
| 香港錢包 | ⚠️ | 默認可用，但應顯式指定 |
| 中國大陸錢包 | ❌ | 需要添加 channelExtra.walletType = "CN" |
| 自動跳轉 | ✅ | 可用 |

### ✅ 微信 H5 (WX_H5)
| 項目 | 狀態 | 備註 |
|------|------|------|
| 基本支付 | ⚠️ | 需要測試 |
| AppID 傳遞 | ❌ | 建議添加 channelExtra.appid |
| 公眾號支持 | ❌ | 需要額外開發 |

---

## 🧪 5 分鐘測試

```bash
# 1. 測試銀聯
curl -X POST $API_URL/api/public/payment/create \
  -d '{"amount": 1, "payType": "UP_OP"}'

# 2. 測試支付寶香港
curl -X POST $API_URL/api/public/payment/create \
  -d '{"amount": 1, "payType": "ALI_H5", "channelExtra": {"walletType": "HK"}}'

# 3. 測試支付寶中國
curl -X POST $API_URL/api/public/payment/create \
  -d '{"amount": 1, "payType": "ALI_H5", "channelExtra": {"walletType": "CN"}}'

# 4. 測試微信
curl -X POST $API_URL/api/public/payment/create \
  -d '{"amount": 1, "payType": "WX_H5"}'
```

---

## 📁 生成的文件

| 文件 | 說明 |
|------|------|
| `PAYMENT_PORTAL_AUDIT_REPORT.md` | 完整審計報告 |
| `PAYMENT_FIXES.patch` | 詳細修復代碼 |
| `test-payment-flows.js` | 自動化測試腳本 |
| `QUICK_FIX_GUIDE.md` | 本快速指南 |

---

## ⚡ 優先級排序

### P0 (上線前必須)
1. ✅ 修復金額轉換 Bug
2. ✅ 添加 ChannelExtra 支持
3. ✅ Webhook 時間戳驗證

### P1 (上線後 1 週)
1. 實作冪等性保護
2. 添加過期時間處理
3. 完善錯誤處理

### P2 (上線後 1 月)
1. 監控告警
2. 性能優化
3. 文檔完善

---

## 📞 問題排查

### "簽名失敗"
- 檢查 `signType` 是否參與簽名 (應該是 YES)
- 檢查 `reqTime` 是否為 13 位數字
- 檢查 `amount` 是否為整數（分）

### "支付方式不支持"
- 檢查商戶號是否有該支付方式的權限
- 檢查 `wayCode` 是否正確

### "訂單創建成功但無法支付"
- 檢查 `payData` 是否正確返回
- 檢查 `returnUrl` 和 `notifyUrl` 是否可訪問

---

## 🎯 上線檢查清單

- [ ] 三種付款方式測試通過
- [ ] Webhook 接收正常
- [ ] 金額驗證正確
- [ ] 冪等性測試通過
- [ ] 錯誤處理完善
- [ ] 監控告警配置
- [ ] 回滾方案準備

---

**準備好上線了嗎？** 完成 P0 修復後即可上線！ 🚀
