# King-Chicken 自定義域名設置指南

> 將域名改為 king-chicken.jkdcoding.com

---

## 📋 當前狀態

| 組件 | 當前網址 | 目標網址 |
|------|---------|---------|
| 前端 | https://c5533699.payment-portal-cwb.pages.dev | https://king-chicken.jkdcoding.com |
| API | https://payment-api.jimsbond007.workers.dev | (保持不變) |

---

## 🔧 設置步驟

### 步驟 1: 登入 Cloudflare Dashboard

前往: https://dash.cloudflare.com

---

### 步驟 2: 添加自定義域名到 Pages

1. 點擊左側菜單 **"Workers & Pages"**
2. 選擇專案 **"payment-portal"**
3. 點擊 **"Custom domains"** 標籤
4. 點擊 **"Set up a custom domain"**

---

### 步驟 3: 輸入域名

**輸入**: `king-chicken.jkdcoding.com`

> ⚠️ 注意: 您需要擁有 `jkdcoding.com` 這個域名的控制權

---

### 步驟 4: 驗證域名

Cloudflare 會自動檢查域名 DNS 設置:

#### 情況 A: 域名已在 Cloudflare
如果 `jkdcoding.com` 已在 Cloudflare 管理，系統會自動添加 DNS 記錄。

#### 情況 B: 域名不在 Cloudflare
1. 前往您的域名註冊商 (如 GoDaddy, Namecheap 等)
2. 添加 CNAME 記錄:
   - **類型**: CNAME
   - **名稱**: `king-chicken`
   - **目標**: `c5533699.payment-portal-cwb.pages.dev`
   - **TTL**: 自動

---

### 步驟 5: 等待生效

- SSL 證書自動頒發: ~5 分鐘
- DNS 全球生效: ~5-30 分鐘

---

## ✅ 驗證設置

設置完成後，訪問:
```
https://king-chicken.jkdcoding.com
```

應該看到:
- King-Chicken Logo
- 紅色主題支付頁面
- 管理員登入入口

---

## 🔒 SSL/HTTPS

Cloudflare 會自動:
- 頒發 SSL 證書
- 強制 HTTPS 重定向
- 提供 DDoS 防護

---

## 🆘 故障排除

### "Domain not found"
- 確認域名已添加到 Cloudflare
- 檢查 DNS 記錄是否正確

### "SSL 證書錯誤"
- 等待 24 小時自動頒發
- 或嘗試重新添加域名

### "404 Not Found"
- 檢查 Pages 專案部署狀態
- 確認構建輸出目錄正確

---

## 📞 需要幫助?

如果無法設置域名，您也可以:
1. 使用現有網址繼續運行
2. 聯繫我們協助域名遷移

---

**準備好設置域名了嗎？** 🚀
